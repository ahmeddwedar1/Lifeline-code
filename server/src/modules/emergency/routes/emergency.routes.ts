import { Router } from 'express';
import emergencyController from '../controller/emergency.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';
import { emergencyRateLimiter } from '../../../shared/middleware/rateLimiter';

const router = Router();

router.post('/', verifyToken, emergencyRateLimiter, emergencyController.create.bind(emergencyController));
router.get('/', verifyToken, emergencyController.getAll.bind(emergencyController));
router.get('/my', verifyToken, emergencyController.getMyEmergencies.bind(emergencyController));
router.get('/:id', verifyToken, emergencyController.getById.bind(emergencyController));
router.put('/:id/status', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), emergencyController.updateStatus.bind(emergencyController));
router.put('/:id/assign', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), emergencyController.assign.bind(emergencyController));
router.post('/:id/priority', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), emergencyController.overridePriority.bind(emergencyController));

export default router;
