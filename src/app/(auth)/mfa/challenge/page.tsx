import { MFAChallengeForm } from "./mfa-challenge-form";
import { AuthShell } from "@/components/auth/auth-shell";

export default function MFAChallengePage() {
  return (
    <AuthShell
      eyebrow="Second factor"
      title="Verify it is you"
      description="Enter your authenticator code or use one of your saved recovery codes to continue securely."
    >
      <MFAChallengeForm />
    </AuthShell>
  );
}
