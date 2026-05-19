import prisma from '../../../infrastructure/database/prisma';
import { getRedisClient } from '../../../infrastructure/redis/client';
import { NotFoundError, BadRequestError } from '../../../shared/errors/AppError';
import { logger } from '../../../shared/utils/logger';

interface SearchFilters {
  q?: string;
  city?: string;
  specialization?: string;
  hasBlood?: boolean;
  bloodType?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
}

interface HospitalResult {
  id: string;
  name: string;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  specializations: string[];
  totalBeds: number;
  availableBeds: number;
  icuBeds: number;
  availableIcuBeds: number;
  ventilatorCount: number;
  availableVentilators: number;
  rating: number | null;
  verified: boolean;
  distance?: number;
  bloodAvailability?: { bloodType: string; unitsAvailable: number }[];
}

export class SearchService {
  async searchHospitals(filters: SearchFilters): Promise<{
    data: HospitalResult[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 10, 50);
    const skip = (page - 1) * limit;

    const where: any = { status: 'active', deletedAt: null };

    if (filters.q) {
      where.OR = [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { city: { contains: filters.q, mode: 'insensitive' } },
        { address: { contains: filters.q, mode: 'insensitive' } },
      ];
    }

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }

    if (filters.specialization) {
      where.specializations = { has: filters.specialization };
    }

    if (filters.hasBlood) {
      where.bloodStocks = {
        some: {
          unitsAvailable: { gt: 0 },
          ...(filters.bloodType ? { bloodType: filters.bloodType as any } : {}),
        },
      };
    }

    const [hospitals, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        orderBy: [{ verified: 'desc' }, { rating: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
        include: {
          bloodStocks: {
            where: { unitsAvailable: { gt: 0 } },
            select: { bloodType: true, unitsAvailable: true },
          },
        },
      }),
      prisma.hospital.count({ where }),
    ]);

    const redis = getRedisClient();

    const data = await Promise.all(
      hospitals.map(async (h) => {
        let distance: number | undefined;

        if (filters.lat != null && filters.lng != null && h.latitude != null && h.longitude != null) {
          distance = this.calculateDistance(filters.lat, filters.lng, h.latitude, h.longitude);

          if (filters.radius != null && distance > filters.radius) {
            return null;
          }
        }

        let bloodAvailability: { bloodType: string; unitsAvailable: number }[] | undefined;
        if (h.bloodStocks.length > 0) {
          bloodAvailability = h.bloodStocks.map((bs) => ({
            bloodType: bs.bloodType,
            unitsAvailable: bs.unitsAvailable,
          }));
        }

        const cacheKey = `hospital:stats:${h.id}`;
        let stats: { activeReservations?: number } | null = null;
        try {
          const cached = await redis.get(cacheKey);
          if (cached) {
            stats = JSON.parse(cached);
          }
        } catch {
          // cache miss — proceed without
        }

        return {
          id: h.id,
          name: h.name,
          address: h.address,
          city: h.city,
          state: h.state,
          country: h.country,
          latitude: h.latitude,
          longitude: h.longitude,
          phone: h.phone,
          email: h.email,
          website: h.website,
          specializations: h.specializations,
          totalBeds: h.totalBeds,
          availableBeds: h.availableBeds,
          icuBeds: h.icuBeds,
          availableIcuBeds: h.availableIcuBeds,
          ventilatorCount: h.ventilatorCount,
          availableVentilators: h.availableVentilators,
          rating: h.rating,
          verified: h.verified,
          distance,
          bloodAvailability,
        } as HospitalResult;
      }),
    );

    const filtered = data.filter((d): d is HospitalResult => d !== null);

    if (filters.lat != null && filters.lng != null) {
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    return {
      data: filtered,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async getHospitalDetails(id: string): Promise<HospitalResult & { resourceSummary: any }> {
    const hospital = await prisma.hospital.findUnique({
      where: { id },
      include: {
        bloodStocks: {
          select: { bloodType: true, unitsAvailable: true, unitsReserved: true },
        },
        resources: {
          where: { deletedAt: null },
          select: { id: true, resourceType: true, status: true },
        },
      },
    });

    if (!hospital || hospital.deletedAt) throw new NotFoundError('Hospital not found');

    const resourceSummary = {
      total: hospital.resources.length,
      available: hospital.resources.filter((r) => r.status === 'AVAILABLE').length,
      occupied: hospital.resources.filter((r) => r.status === 'OCCUPIED').length,
      reserved: hospital.resources.filter((r) => r.status === 'RESERVED').length,
      maintenance: hospital.resources.filter((r) => r.status === 'MAINTENANCE').length,
      byType: this.groupByType(hospital.resources),
    };

    return {
      id: hospital.id,
      name: hospital.name,
      address: hospital.address,
      city: hospital.city,
      state: hospital.state,
      country: hospital.country,
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      phone: hospital.phone,
      email: hospital.email,
      website: hospital.website,
      specializations: hospital.specializations,
      totalBeds: hospital.totalBeds,
      availableBeds: hospital.availableBeds,
      icuBeds: hospital.icuBeds,
      availableIcuBeds: hospital.availableIcuBeds,
      ventilatorCount: hospital.ventilatorCount,
      availableVentilators: hospital.availableVentilators,
      rating: hospital.rating,
      verified: hospital.verified,
      bloodAvailability: hospital.bloodStocks.map((bs) => ({
        bloodType: bs.bloodType,
        unitsAvailable: bs.unitsAvailable,
      })),
      resourceSummary,
    };
  }

  async getRecommendations(
    lat: number,
    lng: number,
    emergencyType?: string,
    radius: number = 25,
  ): Promise<HospitalResult[]> {
    if (lat == null || lng == null) {
      throw new BadRequestError('Latitude and longitude are required');
    }

    const hospitals = await prisma.hospital.findMany({
      where: {
        status: 'active',
        deletedAt: null,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        bloodStocks: {
          where: { unitsAvailable: { gt: 0 } },
          select: { bloodType: true, unitsAvailable: true },
        },
      },
    });

    const scored = hospitals
      .filter((h) => {
        if (h.latitude == null || h.longitude == null) return false;
        const dist = this.calculateDistance(lat, lng, h.latitude, h.longitude);
        return dist <= radius;
      })
      .map((h) => {
        const distance = this.calculateDistance(lat, lng, h.latitude!, h.longitude!);
        const availabilityScore =
          (h.availableBeds / Math.max(h.totalBeds, 1)) * 30 +
          (h.availableIcuBeds / Math.max(h.icuBeds, 1)) * 20 +
          (h.availableVentilators / Math.max(h.ventilatorCount, 1)) * 10;

        const distanceScore = Math.max(0, 30 - (distance / radius) * 30);

        const specializationScore = emergencyType
          ? h.specializations.some((s) => s.toLowerCase().includes(emergencyType.toLowerCase()))
            ? 10
            : 0
          : 5;

        const ratingScore = (h.rating || 0) * 3;

        const totalScore = availabilityScore + distanceScore + specializationScore + ratingScore;

        return {
          id: h.id,
          name: h.name,
          address: h.address,
          city: h.city,
          state: h.state,
          country: h.country,
          latitude: h.latitude,
          longitude: h.longitude,
          phone: h.phone,
          email: h.email,
          website: h.website,
          specializations: h.specializations,
          totalBeds: h.totalBeds,
          availableBeds: h.availableBeds,
          icuBeds: h.icuBeds,
          availableIcuBeds: h.availableIcuBeds,
          ventilatorCount: h.ventilatorCount,
          availableVentilators: h.availableVentilators,
          rating: h.rating,
          verified: h.verified,
          distance: Math.round(distance * 10) / 10,
          bloodAvailability: h.bloodStocks.map((bs) => ({
            bloodType: bs.bloodType,
            unitsAvailable: bs.unitsAvailable,
          })),
          _score: Math.round(totalScore * 10) / 10,
        } as HospitalResult & { _score: number };
      });

    scored.sort((a, b) => b._score - a._score);

    const redis = getRedisClient();
    const cacheKey = `recommendations:${lat}:${lng}:${emergencyType || 'all'}:${radius}`;
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(scored.slice(0, 10)));
    } catch {
      // cache write failure is non-fatal
    }

    logger.info(
      `Recommendations: found ${scored.length} hospitals near (${lat},${lng}) within ${radius}km`,
    );

    return scored.slice(0, 10).map(({ _score, ...rest }) => rest);
  }

  private groupByType(
    resources: { resourceType: string; status: string }[],
  ): Record<string, { total: number; available: number; occupied: number }> {
    const byType: Record<string, { total: number; available: number; occupied: number }> = {};
    for (const r of resources) {
      if (!byType[r.resourceType]) {
        byType[r.resourceType] = { total: 0, available: 0, occupied: 0 };
      }
      byType[r.resourceType].total++;
      if (r.status === 'AVAILABLE') byType[r.resourceType].available++;
      if (r.status === 'OCCUPIED') byType[r.resourceType].occupied++;
    }
    return byType;
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

export default new SearchService();
