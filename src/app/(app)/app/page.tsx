"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { tutorNavigation } from "@/components/dashboard/tutor-navigation";
import { TutorAccountSettings } from "@/components/tutor-account-settings";

type CurrentUser = {
  user?: {
    roles?: Array<{ roleKey: string }>;
  };
};

export default function AppGatewayPage() {
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [tutorWorkspace, setTutorWorkspace] = useState(false);

  useEffect(() => {
    let active = true;
    async function redirectByRole() {
      if (active) setUnavailable(false);
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401) {
            if (active) router.replace("/login");
            return;
          }
          if (active) setUnavailable(true);
          return;
        }
        const result = (await response.json()) as CurrentUser;
        const roles = result.user?.roles ?? [];
        const roleKeys = new Set(roles.map((role) => role.roleKey));
        if (active && roleKeys.has("tutor") && !roleKeys.has("owner") && !roleKeys.has("manager")) {
          setTutorWorkspace(true);
          return;
        }
        if (active) router.replace(roleHome(roles));
      } catch {
        if (active) setUnavailable(true);
      }
    }
    void redirectByRole();
    return () => {
      active = false;
    };
  }, [attempt, router]);

  if (tutorWorkspace) {
    return (
      <DashboardShell
        defaultDisplayName="Tutor"
        homeHref="/app"
        navigation={tutorNavigation}
        navigationLabel="Tutor navigation"
        searchPlaceholder="Search your Tution workspace"
      >
        <TutorAccountSettings />
      </DashboardShell>
    );
  }

  return (
    <main className="baseline-shell">
      <section className="baseline-card" aria-labelledby="app-gateway-title">
        <p className="eyebrow">{unavailable ? "Connection interrupted" : "Loading dashboard"}</p>
        <h1 id="app-gateway-title">{unavailable ? "Your session is still active." : "Preparing your workspace…"}</h1>
        <p>{unavailable ? "Reconnect and try again. Your dashboard destination has not been lost." : "We are sending you to the right Tution dashboard."}</p>
        {unavailable ? <button className="primary-button" onClick={() => setAttempt((value) => value + 1)} type="button">Try again</button> : null}
      </section>
    </main>
  );
}

function roleHome(roles: Array<{ roleKey: string }> = []): string {
  const roleKeys = new Set(roles.map((role) => role.roleKey));
  if (roleKeys.has("owner") || roleKeys.has("manager")) return "/app/admin";
  if (roleKeys.has("parent")) return "/app/parent";
  if (roleKeys.has("student")) return "/app/student";
  if (roleKeys.has("tutor")) return "/app";
  return "/login";
}
