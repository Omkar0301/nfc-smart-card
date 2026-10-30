'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/src/shared/hooks/useAuth';
import styles from './AdminNav.module.css';

interface AdminLayoutClientProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/admin/cards', label: 'Card Inventory', icon: '📇' },
  { href: '/admin/generate', label: 'Bulk Generation', icon: '🚀' },
  { href: '/admin/card-types', label: 'Card Types', icon: '🏷️' },
  { href: '/admin/templates', label: 'Templates', icon: '🎨' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  const isPublicAuthRoute = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading && !isPublicAuthRoute) {
      if (!user) {
        router.replace('/admin/login');
      } else if (user.role !== 'ADMIN') {
        // Redirect regular users away from admin portal
        router.replace('/portal/dashboard');
      }
    }
  }, [isLoading, user, isPublicAuthRoute, router]);

  // If on login route, render children directly without admin shell
  if (isPublicAuthRoute) {
    return <>{children}</>;
  }

  // Loading spinner while authenticating administrator
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p style={{ fontSize: '0.92rem', fontWeight: 500, color: '#a78bfa' }}>
          Verifying administrator credentials...
        </p>
      </div>
    );
  }

  // If unauthenticated or not an admin, block rendering while redirecting
  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  const getPageTitle = () => {
    if (pathname.startsWith('/admin/cards/')) return 'Card Details & Lifecycle';
    const item = NAV_ITEMS.find((n) =>
      n.href === '/admin/dashboard' ? pathname === '/admin/dashboard' : pathname.startsWith(n.href)
    );
    return item ? item.label : 'Admin Control Plane';
  };

  return (
    <div className={styles.adminShell}>
      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>🛡️</div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>NFC Platform</span>
            <span className={styles.brandSub}>Super Admin</span>
          </div>
        </div>

        <nav className={styles.navList}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === '/admin/dashboard'
                ? pathname === '/admin/dashboard'
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
              {(user.name || user.phone || 'A').charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name || 'System Admin'}</span>
              <span className={styles.userRoleBadge}>Super Admin</span>
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
            <span className={styles.topbarBadge}>● Production API Online</span>
            <Link
              href="/portal/dashboard"
              style={{
                fontSize: '0.82rem',
                fontWeight: 600,
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '6px 12px',
                borderRadius: 8,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(255, 255, 255, 0.1)',
                minHeight: '44px',
              }}
            >
              🔄 Customer Portal
            </Link>
          </div>
        </header>

        <main className={styles.contentWrapper}>{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar (min 44px tap targets) */}
      <nav className={styles.mobileNav}>
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive =
            item.href === '/admin/dashboard'
              ? pathname === '/admin/dashboard'
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
