'use client';

import { useRouter } from 'next/navigation';
import { CardDetail } from '@/src/admin/CardManagement/CardDetail';

export function CardDetailPageClient({ cardId }: { cardId: string }) {
  const router = useRouter();

  return (
    <CardDetail
      cardId={cardId}
      onBack={() => router.push('/admin/cards')}
      onCardUpdated={() => {}}
    />
  );
}
