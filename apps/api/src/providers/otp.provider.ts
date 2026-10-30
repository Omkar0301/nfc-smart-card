import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export interface OtpProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

export class ConsoleOtpProvider implements OtpProvider {
  async sendOtp(phone: string, code: string): Promise<void> {
    if (config.NODE_ENV === 'production') {
      logger.warn(
        { phone },
        '[otp] ConsoleOtpProvider is active in production. Please configure an external SMS gateway (e.g. Twilio).'
      );
    }
    logger.info({ phone, code }, `[otp] sent to ${phone}: ${code}`);
  }
}

export class MockOtpProvider implements OtpProvider {
  public lastSent: { phone: string; code: string } | null = null;
  public sentHistory: Array<{ phone: string; code: string; timestamp: Date }> = [];

  async sendOtp(phone: string, code: string): Promise<void> {
    this.lastSent = { phone, code };
    this.sentHistory.push({ phone, code, timestamp: new Date() });
    logger.debug({ phone, code }, '[MockOtpProvider] OTP recorded');
  }

  clear() {
    this.lastSent = null;
    this.sentHistory = [];
  }
}

export class TwilioOtpProvider implements OtpProvider {
  private accountSid: string;
  private authToken: string;
  private fromPhone: string;

  constructor(accountSid?: string, authToken?: string, fromPhone?: string) {
    this.accountSid = accountSid || config.TWILIO_ACCOUNT_SID || '';
    this.authToken = authToken || config.TWILIO_AUTH_TOKEN || '';
    this.fromPhone = fromPhone || config.TWILIO_FROM_PHONE || '';

    if (!this.accountSid || !this.authToken || !this.fromPhone) {
      throw new Error(
        'TwilioOtpProvider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE'
      );
    }
  }

  async sendOtp(phone: string, code: string): Promise<void> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const body = new URLSearchParams({
      To: phone,
      From: this.fromPhone,
      Body: `Your verification code is: ${code}. Valid for 5 minutes. Do not share this code.`,
    });

    const credentials = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      logger.error(
        { status: res.status, errText, phone },
        '[TwilioOtpProvider] SMS dispatch failed'
      );
      throw new Error(`Failed to send SMS via Twilio: ${res.statusText}`);
    }

    logger.info({ phone }, '[TwilioOtpProvider] SMS dispatched successfully');
  }
}

export function createOtpProvider(): OtpProvider {
  const provider = config.OTP_PROVIDER;

  if (provider === 'console') {
    return new ConsoleOtpProvider();
  }

  if (provider === 'mock') {
    return new MockOtpProvider();
  }

  if (provider === 'twilio') {
    return new TwilioOtpProvider();
  }

  throw new Error(`Unsupported OTP_PROVIDER: ${provider}`);
}
