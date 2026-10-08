import type { Metadata } from 'next';
import { CardStatus, type PublicProfileResponse } from '@nfc-card/shared';
import { TemplateRenderer } from '@nfc-card/shared/templates';
import {
  AvailableView,
  DeactivatedView,
  DraftView,
  NotFoundView,
  PausedView,
  SuspendedView,
} from '../../../../components/public/StatusViews';
import { AnalyticsTracker } from '../../../../components/public/AnalyticsTracker';

interface PageProps {
  params: Promise<{ type: string; token: string }>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? 'localhost:3000';

/**
 * Fetch public profile with Next.js Data Cache tag `profile-${token}`.
 * Cache is purged instantly when the profile or card status is updated via Express.
 */
async function fetchPublicProfile(token: string): Promise<ApiResponse<PublicProfileResponse>> {
  try {
    const res = await fetch(`${API_URL}/profile/public/${token}`, {
      next: { tags: [`profile-${token}`] },
    });
    const body = await res.json();
    return {
      success: res.ok,
      data: body?.data,
      error: body?.error,
    };
  } catch {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to API server.',
      },
    };
  }
}

/**
 * Dynamic Open Graph Metadata generator for social media link previews
 * (WhatsApp, LinkedIn, Twitter/X, iMessage, etc.) (F-010 / PRD §14, §25).
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, token } = await params;
  const res = await fetchPublicProfile(token);

  if (!res.success || !res.data) {
    return {
      title: 'Digital Card | NFC Platform',
      description: 'NFC Digital Card',
      robots: { index: false, follow: false },
    };
  }

  const { card, cardType, profile } = res.data;

  // Don't index non-active cards or drafts
  if (card.status !== CardStatus.ACTIVE || !profile || profile.status !== 'published') {
    return {
      title: `${cardType.name || 'Digital Card'} | NFC Platform`,
      description: 'This digital card profile is currently unavailable.',
      robots: { index: false, follow: false },
    };
  }

  const data = (profile.data as Record<string, any>) || {};
  const name =
    typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Digital Profile';
  const designation = typeof data.designation === 'string' ? data.designation.trim() : '';
  const company = typeof data.company === 'string' ? data.company.trim() : '';
  const bio = typeof data.bio === 'string' ? data.bio.trim() : '';
  const photo = typeof data.photo === 'string' && data.photo.trim() ? data.photo.trim() : undefined;

  const subtitle = [designation, company].filter(Boolean).join(' · ');
  const pageTitle = subtitle
    ? `${name} — ${subtitle} | ${cardType.name}`
    : `${name} | ${cardType.name}`;
  const pageDescription =
    bio ||
    (subtitle
      ? `Connect with ${name}, ${subtitle}.`
      : `Connect with ${name} via digital NFC card.`);

  const protocol = DOMAIN.includes('localhost') ? 'http' : 'https';
  const pageUrl = `${protocol}://${DOMAIN}/p/${type}/${token}`;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: `${name}${subtitle ? ` — ${subtitle}` : ''}`,
      description: pageDescription,
      images: photo ? [{ url: photo, alt: name }] : [{ url: '/default-og.png', alt: name }],
      url: pageUrl,
      type: 'profile',
      siteName: 'NFC Digital Card Platform',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name}${subtitle ? ` — ${subtitle}` : ''}`,
      description: pageDescription,
      images: photo ? [photo] : ['/default-og.png'],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

/**
 * Next.js App Router React Server Component for the public profile route (F-010).
 * Handles token resolution, card lifecycle gates, server-side visibility,
 * and high-performance template rendering.
 */
export default async function PublicProfilePage({ params }: PageProps) {
  const { type, token } = await params;
  const res = await fetchPublicProfile(token);

  // 1. Handle error cases from API
  if (!res.success) {
    if (res.error?.code === 'CARD_NOT_AVAILABLE') {
      const cardTypeName = res.error?.details?.cardType?.name;
      return <AvailableView token={token} cardTypeName={cardTypeName} />;
    }
    return <NotFoundView />;
  }

  const { card, cardType, profile, profileStatus } = res.data!;

  // 2. Card type mismatch in URL -> Render 404 Status Component (PRD §Validation Cases)
  if (cardType.slug.toLowerCase() !== type.toLowerCase()) {
    return (
      <NotFoundView
        title="Card Not Found"
        description="The card type specified in the URL does not match this card."
      />
    );
  }

  // 3. Card status gates rendering (PRD §23, zero PII leaked)
  if (card.status === CardStatus.AVAILABLE) {
    return <AvailableView token={token} cardTypeName={cardType.name} />;
  }

  if (card.status === CardStatus.PAUSED) {
    return <PausedView />;
  }

  if (card.status === CardStatus.SUSPENDED) {
    return <SuspendedView />;
  }

  if (card.status === CardStatus.DEACTIVATED) {
    return <DeactivatedView />;
  }

  // ASSIGNED cards or unpublished drafts
  if (
    card.status === CardStatus.ASSIGNED ||
    profileStatus === 'draft' ||
    !profile ||
    profile.status !== 'published'
  ) {
    return <DraftView />;
  }

  // 4. Card is ACTIVE and profile is published -> Render the selected template
  const templateSlug =
    profile.template?.slug ||
    (cardType.slug === 'college' ? 'college-academic' : 'business-modern');

  const protocol = DOMAIN.includes('localhost') ? 'http' : 'https';
  const profileUrl = `${protocol}://${DOMAIN}/p/${cardType.slug}/${card.publicToken}`;

  return (
    <>
      <AnalyticsTracker cardToken={token} eventType="PROFILE_VIEW" />
      <TemplateRenderer
        slug={templateSlug}
        profile={{
          data: profile.data,
          fieldSchema: cardType.fieldSchema ?? [],
        }}
        card={{
          publicToken: card.publicToken,
          cardNumber: card.cardNumber,
          profileUrl,
        }}
        configuration={profile.template?.configuration ?? {}}
      />
    </>
  );
}
