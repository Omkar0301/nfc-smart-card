import type { Request, Response } from 'express';
import { vcfService } from '../services/vcf.service.js';

export const vcfController = {
  /**
   * Generates and downloads a vCard (.vcf) file for a public profile.
   * Endpoints:
   *   GET /p/:type/:token/contact.vcf
   *   GET /profile/public/:token/contact.vcf
   *   GET /cards/:token/contact.vcf
   */
  async downloadVcf(req: Request, res: Response): Promise<void> {
    const token = req.params.token as string;
    const type = req.params.type as string | undefined;

    const result = await vcfService.generateVcf(token, type);

    if (!result.ok) {
      res.status(result.status).json({
        success: false,
        error: {
          code: result.code,
          message: result.message,
        },
      });
      return;
    }

    res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.data.filename}"`);
    res.status(200).send(result.data.vcf);
  },
};
