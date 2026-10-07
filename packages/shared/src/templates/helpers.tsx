/* eslint-disable @next/next/no-img-element -- templates must render arbitrary customer photo URLs without a Next.js dependency */
import type { CSSProperties, ReactNode } from 'react';
import type { FieldSchema } from '../types/fieldSchema.js';
import type { PublicProfileData } from '../types/template.js';

/**
 * Shared, framework-light building blocks for the hand-built MVP templates
 * (F-009). Everything here is pure and side-effect free so the templates can
 * render both as Next.js Server Components and client-side in the portal
 * preview.
 */

/* ------------------------------------------------------------------ */
/* Value helpers                                                       */
/* ------------------------------------------------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Non-empty trimmed string, or undefined. */
export function text(data: PublicProfileData, key: string): string | undefined {
  const value = data[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Non-empty string array (also tolerates a single string / comma list). */
export function list(data: PublicProfileData, key: string): string[] {
  const value = data[key];
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export function labelFor(schema: FieldSchema | undefined, key: string): string {
  return schema?.find((f) => f.key === key)?.label ?? key;
}

export function initialOf(name: string | undefined): string {
  if (!name) return '#';
  const match = name.trim().match(/[A-Za-z0-9]/);
  return match ? match[0].toUpperCase() : '#';
}

/* ------------------------------------------------------------------ */
/* Link helpers                                                        */
/* ------------------------------------------------------------------ */

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function waHref(phone: string): string {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
}

export function mailHref(email: string): string {
  return `mailto:${email}`;
}

/** Guarantees an http(s) scheme for user-supplied links. */
export function normalizeUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) {
    return trimmed.startsWith('//') ? `https:${trimmed}` : trimmed;
  }
  if (EMAIL_RE.test(trimmed)) return `mailto:${trimmed}`;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/* ------------------------------------------------------------------ */
/* Contact / social derivation                                         */
/* ------------------------------------------------------------------ */

export interface LinkEntry {
  key: string;
  label: string;
  icon: string;
  href: string;
}

const CONTACT_ICONS: Record<string, string> = {
  phone: '📞',
  whatsapp: '💬',
  email: '✉️',
  student_email: '✉️',
};

const SOCIAL_ICONS: Record<string, string> = {
  website: '🌐',
  portfolio: '🎨',
  instagram: '📸',
  linkedin: '💼',
  facebook: '👥',
  youtube: '▶️',
  twitter: '🐦',
  x: '🐦',
  github: '💻',
  google_maps: '📍',
};

const SOCIAL_LABELS: Record<string, string> = {
  website: 'Website',
  portfolio: 'Portfolio',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  youtube: 'YouTube',
  twitter: 'Twitter',
  x: 'X',
  github: 'GitHub',
  google_maps: 'Google Maps',
};

/** Actionable contact entries (call / whatsapp / email) in a stable order. */
export function contactLinks(data: PublicProfileData): LinkEntry[] {
  const order = ['phone', 'whatsapp', 'email', 'student_email'];
  const out: LinkEntry[] = [];
  for (const key of order) {
    const value = text(data, key);
    if (!value) continue;
    if (!(key in CONTACT_ICONS)) continue;
    let href: string;
    if (key === 'email' || key === 'student_email') href = mailHref(value);
    else if (key === 'whatsapp') href = waHref(value);
    else href = telHref(value);
    out.push({
      key,
      label: key === 'student_email' ? 'Email' : key,
      icon: CONTACT_ICONS[key],
      href,
    });
  }
  return out;
}

/** Social / web link entries, driven by what is actually present in `data`. */
export function socialLinks(data: PublicProfileData): LinkEntry[] {
  const out: LinkEntry[] = [];
  for (const [key, icon] of Object.entries(SOCIAL_ICONS)) {
    const value = text(data, key);
    const href = normalizeUrl(value);
    if (!href) continue;
    out.push({ key, label: SOCIAL_LABELS[key] ?? key, icon, href });
  }
  return out;
}

export function photoUrl(data: PublicProfileData): string | undefined {
  return normalizeUrl(text(data, 'photo'));
}

/* ------------------------------------------------------------------ */
/* Presentational primitives (inline-styled for RSC safety)            */
/* ------------------------------------------------------------------ */

interface Palette {
  surface: string;
  text: string;
  muted: string;
  accent: string;
  border: string;
}

export function Avatar({
  name,
  src,
  size = 96,
  palette,
  rounded = 'circle',
}: {
  name?: string;
  src?: string;
  size?: number;
  palette: Palette;
  rounded?: 'circle' | 'squircle';
}) {
  const radius = rounded === 'circle' ? '50%' : Math.round(size * 0.22);
  const base: CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    objectFit: 'cover',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontSize: Math.round(size * 0.4),
    fontWeight: 700,
    color: '#ffffff',
    background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}99)`,
    border: `2px solid ${palette.border}`,
  };

  if (src) {
    return <img src={src} alt={name ?? 'Profile photo'} style={base} />;
  }
  return <div style={base}>{initialOf(name)}</div>;
}

export function ActionButton({
  href,
  icon,
  label,
  palette,
  filled = false,
  full = false,
}: {
  href: string;
  icon?: string;
  label: string;
  palette: Palette;
  filled?: boolean;
  full?: boolean;
}) {
  const style: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    padding: '10px 18px',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: 'none',
    lineHeight: 1.2,
    width: full ? '100%' : undefined,
    boxSizing: 'border-box',
    color: filled ? '#ffffff' : palette.text,
    background: filled ? palette.accent : 'transparent',
    border: filled ? `1px solid ${palette.accent}` : `1px solid ${palette.border}`,
  };
  return (
    <a href={href} style={style}>
      {icon ? <span aria-hidden>{icon}</span> : null}
      <span>{label}</span>
    </a>
  );
}

export function IconLink({ href, icon, label, palette }: LinkEntry & { palette: Palette }) {
  return (
    <a
      href={href}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 999,
        fontSize: 18,
        textDecoration: 'none',
        color: palette.text,
        background: palette.surface,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span aria-hidden>{icon}</span>
    </a>
  );
}

export function LinkChip({ href, icon, label, palette }: LinkEntry & { palette: Palette }) {
  return (
    <a
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 44,
        padding: '8px 16px',
        borderRadius: 999,
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none',
        color: palette.text,
        background: palette.surface,
        border: `1px solid ${palette.border}`,
      }}
    >
      <span aria-hidden>{icon}</span>
      <span>{label}</span>
    </a>
  );
}

export function Chip({ children, palette }: { children: ReactNode; palette: Palette }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 12px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        color: palette.text,
        background: palette.surface,
        border: `1px solid ${palette.border}`,
      }}
    >
      {children}
    </span>
  );
}

export function SectionHeading({ children, palette }: { children: ReactNode; palette: Palette }) {
  return (
    <h2
      style={{
        margin: '0 0 10px',
        fontSize: 12,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        fontWeight: 700,
        color: palette.muted,
      }}
    >
      {children}
    </h2>
  );
}

export function Shell({
  children,
  background,
  accent,
}: {
  children: ReactNode;
  background: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        minHeight: '100%',
        padding: '0 0 48px',
        background,
        color: 'inherit',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        lineHeight: 1.5,
        WebkitFontSmoothing: 'antialiased',
        ...(accent ? { borderTop: `6px solid ${accent}` } : {}),
      }}
    >
      <div
        style={{ maxWidth: 480, margin: '0 auto', padding: '24px 20px 0', boxSizing: 'border-box' }}
      >
        {children}
      </div>
    </div>
  );
}

export type { Palette };
