import type { Metadata } from 'next';
import { AdminCustomersClient } from '@/components/admin/AdminCustomersClient';

export const metadata: Metadata = {
  title: 'Customer Directory — Admin Portal',
  description: 'Lookup cardholders, view contact information, and inspect active NFC cards.',
};

export default function AdminCustomersPage() {
  return <AdminCustomersClient />;
}
