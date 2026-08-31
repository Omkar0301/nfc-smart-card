import { Role } from '@nfc-card/shared';
import { normalizePhone } from '../utils/phone.js';
import { userRepository } from '../repositories/user.repository.js';
import { countRecentSends, isSendRateLimited, issueOtp, verifyOtp } from './otp.service.js';
import {
  issueRefreshToken,
  revokeRefreshTokenById,
  rotateRefreshToken,
  signAccessToken,
  verifyStoredRefreshToken,
} from './token.service.js';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; message: string; details?: Record<string, unknown> };

export const authService = {
  async sendOtp(rawPhone: string): Promise<ServiceResult<{ sent: true }>> {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_PHONE',
        message: 'Enter a valid phone number in E.164 format.',
      };
    }

    const recent = await countRecentSends(phone);
    if (isSendRateLimited(recent)) {
      return {
        ok: false,
        status: 429,
        code: 'RATE_LIMITED',
        message: 'Too many OTP requests. Try again later.',
      };
    }

    await issueOtp(phone);
    return { ok: true, data: { sent: true as const } };
  },

  async verifyOtp(
    rawPhone: string,
    code: string
  ): Promise<
    ServiceResult<{
      accessToken: string;
      refreshToken: string;
      user: { id: string; name: string; phone: string; role: Role };
    }>
  > {
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return {
        ok: false,
        status: 400,
        code: 'INVALID_PHONE',
        message: 'Enter a valid phone number in E.164 format.',
      };
    }

    const result = await verifyOtp(phone, code);
    if (!result.ok) {
      return {
        ok: false,
        status: result.status,
        code: result.code,
        message: result.message,
        ...(result.attemptsLeft !== undefined
          ? { details: { attemptsLeft: result.attemptsLeft } }
          : {}),
      };
    }

    let user = await userRepository.findByPhone(phone);
    if (!user) {
      user = await userRepository.create({ phone, name: '', role: Role.CUSTOMER });
    }

    if (user.status === 'SUSPENDED') {
      return {
        ok: false,
        status: 403,
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account is suspended.',
      };
    }

    const accessToken = signAccessToken(user.id, user.role as Role);
    const refreshToken = await issueRefreshToken(user.id);

    return {
      ok: true,
      data: {
        accessToken,
        refreshToken,
        user: { id: user.id, name: user.name, phone: user.phone, role: user.role as Role },
      },
    };
  },

  async refresh(
    token: string | undefined
  ): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> {
    if (!token) {
      return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Refresh token required.' };
    }

    const verified = await verifyStoredRefreshToken(token);
    if (!verified.ok) {
      const message =
        verified.code === 'TOKEN_EXPIRED' ? 'Refresh token expired.' : 'Invalid refresh token.';
      return { ok: false, status: 401, code: verified.code, message };
    }

    const user = await userRepository.findById(verified.userId);
    if (!user) {
      return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'Invalid refresh token.' };
    }
    if (user.status === 'SUSPENDED') {
      return {
        ok: false,
        status: 403,
        code: 'ACCOUNT_SUSPENDED',
        message: 'This account is suspended.',
      };
    }

    const accessToken = signAccessToken(user.id, user.role as Role);
    const nextRefresh = await rotateRefreshToken(user.id, verified.tokenId);

    return { ok: true, data: { accessToken, refreshToken: nextRefresh } };
  },

  async logout(token: string | undefined): Promise<{ revoked: boolean }> {
    if (token) {
      const verified = await verifyStoredRefreshToken(token);
      if (verified.ok) {
        await revokeRefreshTokenById(verified.tokenId);
        return { revoked: true };
      }
    }
    return { revoked: false };
  },

  async getMe(userId: string): Promise<
    ServiceResult<{
      id: string;
      name: string;
      phone: string;
      email: string | null;
      role: Role;
      status: string;
    }>
  > {
    const user = await userRepository.findMeById(userId);
    if (!user) {
      return { ok: false, status: 401, code: 'UNAUTHORIZED', message: 'User not found.' };
    }
    return {
      ok: true,
      data: user as {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        role: Role;
        status: string;
      },
    };
  },
};
