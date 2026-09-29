import { Router } from 'express';
import { cardsController } from '../controllers/cards.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Public card token lookup — no auth required
router.get('/:token', cardsController.lookupCardByToken);

// Claim card — requires authenticated user
router.post('/:token/claim', requireAuth, cardsController.claimCard);

export default router;
