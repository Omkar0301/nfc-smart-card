import crypto from 'node:crypto';
import { ErrorCode, Role, UserStatus } from '@nfc-card/shared';
import { config } from '../config.js';
import { logger } from '../lib/logger.js';
import { createEmailProvider } from '../providers/email.provider.js';
import { recoveryRepository } from '../repositories/recovery.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { normalizePhone } from '../utils/phone.js';
import { verifyOtp } from './otp.service.js';
import { issueRefreshToken, signAccessToken } from './token.service.js';
import type { ServiceResult } from './auth.service.js';

const emailProvider = createEmailProvider();

export function hashRecoveryToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateRecoveryToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export const recoveryService = {
  async requestRecovery(rawEmail: string): Promise<ServiceResult<{ message: string }>> {
    const email = rawEmail.trim().toLowerCase();
    const genericMessage = 'If that email is registered, a recovery link has been sent.';

    const user = await userRepository.findByEmail(email);
    if (!user) {
      logger.info({ email }, '[recovery] recovery requested for unregistered email');
      return { ok: true, data: { message: genericMessage } };
    }

    if (user.status === UserStatus.SUSPENDED) {
      logger.warn({ userId: user.id, email }, '[recovery] recovery requested for suspended user');
      return { ok: true, data: { message: genericMessage } };
    }

    const windowStart = new Date(Date.now() - config.RECOVERY_SEND_WINDOW_MS);
    const recentCount = await recoveryRepository.countRecentByUserId(user.id, windowStart);

    if (recentCount >= config.RECOVERY_SEND_MAX) {
      logger.warn({ userId: user.id, email }, '[recovery] recovery rate limit exceeded');
      return {
        ok: false,
        status: 429,
        code: ErrorCode.RATE_LIMITED,
        message: 'Too many recovery requests. Try again later.',
      };
    }

    const rawToken = generateRecoveryToken();
    const tokenHash = hashRecoveryToken(rawToken);
    const expiresAt = new Date(Date.now() + config.RECOVERY_TOKEN_TTL_MS);

    await recoveryRepository.createWithInvalidation({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const primaryWebUrl = config.WEB_URL.split(',')[0].trim();
    const recoveryUrl = `${primaryWebUrl}/portal/recover/verify?token=${rawToken}`;

    await emailProvider.sendRecoveryEmail(user.email!, recoveryUrl, rawToken);
    logger.info({ userId: user.id, email: user.email }, '[recovery] recovery token dispatched');

    return {
      ok: true,
      data: { message: genericMessage },
    };
  },

  async verifyRecovery(token: string): Promise<
    ServiceResult<{
      accessToken: string;
      refreshToken: string;
      user: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        role: Role;
        status: UserStatus;
      };
    }>
  > {
    if (!token || typeof token !== 'string') {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.RECOVERY_TOKEN_INVALID,
        message: 'Invalid recovery token.',
      };
    }

    const tokenHash = hashRecoveryToken(token);
    const record = await recoveryRepository.findByTokenHash(tokenHash);

    if (!record) {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.RECOVERY_TOKEN_INVALID,
        message: 'Invalid recovery token.',
      };
    }

    if (record.usedAt) {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.RECOVERY_TOKEN_USED,
        message: 'This recovery link has already been used.',
      };
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.RECOVERY_TOKEN_EXPIRED,
        message: 'This recovery link has expired.',
      };
    }

    if (record.user.status === UserStatus.SUSPENDED) {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.ACCOUNT_SUSPENDED,
        message: 'This account is suspended.',
      };
    }

    await recoveryRepository.markUsed(record.id);

    const accessToken = signAccessToken(record.user.id, record.user.role as Role);
    const refreshToken = await issueRefreshToken(record.user.id);

    logger.info(
      { userId: record.user.id, tokenId: record.id },
      '[recovery] account recovery verified successfully'
    );

    return {
      ok: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: record.user.id,
          name: record.user.name,
          phone: record.user.phone,
          email: record.user.email,
          role: record.user.role as Role,
          status: record.user.status as UserStatus,
        },
      },
    };
  },

  async updatePhone(
    userId: string,
    rawPhone: string,
    code: string
  ): Promise<ServiceResult<{ success: true; phone: string }>> {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return {
        ok: false,
        status: 400,
        code: ErrorCode.INVALID_PHONE,
        message: 'Enter a valid phone number in E.164 format.',
      };
    }

    const otpResult = await verifyOtp(phone, code);
    if (!otpResult.ok) {
      return {
        ok: false,
        status: otpResult.status,
        code: otpResult.code,
        message: otpResult.message,
        ...(otpResult.attemptsLeft !== undefined
          ? { details: { attemptsLeft: otpResult.attemptsLeft } }
          : {}),
      };
    }

    const existing = await userRepository.findByPhone(phone);
    if (existing && existing.id !== userId) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.PHONE_IN_USE,
        message: 'This phone number is already registered to another account.',
      };
    }

    const updated = await userRepository.updatePhone(userId, phone);
    logger.info({ userId, phone: updated.phone }, '[recovery] user updated phone number');

    return {
      ok: true,
      data: { success: true, phone: updated.phone },
    };
  },

  async updateEmail(
    userId: string,
    rawEmail: string | null
  ): Promise<ServiceResult<{ success: true; email: string | null }>> {
    if (rawEmail) {
      const email = rawEmail.trim().toLowerCase();
      const existing = await userRepository.findByEmail(email);
      if (existing && existing.id !== userId) {
        return {
          ok: false,
          status: 409,
          code: ErrorCode.EMAIL_IN_USE,
          message: 'This email address is already in use by another account.',
        };
      }
      const updated = await userRepository.updateEmail(userId, email);
      logger.info({ userId, email: updated.email }, '[recovery] user updated recovery email');
      return {
        ok: true,
        data: { success: true, email: updated.email },
      };
    }

    const updated = await userRepository.updateEmail(userId, null);
    logger.info({ userId }, '[recovery] user cleared recovery email');
    return {
      ok: true,
      data: { success: true, email: updated.email },
    };
  },
};
