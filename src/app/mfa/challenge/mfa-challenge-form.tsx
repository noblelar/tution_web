"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type VerificationResult = { error?: string };

export function MFAChallengeForm() {
  const router = useRouter();
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification is unavailable.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify(useRecoveryCode
          ? { recoveryCode: String(form.get("recoveryCode") ?? "") }
          : { code: String(form.get("code") ?? "") }),
      });
      const result = (await response.json()) as VerificationResult;
      if (!response.ok) throw new Error(result.error ?? "MFA verification failed.");
      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MFA verification failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={verify}>
      {useRecoveryCode ? (
        <>
          <label htmlFor="mfa-recovery-code">Recovery code</label>
          <input
            id="mfa-recovery-code"
            name="recoveryCode"
            type="text"
            autoComplete="one-time-code"
            placeholder="ABCD-EFGH-JKLM-NPQR"
            required
          />
        </>
      ) : (
        <>
          <label htmlFor="mfa-code">Six-digit authenticator code</label>
          <input
            id="mfa-code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
          />
        </>
      )}
      <button disabled={pending} type="submit">{pending ? "Verifying…" : "Verify and sign in"}</button>
      <button
        className="text-button"
        disabled={pending}
        onClick={() => { setUseRecoveryCode((value) => !value); setError(""); }}
        type="button"
      >
        {useRecoveryCode ? "Use authenticator code" : "Use a recovery code"}
      </button>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
