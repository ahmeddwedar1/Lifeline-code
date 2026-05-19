import { Router } from 'express';
import ambulanceController from '../controller/ambulance.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, requireRole('ADMIN', 'HOSPITAL', 'DOCTOR'), ambulanceController.getAll.bind(ambulanceController));
router.get('/:id', verifyToken, ambulanceController.getById.bind(ambulanceController));
router.post('/', verifyToken, requireRole('ADMIN'), ambulanceController.create.bind(ambulanceController));
router.put('/:id/dispatch', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), ambulanceController.dispatch.bind(ambulanceController));
router.put('/:id/location', verifyToken, requireRole('AMBULANCE', 'DOCTOR', 'HOSPITAL', 'ADMIN'), ambulanceController.updateLocation.bind(ambulanceController));
router.put('/:id/status', verifyToken, requireRole('AMBULANCE', 'DOCTOR', 'HOSPITAL', 'ADMIN'), ambulanceController.updateStatus.bind(ambulanceController));
router.get('/emergency/:emergencyId', verifyToken, ambulanceController.getByEmergency.bind(ambulanceController));

export default router;
