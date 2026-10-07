import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Triggers Next.js Data Cache invalidation for a public profile tag
 * (`profile-${publicToken}`) via the web app's `/api/revalidate` route handler.
 *
 * Best-effort: cache invalidation must never fail the write that triggered it,
 * and it is a no-op when `NEXT_REVALIDATE_URL` is not configured.
 */
export async function revalidateProfileTag(publicToken: string | null | undefined): Promise<void> {
  if (!publicToken) return;

  const url = config.NEXT_REVALIDATE_URL;
  if (!url) return;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.NEXT_REVALIDATE_SECRET
          ? { 'x-revalidate-secret': config.NEXT_REVALIDATE_SECRET }
          : {}),
      },
      body: JSON.stringify({ tag: `profile-${publicToken}` }),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      logger.warn(
        { status: res.status, tag: `profile-${publicToken}` },
        '[cache] revalidation request rejected'
      );
    }
  } catch (err) {
    logger.warn({ err, tag: `profile-${publicToken}` }, '[cache] revalidation request failed');
  }
}
