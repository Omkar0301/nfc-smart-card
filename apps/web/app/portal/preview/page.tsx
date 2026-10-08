'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CardStatus, type TemplateSummary, type UserProfileResponse } from '@nfc-card/shared';
import { TemplateRenderer } from '@nfc-card/shared/templates';
import { getProfile } from '@/src/shared/api/profile';
import { listTemplates } from '@/src/shared/api/templates';

export default function ProfilePreviewPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileResponse['profile'] | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'desktop'>('mobile');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPreview() {
      try {
        setLoading(true);
        const profRes = await getProfile();
        if (!active) return;
        setProfile(profRes.profile);

        if (profRes.profile?.cardType?.slug) {
          const tpls = await listTemplates(profRes.profile.cardType.slug).catch(() => []);
          if (active) setTemplates(tpls);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load profile preview');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadPreview();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#94a3b8' }}
      >
        <p>Loading live preview...</p>
      </div>
    );
  }

  if (!profile || !profile.card) {
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
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>📱</div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: 8, color: '#f8fafc' }}>
          No Active Profile to Preview
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: 24 }}>
          Please activate a card and set up your profile before previewing.
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
          }}
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Filter visible profile data to simulate actual public SSR rendering
  const visibility = profile.fieldVisibility || {};
  const rawData = profile.data || {};
  const visibleData: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(rawData)) {
    if (visibility[key] !== false && val !== undefined && val !== null) {
      visibleData[key] = val;
    }
  }

  // Resolve template slug
  let activeTemplateSlug = 'business-modern';
  if (profile.templateId) {
    const matched = templates.find((t) => t.id === profile.templateId);
    if (matched) activeTemplateSlug = matched.slug;
  } else if (profile.cardType.slug === 'college') {
    activeTemplateSlug = 'college-academic';
  }

  const cardStatus = profile.card.status as CardStatus;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Live Preview Controls Banner */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 14,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 20,
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#a5b4fc',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            ● Live Preview Mode
          </span>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Template:{' '}
            <strong style={{ color: '#f8fafc' }}>
              {templates.find((t) => t.slug === activeTemplateSlug)?.name || activeTemplateSlug}
            </strong>
          </span>
        </div>

        {/* Viewport switch & Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(15, 23, 42, 0.7)',
              borderRadius: 8,
              padding: 3,
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            <button
              onClick={() => setDeviceMode('mobile')}
              type="button"
              style={{
                minHeight: 36,
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: deviceMode === 'mobile' ? '#6366f1' : 'transparent',
                color: deviceMode === 'mobile' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              📱 Mobile
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              type="button"
              style={{
                minHeight: 36,
                padding: '6px 14px',
                borderRadius: 6,
                border: 'none',
                background: deviceMode === 'desktop' ? '#6366f1' : 'transparent',
                color: deviceMode === 'desktop' ? '#ffffff' : '#94a3b8',
                fontWeight: 600,
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              💻 Desktop
            </button>
          </div>

          <Link
            href="/portal/templates"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#818cf8',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255, 255, 255, 0.04)',
            }}
          >
            Switch Template
          </Link>
          <Link
            href="/portal/profile"
            style={{
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#ffffff',
              textDecoration: 'none',
              padding: '8px 14px',
              borderRadius: 8,
              background: '#6366f1',
            }}
          >
            Edit Profile
          </Link>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: '0.85rem',
            color: '#f87171',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {cardStatus === CardStatus.PAUSED && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: '0.85rem',
            color: '#fbbf24',
          }}
        >
          ⚠️ Note: Your card is currently <strong>PAUSED</strong>. Public visitors tapping your card
          will see an unavailable message until you resume it in My Card.
        </div>
      )}

      {/* Simulated Device Preview Screen */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: deviceMode === 'mobile' ? '20px 0 60px' : '0',
          minHeight: '70vh',
        }}
      >
        <div
          style={{
            width: deviceMode === 'mobile' ? 390 : '100%',
            maxWidth: deviceMode === 'mobile' ? 390 : 800,
            background: '#ffffff',
            borderRadius: deviceMode === 'mobile' ? 36 : 16,
            overflow: 'hidden',
            boxShadow:
              deviceMode === 'mobile'
                ? '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 0 10px #1e293b, 0 0 0 12px rgba(255, 255, 255, 0.1)'
                : '0 10px 30px rgba(0, 0, 0, 0.4)',
            minHeight: deviceMode === 'mobile' ? 720 : 600,
            position: 'relative',
          }}
        >
          {deviceMode === 'mobile' && (
            <div
              style={{
                height: 28,
                background: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 16,
                  background: '#000000',
                  borderRadius: '0 0 10px 10px',
                }}
              />
            </div>
          )}

          <div style={{ color: '#0f172a', minHeight: '100%' }}>
            <TemplateRenderer
              slug={activeTemplateSlug}
              profile={{
                data: visibleData as any,
                fieldSchema: profile.cardType.fieldSchema as any,
              }}
              card={{
                cardNumber: profile.card.cardNumber,
                publicToken: profile.card.publicToken,
                profileUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${profile.cardType.slug}/${profile.card.publicToken}`,
              }}
              configuration={{ accent: '#6366f1' }}
              isPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
