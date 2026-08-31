'use client';

import { useState, type FormEvent } from 'react';
import { ApiError } from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import styles from './OtpFlow.module.css';

type Step = 'phone' | 'code';

type OtpFlowProps = {
  title?: string;
  onAuthenticated?: () => void;
};

export function OtpFlow({ title = 'Sign in', onAuthenticated }: OtpFlowProps) {
  const { sendOtp, login } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await sendOtp(phone);
      setStep('code');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code.');
    } finally {
      setPending(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(phone, code);
      onAuthenticated?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not verify code.');
    } finally {
      setPending(false);
    }
  }

  if (step === 'phone') {
    return (
      <form className={styles.form} onSubmit={handleSend}>
        <h1>{title}</h1>
        <label className={styles.label}>
          Phone number
          <input
            className={styles.input}
            type="tel"
            autoComplete="tel"
            placeholder="+919876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </label>
        {error ? <p className={styles.error}>{error}</p> : null}
        <button className={styles.button} type="submit" disabled={pending}>
          {pending ? 'Sending…' : 'Send OTP'}
        </button>
      </form>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleVerify}>
      <h1>{title}</h1>
      <p className={styles.hint}>Enter the 6-digit code sent to {phone}.</p>
      <label className={styles.label}>
        Verification code
        <input
          className={styles.input}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          required
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.button} type="submit" disabled={pending || code.length !== 6}>
        {pending ? 'Verifying…' : 'Verify'}
      </button>
      <button
        className={styles.button}
        type="button"
        disabled={pending}
        onClick={() => {
          setStep('phone');
          setCode('');
          setError(null);
        }}
      >
        Use a different number
      </button>
    </form>
  );
}
