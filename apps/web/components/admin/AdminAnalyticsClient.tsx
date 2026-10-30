'use client';

import React, { useEffect, useState } from 'react';
import type { CardType, PlatformAnalyticsSummary } from '@nfc-card/shared';
import { getPlatformAnalytics } from '@/src/shared/api/cards';
import { listCardTypes } from '@/src/shared/api/cardTypes';
import styles from './AdminAnalytics.module.css';

export function AdminAnalyticsClient() {
  const [analytics, setAnalytics] = useState<PlatformAnalyticsSummary | null>(null);
  const [cardTypes, setCardTypes] = useState<CardType[]>([]);
  const [selectedCardType, setSelectedCardType] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCardTypes() {
      try {
        const types = await listCardTypes();
        setCardTypes(types);
      } catch (err) {
        console.error('Failed to load card types:', err);
      }
    }
    loadCardTypes();
  }, []);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPlatformAnalytics(selectedCardType ? selectedCardType : undefined);
        setAnalytics(data);
      } catch (err: any) {
        setError(err?.message || 'Failed to load platform analytics.');
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, [selectedCardType]);

  const maxDailyCount = analytics?.dailyViews
    ? Math.max(...analytics.dailyViews.map((d) => d.count), 1)
    : 1;

  const eventIcons: Record<string, string> = {
    PROFILE_VIEW: '👁️',
    SCAN: '⚡',
    PHONE_CLICK: '📞',
    EMAIL_CLICK: '✉️',
    WHATSAPP_CLICK: '💬',
    WEBSITE_CLICK: '🌐',
    INSTAGRAM_CLICK: '📸',
    LINKEDIN_CLICK: '💼',
    SAVE_CONTACT: '📥',
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Platform Engagement Telemetry</h1>
          <p className={styles.subtitle}>
            Platform-wide visitor interactions, 14-day daily traffic patterns, and CTA conversion
            metrics.
          </p>
        </div>

        <div className={styles.filterBar}>
          <label htmlFor="analyticsFilter" className={styles.filterLabel}>
            Vertical Filter:
          </label>
          <select
            id="analyticsFilter"
            className={styles.filterSelect}
            value={selectedCardType}
            onChange={(e) => setSelectedCardType(e.target.value)}
          >
            <option value="">All Card Types ({cardTypes.length})</option>
            {cardTypes.map((ct) => (
              <option key={ct.id} value={ct.id}>
                {ct.name} ({ct.cardNumberPrefix})
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: 8,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {loading && !analytics ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: '3px solid rgba(255, 255, 255, 0.1)',
              borderTopColor: '#8b5cf6',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px auto',
            }}
          />
          Aggregating telemetry events...
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* Key Stat Cards */}
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Total Telemetry Events</span>
                <span>📊</span>
              </div>
              <div className={styles.statVal} style={{ color: '#c084fc' }}>
                {analytics?.totalEvents.toLocaleString() ?? 0}
              </div>
              <span className={styles.statMeta}>Total recorded interactions</span>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Profile Page Views</span>
                <span>👁️</span>
              </div>
              <div className={styles.statVal} style={{ color: '#38bdf8' }}>
                {(analytics?.eventBreakdown?.PROFILE_VIEW ?? 0).toLocaleString()}
              </div>
              <span className={styles.statMeta}>Unique session views</span>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Physical NFC Scans</span>
                <span>⚡</span>
              </div>
              <div className={styles.statVal} style={{ color: '#34d399' }}>
                {(analytics?.eventBreakdown?.SCAN ?? 0).toLocaleString()}
              </div>
              <span className={styles.statMeta}>Hardware tap detections</span>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statLabel}>Contact Saves (.VCF)</span>
                <span>📥</span>
              </div>
              <div className={styles.statVal} style={{ color: '#fbbf24' }}>
                {(analytics?.eventBreakdown?.SAVE_CONTACT ?? 0).toLocaleString()}
              </div>
              <span className={styles.statMeta}>vCard downloads</span>
            </div>
          </div>

          {/* 14-Day Daily Trend Chart */}
          <div className={styles.chartSection}>
            <h2 className={styles.sectionTitle}>
              <span>📈</span> 14-Day Daily Public Profile Views
            </h2>
            <div className={styles.chartContainer}>
              {analytics?.dailyViews.map((item) => {
                const heightPercent = Math.max(Math.round((item.count / maxDailyCount) * 100), 4);
                const displayDate = item.date.slice(5); // MM-DD
                return (
                  <div key={item.date} className={styles.chartBarWrapper}>
                    <span className={styles.chartTooltip}>{item.count}</span>
                    <div className={styles.chartBar} style={{ height: `${heightPercent}%` }} />
                    <span className={styles.chartLabel}>{displayDate}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Event Types Breakdown Grid */}
          <div className={styles.chartSection}>
            <h2 className={styles.sectionTitle}>
              <span>🎯</span> Telemetry Events Breakdown by Interaction Type
            </h2>
            <div className={styles.eventsGrid}>
              {analytics?.eventBreakdown && Object.keys(analytics.eventBreakdown).length > 0 ? (
                Object.entries(analytics.eventBreakdown).map(([type, count]) => (
                  <div key={type} className={styles.eventCard}>
                    <div className={styles.eventCardHeader}>
                      <span className={styles.eventType}>{type.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: '1.2rem' }}>{eventIcons[type] || '📌'}</span>
                    </div>
                    <span className={styles.eventCount}>{count.toLocaleString()}</span>
                  </div>
                ))
              ) : (
                <div style={{ color: '#64748b', padding: '24px', gridColumn: '1 / -1' }}>
                  No interaction events recorded yet for this selection.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
