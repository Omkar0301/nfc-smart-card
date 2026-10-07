import { TemplatePicker } from '@/src/portal/TemplatePicker';

export const metadata = {
  title: 'Choose a Template | NFC Smart Card',
  description: 'Preview and switch the design of your public NFC profile.',
};

export default function TemplatesPage() {
  return <TemplatePicker />;
}
