import type { Metadata } from 'next';
import { AdminGenerateClient } from '@/components/admin/AdminGenerateClient';

export const metadata: Metadata = {
  title: 'Bulk Card Generation — Admin Portal',
  description:
    'Trigger and monitor bulk NFC card generation background jobs and QC batch invalidations.',
};

export default function AdminGeneratePage() {
  return <AdminGenerateClient />;
}
