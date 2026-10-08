'use client';

import { useState } from 'react';
import { reportLost } from '@/src/shared/api/cards';
import { CardStatus } from '@nfc-card/shared';

interface ReportLostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReportSuccess: (newStatus: CardStatus) => void;
}

export function ReportLostModal({ isOpen, onClose, onReportSuccess }: ReportLostModalProps) {
  const [reason, setReason] = useState<'LOST' | 'DAMAGED' | 'STOLEN' | 'OTHER'>('LOST');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await reportLost({ reason, notes });
      setCompleted(true);
      onReportSuccess(res.card.status as CardStatus);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 999,
      }}
    >
      <div
        style={{
          background: '#0f172a',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 16,
          maxWidth: 480,
          width: '100%',
          padding: 28,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          color: '#f8fafc',
        }}
      >
        {completed ? (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🛡️</div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 8px 0' }}>
                Card Reported & Paused
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                Your card has been automatically PAUSED to protect your contact data. Your public
                profile is now taken offline.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 10,
                padding: '14px 16px',
                fontSize: '0.84rem',
                color: '#c7d2fe',
                marginBottom: 24,
              }}
            >
              ✓ Replacement request submitted to platform admins. When a new card is assigned to
              you, all your profile data and templates will transfer seamlessly.
            </div>

            <button
              onClick={() => {
                setCompleted(false);
                onClose();
              }}
              type="button"
              style={{
                width: '100%',
                minHeight: 44,
                background: '#6366f1',
                border: 'none',
                borderRadius: 8,
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                Report Lost or Damaged Card
              </h2>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: 20 }}>
              Reporting your card will immediately pause it to protect your privacy, and initiate a
              replacement request for platform administrators.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: 8,
                }}
              >
                Reason for Report
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['LOST', 'DAMAGED', 'STOLEN', 'OTHER'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setReason(r)}
                    style={{
                      minHeight: 44,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border:
                        reason === r ? '1px solid #818cf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background:
                        reason === r ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      color: reason === r ? '#ffffff' : '#94a3b8',
                      fontWeight: reason === r ? 600 : 400,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                    }}
                  >
                    {r === 'LOST' && '🔍 Lost'}
                    {r === 'DAMAGED' && '💔 Damaged'}
                    {r === 'STOLEN' && '🚨 Stolen'}
                    {r === 'OTHER' && '📋 Other'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: 6,
                }}
              >
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Where or how did you lose it? Any specific details for support..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  resize: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div
                style={{
                  fontSize: '0.82rem',
                  color: '#f87171',
                  background: 'rgba(239, 68, 68, 0.1)',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  marginBottom: 16,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  minHeight: 44,
                  padding: '10px 16px',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 8,
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  minHeight: 44,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: 8,
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                {loading ? 'Submitting...' : 'Pause & Request Replacement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
