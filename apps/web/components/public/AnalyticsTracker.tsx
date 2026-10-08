'use client';

import { useEffect, useRef } from 'react';

interface AnalyticsTrackerProps {
  cardToken: string;
  eventType?: string;
  metadata?: Record<string, unknown>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Client Component that asynchronously records a public profile interaction
 * (e.g., PROFILE_VIEW) on mount without blocking page render (F-010 / F-014).
 */
export function AnalyticsTracker({
  cardToken,
  eventType = 'PROFILE_VIEW',
  metadata,
}: AnalyticsTrackerProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current || !cardToken) return;
    hasFired.current = true;

    const payload = JSON.stringify({
      cardToken,
      eventType,
      metadata: {
        ...metadata,
        referrer: typeof document !== 'undefined' ? document.referrer : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        timestamp: new Date().toISOString(),
      },
    });

    try {
      // Prefer sendBeacon for non-blocking telemetry if available
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const beaconSent = navigator.sendBeacon(
          `${API_URL}/analytics/events`,
          new Blob([payload], { type: 'application/json' })
        );
        if (beaconSent) return;
      }

      // Fallback to fetch with keepalive
      void fetch(`${API_URL}/analytics/events`, {
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
  }, [cardToken, eventType, metadata]);

  return null;
}
