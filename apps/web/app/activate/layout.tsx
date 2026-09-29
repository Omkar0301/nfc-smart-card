'use client';

import { AuthProvider } from '@/src/shared/context/AuthContext';
import type { ReactNode } from 'react';

export default function ActivateLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
