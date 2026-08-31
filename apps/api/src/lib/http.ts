import type { Response } from "express";

export interface ApiResponseSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export function sendSuccess<T>(
  res: Response,
  status = 200,
  data: T,
  message?: string
) {
  const payload: ApiResponseSuccess<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  return res.status(status).json(payload);
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  const payload: ApiResponseError = {
    success: false,
    error: {
      code,
      message,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
    },
  };
  return res.status(status).json(payload);
}
