import { redirect } from 'next/navigation';

export default async function RecoveryVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  redirect(
    token ? `/portal/recover/verify?token=${encodeURIComponent(token)}` : '/portal/recover/verify'
  );
}
