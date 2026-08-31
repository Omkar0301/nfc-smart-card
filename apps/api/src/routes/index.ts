import { Router } from 'express';
import authRouter from './auth.routes.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { sendSuccess } from '../lib/http.js';

const router = Router();

// Health check — no auth required
router.get('/health', (_req, res) => {
  sendSuccess(res, 200, { status: 'healthy' }, 'NFC Card API is running');
});

// Auth routes
router.use('/auth', authRouter);

// Admin health — requires ADMIN role
router.get('/admin/health', requireAdmin, (_req, res) => {
  sendSuccess(res, 200, { adminStatus: 'healthy' });
});

export default router;
