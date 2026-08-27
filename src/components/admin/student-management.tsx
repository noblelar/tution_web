"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import { ParentStudentOnboardingDialog, StudentOnboardingDialog } from "@/components/admin/onboarding-forms";
import type { ParentProfile, ParentProfileList, StudentProfile, StudentProfileList } from "@/lib/profile-types";

type StudentStatusFilter = "all" | "active" | "inactive";
type StudentAccessFilter = "all" | "people-code" | "email" | "no-email";

export function StudentManagement() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StudentStatusFilter>("all");
  const [access, setAccess] = useState<StudentAccessFilter>("all");
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadStudents() {
      setLoading(true);
      setError("");
      try {
        const [studentsResponse, parentsResponse] = await Promise.all([
          fetch("/api/profiles/students", { cache: "no-store" }),
          fetch("/api/profiles/parents", { cache: "no-store" }),
        ]);
        const studentsResult = (await studentsResponse.json()) as StudentProfileList & { error?: string };
        const parentsResult = (await parentsResponse.json()) as ParentProfileList & { error?: string };
        if (!studentsResponse.ok) {
          throw new Error(studentsResult.error ?? "Student profiles could not be loaded.");
        }
        if (!parentsResponse.ok) {
          throw new Error(parentsResult.error ?? "Parent profiles could not be loaded.");
        }
        if (active) {
          setStudents(studentsResult.students);
          setParents(parentsResult.parents);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Student profiles could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadStudents();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const filteredStudents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return students.filter((student) => {
      const searchable = [
        student.firstName,
        student.lastName,
        student.preferredName,
        student.peopleCode,
        student.schoolName,
        student.academicYearGroup,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = normalizedQuery === "" || searchable.includes(normalizedQuery);
      const matchesStatus = status === "all" || student.profileStatus === status;
      const matchesAccess =
        access === "all" ||
        (access === "people-code" && student.peopleCodeLoginEnabled) ||
        (access === "email" && student.emailLoginEnabled) ||
        (access === "no-email" && !student.emailLoginEnabled);
      return matchesQuery && matchesStatus && matchesAccess;
    });
  }, [access, query, status, students]);

  const activeCount = students.filter((student) => student.profileStatus === "active").length;
  const noEmailCount = students.filter((student) => !student.emailLoginEnabled).length;
  const peopleCodeCount = students.filter((student) => student.peopleCodeLoginEnabled).length;

  return (
    <main className="admin-main student-management" aria-labelledby="student-management-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="student-management-title">Students</h1>
          <p>Search, review, and manage student profiles, people-code visibility, access status, and lifecycle readiness.</p>
        </div>
        <button className="student-primary-action" onClick={() => setStudentDialogOpen(true)} type="button">
          <Icon name="plus" size={16} />
          Onboard student
        </button>
      </header>

      <section className="student-summary-grid" aria-label="Student profile summary">
        <SummaryCard label="Total students" value={String(students.length)} helper="Managed student profiles loaded from the profile module." icon="users" />
        <SummaryCard label="Active profiles" value={String(activeCount)} helper="Students available for ordinary platform use." icon="check" />
        <SummaryCard label="No email login" value={String(noEmailCount)} helper="Students relying on parent linkage and people-code access." icon="grid" />
        <SummaryCard label="People-code login" value={String(peopleCodeCount)} helper="Students with people-code + date-of-birth access enabled." icon="activity" />
      </section>

      <section className="student-directory-panel" aria-label="Student directory">
        <form className="student-toolbar" onSubmit={(event: FormEvent) => event.preventDefault()}>
          <label className="student-search">
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search students</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, people code, school, or year group" type="search" />
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as StudentStatusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            <span>Access</span>
            <select value={access} onChange={(event) => setAccess(event.target.value as StudentAccessFilter)}>
              <option value="all">All access</option>
              <option value="people-code">People code enabled</option>
              <option value="email">Email login enabled</option>
              <option value="no-email">No email login</option>
            </select>
          </label>
        </form>

        {loading ? <p className="student-state-message">Loading student profiles…</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {!loading && !error && filteredStudents.length === 0 ? (
          <div className="student-empty-state">
            <Icon name="users" size={26} />
            <h2>No student profiles found</h2>
            <p>Once students are onboarded, this directory will show their profile, people code, access settings, and lifecycle status.</p>
          </div>
        ) : null}

        {filteredStudents.length > 0 ? (
          <>
            <div className="student-card-grid" aria-label="Student profile cards">
              {filteredStudents.slice(0, 6).map((student) => (
                <StudentProfileCard key={student.id} student={student} />
              ))}
            </div>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th scope="col">Student</th>
                    <th scope="col">People code</th>
                    <th scope="col">School / year</th>
                    <th scope="col">Access</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <strong>{student.firstName} {student.lastName}</strong>
                        <span>{student.preferredName ? `Preferred: ${student.preferredName}` : "No preferred name"}</span>
                      </td>
                      <td><code>{student.peopleCode}</code></td>
                      <td>
                        <strong>{student.schoolName ?? "School not recorded"}</strong>
                        <span>{student.academicYearGroup ?? "Year group not recorded"}</span>
                      </td>
                      <td><AccessPills student={student} /></td>
                      <td><StatusBadge status={student.profileStatus} /></td>
                      <td><Link className="student-detail-link" href={`/app/admin/students/${student.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="student-onboarding-next" id="onboarding-next" aria-label="Student onboarding phase notice">
        <Icon name="plus" size={18} />
        <div>
          <h2>Manager-led onboarding is active</h2>
          <p>Use the student workflow for independent students or existing-parent students. Use the family workflow when a parent and child should be created together.</p>
          <div className="onboarding-action-row">
            <button className="student-primary-action" onClick={() => setStudentDialogOpen(true)} type="button">Onboard student</button>
            <button className="student-secondary-action" onClick={() => setFamilyDialogOpen(true)} type="button">Onboard parent + student</button>
          </div>
        </div>
      </section>

      <StudentOnboardingDialog
        onCreated={() => setReloadKey((current) => current + 1)}
        onOpenChange={setStudentDialogOpen}
        open={studentDialogOpen}
        parents={parents}
      />
      <ParentStudentOnboardingDialog
        onCreated={() => setReloadKey((current) => current + 1)}
        onOpenChange={setFamilyDialogOpen}
        open={familyDialogOpen}
      />
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

function StudentProfileCard({ student }: { student: StudentProfile }) {
  return (
    <article className="student-profile-card">
      <header>
        <span>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
        <div>
          <h2>{student.firstName} {student.lastName}</h2>
          <p>{student.schoolName ?? "School not recorded"}</p>
        </div>
      </header>
      <dl>
        <div><dt>People code</dt><dd>{student.peopleCode}</dd></div>
        <div><dt>Date of birth</dt><dd>{formatDate(student.dateOfBirth)}</dd></div>
        <div><dt>Year group</dt><dd>{student.academicYearGroup ?? "Not recorded"}</dd></div>
      </dl>
      <AccessPills student={student} />
      <Link href={`/app/admin/students/${student.id}`}>View student</Link>
    </article>
  );
}

export function AccessPills({ student }: { student: StudentProfile }) {
  return (
    <div className="student-access-pills">
      <span className={student.emailLoginEnabled ? "is-enabled" : "is-muted"}>Email {student.emailLoginEnabled ? "on" : "off"}</span>
      <span className={student.peopleCodeLoginEnabled ? "is-enabled" : "is-muted"}>Code {student.peopleCodeLoginEnabled ? "on" : "off"}</span>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`student-status-badge is-${status}`}>{status}</span>;
}

export function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}
