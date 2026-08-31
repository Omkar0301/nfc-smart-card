'use client';

import { useRouter } from 'next/navigation';
import { OtpFlow } from '@/src/shared/components/OtpFlow';

export default function AdminLoginPage() {
  const router = useRouter();
  return (
    <main style={{ padding: 24 }}>
      <OtpFlow title="Admin sign in" onAuthenticated={() => router.push('/admin/dashboard')} />
    </main>
  );
}
