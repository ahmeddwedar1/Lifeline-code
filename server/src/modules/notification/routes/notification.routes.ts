import { Router } from 'express';
import notificationController from '../controller/notification.controller';
import { verifyToken } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, notificationController.getUserNotifications.bind(notificationController));
router.put('/read-all', verifyToken, notificationController.markAllAsRead.bind(notificationController));
router.put('/:id/read', verifyToken, notificationController.markAsRead.bind(notificationController));
router.delete('/:id', verifyToken, notificationController.delete.bind(notificationController));

export default router;
