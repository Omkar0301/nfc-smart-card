import { redirect } from 'next/navigation';
import { CardStatus } from '@nfc-card/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

// Next.js App Router Public Profile SSR Route (F-010 / F-007)
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ type: string; token: string }>;
}) {
  const { type, token } = await params;

  try {
    const res = await fetch(`${API_URL}/cards/${token}`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const body = await res.json();
      if (body?.data?.status === CardStatus.AVAILABLE) {
        redirect(`/activate/${token}`);
      }
    }
  } catch (err) {
    // If Next.js redirect was triggered, re-throw to allow redirection
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) {
      throw err;
    }
  }

  return (
    <main>
      <h1>Public Profile ({type})</h1>
      <p>Token: {token}</p>
    </main>
  );
}
