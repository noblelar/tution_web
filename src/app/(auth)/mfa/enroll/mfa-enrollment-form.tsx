"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Enrollment = {
  secret: string;
  otpAuthUri: string;
  expiresAt: string;
  error?: string;
};

type Completion = {
  recoveryCodes?: string[];
  error?: string;
};

export function MFAEnrollmentForm() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let active = true;
    async function begin() {
      try {
        const response = await csrfMutation("/api/auth/mfa/enrollment", {});
        const result = (await response.json()) as Enrollment;
        if (!response.ok) throw new Error(result.error ?? "MFA enrollment could not be started.");
        if (active) setEnrollment(result);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "MFA enrollment could not be started.");
      } finally {
        if (active) setPending(false);
      }
    }
    void begin();
    return () => { active = false; };
  }, []);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const response = await csrfMutation("/api/auth/mfa/enrollment/verify", {
        code: String(form.get("code") ?? ""),
      });
      const result = (await response.json()) as Completion;
      if (!response.ok) throw new Error(result.error ?? "The authenticator code could not be verified.");
      if (!result.recoveryCodes || result.recoveryCodes.length !== 10) {
        throw new Error("Recovery codes could not be issued. Sign in again before continuing.");
      }
      setRecoveryCodes(result.recoveryCodes);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The authenticator code could not be verified.");
    } finally {
      setPending(false);
    }
  }

  if (recoveryCodes.length > 0) {
    return (
      <section className="recovery-codes" aria-labelledby="recovery-codes-title">
        <h2 id="recovery-codes-title">Save your recovery codes now</h2>
        <p>Each code works once. Store them somewhere private; Tution will not show them again.</p>
        <ol>{recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}</ol>
        <button
          className="primary-button"
          onClick={() => { router.push("/app"); router.refresh(); }}
          type="button"
        >
          I have stored these codes
        </button>
      </section>
    );
  }

  return (
    <div className="mfa-flow">
      {pending && !enrollment ? <p className="loading-state">Preparing secure enrollment…</p> : null}
      {enrollment ? (
        <>
          <ol className="mfa-steps">
            <li>Open a TOTP-compatible authenticator app.</li>
            <li>
              Add an account using this setup key:
              <code className="setup-key">{enrollment.secret}</code>
            </li>
            <li>Enter the current six-digit code below.</li>
          </ol>
          <a className="secondary-link" href={enrollment.otpAuthUri}>Open in an authenticator app</a>
          <form className="login-form compact-login-form" onSubmit={verify}>
            <label htmlFor="mfa-enrollment-code">Six-digit authenticator code</label>
            <input
              id="mfa-enrollment-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
            />
            <button disabled={pending} type="submit">{pending ? "Verifying…" : "Activate MFA"}</button>
          </form>
        </>
      ) : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

async function csrfMutation(path: string, body: Record<string, string>): Promise<Response> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification is unavailable.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
}
