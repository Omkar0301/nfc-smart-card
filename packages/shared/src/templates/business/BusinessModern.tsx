import type { TemplateProps } from '../../types/template.js';
import {
  ActionButton,
  Avatar,
  Chip,
  IconLink,
  SectionHeading,
  Shell,
  contactLinks,
  list,
  photoUrl,
  socialLinks,
  text,
  type Palette,
} from '../helpers.js';

const palette: Palette = {
  surface: '#f1f5f9',
  text: '#0f172a',
  muted: '#64748b',
  accent: '#4f46e5',
  border: '#e2e8f0',
};

/**
 * Business — Modern
 * Clean card with a large photo, accent bar, icon social links, and services.
 */
export function BusinessModern({ profile }: TemplateProps) {
  const { data, fieldSchema } = profile;
  const name = text(data, 'name') ?? 'Your Name';
  const designation = text(data, 'designation');
  const company = text(data, 'company');
  const bio = text(data, 'bio');
  const address = text(data, 'address');
  const subtitle = [designation, company].filter(Boolean).join(' · ');
  const contacts = contactLinks(data);
  const socials = socialLinks(data);
  const services = list(data, 'services');

  void fieldSchema; // schema reserved for label lookups by richer templates

  return (
    <Shell background="#ffffff" accent={palette.accent}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Avatar name={name} src={photoUrl(data)} size={112} palette={palette} />
        <h1 style={{ margin: '16px 0 4px', fontSize: 26, fontWeight: 800, color: palette.text }}>
          {name}
        </h1>
        {subtitle ? (
          <p style={{ margin: 0, fontSize: 15, color: palette.muted }}>{subtitle}</p>
        ) : null}
      </div>

      {contacts.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'center',
            marginTop: 20,
          }}
        >
          {contacts.map((c) => (
            <ActionButton
              key={c.key}
              href={c.href}
              icon={c.icon}
              label={c.label === 'phone' ? 'Call' : c.label === 'whatsapp' ? 'WhatsApp' : 'Email'}
              palette={palette}
              filled={c.key === 'phone'}
            />
          ))}
        </div>
      ) : null}

      {bio ? (
        <p style={{ marginTop: 22, fontSize: 15, color: palette.text, textAlign: 'center' }}>
          {bio}
        </p>
      ) : null}

      {socials.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <SectionHeading palette={palette}>Connect</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {socials.map(({ key, ...rest }) => (
              <IconLink key={key} {...rest} palette={palette} />
            ))}
          </div>
        </div>
      ) : null}

      {services.length > 0 ? (
        <div style={{ marginTop: 24 }}>
          <SectionHeading palette={palette}>Services</SectionHeading>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {services.map((s) => (
              <Chip key={s} palette={palette}>
                {s}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}

      {address ? (
        <div style={{ marginTop: 24 }}>
          <SectionHeading palette={palette}>Location</SectionHeading>
          <p style={{ margin: 0, fontSize: 14, color: palette.muted, whiteSpace: 'pre-line' }}>
            {address}
          </p>
        </div>
      ) : null}
    </Shell>
  );
}
