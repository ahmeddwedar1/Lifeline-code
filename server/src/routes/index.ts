import { Router } from 'express';
import authRoutes from '../modules/auth/routes/auth.routes';
import profileRoutes from '../modules/profile/routes/profile.routes';
import emergencyRoutes from '../modules/emergency/routes/emergency.routes';
import resourceRoutes from '../modules/resource/routes/resource.routes';
import searchRoutes from '../modules/search/routes/search.routes';
import reservationRoutes from '../modules/reservation/routes/reservation.routes';
import ambulanceRoutes from '../modules/ambulance/routes/ambulance.routes';
import bloodRoutes from '../modules/blood/routes/blood.routes';
import notificationRoutes from '../modules/notification/routes/notification.routes';
import adminRoutes from '../modules/admin/routes/admin.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'LifeLine API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/resources', resourceRoutes);
router.use('/search', searchRoutes);
router.use('/reservations', reservationRoutes);
router.use('/ambulances', ambulanceRoutes);
router.use('/blood', bloodRoutes);
router.use('/notifications', notificationRoutes);
router.use('/admin', adminRoutes);

export default router;
