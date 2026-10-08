import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';

const router = Router();

// Public analytics event ingestion
router.post('/events', analyticsController.recordEvent);

export default router;
