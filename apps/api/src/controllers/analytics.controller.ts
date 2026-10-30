import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { sendSuccess, sendError } from '../lib/http.js';
import { ErrorCode } from '@nfc-card/shared';

export const analyticsController = {
  async recordEvent(req: Request, res: Response) {
    const { cardToken, eventType, metadata, isBot } = req.body ?? {};
    if (!cardToken || typeof cardToken !== 'string') {
      sendError(res, 400, ErrorCode.VALIDATION_ERROR, 'cardToken is required');
      return;
    }

    const userAgent = req.get('user-agent');
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress;

    const result = await analyticsService.recordEvent({
      cardToken,
      eventType,
      metadata,
      isBot,
      userAgent,
      clientIp,
    });

    if (!result.ok) {
      sendError(res, result.status, result.code || ErrorCode.INTERNAL_SERVER_ERROR, result.message);
      return;
    }

    sendSuccess(res, 200, result.data);
  },

  async getSummary(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required');
      return;
    }

    const result = await analyticsService.getCustomerSummary(userId);
    if (!result.ok) {
      sendError(res, result.status, result.code || ErrorCode.INTERNAL_SERVER_ERROR, result.message);
      return;
    }

    sendSuccess(res, 200, result.data);
  },

  async getPlatformAnalytics(req: Request, res: Response) {
    const cardTypeId = typeof req.query.cardTypeId === 'string' ? req.query.cardTypeId : undefined;

    const result = await analyticsService.getPlatformAnalytics(cardTypeId);
    if (!result.ok) {
      sendError(res, result.status, result.code || ErrorCode.INTERNAL_SERVER_ERROR, result.message);
      return;
    }

    sendSuccess(res, 200, result.data);
  },
};
