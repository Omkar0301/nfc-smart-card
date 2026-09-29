import { Router } from 'express';
import { cardController } from '../../controllers/admin/card.controller.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

router.use(requireAdmin);

// Inventory search and listing
router.get('/', cardController.listCards);

// Generation and Batch Operations (F-005)
router.post('/generate', cardController.generateCards);
router.get('/jobs', cardController.listRecentJobs);
router.get('/jobs/:id', cardController.getJobStatus);
router.post('/batches/:batchId/invalidate', cardController.invalidateBatch);
router.get('/export', cardController.exportCards);

// Helpers for Lifecycle Actions (F-006)
router.get('/replacements/available', cardController.getAvailableReplacements);
router.get('/users/search', cardController.searchUsers);

// Single Card Lifecycle Operations (F-006)
router.get('/:id', cardController.getCardById);
router.post('/:id/assign', cardController.assignCard);
router.post('/:id/activate', cardController.activateCard);
router.post('/:id/suspend', cardController.suspendCard);
router.post('/:id/unsuspend', cardController.unsuspendCard);
router.post('/:id/deactivate', cardController.deactivateCard);
router.post('/:id/replace', cardController.replaceCard);

export default router;
