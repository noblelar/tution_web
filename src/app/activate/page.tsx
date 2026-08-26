import Link from "next/link";

import { ActivationForm } from "./activation-form";

type ActivationPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ActivationPage({ searchParams }: ActivationPageProps) {
  const value = (await searchParams).token;
  const token = typeof value === "string" ? value : "";
  return (
    <main className="baseline-shell">
      <section aria-labelledby="activation-title" className="baseline-card login-card">
        <p className="eyebrow">Invited access</p>
        <h1 id="activation-title">Activate your Tution account</h1>
        {token ? (
          <>
            <p>Choose a private password to accept your one-time invitation.</p>
            <ActivationForm token={token} />
          </>
        ) : (
          <div className="activation-complete">
            <p>This activation link is incomplete. Ask your Tution manager for a new invitation.</p>
            <Link className="primary-link" href="/login">Go to sign in</Link>
          </div>
        )}
      </section>
    </main>
  );
}
