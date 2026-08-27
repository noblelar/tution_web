"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import type { ParentProfile, ParentStudentLink, ParentStudentLinkList, StudentProfile, StudentProfileList } from "@/lib/profile-types";
import { formatAddress } from "./parent-management";

const defaultRelationshipType = "guardian";

export function ParentDetail({ parentProfileId }: { parentProfileId: string }) {
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [links, setLinks] = useState<ParentStudentLink[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadParent() {
      setLoading(true);
      setError("");
      try {
        const [parentResponse, linksResponse, studentsResponse] = await Promise.all([
          fetch(`/api/profiles/parents/${parentProfileId}`, { cache: "no-store" }),
          fetch(`/api/profiles/parent-student-links?parentProfileId=${encodeURIComponent(parentProfileId)}`, { cache: "no-store" }),
          fetch("/api/profiles/students", { cache: "no-store" }),
        ]);
        const parentResult = (await parentResponse.json()) as ParentProfile & { error?: string };
        const linksResult = (await linksResponse.json()) as ParentStudentLinkList & { error?: string };
        const studentsResult = (await studentsResponse.json()) as StudentProfileList & { error?: string };
        if (!parentResponse.ok) throw new Error(parentResult.error ?? "Parent profile could not be loaded.");
        if (!linksResponse.ok) throw new Error(linksResult.error ?? "Family relationships could not be loaded.");
        if (!studentsResponse.ok) throw new Error(studentsResult.error ?? "Students could not be loaded.");
        if (active) {
          setParent(parentResult);
          setLinks(linksResult.links);
          setStudents(studentsResult.students);
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
  }, [parentProfileId]);

  const studentMap = useMemo(() => new Map(students.map((student) => [student.id, student])), [students]);
  const linkedStudentIDs = new Set(links.map((link) => link.studentProfileId));
  const availableStudents = students.filter((student) => !linkedStudentIDs.has(student.id) && student.profileStatus === "active");

  async function createLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const studentProfileId = String(form.get("studentProfileId") ?? "");
    if (!studentProfileId) return;
    await mutateRelationship("create", "/api/profiles/parent-student-links", "POST", {
      parentProfileId,
      studentProfileId,
      relationshipType: String(form.get("relationshipType") ?? defaultRelationshipType),
      canViewBookings: form.get("canViewBookings") === "on",
      canBookLessons: form.get("canBookLessons") === "on",
      canReceiveReports: form.get("canReceiveReports") === "on",
      canManageCredits: form.get("canManageCredits") === "on",
    });
    event.currentTarget.reset();
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
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Family relationship update failed.");
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
          <p className="eyebrow">Parent profile</p>
          <h1 id="parent-detail-title">{parent.preferredName ?? "Parent / guardian"}</h1>
          <div className="student-detail-badges">
            <span className={`student-status-badge is-${parent.profileStatus}`}>{parent.profileStatus}</span>
            <span className={`student-status-badge ${parent.contactConsent ? "is-active" : "is-inactive"}`}>Contact consent {parent.contactConsent ? "on" : "off"}</span>
          </div>
        </div>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

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
          <h2>Create family link</h2>
          <p>Link this parent or guardian to an active student and set their initial permissions.</p>
          <form className="relationship-form" onSubmit={createLink}>
            <label>Student<select name="studentProfileId" required defaultValue=""><option value="" disabled>Select student</option>{availableStudents.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName} · {student.peopleCode}</option>)}</select></label>
            <label>Relationship<select name="relationshipType" defaultValue={defaultRelationshipType}><option value="mother">Mother</option><option value="father">Father</option><option value="guardian">Guardian</option><option value="carer">Carer</option><option value="step_parent">Step parent</option><option value="other">Other</option></select></label>
            <fieldset>
              <legend>Permissions</legend>
              <label><input defaultChecked name="canViewBookings" type="checkbox" /> View bookings</label>
              <label><input defaultChecked name="canBookLessons" type="checkbox" /> Book lessons</label>
              <label><input defaultChecked name="canReceiveReports" type="checkbox" /> Receive reports</label>
              <label><input defaultChecked name="canManageCredits" type="checkbox" /> Manage credits</label>
            </fieldset>
            <button disabled={pending !== "" || availableStudents.length === 0} type="submit"><Icon name="plus" size={16} /> Create link</button>
          </form>
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
