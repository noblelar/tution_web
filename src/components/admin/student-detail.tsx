"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/dashboard";
import type { StudentProfile } from "@/lib/profile-types";
import { AccessPills, formatDate, StatusBadge } from "./student-management";

export function StudentDetail({ studentProfileId }: { studentProfileId: string }) {
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadStudent() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/profiles/students/${studentProfileId}`, { cache: "no-store" });
        const result = (await response.json()) as StudentProfile & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Student profile could not be loaded.");
        if (active) setStudent(result);
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
  }, [studentProfileId]);

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
          <p>People-code login uses the student people code and date of birth. Email login is available only when the student has a linked user account.</p>
          <div className="student-action-stack">
            <button disabled={pending !== ""} onClick={() => updateAccess(!student.peopleCodeLoginEnabled)} type="button">
              <Icon name="settings" size={16} />
              {student.peopleCodeLoginEnabled ? "Disable people-code login" : "Enable people-code login"}
            </button>
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
          <h2>Family relationship readiness</h2>
          <p>Parent and guardian links will be managed in Phase 4. This student detail view is prepared to show linked adults, relationship type, and permissions for bookings, lessons, reports, and credits.</p>
        </article>
      </section>
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
