import type { Request, Response } from 'express';
import { ZodError } from 'zod';
import { ErrorCode } from '@nfc-card/shared';
import { sendError, sendSuccess } from '../../lib/http.js';
import { templateService } from '../../services/template.service.js';
import {
  createTemplateSchema,
  templateIdParamSchema,
  updateTemplateSchema,
} from '../../validators/template.validator.js';

function validationError(res: Response, err: ZodError) {
  return sendError(
    res,
    400,
    ErrorCode.VALIDATION_ERROR,
    err.issues[0]?.message ?? 'Invalid request format.',
    { errors: err.issues }
  );
}

export const adminTemplateController = {
  async listTemplates(_req: Request, res: Response) {
    const result = await templateService.listAllTemplates();
    if (!result.ok) {
      sendError(res, result.status, result.code, result.message, result.details);
      return;
    }
    sendSuccess(res, 200, result.data);
  },

  async createTemplate(req: Request, res: Response) {
    try {
      const input = createTemplateSchema.parse(req.body);
      const result = await templateService.createTemplate(input);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 201, result.data, 'Template created successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async updateTemplate(req: Request, res: Response) {
    try {
      const { id } = templateIdParamSchema.parse(req.params);
      const input = updateTemplateSchema.parse(req.body);
      const result = await templateService.updateTemplate(id, input);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(res, 200, result.data, 'Template updated successfully.');
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },

  async deleteTemplate(req: Request, res: Response) {
    try {
      const { id } = templateIdParamSchema.parse(req.params);
      const result = await templateService.deleteTemplate(id);
      if (!result.ok) {
        sendError(res, result.status, result.code, result.message, result.details);
        return;
      }
      sendSuccess(
        res,
        200,
        result.data,
        result.data.deactivated ? 'Template deactivated.' : 'Template deleted.'
      );
    } catch (err) {
      if (err instanceof ZodError) {
        validationError(res, err);
        return;
      }
      throw err;
    }
  },
};
