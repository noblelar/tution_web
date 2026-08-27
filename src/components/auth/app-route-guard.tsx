"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

type AppRouteGuardProps = {
  allowedRoles: string[];
  children: ReactNode;
};

type CurrentUser = {
  user?: {
    roles?: Array<{ roleKey: string }>;
  };
};

export function AppRouteGuard({ allowedRoles, children }: AppRouteGuardProps) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "allowed" | "unavailable">("checking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (active) setState("checking");
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401) {
            if (active) router.replace("/login");
            return;
          }
          if (active) setState("unavailable");
          return;
        }
        const result = (await response.json()) as CurrentUser;
        const roles = new Set(result.user?.roles?.map((role) => role.roleKey) ?? []);
        if (allowedRoles.some((role) => roles.has(role))) {
          if (active) setState("allowed");
          return;
        }
        if (active) router.replace(roleHome(roles));
      } catch {
        if (active) setState("unavailable");
      }
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, [allowedRoles, attempt, router]);

  if (state !== "allowed") {
    return (
      <main className="baseline-shell">
        <section className="baseline-card" aria-live="polite">
          <p className="eyebrow">{state === "unavailable" ? "Connection interrupted" : "Checking access"}</p>
          <h1>{state === "unavailable" ? "Your session is still active." : "Preparing your workspace…"}</h1>
          <p>{state === "unavailable" ? "Reconnect and try again; you will remain on this page." : "We are confirming that this area belongs to your account."}</p>
          {state === "unavailable" ? <button className="primary-button" onClick={() => setAttempt((value) => value + 1)} type="button">Try again</button> : null}
        </section>
      </main>
    );
  }

  return children;
}

function roleHome(roleKeys: Set<string>): string {
  if (roleKeys.has("owner") || roleKeys.has("manager")) return "/app/admin";
  if (roleKeys.has("parent")) return "/app/parent";
  if (roleKeys.has("student")) return "/app/student";
  return "/login";
}
