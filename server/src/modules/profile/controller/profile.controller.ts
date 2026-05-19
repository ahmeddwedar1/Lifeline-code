import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../shared/middleware/auth.middleware';
import profileService from '../service/profile.service';

export class ProfileController {
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await profileService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, data: result, message: 'Profile updated' });
    } catch (err) {
      next(err);
    }
  }

  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await profileService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
      next(err);
    }
  }

  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ success: false, message: 'No file uploaded' });
        return;
      }
      const doc = await profileService.uploadDocument(req.user!.id, req.body.documentType, file.path);
      res.json({ success: true, data: doc, message: 'Document uploaded' });
    } catch (err) {
      next(err);
    }
  }

  async verifyDoctor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { doctorId } = req.params;
      const result = await profileService.verifyDoctor(doctorId, req.user!.id);
      res.json({ success: true, data: result, message: 'Doctor verified' });
    } catch (err) {
      next(err);
    }
  }

  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await profileService.deleteAccount(req.user!.id);
      res.json({ success: true, message: 'Account deleted' });
    } catch (err) {
      next(err);
    }
  }
}

export default new ProfileController();
