import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import pretty from 'pino-pretty';
import { Request, Response } from 'express';
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
  serializers: {
    req(req: Request) {
      return {
        method: req.method,
        url: req.url,
      };
    },
    res(res: Response) {
      const output: any = {
        statusCode: res.statusCode,
      };
      // Include error details if available from error handler
      if ((res as any).__errorDetails) {
        output.error = (res as any).__errorDetails;
      }
      return output;
    },
  },
});

// Middleware to capture error responses
export function errorLoggerMiddleware(err: any, req: Request, res: Response, next: any) {
  if (res.statusCode >= 400) {
    // Try to extract error details from response body
    let errorDetails: any = null;
    if (err?.code || err?.message) {
      errorDetails = {
        code: err.code,
        message: err.message,
      };
    } else if (typeof err === 'object' && (err.code || err.message)) {
      errorDetails = {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'An error occurred',
      };
    }
    if (errorDetails) {
      (res as any).__errorDetails = errorDetails;
    }
  }
  next(err);
}
