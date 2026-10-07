import { Router } from 'express';
import { templateController } from '../controllers/template.controller.js';

const router = Router();

// Public template library listing (PRD §22) — no auth required.
router.get('/', templateController.listTemplates);

export default router;
