import crypto from 'node:crypto';
import { ErrorCode } from '@nfc-card/shared';
import { config } from '../config.js';
import { otpRepository } from '../repositories/otp.repository.js';
import { createOtpProvider } from '../providers/otp.provider.js';

const otpProvider = createOtpProvider();

function hashSecret(): string {
  return config.OTP_PEPPER;
}

export function hashOtp(phone: string, code: string): string {
  return crypto.createHmac('sha256', hashSecret()).update(`${phone}:${code}`).digest('hex');
}

export function generateOtpCode(): string {
  return crypto
    .randomInt(0, 10 ** config.OTP_DIGITS)
    .toString()
    .padStart(config.OTP_DIGITS, '0');
}

export async function countRecentSends(phone: string): Promise<number> {
  const windowStart = new Date(Date.now() - config.OTP_SEND_WINDOW_MS);
  return otpRepository.countRecent(phone, windowStart);
}

export function isSendRateLimited(count: number): boolean {
  return count >= config.OTP_SEND_MAX;
}

export async function issueOtp(phone: string): Promise<void> {
  await otpRepository.deleteExpired();

  const code = generateOtpCode();
  const codeHash = hashOtp(phone, code);
  const expiresAt = new Date(Date.now() + config.OTP_TTL_MS);

  await otpRepository.createWithInvalidation({ phone, codeHash, expiresAt });

  await otpProvider.sendOtp(phone, code);
}

export type VerifyOtpResult =
  | { ok: true }
  | { ok: false; status: number; code: ErrorCode; message: string; attemptsLeft?: number };

export async function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  const record = await otpRepository.findLatestByPhone(phone);

  if (!record || record.usedAt) {
    return {
      ok: false,
      status: 400,
      code: ErrorCode.OTP_INVALID,
      message: 'Invalid or already used verification code.',
    };
  }

  if (record.expiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      status: 400,
      code: ErrorCode.OTP_EXPIRED,
      message: 'This verification code has expired.',
    };
  }

  if (record.attempts >= config.OTP_MAX_ATTEMPTS) {
    return {
      ok: false,
      status: 401,
      code: ErrorCode.OTP_LOCKED,
      message: 'Too many incorrect attempts. Request a new code.',
    };
  }

  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashOtp(phone, code), 'hex');

  if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    const attempts = record.attempts + 1;
    await otpRepository.incrementAttempts(record.id, attempts);

    if (attempts >= config.OTP_MAX_ATTEMPTS) {
      return {
        ok: false,
        status: 401,
        code: ErrorCode.OTP_LOCKED,
        message: 'Too many incorrect attempts. Request a new code.',
      };
    }

    return {
      ok: false,
      status: 400,
      code: ErrorCode.OTP_INVALID,
      message: 'Invalid verification code.',
      attemptsLeft: config.OTP_MAX_ATTEMPTS - attempts,
    };
  }

  await otpRepository.markUsed(record.id);

  return { ok: true };
}
