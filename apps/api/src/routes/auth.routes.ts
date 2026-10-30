import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  sendOtpRateLimiter,
  verifyOtpRateLimiter,
  recoveryRateLimiter,
} from '../middleware/rateLimiter.js';

const router = Router();

router.post('/send-otp', sendOtpRateLimiter, authController.sendOtp);
router.post('/verify-otp', verifyOtpRateLimiter, authController.verifyOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

router.post('/recover/request', recoveryRateLimiter, authController.requestRecovery);
router.post('/recover/verify', authController.verifyRecovery);
router.put('/recover/phone', requireAuth, authController.updatePhone);
router.put('/email', requireAuth, authController.updateEmail);

export default router;
