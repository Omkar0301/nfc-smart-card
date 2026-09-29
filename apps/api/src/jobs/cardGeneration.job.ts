import { CARD_GENERATION_QUEUE, registerWorker } from '../lib/queue.js';
import { cardService, type CardGenerationJobPayload } from '../services/card.service.js';
import { logger } from '../lib/logger.js';

export async function initCardGenerationWorker(): Promise<void> {
  logger.info('[worker] registering card generation worker...');
  await registerWorker<CardGenerationJobPayload>(CARD_GENERATION_QUEUE, async (payload) => {
    await cardService.processCardGenerationJob(payload);
  });
}
