import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import pretty from 'pino-pretty';
import { config } from '../config.js';

const logDir = path.resolve(process.cwd(), config.LOG_DIR);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const appLogPath = path.join(logDir, 'app.log');
const errorLogPath = path.join(logDir, 'error.log');

const streams: pino.StreamEntry[] = [
  {
    stream: pino.destination({ dest: appLogPath, sync: false }),
    level: config.LOG_LEVEL as pino.Level,
  },
  { stream: pino.destination({ dest: errorLogPath, sync: false }), level: 'error' },
];

if (config.NODE_ENV === 'development') {
  streams.push({
    stream: pretty({
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    }),
    level: config.LOG_LEVEL as pino.Level,
  });
} else {
  streams.push({ stream: process.stdout, level: config.LOG_LEVEL as pino.Level });
}

export const logger = pino(
  {
    level: config.LOG_LEVEL,
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pino.multistream(streams)
);

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
