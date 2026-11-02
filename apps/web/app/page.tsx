import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'NFC Digital Smart Card Platform',
  description:
    'Manage, share, and track your NFC smart business cards and dynamic digital profiles in one place.',
};

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0b0f19 0%, #0f172a 100%)',
        color: '#f8fafc',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header / Nav */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: 1200,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.5rem' }}>⚡</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            NFC Card Platform
          </span>
        </div>
        <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Link
            href="/portal/login"
            style={{
              padding: '8px 16px',
              color: '#cbd5e1',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 500,
              borderRadius: 8,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            Sign In
          </Link>
          <Link
            href="/portal/login"
            style={{
              padding: '8px 18px',
              background: '#6366f1',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '0.9rem',
              fontWeight: 600,
              borderRadius: 8,
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            Customer Portal
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '60px 24px',
          maxWidth: 900,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: 9999,
            fontSize: '0.82rem',
            color: '#a5b4fc',
            fontWeight: 600,
            marginBottom: 24,
          }}
        >
          <span>✨</span> Smart NFC Networking & Digital Profiles
        </div>

        <h1
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            margin: '0 0 20px 0',
            background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Share your identity in a single contactless tap
        </h1>

        <p
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#94a3b8',
            lineHeight: 1.6,
            maxWidth: 640,
            margin: '0 0 36px 0',
          }}
        >
          Empower your connections with custom NFC smart cards, instant vCard contact downloads,
          field-level privacy controls, and real-time interaction telemetry.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 16,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <Link
            href="/portal/login"
            style={{
              padding: '14px 28px',
              background: '#6366f1',
              color: '#ffffff',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 10,
              minHeight: 48,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.35)',
            }}
          >
            <span>📱</span> Access My Card Portal
          </Link>

          <Link
            href="/admin/login"
            style={{
              padding: '14px 24px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#e2e8f0',
              textDecoration: 'none',
              fontSize: '1rem',
              fontWeight: 600,
              borderRadius: 10,
              minHeight: 48,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>🛡️</span> Admin Console
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 20,
            width: '100%',
            maxWidth: 840,
            marginTop: 64,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>⚡</div>
            <h2
              style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}
            >
              Instant Tap to Share
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              No app required. Tap on any modern iPhone or Android to open your rich, customizable
              profile.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>🔒</div>
            <h2
              style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}
            >
              Granular Privacy
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Toggle visibility for individual phone numbers, emails, addresses, or links at any
              time.
            </p>
          </div>

          <div
            style={{
              background: 'rgba(30, 41, 59, 0.45)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 12,
              padding: 24,
            }}
          >
            <div style={{ fontSize: '1.8rem', marginBottom: 12 }}>📊</div>
            <h2
              style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}
            >
              Real-time Analytics
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Track views, clicks, vCard downloads, and engagement metrics while safeguarding
              visitor privacy.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.85rem',
        }}
      >
        NFC Digital Card Platform &copy; {new Date().getFullYear()}. All rights reserved.
      </footer>
    </main>
  );
}
