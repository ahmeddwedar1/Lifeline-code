import { Router } from 'express';
import profileController from '../controller/profile.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';
import { validateBody } from '../../../shared/middleware/validate.middleware';
import multer from 'multer';
import { config } from '../../../config';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images and documents are allowed'));
    }
  },
});

const router = Router();

router.put('/', verifyToken, profileController.updateProfile.bind(profileController));
router.put('/change-password', verifyToken, profileController.changePassword.bind(profileController));
router.post('/documents', verifyToken, upload.single('document'), profileController.uploadDocument.bind(profileController));
router.put('/verify-doctor/:doctorId', verifyToken, requireRole('ADMIN'), profileController.verifyDoctor.bind(profileController));
router.delete('/account', verifyToken, profileController.deleteAccount.bind(profileController));

export default router;
