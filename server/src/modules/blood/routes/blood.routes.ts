import { Router } from 'express';
import bloodController from '../controller/blood.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.get('/stock', bloodController.getStock.bind(bloodController));
router.put('/stock/:hospitalId', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), bloodController.updateStock.bind(bloodController));
router.post('/requests', verifyToken, bloodController.createRequest.bind(bloodController));
router.get('/requests', verifyToken, bloodController.getRequests.bind(bloodController));
router.get('/requests/:id', verifyToken, bloodController.getRequestById.bind(bloodController));
router.put('/requests/:id/fulfill', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), bloodController.fulfillRequest.bind(bloodController));
router.put('/requests/:id/cancel', verifyToken, bloodController.cancelRequest.bind(bloodController));

export default router;
