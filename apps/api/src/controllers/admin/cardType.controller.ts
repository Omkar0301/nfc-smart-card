import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../../lib/http.js';
import { cardTypeService } from '../../services/cardType.service.js';
import {
  cardTypeIdParamSchema,
  createCardTypeSchema,
  updateCardTypeSchema,
} from '../../validators/cardType.validator.js';

function validationError(res: Response, err: ZodError) {
  return sendError(
    res,
    400,
    ErrorCode.VALIDATION_ERROR,
    err.issues[0]?.message ?? 'Invalid request format.',
    { errors: err.issues }
  );
}

export const cardTypeController = {
  async getCardTypes(_req: Request, res: Response) {
    const result = await cardTypeService.listCardTypes();
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message, result.details);
      return;
    }
    sendSuccess(res, 200, result.data);
  },

  async getCardTypeById(req: Request, res: Response) {
    try {
      const { id } = cardTypeIdParamSchema.parse(req.params);
      const result = await cardTypeService.getCardTypeById(id);
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

  async createCardType(req: Request, res: Response) {
    try {
      const input = createCardTypeSchema.parse(req.body);
      const result = await cardTypeService.createCardType(input);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 201, result.data, 'Card type created successfully');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async updateCardType(req: Request, res: Response) {
    try {
      const { id } = cardTypeIdParamSchema.parse(req.params);
      const input = updateCardTypeSchema.parse(req.body);
      const result = await cardTypeService.updateCardType(id, input);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 200, result.data, 'Card type updated successfully');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },
};
