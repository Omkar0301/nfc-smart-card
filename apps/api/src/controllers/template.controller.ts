import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../lib/http.js';
import { templateService } from '../services/template.service.js';
import { templateListQuerySchema } from '../validators/template.validator.js';

export const templateController = {
  async listTemplates(req: Request, res: Response) {
    try {
      const parsed = templateListQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        sendError(
          res,
          400,
          ErrorCode.VALIDATION_ERROR,
          parsed.error.issues[0]?.message ?? 'Invalid query parameters.',
          { errors: parsed.error.issues }
        );
        return;
      }

      const cardTypeSlug = parsed.data.cardType;
      if (!cardTypeSlug) {
        sendError(res, 400, ErrorCode.VALIDATION_ERROR, "Query parameter 'cardType' is required.");
        return;
      }

      const result = await templateService.listTemplatesForCardType(cardTypeSlug);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 200, result.data);
    } catch (err) {
      if (err instanceof ZodError) {
        sendError(
          res,
          400,
          ErrorCode.VALIDATION_ERROR,
          err.issues[0]?.message ?? 'Invalid request.'
        );
        return;
      }
      throw err;
    }
  },
};
