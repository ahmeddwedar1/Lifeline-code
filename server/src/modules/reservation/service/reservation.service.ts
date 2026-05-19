import prisma from '../../../infrastructure/database/prisma';
import { getRedisClient } from '../../../infrastructure/redis/client';
import { emitToUser, emitToHospital, emitToRole } from '../../../infrastructure/websocket';
import { addNotificationJob, addReservationExpiryJob } from '../../../infrastructure/queues';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';

interface CreateReservationData {
  userId: string;
  hospitalId: string;
  resourceId?: string;
  emergencyId?: string;
  notes?: string;
  reservationDate?: string;
}

export class ReservationService {
  async create(data: CreateReservationData) {
    const { userId, hospitalId, resourceId, emergencyId, notes, reservationDate } = data;

    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital || hospital.deletedAt) throw new NotFoundError('Hospital not found');

    if (resourceId) {
      const resource = await prisma.resource.findUnique({ where: { id: resourceId } });
      if (!resource || resource.deletedAt) throw new NotFoundError('Resource not found');
      if (resource.hospitalId !== hospitalId) throw new BadRequestError('Resource does not belong to this hospital');

      const redis = getRedisClient();
      const lockKey = `reservation:lock:${resourceId}`;

      try {
        const acquired = await redis.set(lockKey, userId, 'NX', 'EX', 300);
        if (!acquired && acquired !== 'OK') {
          const lockOwner = await redis.get(lockKey);
          if (lockOwner && lockOwner !== userId) {
            throw new ConflictError('Resource is currently being reserved by another user');
          }
        }
      } catch (err) {
        if (err instanceof ConflictError) throw err;
        logger.warn(`Redis lock failed for resource ${resourceId}, proceeding without lock`, err);
      }

      if (resource.status !== 'AVAILABLE') {
        try {
          await getRedisClient().del(`reservation:lock:${resourceId}`);
        } catch { /* ignore */ }
        throw new ConflictError(`Resource is not available (status: ${resource.status})`);
      }
    }

    if (emergencyId) {
      const emergency = await prisma.emergencyRequest.findUnique({ where: { id: emergencyId } });
      if (!emergency) throw new NotFoundError('Emergency not found');
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const reservationDateObj = reservationDate ? new Date(reservationDate) : null;

    const reservation = await prisma.reservation.create({
      data: {
        userId,
        hospitalId,
        resourceId,
        emergencyId,
        status: 'PENDING',
        reservationDate: reservationDateObj,
        expiryDate: expiresAt,
        notes,
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        hospital: { select: { id: true, name: true, city: true } },
        resource: { select: { id: true, resourceType: true, name: true } },
        emergency: { select: { id: true, severity: true, symptoms: true } },
      },
    });

    if (resourceId) {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { status: 'RESERVED' },
      });
    }

    addReservationExpiryJob({ reservationId: reservation.id, expiresAt }).catch((err) => {
      logger.error('Failed to schedule reservation expiry job', err);
    });

    emitToUser(userId, 'reservation:created', {
      reservationId: reservation.id,
      status: reservation.status,
      hospital: reservation.hospital,
      resource: reservation.resource,
    });

    emitToHospital(hospitalId, 'reservation:new', {
      reservationId: reservation.id,
      user: reservation.user,
      resource: reservation.resource,
      emergency: reservation.emergency,
      status: reservation.status,
    });

    emitToRole('ADMIN', 'reservation:created', {
      reservationId: reservation.id,
      hospitalId,
      userId,
    });

    addNotificationJob({
      userId,
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Created',
      message: `Your reservation at ${reservation.hospital.name} has been created and is pending confirmation.`,
      relatedEntityType: 'reservation',
      relatedEntityId: reservation.id,
    }).catch((err) => {
      logger.error('Failed to send reservation notification', err);
    });

    logger.info(
      `Reservation created: ${reservation.id} user=${userId} hospital=${hospitalId} resource=${resourceId || 'none'}`,
    );

    return reservation;
  }

  async confirm(id: string, confirmedById: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { hospital: { select: { id: true, name: true } } },
    });

    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== 'PENDING') throw new BadRequestError(`Cannot confirm reservation with status ${reservation.status}`);

    const confirmed = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedById,
        expiryDate: null,
      },
      include: {
        user: { select: { id: true, fullName: true, phone: true } },
        hospital: { select: { id: true, name: true, city: true } },
        resource: { select: { id: true, resourceType: true, name: true } },
      },
    });

    emitToUser(reservation.userId, 'reservation:confirmed', {
      reservationId: id,
      status: 'CONFIRMED',
      hospital: confirmed.hospital,
      resource: confirmed.resource,
    });

    emitToHospital(reservation.hospitalId, 'reservation:confirmed', {
      reservationId: id,
      confirmedById,
    });

    addNotificationJob({
      userId: reservation.userId,
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Confirmed',
      message: `Your reservation at ${confirmed.hospital.name} has been confirmed.`,
      relatedEntityType: 'reservation',
      relatedEntityId: id,
    }).catch((err) => {
      logger.error('Failed to send confirmation notification', err);
    });

    logger.info(`Reservation confirmed: ${id} by staff ${confirmedById}`);

    return confirmed;
  }

  async cancel(id: string, userId: string, reason?: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
      throw new BadRequestError(`Cannot cancel reservation with status ${reservation.status}`);
    }

    if (reservation.userId !== userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
      if (!user || (user.role !== 'HOSPITAL' && user.role !== 'ADMIN' && user.role !== 'DOCTOR')) {
        throw new ForbiddenError('You are not authorized to cancel this reservation');
      }
    }

    const cancelled = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancellationReason: reason || null,
      },
      include: {
        user: { select: { id: true, fullName: true } },
        hospital: { select: { id: true, name: true } },
        resource: { select: { id: true, resourceType: true, name: true } },
      },
    });

    if (reservation.resourceId) {
      const hasOtherActiveReservations = await prisma.reservation.findFirst({
        where: {
          resourceId: reservation.resourceId,
          id: { not: id },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      });

      if (!hasOtherActiveReservations) {
        await prisma.resource.update({
          where: { id: reservation.resourceId },
          data: { status: 'AVAILABLE' },
        });
      }

      try {
        await getRedisClient().del(`reservation:lock:${reservation.resourceId}`);
      } catch { /* ignore */ }
    }

    emitToUser(reservation.userId, 'reservation:cancelled', {
      reservationId: id,
      status: 'CANCELLED',
      reason: reason || null,
    });

    emitToHospital(reservation.hospitalId, 'reservation:cancelled', {
      reservationId: id,
      reason: reason || null,
    });

    if (reservation.userId !== userId) {
      addNotificationJob({
        userId: reservation.userId,
        type: 'RESERVATION_CANCELLED',
        title: 'Reservation Cancelled',
        message: `Your reservation at ${cancelled.hospital.name} has been cancelled${reason ? ': ' + reason : '.'}`,
        relatedEntityType: 'reservation',
        relatedEntityId: id,
      }).catch((err) => {
        logger.error('Failed to send cancellation notification', err);
      });
    }

    logger.info(`Reservation cancelled: ${id} reason=${reason || 'none'}`);

    return cancelled;
  }

  async complete(id: string, userId: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
    });

    if (!reservation) throw new NotFoundError('Reservation not found');
    if (reservation.status !== 'CONFIRMED') {
      throw new BadRequestError(`Cannot complete reservation with status ${reservation.status}`);
    }

    const completed = await prisma.reservation.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        user: { select: { id: true, fullName: true } },
        hospital: { select: { id: true, name: true } },
        resource: { select: { id: true, resourceType: true, name: true } },
      },
    });

    if (reservation.resourceId) {
      await prisma.resource.update({
        where: { id: reservation.resourceId },
        data: { status: 'AVAILABLE' },
      });

      const resource = await prisma.resource.findUnique({
        where: { id: reservation.resourceId },
        include: { hospital: { select: { name: true } } },
      });

      if (resource) {
        const pendingReservations = await prisma.reservation.findMany({
          where: { resourceId: reservation.resourceId, status: 'PENDING' },
          select: { userId: true },
        });

        for (const pending of pendingReservations) {
          addNotificationJob({
            userId: pending.userId,
            type: 'RESOURCE_UPDATE',
            title: 'Resource Now Available',
            message: `${resource.resourceType} ${resource.name || ''} is now available at ${resource.hospital.name}.`,
            relatedEntityType: 'resource',
            relatedEntityId: reservation.resourceId,
          }).catch((err) => {
            logger.error('Failed to notify pending reservation user', err);
          });
        }
      }

      try {
        await getRedisClient().del(`reservation:lock:${reservation.resourceId}`);
      } catch { /* ignore */ }
    }

    emitToUser(reservation.userId, 'reservation:completed', {
      reservationId: id,
      status: 'COMPLETED',
    });

    emitToHospital(reservation.hospitalId, 'reservation:completed', {
      reservationId: id,
    });

    addNotificationJob({
      userId: reservation.userId,
      type: 'RESERVATION_CONFIRMED',
      title: 'Reservation Completed',
      message: `Your reservation at ${completed.hospital.name} has been completed. Thank you.`,
      relatedEntityType: 'reservation',
      relatedEntityId: id,
    }).catch((err) => {
      logger.error('Failed to send completion notification', err);
    });

    logger.info(`Reservation completed: ${id}`);

    return completed;
  }

  async getUserReservations(userId: string) {
    return prisma.reservation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        hospital: { select: { id: true, name: true, city: true, address: true } },
        resource: { select: { id: true, resourceType: true, name: true } },
        emergency: { select: { id: true, severity: true, symptoms: true } },
      },
    });
  }

  async getAll(filters: {
    status?: string;
    hospitalId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;

    const [data, total] = await Promise.all([
      prisma.reservation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, fullName: true, phone: true } },
          hospital: { select: { id: true, name: true, city: true } },
          resource: { select: { id: true, resourceType: true, name: true } },
          emergency: { select: { id: true, severity: true, status: true } },
        },
      }),
      prisma.reservation.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        hospital: { select: { id: true, name: true, city: true, address: true, phone: true } },
        resource: { select: { id: true, resourceType: true, name: true, locationInHospital: true } },
        emergency: { select: { id: true, severity: true, symptoms: true, status: true } },
      },
    });

    if (!reservation) throw new NotFoundError('Reservation not found');
    return reservation;
  }
}

export default new ReservationService();
