'use client';

import React, { useEffect, useState } from 'react';
import type { CardType } from '@nfc-card/shared';
import { listCardTypes } from '../../shared/api/cardTypes';
import { generateCards } from '../../shared/api/cards';
import styles from './CardManagement.module.css';

interface GenerateCardsProps {
  onJobStarted: (jobId: string, batchId: string) => void;
}

const PRESET_QUANTITIES = [50, 100, 250, 500, 1000, 2500, 5000];

export function GenerateCards({ onJobStarted }: GenerateCardsProps) {
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [loadingCardTypes, setLoadingCardTypes] = useState(true);
  const [selectedCardTypeId, setSelectedCardTypeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(500);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadTypes() {
      setLoadingCardTypes(true);
      try {
        const types = await listCardTypes();
        const activeTypes = types.filter((t) => t.status === 'ACTIVE');
        setCardTypes(activeTypes);
        if (activeTypes.length > 0) {
          setSelectedCardTypeId((prev) => prev || activeTypes[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load card types.');
      } finally {
        setLoadingCardTypes(false);
      }
    }
    loadTypes();
  }, []);

  const selectedCardType = cardTypes.find((t) => t.id === selectedCardTypeId);
  const prefix =
    (selectedCardType as any)?.cardNumberPrefix ||
    (selectedCardType?.slug === 'college' ? 'CC' : 'BC');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!selectedCardTypeId) {
      setError('Please select an active card type.');
      return;
    }

    if (quantity < 1 || quantity > 10000) {
      setError('Quantity must be between 1 and 10,000 cards.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await generateCards({
        cardTypeId: selectedCardTypeId,
        quantity,
      });

      setSuccessMessage(`Enqueued job ${res.jobId} for batch ${res.batchId}`);
      onJobStarted(res.jobId, res.batchId);
    } catch (err: any) {
      setError(err.message || 'Failed to enqueue card generation job.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.formCard}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px 0', color: '#0f172a' }}>
        Generate New Card Inventory
      </h2>
      <p style={{ fontSize: 14, color: '#64748b', margin: '0 0 24px 0' }}>
        Creates cryptographically-random tokens and sequential card numbers for physical NFC
        printing. Processing runs asynchronously in the background.
      </p>

      {error && <div className={`${styles.banner} ${styles.errorBanner}`}>{error}</div>}
      {successMessage && (
        <div className={`${styles.banner} ${styles.successBanner}`}>{successMessage}</div>
      )}

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="cardTypeSelect">
            Card Type / Vertical
          </label>
          {loadingCardTypes ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Loading active card types...</div>
          ) : cardTypes.length === 0 ? (
            <div style={{ color: '#dc2626', fontSize: 13 }}>
              No active card types found. Please activate or create a card type first.
            </div>
          ) : (
            <select
              id="cardTypeSelect"
              className={styles.formSelect}
              value={selectedCardTypeId}
              onChange={(e) => setSelectedCardTypeId(e.target.value)}
              disabled={submitting}
            >
              {cardTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Prefix: {(t as any).cardNumberPrefix || 'BC'}, Slug: /{t.slug})
                </option>
              ))}
            </select>
          )}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel} htmlFor="quantityInput">
            Batch Quantity (1 – 10,000 cards)
          </label>
          <input
            id="quantityInput"
            type="number"
            min={1}
            max={10000}
            className={styles.formInput}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
            disabled={submitting}
          />
          <div className={styles.presetGrid}>
            {PRESET_QUANTITIES.map((preset) => (
              <button
                key={preset}
                type="button"
                className={`${styles.presetBtn} ${quantity === preset ? styles.presetBtnActive : ''}`}
                onClick={() => setQuantity(preset)}
                disabled={submitting}
              >
                +{preset}
              </button>
            ))}
          </div>
        </div>

        {selectedCardType && (
          <div className={styles.previewBox}>
            <div className={styles.previewTitle}>Card Specifications & Verification:</div>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              <li>
                <strong>Prefix:</strong> <code className={styles.previewCode}>{prefix}</code> (e.g.{' '}
                <code>{prefix}-000001</code>)
              </li>
              <li>
                <strong>Public Token:</strong> 16-byte base64url cryptographically random string
                (e.g. <code>rK_v39Lx...</code>)
              </li>
              <li>
                <strong>NFC URL format:</strong>{' '}
                <code>https://.../p/{selectedCardType.slug}/&lt;token&gt;</code>
              </li>
              <li>
                <strong>Initial Status:</strong> <code>AVAILABLE</code>
              </li>
            </ul>
          </div>
        )}

        <button
          type="submit"
          className={styles.primaryBtn}
          disabled={submitting || loadingCardTypes || cardTypes.length === 0}
        >
          {submitting ? 'Enqueuing Job...' : `⚡ Generate ${quantity.toLocaleString()} Cards`}
        </button>
      </form>
    </div>
  );
}
