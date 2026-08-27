"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import { ParentOnboardingDialog, ParentStudentOnboardingDialog } from "@/components/admin/onboarding-forms";
import type { ParentProfile, ParentProfileList, ParentStudentLinkList } from "@/lib/profile-types";

type ParentStatusFilter = "all" | "active" | "inactive";

export function ParentManagement() {
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [links, setLinks] = useState<ParentStudentLinkList["links"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ParentStatusFilter>("all");
  const [parentDialogOpen, setParentDialogOpen] = useState(false);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadParents() {
      setLoading(true);
      setError("");
      try {
        const [parentsResponse, linksResponse] = await Promise.all([
          fetch("/api/profiles/parents", { cache: "no-store" }),
          fetch("/api/profiles/parent-student-links", { cache: "no-store" }),
        ]);
        const parentsResult = (await parentsResponse.json()) as ParentProfileList & { error?: string };
        const linksResult = (await linksResponse.json()) as ParentStudentLinkList & { error?: string };
        if (!parentsResponse.ok) throw new Error(parentsResult.error ?? "Parent profiles could not be loaded.");
        if (!linksResponse.ok) throw new Error(linksResult.error ?? "Family links could not be loaded.");
        if (active) {
          setParents(parentsResult.parents);
          setLinks(linksResult.links);
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Parent profiles could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadParents();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const linkCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const link of links) {
      if (link.linkStatus !== "active") continue;
      counts.set(link.parentProfileId, (counts.get(link.parentProfileId) ?? 0) + 1);
    }
    return counts;
  }, [links]);

  const filteredParents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return parents.filter((parent) => {
      const searchable = [
        parent.preferredName,
        parent.peopleCode,
        parent.phoneNumber,
        parent.city,
        parent.postalCode,
      ].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = normalizedQuery === "" || searchable.includes(normalizedQuery);
      const matchesStatus = status === "all" || parent.profileStatus === status;
      return matchesQuery && matchesStatus;
    });
  }, [parents, query, status]);

  const activeCount = parents.filter((parent) => parent.profileStatus === "active").length;
  const withLinkedStudents = parents.filter((parent) => (linkCounts.get(parent.id) ?? 0) > 0).length;
  const consentCount = parents.filter((parent) => parent.contactConsent).length;

  return (
    <main className="admin-main parent-management" aria-labelledby="parent-management-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="parent-management-title">Parents & guardians</h1>
          <p>Search, review, and manage parent profiles, linked students, relationship coverage, and permission readiness.</p>
        </div>
        <button className="student-primary-action" onClick={() => setParentDialogOpen(true)} type="button">
          <Icon name="plus" size={16} />
          Onboard parent
        </button>
      </header>

      <section className="student-summary-grid" aria-label="Parent profile summary">
        <SummaryCard label="Total parents" value={String(parents.length)} helper="Managed parent and guardian profiles." icon="users" />
        <SummaryCard label="Active profiles" value={String(activeCount)} helper="Parents available for ordinary platform use." icon="check" />
        <SummaryCard label="With linked students" value={String(withLinkedStudents)} helper="Parents with at least one active child relationship." icon="grid" />
        <SummaryCard label="Contact consent" value={String(consentCount)} helper="Profiles with contact consent enabled." icon="activity" />
      </section>

      <section className="student-directory-panel" aria-label="Parent directory">
        <form className="student-toolbar parent-toolbar" onSubmit={(event: FormEvent) => event.preventDefault()}>
          <label className="student-search">
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search parents</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, people code, phone, city, or postcode" type="search" />
          </label>
          <label>
            <span>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as ParentStatusFilter)}>
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </form>

        {loading ? <p className="student-state-message">Loading parent profiles…</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        {!loading && !error && filteredParents.length === 0 ? (
          <div className="student-empty-state">
            <Icon name="users" size={26} />
            <h2>No parent profiles found</h2>
            <p>Once parents are onboarded, this directory will show their profile, people code, linked students, and permissions.</p>
          </div>
        ) : null}

        {filteredParents.length > 0 ? (
          <>
            <div className="student-card-grid" aria-label="Parent profile cards">
              {filteredParents.slice(0, 6).map((parent) => (
                <ParentProfileCard linkedStudents={linkCounts.get(parent.id) ?? 0} key={parent.id} parent={parent} />
              ))}
            </div>
            <div className="student-table-wrap">
              <table className="student-table">
                <thead>
                  <tr>
                    <th scope="col">Parent</th>
                    <th scope="col">People code</th>
                    <th scope="col">Contact</th>
                    <th scope="col">Linked students</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParents.map((parent) => (
                    <tr key={parent.id}>
                      <td>
                        <strong>{parent.preferredName ?? "Parent / guardian"}</strong>
                        <span>{formatAddress(parent)}</span>
                      </td>
                      <td><code>{parent.peopleCode}</code></td>
                      <td>
                        <strong>{parent.phoneNumber ?? "Phone not recorded"}</strong>
                        <span>{parent.contactConsent ? "Contact consent on" : "Contact consent off"}</span>
                      </td>
                      <td><strong>{linkCounts.get(parent.id) ?? 0}</strong></td>
                      <td><span className={`student-status-badge is-${parent.profileStatus}`}>{parent.profileStatus}</span></td>
                      <td><Link className="student-detail-link" href={`/app/admin/parents/${parent.id}`}>Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>

      <section className="student-onboarding-next" id="onboarding-next" aria-label="Parent onboarding phase notice">
        <Icon name="plus" size={18} />
        <div>
          <h2>Parent and family onboarding is active</h2>
          <p>Create a parent profile on its own, or create a parent and student together when the child does not need an email login.</p>
          <div className="onboarding-action-row">
            <button className="student-primary-action" onClick={() => setParentDialogOpen(true)} type="button">Onboard parent</button>
            <button className="student-secondary-action" onClick={() => setFamilyDialogOpen(true)} type="button">Onboard parent + student</button>
          </div>
        </div>
      </section>

      <ParentOnboardingDialog
        onCreated={() => setReloadKey((current) => current + 1)}
        onOpenChange={setParentDialogOpen}
        open={parentDialogOpen}
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

function ParentProfileCard({ parent, linkedStudents }: { parent: ParentProfile; linkedStudents: number }) {
  const initials = (parent.preferredName ?? "PG").split(" ").slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
  return (
    <article className="student-profile-card">
      <header>
        <span>{initials}</span>
        <div>
          <h2>{parent.preferredName ?? "Parent / guardian"}</h2>
          <p>{formatAddress(parent)}</p>
        </div>
      </header>
      <dl>
        <div><dt>People code</dt><dd>{parent.peopleCode}</dd></div>
        <div><dt>Linked students</dt><dd>{linkedStudents}</dd></div>
        <div><dt>Consent</dt><dd>{parent.contactConsent ? "On" : "Off"}</dd></div>
      </dl>
      <Link href={`/app/admin/parents/${parent.id}`}>View parent</Link>
    </article>
  );
}

export function formatAddress(parent: ParentProfile) {
  return [parent.city, parent.postalCode, parent.country].filter(Boolean).join(", ") || "Address not recorded";
}
