'use client';

import { useEffect, useRef } from 'react';

interface AnalyticsTrackerProps {
  cardToken: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

function getVisitorId(): string {
  try {
    const key = 'nfc_vid';
    let vid = localStorage.getItem(key);
    if (!vid) {
      vid = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, vid);
    }
    return vid;
  } catch {
    return 'anon_' + Math.random().toString(36).slice(2);
  }
}

/**
 * Client Component that asynchronously records public profile interactions
 * (PROFILE_VIEW, SCAN, link clicks) without blocking page render (F-010 / F-014).
 */
export function AnalyticsTracker({
  cardToken,
  eventType = 'PROFILE_VIEW',
  metadata,
}: AnalyticsTrackerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (!cardToken) return;

    const endpoint = `${API_URL}/analytics/event`;

    const sendTelemetry = (evType: string, extraMeta?: Record<string, unknown>) => {
      const payload = JSON.stringify({
        cardToken,
        eventType: evType,
        metadata: {
          ...metadata,
          ...extraMeta,
          visitorId: getVisitorId(),
          referrer: typeof document !== 'undefined' ? document.referrer : undefined,
          path: typeof window !== 'undefined' ? window.location.pathname : undefined,
          timestamp: new Date().toISOString(),
        },
      });

      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([payload], { type: 'application/json' });
          if (navigator.sendBeacon(endpoint, blob)) return;
        }

        void fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Best-effort telemetry: silent fail
        });
      } catch {
        // Best-effort: silent fail
      }
    };

    // 1. Initial Page View / Scan Telemetry
    if (!hasFired.current) {
      hasFired.current = true;
      sendTelemetry(eventType);

      // If URL contains scan flags (?source=nfc, ?scan=1, ?src=qr)
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (
          params.get('scan') === '1' ||
          params.get('source') === 'nfc' ||
          params.get('src') === 'qr' ||
          params.has('nfc')
        ) {
          sendTelemetry('SCAN', { source: params.get('source') || params.get('src') || 'nfc' });
        }
      }
    }

    // 2. Global Event Delegation for Contact Link & Action Clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const linkOrButton = target.closest('a, button');
      if (!linkOrButton) return;

      const href = (linkOrButton as HTMLAnchorElement).href || '';
      const text = linkOrButton.textContent || '';
      const download = linkOrButton.getAttribute('download');
      const ariaLabel = linkOrButton.getAttribute('aria-label') || '';

      if (href.startsWith('tel:')) {
        sendTelemetry('PHONE_CLICK', { target: href });
      } else if (href.startsWith('mailto:')) {
        sendTelemetry('EMAIL_CLICK', { target: href });
      } else if (href.includes('wa.me') || href.includes('whatsapp.com')) {
        sendTelemetry('WHATSAPP_CLICK', { target: href });
      } else if (href.includes('instagram.com')) {
        sendTelemetry('INSTAGRAM_CLICK', { target: href });
      } else if (href.includes('linkedin.com')) {
        sendTelemetry('LINKEDIN_CLICK', { target: href });
      } else if (
        href.includes('contact.vcf') ||
        download !== null ||
        ariaLabel.toLowerCase().includes('contact') ||
        text.toLowerCase().includes('save contact')
      ) {
        sendTelemetry('SAVE_CONTACT', { target: href });
      } else if (href.startsWith('http://') || href.startsWith('https://')) {
        // External website links
        if (typeof window !== 'undefined' && !href.includes(window.location.host)) {
          sendTelemetry('WEBSITE_CLICK', { target: href });
        }
      }
    };

    document.addEventListener('click', handleClick, { capture: true });

    return () => {
      document.removeEventListener('click', handleClick, { capture: true });
    };
  }, [cardToken, eventType, metadata]);

  return null;
}
