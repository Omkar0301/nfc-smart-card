import type { Metadata } from 'next';
import { ActivatePage } from '@/src/portal/Activate';

export const metadata: Metadata = {
  title: 'Activate Card — NFC Smart Card',
  description: 'Activate and claim your NFC smart card to start setting up your digital profile.',
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ActivatePage token={token} />;
}
