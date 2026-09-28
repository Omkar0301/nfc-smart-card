import type { Metadata } from 'next';
import { CardTypeList } from '../../../src/admin/CardTypeManagement/CardTypeList';

export const metadata: Metadata = {
  title: 'Card Types Management — Admin Portal',
  description: 'Manage card types and dynamic field schemas',
};

export default function CardTypesPage() {
  return (
    <main>
      <CardTypeList />
    </main>
  );
}
