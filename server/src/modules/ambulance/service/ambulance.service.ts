import prisma from '../../../infrastructure/database/prisma';
import { emitToUser, emitToRole, emitToAmbulance, emitToHospital } from '../../../infrastructure/websocket';
import { addNotificationJob } from '../../../infrastructure/queues';
import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';

export class AmbulanceService {
  async getAll(filters: { hospitalId?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.ambulance.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          hospital: { select: { id: true, name: true, city: true } },
        },
      }),
      prisma.ambulance.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const ambulance = await prisma.ambulance.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, name: true, address: true, city: true, phone: true } },
        assignments: {
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            emergency: { select: { id: true, patientName: true, symptoms: true, severity: true, status: true, locationAddress: true, latitude: true, longitude: true } },
          },
        },
      },
    });

    if (!ambulance) throw new NotFoundError('Ambulance not found');
    return ambulance;
  }

  async create(data: { hospitalId: string; unitNumber: string; driverName?: string; driverPhone?: string }) {
    const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    const existing = await prisma.ambulance.findFirst({
      where: { hospitalId: data.hospitalId, unitNumber: data.unitNumber },
    });
    if (existing) throw new BadRequestError('Ambulance with this unit number already exists in this hospital');

    const ambulance = await prisma.ambulance.create({
      data: {
        hospitalId: data.hospitalId,
        unitNumber: data.unitNumber,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        status: 'AVAILABLE',
      },
      include: {
        hospital: { select: { id: true, name: true } },
      },
    });

    emitToHospital(data.hospitalId, 'ambulance:created', { ambulance });
    emitToRole('ADMIN', 'ambulance:created', { ambulance });

    logger.info(`Ambulance created: ${ambulance.id} unit=${data.unitNumber} hospital=${data.hospitalId}`);

    return ambulance;
  }

  async dispatch(id: string, emergencyId: string, userId: string) {
    const ambulance = await prisma.ambulance.findUnique({ where: { id } });
    if (!ambulance) throw new NotFoundError('Ambulance not found');
    if (ambulance.status !== 'AVAILABLE') throw new BadRequestError(`Ambulance is currently ${ambulance.status.toLowerCase()}`);

    const emergency = await prisma.emergencyRequest.findUnique({ where: { id: emergencyId } });
    if (!emergency) throw new NotFoundError('Emergency not found');
    if (emergency.status === 'RESOLVED' || emergency.status === 'CLOSED') throw new BadRequestError('Emergency is already resolved or closed');

    const assignment = await prisma.ambulanceAssignment.create({
      data: {
        ambulanceId: id,
        emergencyId,
        driverId: userId,
        status: 'DISPATCHED',
      },
      include: {
        ambulance: { select: { id: true, unitNumber: true, currentLat: true, currentLng: true, driverName: true, driverPhone: true } },
        emergency: { select: { id: true, reportedById: true, latitude: true, longitude: true } },
      },
    });

    await prisma.ambulance.update({
      where: { id },
      data: { status: 'DISPATCHED' },
    });

    await prisma.emergencyRequest.update({
      where: { id: emergencyId },
      data: { assignedAmbulanceId: id, status: 'ASSIGNED' },
    });

    let eta: number | null = null;
    if (ambulance.currentLat && ambulance.currentLng && emergency.latitude && emergency.longitude) {
      eta = this.calculateEta(ambulance.currentLat, ambulance.currentLng, emergency.latitude, emergency.longitude);
      const estimatedArrival = new Date(Date.now() + eta * 60 * 1000);
      await prisma.ambulance.update({
        where: { id },
        data: { estimatedArrival },
      });
    }

    const dispatchPayload = {
      assignmentId: assignment.id,
      ambulanceId: id,
      emergencyId,
      unitNumber: ambulance.unitNumber,
      driverName: ambulance.driverName,
      driverPhone: ambulance.driverPhone,
      eta,
    };

    emitToUser(emergency.reportedById, 'ambulance:dispatched', dispatchPayload);
    emitToAmbulance(id, 'ambulance:dispatch_assigned', { ...dispatchPayload, emergency });
    emitToHospital(ambulance.hospitalId, 'ambulance:dispatched', dispatchPayload);

    await addNotificationJob({
      userId: emergency.reportedById,
      type: 'AMBULANCE_UPDATE',
      title: 'Ambulance Dispatched',
      message: `Ambulance ${ambulance.unitNumber} is on its way. Estimated arrival: ${eta ? `${eta} minutes` : 'calculating...'}`,
      relatedEntityType: 'emergency',
      relatedEntityId: emergencyId,
    });

    logger.info(`Ambulance dispatched: ${id} -> emergency ${emergencyId} eta=${eta}`);

    return { ...dispatchPayload, assignment };
  }

  async updateLocation(id: string, latitude: number, longitude: number) {
    const ambulance = await prisma.ambulance.findUnique({ where: { id } });
    if (!ambulance) throw new NotFoundError('Ambulance not found');

    const activeAssignment = await prisma.ambulanceAssignment.findFirst({
      where: { ambulanceId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, emergency: { select: { reportedById: true } } },
    });

    await prisma.ambulance.update({
      where: { id },
      data: { currentLat: latitude, currentLng: longitude, lastLocationUpdate: new Date() },
    });

    if (activeAssignment) {
      await prisma.routeTracking.create({
        data: {
          assignmentId: activeAssignment.id,
          latitude,
          longitude,
          timestamp: new Date(),
        },
      });
    }

    const locationPayload = { ambulanceId: id, latitude, longitude, timestamp: new Date() };
    emitToAmbulance(id, 'ambulance:location_update', locationPayload);

    if (activeAssignment) {
      emitToUser(activeAssignment.emergency.reportedById, 'ambulance:location_update', locationPayload);
    }

    return locationPayload;
  }

  async updateStatus(id: string, status: string, userId: string) {
    const ambulance = await prisma.ambulance.findUnique({ where: { id } });
    if (!ambulance) throw new NotFoundError('Ambulance not found');

    const validTransitions: Record<string, string[]> = {
      AVAILABLE: ['DISPATCHED', 'MAINTENANCE'],
      DISPATCHED: ['EN_ROUTE', 'RETURNING', 'MAINTENANCE'],
      EN_ROUTE: ['AT_SCENE', 'RETURNING', 'MAINTENANCE'],
      AT_SCENE: ['RETURNING', 'MAINTENANCE'],
      RETURNING: ['AVAILABLE', 'MAINTENANCE'],
      MAINTENANCE: ['AVAILABLE'],
    };

    const allowed = validTransitions[ambulance.status];
    if (!allowed || !allowed.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${ambulance.status} to ${status}`);
    }

    const updated = await prisma.ambulance.update({
      where: { id },
      data: { status: status as any },
    });

    if ((status === 'RETURNING' || status === 'AVAILABLE') && ambulance.status !== 'MAINTENANCE') {
      const activeAssignment = await prisma.ambulanceAssignment.findFirst({
        where: { ambulanceId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        include: { emergency: { select: { reportedById: true } } },
      });

      if (activeAssignment) {
        await prisma.ambulanceAssignment.update({
          where: { id: activeAssignment.id },
          data: { status: status === 'AVAILABLE' ? 'COMPLETED' : 'COMPLETED', completedAt: new Date() },
        });

        if (status === 'AVAILABLE') {
          await prisma.ambulance.update({
            where: { id },
            data: { estimatedArrival: null },
          });
        }

        const statusPayload = { ambulanceId: id, status, emergencyId: activeAssignment.emergencyId };
        emitToUser(activeAssignment.emergency.reportedById, 'ambulance:status_update', statusPayload);

        await addNotificationJob({
          userId: activeAssignment.emergency.reportedById,
          type: 'AMBULANCE_UPDATE',
          title: 'Ambulance Status Updated',
          message: `Ambulance ${ambulance.unitNumber} status: ${status.replace('_', ' ').toLowerCase()}.`,
          relatedEntityType: 'emergency',
          relatedEntityId: activeAssignment.emergencyId,
        });
      }
    }

    emitToAmbulance(id, 'ambulance:status_update', { ambulanceId: id, status });
    emitToHospital(ambulance.hospitalId, 'ambulance:status_update', { ambulanceId: id, status, unitNumber: ambulance.unitNumber });

    logger.info(`Ambulance status updated: ${id} ${ambulance.status} -> ${status}`);

    return updated;
  }

  async getByEmergency(emergencyId: string) {
    const emergency = await prisma.emergencyRequest.findUnique({ where: { id: emergencyId } });
    if (!emergency) throw new NotFoundError('Emergency not found');

    const assignment = await prisma.ambulanceAssignment.findFirst({
      where: { emergencyId },
      orderBy: { createdAt: 'desc' },
      include: {
        ambulance: {
          include: {
            hospital: { select: { id: true, name: true, city: true } },
          },
        },
      },
    });

    if (!assignment) throw new NotFoundError('No ambulance assigned to this emergency');
    return assignment;
  }

  private calculateEta(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;
    const avgSpeedKmph = 40;
    return Math.round((distanceKm / avgSpeedKmph) * 60);
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}

export default new AmbulanceService();
