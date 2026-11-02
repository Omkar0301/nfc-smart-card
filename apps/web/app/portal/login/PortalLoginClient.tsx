'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/shared/hooks/useAuth';
import { OtpFlow } from '@/src/shared/components/OtpFlow';
import styles from '@/src/shared/components/OtpFlow/OtpFlow.module.css';

function PortalLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useAuth();

  const redirectTarget = searchParams.get('redirect') || '/portal/dashboard';

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(redirectTarget);
    }
  }, [isLoading, user, redirectTarget, router]);

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <div className={styles.brandIcon}>⚡</div>
          <h1 className={styles.title}>Customer Sign In</h1>
          <p className={styles.subtitle}>
            Sign in with your phone number to access and manage your NFC digital cards.
          </p>
        </div>
        <OtpFlow
          hideHeader
          showRecovery
          recoveryHref="/portal/recover"
          onAuthenticated={() => {
            router.replace(redirectTarget);
          }}
        />
      </div>
    </div>
  );
}

export default function PortalLoginClient() {
  return (
    <Suspense
      fallback={
        <div className={styles.authContainer}>
          <div className={styles.authCard}>
            <p className={styles.hint} style={{ textAlign: 'center' }}>
              Loading sign in…
            </p>
          </div>
        </div>
      }
    >
      <PortalLoginContent />
    </Suspense>
  );
}
