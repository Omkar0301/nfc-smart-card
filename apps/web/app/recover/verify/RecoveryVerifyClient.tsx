'use client';

import { AuthProvider } from '@/src/shared/context/AuthContext';
import { RecoveryVerify } from '@/src/shared/pages/RecoveryVerify';

export default function RecoveryVerifyClient() {
  return (
    <AuthProvider>
      <RecoveryVerify />
    </AuthProvider>
  );
}
