import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { singleUpload } from '../middleware/multer.js';
import { uploadController } from '../controllers/upload.controller.js';

const router = Router();

// POST /upload/profile-photo (Customer auth required)
router.post(
  '/profile-photo',
  requireAuth,
  singleUpload('file'),
  uploadController.uploadProfilePhoto
);

// POST /upload/template-thumbnail (Admin auth required)
router.post(
  '/template-thumbnail',
  requireAdmin,
  singleUpload('file'),
  uploadController.uploadTemplateThumbnail
);

// GET /upload/file/*key (Public file retrieval via storage abstraction)
router.get('/file/*key', uploadController.getFile);

export default router;
