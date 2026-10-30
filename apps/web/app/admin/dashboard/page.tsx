import type { Metadata } from 'next';
import { AdminDashboardClient } from '@/components/admin/AdminDashboardClient';

export const metadata: Metadata = {
  title: 'Operations Dashboard — Admin Control Plane',
  description:
    'Overview metrics: card status breakdown, total customers, view counts, and vertical inventory health.',
};

export default function AdminDashboardPage() {
  return <AdminDashboardClient />;
}
