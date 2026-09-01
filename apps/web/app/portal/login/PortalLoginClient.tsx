'use client';

import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/src/shared/context/AuthContext';
import { OtpFlow } from '@/src/shared/components/OtpFlow';

export default function PortalLoginClient() {
  const router = useRouter();

  return (
    <AuthProvider>
      <OtpFlow title="Customer sign in" onAuthenticated={() => router.push('/portal/dashboard')} />
    </AuthProvider>
  );
}
