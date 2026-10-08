'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
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

  const isPublicAuthRoute = pathname === '/portal/login' || pathname.startsWith('/portal/recover');

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

      {/* Mobile Bottom Navigation Bar (min 44px tap targets) */}
      <nav className={styles.mobileNav}>
        {NAV_ITEMS.slice(0, 5).map((item) => {
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
      </nav>
    </div>
  );
}
