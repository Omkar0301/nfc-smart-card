'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useAuth } from '@/src/shared/hooks/useAuth';
import { updateRecoveryEmail } from '@/src/shared/api/auth';
import { ApiError } from '@/src/shared/api/client';
import { validateEmail } from '@/src/shared/utils/validation';
import styles from '@/src/shared/components/OtpFlow/OtpFlow.module.css';

export function RecoveryEmailSetup() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error || 'Please enter a valid email address.');
      return;
    }

    setPending(true);
    try {
      await updateRecoveryEmail(validation.trimmedEmail);
      await refreshUser();
      setMessage('Recovery email updated successfully.');
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to update recovery email. Please try again.'
      );
    } finally {
      setPending(false);
    }
  }

  async function handleRemove() {
    if (!window.confirm('Are you sure you want to remove your secondary recovery email?')) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await updateRecoveryEmail(null);
      await refreshUser();
      setEmail('');
      setMessage('Recovery email removed.');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to remove email.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        padding: 20,
        maxWidth: 500,
      }}
    >
      {user?.email && !isEditing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div
              style={{
                fontSize: '0.78rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Active Recovery Email
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
              {user.email}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className={styles.button}
              type="button"
              style={{ width: 'auto', minHeight: 40, padding: '0 18px', fontSize: 14 }}
              onClick={() => {
                setIsEditing(true);
                setError(null);
                setMessage(null);
              }}
            >
              Change Email
            </button>
            <button
              className={styles.secondaryButton}
              type="button"
              style={{
                width: 'auto',
                minHeight: 40,
                padding: '0 18px',
                fontSize: 14,
                color: '#f87171',
                borderColor: 'rgba(239, 68, 68, 0.3)',
              }}
              onClick={handleRemove}
              disabled={pending}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className={styles.form} noValidate>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <span>Recovery Email Address</span>
              <input
                className={`${styles.input} ${error ? styles.inputError : ''}`}
                type="email"
                placeholder="name@example.com"
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
              <span>Must be a valid inbox where you can receive recovery links</span>
            </div>
          </div>

          {error ? (
            <div className={styles.error}>
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          ) : null}

          {message ? (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#6ee7b7',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13.5,
              }}
            >
              ✓ {message}
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button
              className={styles.button}
              type="submit"
              disabled={pending || !email.trim()}
              style={{ width: 'auto', minHeight: 42, padding: '0 20px', fontSize: 14 }}
            >
              {pending ? 'Saving…' : 'Save Recovery Email'}
            </button>
            {user?.email && (
              <button
                className={styles.secondaryButton}
                type="button"
                style={{ width: 'auto', minHeight: 42, padding: '0 16px', fontSize: 14 }}
                onClick={() => {
                  setEmail(user.email || '');
                  setIsEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {message && !isEditing ? (
        <p style={{ color: '#34d399', fontSize: 13.5, marginTop: 12, margin: 0 }}>✓ {message}</p>
      ) : null}
    </div>
  );
}
