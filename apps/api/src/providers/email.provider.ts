import { config } from '../config.js';
import { logger } from '../lib/logger.js';

export interface EmailProvider {
  sendRecoveryEmail(email: string, recoveryUrl: string, token: string): Promise<void>;
}

export class ConsoleEmailProvider implements EmailProvider {
  async sendRecoveryEmail(email: string, recoveryUrl: string, token: string): Promise<void> {
    if (config.NODE_ENV === 'production') {
      throw new Error('Console email provider must not be used in production');
    }
    logger.info(
      { email, recoveryUrl, token },
      `[email] recovery email sent to ${email}: url=${recoveryUrl} token=${token}`
    );
  }
}

export function createEmailProvider(): EmailProvider {
  const provider = config.EMAIL_PROVIDER;
  if (provider === 'console') {
    return new ConsoleEmailProvider();
  }
  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}
