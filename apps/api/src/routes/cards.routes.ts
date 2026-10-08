import { Router } from 'express';
import { cardsController } from '../controllers/cards.controller.js';
import { cardReplacementController } from '../controllers/cardReplacement.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

// Customer replacement requests & lifecycle actions
router.post('/report-lost', requireAuth, cardReplacementController.reportLost);
router.post('/request-replacement', requireAuth, cardReplacementController.requestReplacement);
router.get('/replacement-requests', requireAuth, cardReplacementController.getCustomerRequests);

// Public card token lookup — no auth required
router.get('/:token', cardsController.lookupCardByToken);

// Claim card — requires authenticated user
router.post('/:token/claim', requireAuth, cardsController.claimCard);

export default router;
