'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { updateRecoveryPhone } from '../api/auth';
import { validateAndNormalizePhone, validateOtpCode } from '../utils/validation';
import styles from '../components/OtpFlow/OtpFlow.module.css';

function RecoveryVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginWithRecovery, sendOtp, refreshUser } = useAuth();

  const tokenParam = searchParams.get('token') || '';

  // States: 'verifying' | 'verified' | 'phone_sent' | 'phone_updated' | 'error'
  const [stage, setStage] = useState<
    'verifying' | 'verified' | 'phone_sent' | 'phone_updated' | 'error'
  >('verifying');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Phone update states
  const [newPhone, setNewPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');

  const handleVerify = useCallback(
    async (tokenToVerify: string) => {
      setPending(true);
      setError(null);
      try {
        await loginWithRecovery(tokenToVerify);
        setStage('verified');
      } catch (err) {
        setStage('error');
        setError(
          err instanceof ApiError
            ? err.message
            : 'Failed to verify recovery token. The link may be expired or already used.'
        );
      } finally {
        setPending(false);
      }
    },
    [loginWithRecovery]
  );

  useEffect(() => {
    if (tokenParam) {
      void handleVerify(tokenParam);
    } else {
      setStage('error');
      setError('No recovery token found in the URL. Please use the link provided in your email.');
    }
  }, [tokenParam, handleVerify]);

  async function handleSendNewPhoneOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validation = validateAndNormalizePhone(newPhone);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid phone number.');
      return;
    }

    setPending(true);
    try {
      await sendOtp(validation.normalized);
      setNewPhone(validation.normalized);
      setStage('phone_sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send verification code.');
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyNewPhone(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validation = validateOtpCode(otpCode);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid 6-digit verification code.');
      return;
    }

    setPending(true);
    try {
      await updateRecoveryPhone(newPhone, validation.cleanCode);
      await refreshUser();
      setStage('phone_updated');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update phone number.');
    } finally {
      setPending(false);
    }
  }

  if (stage === 'verifying') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div className={styles.brandIcon}>⏳</div>
            <h1 className={styles.title}>Verifying Recovery Link</h1>
            <p className={styles.subtitle}>Please wait while we restore your account access…</p>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div
              className={styles.brandIcon}
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
            >
              ⚠️
            </div>
            <h1 className={styles.title}>Recovery Link Error</h1>
            <p className={styles.subtitle}>We were unable to verify this recovery request.</p>
          </div>
          {error ? (
            <div className={styles.error} style={{ marginBottom: 16 }}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : null}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/portal/recover" className={styles.button}>
              Request a new recovery link
            </Link>
            <Link href="/portal/login" className={styles.secondaryButton}>
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (stage === 'phone_updated') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div
              className={styles.brandIcon}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              ✓
            </div>
            <h1 className={styles.title}>Phone Number Updated!</h1>
            <p className={styles.subtitle}>
              Your account is now linked to <span className={styles.badgePhone}>{newPhone}</span>.
              You can use this phone number for future OTP logins.
            </p>
          </div>
          <button
            className={styles.button}
            type="button"
            onClick={() => router.push('/portal/dashboard')}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (stage === 'phone_sent') {
    return (
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div className={styles.brandIcon}>📱</div>
            <h1 className={styles.title}>Verify New Phone</h1>
            <p className={styles.subtitle}>
              Enter the 6-digit verification code sent to{' '}
              <span className={styles.badgePhone}>{newPhone}</span>.
            </p>
          </div>
          <form className={styles.form} onSubmit={handleVerifyNewPhone} noValidate>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>
                <span>Verification code</span>
                <input
                  className={`${styles.input} ${styles.otpInput} ${error ? styles.inputError : ''}`}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    if (error) setError(null);
                  }}
                  required
                  autoFocus
                  disabled={pending}
                />
              </label>
              <div className={styles.inputHelper}>
                <span>{otpCode.length}/6 digits entered</span>
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
              disabled={pending || otpCode.length !== 6}
            >
              {pending ? 'Updating…' : 'Confirm & Update Phone'}
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              disabled={pending}
              onClick={() => {
                setStage('verified');
                setOtpCode('');
                setError(null);
              }}
            >
              ← Use a different number
            </button>
          </form>
        </div>
      </div>
    );
  }

  // stage === 'verified'
  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <div className={styles.brandIcon}>🔓</div>
          <h1 className={styles.title}>Account Recovered</h1>
          <p className={styles.subtitle}>
            You have successfully verified your recovery link. Please update your registered phone
            number to secure future OTP access.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSendNewPhoneOtp} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <span>New phone number</span>
              <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                type="tel"
                placeholder="+91 98765 43210"
                value={newPhone}
                onChange={(e) => {
                  setNewPhone(e.target.value);
                  if (error) setError(null);
                }}
                required
                disabled={pending}
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

          <button className={styles.button} type="submit" disabled={pending || !newPhone.trim()}>
            {pending ? 'Sending verification…' : 'Send Code to New Phone'}
          </button>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.push('/portal/dashboard')}
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}

export function RecoveryVerify() {
  return (
    <Suspense
      fallback={
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <p className={styles.hint} style={{ textAlign: 'center' }}>
              Loading recovery details…
            </p>
          </div>
        </div>
      }
    >
      <RecoveryVerifyContent />
    </Suspense>
  );
}
