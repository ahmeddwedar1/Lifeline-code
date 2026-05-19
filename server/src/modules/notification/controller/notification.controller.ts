import { Response, NextFunction } from 'express';
import notificationService from '../service/notification.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class NotificationController {
  async getUserNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await notificationService.getUserNotifications(req.user!.id, page, limit);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAsRead(req.params.id, req.user!.id);
      res.json({ success: true, message: 'Notification marked as read' });
    } catch (err) {
      next(err);
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllAsRead(req.user!.id);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.delete(req.params.id, req.user!.id);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new NotificationController();
