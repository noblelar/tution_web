"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type LoginResult = {
  error?: string;
  user?: { firstName: string; roles?: Array<{ roleKey: string }> };
  mfaRequired?: boolean;
  enrollmentRequired?: boolean;
};

type AlternativeMethods = {
  google: boolean;
  apple: boolean;
  emailOtp: boolean;
};

const noAlternativeMethods: AlternativeMethods = {
  google: false,
  apple: false,
  emailOtp: false,
};

export function LoginForm({ oauthError = "" }: { oauthError?: string }) {
  const router = useRouter();
  const [error, setError] = useState(oauthError);
  const [pending, setPending] = useState(false);
  const [methods, setMethods] = useState(noAlternativeMethods);
  const [otpEmail, setOtpEmail] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/methods", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return noAlternativeMethods;
        return (await response.json()) as AlternativeMethods;
      })
      .then((available) => {
        if (active) setMethods(available);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await csrfMutation("/api/auth/login", {
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      const result = (await response.json()) as LoginResult;
      if (!response.ok) {
        setError(result.error ?? "Sign in failed.");
        return;
      }
      if (result.mfaRequired) {
        router.push(result.enrollmentRequired ? "/mfa/enroll" : "/mfa/challenge");
        router.refresh();
        return;
      }
      completeSignIn(result.user);
    } catch {
      setError("Authentication is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function submitStudentPeopleCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await csrfMutation("/api/auth/student/people-code-login", {
        people_code: String(form.get("peopleCode") ?? ""),
        date_of_birth: String(form.get("dateOfBirth") ?? ""),
      });
      const result = (await response.json()) as LoginResult;
      if (!response.ok) {
        setError(result.error ?? "Student sign in failed.");
        return;
      }
      completeSignIn(result.user);
    } catch {
      setError("Student sign in is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function requestOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("otpEmail") ?? "").trim();
    try {
      const response = await csrfMutation("/api/auth/email-otp/request", { email });
      const result = (await response.json()) as LoginResult;
      if (!response.ok) {
        setError(result.error ?? "Email sign-in is temporarily unavailable.");
        return;
      }
      setOtpEmail(email);
      setOtpRequested(true);
    } catch {
      setError("Email sign-in is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  async function verifyOTP(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await csrfMutation("/api/auth/email-otp/verify", {
        email: otpEmail,
        code: String(form.get("otpCode") ?? ""),
      });
      const result = (await response.json()) as LoginResult;
      if (!response.ok) {
        setError(result.error ?? "Email code is invalid or expired.");
        return;
      }
      completeSignIn(result.user);
    } catch {
      setError("Email sign-in is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  function completeSignIn(user?: LoginResult["user"]) {
    router.push(roleHome(user));
    router.refresh();
  }

  const hasOAuth = methods.google || methods.apple;

  return (
    <div className="login-options">
      <form className="login-form auth-form" onSubmit={submitPassword}>
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button className="primary-button" disabled={pending} type="submit">
          {pending ? "Signing in…" : "Sign in with password"}
        </button>
      </form>

      <section aria-labelledby="student-code-title" className="alternative-login">
        <div className="login-divider"><span>or</span></div>
        <h2 id="student-code-title">Student people-code sign in</h2>
        <form className="login-form auth-form compact-login-form" onSubmit={submitStudentPeopleCode}>
          <label htmlFor="people-code">People code</label>
          <input
            id="people-code"
            name="peopleCode"
            type="text"
            autoCapitalize="characters"
            autoComplete="username"
            placeholder="STC-P8K4X2"
            pattern="[Ss][Tt][Cc]-[A-Za-z0-9]{6}"
            required
          />
          <label htmlFor="date-of-birth">Date of birth</label>
          <input id="date-of-birth" name="dateOfBirth" type="date" autoComplete="bday" required />
          <button className="primary-button" disabled={pending} type="submit">
            {pending ? "Signing in…" : "Sign in as student"}
          </button>
        </form>
      </section>

      {hasOAuth ? (
        <section aria-labelledby="social-sign-in-title" className="alternative-login">
          <div className="login-divider"><span>or</span></div>
          <h2 id="social-sign-in-title" className="visually-hidden">Social sign in</h2>
          <div className="oauth-actions">
            {methods.google ? <a href="/api/auth/oauth/google/start">Continue with Google</a> : null}
            {methods.apple ? <a href="/api/auth/oauth/apple/start">Continue with Apple</a> : null}
          </div>
        </section>
      ) : null}

      {methods.emailOtp ? (
        <section aria-labelledby="email-code-title" className="alternative-login">
          <div className="login-divider"><span>or</span></div>
          <h2 id="email-code-title">Parent or student email code</h2>
          {!otpRequested ? (
            <form className="login-form auth-form compact-login-form" onSubmit={requestOTP}>
              <label htmlFor="otp-email">Email address</label>
              <input id="otp-email" name="otpEmail" type="email" autoComplete="email" required />
              <button className="secondary-button" disabled={pending} type="submit">
                {pending ? "Requesting…" : "Email me a sign-in code"}
              </button>
            </form>
          ) : (
            <form className="login-form auth-form compact-login-form" onSubmit={verifyOTP}>
              <p className="field-hint">
                If eligible, a six-digit code was sent to {otpEmail}.
              </p>
              <label htmlFor="otp-code">Six-digit code</label>
              <input
                id="otp-code"
                name="otpCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
              <button className="secondary-button" disabled={pending} type="submit">
                {pending ? "Verifying…" : "Verify code"}
              </button>
              <button
                className="text-button"
                disabled={pending}
                onClick={() => setOtpRequested(false)}
                type="button"
              >
                Use a different email
              </button>
            </form>
          )}
        </section>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}

async function csrfMutation(path: string, body: Record<string, string>): Promise<Response> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("CSRF token unavailable");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  return fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
}

function roleHome(user?: LoginResult["user"]): string {
  const roles = new Set(user?.roles?.map((role) => role.roleKey) ?? []);
  if (roles.has("owner") || roles.has("manager")) return "/app/admin";
  if (roles.has("parent")) return "/app/parent";
  if (roles.has("student")) return "/app/student";
  return "/app";
}
