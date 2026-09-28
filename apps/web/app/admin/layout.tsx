import type { ReactNode } from 'react';
import { AuthProvider } from '@/src/shared/context/AuthContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
