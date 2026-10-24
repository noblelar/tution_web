import type { Metadata } from "next";

import { AuthShell } from "@/components/auth/auth-shell";
import { EmailVerificationConfirmation } from "@/components/auth/email-verification-confirmation";

export const metadata: Metadata = {
  title: "Verify email | Tution",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function VerifyEmailPage() {
  return (
    <AuthShell
      eyebrow="Email security"
      title="Verify your email"
      description="Confirm your existing account email or request a fresh, one-time verification link."
    >
      <EmailVerificationConfirmation />
    </AuthShell>
  );
}
