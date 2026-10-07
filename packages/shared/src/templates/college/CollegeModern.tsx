import type { TemplateProps } from '../../types/template.js';
import {
  ActionButton,
  Avatar,
  Chip,
  LinkChip,
  SectionHeading,
  contactLinks,
  list,
  photoUrl,
  socialLinks,
  text,
  type Palette,
} from '../helpers.js';

const palette: Palette = {
  surface: '#eef2ff',
  text: '#1e1b4b',
  muted: '#6366f1',
  accent: '#6366f1',
  border: '#c7d2fe',
};

/**
 * College — Modern
 * Colourful card-style layout, circular photo, social links as chips.
 */
export function CollegeModern({ profile }: TemplateProps) {
  const { data } = profile;
  const name = text(data, 'name') ?? 'Student Name';
  const college = text(data, 'college');
  const course = text(data, 'course');
  const semester = text(data, 'semester');
  const about = text(data, 'about');
  const skills = list(data, 'skills');
  const contacts = contactLinks(data);
  const socials = socialLinks(data);

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '28px 16px 56px',
        background: 'linear-gradient(180deg, #eef2ff 0%, #fdf2f8 100%)',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          maxWidth: 440,
          margin: '0 auto',
          padding: 24,
          borderRadius: 20,
          boxSizing: 'border-box',
          background: '#ffffff',
          border: `1px solid ${palette.border}`,
          boxShadow: '0 12px 32px rgba(99,102,241,0.12)',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Avatar name={name} src={photoUrl(data)} size={110} palette={palette} />
        </div>
        <h1 style={{ margin: '16px 0 4px', fontSize: 25, fontWeight: 800, color: palette.text }}>
          {name}
        </h1>
        {[course, semester].filter(Boolean).length > 0 ? (
          <p style={{ margin: 0, fontSize: 14, color: palette.muted }}>
            {[course, semester].filter(Boolean).join(' · ')}
          </p>
        ) : null}
        {college ? (
          <p style={{ margin: '2px 0 0', fontSize: 14, color: palette.text }}>{college}</p>
        ) : null}

        {contacts.length > 0 ? (
          <div
            style={{
              display: 'flex',
              gap: 10,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginTop: 18,
            }}
          >
            {contacts.map((c) => (
              <ActionButton
                key={c.key}
                href={c.href}
                icon={c.icon}
                label={c.label === 'phone' ? 'Call' : c.label === 'whatsapp' ? 'WhatsApp' : 'Email'}
                palette={palette}
                filled={c.key === 'phone' || c.key === 'student_email'}
              />
            ))}
          </div>
        ) : null}

        {about ? <p style={{ marginTop: 20, fontSize: 15, color: palette.text }}>{about}</p> : null}

        {socials.length > 0 ? (
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <SectionHeading palette={palette}>Links</SectionHeading>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {socials.map(({ key, ...rest }) => (
                <LinkChip key={key} {...rest} palette={palette} />
              ))}
            </div>
          </div>
        ) : null}

        {skills.length > 0 ? (
          <div style={{ marginTop: 24, textAlign: 'left' }}>
            <SectionHeading palette={palette}>Skills</SectionHeading>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {skills.map((s) => (
                <Chip key={s} palette={palette}>
                  {s}
                </Chip>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
