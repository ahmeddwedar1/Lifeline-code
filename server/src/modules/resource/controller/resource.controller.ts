import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import resourceService from '../service/resource.service';

export class ResourceController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { hospitalId, resourceType, status, page, limit } = req.query;
      const filters: any = {
        hospitalId: hospitalId as string,
        resourceType: resourceType as string,
        status: status as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      };

      if (req.user!.role === 'HOSPITAL' && req.user!.hospitalId) {
        filters.hospitalId = req.user!.hospitalId;
      }

      const result = await resourceService.getAll(filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getAvailability(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await resourceService.getAvailability();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resource = await resourceService.getById(req.params.id);
      res.json({ success: true, data: resource });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resource = await resourceService.create(req.body, req.user!.id);
      res.status(201).json({ success: true, data: resource, message: 'Resource created' });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const resource = await resourceService.update(req.params.id, req.body, req.user!.id);
      res.json({ success: true, data: resource, message: 'Resource updated' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await resourceService.delete(req.params.id, req.user!.id);
      res.json({ success: true, message: 'Resource deleted' });
    } catch (err) {
      next(err);
    }
  }

  async getByHospital(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await resourceService.getByHospital(req.params.hospitalId);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

export default new ResourceController();
