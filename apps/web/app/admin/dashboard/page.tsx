import Link from 'next/link';

export default function AdminDashboardPage() {
  return (
    <div
      style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px', fontFamily: 'sans-serif' }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Admin Dashboard</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        Manage platform verticals, card inventory, user profiles, and system settings.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
        }}
      >
        <div
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, background: '#fff' }}
        >
          <h2 style={{ fontSize: 18, margin: '0 0 8px 0' }}>Card Types & Verticals</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0' }}>
            Configure verticals (Business, College), custom field schemas, and public profile
            visibility rules.
          </p>
          <Link
            href="/admin/card-types"
            style={{
              display: 'inline-block',
              background: '#0f172a',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Manage Card Types →
          </Link>
        </div>

        <div
          style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, background: '#fff' }}
        >
          <h2 style={{ fontSize: 18, margin: '0 0 8px 0' }}>Card Inventory & Generation</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 16px 0' }}>
            Trigger bulk card generation jobs, track progress in real time, export CSVs for
            manufacturing, and handle QC batch invalidations.
          </p>
          <Link
            href="/admin/cards"
            style={{
              display: 'inline-block',
              background: '#0f172a',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: 6,
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Manage Card Inventory →
          </Link>
        </div>
      </div>
    </div>
  );
}
