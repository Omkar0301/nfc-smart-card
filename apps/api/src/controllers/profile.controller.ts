import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../lib/http.js';
import { profileService } from '../services/profile.service.js';
import { profileTokenParamSchema, updateProfileSchema } from '../validators/profile.validator.js';

function validationError(res: Response, err: ZodError) {
  return sendError(
    res,
    400,
    ErrorCode.VALIDATION_ERROR,
    err.issues[0]?.message ?? 'Invalid request format.',
    { errors: err.issues }
  );
}

export const profileController = {
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required.');
        return;
      }

      const result = await profileService.getProfile(userId);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 200, result.data);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, ErrorCode.UNAUTHORIZED, 'Authentication required.');
        return;
      }

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        validationError(res, parsed.error);
        return;
      }

      const result = await profileService.saveProfile(userId, parsed.data);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 200, result.data, 'Profile saved successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async getPublicProfile(req: Request, res: Response) {
    try {
      const parsed = profileTokenParamSchema.safeParse(req.params);
      if (!parsed.success) {
        validationError(res, parsed.error);
        return;
      }

      const result = await profileService.getPublicProfile(parsed.data.token);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }

      sendSuccess(res, 200, result.data);
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },
};
