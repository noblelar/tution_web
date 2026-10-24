"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { TutorOnboardingDialog } from "@/components/admin/onboarding-forms";
import { PendingStaffDeleteDialog } from "@/components/admin/pending-staff-delete-dialog";
import { Icon } from "@/components/dashboard";
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

  return (
    <main className="admin-main student-management" aria-labelledby="tutor-management-title">
      <header className="admin-dashboard-hero">
        <div>
          <h1 id="tutor-management-title">Tutors</h1>
        </div>
        {management?.canOnboardTutors ? (
          <button className="student-primary-action disabled:cursor-not-allowed disabled:opacity-50" disabled={!canOnboardTutor} onClick={() => setDialogOpen(true)} type="button">
            <Icon name="plus" size={16} />
            Onboard tutor
          </button>
        ) : null}
      </header>

      {deletionMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{deletionMessage}</p> : null}

      {management?.canOnboardTutors && management.centres.length === 0 ? (
        <p className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-950" role="alert">
          Tutor onboarding is unavailable until an active centre has been created.
        </p>
      ) : null}

      <section className="student-summary-grid" aria-label="Tutor profile summary">
        <SummaryCard label="Total tutors" value={String(tutors.length)} helper="Tutor profiles currently available to the organization." icon="users" />
        <SummaryCard label="Active profiles" value={String(activeCount)} helper="Tutors available for academic capability setup." icon="check" />
        <SummaryCard label="Pending activation" value={String(pendingCount)} helper="Tutor accounts awaiting invitation activation." icon="activity" />
        <SummaryCard label="Restricted access" value={String(restrictedCount)} helper="Tutor accounts currently suspended or disabled." icon="activity" />
        <SummaryCard label="Delivery issues" value={String(deliveryIssueCount)} helper="Pending tutor invitations whose latest email attempt failed." icon="activity" />
      </section>

      <section className="student-directory-panel" aria-label="Tutor directory">
        <form className="student-toolbar" onSubmit={(event: FormEvent) => event.preventDefault()}>
          <label className="student-search">
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search tutors</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email, phone, or centre" type="search" />
          </label>
          <label>
            <span>Account status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as TutorStatusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending_activation">Pending activation</option>
              <option value="suspended">Suspended</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label>
            <span>Centre</span>
            <select value={centreId} onChange={(event) => setCentreId(event.target.value)}>
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
            <div className="student-card-grid" aria-label="Tutor profile cards">
              {filteredTutors.slice(0, 6).map((tutor) => (
                <TutorProfileCard
                  key={tutor.id}
                  tutor={tutor}
                  onDelete={!loading && management && canDeletePendingTutor(tutor, management)
                    ? () => { setDeletionMessage(""); setDeletionTarget(tutor); }
                    : undefined}
                />
              ))}
            </div>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th scope="col">Tutor</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Primary centre</th>
                    <th scope="col">Account</th>
                    <th scope="col">Profile</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTutors.map((tutor) => (
                    <tr key={tutor.id}>
                      <td>
                        <strong>{displayName(tutor)}</strong>
                        <span>{tutor.preferredName ? `Legal name: ${tutor.firstName} ${tutor.lastName}` : "No preferred name"}</span>
                      </td>
                      <td>
                        <strong>{tutor.email}</strong>
                        <span>
                          {tutor.emailVerified
                            ? "Email verified"
                            : tutor.invitation?.emailDelivery?.status === "failed"
                              ? "Activation email failed"
                              : "Verification pending"}
                        </span>
                        <span>{tutor.phoneNumber ?? "Phone not recorded"}</span>
                      </td>
                      <td><strong>{tutor.primaryCentreName ?? "Not assigned"}</strong></td>
                      <td><AccountStatus status={tutor.accountStatus} /></td>
                      <td><StatusBadge status={tutor.profileStatus} /></td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link className="student-detail-link" href={`/app/admin/tutors?tutor=${tutor.id}`}>Open</Link>
                          {management && canDeletePendingTutor(tutor, management) ? (
                            <button className={pendingDeleteButtonClasses} disabled={loading} onClick={() => { setDeletionMessage(""); setDeletionTarget(tutor); }} type="button">Delete pending account</button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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

function SummaryCard({ label, value, helper, icon }: { label: string; value: string; helper: string; icon: "activity" | "check" | "grid" | "users" }) {
  return (
    <article className="student-summary-card">
      <span><Icon name={icon} size={18} /></span>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

const pendingDeleteButtonClasses = "rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60";

function TutorProfileCard({ tutor, onDelete }: { tutor: TutorProfile; onDelete?: () => void }) {
  return (
    <article className="student-profile-card">
      <header>
        <span>{initials(tutor)}</span>
        <div><h2>{displayName(tutor)}</h2><p>{tutor.primaryCentreName ?? "Centre not assigned"}</p></div>
      </header>
      <dl>
        <div><dt>Email</dt><dd>{tutor.email}</dd></div>
        <div><dt>Verification</dt><dd>{tutor.emailVerified ? "Verified" : "Pending"}</dd></div>
        <div><dt>Account</dt><dd>{accountStatusLabel(tutor.accountStatus)}</dd></div>
        <div><dt>Profile</dt><dd>{tutor.profileStatus}</dd></div>
      </dl>
      <Link href={`/app/admin/tutors?tutor=${tutor.id}`}>View tutor</Link>
      {onDelete ? <button className={`${pendingDeleteButtonClasses} mt-3 w-full`} onClick={onDelete} type="button">Delete pending account</button> : null}
    </article>
  );
}

export function AccountStatus({ status }: { status: string }) {
  return <span className={`student-status-badge is-${status === "active" ? "active" : "inactive"}`}>{accountStatusLabel(status)}</span>;
}

export function displayName(tutor: TutorProfile) {
  return tutor.preferredName?.trim() || `${tutor.firstName} ${tutor.lastName}`;
}

function initials(tutor: TutorProfile) {
  return `${tutor.firstName.charAt(0)}${tutor.lastName.charAt(0)}`.toUpperCase();
}

function accountStatusLabel(status: string) {
  return status.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
