import Link from 'next/link';

export default function CustomerDashboardPage() {
  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: '0 20px', color: '#f8fafc' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8 }}>Customer Portal</h1>
      <p style={{ color: '#94a3b8', marginBottom: 32 }}>
        Manage your smart card profile, visibility, and account settings.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        <Link
          href="/portal/profile"
          style={{
            display: 'block',
            padding: 24,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            textDecoration: 'none',
            color: '#f8fafc',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>📇</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 6 }}>
            Edit Card Profile
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
            Customize your card data, manage field visibility, and publish live changes.
          </p>
        </Link>

        <Link
          href="/portal/templates"
          style={{
            display: 'block',
            padding: 24,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            textDecoration: 'none',
            color: '#f8fafc',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>🎨</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 6 }}>
            Choose a Template
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
            Preview and switch the design of your public profile without changing your card.
          </p>
        </Link>

        <Link
          href="/portal/settings"
          style={{
            display: 'block',
            padding: 24,
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 14,
            textDecoration: 'none',
            color: '#f8fafc',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>⚙️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 6 }}>Account Settings</h2>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: 0 }}>
            Set up secondary recovery email and manage security preferences.
          </p>
        </Link>
      </div>
    </div>
  );
}
