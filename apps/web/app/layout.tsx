import type { Metadata } from 'next';
import { AuthProvider } from '@/src/shared/context/AuthContext';

export const metadata: Metadata = {
  title: 'NFC Digital Card Platform',
  description: 'Manage and share your digital NFC profile',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
