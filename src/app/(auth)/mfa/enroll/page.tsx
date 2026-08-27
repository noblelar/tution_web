import { MFAEnrollmentForm } from "./mfa-enrollment-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function MFAEnrollmentPage() {
  return (
    <AuthShell
      eyebrow="Required protection"
      title="Secure your account"
      description="Owners and managers must add a time-based authenticator before a Tution session can be created."
    >
      <MFAEnrollmentForm />
    </AuthShell>
  );
}
