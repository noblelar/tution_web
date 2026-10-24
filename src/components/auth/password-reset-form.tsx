"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";

import {
  accountRecoveryTokenPattern,
  takeAccountRecoveryToken,
} from "@/lib/client-account-recovery";
import { csrfMutation } from "@/lib/client-auth";
import type {
  AccountRecoveryError,
  AccountRecoveryMessage,
} from "@/types/account-recovery";

export function PasswordResetForm() {
  const tokenFromFragment = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tokenFromFragment.current === null) {
      tokenFromFragment.current = takeAccountRecoveryToken();
    }
    const value = tokenFromFragment.current;
    queueMicrotask(() => setToken(value));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!token || !accountRecoveryTokenPattern.test(token)) {
      setError("This password-reset link is incomplete or invalid.");
      return;
    }

    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (newPassword !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const response = await csrfMutation("/api/auth/password-reset/confirm", {
        token,
        newPassword,
      });
      const result = (await response.json().catch(() => ({}))) as Partial<
        AccountRecoveryMessage & AccountRecoveryError
      >;
      if (!response.ok) {
        setError(result.error ?? "Password reset is temporarily unavailable.");
        return;
      }
      setComplete(true);
    } catch {
      setError("Password reset is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  if (complete) {
    return (
      <div className="activation-complete" role="status">
        <h2>Password updated</h2>
        <p>All existing sessions have been signed out. Sign in with your new password.</p>
        <Link className="primary-link" href="/login">Continue to sign in</Link>
      </div>
    );
  }

  if (token === null) {
    return (
      <div className="activation-complete" aria-live="polite">
        <p>Preparing your secure password-reset form…</p>
      </div>
    );
  }

  if (!accountRecoveryTokenPattern.test(token)) {
    return (
      <div className="activation-complete">
        <p>This password-reset link is incomplete or invalid.</p>
        <Link className="primary-link" href="/forgot-password">
          Request a new reset link
        </Link>
      </div>
    );
  }

  const linkNeedsReplacement = error.toLowerCase().includes("invalid or expired");

  return (
    <form className="login-form auth-form" onSubmit={submit}>
      <label htmlFor="new-password">New password</label>
      <input
        id="new-password"
        name="newPassword"
        type="password"
        minLength={15}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      <p className="field-hint">Use 15–128 characters and avoid common passwords.</p>
      <label htmlFor="new-password-confirmation">Confirm new password</label>
      <input
        id="new-password-confirmation"
        name="confirmation"
        type="password"
        minLength={15}
        maxLength={128}
        autoComplete="new-password"
        required
      />
      {error ? (
        <div className="form-error" role="alert">
          <p>{error}</p>
          {linkNeedsReplacement ? (
            <Link className="secondary-link" href="/forgot-password">
              Request a new reset link
            </Link>
          ) : null}
        </div>
      ) : null}
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
