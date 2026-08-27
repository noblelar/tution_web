"use client";

import { useState } from "react";

import { Icon } from "@/components/dashboard";
import { TutorOnboardingDialog } from "@/components/admin/onboarding-forms";

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
          <h2>Manager-led tutor onboarding is ready</h2>
          <p>
            This phase wires the creation workflow. A full tutor directory can build on this once tutor listing endpoints are introduced.
            {completedCount > 0 ? ` Created this session: ${completedCount}.` : ""}
          </p>
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
