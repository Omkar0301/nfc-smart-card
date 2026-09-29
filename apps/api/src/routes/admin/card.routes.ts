import { Router } from 'express';
import { cardController } from '../../controllers/admin/card.controller.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

router.use(requireAdmin);

router.post('/generate', cardController.generateCards);
router.get('/jobs', cardController.listRecentJobs);
router.get('/jobs/:id', cardController.getJobStatus);
router.post('/batches/:batchId/invalidate', cardController.invalidateBatch);
router.get('/export', cardController.exportCards);

export default router;
