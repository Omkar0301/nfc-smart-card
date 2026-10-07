import type { TemplateProps } from '../../types/template.js';
import {
  Avatar,
  SectionHeading,
  Shell,
  normalizeUrl,
  socialLinks,
  text,
  type Palette,
} from '../helpers.js';

const palette: Palette = {
  surface: '#ffffff',
  text: '#111827',
  muted: '#6b7280',
  accent: '#111827',
  border: '#e5e7eb',
};

/**
 * Business — Minimal
 * Text-first, monochrome, no heavy imagery, generous whitespace.
 */
export function BusinessMinimal({ profile }: TemplateProps) {
  const { data } = profile;
  const name = text(data, 'name') ?? 'Your Name';
  const designation = text(data, 'designation');
  const company = text(data, 'company');
  const bio = text(data, 'bio');
  const address = text(data, 'address');
  const maps = normalizeUrl(text(data, 'google_maps'));
  const phone = text(data, 'phone');
  const email = text(data, 'email');
  const whatsapp = text(data, 'whatsapp');
  const socials = socialLinks(data).filter((s) => s.key !== 'google_maps');

  const rows: Array<{ label: string; value: string; href?: string }> = [];
  if (phone)
    rows.push({ label: 'Phone', value: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` });
  if (whatsapp)
    rows.push({
      label: 'WhatsApp',
      value: whatsapp,
      href: `https://wa.me/${whatsapp.replace(/\D/g, '')}`,
    });
  if (email) rows.push({ label: 'Email', value: email, href: `mailto:${email}` });
  if (address) rows.push({ label: 'Address', value: address });

  return (
    <Shell background="#fafafa">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <Avatar name={name} src={undefined} size={56} palette={palette} rounded="squircle" />
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: palette.text,
            }}
          >
            {name}
          </h1>
          {[designation, company].filter(Boolean).length > 0 ? (
            <p style={{ margin: '4px 0 0', fontSize: 14, color: palette.muted }}>
              {[designation, company].filter(Boolean).join(' — ')}
            </p>
          ) : null}
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: `1px solid ${palette.border}`, margin: '24px 0' }} />

      {bio ? <p style={{ margin: '0 0 28px', fontSize: 15, color: palette.text }}>{bio}</p> : null}

      {rows.length > 0 ? (
        <div style={{ marginBottom: 28 }}>
          <SectionHeading palette={palette}>Details</SectionHeading>
          <dl style={{ margin: 0 }}>
            {rows.map((r) => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: `1px solid ${palette.border}`,
                }}
              >
                <dt style={{ width: 92, flexShrink: 0, fontSize: 13, color: palette.muted }}>
                  {r.label}
                </dt>
                <dd
                  style={{ margin: 0, fontSize: 14, color: palette.text, wordBreak: 'break-word' }}
                >
                  {r.href ? (
                    <a href={r.href} style={{ color: palette.text }}>
                      {r.value}
                    </a>
                  ) : (
                    r.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {socials.length > 0 ? (
        <div style={{ marginBottom: 28 }}>
          <SectionHeading palette={palette}>Links</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.href}
                style={{
                  minHeight: 44,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: 14,
                  color: palette.text,
                }}
              >
                {s.label} →
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {maps ? (
        <a
          href={maps}
          style={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            fontSize: 14,
            color: palette.muted,
          }}
        >
          View on Google Maps →
        </a>
      ) : null}
    </Shell>
  );
}
