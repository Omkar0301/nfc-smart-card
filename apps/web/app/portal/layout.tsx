import type { ReactNode } from 'react';
import { AuthProvider } from '@/src/shared/context/AuthContext';
import { PortalLayoutClient } from '@/components/portal/PortalLayoutClient';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PortalLayoutClient>{children}</PortalLayoutClient>
    </AuthProvider>
  );
}
