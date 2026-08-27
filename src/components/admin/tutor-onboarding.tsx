"use client";

import { useState } from "react";

import { Icon } from "@/components/dashboard";
import { TutorOnboardingDialog } from "@/components/admin/onboarding-forms";

const tutorReadiness = [
  {
    label: "Tutor onboarding",
    value: "Active",
    helper: "Creates staff identity, centre assignment, profile, and invitation.",
    icon: "check" as const,
  },
  {
    label: "Centre assignment",
    value: "Included",
    helper: "Tutor setup requires a centre from the existing account context.",
    icon: "grid" as const,
  },
  {
    label: "Tutor directory",
    value: "Prepared",
    helper: "The page layout is ready; listing API support can be added in a future tutor slice.",
    icon: "book" as const,
  },
];

export function TutorOnboarding() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  return (
    <main className="admin-main" aria-labelledby="tutor-onboarding-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="tutor-onboarding-title">Tutors</h1>
          <p>Start tutor onboarding, centre assignment, profile creation, and invitation delivery from one clean workflow.</p>
        </div>
        <button className="student-primary-action" onClick={() => setDialogOpen(true)} type="button">
          <Icon name="plus" size={16} />
          Onboard tutor
        </button>
      </header>

      <section className="student-onboarding-next" aria-label="Tutor onboarding status">
        <Icon name="users" size={18} />
        <div>
          <h2>Manager-led tutor onboarding is active</h2>
          <p>
            This workflow creates the tutor account and profile through the existing onboarding API.
            {completedCount > 0 ? ` Created this session: ${completedCount}.` : ""}
          </p>
        </div>
      </section>

      <section className="student-summary-grid" aria-label="Tutor management readiness">
        {tutorReadiness.map((item) => (
          <article className="student-summary-card" key={item.label}>
            <span><Icon name={item.icon} size={18} /></span>
            <p>{item.label}</p>
            <strong>{item.value}</strong>
            <small>{item.helper}</small>
          </article>
        ))}
      </section>

      <section className="student-directory-panel" aria-label="Tutor directory preparation">
        <div className="tutor-directory-preview">
          <div>
            <p className="eyebrow">Directory readiness</p>
            <h2>Tutor list and detail views are prepared as the next vertical slice</h2>
            <p>
              The backend currently supports tutor creation through manager-led onboarding, but it does not yet expose a tutor listing/detail API.
              This page therefore stays honest: onboarding is live, while full tutor search, filters, cards, and lifecycle actions should be added once the tutor listing endpoint exists.
            </p>
          </div>
          <button className="student-primary-action" onClick={() => setDialogOpen(true)} type="button">
            <Icon name="plus" size={16} />
            Onboard tutor
          </button>
        </div>
      </section>

      <TutorOnboardingDialog
        onCreated={() => setCompletedCount((current) => current + 1)}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </main>
  );
}
