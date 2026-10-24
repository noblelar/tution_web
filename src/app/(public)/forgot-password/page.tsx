import type { Metadata } from "next";

import { AccountActionRequestForm } from "@/components/auth/account-action-request-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Reset password | Tution",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Request a secure, one-time link. It expires after 30 minutes and only the newest link will work."
    >
      <p className="auth-supporting-copy">
        Enter the email address already associated with your active Tution account.
      </p>
      <AccountActionRequestForm action="password-reset" />
    </AuthShell>
  );
}
