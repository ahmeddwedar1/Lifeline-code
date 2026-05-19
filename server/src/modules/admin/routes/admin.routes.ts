import { Router } from 'express';
import adminController from '../controller/admin.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.use(verifyToken, requireRole('ADMIN'));

router.get('/stats', adminController.getSystemStats.bind(adminController));
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:id', adminController.getUserDetails.bind(adminController));
router.put('/users/:id/status', adminController.updateUserStatus.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));
router.post('/hospitals', adminController.createHospital.bind(adminController));
router.put('/hospitals/:id', adminController.updateHospital.bind(adminController));
router.delete('/hospitals/:id', adminController.deleteHospital.bind(adminController));
router.put('/hospitals/:id/beds', adminController.updateHospitalBeds.bind(adminController));
router.post('/reports', adminController.generateReport.bind(adminController));
router.get('/reports', adminController.getReports.bind(adminController));
router.get('/reports/:id', adminController.getReport.bind(adminController));
router.get('/audit-logs', adminController.getAuditLogs.bind(adminController));
router.post('/broadcast', adminController.broadcastAlert.bind(adminController));

export default router;
