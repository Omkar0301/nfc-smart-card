import { describe, it, expect } from 'vitest';
import {
  ConsoleOtpProvider,
  MockOtpProvider,
  TwilioOtpProvider,
  createOtpProvider,
} from '../../src/providers/otp.provider.js';
import {
  ConsoleEmailProvider,
  MockEmailProvider,
  SendgridEmailProvider,
  createEmailProvider,
} from '../../src/providers/email.provider.js';

describe('OTP & Email Provider Infrastructure (Phase 3)', () => {
  it('ConsoleOtpProvider dispatches without crashing', async () => {
    const provider = new ConsoleOtpProvider();
    await expect(provider.sendOtp('+15551234567', '123456')).resolves.not.toThrow();
  });

  it('MockOtpProvider captures sent OTP history', async () => {
    const provider = new MockOtpProvider();
    await provider.sendOtp('+15559876543', '654321');

    expect(provider.lastSent).toEqual({ phone: '+15559876543', code: '654321' });
    expect(provider.sentHistory.length).toBe(1);

    provider.clear();
    expect(provider.lastSent).toBeNull();
    expect(provider.sentHistory.length).toBe(0);
  });

  it('TwilioOtpProvider asserts required credentials', () => {
    expect(() => new TwilioOtpProvider('', '', '')).toThrow(
      'TwilioOtpProvider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_PHONE'
    );
  });

  it('createOtpProvider returns provider based on configuration', () => {
    const provider = createOtpProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.sendOtp).toBe('function');
  });

  it('ConsoleEmailProvider dispatches without crashing', async () => {
    const provider = new ConsoleEmailProvider();
    await expect(
      provider.sendRecoveryEmail('test@example.com', 'http://localhost:3000/recover', 'token123')
    ).resolves.not.toThrow();
  });

  it('MockEmailProvider captures sent recovery history', async () => {
    const provider = new MockEmailProvider();
    await provider.sendRecoveryEmail(
      'user@example.com',
      'http://localhost:3000/recover?t=abc',
      'abc'
    );

    expect(provider.lastSent?.email).toBe('user@example.com');
    expect(provider.sentHistory.length).toBe(1);

    provider.clear();
    expect(provider.lastSent).toBeNull();
  });

  it('SendgridEmailProvider asserts required API key', () => {
    expect(() => new SendgridEmailProvider('', '')).toThrow(
      'SendgridEmailProvider requires SENDGRID_API_KEY'
    );
  });

  it('createEmailProvider returns provider based on configuration', () => {
    const provider = createEmailProvider();
    expect(provider).toBeDefined();
    expect(typeof provider.sendRecoveryEmail).toBe('function');
  });
});
