'use client';

import { useState, type FormEvent, useEffect } from 'react';
import { useAuth } from '@/src/shared/hooks/useAuth';
import { updateRecoveryEmail } from '@/src/shared/api/auth';
import { ApiError } from '@/src/shared/api/client';
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
    setPending(true);
    setError(null);
    setMessage(null);

    try {
      await updateRecoveryEmail(email.trim() || null);
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

  return (
    <div style={{ maxWidth: 440, padding: 16, border: '1px solid #e0e0e0', borderRadius: 8 }}>
      <h2 style={{ fontSize: 18, marginTop: 0 }}>Secondary Recovery Email</h2>
      <p style={{ fontSize: 14, color: '#555' }}>
        Used to recover your account if you lose access to your primary phone number.
      </p>

      {user?.email && !isEditing ? (
        <div>
          <p style={{ fontSize: 15, margin: '12px 0' }}>
            Current email: <strong>{user.email}</strong>
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={styles.button} type="button" onClick={() => setIsEditing(true)}>
              Change Email
            </button>
            <button
              className={styles.button}
              type="button"
              style={{ backgroundColor: 'transparent', border: '1px solid #ccc', color: '#b42318' }}
              onClick={async () => {
                if (window.confirm('Are you sure you want to remove your recovery email?')) {
                  setPending(true);
                  try {
                    await updateRecoveryEmail(null);
                    await refreshUser();
                    setEmail('');
                    setMessage('Recovery email removed.');
                  } catch (err) {
                    setError(err instanceof ApiError ? err.message : 'Failed to remove email.');
                  } finally {
                    setPending(false);
                  }
                }
              }}
              disabled={pending}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className={styles.form} style={{ marginTop: 12 }}>
          <label className={styles.label}>
            Email address
            <input
              className={styles.input}
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
          {message ? <p style={{ color: '#027a48', fontSize: 14, margin: 0 }}>{message}</p> : null}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className={styles.button} type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save Recovery Email'}
            </button>
            {user?.email ? (
              <button
                className={styles.button}
                type="button"
                style={{ backgroundColor: 'transparent', border: '1px solid #ccc', color: '#333' }}
                onClick={() => {
                  setEmail(user.email || '');
                  setIsEditing(false);
                  setError(null);
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      )}

      {message && !isEditing ? (
        <p style={{ color: '#027a48', fontSize: 14, marginTop: 12 }}>{message}</p>
      ) : null}
    </div>
  );
}
