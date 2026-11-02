'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError } from '../api/client';
import { requestRecovery } from '../api/auth';
import { validateEmail } from '../utils/validation';
import styles from '../components/OtpFlow/OtpFlow.module.css';

export function RecoverAccount() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid email address.');
      return;
    }

    setPending(true);
    try {
      await requestRecovery(validation.trimmedEmail);
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
      <div className={styles.authContainer}>
        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <div className={styles.brandIcon}>📬</div>
            <h1 className={styles.title}>Check Your Email</h1>
            <p className={styles.subtitle}>
              If <strong>{email}</strong> is registered as a recovery email for an account, we have
              sent a recovery link.
            </p>
          </div>
          <p className={styles.hint} style={{ textAlign: 'center', marginBottom: 20 }}>
            The link will expire in 1 hour and can only be used once.
          </p>
          <div style={{ textAlign: 'center' }}>
            <Link
              href="/portal/login"
              className={styles.secondaryButton}
              style={{ textDecoration: 'none' }}
            >
              ← Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <div className={styles.brandIcon}>🔑</div>
          <h1 className={styles.title}>Recover Account</h1>
          <p className={styles.subtitle}>
            Lost access to your phone? Enter your registered secondary email to receive a recovery
            link.
          </p>
        </div>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <span>Secondary email address</span>
              <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                type="email"
                autoComplete="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                required
                disabled={pending}
                autoFocus
              />
            </label>
            <div className={styles.inputHelper}>
              <span>We will send a 1-hour secure passwordless recovery link</span>
            </div>
          </div>

          {error ? (
            <div className={styles.error}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : null}

          <button className={styles.button} type="submit" disabled={pending || !email.trim()}>
            {pending ? 'Sending link…' : 'Send Recovery Link'}
          </button>
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <Link href="/portal/login" className={styles.recoveryLink}>
              ← Back to sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
