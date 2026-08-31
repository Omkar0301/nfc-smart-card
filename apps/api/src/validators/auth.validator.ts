import { z } from 'zod';

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

export const recoverRequestSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export const recoverVerifySchema = z.object({
  token: z.string().min(1, 'Recovery token is required.'),
});

export const updatePhoneSchema = z
  .object({
    phone: z.string().min(1, 'Phone number is required.'),
    otpCode: z
      .string()
      .regex(/^\d{6}$/, 'Verification code must be 6 digits.')
      .optional(),
    code: z
      .string()
      .regex(/^\d{6}$/, 'Verification code must be 6 digits.')
      .optional(),
  })
  .refine((data) => data.otpCode || data.code, {
    message: 'Verification code is required.',
    path: ['otpCode'],
  });

export const updateEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Enter a valid email address.')
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val)),
});
