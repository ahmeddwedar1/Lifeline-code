import { Router } from 'express';
import authController from '../controller/auth.controller';
import { verifyToken } from '../../../shared/middleware/auth.middleware';
import { validateBody } from '../../../shared/middleware/validate.middleware';
import { authRateLimiter } from '../../../shared/middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from '../dto/auth.dto';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), authController.register.bind(authController));
router.post('/login', authRateLimiter, validateBody(loginSchema), authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.post('/refresh-token', authController.refreshToken.bind(authController));
router.post('/verify-email', validateBody(verifyOtpSchema), authController.verifyEmail.bind(authController));
router.post('/forgot-password', authRateLimiter, validateBody(forgotPasswordSchema), authController.forgotPassword.bind(authController));
router.post('/reset-password', authRateLimiter, validateBody(resetPasswordSchema), authController.resetPassword.bind(authController));
router.get('/me', verifyToken, authController.getProfile.bind(authController));
router.post('/mfa/setup', verifyToken, authController.setupMfa.bind(authController));

export default router;
