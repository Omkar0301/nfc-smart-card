import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { sendError } from '../lib/http.js';
import { ErrorCode } from '@nfc-card/shared';

const storage = multer.memoryStorage();

export const multerUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB raw memory limit
  },
});

/**
 * Express middleware wrapper to catch Multer errors (such as file size limits)
 * and return standard API error payloads.
 */
export function singleUpload(fieldName = 'file') {
  const uploadHandler = multerUpload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    uploadHandler(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return sendError(
            res,
            400,
            ErrorCode.FILE_TOO_LARGE,
            'File size exceeds maximum allowed limit of 10 MB',
            { maxSizeMb: 10 }
          );
        }
        return sendError(
          res,
          400,
          ErrorCode.BAD_REQUEST,
          err.message || 'File upload parsing failed'
        );
      }
      next();
    });
  };
}
