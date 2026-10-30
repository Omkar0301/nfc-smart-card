import type { ReactNode } from 'react';
import { AuthProvider } from '@/src/shared/context/AuthContext';
import { AdminLayoutClient } from '@/components/admin/AdminLayoutClient';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </AuthProvider>
  );
}
