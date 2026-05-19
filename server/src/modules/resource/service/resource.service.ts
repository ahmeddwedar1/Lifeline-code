import prisma from '../../../infrastructure/database/prisma';
import { emitToHospital, emitToRole } from '../../../infrastructure/websocket';
import { addNotificationJob } from '../../../infrastructure/queues';
import { NotFoundError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';

export class ResourceService {
  async getAll(filters: {
    hospitalId?: string;
    resourceType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (filters.hospitalId) where.hospitalId = filters.hospitalId;
    if (filters.resourceType) where.resourceType = filters.resourceType;
    if (filters.status) where.status = filters.status;

    const [data, total] = await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: [{ resourceType: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          hospital: { select: { id: true, name: true, city: true } },
        },
      }),
      prisma.resource.count({ where }),
    ]);

    return { data, pagination: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async getAvailability() {
    const resources = await prisma.resource.findMany({
      where: { deletedAt: null },
      include: {
        hospital: { select: { id: true, name: true, city: true, state: true } },
      },
    });

    const grouped = new Map<string, {
      hospital: { id: string; name: string; city: string | null; state: string | null };
      summary: { total: number; available: number; occupied: number; reserved: number; maintenance: number };
      byType: Record<string, { total: number; available: number; occupied: number }>;
    }>();

    for (const r of resources) {
      if (!grouped.has(r.hospitalId)) {
        grouped.set(r.hospitalId, {
          hospital: r.hospital,
          summary: { total: 0, available: 0, occupied: 0, reserved: 0, maintenance: 0 },
          byType: {},
        });
      }

      const entry = grouped.get(r.hospitalId)!;
      entry.summary.total++;

      if (r.status === 'AVAILABLE') entry.summary.available++;
      else if (r.status === 'OCCUPIED') entry.summary.occupied++;
      else if (r.status === 'RESERVED') entry.summary.reserved++;
      else if (r.status === 'MAINTENANCE') entry.summary.maintenance++;

      const typeKey = r.resourceType;
      if (!entry.byType[typeKey]) {
        entry.byType[typeKey] = { total: 0, available: 0, occupied: 0 };
      }
      entry.byType[typeKey].total++;
      if (r.status === 'AVAILABLE') entry.byType[typeKey].available++;
      if (r.status === 'OCCUPIED') entry.byType[typeKey].occupied++;
    }

    return Array.from(grouped.values());
  }

  async getById(id: string) {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        hospital: { select: { id: true, name: true, address: true, city: true, phone: true } },
      },
    });

    if (!resource || resource.deletedAt) throw new NotFoundError('Resource not found');
    return resource;
  }

  async create(data: {
    hospitalId: string;
    resourceType: string;
    name?: string;
    locationInHospital?: string;
    notes?: string;
    status?: string;
  }, userId: string) {
    const hospital = await prisma.hospital.findUnique({ where: { id: data.hospitalId } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    const resource = await prisma.resource.create({
      data: {
        hospitalId: data.hospitalId,
        resourceType: data.resourceType as any,
        name: data.name,
        locationInHospital: data.locationInHospital,
        notes: data.notes,
        status: (data.status as any) || 'AVAILABLE',
        lastUpdatedById: userId,
      },
      include: {
        hospital: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESOURCE_CREATED',
        entityType: 'resource',
        entityId: resource.id,
        newValues: {
          hospitalId: data.hospitalId,
          resourceType: data.resourceType,
          name: data.name,
          status: data.status || 'AVAILABLE',
        },
      },
    });

    emitToHospital(data.hospitalId, 'resource:availability_change', {
      hospitalId: data.hospitalId,
      resourceId: resource.id,
      resourceType: resource.resourceType,
      status: resource.status,
      action: 'created',
    });

    emitToRole('ADMIN', 'resource:availability_change', {
      hospitalId: data.hospitalId,
      resourceId: resource.id,
      resourceType: resource.resourceType,
      status: resource.status,
      action: 'created',
    });

    logger.info(`Resource created: ${resource.id} type=${resource.resourceType} hospital=${data.hospitalId}`);

    return resource;
  }

  async update(id: string, data: {
    resourceType?: string;
    name?: string;
    status?: string;
    locationInHospital?: string;
    notes?: string;
  }, userId: string) {
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundError('Resource not found');

    const oldValues: any = {};
    const newValues: any = {};

    if (data.resourceType && data.resourceType !== existing.resourceType) {
      oldValues.resourceType = existing.resourceType;
      newValues.resourceType = data.resourceType;
    }
    if (data.name !== undefined && data.name !== existing.name) {
      oldValues.name = existing.name;
      newValues.name = data.name;
    }
    if (data.status && data.status !== existing.status) {
      oldValues.status = existing.status;
      newValues.status = data.status;
    }
    if (data.locationInHospital !== undefined && data.locationInHospital !== existing.locationInHospital) {
      oldValues.locationInHospital = existing.locationInHospital;
      newValues.locationInHospital = data.locationInHospital;
    }
    if (data.notes !== undefined && data.notes !== existing.notes) {
      oldValues.notes = existing.notes;
      newValues.notes = data.notes;
    }

    const statusChanged = data.status && data.status !== existing.status;

    const resource = await prisma.resource.update({
      where: { id },
      data: {
        ...(data.resourceType && { resourceType: data.resourceType as any }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.status && { status: data.status as any }),
        ...(data.locationInHospital !== undefined && { locationInHospital: data.locationInHospital }),
        ...(data.notes !== undefined && { notes: data.notes }),
        lastUpdatedById: userId,
      },
      include: {
        hospital: { select: { id: true, name: true } },
      },
    });

    if (Object.keys(oldValues).length > 0) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'RESOURCE_UPDATED',
          entityType: 'resource',
          entityId: id,
          oldValues,
          newValues,
        },
      });
    }

    if (statusChanged) {
      emitToHospital(resource.hospitalId, 'resource:availability_change', {
        hospitalId: resource.hospitalId,
        resourceId: id,
        resourceType: resource.resourceType,
        status: resource.status,
        previousStatus: existing.status,
        action: 'status_changed',
      });

      emitToRole('ADMIN', 'resource:availability_change', {
        hospitalId: resource.hospitalId,
        resourceId: id,
        resourceType: resource.resourceType,
        status: resource.status,
        previousStatus: existing.status,
        action: 'status_changed',
      });

      if (resource.status === 'AVAILABLE') {
        const reservations = await prisma.reservation.findMany({
          where: { resourceId: id, status: 'PENDING' },
          select: { userId: true },
        });

        for (const reservation of reservations) {
          await addNotificationJob({
            userId: reservation.userId,
            type: 'RESOURCE_UPDATE',
            title: 'Resource Now Available',
            message: `${resource.resourceType} is now available at ${resource.hospital.name}.`,
            relatedEntityType: 'resource',
            relatedEntityId: id,
          });
        }
      }
    }

    logger.info(`Resource updated: ${id} status=${resource.status}`);

    return resource;
  }

  async delete(id: string, userId: string) {
    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) throw new NotFoundError('Resource not found');

    await prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date(), lastUpdatedById: userId },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'RESOURCE_DELETED',
        entityType: 'resource',
        entityId: id,
        oldValues: {
          resourceType: existing.resourceType,
          name: existing.name,
          status: existing.status,
          hospitalId: existing.hospitalId,
        },
      },
    });

    emitToHospital(existing.hospitalId, 'resource:availability_change', {
      hospitalId: existing.hospitalId,
      resourceId: id,
      resourceType: existing.resourceType,
      action: 'deleted',
    });

    emitToRole('ADMIN', 'resource:availability_change', {
      hospitalId: existing.hospitalId,
      resourceId: id,
      resourceType: existing.resourceType,
      action: 'deleted',
    });

    logger.info(`Resource deleted: ${id}`);
  }

  async getByHospital(hospitalId: string) {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    if (!hospital) throw new NotFoundError('Hospital not found');

    const resources = await prisma.resource.findMany({
      where: { hospitalId, deletedAt: null },
      orderBy: [{ resourceType: 'asc' }, { createdAt: 'desc' }],
    });

    const summary = {
      total: resources.length,
      available: resources.filter((r) => r.status === 'AVAILABLE').length,
      occupied: resources.filter((r) => r.status === 'OCCUPIED').length,
      reserved: resources.filter((r) => r.status === 'RESERVED').length,
      maintenance: resources.filter((r) => r.status === 'MAINTENANCE').length,
    };

    return { resources, summary };
  }
}

export default new ResourceService();
