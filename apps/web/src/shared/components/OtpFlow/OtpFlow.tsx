'use client';

import { useState, useEffect, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import { validateAndNormalizePhone, validateOtpCode } from '../../utils/validation';
import styles from './OtpFlow.module.css';

type Step = 'phone' | 'code';

type OtpFlowProps = {
  title?: string;
  subtitle?: string;
  hideHeader?: boolean;
  showRecovery?: boolean;
  recoveryHref?: string;
  onAuthenticated?: () => void;
};

export function OtpFlow({
  title = 'Sign in',
  subtitle,
  hideHeader = false,
  showRecovery = true,
  recoveryHref = '/portal/recover',
  onAuthenticated,
}: OtpFlowProps) {
  const { sendOtp, login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const isAutoSubmitting = useRef(false);

  // Auto-submit code when 6 digits are entered
  useEffect(() => {
    if (
      step === 'code' &&
      code.length === 6 &&
      !pending &&
      !isSuccess &&
      !isAutoSubmitting.current
    ) {
      isAutoSubmitting.current = true;
      void handleVerifyCode(code);
    }
    if (code.length < 6) {
      isAutoSubmitting.current = false;
    }
  }, [code, step, pending, isSuccess]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setError(null);

    // Frontend validation
    const validation = validateAndNormalizePhone(phone);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid phone number.');
      return;
    }

    setPending(true);
    try {
      await sendOtp(validation.normalized);
      setPhone(validation.normalized);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send verification code.');
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyCode(codeToVerify: string) {
    setError(null);

    // Frontend OTP code validation
    const validation = validateOtpCode(codeToVerify);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid 6-digit verification code.');
      return;
    }

    setPending(true);
    try {
      await login(phone, validation.cleanCode);
      setIsSuccess(true);
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify code.');
      setPending(false);
      isAutoSubmitting.current = false;
    }
  }

  function handleVerifySubmit(event: FormEvent) {
    event.preventDefault();
    void handleVerifyCode(code);
  }

  if (step === 'phone') {
    return (
      <form className={styles.form} onSubmit={handleSend} noValidate>
        {!hideHeader && (
          <div style={{ marginBottom: 6 }}>
            <h2 className={styles.title} style={{ fontSize: '1.35rem' }}>
              {title}
            </h2>
            {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
          </div>
        )}
        <div className={styles.fieldGroup}>
          <label className={styles.label}>
            <span>Phone number</span>
            <input
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              disabled={pending}
              required
              autoFocus
            />
          </label>
          <div className={styles.inputHelper}>
            <span>Accepts 10-digit number or international (+91...)</span>
          </div>
        </div>

        {error ? (
          <div className={styles.error}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        ) : null}

        <button className={styles.button} type="submit" disabled={pending || !phone.trim()}>
          {pending ? 'Sending code…' : 'Send OTP'}
        </button>

        {showRecovery && (
          <div style={{ marginTop: 4, textAlign: 'center' }}>
            <Link href={recoveryHref} className={styles.recoveryLink}>
              Lost access to your phone? Recover account
            </Link>
          </div>
        )}
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleVerifySubmit} noValidate>
      {!hideHeader && (
        <div style={{ marginBottom: 6 }}>
          <h2 className={styles.title} style={{ fontSize: '1.35rem' }}>
            {title}
          </h2>
        </div>
      )}
      <p className={styles.hint}>
        Enter the 6-digit code sent to <span className={styles.badgePhone}>{phone}</span>.
      </p>

      <div className={styles.fieldGroup}>
        <label className={styles.label}>
          <span>Verification code</span>
          <input
            className={`${styles.input} ${styles.otpInput} ${error ? styles.inputError : ''}`}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="••••••"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (error) setError(null);
            }}
            disabled={pending || isSuccess}
            autoFocus
            required
          />
        </label>
        <div className={styles.inputHelper}>
          <span>{code.length}/6 digits entered</span>
          {code.length === 6 && !pending && !isSuccess && <span>Verifying…</span>}
        </div>
      </div>

      {error ? (
        <div className={styles.error}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      <button
        className={styles.button}
        type="submit"
        disabled={pending || code.length !== 6 || isSuccess}
      >
        {isSuccess ? '✓ Verified! Redirecting…' : pending ? 'Verifying…' : 'Verify & Sign In'}
      </button>

      {!isSuccess && (
        <button
          className={styles.secondaryButton}
          type="button"
          disabled={pending}
          onClick={() => {
            setStep('phone');
            setCode('');
            setError(null);
          }}
        >
          ← Use a different number
        </button>
      )}
    </form>
  );
}
