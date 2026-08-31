'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ApiError } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import { updateRecoveryPhone } from '../api/auth';
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
    setPending(true);
    setError(null);
    try {
      await sendOtp(newPhone);
      setStage('phone_sent');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send verification code.');
    } finally {
      setPending(false);
    }
  }

  async function handleVerifyNewPhone(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await updateRecoveryPhone(newPhone, otpCode);
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
      <div className={styles.form}>
        <h1>Verifying recovery link…</h1>
        <p className={styles.hint}>Please wait while we restore your account access.</p>
      </div>
    );
  }

  if (stage === 'error') {
    return (
      <div className={styles.form}>
        <h1>Recovery Link Error</h1>
        {error ? <p className={styles.error}>{error}</p> : null}
        <div style={{ marginTop: 16 }}>
          <Link
            href="/portal/recover"
            className={styles.button}
            style={{
              display: 'inline-block',
              textAlign: 'center',
              textDecoration: 'none',
              lineHeight: '44px',
            }}
          >
            Request a new recovery link
          </Link>
        </div>
        <Link href="/portal/login" style={{ marginTop: 12, display: 'inline-block', fontSize: 14 }}>
          ← Back to sign in
        </Link>
      </div>
    );
  }

  if (stage === 'phone_updated') {
    return (
      <div className={styles.form}>
        <h1>Phone Number Updated!</h1>
        <p className={styles.hint}>
          Your account is now linked to <strong>{newPhone}</strong>. You can use this phone number
          for future OTP logins.
        </p>
        <button
          className={styles.button}
          type="button"
          onClick={() => router.push('/portal/dashboard')}
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (stage === 'phone_sent') {
    return (
      <form className={styles.form} onSubmit={handleVerifyNewPhone}>
        <h1>Verify New Phone</h1>
        <p className={styles.hint}>Enter the 6-digit verification code sent to {newPhone}.</p>
        <label className={styles.label}>
          Verification code
          <input
            className={styles.input}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button className={styles.button} type="submit" disabled={pending || otpCode.length !== 6}>
          {pending ? 'Updating…' : 'Confirm & Update Phone'}
        </button>
        <button
          className={styles.button}
          type="button"
          disabled={pending}
          onClick={() => {
            setStage('verified');
            setOtpCode('');
            setError(null);
          }}
        >
          Use a different number
        </button>
      </form>
    );
  }

  // stage === 'verified'
  return (
    <form className={styles.form} onSubmit={handleSendNewPhoneOtp}>
      <h1>Account Recovered</h1>
      <p className={styles.hint}>
        You have successfully logged in. Please update your registered phone number so you can log
        in with OTP in the future.
      </p>
      <label className={styles.label}>
        New phone number
        <input
          className={styles.input}
          type="tel"
          placeholder="+919876543210"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
          required
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? 'Sending verification…' : 'Send Code to New Phone'}
      </button>
      <button
        className={styles.button}
        type="button"
        style={{ backgroundColor: 'transparent', border: '1px solid #ccc', color: '#333' }}
        onClick={() => router.push('/portal/dashboard')}
      >
        Skip for now
      </button>
    </form>
  );
}

export function RecoveryVerify() {
  return (
    <Suspense
      fallback={
        <div className={styles.form}>
          <h1>Loading…</h1>
        </div>
      }
    >
      <RecoveryVerifyContent />
    </Suspense>
  );
}
