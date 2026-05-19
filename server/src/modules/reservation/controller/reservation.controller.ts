import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import reservationService from '../service/reservation.service';

export class ReservationController {
  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.create({
        ...req.body,
        userId: req.user!.id,
      });
      res.status(201).json({ success: true, data: reservation, message: 'Reservation created' });
    } catch (err) {
      next(err);
    }
  }

  async confirm(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.confirm(req.params.id, req.user!.id);
      res.json({ success: true, data: reservation, message: 'Reservation confirmed' });
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { reason } = req.body;
      const reservation = await reservationService.cancel(req.params.id, req.user!.id, reason);
      res.json({ success: true, data: reservation, message: 'Reservation cancelled' });
    } catch (err) {
      next(err);
    }
  }

  async complete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.complete(req.params.id, req.user!.id);
      res.json({ success: true, data: reservation, message: 'Reservation completed' });
    } catch (err) {
      next(err);
    }
  }

  async getUserReservations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reservations = await reservationService.getUserReservations(req.user!.id);
      res.json({ success: true, data: reservations });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status, hospitalId, page, limit } = req.query;
      const filters: any = {
        status: status as string,
        page: Number(page) || 1,
        limit: Number(limit) || 20,
      };

      if (req.user!.role === 'HOSPITAL' && req.user!.hospitalId) {
        filters.hospitalId = req.user!.hospitalId;
      } else if (hospitalId) {
        filters.hospitalId = hospitalId as string;
      }

      const result = await reservationService.getAll(filters);
      res.json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const reservation = await reservationService.getById(req.params.id);
      res.json({ success: true, data: reservation });
    } catch (err) {
      next(err);
    }
  }
}

export default new ReservationController();
