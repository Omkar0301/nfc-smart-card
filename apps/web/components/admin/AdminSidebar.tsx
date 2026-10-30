'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/src/shared/hooks/useAuth';
import styles from './AdminNav.module.css';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/admin/cards', label: 'Card Inventory', icon: '📇' },
  { href: '/admin/generate', label: 'Bulk Generation', icon: '🚀' },
  { href: '/admin/card-types', label: 'Card Types', icon: '🏷️' },
  { href: '/admin/templates', label: 'Templates', icon: '🎨' },
  { href: '/admin/customers', label: 'Customers', icon: '👥' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace('/admin/login');
  };

  return (
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
            {(user?.name || user?.phone || 'A').charAt(0).toUpperCase()}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || 'System Admin'}</span>
            <span className={styles.userRoleBadge}>Super Admin</span>
          </div>
        </div>
        <button onClick={handleLogout} className={styles.logoutBtn} type="button">
          <span>🚪</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
