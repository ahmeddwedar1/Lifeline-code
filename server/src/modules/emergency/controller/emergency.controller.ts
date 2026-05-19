import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import emergencyService from '../service/emergency.service';

export class EmergencyController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const emergency = await emergencyService.create({
        ...req.body,
        reportedById: req.user!.id,
      });
      res.status(201).json({ success: true, data: emergency, message: 'Emergency reported' });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, severity, hospitalId, page, limit } = req.query;
      let filters: any = { status, severity, hospitalId, page: Number(page), limit: Number(limit) };

      if (req.user!.role === 'HOSPITAL' && req.user!.hospitalId) {
        filters.hospitalId = req.user!.hospitalId;
      }

      const result = await emergencyService.getAll(filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const emergency = await emergencyService.getById(req.params.id);
      res.json({ success: true, data: emergency });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await emergencyService.updateStatus(req.params.id, req.body.status, req.user!.id);
      res.json({ success: true, data: updated, message: 'Status updated' });
    } catch (err) {
      next(err);
    }
  }

  async assign(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const updated = await emergencyService.assignEmergency(req.params.id, req.body, req.user!.id);
      res.json({ success: true, data: updated, message: 'Emergency assigned' });
    } catch (err) {
      next(err);
    }
  }

  async getMyEmergencies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const emergencies = await emergencyService.getUserEmergencies(req.user!.id);
      res.json({ success: true, data: emergencies });
    } catch (err) {
      next(err);
    }
  }

  async overridePriority(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { severity, score } = req.body;
      const updated = await emergencyService.overridePriority(req.params.id, severity, score, req.user!.id);
      res.json({ success: true, data: updated, message: 'Priority overridden' });
    } catch (err) {
      next(err);
    }
  }
}

export default new EmergencyController();
