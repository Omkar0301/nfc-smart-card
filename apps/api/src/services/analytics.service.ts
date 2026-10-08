import { analyticsRepository } from '../repositories/analytics.repository.js';
import { logger } from '../lib/logger.js';

export const analyticsService = {
  async recordEvent(input: {
    cardToken: string;
    eventType: string;
    metadata?: Record<string, unknown>;
    isBot?: boolean;
  }) {
    const card = await analyticsRepository.findCardByPublicToken(input.cardToken);
    if (!card) {
      return { ok: false, message: 'Card not found' };
    }

    try {
      await analyticsRepository.createEvent({
        cardId: card.id,
        eventType: input.eventType,
        metadata: input.metadata,
        isBot: input.isBot,
      });
      return { ok: true };
    } catch (err) {
      logger.warn({ err, token: input.cardToken }, '[analytics] failed to write event');
      return { ok: false };
    }
  },
};
