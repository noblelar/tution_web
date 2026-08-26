import { MFAEnrollmentForm } from "./mfa-enrollment-form";

export default function MFAEnrollmentPage() {
  return (
    <main className="baseline-shell">
      <section aria-labelledby="mfa-enrollment-title" className="baseline-card login-card">
        <p className="eyebrow">Required protection</p>
        <h1 id="mfa-enrollment-title">Secure your account</h1>
        <p>
          Owners and managers must add a time-based authenticator before a Tution
          session can be created.
        </p>
        <MFAEnrollmentForm />
      </section>
    </main>
  );
}

