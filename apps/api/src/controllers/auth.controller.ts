import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../lib/http.js';
import { authService } from '../services/auth.service.js';
import { recoveryService } from '../services/recovery.service.js';
import {
  recoverRequestSchema,
  recoverVerifySchema,
  refreshSchema,
  sendOtpSchema,
  updateEmailSchema,
  updatePhoneSchema,
  verifyOtpSchema,
} from '../validators/auth.validator.js';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  setRefreshCookie,
  verifyStoredRefreshToken,
  revokeRefreshTokenById,
} from '../services/token.service.js';

function validationError(res: Response, err: ZodError) {
  return sendError(
    res,
    400,
    ErrorCode.VALIDATION_ERROR,
    err.issues[0]?.message ?? 'Invalid request.'
  );
}

export const authController = {
  async sendOtp(req: Request, res: Response) {
    try {
      const { phone } = sendOtpSchema.parse(req.body);
      const result = await authService.sendOtp(phone);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 200, result.data, 'OTP sent');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async verifyOtp(req: Request, res: Response) {
    try {
      const { phone, code } = verifyOtpSchema.parse(req.body);
      const result = await authService.verifyOtp(phone, code);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      setRefreshCookie(res, result.data.refreshToken);
      sendSuccess(res, 200, result.data);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const body = refreshSchema.parse(req.body ?? {});
      const token =
        body.refreshToken ||
        (typeof req.cookies?.[REFRESH_COOKIE] === 'string'
          ? req.cookies[REFRESH_COOKIE]
          : undefined);

      const result = await authService.refresh(token);
      if (!result.ok) {
        if (result.code === ErrorCode.TOKEN_EXPIRED || result.code === ErrorCode.UNAUTHORIZED) {
          clearRefreshCookie(res);
        }
        sendError(res, result.status, result.code, result.message);
        return;
      }

      setRefreshCookie(res, result.data.refreshToken);
      sendSuccess(res, 200, result.data);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    const body = refreshSchema.safeParse(req.body ?? {});
    const token =
      (body.success ? body.data.refreshToken : undefined) ||
      (typeof req.cookies?.[REFRESH_COOKIE] === 'string' ? req.cookies[REFRESH_COOKIE] : undefined);

    if (token) {
      const verified = await verifyStoredRefreshToken(token);
      if (verified.ok) {
        await revokeRefreshTokenById(verified.tokenId);
      }
    }

    clearRefreshCookie(res);
    sendSuccess(res, 200, { loggedOut: true });
  },

  async me(req: Request, res: Response) {
    const userId = req.user!.id;
    const result = await authService.getMe(userId);
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message);
      return;
    }
    sendSuccess(res, 200, result.data);
  },

  async requestRecovery(req: Request, res: Response) {
    try {
      const { email } = recoverRequestSchema.parse(req.body);
      const result = await recoveryService.requestRecovery(email);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message);
        return;
      }
      sendSuccess(res, 200, result.data, result.data.message);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async verifyRecovery(req: Request, res: Response) {
    try {
      const { token } = recoverVerifySchema.parse(req.body);
      const result = await recoveryService.verifyRecovery(token);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message);
        return;
      }
      setRefreshCookie(res, result.data.refreshToken);
      sendSuccess(res, 200, result.data, 'Account recovered successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async updatePhone(req: Request, res: Response) {
    try {
      const { phone, otpCode, code } = updatePhoneSchema.parse(req.body);
      const verifyCode = otpCode || code!;
      const userId = req.user!.id;
      const result = await recoveryService.updatePhone(userId, phone, verifyCode);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 200, result.data, 'Phone number updated successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async updateEmail(req: Request, res: Response) {
    try {
      const { email } = updateEmailSchema.parse(req.body);
      const userId = req.user!.id;
      const result = await recoveryService.updateEmail(userId, email ?? null);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 200, result.data, 'Recovery email updated successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },
};
