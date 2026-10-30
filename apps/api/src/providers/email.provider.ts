import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export interface EmailProvider {
  sendRecoveryEmail(email: string, recoveryUrl: string, token: string): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendRecoveryEmail(email: string, recoveryUrl: string, token: string): Promise<void> {
    if (config.NODE_ENV === 'production') {
      logger.warn(
        { email },
        '[email] ConsoleEmailProvider is active in production. Please configure an external email provider (e.g. SendGrid or SMTP).'
      );
    }
    logger.info(
      { email, recoveryUrl, token },
      `[email] recovery email sent to ${email}: url=${recoveryUrl} token=${token}`
    );
  }
}

export class MockEmailProvider implements EmailProvider {
  public lastSent: { email: string; recoveryUrl: string; token: string } | null = null;
  public sentHistory: Array<{
    email: string;
    recoveryUrl: string;
    token: string;
    timestamp: Date;
  }> = [];

  async sendRecoveryEmail(email: string, recoveryUrl: string, token: string): Promise<void> {
    this.lastSent = { email, recoveryUrl, token };
    this.sentHistory.push({ email, recoveryUrl, token, timestamp: new Date() });
    logger.debug({ email, recoveryUrl }, '[MockEmailProvider] recovery email recorded');
  }

  clear() {
    this.lastSent = null;
    this.sentHistory = [];
  }
}

export class SendgridEmailProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey?: string, fromEmail?: string) {
    this.apiKey = apiKey || config.SENDGRID_API_KEY || '';
    this.fromEmail = fromEmail || config.EMAIL_FROM || 'noreply@nfcplatform.com';

    if (!this.apiKey) {
      throw new Error('SendgridEmailProvider requires SENDGRID_API_KEY');
    }
  }

  async sendRecoveryEmail(email: string, recoveryUrl: string, _token: string): Promise<void> {
    const payload = {
      personalizations: [{ to: [{ email }] }],
      from: { email: this.fromEmail, name: 'NFC Card Platform' },
      subject: 'Account Recovery - NFC Digital Card Platform',
      content: [
        {
          type: 'text/html',
          value: `
            <h2>Account Recovery Request</h2>
            <p>You requested access recovery for your NFC Digital Card account.</p>
            <p>Click the link below to verify your secondary email and link a new mobile phone number:</p>
            <p><a href="${recoveryUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Recover Account</a></p>
            <p style="color:#64748b;font-size:12px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
          `,
        },
      ],
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      logger.error(
        { status: res.status, errText, email },
        '[SendgridEmailProvider] Email dispatch failed'
      );
      throw new Error(`Failed to send email via SendGrid: ${res.statusText}`);
    }

    logger.info({ email }, '[SendgridEmailProvider] Recovery email dispatched successfully');
  }
}

export function createEmailProvider(): EmailProvider {
  const provider = config.EMAIL_PROVIDER;

  if (provider === 'console') {
    return new ConsoleEmailProvider();
  }

  if (provider === 'mock') {
    return new MockEmailProvider();
  }

  if (provider === 'sendgrid') {
    return new SendgridEmailProvider();
  }

  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}
