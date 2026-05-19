import { Response, NextFunction } from 'express';
import adminService from '../service/admin.service';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';

export class AdminController {
  async getSystemStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await adminService.getSystemStats();
      res.json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { role, status, hospitalId, search, page, limit } = req.query;
      const result = await adminService.getUsers({
        role: role as string,
        status: status as string,
        hospitalId: hospitalId as string,
        search: search as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getUserDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await adminService.getUserDetails(req.params.id);
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  }

  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      const user = await adminService.updateUserStatus(
        req.params.id,
        status,
        req.user!.id,
        req.ip,
        req.headers['user-agent'],
      );
      res.json({ success: true, data: user, message: 'User status updated' });
    } catch (err) {
      next(err);
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await adminService.deleteUser(req.params.id, req.user!.id, req.ip, req.headers['user-agent']);
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  }

  async createHospital(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hospital = await adminService.createHospital(req.body);
      res.status(201).json({ success: true, data: hospital, message: 'Hospital created' });
    } catch (err) {
      next(err);
    }
  }

  async updateHospital(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hospital = await adminService.updateHospital(req.params.id, req.body);
      res.json({ success: true, data: hospital, message: 'Hospital updated' });
    } catch (err) {
      next(err);
    }
  }

  async deleteHospital(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await adminService.deleteHospital(req.params.id, req.user!.id, req.ip, req.headers['user-agent']);
      res.json({ success: true, message: 'Hospital deleted' });
    } catch (err) {
      next(err);
    }
  }

  async updateHospitalBeds(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const hospital = await adminService.updateHospitalBeds(req.params.id, req.body);
      res.json({ success: true, data: hospital, message: 'Hospital beds updated' });
    } catch (err) {
      next(err);
    }
  }

  async generateReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type, parameters } = req.body;
      const report = await adminService.generateReport(type, parameters || {}, req.user!.id);
      res.status(201).json({ success: true, data: report, message: 'Report generated' });
    } catch (err) {
      next(err);
    }
  }

  async getReports(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await adminService.getReports(page, limit);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getReport(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const report = await adminService.getReport(req.params.id);
      res.json({ success: true, data: report });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId, entityType, entityId, action, startDate, endDate, page, limit } = req.query;
      const result = await adminService.getAuditLogs({
        userId: userId as string,
        entityType: entityType as string,
        entityId: entityId as string,
        action: action as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async broadcastAlert(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { title, message } = req.body;
      const result = await adminService.broadcastAlert(title, message, req.user!.id);
      res.json({ success: true, data: result, message: 'Alert broadcasted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new AdminController();
