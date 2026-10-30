import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { analyticsRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public analytics event ingestion (both /event and /events aliases for full PRD & client compatibility)
router.post('/event', analyticsRateLimiter, analyticsController.recordEvent);
router.post('/events', analyticsRateLimiter, analyticsController.recordEvent);

// Customer-facing analytics summary (authenticated)
router.get('/summary', requireAuth, analyticsController.getSummary);

export default router;
