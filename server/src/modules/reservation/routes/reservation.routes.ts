import { Router } from 'express';
import reservationController from '../controller/reservation.controller';
import { verifyToken, requireRole } from '../../../shared/middleware/auth.middleware';

const router = Router();

router.post('/', verifyToken, reservationController.create.bind(reservationController));
router.get('/my', verifyToken, reservationController.getUserReservations.bind(reservationController));
router.get('/', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), reservationController.getAll.bind(reservationController));
router.get('/:id', verifyToken, reservationController.getById.bind(reservationController));
router.put('/:id/confirm', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), reservationController.confirm.bind(reservationController));
router.put('/:id/cancel', verifyToken, reservationController.cancel.bind(reservationController));
router.put('/:id/complete', verifyToken, requireRole('DOCTOR', 'HOSPITAL', 'ADMIN'), reservationController.complete.bind(reservationController));

export default router;
