import app from './app.js';
import { config } from './config.js';
import { logger } from './lib/logger.js';

app.listen(config.PORT, () => {
  logger.info(`API running on http://localhost:${config.PORT} (env: ${config.NODE_ENV})`);
});
