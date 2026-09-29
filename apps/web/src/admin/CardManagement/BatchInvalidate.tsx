'use client';

import React, { useState, useEffect } from 'react';
import { invalidateBatch, type BatchInvalidateResponse } from '../../shared/api/cards';
import styles from './CardManagement.module.css';

interface BatchInvalidateProps {
  initialBatchId?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

export function BatchInvalidate({ initialBatchId, onClose, onSuccess }: BatchInvalidateProps) {
  const [batchId, setBatchId] = useState(initialBatchId || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchInvalidateResponse | null>(null);

  useEffect(() => {
    if (initialBatchId) {
      setBatchId(initialBatchId);
    }
  }, [initialBatchId]);

  const handleInvalidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = batchId.trim();
    if (!trimmed) {
      setError('Please provide a valid Batch UUID.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to invalidate batch "${trimmed}"?\n\nAll still-AVAILABLE cards will be permanently DEACTIVATED. Cards already assigned or active will be skipped.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const res = await invalidateBatch(trimmed);
      setResult(res);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to invalidate batch.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#dc2626' }}>
          Defective Batch Invalidation (QC Reject)
        </h2>
        {onClose && (
          <button type="button" className={styles.secondaryBtn} onClick={onClose}>
            Close
          </button>
        )}
      </div>

      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px 0' }}>
        If a manufacturing or printing run fails quality control, invalidate all cards in the batch.
        Cards currently in <code>AVAILABLE</code> status will be deactivated so they cannot be
        claimed. Cards already claimed or assigned will remain untouched.
      </p>

      {error && <div className={`${styles.banner} ${styles.errorBanner}`}>{error}</div>}

      {result && (
        <div className={`${styles.banner} ${styles.successBanner}`}>
          <div>
            <strong>Batch Processed Successfully:</strong>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: 18 }}>
              <li>
                <strong>{result.invalidated}</strong> cards invalidated (marked DEACTIVATED).
              </li>
              <li>
                <strong>{result.skipped}</strong> cards skipped ({result.message}).
              </li>
            </ul>
          </div>
        </div>
      )}

      <form onSubmit={handleInvalidate}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="batchIdInput">
            Batch UUID
          </label>
          <input
            id="batchIdInput"
            type="text"
            className={styles.formInput}
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div
          className={`${styles.banner} ${styles.warningBanner}`}
          style={{ fontSize: 13, marginBottom: 20 }}
        >
          ⚠️ <strong>QC Safety Invariant:</strong> This action cannot be reversed. Invalidation only
          affects unclaimed inventory.
        </div>

        <button
          type="submit"
          className={styles.dangerBtn}
          disabled={submitting || !batchId.trim()}
          style={{ padding: '10px 20px', fontSize: 14 }}
        >
          {submitting ? 'Invalidating...' : '🚨 Invalidate Defective Batch'}
        </button>
      </form>
    </div>
  );
}
