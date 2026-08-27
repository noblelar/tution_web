import Link from "next/link";

import { ActivationForm } from "./activation-form";
import { AuthShell } from "@/components/auth/auth-shell";

type ActivationPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ActivationPage({ searchParams }: ActivationPageProps) {
  const value = (await searchParams).token;
  const token = typeof value === "string" ? value : "";
  return (
    <AuthShell
      eyebrow="Invited access"
      title="Activate your Tution account"
      description="Accept your invitation and choose a private password before entering the Tution portal."
    >
      {token ? (
        <>
          <p className="auth-supporting-copy">Choose a private password to accept your one-time invitation.</p>
          <ActivationForm token={token} />
        </>
      ) : (
        <div className="activation-complete">
          <p>This activation link is incomplete. Ask your Tution manager for a new invitation.</p>
          <Link className="primary-link" href="/login">Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}
