import { config } from "../config.js";
import { logger } from "../lib/logger.js";

export interface OtpProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

export class ConsoleOtpProvider implements OtpProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    if (config.NODE_ENV === "production") {
      throw new Error("Console OTP provider must not be used in production");
    }
    logger.info({ phone, code }, `[otp] sent to ${phone}: ${code}`);
  }
}

export function createOtpProvider(): OtpProvider {
  const provider = config.OTP_PROVIDER;
  if (provider === "console") {
    return new ConsoleOtpProvider();
  }
  throw new Error(`Unsupported OTP_PROVIDER: ${provider}`);
}
