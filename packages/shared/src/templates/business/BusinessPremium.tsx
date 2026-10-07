import type { TemplateProps } from '../../types/template.js';
import {
  ActionButton,
  Avatar,
  Chip,
  IconLink,
  SectionHeading,
  contactLinks,
  list,
  photoUrl,
  socialLinks,
  text,
  type Palette,
} from '../helpers.js';

const palette: Palette = {
  surface: 'rgba(255,255,255,0.08)',
  text: '#f8fafc',
  muted: '#cbd5e1',
  accent: '#f59e0b',
  border: 'rgba(255,255,255,0.18)',
};

/**
 * Business — Premium
 * Dark gradient backdrop, elevated card layout, dominant save-contact CTA.
 */
export function BusinessPremium({ profile, card }: TemplateProps) {
  const { data } = profile;
  const name = text(data, 'name') ?? 'Your Name';
  const designation = text(data, 'designation');
  const company = text(data, 'company');
  const bio = text(data, 'bio');
  const services = list(data, 'services');
  const contacts = contactLinks(data).filter((c) => c.key !== 'email');
  const socials = socialLinks(data);

  const saveContact = card.saveContactHref;
  const primaryContact = contacts[0];

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '32px 16px 56px',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: 28,
          borderRadius: 24,
          boxSizing: 'border-box',
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
          backdropFilter: 'blur(6px)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Avatar name={name} src={photoUrl(data)} size={128} palette={palette} />
        </div>

        <h1 style={{ margin: '20px 0 6px', fontSize: 28, fontWeight: 800, color: palette.text }}>
          {name}
        </h1>
        {designation ? (
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: palette.accent }}>
            {designation}
          </p>
        ) : null}
        {company ? (
          <p style={{ margin: '2px 0 0', fontSize: 14, color: palette.muted }}>{company}</p>
        ) : null}

        {saveContact ? (
          <div style={{ marginTop: 22 }}>
            <ActionButton
              href={saveContact}
              icon="⬇️"
              label="Save Contact"
              palette={palette}
              filled
              full
            />
          </div>
        ) : primaryContact ? (
          <div style={{ marginTop: 22 }}>
            <ActionButton
              href={primaryContact.href}
              icon={primaryContact.icon}
              label={`Contact ${name.split(' ')[0]}`}
              palette={palette}
              filled
              full
            />
          </div>
        ) : null}

        {contacts.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              marginTop: 14,
              flexWrap: 'wrap',
            }}
          >
            {contacts.map((c) => (
              <ActionButton
                key={c.key}
                href={c.href}
                icon={c.icon}
                label={c.label === 'whatsapp' ? 'WhatsApp' : 'Call'}
                palette={palette}
              />
            ))}
          </div>
        ) : null}

        {bio ? (
          <p style={{ marginTop: 24, fontSize: 15, color: palette.muted, textAlign: 'left' }}>
            {bio}
          </p>
        ) : null}

        {services.length > 0 ? (
          <div style={{ marginTop: 24, textAlign: 'left' }}>
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

        {socials.length > 0 ? (
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <SectionHeading palette={palette}>Connect</SectionHeading>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {socials.map(({ key, ...rest }) => (
                <IconLink key={key} {...rest} palette={palette} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
