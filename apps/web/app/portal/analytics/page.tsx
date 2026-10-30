'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CustomerAnalyticsSummary, UserProfileResponse } from '@nfc-card/shared';
import { getProfile, getProfileAnalytics } from '@/src/shared/api/profile';
import { DashboardCard } from '@/components/portal/DashboardCard';

export default function CustomerAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CustomerAnalyticsSummary | null>(null);
  const [profile, setProfile] = useState<UserProfileResponse['profile'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadAnalytics() {
      try {
        setLoading(true);
        const [profData, stats] = await Promise.all([
          getProfile().catch(() => null),
          getProfileAnalytics().catch(() => null),
        ]);

        if (!active) return;
        if (profData?.profile) setProfile(profData.profile);
        if (stats) setAnalytics(stats);
      } catch (err: any) {
        if (active) setError(err?.message || 'Failed to load analytics');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', padding: '60px 0', color: '#94a3b8' }}
      >
        <p>Loading analytics data...</p>
      </div>
    );
  }

  const maxDaily = Math.max(1, ...(analytics?.dailyViews.map((d) => d.count) || [1]));
  const clickData = analytics?.clickBreakdown ?? {
    phone: 0,
    whatsapp: 0,
    email: 0,
    saveContact: 0,
    website: 0,
    instagram: 0,
    linkedin: 0,
    totalClicks: 0,
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'PROFILE_VIEW':
        return '👁️';
      case 'SCAN':
        return '📶';
      case 'PHONE_CLICK':
        return '📞';
      case 'WHATSAPP_CLICK':
        return '💬';
      case 'EMAIL_CLICK':
        return '✉️';
      case 'SAVE_CONTACT':
        return '📇';
      case 'WEBSITE_CLICK':
        return '🌐';
      case 'INSTAGRAM_CLICK':
      case 'LINKEDIN_CLICK':
        return '🔗';
      default:
        return '⚡';
    }
  };

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
      {/* Header */}
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
          <h1
            style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}
          >
            Card Analytics & Activity
          </h1>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
            Telemetry for card {profile?.card?.cardNumber || 'Smart Card'} · Profile views & taps
          </p>
          {error && (
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#f87171' }}>⚠️ {error}</p>
          )}
        </div>

        <Link
          href="/portal/my-card"
          style={{
            minHeight: 44,
            padding: '10px 16px',
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 8,
            color: '#a5b4fc',
            fontWeight: 600,
            fontSize: '0.85rem',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>🎴</span> My Card & QR
        </Link>
      </div>

      {/* Metrics Row — 4 time-bucketed view counts (PRD §20) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        <DashboardCard
          title="Views Today"
          value={analytics?.viewsToday ?? 0}
          subtext="UTC Day (00:00 - now)"
          icon="📅"
          accentColor="#6366f1"
        />

        <DashboardCard
          title="Views This Week"
          value={analytics?.viewsThisWeek ?? 0}
          subtext="Last 7 days"
          icon="📈"
          accentColor="#8b5cf6"
        />

        <DashboardCard
          title="Views This Month"
          value={analytics?.viewsThisMonth ?? 0}
          subtext="Last 30 days"
          icon="🗓️"
          accentColor="#3b82f6"
        />

        <DashboardCard
          title="Total Lifetime Views"
          value={analytics?.viewsTotal ?? 0}
          subtext="All-time verified visits"
          icon="🌟"
          accentColor="#06b6d4"
        />
      </div>

      {/* Contact & Button Click Breakdown (PRD §20) */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
              Contact & Action Interactions
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Breakdown of visitor engagement and link clicks across your profile
            </p>
          </div>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: 20,
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: '#c7d2fe',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            {clickData.totalClicks} Total Interactions
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📞</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {clickData.phone}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>Phone Calls</div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>💬</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {clickData.whatsapp}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>WhatsApp</div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>✉️</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {clickData.email}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>Emails</div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>📇</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {clickData.saveContact}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
              Saved to Contacts
            </div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '16px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.06)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🌐</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc' }}>
              {(clickData.website || 0) + (clickData.instagram || 0) + (clickData.linkedin || 0)}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>Social & Web</div>
          </div>
        </div>
      </div>

      {/* Daily View Breakdown Chart */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
            Profile Views Over Time (Last 14 Days)
          </h2>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Unique Daily Visitors</span>
        </div>

        {analytics?.dailyViews && analytics.dailyViews.length > 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: 8,
              height: 180,
              padding: '16px 0',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}
          >
            {analytics.dailyViews.map((day) => {
              const heightPercent = Math.max(10, Math.round((day.count / maxDaily) * 100));
              const label = day.date.slice(5); // MM-DD
              return (
                <div
                  key={day.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    {day.count > 0 ? day.count : ''}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: 32,
                      height: `${heightPercent}%`,
                      background:
                        day.count > 0
                          ? 'linear-gradient(180deg, #818cf8 0%, #4f46e5 100%)'
                          : 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '6px 6px 2px 2px',
                      transition: 'all 0.3s ease',
                    }}
                    title={`${day.date}: ${day.count} views`}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            No view data recorded yet.
          </div>
        )}
      </div>

      {/* Recent Interaction Events */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2
          style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 16px 0', color: '#f8fafc' }}
        >
          Recent Activity Feed
        </h2>

        {analytics?.recentEvents && analytics.recentEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {analytics.recentEvents.map((ev) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: '1.2rem' }}>{getEventIcon(ev.eventType)}</span>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
                      {ev.eventType.replace(/_/g, ' ')}
                    </div>
                    {ev.metadata?.referrer && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Ref: {String(ev.metadata.referrer)}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  {new Date(ev.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📶</div>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1' }}>No interactions yet</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              When people tap your NFC card, scan your QR code, or click your links, visitor events
              will display here in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
