import type { Request, Response } from 'express';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../lib/http.js';
import { uploadService } from '../services/upload.service.js';
import { templateThumbnailSchema } from '../validators/upload.validator.js';

export const uploadController = {
  async uploadProfilePhoto(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user?.id) {
      return sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const result = await uploadService.uploadProfilePhoto(user.id, req.file);

    if (!result.ok) {
      return sendError(res, result.status, result.code, result.message, result.details);
    }

    return sendSuccess(res, 200, result.data, 'Profile photo uploaded successfully');
  },

  async uploadTemplateThumbnail(req: Request, res: Response) {
    const user = (req as any).user;
    if (!user || user.role !== 'ADMIN') {
      return sendError(res, 403, ErrorCode.FORBIDDEN, 'Admin privileges required');
    }

    const templateId = req.body?.templateId || req.query?.templateId;
    const parsed = templateThumbnailSchema.safeParse({ templateId });
    if (!parsed.success) {
      return sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        'Invalid or missing templateId in request body',
        { errors: parsed.error.errors }
      );
    }

    const result = await uploadService.uploadTemplateThumbnail(parsed.data.templateId, req.file);

    if (!result.ok) {
      return sendError(res, result.status, result.code, result.message, result.details);
    }

    return sendSuccess(res, 200, result.data, 'Template thumbnail uploaded successfully');
  },

  async getFile(req: Request, res: Response) {
    let rawKey: any = (req.params as any).key ?? (req.params as any)[0] ?? req.query.key;
    if (Array.isArray(rawKey)) {
      rawKey = rawKey.join('/');
    }
    if (!rawKey || typeof rawKey !== 'string') {
      return sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'File key is required');
    }

    const result = await uploadService.getFile(rawKey);
    if (!result.ok) {
      return sendError(res, result.status, result.code, result.message, result.details);
    }

    res.setHeader('Content-Type', result.data.contentType);
    return res.send(result.data.buffer);
  },
};
