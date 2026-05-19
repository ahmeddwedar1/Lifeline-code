import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import ambulanceService from '../service/ambulance.service';

export class AmbulanceController {
  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { hospitalId, status, page, limit } = req.query;
      const filters: any = {
        hospitalId: hospitalId as string,
        status: status as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      };

      if (req.user!.role === 'HOSPITAL' && (req.user as any).hospitalId) {
        filters.hospitalId = (req.user as any).hospitalId;
      }

      const result = await ambulanceService.getAll(filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ambulance = await ambulanceService.getById(req.params.id);
      res.json({ success: true, data: ambulance });
    } catch (err) {
      next(err);
    }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const ambulance = await ambulanceService.create(req.body);
      res.status(201).json({ success: true, data: ambulance, message: 'Ambulance registered' });
    } catch (err) {
      next(err);
    }
  }

  async dispatch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ambulanceService.dispatch(req.params.id, req.body.emergencyId, req.user!.id);
      res.json({ success: true, data: result, message: 'Ambulance dispatched' });
    } catch (err) {
      next(err);
    }
  }

  async updateLocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { latitude, longitude } = req.body;
      const result = await ambulanceService.updateLocation(req.params.id, latitude, longitude);
      res.json({ success: true, data: result, message: 'Location updated' });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await ambulanceService.updateStatus(req.params.id, req.body.status, req.user!.id);
      res.json({ success: true, data: updated, message: 'Ambulance status updated' });
    } catch (err) {
      next(err);
    }
  }

  async getByEmergency(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await ambulanceService.getByEmergency(req.params.emergencyId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

export default new AmbulanceController();
