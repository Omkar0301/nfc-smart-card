'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/shared/hooks/useAuth';
import { OtpFlow } from '@/src/shared/components/OtpFlow';
import styles from '@/src/shared/components/OtpFlow/OtpFlow.module.css';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const redirectTarget = searchParams.get('redirect') || '/admin/dashboard';

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'ADMIN') {
        router.replace(redirectTarget);
      } else {
        router.replace('/portal/dashboard');
      }
    }
  }, [isLoading, user, redirectTarget, router]);

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <div className={styles.adminBrandIcon}>🛡️</div>
          <h1 className={styles.title}>Admin Portal</h1>
          <p className={styles.subtitle}>
            Sign in with an authorized administrator phone number to access the console.
          </p>
        </div>
        <OtpFlow
          hideHeader
          showRecovery={false}
          onAuthenticated={() => {
            router.replace(redirectTarget);
          }}
        />
      </div>
    </div>
  );
}

export default function AdminLoginClient() {
  return (
    <Suspense
      fallback={
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <p className={styles.hint} style={{ textAlign: 'center' }}>
              Loading console sign in…
            </p>
          </div>
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
