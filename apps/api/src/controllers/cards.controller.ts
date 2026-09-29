import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../lib/http.js';
import { claimService } from '../services/claim.service.js';
import { cardTokenParamSchema } from '../validators/card.validator.js';

function validationError(res: Response, err: ZodError) {
  return sendError(
    res,
    400,
    ErrorCode.VALIDATION_ERROR,
    err.issues[0]?.message ?? 'Invalid request format.',
    { errors: err.issues }
  );
}

export const cardsController = {
  async lookupCardByToken(req: Request, res: Response) {
    try {
      const parsed = cardTokenParamSchema.safeParse(req.params);
      if (!parsed.success) {
        validationError(res, parsed.error);
        return;
      }

      const result = await claimService.lookupCardByToken(parsed.data.token);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 200, result.data);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async claimCard(req: Request, res: Response) {
    try {
      const parsed = cardTokenParamSchema.safeParse(req.params);
      if (!parsed.success) {
        validationError(res, parsed.error);
        return;
      }

      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required to claim a card.');
        return;
      }

      const result = await claimService.claimCard(parsed.data.token, userId);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 201, result.data, 'Card claimed successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },
};
