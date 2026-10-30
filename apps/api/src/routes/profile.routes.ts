import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { vcfController } from '../controllers/vcf.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Customer Profile endpoints (auth-gated)
router.get('/', requireAuth, profileController.getProfile);
router.post('/', requireAuth, profileController.updateProfile);
router.put('/', requireAuth, profileController.updateProfile);

// Customer Card Lifecycle & Analytics (auth-gated)
router.post('/pause', requireAuth, profileController.pauseCard);
router.post('/resume', requireAuth, profileController.resumeCard);
router.get('/analytics', requireAuth, profileController.getAnalytics);

// Public profile data endpoint (SSR / visitor)
router.get('/public/:token', profileController.getPublicProfile);

// Public vCard contact download endpoint (F-013)
router.get('/public/:token/contact.vcf', vcfController.downloadVcf);

export default router;
