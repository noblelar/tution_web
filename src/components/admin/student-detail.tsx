"use client";

import { StudentAcademicPlacement } from "./student-academic-placement";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { Icon } from "@/components/dashboard";
import { FormDialog } from "@/components/ui/form-dialog";
import { RelationshipFields } from "./onboarding-forms";
import { ProfileInvitationPanel } from "./profile-invitation-panel";
import type { ParentProfile, ParentProfileList, ParentStudentLink, ParentStudentLinkList, ProfileAdminContext, StudentProfile } from "@/lib/profile-types";
import { AccessPills, formatDate, StatusBadge } from "./student-management";

export function StudentDetail({ studentProfileId }: { studentProfileId: string }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [canOnboard, setCanOnboard] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [guardians, setGuardians] = useState<ParentProfile[]>([]);
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [addGuardianOpen, setAddGuardianOpen] = useState(false);
  const [guardianEmail, setGuardianEmail] = useState("");
  const [lookupGuardian, setLookupGuardian] = useState<ParentProfile | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStudent() {
      setLoading(true);
      setError("");
      try {
        const [response, contextResponse, parentsResponse, linksResponse] = await Promise.all([
          fetch(`/api/profiles/students/${studentProfileId}`, { cache: "no-store" }),
          fetch("/api/profiles/admin/context", { cache: "no-store" }),
          fetch("/api/profiles/parents", { cache: "no-store" }),
          fetch(`/api/profiles/parent-student-links?studentProfileId=${encodeURIComponent(studentProfileId)}`, { cache: "no-store" }),
        ]);
        const result = (await response.json()) as StudentProfile & { error?: string };
        const contextResult = (await contextResponse.json()) as ProfileAdminContext & { error?: string };
        const parentsResult = (await parentsResponse.json()) as ParentProfileList & { error?: string };
        const linksResult = (await linksResponse.json()) as ParentStudentLinkList & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Student profile could not be loaded.");
        if (!contextResponse.ok) throw new Error(contextResult.error ?? "Onboarding capabilities could not be loaded.");
        if (!parentsResponse.ok) throw new Error(parentsResult.error ?? "Guardians could not be loaded.");
        if (!linksResponse.ok) throw new Error(linksResult.error ?? "Guardian links could not be loaded.");
        if (active) {
          setStudent(result);
          setCanOnboard(contextResult.canOnboardProfiles);
          setGuardians(parentsResult.parents);
          setLinks(linksResult.links);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Student profile could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStudent();
    return () => {
      active = false;
    };
  }, [studentProfileId, reloadKey]);

  async function addGuardian(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("guardian");
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken?: string };
      if (!csrfToken) throw new Error("Request verification failed.");
      const response = await fetch("/api/profiles/parent-student-links", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({
          parentProfileId: String(form.get("parentProfileId") ?? ""),
          studentProfileId,
          relationshipType: String(form.get("relationshipType") ?? "guardian"),
          relationshipDescription: String(form.get("relationshipDescription") ?? "").trim() || undefined,
          canViewBookings: true,
          canBookLessons: true,
          canReceiveReports: true,
          canManageCredits: true,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Guardian could not be linked.");
      setAddGuardianOpen(false);
      setGuardianEmail("");
      setLookupGuardian(null);
      setReloadKey((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Guardian could not be linked.");
    } finally {
      setPending("");
    }
  }

  async function findGuardian() {
    setError("");
    setLookupGuardian(null);
    if (!guardianEmail.trim() || !student?.primaryCentreId) {
      setError("Enter the guardian's exact email address.");
      return;
    }
    try {
      const response = await fetch(`/api/profiles/parents?email=${encodeURIComponent(guardianEmail.trim())}`, { cache: "no-store" });
      const result = (await response.json()) as ParentProfileList & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Guardian lookup failed.");
      const match = result.parents[0];
      if (!match) throw new Error("No guardian with that email is visible in your permitted centres.");
      setLookupGuardian(match);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Guardian lookup failed.");
    }
  }

  async function updateAccess(peopleCodeLoginEnabled: boolean) {
    await mutateStudent("access", `/api/profiles/students/${studentProfileId}/access`, {
      peopleCodeLoginEnabled,
    });
  }

  async function deactivate() {
    const reason = window.prompt("Enter the reason for deactivating this student profile.");
    if (!reason?.trim()) return;
    await mutateStudent("deactivate", `/api/profiles/students/${studentProfileId}/deactivate`, { reason });
  }

  async function reactivate() {
    await mutateStudent("reactivate", `/api/profiles/students/${studentProfileId}/reactivate`, {});
  }

  async function mutateStudent(action: string, path: string, body: Record<string, unknown>) {
    setPending(action);
    setError("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch(path, {
        method: action === "access" ? "PUT" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as StudentProfile & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Student profile update failed.");
      setStudent(result);
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Student profile update failed.");
    } finally {
      setPending("");
    }
  }

  if (loading) {
    return <main className="admin-main"><p className="student-state-message">Loading student profile…</p></main>;
  }

  if (error && !student) {
    return (
      <main className="admin-main">
        <Link className="student-back-link" href="/app/admin/students">← Back to students</Link>
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }

  if (!student) return null;

  return (
    <main className="admin-main student-detail" aria-labelledby="student-detail-title">
      <Link className="student-back-link" href="/app/admin/students">← Back to students</Link>
      <header className="student-detail-hero">
        <span>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
        <div>
          <p className="eyebrow">Student profile</p>
          <h1 id="student-detail-title">{student.firstName} {student.lastName}</h1>
          <div className="student-detail-badges">
            <StatusBadge status={student.profileStatus} />
            <AccessPills student={student} />
          </div>
        </div>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <ProfileInvitationPanel
        accountEmail={student.accountEmail}
        accountStatus={student.accountStatus}
        canManage={canOnboard}
        emailVerified={student.emailVerified}
        invitation={student.invitation}
        kind="student"
        onReissued={() => setReloadKey((value) => value + 1)}
        profileId={student.id}
      />

      <section className="student-detail-grid">
        <article className="student-detail-card">
          <h2>Profile summary</h2>
          <dl>
            <Detail label="People code" value={student.peopleCode} code />
            <Detail label="Date of birth" value={formatDate(student.dateOfBirth)} />
            <Detail label="Preferred name" value={student.preferredName ?? "Not recorded"} />
            <Detail label="Gender" value={student.gender ?? "Not recorded"} />
            <Detail label="School" value={student.schoolName ?? "Not recorded"} />
            <Detail label="Year group" value={student.academicYearGroup ?? "Not recorded"} />
          </dl>
        </article>

        <article className="student-detail-card">
          <h2>Access settings</h2>
          <p>{student.emailLoginEnabled ? "Email activation enables this student's login. People-code access is available only for an email-enabled student." : "This student is an operational record for attendance and administration, but cannot sign in."}</p>
          <div className="student-action-stack">
            {student.emailLoginEnabled ? <button disabled={pending !== ""} onClick={() => updateAccess(!student.peopleCodeLoginEnabled)} type="button">
              <Icon name="settings" size={16} />
              {student.peopleCodeLoginEnabled ? "Disable people-code login" : "Enable people-code login"}
            </button> : null}
            {student.profileStatus === "active" ? (
              <button className="is-danger" disabled={pending !== ""} onClick={deactivate} type="button">
                <Icon name="close" size={16} />
                Deactivate profile
              </button>
            ) : (
              <button disabled={pending !== ""} onClick={reactivate} type="button">
                <Icon name="check" size={16} />
                Reactivate profile
              </button>
            )}
          </div>
        </article>

        <article className="student-detail-card is-wide">
          <h2>Parents and guardians</h2>
          <p>{links.length === 0 ? "No guardians are linked yet." : `${links.length} guardian relationship${links.length === 1 ? "" : "s"} recorded.`}</p>
          <ul className="mt-3 space-y-2">
            {links.map((link) => {
              const guardian = guardians.find((item) => item.id === link.parentProfileId);
              return <li className="rounded-lg border border-slate-200 p-3" key={link.id}>{guardian?.preferredName ?? guardian?.accountEmail ?? "Guardian"} · {link.relationshipType.replaceAll("_", " ")} · {link.linkStatus}</li>;
            })}
          </ul>
          {canOnboard ? <button className="mt-4 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white" onClick={() => setAddGuardianOpen(true)} type="button">Link another guardian</button> : null}
        </article>
        <StudentAcademicPlacement preferredCentreId={student.primaryCentreId} studentProfileId={student.id} />
      </section>
      <FormDialog description="Connect an existing guardian profile to this student." onOpenChange={setAddGuardianOpen} open={addGuardianOpen} title="Link guardian">
        <form className="space-y-4 p-5" onSubmit={addGuardian}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="min-w-0 flex-1 font-medium">Find by exact email
              <input className="mt-1 w-full rounded-lg border border-slate-300 p-2" onChange={(event) => { setGuardianEmail(event.target.value); setLookupGuardian(null); }} type="email" value={guardianEmail} />
            </label>
            <button className="rounded-lg border border-slate-300 px-4 py-2 font-medium" onClick={findGuardian} type="button">Find</button>
          </div>
          <label className="block font-medium">Existing guardian
            <select className="mt-1 w-full rounded-lg border border-slate-300 p-2" name="parentProfileId" required>
              <option value="">Select guardian</option>
              {[...guardians, ...(lookupGuardian && !guardians.some((guardian) => guardian.id === lookupGuardian.id) ? [lookupGuardian] : [])].filter((guardian) => !links.some((link) => link.parentProfileId === guardian.id && link.linkStatus === "active")).map((guardian) => (
                <option key={guardian.id} value={guardian.id}>{guardian.preferredName ?? guardian.accountEmail ?? guardian.peopleCode} · {guardian.peopleCode}</option>
              ))}
            </select>
          </label>
          <RelationshipFields />
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <button className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={pending !== ""} type="submit">{pending ? "Linking…" : "Link guardian"}</button>
        </form>
      </FormDialog>
    </main>
  );
}

function Detail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{code ? <code>{value}</code> : value}</dd>
    </div>
  );
}
