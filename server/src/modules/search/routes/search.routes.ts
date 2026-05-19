import { Router } from 'express';
import searchController from '../controller/search.controller';
import { verifyToken } from '../../../shared/middleware/auth.middleware';
import { apiRateLimiter } from '../../../shared/middleware/rateLimiter';

const router = Router();

router.get('/hospitals', apiRateLimiter, searchController.searchHospitals.bind(searchController));
router.get('/hospitals/:id', searchController.getHospitalDetails.bind(searchController));
router.get('/recommendations', verifyToken, searchController.getRecommendations.bind(searchController));

export default router;
