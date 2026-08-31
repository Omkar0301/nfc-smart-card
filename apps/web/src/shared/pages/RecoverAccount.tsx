'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../api/client';
import { requestRecovery } from '../api/auth';
import styles from '../components/OtpFlow/OtpFlow.module.css';

export function RecoverAccount() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      await requestRecovery(email);
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not process recovery request. Please try again later.'
      );
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.form}>
        <h1>Check your email</h1>
        <p className={styles.hint}>
          If <strong>{email}</strong> is registered as a recovery email for an account, we have sent
          a recovery link.
        </p>
        <p className={styles.hint}>The link will expire in 1 hour and can only be used once.</p>
        <Link href="/portal/login" style={{ marginTop: 12, display: 'inline-block' }}>
          ← Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h1>Recover Account</h1>
      <p className={styles.hint}>
        Lost access to your registered phone number? Enter your registered secondary email address
        to receive a recovery link.
      </p>
      <label className={styles.label}>
        Secondary email
        <input
          className={styles.input}
          type="email"
          autoComplete="email"
          placeholder="your.email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      {error ? <p className={styles.error}>{error}</p> : null}
      <button className={styles.button} type="submit" disabled={pending}>
        {pending ? 'Sending link…' : 'Send Recovery Link'}
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <Link href="/portal/login" style={{ fontSize: 14 }}>
          ← Back to sign in
        </Link>
      </div>
    </form>
  );
}
