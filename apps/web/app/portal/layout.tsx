import type { ReactNode } from 'react';
import { AuthProvider } from '@/src/shared/context/AuthContext';

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
