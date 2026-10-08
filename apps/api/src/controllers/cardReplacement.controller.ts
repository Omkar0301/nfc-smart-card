import type { Request, Response } from 'express';
import { z } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../lib/http.js';
import { cardReplacementService } from '../services/cardReplacement.service.js';

const reportLostSchema = z.object({
  reason: z.enum(['LOST', 'DAMAGED', 'STOLEN', 'OTHER']).optional(),
  notes: z.string().max(500).optional(),
});

const requestReplacementSchema = z.object({
  reason: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export const cardReplacementController = {
  async reportLost(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required.');
      return;
    }

    const parsed = reportLostSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        parsed.error.issues[0]?.message ?? 'Invalid request'
      );
      return;
    }

    const result = await cardReplacementService.reportLost(userId, parsed.data);
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message, result.details);
      return;
    }

    sendSuccess(res, 201, result.data, 'Card reported lost successfully.');
  },

  async requestReplacement(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required.');
      return;
    }

    const parsed = requestReplacementSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        parsed.error.issues[0]?.message ?? 'Invalid request'
      );
      return;
    }

    const result = await cardReplacementService.requestReplacement(userId, parsed.data);
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message, result.details);
      return;
    }

    sendSuccess(res, 201, result.data, result.data.message);
  },

  async getCustomerRequests(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required.');
      return;
    }

    const result = await cardReplacementService.getCustomerRequests(userId);
    sendSuccess(res, 200, { requests: result.data });
  },

  async listAllRequests(req: Request, res: Response) {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;

    const result = await cardReplacementService.listAllRequests({ status, page, limit });
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message);
      return;
    }

    sendSuccess(res, 200, result.data);
  },

  async updateRequestStatus(req: Request, res: Response) {
    const { id } = req.params;
    if (!id) {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'Request ID is required');
      return;
    }

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(
        res,
        400,
        ErrorCode.VALIDATION_ERROR,
        parsed.error.issues[0]?.message ?? 'Invalid request'
      );
      return;
    }

    const result = await cardReplacementService.updateRequestStatus(id, parsed.data.status);
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message);
      return;
    }

    sendSuccess(res, 200, result.data);
  },
};
