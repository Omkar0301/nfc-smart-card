import type { Metadata } from 'next';
import { CardDetailPageClient } from '@/components/admin/CardDetailPageClient';

export const metadata: Metadata = {
  title: 'Card Details & Lifecycle — Admin Portal',
  description: 'Inspect NFC card lifecycle state and execute administrative actions.',
};

export default async function AdminCardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CardDetailPageClient cardId={id} />;
}
