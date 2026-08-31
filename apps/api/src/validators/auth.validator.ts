import { z } from "zod";

export const sendOtpSchema = z.object({
  phone: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
