"use client";

import { useRouter } from "next/navigation";
import { OtpFlow } from "@/src/shared/components/OtpFlow";

export default function PortalLoginPage() {
  const router = useRouter();
  return (
    <main style={{ padding: 24 }}>
      <OtpFlow title="Customer sign in" onAuthenticated={() => router.push("/portal/dashboard")} />
    </main>
  );
}
