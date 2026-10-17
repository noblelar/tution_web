"use client";

import { useState } from "react";

import type { TutorInvitationStatus } from "@/lib/profile-types";
import { canReissueProfileInvitation } from "@/lib/profile-onboarding-rules";

type ProfileInvitationPanelProps = {
  kind: "parent" | "student";
  profileId: string;
  accountStatus?: string;
  accountEmail?: string;
  emailVerified: boolean;
  invitation?: TutorInvitationStatus;
  canManage: boolean;
  onReissued: () => void;
};

export function ProfileInvitationPanel({ kind, profileId, accountStatus, accountEmail, emailVerified, invitation, canManage, onReissued }: ProfileInvitationPanelProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const noLogin = !accountStatus;

  async function reissue() {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken?: string };
      if (!csrfToken) throw new Error("Request verification failed.");
      const path = kind === "parent" ? "parents" : "students";
      const response = await fetch(`/api/profiles/${path}/${encodeURIComponent(profileId)}?action=reissue`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      const result = (await response.json()) as { error?: string; emailDelivery?: { status: string } };
      if (!response.ok) throw new Error(result.error ?? "Invitation could not be reissued.");
      setMessage(result.emailDelivery?.status === "failed"
        ? "A fresh invitation was created, but email delivery failed. Review SMTP configuration before retrying."
        : "A fresh invitation was submitted for email delivery. The previous link no longer works.");
      onReissued();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Invitation could not be reissued.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label={`${kind} activation status`}>
      <h2 className="text-lg font-semibold text-slate-900">Account activation</h2>
      {noLogin ? (
        <p className="mt-2 text-sm text-slate-600">This student has an operational profile but no email login identity.</p>
      ) : (
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Email</dt><dd className="font-medium text-slate-900">{accountEmail ?? "Not available"}</dd></div>
          <div><dt className="text-slate-500">Account</dt><dd className="font-medium text-slate-900">{accountStatus?.replaceAll("_", " ")}</dd></div>
          <div><dt className="text-slate-500">Email verified</dt><dd className="font-medium text-slate-900">{emailVerified ? "Yes" : "No"}</dd></div>
          <div><dt className="text-slate-500">Invitation</dt><dd className="font-medium text-slate-900">{invitation?.status ?? "None"}</dd></div>
          {invitation ? <div><dt className="text-slate-500">Expires</dt><dd className="font-medium text-slate-900">{new Date(invitation.expiresAt).toLocaleString()}</dd></div> : null}
          {invitation?.emailDelivery ? <div><dt className="text-slate-500">Email delivery</dt><dd className="font-medium text-slate-900">{invitation.emailDelivery.status.replaceAll("_", " ")}</dd></div> : null}
        </dl>
      )}
      {canReissueProfileInvitation(accountStatus, canManage) ? (
        <button className="mt-4 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={pending} onClick={reissue} type="button">
          {pending ? "Reissuing…" : "Reissue activation email"}
        </button>
      ) : null}
      {message ? <p className="mt-3 text-sm text-emerald-700" role="status">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
    </section>
  );
}
