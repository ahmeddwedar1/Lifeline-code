import prisma from '../../../infrastructure/database/prisma';
import { classifyEmergency } from '../../../shared/utils/priorityEngine';
import { emitToRole, emitToHospital, emitToUser } from '../../../infrastructure/websocket';
import { addNotificationJob } from '../../../infrastructure/queues';
import { BadRequestError, NotFoundError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';

export class EmergencyService {
  async create(data: {
    reportedById: string;
    patientName?: string;
    patientAge?: number;
    symptoms: string;
    locationAddress?: string;
    latitude?: number;
    longitude?: number;
  }) {
    const classification = classifyEmergency(data.symptoms);

    const emergency = await prisma.emergencyRequest.create({
      data: {
        reportedById: data.reportedById,
        patientName: data.patientName,
        patientAge: data.patientAge,
        symptoms: data.symptoms,
        locationAddress: data.locationAddress,
        latitude: data.latitude,
        longitude: data.longitude,
        severity: classification.severity,
        priorityScore: classification.score,
        status: 'CLASSIFIED',
        recommendedResponse: this.buildRecommendedResponse(classification),
      },
      include: {
        reportedBy: { select: { id: true, fullName: true } },
      },
    });

    const recommendedHospitals = await this.findRecommendedHospitals(
      classification.severity,
      data.latitude,
      data.longitude,
    );

    if (classification.severity === 'CRITICAL' || classification.severity === 'URGENT') {
      emitToRole('DOCTOR', 'emergency:new', { emergency, recommendedHospitals });
      emitToRole('HOSPITAL', 'emergency:new', { emergency, recommendedHospitals });
    }

    await addNotificationJob({
      userId: data.reportedById,
      type: 'EMERGENCY_ALERT',
      title: `Emergency ${classification.severity === 'CRITICAL' ? '🚨' : '⚠️'} Report Submitted`,
      message: `Your emergency has been classified as ${classification.severity} (Score: ${classification.score}). Help is on the way.`,
      relatedEntityType: 'emergency',
      relatedEntityId: emergency.id,
    });

    emitToUser(data.reportedById, 'emergency:classified', {
      id: emergency.id,
      severity: classification.severity,
      score: classification.score,
      recommendedHospitals,
    });

    logger.info(`Emergency created: ${emergency.id} severity=${classification.severity} score=${classification.score}`);

    return { ...emergency, recommendedHospitals };
  }

  async findRecommendedHospitals(severity: string, lat?: number, lng?: number) {
    const criticalTypes = severity === 'CRITICAL' || severity === 'URGENT';

    const hospitals = await prisma.hospital.findMany({
      where: {
        status: 'active',
        availableBeds: { gt: criticalTypes ? 0 : undefined },
        ...(criticalTypes ? { availableIcuBeds: { gt: 0 } } : {}),
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        latitude: true,
        longitude: true,
        availableBeds: true,
        availableIcuBeds: true,
        availableVentilators: true,
        specializations: true,
        rating: true,
      },
      take: 10,
    });

    if (lat && lng) {
      return hospitals
        .map((h) => ({
          ...h,
          distance: this.calculateDistance(lat, lng, h.latitude || 0, h.longitude || 0),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    }

    return hospitals;
  }

  async getAll(filters: {
    status?: string;
    severity?: string;
    hospitalId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.severity) where.severity = filters.severity;
    if (filters.hospitalId) where.assignedHospitalId = filters.hospitalId;

    const [data, total] = await Promise.all([
      prisma.emergencyRequest.findMany({
        where,
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          reportedBy: { select: { id: true, fullName: true } },
          assignedHospital: { select: { id: true, name: true } },
          assignedAmbulance: { select: { id: true, unitNumber: true } },
        },
      }),
      prisma.emergencyRequest.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getById(id: string) {
    const emergency = await prisma.emergencyRequest.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { id: true, fullName: true, phone: true } },
        assignedHospital: true,
        assignedAmbulance: true,
        reservations: { include: { resource: true } },
        bloodRequests: true,
      },
    });
    if (!emergency) throw new NotFoundError('Emergency not found');
    return emergency;
  }

  async updateStatus(id: string, status: string, userId: string) {
    const emergency = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!emergency) throw new NotFoundError('Emergency not found');

    const updated = await prisma.emergencyRequest.update({
      where: { id },
      data: { status: status as any },
    });

    emitToUser(emergency.reportedById, 'emergency:status_update', {
      emergencyId: id,
      status,
    });

    emitToRole('HOSPITAL', 'emergency:status_update', { emergencyId: id, status });

    await addNotificationJob({
      userId: emergency.reportedById,
      type: 'EMERGENCY_ALERT',
      title: 'Emergency Status Updated',
      message: `Your emergency status has been updated to ${status}.`,
      relatedEntityType: 'emergency',
      relatedEntityId: id,
    });

    return updated;
  }

  async assignEmergency(id: string, data: { hospitalId?: string; ambulanceId?: string }, userId: string) {
    const emergency = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!emergency) throw new NotFoundError('Emergency not found');

    const updateData: any = { status: 'ASSIGNED' };

    if (data.hospitalId) {
      updateData.assignedHospitalId = data.hospitalId;
    }
    if (data.ambulanceId) {
      updateData.assignedAmbulanceId = data.ambulanceId;
      await prisma.ambulance.update({
        where: { id: data.ambulanceId },
        data: { status: 'DISPATCHED', assignedEmergencyId: id },
      });
      await prisma.ambulanceAssignment.create({
        data: {
          ambulanceId: data.ambulanceId,
          emergencyId: id,
          driverId: userId,
          status: 'DISPATCHED',
        },
      });
    }

    const updated = await prisma.emergencyRequest.update({
      where: { id },
      data: updateData,
      include: {
        assignedHospital: true,
        assignedAmbulance: true,
      },
    });

    emitToUser(emergency.reportedById, 'emergency:assigned', {
      emergencyId: id,
      hospital: updated.assignedHospital,
      ambulance: updated.assignedAmbulance,
    });

    if (data.hospitalId) {
      emitToHospital(data.hospitalId, 'emergency:assigned_to_hospital', {
        emergencyId: id,
        emergency,
      });
    }

    return updated;
  }

  async getUserEmergencies(userId: string) {
    return prisma.emergencyRequest.findMany({
      where: { reportedById: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        assignedHospital: { select: { id: true, name: true } },
        assignedAmbulance: { select: { id: true, unitNumber: true } },
      },
    });
  }

  async overridePriority(id: string, severity: string, score: number, userId: string) {
    const emergency = await prisma.emergencyRequest.findUnique({ where: { id } });
    if (!emergency) throw new NotFoundError('Emergency not found');

    return prisma.emergencyRequest.update({
      where: { id },
      data: {
        severity: severity as any,
        priorityScore: Math.min(100, Math.max(0, score)),
      },
    });
  }

  private buildRecommendedResponse(classification: { severity: string; keywords: string[] }): string {
    const responses: Record<string, string> = {
      CRITICAL: 'Immediate ambulance dispatch required. Alert nearest trauma center. Prepare ICU/ER team.',
      URGENT: 'Urgent medical attention needed. Dispatch ambulance. Alert nearest emergency department.',
      NORMAL: 'Schedule hospital visit within 24 hours. Monitor symptoms closely.',
      LOW: 'Self-care recommended. Consult primary care physician if symptoms persist.',
    };
    return responses[classification.severity] || 'Medical evaluation recommended.';
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }
}

export default new EmergencyService();
