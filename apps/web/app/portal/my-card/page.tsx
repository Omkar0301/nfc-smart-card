'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardStatus, type UserProfileResponse } from '@nfc-card/shared';
import { getProfile } from '@/src/shared/api/profile';
import { getReplacementRequests } from '@/src/shared/api/cards';
import { PauseResumeButton } from '@/src/portal/CardManagement/PauseResumeButton';
import { ReportLostModal } from '@/src/portal/CardManagement/ReportLostModal';
import { QrCodeCard } from '@/src/portal/CardManagement/QrCodeCard';

export default function MyCardPage() {
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileResponse['profile'] | null>(null);
  const [replacementRequests, setReplacementRequests] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [cardStatus, setCardStatus] = useState<CardStatus>(CardStatus.AVAILABLE);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        setLoading(true);
        const [prof, reqs] = await Promise.all([
          getProfile().catch(() => null),
          getReplacementRequests().catch(() => []),
        ]);

        if (!active) return;

        if (prof?.profile) {
          setProfileData(prof.profile);
          setCardStatus(prof.profile.card.status as CardStatus);
        }
        if (reqs) {
          setReplacementRequests(reqs);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load card information');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#94a3b8' }}
      >
        <p>Loading card details...</p>
      </div>
    );
  }

  if (!profileData || !profileData.card) {
    return (
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 40,
          textAlign: 'center',
          maxWidth: 520,
          margin: '40px auto',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📇</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>
          No Active NFC Card Found
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24, lineHeight: 1.5 }}>
          You don't have an active NFC card assigned to your account yet. When you receive your
          physical smart card, tap it to activate or enter its activation link.
        </p>
        <Link
          href="/portal/dashboard"
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            background: '#6366f1',
            borderRadius: 8,
            color: '#ffffff',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const { card, cardType, data } = profileData;
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${baseUrl}/p/${cardType.slug}/${card.publicToken}`;
  const ownerName = String(data?.name || data?.first_name || 'Cardholder');

  const getStatusBadge = (s: CardStatus) => {
    switch (s) {
      case CardStatus.ACTIVE:
        return {
          label: 'Active',
          bg: 'rgba(16, 185, 129, 0.15)',
          text: '#34d399',
          border: '#10b981',
        };
      case CardStatus.PAUSED:
        return {
          label: 'Paused',
          bg: 'rgba(245, 158, 11, 0.15)',
          text: '#fbbf24',
          border: '#f59e0b',
        };
      case CardStatus.SUSPENDED:
        return {
          label: 'Suspended',
          bg: 'rgba(239, 68, 68, 0.15)',
          text: '#f87171',
          border: '#ef4444',
        };
      default:
        return { label: s, bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: '#6366f1' };
    }
  };

  const badge = getStatusBadge(cardStatus);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      {/* Top Header Card */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          background: 'rgba(30, 41, 59, 0.45)',
          padding: '24px 28px',
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
              {card.cardNumber}
            </h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '3px 10px',
                borderRadius: 20,
                background: badge.bg,
                color: badge.text,
                border: `1px solid ${badge.border}`,
              }}
            >
              ● {badge.label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
            {cardType.name} Edition · Linked to your personal profile
          </p>
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#f87171' }}>⚠️ {error}</p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setIsReportModalOpen(true)}
            type="button"
            style={{
              minHeight: 44,
              padding: '10px 18px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>🚨</span> Report Lost / Damaged
          </button>
        </div>
      </div>

      {/* Main Grid: Virtual Card & QR Code */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Visual NFC Card Representation */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #1e293b 100%)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 20,
            padding: 28,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 240,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle NFC signal waves graphic */}
          <div
            style={{
              position: 'absolute',
              top: -30,
              right: -30,
              width: 140,
              height: 140,
              borderRadius: '50%',
              border: '2px solid rgba(255, 255, 255, 0.05)',
              boxShadow:
                '0 0 0 20px rgba(255, 255, 255, 0.03), 0 0 0 40px rgba(255, 255, 255, 0.01)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 42,
                  height: 32,
                  background: 'linear-gradient(135deg, #d97706, #fbbf24)',
                  borderRadius: 6,
                  boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
                }}
              />
              <span style={{ fontSize: '1.2rem', color: '#cbd5e1' }}>📶</span>
            </div>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#818cf8',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {cardType.name}
            </span>
          </div>

          <div>
            <div
              style={{
                fontSize: '1.4rem',
                fontFamily: 'monospace',
                letterSpacing: '0.12em',
                color: '#ffffff',
                marginBottom: 12,
                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
              }}
            >
              {card.cardNumber}
            </div>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}
            >
              <div>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Cardholder
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                  {ownerName}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase' }}>
                  Status
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: badge.text }}>
                  {cardStatus}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code and Sharing Card */}
        <QrCodeCard publicUrl={publicUrl} cardNumber={card.cardNumber} />
      </div>

      {/* Card Lifecycle Controls: Pause & Resume */}
      <div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 12 }}>
          Card Privacy & Availability
        </h3>
        <PauseResumeButton
          initialStatus={cardStatus}
          onStatusChange={(newStatus) => setCardStatus(newStatus)}
        />
      </div>

      {/* Replacement Requests History */}
      {replacementRequests.length > 0 && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 16,
            padding: 24,
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>
            Card Replacement Requests
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {replacementRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '14px 18px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: '#f8fafc',
                      marginBottom: 4,
                    }}
                  >
                    Reason: {req.reason || 'General Replacement'}
                  </div>
                  {req.notes && (
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>
                      "{req.notes}"
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Requested: {new Date(req.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '4px 10px',
                      borderRadius: 12,
                      background:
                        req.status === 'COMPLETED'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : req.status === 'IN_PROGRESS'
                            ? 'rgba(59, 130, 246, 0.15)'
                            : 'rgba(245, 158, 11, 0.15)',
                      color:
                        req.status === 'COMPLETED'
                          ? '#34d399'
                          : req.status === 'IN_PROGRESS'
                            ? '#60a5fa'
                            : '#fbbf24',
                    }}
                  >
                    {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Modal */}
      <ReportLostModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        onReportSuccess={(newStatus) => {
          setCardStatus(newStatus);
          getReplacementRequests()
            .then(setReplacementRequests)
            .catch(() => {});
        }}
      />
    </div>
  );
}
