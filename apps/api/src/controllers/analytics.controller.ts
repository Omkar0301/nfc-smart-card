import type { Request, Response } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../lib/http.js';

export const analyticsController = {
  async recordEvent(req: Request, res: Response) {
    const { cardToken, eventType, metadata, isBot } = req.body ?? {};
    if (!cardToken || typeof cardToken !== 'string') {
      res.status(200).json({ ok: false });
      return;
    }

    await analyticsService.recordEvent({
      cardToken,
      eventType: eventType || 'PROFILE_VIEW',
      metadata,
      isBot: Boolean(isBot),
    });

    sendSuccess(res, 200, { recorded: true });
  },
};
