'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '@/src/shared/hooks/useAuth';
import styles from './PortalNav.module.css';

interface PortalLayoutClientProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/portal/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/portal/my-card', label: 'My Card', icon: '🎴' },
  { href: '/portal/profile', label: 'Edit Profile', icon: '📇' },
  { href: '/portal/templates', label: 'Templates', icon: '🎨' },
  { href: '/portal/preview', label: 'Live Preview', icon: '👁️' },
  { href: '/portal/analytics', label: 'Analytics', icon: '📈' },
  { href: '/portal/settings', label: 'Settings', icon: '⚙️' },
];

export function PortalLayoutClient({ children }: PortalLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const isPublicAuthRoute = pathname === '/portal/login' || pathname.startsWith('/portal/recover');

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !user && !isPublicAuthRoute) {
      router.replace('/portal/login');
    }
  }, [isLoading, user, isPublicAuthRoute, router]);

  // If on a public auth route, render children without portal chrome
  if (isPublicAuthRoute) {
    return <>{children}</>;
  }

  // Loading spinner while verifying credentials
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0b0f19',
          color: '#94a3b8',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#6366f1',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading customer portal...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If unauthenticated (and not loading), return null while redirecting
  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/portal/login');
  };

  const getPageTitle = () => {
    const item = NAV_ITEMS.find((n) => pathname.startsWith(n.href));
    return item ? item.label : 'Customer Portal';
  };

  return (
    <div className={styles.portalShell}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>⚡</div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>NFC Platform</span>
            <span className={styles.brandSub}>Customer Portal</span>
          </div>
        </div>

        <nav className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/portal/dashboard'
                ? pathname === '/portal/dashboard'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userProfile}>
            <div className={styles.userAvatar}>
              {(user.name || user.phone || 'U').charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name || 'Cardholder'}</span>
              <span className={styles.userPhone}>{user.phone}</span>
            </div>
          </div>
          <button onClick={handleLogout} className={styles.logoutBtn} type="button">
            <span>🚪</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        <header className={styles.topbar}>
          <h1 className={styles.topbarTitle}>{getPageTitle()}</h1>
          <div className={styles.topbarActions}>
            <Link
              href="/portal/preview"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#818cf8',
                background: 'rgba(99, 102, 241, 0.12)',
                padding: '6px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              👁️ View Live Profile
            </Link>
          </div>
        </header>

        <main className={styles.contentWrapper}>{children}</main>
      </div>

      {/* Mobile Drawer Backdrop & Menu */}
      {moreOpen && (
        <div
          onClick={() => setMoreOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            zIndex: 998,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              bottom: 64,
              left: 12,
              right: 12,
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: 16,
              padding: 16,
              boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              zIndex: 999,
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                color: '#94a3b8',
                fontWeight: 600,
                padding: '4px 8px',
                letterSpacing: '0.05em',
              }}
            >
              Additional Features
            </div>
            {NAV_ITEMS.slice(4).map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    color: isActive ? '#818cf8' : '#f8fafc',
                    background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    fontSize: '0.95rem',
                    fontWeight: 500,
                    minHeight: 44,
                  }}
                >
                  <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
            <button
              onClick={handleLogout}
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 10,
                color: '#f87171',
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: 'pointer',
                minHeight: 44,
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar (min 44px tap targets) */}
      <nav className={styles.mobileNav}>
        {NAV_ITEMS.slice(0, 4).map((item) => {
          const isActive =
            item.href === '/portal/dashboard'
              ? pathname === '/portal/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
            >
              <span className={styles.mobileNavIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className={`${styles.mobileNavItem} ${moreOpen || NAV_ITEMS.slice(4).some((n) => pathname.startsWith(n.href)) ? styles.mobileNavItemActive : ''}`}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          aria-label="More navigation items"
        >
          <span className={styles.mobileNavIcon}>⋯</span>
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
