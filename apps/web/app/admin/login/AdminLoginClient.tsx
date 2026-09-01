'use client';

import { useRouter } from 'next/navigation';
import { AuthProvider } from '@/src/shared/context/AuthContext';
import { OtpFlow } from '@/src/shared/components/OtpFlow';

export default function AdminLoginClient() {
  const router = useRouter();

  return (
    <AuthProvider>
      <OtpFlow title="Admin sign in" onAuthenticated={() => router.push('/admin/dashboard')} />
    </AuthProvider>
  );
}
