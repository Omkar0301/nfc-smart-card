import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';

const REVALIDATE_SECRET = process.env.REVALIDATE_SECRET;

/**
 * Cache invalidation webhook used by the Express API (F-009 / F-010).
 * POST { tag: "profile-<publicToken>" } with the x-revalidate-secret header.
 */
export async function POST(request: Request) {
  if (REVALIDATE_SECRET && request.headers.get('x-revalidate-secret') !== REVALIDATE_SECRET) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid revalidation secret.' } },
      { status: 401 }
    );
  }

  let tag: string | undefined;
  try {
    const body = (await request.json()) as { tag?: string };
    tag = body?.tag;
  } catch {
    tag = undefined;
  }

  if (!tag || typeof tag !== 'string') {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'A tag is required.' } },
      { status: 400 }
    );
  }

  revalidateTag(tag);

  return NextResponse.json({ success: true, data: { revalidated: true, tag } });
}
