import { PgBoss } from 'pg-boss';
import { config } from '../config.js';
import { logger } from './logger.js';

let boss: PgBoss | null = null;

export const CARD_GENERATION_QUEUE = 'generate-cards';

export async function initQueue(): Promise<PgBoss> {
  if (boss) {
    return boss;
  }

  boss = new PgBoss(config.DATABASE_URL);

  boss.on('error', (error) => {
    logger.error({ error }, '[pg-boss] error event');
  });

  await boss.start();
  await boss.createQueue(CARD_GENERATION_QUEUE);
  logger.info('[pg-boss] queue started successfully');
  return boss;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop({ graceful: true });
    boss = null;
    logger.info('[pg-boss] queue stopped gracefully');
  }
}

export function getBoss(): PgBoss | null {
  return boss;
}

export async function enqueueJob<T extends object>(
  queueName: string,
  data: T
): Promise<string | null> {
  if (!boss) {
    logger.warn(`[pg-boss] Attempted to enqueue on '${queueName}' but queue is not running`);
    return null;
  }
  await boss.createQueue(queueName);
  return boss.send(queueName, data);
}

export async function registerWorker<T extends object>(
  queueName: string,
  handler: (data: T) => Promise<void>
): Promise<string | null> {
  if (!boss) {
    logger.warn(`[pg-boss] Cannot register worker for '${queueName}': queue not running`);
    return null;
  }

  await boss.createQueue(queueName);

  return boss.work<T>(queueName, async (jobs) => {
    for (const job of jobs) {
      await handler(job.data);
    }
  });
}
