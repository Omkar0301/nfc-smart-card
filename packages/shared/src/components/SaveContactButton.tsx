import type { CSSProperties, ReactElement } from 'react';

export interface SaveContactButtonProps {
  /** Target URL for downloading the .vcf contact card */
  href: string;
  /** Button label text; defaults to "Save Contact" */
  label?: string;
  /** Leading icon; defaults to 💾 */
  icon?: string;
  /** Whether the button stretches to 100% width */
  fullWidth?: boolean;
  /** Optional visual palette override */
  palette?: {
    surface?: string;
    text?: string;
    accent?: string;
    border?: string;
    muted?: string;
  };
  /** Whether button has a filled background */
  filled?: boolean;
  /** Additional custom inline styles */
  style?: CSSProperties;
}

/**
 * Universal Save Contact CTA button (F-013).
 * Designed as a pure RSC-safe component for public profile templates and portal preview.
 * Encodes minimum 44px touch target for mobile accessibility.
 */
export function SaveContactButton({
  href,
  label = 'Save Contact',
  icon = '💾',
  fullWidth = true,
  palette,
  filled = true,
  style,
}: SaveContactButtonProps): ReactElement {
  const accentColor = palette?.accent ?? '#4f46e5';
  const textColor = palette?.text ?? '#ffffff';
  const borderColor = palette?.border ?? 'transparent';

  const defaultStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 46,
    width: fullWidth ? '100%' : undefined,
    padding: '12px 24px',
    borderRadius: 999,
    fontSize: 15,
    fontWeight: 700,
    textDecoration: 'none',
    lineHeight: 1.2,
    boxSizing: 'border-box',
    cursor: 'pointer',
    color: filled ? '#ffffff' : textColor,
    background: filled ? accentColor : 'transparent',
    border: filled ? `1px solid ${accentColor}` : `1px solid ${borderColor}`,
    boxShadow: filled ? '0 4px 14px rgba(0, 0, 0, 0.15)' : 'none',
    transition: 'transform 0.15s ease, filter 0.15s ease',
  };

  return (
    <a href={href} download role="button" aria-label={label} style={{ ...defaultStyle, ...style }}>
      {icon ? (
        <span aria-hidden="true" style={{ fontSize: 17 }}>
          {icon}
        </span>
      ) : null}
      <span>{label}</span>
    </a>
  );
}
