import { Router } from 'express';
import { profileController } from '../controllers/profile.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Customer Profile endpoints (auth-gated)
router.get('/', requireAuth, profileController.getProfile);
router.post('/', requireAuth, profileController.updateProfile);
router.put('/', requireAuth, profileController.updateProfile);

// Public profile data endpoint (SSR / visitor)
router.get('/public/:token', profileController.getPublicProfile);

export default router;
