import { MFAChallengeForm } from "./mfa-challenge-form";

export default function MFAChallengePage() {
  return (
    <main className="baseline-shell">
      <section aria-labelledby="mfa-challenge-title" className="baseline-card login-card">
        <p className="eyebrow">Second factor</p>
        <h1 id="mfa-challenge-title">Verify it is you</h1>
        <p>Enter your authenticator code or use one of your saved recovery codes.</p>
        <MFAChallengeForm />
      </section>
    </main>
  );
}

