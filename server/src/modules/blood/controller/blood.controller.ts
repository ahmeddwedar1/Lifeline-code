import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import bloodService from '../service/blood.service';

export class BloodController {
  async getStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { hospitalId, bloodType } = req.query;
      const stock = await bloodService.getStock({
        hospitalId: hospitalId as string,
        bloodType: bloodType as string,
      });
      res.json({ success: true, data: stock });
    } catch (err) {
      next(err);
    }
  }

  async updateStock(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { unitsAvailable } = req.body;
      const stock = await bloodService.updateStock(req.params.hospitalId, req.body.bloodType, unitsAvailable, req.user!.id);
      res.json({ success: true, data: stock, message: 'Blood stock updated' });
    } catch (err) {
      next(err);
    }
  }

  async createRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await bloodService.createRequest({
        ...req.body,
        requestedById: req.user!.id,
      });
      res.status(201).json({ success: true, data: result, message: 'Blood request submitted' });
    } catch (err) {
      next(err);
    }
  }

  async getRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, page, limit } = req.query;
      const filters: any = {
        status: status as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      };

      if (req.user!.role === 'HOSPITAL' && (req.user as any).hospitalId) {
        filters.hospitalId = (req.user as any).hospitalId;
      } else if (req.user!.role === 'PUBLIC_USER' || req.user!.role === 'DOCTOR') {
        filters.userId = req.user!.id;
      }

      const result = await bloodService.getRequests(filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getRequestById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const request = await bloodService.getRequestById(req.params.id);
      res.json({ success: true, data: request });
    } catch (err) {
      next(err);
    }
  }

  async fulfillRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await bloodService.fulfillRequest(req.params.id, req.user!.id);
      res.json({ success: true, data: result, message: 'Blood request fulfilled' });
    } catch (err) {
      next(err);
    }
  }

  async cancelRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await bloodService.cancelRequest(req.params.id, req.user!.id);
      res.json({ success: true, data: result, message: 'Blood request cancelled' });
    } catch (err) {
      next(err);
    }
  }
}

export default new BloodController();
