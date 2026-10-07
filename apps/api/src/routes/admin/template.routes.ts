import { Router } from 'express';
import { adminTemplateController } from '../../controllers/admin/template.controller.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

router.use(requireAdmin);

router.get('/', adminTemplateController.listTemplates);
router.post('/', adminTemplateController.createTemplate);
router.put('/:id', adminTemplateController.updateTemplate);
router.delete('/:id', adminTemplateController.deleteTemplate);

export default router;
