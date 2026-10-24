"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PendingStaffDeleteDialog } from "@/components/admin/pending-staff-delete-dialog";
import { canDeletePendingTutor, pendingTutorDeletionEndpoint } from "@/lib/pending-staff-deletion";
import type { TutorInvitation, TutorManagementContext, TutorProfile } from "@/lib/profile-types";
import { StatusBadge } from "./student-management";
import { TutorCapabilities } from "./tutor-capabilities";
import { TutorAvailabilityManagement } from "./tutor-availability";
import { AccountStatus, displayName } from "./tutor-management";

export function TutorDetail({ tutorProfileId }: { tutorProfileId: string }) {
  const router = useRouter();
  const [tutor, setTutor] = useState<TutorProfile | null>(null);
  const [management, setManagement] = useState<TutorManagementContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [invitationBusy, setInvitationBusy] = useState(false);
  const [invitationError, setInvitationError] = useState("");
  const [invitationMessage, setInvitationMessage] = useState("");
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [lifecycleError, setLifecycleError] = useState("");
  const [lifecycleMessage, setLifecycleMessage] = useState("");
  const [lifecycleAction, setLifecycleAction] = useState<"suspend" | "disable" | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [mfaBusy, setMFABusy] = useState(false);
  const [mfaError, setMFAError] = useState("");
  const [mfaMessage, setMFAMessage] = useState("");
  const [confirmMFAReset, setConfirmMFAReset] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletionComplete, setDeletionComplete] = useState(false);

  async function refreshDeletionContext() {
    const params = new URLSearchParams({ id: tutorProfileId });
    const [profileResponse, contextResponse] = await Promise.all([
      fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/profiles/onboarding/tutors?context=management", { cache: "no-store" }),
    ]);
    if (profileResponse.status === 404) {
      // Another administrator may have removed it; do not label our request successful.
      router.replace("/app/admin/tutors");
      return;
    }
    const profile = await profileResponse.json() as TutorProfile & { error?: string };
    const context = await contextResponse.json() as TutorManagementContext & { error?: string };
    if (!profileResponse.ok) throw new Error(profile.error ?? "Tutor details could not refresh.");
    if (!contextResponse.ok) throw new Error(context.error ?? "Tutor permissions could not refresh.");
    setTutor(profile);
    setManagement(context);
  }

  useEffect(() => {
    let active = true;
    async function loadTutor() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ id: tutorProfileId });
        const [profileResponse, contextResponse] = await Promise.all([
          fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, { cache: "no-store" }),
          fetch("/api/profiles/onboarding/tutors?context=management", { cache: "no-store" }),
        ]);
        const result = (await profileResponse.json()) as TutorProfile & { error?: string };
        if (!profileResponse.ok) throw new Error(result.error ?? "Tutor profile could not be loaded.");
        const context = (await contextResponse.json()) as TutorManagementContext & { error?: string };
        if (!contextResponse.ok) throw new Error(context.error ?? "Tutor management permissions could not be loaded.");
        if (active) {
          setTutor(result);
          setManagement(context);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Tutor profile could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTutor();
    return () => {
      active = false;
    };
  }, [reloadKey, tutorProfileId]);

  async function manageInvitation(action: "reissue" | "revoke") {
    setInvitationBusy(true);
    setInvitationError("");
    setInvitationMessage("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const params = new URLSearchParams({
        invitationAction: action,
        tutorProfileId,
      });
      const response = await fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "The tutor invitation could not be updated.");
      }
      if (action === "reissue") {
        const invitation = (await response.json()) as TutorInvitation;
        setInvitationMessage(
          invitation.emailDelivery.status === "failed"
            ? "A new invitation was created, but email delivery failed. You can retry again after the rate limit clears."
            : "A new 48-hour activation invitation was accepted for email delivery.",
        );
      } else {
        setInvitationMessage("The outstanding tutor invitation was revoked.");
        setConfirmRevoke(false);
      }
      setReloadKey((current) => current + 1);
    } catch (actionError) {
      setInvitationError(
        actionError instanceof Error
          ? actionError.message
          : "The tutor invitation could not be updated.",
      );
    } finally {
      setInvitationBusy(false);
    }
  }

  async function manageLifecycle(action: "suspend" | "restore" | "disable") {
    setLifecycleBusy(true);
    setLifecycleError("");
    setLifecycleMessage("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const params = new URLSearchParams({ lifecycleAction: action, tutorProfileId });
      const response = await fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ reason: lifecycleReason.trim() || undefined }),
      });
      const result = (await response.json()) as TutorProfile & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The tutor account status could not be updated.");
      setTutor(result);
      setLifecycleAction(null);
      setLifecycleReason("");
      setLifecycleMessage(
        action === "suspend"
          ? "The tutor account was suspended and all active sessions were revoked."
          : action === "disable"
            ? "The tutor account was disabled and all active sessions were revoked."
            : "The tutor account was restored and can sign in again.",
      );
    } catch (actionError) {
      setLifecycleError(
        actionError instanceof Error
          ? actionError.message
          : "The tutor account status could not be updated.",
      );
    } finally {
      setLifecycleBusy(false);
    }
  }

  async function resetTutorMFA() {
    if (!tutor) return;
    setMFABusy(true);
    setMFAError("");
    setMFAMessage("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const params = new URLSearchParams({
        mfaAction: "reset",
        tutorUserId: tutor.userId,
      });
      const response = await fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, {
        method: "POST",
        headers: { "x-csrf-token": csrfToken },
      });
      const result = (await response.json()) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "The tutor MFA enrollment could not be reset.");
      setTutor((current) => current ? { ...current, mfaEnabled: false } : current);
      setConfirmMFAReset(false);
      setMFAMessage("Tutor MFA was reset and all of the tutor's active sessions were revoked.");
    } catch (actionError) {
      setMFAError(actionError instanceof Error ? actionError.message : "The tutor MFA enrollment could not be reset.");
    } finally {
      setMFABusy(false);
    }
  }

  if (deletionComplete) {
    return (
      <main className="admin-main">
        <Link className="student-back-link" href="/app/admin/tutors">← Back to tutors</Link>
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">The pending tutor account was permanently deleted. Returning to the tutor directory…</p>
      </main>
    );
  }

  if (loading) {
    return <main className="admin-main"><p className="student-state-message">Loading tutor profile…</p></main>;
  }

  if (error || !tutor) {
    return (
      <main className="admin-main">
        <Link className="student-back-link" href="/app/admin/tutors">← Back to tutors</Link>
        <p className="form-error" role="alert">{error || "Tutor profile could not be loaded."}</p>
      </main>
    );
  }

  return (
    <main className="admin-main student-detail" aria-labelledby="tutor-detail-title">
      <Link className="student-back-link" href="/app/admin/tutors">← Back to tutors</Link>
      <header className="student-detail-hero">
        <span>{tutor.firstName.charAt(0)}{tutor.lastName.charAt(0)}</span>
        <div>
          <h1 id="tutor-detail-title">{displayName(tutor)}</h1>
          <div className="student-detail-badges">
            <StatusBadge status={tutor.profileStatus} />
            <AccountStatus status={tutor.accountStatus} />
          </div>
        </div>
      </header>

      {tutor.accountStatus === "pending_activation" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
          <strong className="block">Activation is still required</strong>
          This tutor is not ready for class or schedule assignments. Capabilities and availability configured here are onboarding preparation, not authorization to teach.
        </div>
      ) : null}

      <section className="student-detail-grid">
        <article className="student-detail-card">
          <h2>Profile summary</h2>
          <dl>
            <Detail label="Legal name" value={`${tutor.firstName} ${tutor.lastName}`} />
            <Detail label="Preferred name" value={tutor.preferredName ?? "Not recorded"} />
            <Detail label="Email" value={tutor.email} />
            <Detail label="Email verification" value={tutor.emailVerified ? "Verified" : "Awaiting verification"} />
            <Detail label="Phone" value={tutor.phoneNumber ?? "Not recorded"} />
          </dl>
        </article>

        <article className="student-detail-card">
          <h2>Organization placement</h2>
          <dl>
            <Detail label="Primary centre" value={tutor.primaryCentreName ?? "Not assigned"} />
            <Detail label="Profile status" value={tutor.profileStatus} />
            <Detail label="Account status" value={formatStatus(tutor.accountStatus)} />
          </dl>
        </article>

        <article aria-busy={mfaBusy} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Account security</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Optional multi-factor authentication</h2>
              <p className="mt-1 text-sm text-slate-600">Ordinary tutors may opt in from their own account settings. Resetting optional MFA signs the tutor out everywhere and lets them enroll again.</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${tutor.mfaEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
              {tutor.mfaEnabled ? "MFA enabled" : "MFA not enabled"}
            </span>
          </div>

          {mfaError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{mfaError}</p> : null}
          {mfaMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{mfaMessage}</p> : null}

          {tutor.mfaRequired ? (
            <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">This tutor also has a privileged owner or manager role, so MFA is mandatory. Use the privileged-account recovery flow if a reset is required.</p>
          ) : tutor.mfaEnabled && management?.canResetTutorMFA && management.actorUserId !== tutor.userId ? (
            confirmMFAReset ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="font-semibold text-amber-950">Reset this tutor&apos;s MFA?</h3>
                <p className="mt-1 text-sm text-amber-900">The authenticator factor and recovery codes will be removed, and every active tutor session will be revoked.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={mfaBusy} onClick={() => void resetTutorMFA()} type="button">{mfaBusy ? "Resetting…" : "Confirm reset"}</button>
                  <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={mfaBusy} onClick={() => setConfirmMFAReset(false)} type="button">Cancel</button>
                </div>
              </div>
            ) : (
              <button className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100" onClick={() => { setConfirmMFAReset(true); setMFAError(""); setMFAMessage(""); }} type="button">Reset tutor MFA</button>
            )
          ) : tutor.mfaEnabled ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Use the appropriate self-service or privileged-account recovery flow for your own account.</p>
          ) : (
            <p className="mt-4 text-sm text-slate-600">No administrator action is required. The tutor can continue with password-only access or enroll from their settings.</p>
          )}
        </article>

        <article aria-busy={invitationBusy} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Account onboarding</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Activation invitation</h2>
              <p className="mt-1 text-sm text-slate-600">Monitor the latest invitation without exposing its one-time activation link.</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${tutor.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {tutor.emailVerified ? "Email verified" : "Verification pending"}
            </span>
          </div>

          {tutor.invitation ? (
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <InvitationDetail label="Invitation" value={formatStatus(tutor.invitation.status)} />
              <InvitationDetail label="Expires" value={formatDateTime(tutor.invitation.expiresAt)} />
              <InvitationDetail label="Email delivery" value={formatStatus(tutor.invitation.emailDelivery?.status ?? "not_attempted")} />
              <InvitationDetail label="Delivery attempts" value={String(tutor.invitation.emailDelivery?.attemptCount ?? 0)} />
            </dl>
          ) : (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">No tutor activation invitation has been recorded.</p>
          )}

          {tutor.invitation?.emailDelivery?.failureCategory ? (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Delivery issue: {formatStatus(tutor.invitation.emailDelivery.failureCategory)}.
            </p>
          ) : null}
          {invitationError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{invitationError}</p> : null}
          {invitationMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{invitationMessage}</p> : null}

          {management?.canManageInvitations && tutor.accountStatus === "pending_activation" ? (
            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
              <button
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={invitationBusy}
                onClick={() => void manageInvitation("reissue")}
                type="button"
              >
                {invitationBusy ? "Updating…" : "Reissue invitation"}
              </button>
              {tutor.invitation?.status === "pending" && !confirmRevoke ? (
                <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={invitationBusy}
                  onClick={() => setConfirmRevoke(true)}
                  type="button"
                >
                  Revoke invitation
                </button>
              ) : null}
              {confirmRevoke ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2">
                  <span className="px-2 text-sm text-red-800">Revoke the current link?</span>
                  <button className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700" disabled={invitationBusy} onClick={() => void manageInvitation("revoke")} type="button">Confirm revoke</button>
                  <button className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white" disabled={invitationBusy} onClick={() => setConfirmRevoke(false)} type="button">Cancel</button>
                </div>
              ) : null}
            </div>
          ) : null}
        </article>

        <article aria-busy={lifecycleBusy} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-600">Account control</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-950">Tutor lifecycle</h2>
              <p className="mt-1 text-sm text-slate-600">Suspend access temporarily, restore access, or disable access with owner approval.</p>
            </div>
            <AccountStatus status={tutor.accountStatus} />
          </div>

          {tutor.accountStatus === "suspended" || tutor.accountStatus === "disabled" ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
              <strong className="block">Operational review required</strong>
              Review any future lessons assigned to this tutor when scheduling becomes available. Existing historical links must remain intact.
            </div>
          ) : null}
          {lifecycleError ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{lifecycleError}</p> : null}
          {lifecycleMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{lifecycleMessage}</p> : null}

          {management?.actorUserId === tutor.userId ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">You cannot change the lifecycle state of your own tutor account.</p>
          ) : tutor.accountStatus === "pending_activation" ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">Lifecycle controls become available after the tutor activates the account.</p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              {management?.canSuspendTutors && tutor.accountStatus === "active" ? (
                <button className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={lifecycleBusy} onClick={() => setLifecycleAction("suspend")} type="button">Suspend tutor</button>
              ) : null}
              {management?.canRestoreSuspendedTutors && tutor.accountStatus === "suspended" ? (
                <button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={lifecycleBusy} onClick={() => void manageLifecycle("restore")} type="button">{lifecycleBusy ? "Restoring…" : "Restore tutor"}</button>
              ) : null}
              {management?.canDisableTutors && (tutor.accountStatus === "active" || tutor.accountStatus === "suspended") ? (
                <button className="rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={lifecycleBusy} onClick={() => setLifecycleAction("disable")} type="button">Disable tutor</button>
              ) : null}
              {management?.canRestoreDisabledTutors && tutor.accountStatus === "disabled" ? (
                <button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={lifecycleBusy} onClick={() => void manageLifecycle("restore")} type="button">{lifecycleBusy ? "Restoring…" : "Restore disabled tutor"}</button>
              ) : null}
            </div>
          )}

          {lifecycleAction ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-950">Confirm {lifecycleAction === "suspend" ? "suspension" : "disablement"}</h3>
              <p className="mt-1 text-sm text-slate-600">This immediately revokes every active session. The optional reason remains internal and is never shown to the tutor.</p>
              <label className="mt-4 block text-sm font-semibold text-slate-800" htmlFor="tutor-lifecycle-reason">Internal reason <span className="font-normal text-slate-500">(optional)</span></label>
              <textarea className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100" id="tutor-lifecycle-reason" maxLength={500} onChange={(event) => setLifecycleReason(event.target.value)} value={lifecycleReason} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 ${lifecycleAction === "disable" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`} disabled={lifecycleBusy} onClick={() => void manageLifecycle(lifecycleAction)} type="button">{lifecycleBusy ? "Updating…" : `Confirm ${lifecycleAction}`}</button>
                <button className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={lifecycleBusy} onClick={() => { setLifecycleAction(null); setLifecycleReason(""); }} type="button">Cancel</button>
              </div>
            </div>
          ) : null}
        </article>

        <TutorCapabilities preferredCentreId={tutor.primaryCentreId} tutorProfileId={tutor.id} />
        <TutorAvailabilityManagement preferredCentreId={tutor.primaryCentreId} tutorProfileId={tutor.id} />
      </section>

      {management && canDeletePendingTutor(tutor, management) ? (
        <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm" aria-labelledby="pending-tutor-deletion-title">
          <h2 className="text-lg font-semibold text-slate-950" id="pending-tutor-deletion-title">Remove an unactivated account</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">This invitation has never been accepted. Permanently delete the pending account and its onboarding data, including expired, revoked or failed-delivery invitations. Its administrative audit record will remain.</p>
          <button
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={invitationBusy || lifecycleBusy || mfaBusy}
            onClick={() => { setConfirmRevoke(false); setDeleteDialogOpen(true); }}
            type="button"
          >
            Delete pending account
          </button>
        </section>
      ) : null}

      {deleteDialogOpen ? (
        <PendingStaffDeleteDialog
          key={tutor.id}
          target={{
            kind: "tutor",
            name: displayName(tutor),
            email: tutor.email,
            endpoint: pendingTutorDeletionEndpoint(tutor.id),
            eligible: Boolean(management && canDeletePendingTutor(tutor, management)),
          }}
          onClose={() => setDeleteDialogOpen(false)}
          onDeleted={() => { setDeleteDialogOpen(false); setDeletionComplete(true); router.replace("/app/admin/tutors?deleted=pending"); }}
          onRefresh={refreshDeletionContext}
        />
      ) : null}
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function InvitationDetail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

function formatStatus(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
