import { Router } from 'express';
import { cardTypeController } from '../../controllers/admin/cardType.controller.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

router.use(requireAdmin);

router.get('/', cardTypeController.getCardTypes);
router.get('/:id', cardTypeController.getCardTypeById);
router.post('/', cardTypeController.createCardType);
router.put('/:id', cardTypeController.updateCardType);

export default router;
