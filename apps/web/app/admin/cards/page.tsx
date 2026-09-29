import type { Metadata } from 'next';
import { CardManagement } from '@/src/admin/CardManagement';

export const metadata: Metadata = {
  title: 'Card Inventory & Generation — Admin Portal',
  description:
    'Bulk NFC card generation, real-time background job tracking, CSV export, and QC invalidation',
};

export default function AdminCardsPage() {
  return (
    <main>
      <CardManagement />
    </main>
  );
}
