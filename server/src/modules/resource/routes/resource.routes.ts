import { Router } from 'express';
import resourceController from '../controller/resource.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.get('/', verifyToken, resourceController.getAll.bind(resourceController));
router.get('/availability', resourceController.getAvailability.bind(resourceController));
router.get('/hospital/:hospitalId', verifyToken, resourceController.getByHospital.bind(resourceController));
router.get('/:id', verifyToken, resourceController.getById.bind(resourceController));
router.post('/', verifyToken, requireRole('DOCTOR', 'HOSPITAL'), resourceController.create.bind(resourceController));
router.put('/:id', verifyToken, requireRole('DOCTOR', 'HOSPITAL'), resourceController.update.bind(resourceController));
router.delete('/:id', verifyToken, requireRole('ADMIN'), resourceController.delete.bind(resourceController));

export default router;
