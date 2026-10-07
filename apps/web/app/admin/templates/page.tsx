import { TemplateList } from '@/src/admin/TemplateManagement';

export const metadata = {
  title: 'Template Library — Admin Portal',
  description: 'Manage per-card-type templates, ordering, and premium flags',
};

export default function AdminTemplatesPage() {
  return (
    <main>
      <TemplateList />
    </main>
  );
}
