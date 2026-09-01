'use client';

import { AuthProvider } from '@/src/shared/context/AuthContext';
import { RecoverAccount } from '@/src/shared/pages/RecoverAccount';

export default function RecoverClient() {
  return (
    <AuthProvider>
      <RecoverAccount />
    </AuthProvider>
  );
}
