"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { csrfMutation } from "@/lib/client-auth";
import type {
  AccountRecoveryError,
  AccountRecoveryMessage,
} from "@/types/account-recovery";

type AccountActionRequestFormProps = {
  action: "password-reset" | "email-verification";
};

const content = {
  "password-reset": {
    endpoint: "/api/auth/password-reset/request",
    button: "Email me a reset link",
    pending: "Requesting…",
    fallback: "Password recovery is temporarily unavailable.",
  },
  "email-verification": {
    endpoint: "/api/auth/email-verification/request",
    button: "Email me a verification link",
    pending: "Requesting…",
    fallback: "Email verification is temporarily unavailable.",
  },
} as const;

export function AccountActionRequestForm({ action }: AccountActionRequestFormProps) {
  const copy = content[action];
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await csrfMutation(copy.endpoint, {
        email: String(form.get("email") ?? "").trim(),
      });
      const result = (await response.json().catch(() => ({}))) as Partial<
        AccountRecoveryMessage & AccountRecoveryError
      >;
      if (!response.ok) {
        setError(result.error ?? copy.fallback);
        return;
      }
      setMessage(
        result.message ?? "If an eligible account exists, an email will be sent.",
      );
    } catch {
      setError(copy.fallback);
    } finally {
      setPending(false);
    }
  }

  if (message) {
    return (
      <div className="activation-complete" role="status">
        <h2>Check your email</h2>
        <p>{message}</p>
        <p className="field-hint">
          Delivery can take a few minutes. Only the newest link will work.
        </p>
        <Link className="primary-link" href="/login">Return to sign in</Link>
      </div>
    );
  }

  return (
    <form className="login-form auth-form" onSubmit={submit}>
      <label htmlFor={`${action}-email`}>Email address</label>
      <input
        id={`${action}-email`}
        name="email"
        type="email"
        autoComplete="email"
        maxLength={320}
        required
      />
      <p className="field-hint">
        For privacy, the response is the same whether or not an eligible account exists.
      </p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" disabled={pending} type="submit">
        {pending ? copy.pending : copy.button}
      </button>
      <Link className="secondary-link" href="/login">Back to sign in</Link>
    </form>
  );
}
