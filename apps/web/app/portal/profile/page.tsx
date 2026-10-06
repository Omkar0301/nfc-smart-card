import { ProfileEditor } from '@/src/portal/ProfileEditor';

export const metadata = {
  title: 'Edit Card Profile | NFC Smart Card',
  description: 'Manage and customize your public NFC digital smart card profile.',
};

export default function ProfilePage() {
  return <ProfileEditor />;
}
