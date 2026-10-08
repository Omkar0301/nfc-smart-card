'use client';

import { useAuth } from '@/src/shared/hooks/useAuth';
import { RecoveryEmailSetup } from '@/src/portal/Settings/RecoveryEmailSetup';
import { useRouter } from 'next/navigation';

export default function CustomerSettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/portal/login');
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 800, margin: '0 auto' }}
    >
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
          Account & Security Settings
        </h1>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#94a3b8' }}>
          Manage your credentials, secondary recovery methods, and active session.
        </p>
      </div>

      {/* Account Info Tile */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2
          style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 16px 0', color: '#f8fafc' }}
        >
          Primary Identity
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '14px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Cardholder Name
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              {user?.name || 'Cardholder'}
            </div>
          </div>

          <div
            style={{
              background: 'rgba(15, 23, 42, 0.6)',
              padding: '14px 18px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '0.75rem',
                color: '#94a3b8',
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              Primary Phone Number
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
              {user?.phone || 'Not set'}
            </div>
          </div>
        </div>
      </div>

      {/* Recovery Email Setup */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
        }}
      >
        <h2 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 8px 0', color: '#f8fafc' }}>
          Secondary Account Recovery
        </h2>
        <p style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 16 }}>
          If you ever lose access to your primary phone number, your secondary email allows you to
          verify your identity and reclaim your account.
        </p>

        <RecoveryEmailSetup />
      </div>

      {/* Session Management */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.55)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <h2
            style={{ fontSize: '1.15rem', fontWeight: 600, margin: '0 0 4px 0', color: '#f8fafc' }}
          >
            Session & Security
          </h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
            Sign out of your account on this device.
          </p>
        </div>

        <button
          onClick={handleLogout}
          type="button"
          style={{
            minHeight: 44,
            padding: '10px 20px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            color: '#f87171',
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Sign Out of Account
        </button>
      </div>
    </div>
  );
}
