import prisma from '../../../infrastructure/database/prisma';
import { addNotificationJob, addEmailJob } from '../../../infrastructure/queues';
import { emitToRole } from '../../../infrastructure/websocket';
import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['SUSPENDED', 'INACTIVE'],
  INACTIVE: ['ACTIVE'],
  SUSPENDED: ['ACTIVE'],
  PENDING_VERIFICATION: ['ACTIVE', 'SUSPENDED'],
  PENDING_DOCUMENTS: ['ACTIVE', 'SUSPENDED'],
};

export class AdminService {
  async getSystemStats() {
    const [
      totalUsers,
      totalActiveUsers,
      totalPublicUsers,
      totalDoctors,
      totalHospitalsUsers,
      totalAmbulanceUsers,
      totalAdmins,
      totalEmergencies,
      pendingEmergencies,
      activeEmergencies,
      resolvedEmergencies,
      totalHospitals,
      totalResources,
      totalAvailableResources,
      totalReservations,
      pendingReservations,
      confirmedReservations,
      totalBloodRequests,
      pendingBloodRequests,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'PUBLIC_USER' } }),
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.user.count({ where: { role: 'HOSPITAL' } }),
      prisma.user.count({ where: { role: 'AMBULANCE' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.emergencyRequest.count(),
      prisma.emergencyRequest.count({ where: { status: 'PENDING' } }),
      prisma.emergencyRequest.count({
        where: { status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
      }),
      prisma.emergencyRequest.count({ where: { status: 'RESOLVED' } }),
      prisma.hospital.count({ where: { deletedAt: null } }),
      prisma.resource.count({ where: { deletedAt: null } }),
      prisma.resource.count({ where: { status: 'AVAILABLE' } }),
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'CONFIRMED' } }),
      prisma.bloodRequest.count(),
      prisma.bloodRequest.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: totalActiveUsers,
        byRole: {
          PUBLIC_USER: totalPublicUsers,
          DOCTOR: totalDoctors,
          HOSPITAL: totalHospitalsUsers,
          AMBULANCE: totalAmbulanceUsers,
          ADMIN: totalAdmins,
        },
      },
      emergencies: {
        total: totalEmergencies,
        pending: pendingEmergencies,
        active: activeEmergencies,
        resolved: resolvedEmergencies,
      },
      hospitals: totalHospitals,
      resources: {
        total: totalResources,
        available: totalAvailableResources,
      },
      reservations: {
        total: totalReservations,
        pending: pendingReservations,
        confirmed: confirmedReservations,
      },
      bloodRequests: {
        total: totalBloodRequests,
        pending: pendingBloodRequests,
      },
    };
  }

  async getUsers(filters: {
    role?: string;
    status?: string;
    hospitalId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { role, status, hospitalId, search, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (role) where.role = role;
    if (status) where.status = status;
    if (hospitalId) where.hospitalId = hospitalId;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          emailVerified: true,
          lastLogin: true,
          createdAt: true,
          hospitalId: true,
          hospital: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getUserDetails(id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        status: true,
        emailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        hospitalId: true,
        hospital: { select: { id: true, name: true } },
        doctorProfile: true,
        _count: {
          select: {
            emergencies: true,
            reservations: true,
            bloodRequests: true,
            notifications: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async updateUserStatus(id: string, status: string, adminId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    const allowedTransitions = VALID_STATUS_TRANSITIONS[user.status];
    if (!allowedTransitions || !allowedTransitions.includes(status)) {
      throw new BadRequestError(`Cannot transition from ${user.status} to ${status}`);
    }

    const oldValues = { status: user.status };
    const updated = await prisma.user.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'UPDATE_USER_STATUS',
        entityType: 'User',
        entityId: id,
        oldValues,
        newValues: { status },
        ipAddress,
        userAgent,
      },
    });

    await addNotificationJob({
      userId: id,
      type: 'SYSTEM_ALERT',
      title: 'Account Status Updated',
      message: `Your account status has been changed to ${status}.`,
    });

    if (status === 'SUSPENDED') {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    return updated;
  }

  async deleteUser(id: string, adminId: string, ipAddress?: string, userAgent?: string) {
    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundError('User not found');

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'INACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_USER',
        entityType: 'User',
        entityId: id,
        oldValues: { fullName: user.fullName, email: user.email, role: user.role },
        ipAddress,
        userAgent,
      },
    });

    await prisma.session.deleteMany({ where: { userId: id } });
  }

  async createHospital(data: {
    name: string;
    address: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    specializations?: string[];
    totalBeds?: number;
    availableBeds?: number;
    icuBeds?: number;
    availableIcuBeds?: number;
    nicuBeds?: number;
    availableNicuBeds?: number;
    ventilatorCount?: number;
    availableVentilators?: number;
  }) {
    const hospital = await prisma.hospital.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        state: data.state,
        country: data.country,
        latitude: data.latitude,
        longitude: data.longitude,
        phone: data.phone,
        email: data.email,
        website: data.website,
        specializations: data.specializations || [],
        totalBeds: data.totalBeds || 0,
        availableBeds: data.availableBeds || 0,
        icuBeds: data.icuBeds || 0,
        availableIcuBeds: data.availableIcuBeds || 0,
        nicuBeds: data.nicuBeds || 0,
        availableNicuBeds: data.availableNicuBeds || 0,
        ventilatorCount: data.ventilatorCount || 0,
        availableVentilators: data.availableVentilators || 0,
      },
    });
    return hospital;
  }

  async updateHospital(id: string, data: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    email?: string;
    website?: string;
    status?: string;
    specializations?: string[];
    rating?: number;
    verified?: boolean;
  }) {
    const hospital = await prisma.hospital.findFirst({ where: { id, deletedAt: null } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    return prisma.hospital.update({ where: { id }, data });
  }

  async deleteHospital(id: string, adminId: string, ipAddress?: string, userAgent?: string) {
    const hospital = await prisma.hospital.findFirst({ where: { id, deletedAt: null } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    await prisma.hospital.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'DELETE_HOSPITAL',
        entityType: 'Hospital',
        entityId: id,
        oldValues: { name: hospital.name },
        ipAddress,
        userAgent,
      },
    });
  }

  async updateHospitalBeds(
    id: string,
    data: {
      totalBeds?: number;
      availableBeds?: number;
      icuBeds?: number;
      availableIcuBeds?: number;
      nicuBeds?: number;
      availableNicuBeds?: number;
      ventilatorCount?: number;
      availableVentilators?: number;
    },
  ) {
    const hospital = await prisma.hospital.findFirst({ where: { id, deletedAt: null } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    return prisma.hospital.update({ where: { id }, data });
  }

  async generateReport(
    type: string,
    parameters: Record<string, any>,
    userId: string,
  ) {
    let data: any;

    switch (type) {
      case 'emergency_summary': {
        const { startDate, endDate, hospitalId } = parameters;
        const where: any = {};
        if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
        if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        if (hospitalId) where.assignedHospitalId = hospitalId;

        const emergencies = await prisma.emergencyRequest.findMany({
          where,
          include: {
            reportedBy: { select: { id: true, fullName: true } },
            assignedHospital: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const totalEmergencies = emergencies.length;
        const byStatus = emergencies.reduce(
          (acc: Record<string, number>, e) => {
            acc[e.status] = (acc[e.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
        const bySeverity = emergencies.reduce(
          (acc: Record<string, number>, e) => {
            if (e.severity) {
              acc[e.severity] = (acc[e.severity] || 0) + 1;
            }
            return acc;
          },
          {} as Record<string, number>,
        );

        data = { total: totalEmergencies, byStatus, bySeverity, records: emergencies };
        break;
      }

      case 'resource_usage': {
        const { hospitalId, resourceType } = parameters;
        const where: any = { deletedAt: null };
        if (hospitalId) where.hospitalId = hospitalId;
        if (resourceType) where.resourceType = resourceType;

        const resources = await prisma.resource.findMany({
          where,
          include: { hospital: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        });

        const total = resources.length;
        const byStatus = resources.reduce(
          (acc: Record<string, number>, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );
        const byType = resources.reduce(
          (acc: Record<string, number>, r) => {
            acc[r.resourceType] = (acc[r.resourceType] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        data = { total, byStatus, byType, records: resources };
        break;
      }

      case 'reservation_analytics': {
        const { startDate, endDate, hospitalId, status } = parameters;
        const where: any = {};
        if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
        if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
        if (hospitalId) where.hospitalId = hospitalId;
        if (status) where.status = status;

        const reservations = await prisma.reservation.findMany({
          where,
          include: {
            user: { select: { id: true, fullName: true } },
            hospital: { select: { id: true, name: true } },
            resource: { select: { id: true, name: true, resourceType: true } },
          },
          orderBy: { createdAt: 'desc' },
        });

        const total = reservations.length;
        const byStatus = reservations.reduce(
          (acc: Record<string, number>, r) => {
            acc[r.status] = (acc[r.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        );

        data = { total, byStatus, records: reservations };
        break;
      }

      case 'system_health': {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const [
          activeSessions,
          newUsers24h,
          newEmergencies24h,
          pendingReservations,
          criticalEmergencies,
          hospitalsWithLowBeds,
        ] = await Promise.all([
          prisma.session.count({ where: { expiresAt: { gt: now } } }),
          prisma.user.count({ where: { createdAt: { gte: last24h } } }),
          prisma.emergencyRequest.count({ where: { createdAt: { gte: last24h } } }),
          prisma.reservation.count({ where: { status: 'PENDING' } }),
          prisma.emergencyRequest.count({ where: { severity: 'CRITICAL', status: { notIn: ['RESOLVED', 'CLOSED'] } } }),
          prisma.hospital.count({
            where: {
              deletedAt: null,
              availableBeds: { lte: 5 },
            },
          }),
        ]);

        data = {
          timestamp: now,
          activeSessions,
          newUsers24h,
          newEmergencies24h,
          pendingReservations,
          criticalEmergencies,
          hospitalsWithLowBeds,
          status: criticalEmergencies > 0 || hospitalsWithLowBeds > 0 ? 'WARNING' : 'HEALTHY',
        };
        break;
      }

      case 'user_activity': {
        const { startDate, endDate, role } = parameters;
        const where: any = { deletedAt: null };
        if (role) where.role = role;

        const users = await prisma.user.findMany({
          where,
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            status: true,
            lastLogin: true,
            createdAt: true,
            _count: {
              select: {
                emergencies: true,
                reservations: true,
                bloodRequests: true,
                sessions: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        data = {
          total: users.length,
          activeUsers: users.filter((u) => u.status === 'ACTIVE').length,
          users,
        };
        break;
      }

      default:
        throw new BadRequestError(`Unknown report type: ${type}`);
    }

    const report = await (prisma as any).report.create({
      data: {
        type,
        parameters,
        data,
        generatedBy: userId,
      },
    });

    return report;
  }

  async getReports(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      (prisma as any).report.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          parameters: true,
          createdAt: true,
          generatedBy: true,
        },
      }),
      (prisma as any).report.count(),
    ]);

    return {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getReport(id: string) {
    const report = await (prisma as any).report.findUnique({ where: { id } });
    if (!report) throw new NotFoundError('Report not found');
    return report;
  }

  async getAuditLogs(filters: {
    userId?: string;
    entityType?: string;
    entityId?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entityType, entityId, action, startDate, endDate, page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async broadcastAlert(title: string, message: string, adminId: string) {
    const activeUsers = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    if (activeUsers.length > 0) {
      const notificationData = activeUsers.map((user) => ({
        recipientId: user.id,
        type: 'SYSTEM_ALERT' as const,
        title,
        message,
        metadata: { broadcastBy: adminId },
      }));

      await prisma.notification.createMany({ data: notificationData });
    }

    emitToRole('PUBLIC_USER', 'broadcast:alert', { title, message });
    emitToRole('DOCTOR', 'broadcast:alert', { title, message });
    emitToRole('HOSPITAL', 'broadcast:alert', { title, message });
    emitToRole('AMBULANCE', 'broadcast:alert', { title, message });
    emitToRole('ADMIN', 'broadcast:alert', { title, message });

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'BROADCAST_ALERT',
        entityType: 'Notification',
        oldValues: null,
        newValues: { title, message, recipientCount: activeUsers.length },
      },
    });

    return { recipientCount: activeUsers.length };
  }
}

export default new AdminService();
