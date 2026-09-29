import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../../lib/http.js';
import { cardService } from '../../services/card.service.js';
import {
  batchIdParamSchema,
  exportCardsQuerySchema,
  generateCardsSchema,
  jobIdParamSchema,
} from '../../validators/card.validator.js';

function validationError(res: Response, err: ZodError) {
  return sendError(
    res,
    400,
    ErrorCode.VALIDATION_ERROR,
    err.issues[0]?.message ?? 'Invalid request format.',
    { errors: err.issues }
  );
}

export const cardController = {
  async generateCards(req: Request, res: Response) {
    try {
      const parsed = generateCardsSchema.safeParse(req.body);
      if (!parsed.success) {
        const isQuantityError = parsed.error.issues.some((i) => i.path.includes('quantity'));
        if (isQuantityError) {
          sendError(res, 400, ErrorCode.INVALID_QUANTITY, 'Quantity must be between 1 and 10,000.');
          return;
        }
        validationError(res, parsed.error);
        return;
      }

      const input = parsed.data;
      const requestedBy = (req as any).user?.id || 'admin';

      const result = await cardService.generateCards({
        cardTypeId: input.cardTypeId,
        quantity: input.quantity,
        requestedBy,
      });

      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 202, result.data, result.data.message);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async getJobStatus(req: Request, res: Response) {
    try {
      const { id } = jobIdParamSchema.parse(req.params);
      const result = await cardService.getJobStatus(id);

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

  async listRecentJobs(_req: Request, res: Response) {
    const result = await cardService.listRecentJobs();
    sendSuccess(res, 200, result.data);
  },

  async invalidateBatch(req: Request, res: Response) {
    try {
      const { batchId } = batchIdParamSchema.parse(req.params);
      const result = await cardService.invalidateDefectiveBatch(batchId);

      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 200, result.data, result.data.message);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async exportCards(req: Request, res: Response) {
    try {
      const query = exportCardsQuerySchema.parse(req.query);
      const csv = await cardService.exportCardsCsv({
        cardTypeId: query.cardTypeId,
        status: query.status,
        batchId: query.batchId,
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="cards-export.csv"');
      res.status(200).send(csv);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },
};
