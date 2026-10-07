import type { TemplateProps } from '../../types/template.js';
import {
  ActionButton,
  Avatar,
  SectionHeading,
  Shell,
  contactLinks,
  list,
  photoUrl,
  text,
  type Palette,
} from '../helpers.js';

const palette: Palette = {
  surface: '#f8fafc',
  text: '#1e293b',
  muted: '#64748b',
  accent: '#0f766e',
  border: '#e2e8f0',
};

/**
 * College — Academic
 * Formal institution-style layout with clean skills and achievements lists.
 */
export function CollegeAcademic({ profile }: TemplateProps) {
  const { data } = profile;
  const name = text(data, 'name') ?? 'Student Name';
  const college = text(data, 'college');
  const course = text(data, 'course');
  const branch = text(data, 'branch');
  const semester = text(data, 'semester');
  const about = text(data, 'about');
  const skills = list(data, 'skills');
  const achievements = list(data, 'achievements');
  const contacts = contactLinks(data);

  const academicLine = [course, branch, semester].filter(Boolean).join(' • ');

  return (
    <Shell background="#ffffff">
      <div
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'center',
          paddingBottom: 18,
          borderBottom: `2px solid ${palette.accent}`,
        }}
      >
        <Avatar name={name} src={photoUrl(data)} size={88} palette={palette} rounded="squircle" />
        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, color: palette.text }}>{name}</h1>
          {college ? (
            <p style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 600, color: palette.accent }}>
              {college}
            </p>
          ) : null}
          {academicLine ? (
            <p style={{ margin: '2px 0 0', fontSize: 14, color: palette.muted }}>{academicLine}</p>
          ) : null}
        </div>
      </div>

      {about ? <p style={{ marginTop: 20, fontSize: 15, color: palette.text }}>{about}</p> : null}

      {contacts.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          {contacts.map((c) => (
            <ActionButton
              key={c.key}
              href={c.href}
              icon={c.icon}
              label={c.label === 'phone' ? 'Call' : c.label === 'whatsapp' ? 'WhatsApp' : 'Email'}
              palette={palette}
            />
          ))}
        </div>
      ) : null}

      {skills.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <SectionHeading palette={palette}>Skills</SectionHeading>
          <ul style={{ margin: 0, paddingLeft: 20, color: palette.text, fontSize: 15 }}>
            {skills.map((s) => (
              <li key={s} style={{ marginBottom: 4 }}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {achievements.length > 0 ? (
        <div style={{ marginTop: 28 }}>
          <SectionHeading palette={palette}>Achievements</SectionHeading>
          <ul style={{ margin: 0, paddingLeft: 20, color: palette.text, fontSize: 15 }}>
            {achievements.map((a) => (
              <li key={a} style={{ marginBottom: 4 }}>
                {a}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Shell>
  );
}
