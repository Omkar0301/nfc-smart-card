import type { TemplateProps } from '../../types/template.js';
import {
  ActionButton,
  Avatar,
  Chip,
  IconLink,
  SectionHeading,
  contactLinks,
  list,
  normalizeUrl,
  photoUrl,
  socialLinks,
  text,
  type Palette,
} from '../helpers.js';

const palette: Palette = {
  surface: '#fff7ed',
  text: '#431407',
  muted: '#9a3412',
  accent: '#f97316',
  border: '#fed7aa',
};

/**
 * College — Creative
 * Portfolio-forward, bold typography, skills as tags, portfolio CTA dominant.
 */
export function CollegeCreative({ profile }: TemplateProps) {
  const { data } = profile;
  const name = text(data, 'name') ?? 'Student Name';
  const college = text(data, 'college');
  const course = text(data, 'course');
  const about = text(data, 'about');
  const skills = list(data, 'skills');
  const achievements = list(data, 'achievements');
  const portfolio = normalizeUrl(text(data, 'portfolio'));
  const contacts = contactLinks(data).filter((c) => c.key !== 'email');
  const socials = socialLinks(data).filter((s) => s.key !== 'portfolio');

  return (
    <div
      style={{
        minHeight: '100%',
        padding: '0 0 56px',
        background: '#fffbf5',
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
        lineHeight: 1.5,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #fb923c 0%, #f43f5e 100%)',
          padding: '32px 20px 28px',
          color: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: 440,
            margin: '0 auto',
            display: 'flex',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <Avatar name={name} src={photoUrl(data)} size={84} palette={palette} />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                margin: 0,
                fontSize: 30,
                fontWeight: 900,
                letterSpacing: '-0.03em',
                color: '#ffffff',
              }}
            >
              {name}
            </h1>
            {[course, college].filter(Boolean).length > 0 ? (
              <p style={{ margin: '4px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>
                {[course, college].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div
        style={{ maxWidth: 440, margin: '0 auto', padding: '24px 20px 0', boxSizing: 'border-box' }}
      >
        {portfolio ? (
          <ActionButton
            href={portfolio}
            icon="🎨"
            label="View Portfolio"
            palette={palette}
            filled
            full
          />
        ) : null}

        {contacts.length > 0 ? (
          <div
            style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: portfolio ? 12 : 0 }}
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

        {about ? <p style={{ marginTop: 22, fontSize: 16, color: palette.text }}>{about}</p> : null}

        {skills.length > 0 ? (
          <div style={{ marginTop: 26 }}>
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

        {achievements.length > 0 ? (
          <div style={{ marginTop: 26 }}>
            <SectionHeading palette={palette}>Achievements</SectionHeading>
            <ul style={{ margin: 0, paddingLeft: 18, color: palette.text, fontSize: 15 }}>
              {achievements.map((a) => (
                <li key={a} style={{ marginBottom: 4 }}>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {socials.length > 0 ? (
          <div style={{ marginTop: 26 }}>
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
