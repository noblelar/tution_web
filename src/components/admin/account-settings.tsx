"use client";

import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";

type CurrentUser = {
  user?: {
    id: string;
    organizationId: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: Array<{ roleKey: string; assignmentScope: string; centreId?: string }>;
  };
  error?: string;
};

export function AccountSettings() {
  const [currentUser, setCurrentUser] = useState<CurrentUser["user"]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadCurrentUser() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const result = (await response.json()) as CurrentUser;
        if (!response.ok) throw new Error(result.error ?? "Your account details could not be loaded.");
        if (active) setCurrentUser(result.user);
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Your account details could not be loaded.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCurrentUser();
    return () => {
      active = false;
    };
  }, []);

  const roleSummary = useMemo(() => {
    const roles = currentUser?.roles.map((role) => role.roleKey) ?? [];
    return roles.length ? roles.join(" · ") : "No active role grants";
  }, [currentUser]);

  return (
    <main className="admin-main account-settings" aria-labelledby="account-settings-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="account-settings-title">Settings</h1>
          <p>Review your signed-in manager or owner account, session controls, and profile-editing readiness.</p>
        </div>
      </header>

      {loading ? <p className="student-state-message">Loading your account settings…</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {currentUser ? (
        <section className="student-detail-grid">
          <article className="student-detail-card">
            <h2>Your account</h2>
            <p>This information comes from the authenticated session and is safe to display in the dashboard.</p>
            <dl>
              <div><dt>Name</dt><dd>{currentUser.firstName} {currentUser.lastName}</dd></div>
              <div><dt>Email</dt><dd>{currentUser.email}</dd></div>
              <div><dt>Roles</dt><dd>{roleSummary}</dd></div>
              <div><dt>User ID</dt><dd><code>{currentUser.id}</code></dd></div>
            </dl>
          </article>

          <article className="student-detail-card">
            <h2>Profile editing</h2>
            <p>
              Manager and owner self-profile editing is approved as a product direction, but the current backend does not yet expose a safe self-service update endpoint.
              For now, this area is intentionally read-only instead of showing fake editable controls.
            </p>
            <div className="settings-readiness-list">
              <span><Icon name="check" size={15} /> Current identity display is ready</span>
              <span><Icon name="check" size={15} /> Session controls are available in the top-right account menu</span>
              <span><Icon name="settings" size={15} /> Self-edit API should be added before live profile editing</span>
            </div>
          </article>

          <article className="student-detail-card is-wide">
            <h2>Parent profile changes</h2>
            <p>
              Parent profile edits remain manager-controlled. Parents should contact the institution when their details need correction,
              and staff can update parent-facing profile data once the dedicated manager edit workflow is implemented.
            </p>
          </article>
        </section>
      ) : null}
    </main>
  );
}
