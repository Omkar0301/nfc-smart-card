import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

const apiEnvPath = path.resolve(process.cwd(), 'apps/api/.env');
if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_DIR: z.string().default('logs'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  OTP_PEPPER: z.string().default('change-this-otp-pepper-min-32-chars-dev'),
  OTP_PROVIDER: z.enum(['console']).default('console'),
  OTP_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 60 * 1000),
  OTP_SEND_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(10 * 60 * 1000),
  OTP_SEND_MAX: z.coerce.number().int().positive().default(3),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  OTP_DIGITS: z.coerce.number().int().positive().min(4).max(8).default(6),
  EMAIL_PROVIDER: z.enum(['console']).default('console'),
  RECOVERY_TOKEN_TTL_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),
  RECOVERY_SEND_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 1000),
  RECOVERY_SEND_MAX: z.coerce.number().int().positive().default(3),
  WEB_URL: z.string().default('http://localhost:3000,http://localhost:3001'),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  NEXT_REVALIDATE_URL: z.string().optional(),
  NEXT_REVALIDATE_SECRET: z.string().optional(),
});

function parseEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
  }
  return parsed.data;
}

export const config = parseEnv();
