"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

type CurrentUser = { roles?: Array<{ roleKey?: string; role_key?: string }> };

export function CentreSetupGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function check() {
      if (pathname.startsWith("/app/admin/centres")) {
        if (active) setChecking(false);
        return;
      }
      setChecking(true);
      try {
        const [userResponse, centreResponse] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/centres", { cache: "no-store" }),
        ]);
        if (!userResponse.ok || !centreResponse.ok) return;
        const userResult = (await userResponse.json()) as { user?: CurrentUser };
        const centreResult = (await centreResponse.json()) as { centres?: unknown[] };
        const isOwner = userResult.user?.roles?.some((role) => (role.roleKey ?? role.role_key ?? "").toLowerCase() === "owner") ?? false;
        if (active && isOwner && (centreResult.centres?.length ?? 0) === 0 && pathname !== "/app/admin") {
          router.replace("/app/admin/centres");
          return;
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (checking && !pathname.startsWith("/app/admin/centres")) {
    return <p className="loading-state" role="status">Checking organization setup…</p>;
  }
  return children;
}
