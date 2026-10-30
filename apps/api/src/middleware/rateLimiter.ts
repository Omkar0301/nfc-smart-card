import { rateLimit } from 'express-rate-limit';
import { ErrorCode } from '@nfc-card/shared';
import { sendError } from '../lib/http.js';
import { config } from '../config.js';

function createLimiter(options: { windowMs: number; limit: number; message: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: config.NODE_ENV === 'test' ? 1000 : options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, res) => {
      sendError(res, 429, ErrorCode.RATE_LIMITED, options.message);
    },
    // Don't rate limit in tests unless explicitly opted in via header
    skip: (req) => {
      if (config.NODE_ENV === 'test' && req.headers['x-test-rate-limit'] !== 'true') {
        return true;
      }
      return false;
    },
  });
}

/** Rate limiter for OTP code generation: max 3 per 10 minutes */
export const sendOtpRateLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  message: 'Too many OTP requests from this IP. Please wait before requesting another code.',
});

/** Rate limiter for OTP verification: max 5 per 10 minutes */
export const verifyOtpRateLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  message: 'Too many verification attempts from this IP. Please try again later.',
});

/** Rate limiter for account recovery request: max 3 per 60 minutes */
export const recoveryRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: 'Too many account recovery requests from this IP. Please try again later.',
});

/** Rate limiter for public analytics event ingestion: max 60 per minute */
export const analyticsRateLimiter = createLimiter({
  windowMs: 60 * 1000,
  limit: 60,
  message: 'Too many analytics events. Please slow down.',
});

/** Rate limiter for file uploads: max 10 per hour */
export const uploadRateLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  message: 'Upload rate limit exceeded. Please wait before uploading more files.',
});
