"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type MFAStatus = { enabled: boolean; required: boolean; error?: string };
type Enrollment = { secret: string; otpAuthUri: string; expiresAt: string; error?: string };

export function TutorAccountSettings() {
  const router = useRouter();
  const [status, setStatus] = useState<MFAStatus | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const response = await fetch("/api/auth/mfa/enrollment", { cache: "no-store" });
        const result = (await response.json()) as MFAStatus;
        if (!response.ok) throw new Error(result.error ?? "MFA status could not be loaded.");
        if (active) setStatus(result);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "MFA status could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStatus();
    return () => { active = false; };
  }, []);

  async function beginEnrollment() {
    setBusy(true);
    setError("");
    try {
      const response = await csrfRequest("PATCH");
      const result = (await response.json()) as Enrollment;
      if (!response.ok) throw new Error(result.error ?? "MFA enrollment could not be started.");
      setEnrollment(result);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "MFA enrollment could not be started.");
    } finally {
      setBusy(false);
    }
  }

  async function completeEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    setBusy(true);
    setError("");
    try {
      const response = await csrfRequest("PUT", { code });
      const result = (await response.json()) as { recoveryCodes?: string[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The authenticator code could not be verified.");
      if (result.recoveryCodes?.length !== 10) throw new Error("Recovery codes could not be issued. Please sign in and try again.");
      setRecoveryCodes(result.recoveryCodes);
      setEnrollment(null);
      setStatus({ enabled: true, required: false });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "The authenticator code could not be verified.");
    } finally {
      setBusy(false);
    }
  }

  async function disableMFA() {
    setBusy(true);
    setError("");
    try {
      const response = await csrfRequest("DELETE");
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "MFA could not be disabled.");
      }
      router.replace("/login");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "MFA could not be disabled.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8" aria-labelledby="tutor-settings-title">
      <header className="rounded-3xl bg-gradient-to-br from-slate-950 to-slate-800 px-6 py-8 text-white shadow-lg sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-300">Tutor account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight" id="tutor-settings-title">Security settings</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Add an authenticator app to protect your tutor account with a second verification step at sign-in.</p>
      </header>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Multi-factor authentication</h2>
            <p className="mt-1 text-sm text-slate-600">This is optional for ordinary tutor accounts and mandatory if your account is later given a manager or owner role.</p>
          </div>
          {status ? <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${status.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{status.enabled ? "Enabled" : "Not enabled"}</span> : null}
        </div>

        {loading ? <p className="mt-5 text-sm text-slate-600">Loading security settings…</p> : null}
        {error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}

        {recoveryCodes.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h3 className="font-semibold text-amber-950">Save your recovery codes now</h3>
            <p className="mt-1 text-sm text-amber-900">Each code works once. Store them somewhere private; Tution will not show them again.</p>
            <ol className="mt-4 grid gap-2 sm:grid-cols-2">{recoveryCodes.map((code) => <li className="rounded-lg border border-amber-200 bg-white px-3 py-2 font-mono text-sm text-slate-900" key={code}>{code}</li>)}</ol>
            <button className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800" onClick={() => setRecoveryCodes([])} type="button">I have stored these codes</button>
          </div>
        ) : enrollment ? (
          <form className="mt-5" onSubmit={completeEnrollment}>
            <ol className="space-y-3 text-sm text-slate-700">
              <li><strong>1.</strong> Open a TOTP-compatible authenticator app.</li>
              <li><strong>2.</strong> Add an account with this setup key: <code className="ml-1 break-all rounded-lg bg-slate-100 px-2 py-1 font-mono text-slate-950">{enrollment.secret}</code></li>
              <li><strong>3.</strong> Enter the current six-digit code below.</li>
            </ol>
            <a className="mt-4 inline-flex text-sm font-semibold text-orange-700 hover:text-orange-800" href={enrollment.otpAuthUri}>Open in an authenticator app</a>
            <label className="mt-5 block text-sm font-semibold text-slate-800" htmlFor="tutor-mfa-code">Six-digit authenticator code</label>
            <input className="mt-2 w-full max-w-xs rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100" id="tutor-mfa-code" inputMode="numeric" maxLength={6} name="code" pattern="[0-9]{6}" required type="text" />
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} type="submit">{busy ? "Verifying…" : "Activate MFA"}</button>
              <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60" disabled={busy} onClick={() => setEnrollment(null)} type="button">Cancel</button>
            </div>
          </form>
        ) : status?.enabled ? (
          <div className="mt-5">
            <p className="text-sm text-slate-600">Your authenticator and recovery codes are active. You will be asked for a second factor after your password at each new sign-in.</p>
            {confirmDisable ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-950">Disable MFA?</h3>
                <p className="mt-1 text-sm text-amber-900">Your authenticator and recovery codes will be removed. All sessions will end and you must sign in again.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60" disabled={busy} onClick={() => void disableMFA()} type="button">{busy ? "Disabling…" : "Disable and sign out"}</button>
                  <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60" disabled={busy} onClick={() => setConfirmDisable(false)} type="button">Cancel</button>
                </div>
              </div>
            ) : <button className="mt-4 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100" onClick={() => setConfirmDisable(true)} type="button">Disable MFA</button>}
          </div>
        ) : status ? (
          <div className="mt-5">
            <p className="text-sm text-slate-600">You currently sign in with your password only.</p>
            <button className="mt-4 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={busy} onClick={() => void beginEnrollment()} type="button">{busy ? "Preparing…" : "Set up MFA"}</button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

async function csrfRequest(method: "PATCH" | "PUT" | "DELETE", body?: Record<string, string>) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification is unavailable.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  return fetch("/api/auth/mfa/enrollment", {
    method,
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: body ? JSON.stringify(body) : undefined,
  });
}
