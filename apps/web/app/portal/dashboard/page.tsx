'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CardStatus,
  type UserProfileResponse,
  type CustomerAnalyticsSummary,
} from '@nfc-card/shared';
import { getProfile, getProfileAnalytics } from '@/src/shared/api/profile';
import { DashboardCard } from '@/components/portal/DashboardCard';

export default function CustomerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileResponse['profile'] | null>(null);
  const [analytics, setAnalytics] = useState<CustomerAnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        setLoading(true);
        const [profData, analyticsData] = await Promise.all([
          getProfile().catch(() => null),
          getProfileAnalytics().catch(() => null),
        ]);

        if (!active) return;

        if (profData?.profile) {
          setProfile(profData.profile);
        }
        if (analyticsData) {
          setAnalytics(analyticsData);
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load dashboard');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#94a3b8' }}
      >
        <p>Loading dashboard metrics...</p>
      </div>
    );
  }

  const card = profile?.card;
  const cardType = profile?.cardType;
  const status = card?.status || CardStatus.AVAILABLE;

  const getStatusBadge = (s: CardStatus) => {
    switch (s) {
      case CardStatus.ACTIVE:
        return { text: 'Active & Live', variant: 'success' as const };
      case CardStatus.PAUSED:
        return { text: 'Paused (Hidden)', variant: 'warning' as const };
      case CardStatus.SUSPENDED:
        return { text: 'Suspended', variant: 'danger' as const };
      case CardStatus.ASSIGNED:
        return { text: 'Draft Profile', variant: 'info' as const };
      default:
        return { text: s, variant: 'info' as const };
    }
  };

  const statusBadge = getStatusBadge(status as CardStatus);
  const visibleFieldsCount = Object.values(profile?.fieldVisibility || {}).filter(Boolean).length;
  const totalFieldsCount = cardType?.fieldSchema?.length || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Welcome & Card Hero Banner */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(30, 27, 75, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}
          >
            Welcome back, {String(profile?.data?.name || 'Cardholder')}
          </h1>
          {error ? (
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#f87171' }}>⚠️ {error}</p>
          ) : (
            <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
              {card ? (
                <>
                  Your NFC smart card{' '}
                  <span style={{ color: '#f8fafc', fontWeight: 600 }}>{card.cardNumber}</span> (
                  {cardType?.name}) is currently{' '}
                  <span
                    style={{
                      color:
                        status === CardStatus.ACTIVE
                          ? '#34d399'
                          : status === CardStatus.PAUSED
                            ? '#fbbf24'
                            : '#60a5fa',
                      fontWeight: 600,
                    }}
                  >
                    {status}
                  </span>
                  .
                </>
              ) : (
                'Manage your smart card profile, appearance, and analytics.'
              )}
            </p>
          )}
        </div>

        {card && (
          <div style={{ display: 'flex', gap: 10 }}>
            <Link
              href="/portal/my-card"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 8,
                color: '#a5b4fc',
                fontWeight: 600,
                fontSize: '0.85rem',
                textDecoration: 'none',
              }}
            >
              <span>🎴</span> View Card & QR
            </Link>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <DashboardCard
          title="Card Status"
          value={card?.cardNumber || 'None'}
          subtext={card ? `${cardType?.name} Card` : 'No card activated yet'}
          icon="🪪"
          accentColor={
            status === CardStatus.ACTIVE
              ? '#10b981'
              : status === CardStatus.PAUSED
                ? '#f59e0b'
                : '#6366f1'
          }
          badge={card ? statusBadge : undefined}
        />

        <DashboardCard
          title="Views Today"
          value={analytics?.viewsToday ?? 0}
          subtext="Profile views in the last 24h"
          icon="👁️"
          accentColor="#6366f1"
        />

        <DashboardCard
          title="Views This Week"
          value={analytics?.viewsThisWeek ?? 0}
          subtext="Profile views over the last 7 days"
          icon="📈"
          accentColor="#8b5cf6"
        />

        <DashboardCard
          title="Total Lifetime Views"
          value={analytics?.viewsTotal ?? 0}
          subtext="All-time profile visits"
          icon="🌟"
          accentColor="#06b6d4"
        />
      </div>

      {/* Quick Action Navigation Grid */}
      <div>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: 16 }}>
          Quick Actions
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <Link
            href="/portal/profile"
            style={{
              padding: 22,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#f8fafc',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>📇</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Edit Card Profile</div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
              Update your contact info, social links, and control visible fields (
              {visibleFieldsCount}/{totalFieldsCount} visible).
            </p>
          </Link>

          <Link
            href="/portal/my-card"
            style={{
              padding: 22,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#f8fafc',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🎴</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>My Card & QR Code</div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
              Inspect card details, copy public profile link, download QR code, or pause/resume your
              card.
            </p>
          </Link>

          <Link
            href="/portal/templates"
            style={{
              padding: 22,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#f8fafc',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>🎨</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Template Gallery</div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
              Browse modern design layouts for your {cardType?.name || 'smart'} card and switch
              themes instantly.
            </p>
          </Link>

          <Link
            href="/portal/preview"
            style={{
              padding: 22,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#f8fafc',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>👁️</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Live Preview</div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
              See what visitors experience in real-time on mobile or desktop when tapping your smart
              card.
            </p>
          </Link>

          <Link
            href="/portal/analytics"
            style={{
              padding: 22,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#f8fafc',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>📊</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Card Analytics</div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
              Track visitor taps, profile views, and interaction breakdown over time.
            </p>
          </Link>

          <Link
            href="/portal/settings"
            style={{
              padding: 22,
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 14,
              textDecoration: 'none',
              color: '#f8fafc',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ fontSize: '1.8rem' }}>⚙️</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>Account & Security</div>
            <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
              Manage recovery email, update phone number, and review active sessions.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
