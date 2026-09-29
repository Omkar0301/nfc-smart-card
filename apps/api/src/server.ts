import app from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';
import { initQueue, stopQueue } from './lib/queue.js';
import { initCardGenerationWorker } from './jobs/cardGeneration.job.js';

async function bootstrap() {
  try {
    await initQueue();
    await initCardGenerationWorker();
  } catch (err) {
    logger.error({ err }, 'Failed to start background queue/workers');
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`API running on http://localhost:${config.PORT} (env: ${config.NODE_ENV})`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        await stopQueue();
      } catch (err) {
        logger.error({ err }, 'Error stopping queue on shutdown');
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Server bootstrap failed');
  process.exit(1);
});
