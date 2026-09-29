'use client';

import React, { useState, useEffect } from 'react';
import type { CardType } from '@nfc-card/shared';
import { listCardTypes } from '../../shared/api/cardTypes';
import { downloadCardsCsv } from '../../shared/api/cards';
import styles from './CardManagement.module.css';

const CARD_STATUS_OPTIONS = [
  'AVAILABLE',
  'ASSIGNED',
  'ACTIVE',
  'PAUSED',
  'SUSPENDED',
  'DEACTIVATED',
];

export function CardExport() {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loadingCardTypes, setLoadingCardTypes] = useState(true);

  const [selectedCardTypeId, setSelectedCardTypeId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [batchIdFilter, setBatchIdFilter] = useState<string>('');

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadTypes() {
      setLoadingCardTypes(true);
      try {
        const types = await listCardTypes();
        setCardTypes(types);
      } catch (err: any) {
        console.error('Failed to load card types for export:', err);
      } finally {
        setLoadingCardTypes(false);
      }
    }
    loadTypes();
  }, []);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setExporting(true);

    try {
      await downloadCardsCsv({
        cardTypeId: selectedCardTypeId || undefined,
        status: selectedStatus || undefined,
        batchId: batchIdFilter.trim() || undefined,
      });
      setSuccess('CSV exported and downloaded successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to download card CSV export.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
        Export Cards CSV for Manufacturer
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 20px 0' }}>
        Download card records formatted with Card Number, Card Type, NFC URL, and Status. Use this
        file to provide programming data to the NFC card printer / factory.
      </p>

      {error && <div className={`${styles.banner} ${styles.errorBanner}`}>{error}</div>}
      {success && <div className={`${styles.banner} ${styles.successBanner}`}>{success}</div>}

      <form onSubmit={handleExport}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="exportCardType">
              Filter by Card Type
            </label>
            <select
              id="exportCardType"
              className={styles.formSelect}
              value={selectedCardTypeId}
              onChange={(e) => setSelectedCardTypeId(e.target.value)}
              disabled={exporting || loadingCardTypes}
            >
              <option value="">All Card Types</option>
              {cardTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (/{t.slug})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="exportStatus">
              Filter by Status
            </label>
            <select
              id="exportStatus"
              className={styles.formSelect}
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={exporting}
            >
              <option value="">All Statuses</option>
              {CARD_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="exportBatch">
              Filter by Batch ID
            </label>
            <input
              id="exportBatch"
              type="text"
              className={styles.formInput}
              placeholder="e.g. 550e8400-e29b-..."
              value={batchIdFilter}
              onChange={(e) => setBatchIdFilter(e.target.value)}
              disabled={exporting}
            />
          </div>
        </div>

        <div className={styles.previewBox} style={{ marginTop: 12 }}>
          <div className={styles.previewTitle}>CSV File Structure:</div>
          <code style={{ fontSize: 12, color: '#334155' }}>
            Card Number,Card Type,NFC URL,Status
            <br />
            BC-000001,Business,https://domain.com/p/business/aB3x_9kL...,AVAILABLE
          </code>
        </div>

        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={exporting}
          style={{ marginTop: 12 }}
        >
          {exporting ? 'Generating & Downloading...' : '📥 Download CSV Export'}
        </button>
      </form>
    </div>
  );
}
