"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type CurrentUser = {
  user?: {
    roles?: Array<{ roleKey: string }>;
  };
};

export default function AppGatewayPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;
    async function redirectByRole() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (active) router.replace("/login");
          return;
        }
        const result = (await response.json()) as CurrentUser;
        if (active) router.replace(roleHome(result.user?.roles));
      } catch {
        if (active) router.replace("/login");
      }
    }
    void redirectByRole();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="baseline-shell">
      <section className="baseline-card" aria-labelledby="app-gateway-title">
        <p className="eyebrow">Loading dashboard</p>
        <h1 id="app-gateway-title">Preparing your workspace…</h1>
        <p>We are sending you to the right Tution dashboard.</p>
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
