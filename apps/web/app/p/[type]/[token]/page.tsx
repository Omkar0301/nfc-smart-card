// Next.js App Router Public Profile SSR Route placeholder (F-010)
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ type: string; token: string }>;
}) {
  const { type, token } = await params;
  return (
    <main>
      <h1>Public Profile ({type})</h1>
      <p>Token: {token}</p>
    </main>
  );
}
