import prisma from '../../../infrastructure/database/prisma';
import { emitToUser, emitToHospital } from '../../../infrastructure/websocket';
import { addNotificationJob } from '../../../infrastructure/queues';
import { NotFoundError, BadRequestError, ConflictError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';

export class BloodService {
  async getStock(filters: { hospitalId?: string; bloodType?: string }) {
    const where: any = {};
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;
    if (filters.bloodType) where.bloodType = filters.bloodType;

    const stock = await prisma.bloodStock.findMany({
      where,
      orderBy: [{ hospitalId: 'asc' }, { bloodType: 'asc' }],
      include: {
        hospital: { select: { id: true, name: true, city: true } },
      },
    });

    return stock;
  }

  async updateStock(hospitalId: string, bloodType: string, unitsAvailable: number, userId: string) {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    if (unitsAvailable < 0) throw new BadRequestError('Units available cannot be negative');

    const existing = await prisma.bloodStock.findUnique({
      where: { hospitalId_bloodType: { hospitalId, bloodType: bloodType as any } },
    });

    const oldUnits = existing?.unitsAvailable ?? 0;

    const stock = await prisma.bloodStock.upsert({
      where: { hospitalId_bloodType: { hospitalId, bloodType: bloodType as any } },
      update: { unitsAvailable },
      create: {
        hospitalId,
        bloodType: bloodType as any,
        unitsAvailable,
      },
      include: {
        hospital: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'BLOOD_STOCK_UPDATED',
        entityType: 'blood_stock',
        entityId: stock.id,
        oldValues: { unitsAvailable: oldUnits },
        newValues: { unitsAvailable },
      },
    });

    emitToHospital(hospitalId, 'blood:stock_update', {
      hospitalId,
      bloodType,
      unitsAvailable,
      previousUnits: oldUnits,
    });

    logger.info(`Blood stock updated: ${hospitalId} ${bloodType} ${oldUnits} -> ${unitsAvailable} by user ${userId}`);

    return stock;
  }

  async createRequest(data: {
    requestedById: string;
    hospitalId?: string;
    patientName?: string;
    bloodType: string;
    unitsNeeded: number;
    urgency?: string;
    emergencyId?: string;
    notes?: string;
  }) {
    if (data.unitsNeeded < 1) throw new BadRequestError('Units needed must be at least 1');

    const request = await prisma.bloodRequest.create({
      data: {
        requestedById: data.requestedById,
        hospitalId: data.hospitalId,
        patientName: data.patientName,
        bloodType: data.bloodType as any,
        unitsNeeded: data.unitsNeeded,
        urgency: (data.urgency as any) || 'NORMAL',
        emergencyId: data.emergencyId,
        notes: data.notes,
        status: 'PENDING',
      },
      include: {
        requestedBy: { select: { id: true, fullName: true, phone: true } },
        emergency: { select: { id: true, patientName: true, severity: true } },
      },
    });

    let warning: string | null = null;
    if (data.hospitalId) {
      const stock = await prisma.bloodStock.findUnique({
        where: { hospitalId_bloodType: { hospitalId: data.hospitalId, bloodType: data.bloodType as any } },
      });

      if (!stock || stock.unitsAvailable < data.unitsNeeded) {
        warning = `Low stock: only ${stock?.unitsAvailable ?? 0} units available, ${data.unitsNeeded} requested`;

        emitToHospital(data.hospitalId, 'blood:low_stock_warning', {
          bloodType: data.bloodType,
          unitsAvailable: stock?.unitsAvailable ?? 0,
          unitsRequested: data.unitsNeeded,
          requestId: request.id,
        });

        await addNotificationJob({
          userId: data.requestedById,
          type: 'BLOOD_REQUEST_STATUS',
          title: 'Blood Request - Low Stock Warning',
          message: warning,
          relatedEntityType: 'blood_request',
          relatedEntityId: request.id,
        });
      }

      emitToHospital(data.hospitalId, 'blood:request_created', {
        requestId: request.id,
        bloodType: data.bloodType,
        unitsNeeded: data.unitsNeeded,
        urgency: data.urgency || 'NORMAL',
        patientName: data.patientName,
      });
    }

    emitToUser(data.requestedById, 'blood:request_submitted', {
      requestId: request.id,
      bloodType: data.bloodType,
      unitsNeeded: data.unitsNeeded,
      status: 'PENDING',
    });

    await addNotificationJob({
      userId: data.requestedById,
      type: 'BLOOD_REQUEST_STATUS',
      title: 'Blood Request Submitted',
      message: `Your request for ${data.unitsNeeded} unit(s) of ${data.bloodType} blood has been submitted.`,
      relatedEntityType: 'blood_request',
      relatedEntityId: request.id,
    });

    logger.info(`Blood request created: ${request.id} type=${data.bloodType} units=${data.unitsNeeded} urgency=${data.urgency}`);

    return { ...request, warning };
  }

  async getRequests(filters: { userId?: string; status?: string; hospitalId?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.userId) where.requestedById = filters.userId;
    if (filters.status) where.status = filters.status;
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;

    const [data, total] = await Promise.all([
      prisma.bloodRequest.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          requestedBy: { select: { id: true, fullName: true } },
          emergency: { select: { id: true, patientName: true, severity: true } },
        },
      }),
      prisma.bloodRequest.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getRequestById(id: string) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id },
      include: {
        requestedBy: { select: { id: true, fullName: true, phone: true } },
        emergency: { select: { id: true, patientName: true, symptoms: true, severity: true, status: true } },
      },
    });

    if (!request) throw new NotFoundError('Blood request not found');
    return request;
  }

  async fulfillRequest(id: string, userId: string) {
    const request = await prisma.bloodRequest.findUnique({
      where: { id },
      include: { requestedBy: { select: { id: true, fullName: true } } },
    });
    if (!request) throw new NotFoundError('Blood request not found');
    if (request.status !== 'PENDING') throw new BadRequestError(`Request is already ${request.status.toLowerCase()}`);

    if (request.hospitalId) {
      const stock = await prisma.bloodStock.findUnique({
        where: { hospitalId_bloodType: { hospitalId: request.hospitalId, bloodType: request.bloodType } },
      });

      if (!stock || stock.unitsAvailable < request.unitsNeeded) {
        throw new BadRequestError(
          `Insufficient stock: ${stock?.unitsAvailable ?? 0} units available, ${request.unitsNeeded} needed`,
        );
      }

      await prisma.bloodStock.update({
        where: { id: stock.id },
        data: { unitsAvailable: { decrement: request.unitsNeeded } },
      });
    }

    const fulfilled = await prisma.bloodRequest.update({
      where: { id },
      data: { status: 'FULFILLED', fulfilledAt: new Date() },
      include: {
        requestedBy: { select: { id: true, fullName: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'BLOOD_REQUEST_FULFILLED',
        entityType: 'blood_request',
        entityId: id,
        oldValues: { status: 'PENDING' },
        newValues: { status: 'FULFILLED' },
      },
    });

    emitToUser(request.requestedById, 'blood:request_fulfilled', {
      requestId: id,
      bloodType: request.bloodType,
      unitsNeeded: request.unitsNeeded,
      status: 'FULFILLED',
    });

    if (request.hospitalId) {
      emitToHospital(request.hospitalId, 'blood:request_fulfilled', {
        requestId: id,
        bloodType: request.bloodType,
        unitsNeeded: request.unitsNeeded,
      });
    }

    await addNotificationJob({
      userId: request.requestedById,
      type: 'BLOOD_REQUEST_STATUS',
      title: 'Blood Request Fulfilled',
      message: `Your request for ${request.unitsNeeded} unit(s) of ${request.bloodType} blood has been fulfilled.`,
      relatedEntityType: 'blood_request',
      relatedEntityId: id,
    });

    logger.info(`Blood request fulfilled: ${id} by user ${userId}`);

    return fulfilled;
  }

  async cancelRequest(id: string, userId: string) {
    const request = await prisma.bloodRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundError('Blood request not found');
    if (request.status !== 'PENDING') throw new BadRequestError(`Cannot cancel a ${request.status.toLowerCase()} request`);

    const cancelled = await prisma.bloodRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    emitToUser(request.requestedById, 'blood:request_cancelled', {
      requestId: id,
      status: 'CANCELLED',
    });

    if (request.hospitalId) {
      emitToHospital(request.hospitalId, 'blood:request_cancelled', {
        requestId: id,
        bloodType: request.bloodType,
      });
    }

    logger.info(`Blood request cancelled: ${id} by user ${userId}`);

    return cancelled;
  }
}

export default new BloodService();
