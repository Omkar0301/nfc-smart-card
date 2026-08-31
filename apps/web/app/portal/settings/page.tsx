import { RecoveryEmailSetup } from '@/src/portal/Settings/RecoveryEmailSetup';

export default function CustomerSettingsPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Account Settings</h1>
      <div style={{ marginTop: 24 }}>
        <RecoveryEmailSetup />
      </div>
    </main>
  );
}
