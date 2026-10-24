"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AccountActionRequestForm } from "@/components/auth/account-action-request-form";
import {
  accountRecoveryTokenPattern,
  takeAccountRecoveryToken,
} from "@/lib/client-account-recovery";
import { csrfMutation } from "@/lib/client-auth";
import type { AccountRecoveryError } from "@/types/account-recovery";

type VerificationState = "loading" | "request" | "verifying" | "complete" | "failed";

export function EmailVerificationConfirmation() {
  const started = useRef(false);
  const tokenFromFragment = useRef<string | null>(null);
  const [state, setState] = useState<VerificationState>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (tokenFromFragment.current === null) {
      tokenFromFragment.current = takeAccountRecoveryToken();
    }
    const token = tokenFromFragment.current;
    if (!token) {
      queueMicrotask(() => setState("request"));
      return;
    }
    if (!accountRecoveryTokenPattern.test(token)) {
      queueMicrotask(() => {
        setError("This email-verification link is incomplete or invalid.");
        setState("failed");
      });
      return;
    }
    if (started.current) return;
    started.current = true;
    queueMicrotask(() => setState("verifying"));

    csrfMutation("/api/auth/email-verification/confirm", { token })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as Partial<AccountRecoveryError>;
        if (!response.ok) {
          setError(result.error ?? "Email verification is temporarily unavailable.");
          setState("failed");
          return;
        }
        setState("complete");
      })
      .catch(() => {
        setError("Email verification is temporarily unavailable.");
        setState("failed");
      });
  }, []);

  if (state === "loading") {
    return (
      <div className="activation-complete" aria-live="polite">
        <p>Preparing email verification…</p>
      </div>
    );
  }

  if (state === "request") {
    return (
      <>
        <p className="auth-supporting-copy">
          Verification links expire after 24 hours. Requesting another link invalidates the previous one.
        </p>
        <AccountActionRequestForm action="email-verification" />
      </>
    );
  }

  if (state === "verifying") {
    return (
      <div className="activation-complete" aria-live="polite">
        <h2>Verifying your email…</h2>
        <p>Please keep this page open for a moment.</p>
      </div>
    );
  }

  if (state === "complete") {
    return (
      <div className="activation-complete" role="status">
        <h2>Email verified</h2>
        <p>Your email address is confirmed. You can now sign in with your password.</p>
        <Link className="primary-link" href="/login">Continue to sign in</Link>
      </div>
    );
  }

  return (
    <div className="activation-complete">
      <p className="form-error" role="alert">{error}</p>
      <p>The link may be expired, superseded, or already used.</p>
      <Link className="primary-link" href="/verify-email">
        Request a new verification link
      </Link>
    </div>
  );
}
