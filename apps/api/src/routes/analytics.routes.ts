import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Public analytics event ingestion (both /event and /events aliases for full PRD & client compatibility)
router.post('/event', analyticsController.recordEvent);
router.post('/events', analyticsController.recordEvent);

// Customer-facing analytics summary (authenticated)
router.get('/summary', requireAuth, analyticsController.getSummary);

export default router;
