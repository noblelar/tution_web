"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import { FormDialog } from "@/components/ui/form-dialog";
import { RelationshipFields } from "./onboarding-forms";
import { ProfileInvitationPanel } from "./profile-invitation-panel";
import type { ParentProfile, ParentStudentLink, ParentStudentLinkList, ProfileAdminContext, StudentProfile, StudentProfileList } from "@/lib/profile-types";
import { formatAddress } from "./parent-management";

const defaultRelationshipType = "guardian";

export function ParentDetail({ parentProfileId }: { parentProfileId: string }) {
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [canOnboard, setCanOnboard] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadParent() {
      setLoading(true);
      setError("");
      try {
        const [parentResponse, linksResponse, studentsResponse, contextResponse] = await Promise.all([
          fetch(`/api/profiles/parents/${parentProfileId}`, { cache: "no-store" }),
          fetch(`/api/profiles/parent-student-links?parentProfileId=${encodeURIComponent(parentProfileId)}`, { cache: "no-store" }),
          fetch("/api/profiles/students", { cache: "no-store" }),
          fetch("/api/profiles/admin/context", { cache: "no-store" }),
        ]);
        const parentResult = (await parentResponse.json()) as ParentProfile & { error?: string };
        const linksResult = (await linksResponse.json()) as ParentStudentLinkList & { error?: string };
        const studentsResult = (await studentsResponse.json()) as StudentProfileList & { error?: string };
        const contextResult = (await contextResponse.json()) as ProfileAdminContext & { error?: string };
        if (!parentResponse.ok) throw new Error(parentResult.error ?? "Parent profile could not be loaded.");
        if (!linksResponse.ok) throw new Error(linksResult.error ?? "Family relationships could not be loaded.");
        if (!studentsResponse.ok) throw new Error(studentsResult.error ?? "Students could not be loaded.");
        if (!contextResponse.ok) throw new Error(contextResult.error ?? "Onboarding capabilities could not be loaded.");
        if (active) {
          setParent(parentResult);
          setLinks(linksResult.links);
          setStudents(studentsResult.students);
          setCanOnboard(contextResult.canOnboardProfiles);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Parent profile could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadParent();
    return () => {
      active = false;
    };
  }, [parentProfileId, reloadKey]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const linkedStudentIDs = new Set(links.map((link) => link.studentProfileId));
  const availableStudents = students.filter((student) => !linkedStudentIDs.has(student.id) && student.profileStatus === "active");

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const studentProfileId = String(form.get("studentProfileId") ?? "");
    if (!studentProfileId) return;
    const created = await mutateRelationship("create", "/api/profiles/parent-student-links", "POST", {
      parentProfileId,
      studentProfileId,
      relationshipType: String(form.get("relationshipType") ?? defaultRelationshipType),
      relationshipDescription: String(form.get("relationshipDescription") ?? "").trim() || undefined,
      canViewBookings: true,
      canBookLessons: true,
      canReceiveReports: true,
      canManageCredits: true,
    });
    if (!created) return;
    formElement.reset();
    setLinkDialogOpen(false);
    setReloadKey((value) => value + 1);
  }

  async function updateLink(link: ParentStudentLink, patch: Partial<ParentStudentLink>) {
    await mutateRelationship("update", `/api/profiles/parent-student-links/${link.id}`, "PUT", {
      relationshipType: patch.relationshipType ?? link.relationshipType,
      canViewBookings: patch.canViewBookings ?? link.canViewBookings,
      canBookLessons: patch.canBookLessons ?? link.canBookLessons,
      canReceiveReports: patch.canReceiveReports ?? link.canReceiveReports,
      canManageCredits: patch.canManageCredits ?? link.canManageCredits,
    });
  }

  async function changeLinkStatus(link: ParentStudentLink) {
    if (link.linkStatus === "active") {
      const reason = window.prompt("Enter the reason for deactivating this family relationship.");
      if (!reason?.trim()) return;
      await mutateRelationship("deactivate", `/api/profiles/parent-student-links/${link.id}/deactivate`, "POST", { reason });
      return;
    }
    await mutateRelationship("reactivate", `/api/profiles/parent-student-links/${link.id}/reactivate`, "POST", {});
  }

  async function mutateRelationship(action: string, path: string, method: "POST" | "PUT", body: Record<string, unknown>) {
    setPending(action);
    setError("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Request verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch(path, {
        method,
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify(body),
      });
      const result = (await response.json()) as ParentStudentLink & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Family relationship update failed.");
      setLinks((current) => {
        const exists = current.some((link) => link.id === result.id);
        return exists ? current.map((link) => (link.id === result.id ? result : link)) : [result, ...current];
      });
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Family relationship update failed.");
      return false;
    } finally {
      setPending("");
    }
  }

  if (loading) {
    return <main className="admin-main"><p className="student-state-message">Loading parent profile…</p></main>;
  }

  if (error && !parent) {
    return (
      <main className="admin-main">
        <Link className="student-back-link" href="/app/admin/parents">← Back to parents</Link>
        <p className="form-error" role="alert">{error}</p>
      </main>
    );
  }

  if (!parent) return null;

  return (
    <main className="admin-main parent-detail" aria-labelledby="parent-detail-title">
      <Link className="student-back-link" href="/app/admin/parents">← Back to parents</Link>
      <header className="student-detail-hero">
        <span>{(parent.preferredName ?? "PG").split(" ").slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase()}</span>
        <div>
          <h1 id="parent-detail-title">{parent.preferredName ?? "Parent / guardian"}</h1>
          <div className="student-detail-badges">
            <span className={`student-status-badge is-${parent.profileStatus}`}>{parent.profileStatus}</span>
            <span className={`student-status-badge ${parent.contactConsent ? "is-active" : "is-inactive"}`}>Contact consent {parent.contactConsent ? "on" : "off"}</span>
          </div>
        </div>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <ProfileInvitationPanel
        accountEmail={parent.accountEmail}
        accountStatus={parent.accountStatus}
        canManage={canOnboard}
        emailVerified={parent.emailVerified}
        invitation={parent.invitation}
        kind="parent"
        onReissued={() => setReloadKey((value) => value + 1)}
        profileId={parent.id}
      />

      <section className="student-detail-grid">
        <article className="student-detail-card">
          <h2>Parent summary</h2>
          <dl>
            <Detail label="People code" value={parent.peopleCode} code />
            <Detail label="Phone" value={parent.phoneNumber ?? "Not recorded"} />
            <Detail label="Address" value={formatAddress(parent)} />
            <Detail label="Marketing opt-in" value={parent.marketingOptIn ? "On" : "Off"} />
          </dl>
        </article>

        <article className="student-detail-card">
          <h2>Link another student</h2>
          <p>Connect this guardian to an existing student. Standard guardian permissions are applied automatically.</p>
          {canOnboard ? <button className="mt-4 rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={availableStudents.length === 0} onClick={() => setLinkDialogOpen(true)} type="button"><Icon name="plus" size={16} /> Link student</button> : null}
        </article>

        <article className="student-detail-card is-wide">
          <h2>Linked students and permissions</h2>
          <div className="relationship-list">
            {links.length === 0 ? <p>No students are linked to this parent yet.</p> : null}
            {links.map((link) => {
              const student = studentMap.get(link.studentProfileId);
              return (
                <section className="relationship-card" key={link.id}>
                  <header>
                    <div>
                      <h3>{student ? `${student.firstName} ${student.lastName}` : "Student profile"}</h3>
                      <p>{student?.peopleCode ?? link.studentProfileId} · {link.relationshipType.replace("_", " ")}</p>
                    </div>
                    <button disabled={pending !== ""} onClick={() => changeLinkStatus(link)} type="button">{link.linkStatus === "active" ? "Deactivate" : "Reactivate"}</button>
                  </header>
                  <div className="relationship-permissions">
                    <PermissionToggle label="View bookings" checked={link.canViewBookings} onChange={(checked) => updateLink(link, { canViewBookings: checked })} />
                    <PermissionToggle label="Book lessons" checked={link.canBookLessons} onChange={(checked) => updateLink(link, { canBookLessons: checked })} />
                    <PermissionToggle label="Receive reports" checked={link.canReceiveReports} onChange={(checked) => updateLink(link, { canReceiveReports: checked })} />
                    <PermissionToggle label="Manage credits" checked={link.canManageCredits} onChange={(checked) => updateLink(link, { canManageCredits: checked })} />
                  </div>
                </section>
              );
            })}
          </div>
        </article>
      </section>
      <FormDialog description="Connect this guardian to an existing student." onOpenChange={setLinkDialogOpen} open={linkDialogOpen} title="Link student">
        <form className="space-y-4 p-5" onSubmit={createLink}>
          <label className="block font-medium">Student
            <select className="mt-1 w-full rounded-lg border border-slate-300 p-2" name="studentProfileId" required defaultValue="">
              <option value="" disabled>Select student</option>
              {availableStudents.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.peopleCode}</option>)}
            </select>
          </label>
          <RelationshipFields />
          {error ? <p className="text-sm text-red-700" role="alert">{error}</p> : null}
          <button className="rounded-lg bg-orange-600 px-4 py-2 font-semibold text-white disabled:opacity-50" disabled={pending !== ""} type="submit">{pending ? "Linking…" : "Link student"}</button>
        </form>
      </FormDialog>
    </main>
  );
}

function Detail({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return <div><dt>{label}</dt><dd>{code ? <code>{value}</code> : value}</dd></div>;
}

function PermissionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
