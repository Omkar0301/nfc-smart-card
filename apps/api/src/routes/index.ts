import { Router } from 'express';
import authRouter from './auth.routes.js';
import cardsRouter from './cards.routes.js';
import profileRouter from './profile.routes.js';
import templatesRouter from './templates.routes.js';
import cardTypeRouter from './admin/cardType.routes.js';
import cardRouter from './admin/card.routes.js';
import adminTemplateRouter from './admin/template.routes.js';
import { cardController } from '../controllers/admin/card.controller.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { sendSuccess } from '../lib/http.js';

const router = Router();

// Health check — no auth required
router.get('/health', (_req, res) => {
  sendSuccess(res, 200, { status: 'healthy' }, 'NFC Card API is running');
});

// Auth routes
router.use('/auth', authRouter);

// Public & Customer card routes (/cards/:token, /cards/:token/claim)
router.use('/cards', cardsRouter);

// Customer Profile routes (/profile)
router.use('/profile', profileRouter);

// Public template library routes (/templates?cardType=:slug)
router.use('/templates', templatesRouter);

// Admin health — requires ADMIN role
router.get('/admin/health', requireAdmin, (_req, res) => {
  sendSuccess(res, 200, { adminStatus: 'healthy' });
});

// Admin card types routes — requires ADMIN role
router.use('/admin/card-types', cardTypeRouter);

// Admin cards and jobs routes — requires ADMIN role
router.use('/admin/cards', cardRouter);
router.get('/admin/jobs/:id', requireAdmin, cardController.getJobStatus);

// Admin template management routes — requires ADMIN role
router.use('/admin/templates', adminTemplateRouter);

export default router;
