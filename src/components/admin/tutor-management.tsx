"use client";

import Link from "next/link";
import { Fragment, FormEvent, useEffect, useMemo, useState } from "react";

import { TutorOnboardingDialog } from "@/components/admin/onboarding-forms";
import { feedbackButton } from "@/components/feedback/feedback-display";
import { PendingStaffDeleteDialog } from "@/components/admin/pending-staff-delete-dialog";
import { Icon } from "@/components/dashboard";
import { SummaryStat } from "@/components/ui/summary-stat";
import { canDeletePendingTutor, pendingTutorDeletionEndpoint } from "@/lib/pending-staff-deletion";
import type { TutorManagementContext, TutorProfile, TutorProfileList } from "@/lib/profile-types";
import { StatusBadge } from "./student-management";

type TutorStatusFilter = "all" | "pending_activation" | "active" | "suspended" | "disabled";

export function TutorManagement({ pendingAccountDeleted = false }: { pendingAccountDeleted?: boolean }) {
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [management, setManagement] = useState<TutorManagementContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TutorStatusFilter>("all");
  const [centreId, setCentreId] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deletionTarget, setDeletionTarget] = useState<TutorProfile | null>(null);
  const [deletionMessage, setDeletionMessage] = useState(pendingAccountDeleted
    ? "The pending tutor account was permanently deleted. Its audit record is retained."
    : "");

  const [expandedTutorIds, setExpandedTutorIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);

  async function refreshDeletionContext() {
    const [profilesResponse, contextResponse] = await Promise.all([
      fetch("/api/profiles/onboarding/tutors", { cache: "no-store" }),
      fetch("/api/profiles/onboarding/tutors?context=management", { cache: "no-store" }),
    ]);
    const profiles = await profilesResponse.json() as TutorProfileList & { error?: string };
    const context = await contextResponse.json() as TutorManagementContext & { error?: string };
    if (!profilesResponse.ok) throw new Error(profiles.error ?? "Tutor profiles could not refresh.");
    if (!contextResponse.ok) throw new Error(context.error ?? "Tutor permissions could not refresh.");
    setTutors(profiles.tutors);
    setManagement(context);
  }

  function pendingTutorDeleted(tutor: TutorProfile) {
    setDeletionTarget(null);
    setTutors((current) => current.filter((item) => item.id !== tutor.id));
    setDeletionMessage(`The pending tutor account for ${displayName(tutor)} was permanently deleted. Its audit record is retained.`);
    setReloadKey((current) => current + 1);
  }

  useEffect(() => {
    let active = true;
    async function loadTutors() {
      setLoading(true);
      setError("");
      try {
        const [profilesResponse, contextResponse] = await Promise.all([
          fetch("/api/profiles/onboarding/tutors", { cache: "no-store" }),
          fetch("/api/profiles/onboarding/tutors?context=management", { cache: "no-store" }),
        ]);
        const profiles = (await profilesResponse.json()) as TutorProfileList & { error?: string };
        if (!profilesResponse.ok) throw new Error(profiles.error ?? "Tutor profiles could not be loaded.");
        const context = (await contextResponse.json()) as TutorManagementContext & { error?: string };
        if (!contextResponse.ok) throw new Error(context.error ?? "Tutor management permissions could not be loaded.");
        if (active) {
          setTutors(profiles.tutors);
          setManagement(context);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Tutor profiles could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadTutors();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const centres = useMemo(() => {
    const values = new Map((management?.centres ?? []).map((centre) => [centre.id, centre.name]));
    return [...values.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [management]);

  const filteredTutors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tutors.filter((tutor) => {
      const searchable = [
        tutor.firstName,
        tutor.lastName,
        tutor.preferredName,
        tutor.email,
        tutor.phoneNumber,
        tutor.primaryCentreName,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = normalizedQuery === "" || searchable.includes(normalizedQuery);
      const matchesStatus = status === "all" || tutor.accountStatus === status;
      const matchesCentre = centreId === "all" || tutor.primaryCentreId === centreId;
      return matchesQuery && matchesStatus && matchesCentre;
    });
  }, [centreId, query, status, tutors]);

  const activeCount = tutors.filter((tutor) => tutor.accountStatus === "active").length;
  const pendingCount = tutors.filter((tutor) => tutor.accountStatus === "pending_activation").length;
  const restrictedCount = tutors.filter(
    (tutor) => tutor.accountStatus === "suspended" || tutor.accountStatus === "disabled",
  ).length;
  const deliveryIssueCount = tutors.filter(
    (tutor) => tutor.invitation?.emailDelivery?.status === "failed",
  ).length;
  const canOnboardTutor = Boolean(management?.canOnboardTutors && management.centres.length > 0);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTutors.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageTutors = filteredTutors.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstShown = filteredTutors.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastShown = Math.min(currentPage * pageSize, filteredTutors.length);

  function toggleTutor(id: string) {
    setExpandedTutorIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <main className="admin-main student-management" aria-labelledby="tutor-management-title">
      <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm" aria-labelledby="tutor-management-title">
        <h1 id="tutor-management-title" className="!text-lg font-black tracking-tight text-slate-950">Tutors</h1>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Tutor profile summary">
          <SummaryStat label="Total" value={tutors.length} tooltip="Tutor profiles available to the organization" />
          <SummaryStat label="Active" value={activeCount} tooltip="Tutors available for academic capability setup" />
          <SummaryStat label="Pending" value={pendingCount} tooltip="Tutor accounts awaiting invitation activation" />
          <SummaryStat label="Restricted" value={restrictedCount} tooltip="Tutor accounts currently suspended or disabled" />
          <SummaryStat label="Delivery issues" value={deliveryIssueCount} tooltip="Pending invitations whose latest email attempt failed" />
        </dl>
        {management?.canOnboardTutors ? (
          <button className={`${feedbackButton} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50`} disabled={!canOnboardTutor} onClick={() => setDialogOpen(true)} type="button">
            <Icon name="plus" size={16} />
            Onboard tutor
          </button>
        ) : null}
      </section>

      {deletionMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{deletionMessage}</p> : null}

      {management?.canOnboardTutors && management.centres.length === 0 ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-950" role="alert">
          Tutor onboarding is unavailable until an active centre has been created.
        </p>
      ) : null}

      <section className="student-directory-panel" aria-label="Tutor directory">
        <form className="student-toolbar" onSubmit={(event: FormEvent) => event.preventDefault()}>
          <label className="student-search">
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search tutors</span>
            <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search by name, email, phone, or centre" type="search" />
          </label>
          <label>
            <span>Account status</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value as TutorStatusFilter); setPage(1); }}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending_activation">Pending activation</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label>
            <span>Centre</span>
            <select value={centreId} onChange={(event) => { setCentreId(event.target.value); setPage(1); }}>
              <option value="all">All centres</option>
              {centres.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
        </form>

        {loading ? <p className="student-state-message">Loading tutor profiles…</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {!loading && !error && filteredTutors.length === 0 ? (
          <div className="student-empty-state">
            <Icon name="users" size={26} />
            <h2>No tutor profiles found</h2>
            <p>Onboard a tutor or change the current filters to populate this database-backed directory.</p>
          </div>
        ) : null}

        {filteredTutors.length > 0 ? (
          <>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th scope="col">Tutor</th>
                    <th scope="col">Primary centre</th>
                    <th scope="col">Profile</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageTutors.map((tutor) => {
                    const expanded = expandedTutorIds.includes(tutor.id);
                    const detailsId = `tutor-details-${tutor.id}`;
                    return (
                      <Fragment key={tutor.id}>
                        <tr>
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              <strong>{displayName(tutor)}</strong>
                              {tutor.invitation?.emailDelivery?.status === "failed" ? (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Email failed</span>
                              ) : !tutor.emailVerified ? (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Unverified</span>
                              ) : null}
                            </div>
                          </td>
                          <td><strong>{tutor.primaryCentreName ?? "Not assigned"}</strong></td>
                          <td><StatusBadge status={tutor.profileStatus} /></td>
                          <td>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                aria-controls={detailsId}
                                aria-expanded={expanded}
                                className={detailToggleClasses}
                                onClick={() => toggleTutor(tutor.id)}
                                type="button"
                              >
                                {expanded ? "Hide details" : "Details"}
                              </button>
                              <Link className="student-detail-link" href={`/app/admin/tutors?tutor=${tutor.id}`}>Open</Link>
                            </div>
                          </td>
                        </tr>
                        {expanded ? (
                          <tr id={detailsId}>
                            <td colSpan={4} className="bg-slate-50">
                              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                                  <dd className="text-sm text-slate-900">{tutor.email}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Verification</dt>
                                  <dd className="text-sm text-slate-900">
                                    {tutor.emailVerified
                                      ? "Email verified"
                                      : tutor.invitation?.emailDelivery?.status === "failed"
                                        ? "Activation email failed"
                                        : "Verification pending"}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</dt>
                                  <dd className="text-sm text-slate-900">{tutor.phoneNumber ?? "Not recorded"}</dd>
                                </div>
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account</dt>
                                  <dd><AccountStatus status={tutor.accountStatus} /></dd>
                                </div>
                                {tutor.preferredName ? (
                                  <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Legal name</dt>
                                    <dd className="text-sm text-slate-900">{tutor.firstName} {tutor.lastName}</dd>
                                  </div>
                                ) : null}
                              </dl>
                              {management && canDeletePendingTutor(tutor, management) ? (
                                <button
                                  className={`${pendingDeleteButtonClasses} mt-4`}
                                  onClick={() => { setDeletionMessage(""); setDeletionTarget(tutor); }}
                                  type="button"
                                >
                                  Delete pending account
                                </button>
                              ) : null}
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <nav className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-slate-600" aria-label="Tutor pagination">
              <span>Showing {firstShown}–{lastShown} of {filteredTutors.length}</span>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <button className={detailToggleClasses} disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} type="button">Previous</button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <button className={detailToggleClasses} disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} type="button">Next</button>
                </div>
              ) : null}
            </nav>
          </>
        ) : null}
      </section>

      {deletionTarget ? (
        <PendingStaffDeleteDialog
          key={deletionTarget.id}
          target={{
            kind: "tutor",
            name: displayName(deletionTarget),
            email: deletionTarget.email,
            endpoint: pendingTutorDeletionEndpoint(deletionTarget.id),
            eligible: Boolean(management && tutors.some((tutor) => tutor.id === deletionTarget.id && canDeletePendingTutor(tutor, management))),
          }}
          onClose={() => setDeletionTarget(null)}
          onDeleted={() => pendingTutorDeleted(deletionTarget)}
          onRefresh={refreshDeletionContext}
        />
      ) : null}

      {canOnboardTutor ? (
        <TutorOnboardingDialog
          onCreated={() => setReloadKey((current) => current + 1)}
          onOpenChange={setDialogOpen}
          open={dialogOpen}
        />
      ) : null}
    </main>
  );
}

const detailToggleClasses = "rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50";

const pendingDeleteButtonClasses = "rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60";

export function AccountStatus({ status }: { status: string }) {
  return <span className={`student-status-badge is-${status === "active" ? "active" : "inactive"}`}>{accountStatusLabel(status)}</span>;
}

export function displayName(tutor: TutorProfile) {
  return tutor.preferredName?.trim() || `${tutor.firstName} ${tutor.lastName}`;
}

function accountStatusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
