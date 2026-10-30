import type { Metadata } from 'next';
import { AdminAnalyticsClient } from '@/components/admin/AdminAnalyticsClient';

export const metadata: Metadata = {
  title: 'Platform Analytics & Telemetry — Admin Portal',
  description:
    'Platform-wide event tracking: views, physical NFC scans, click conversions, and traffic trends.',
};

export default function AdminAnalyticsPage() {
  return <AdminAnalyticsClient />;
}
