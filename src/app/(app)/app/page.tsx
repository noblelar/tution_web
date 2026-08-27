"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  user?: {
    roles?: Array<{ roleKey: string }>;
  };
};

export default function AppGatewayPage() {
  const router = useRouter();
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
        if (active) router.replace(roleHome(result.user?.roles));
      } catch {
        if (active) setUnavailable(true);
      }
    }
    void redirectByRole();
    return () => {
      active = false;
    };
  }, [attempt, router]);

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
  return "/login";
}
