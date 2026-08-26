"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type ActivationFormProps = { token: string };

export function ActivationForm({ token }: ActivationFormProps) {
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({ token, password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Account activation failed.");
        return;
      }
      setComplete(true);
    } catch {
      setError("Account activation is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="activation-complete" role="status">
        <h2>Your account is active</h2>
        <p>Your password has been set. You can now sign in to Tution.</p>
        <Link className="primary-link" href="/login">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="password">Create password</label>
      <input id="password" name="password" type="password" minLength={15} maxLength={128} autoComplete="new-password" required />
      <p className="field-hint">Use 15–128 characters and avoid common passwords.</p>
      <label htmlFor="confirmation">Confirm password</label>
      <input id="confirmation" name="confirmation" type="password" minLength={15} maxLength={128} autoComplete="new-password" required />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button disabled={pending} type="submit">{pending ? "Activating…" : "Activate account"}</button>
    </form>
  );
}
