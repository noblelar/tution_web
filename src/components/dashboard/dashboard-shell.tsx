"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { NotificationMenu } from "./notification-menu";
import { studentNavigation } from "./student-navigation";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: IconName;
};

type DashboardShellProps = {
  children: ReactNode;
  defaultDisplayName?: string;
  homeHref?: string;
  navigation?: DashboardNavItem[];
  navigationLabel?: string;
  searchPlaceholder?: string;
  showSearch?: boolean;
};

type CurrentUser = {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    roles?: Array<{ roleKey: string }>;
  };
};

export function DashboardShell({
  children,
  defaultDisplayName = "Student",
  homeHref = "/app/student",
  navigation = studentNavigation,
  navigationLabel = "Student navigation",
  searchPlaceholder = "Search",
  showSearch = true,
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [displayRole, setDisplayRole] = useState("Role unavailable");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingOutEverywhere, setLoggingOutEverywhere] = useState(false);
  const [guardState, setGuardState] = useState<"checking" | "allowed" | "unavailable">("checking");
  const [guardAttempt, setGuardAttempt] = useState(0);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (active) setGuardState("checking");
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) {
          if (response.status === 401) {
            if (active) router.replace("/login");
            return;
          }
          if (active) setGuardState("unavailable");
          return;
        }
        const result = (await response.json()) as CurrentUser;
        const destination = redirectForUnauthorizedRole(result.user?.roles ?? [], homeHref);
        if (destination) {
          if (active) router.replace(destination);
          return;
        }
        const firstName = result.user?.firstName?.trim();
        const lastName = result.user?.lastName?.trim();
        const email = result.user?.email?.trim();
        const name = [firstName, lastName].filter(Boolean).join(" ") || email || defaultDisplayName;
        if (active) {
          setDisplayName(name);
          setDisplayRole(highestRoleLabel(result.user?.roles ?? []));
          setGuardState("allowed");
        }
      } catch {
        if (active) setGuardState("unavailable");
      }
    }
    void loadUser();
    return () => {
      active = false;
    };
  }, [defaultDisplayName, guardAttempt, homeHref, router]);

  useEffect(() => {
    if (!accountMenuOpen) return;

    function isInsideAccountMenu(target: EventTarget | null): boolean {
      return target instanceof Node && accountMenuRef.current?.contains(target) === true;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!isInsideAccountMenu(event.target)) setAccountMenuOpen(false);
    }

    function handleFocusIn(event: FocusEvent) {
      if (!isInsideAccountMenu(event.target)) setAccountMenuOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setAccountMenuOpen(false);
      accountMenuTriggerRef.current?.focus();
    }

    function handleWindowBlur() {
      setAccountMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("focusin", handleFocusIn, true);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [accountMenuOpen]);

  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  async function signOut() {
    await completeSignOut("/api/auth/logout", "current");
  }

  async function signOutEverywhere() {
    await completeSignOut("/api/auth/logout-all", "everywhere");
  }

  async function completeSignOut(path: "/api/auth/logout" | "/api/auth/logout-all", scope: "current" | "everywhere") {
    if (scope === "everywhere") setLoggingOutEverywhere(true);
    else setLoggingOut(true);
    try {
      setLogoutError("");
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Sign out verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(result.error ?? "Sign out failed.");
      }
      setAccountMenuOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : "Sign out failed.");
      if (scope === "everywhere") setLoggingOutEverywhere(false);
      else setLoggingOut(false);
    }
  }

  return (
    <div className="dashboard-app-shell">
      <button className="dashboard-menu-toggle" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
        <Icon name="menu" size={21} />
      </button>
      {sidebarOpen ? <button className="dashboard-sidebar-overlay" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> : null}
      <aside className={`dashboard-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="dashboard-brand-row">
          <Link className="dashboard-brand" href={homeHref} onClick={() => setSidebarOpen(false)}>
            <span className="dashboard-brand-mark" />
            <span>Slough Tution Centre</span>
          </Link>
          <button className="dashboard-sidebar-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <nav className="dashboard-navigation" aria-label={navigationLabel}>
          {navigation.map((item) => (
            <Link
              className={`dashboard-nav-item${isActive(pathname, item.href, homeHref) ? " is-active" : ""}`}
              href={item.href}
              key={item.label}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name={item.icon} size={16} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className="dashboard-page-content">
        <header className="dashboard-topbar sticky top-0 z-10">
          {showSearch ? (
            <label className="dashboard-search" htmlFor="dashboard-search-input">
              <Icon name="search" size={16} />
              <span className="visually-hidden">Search dashboard</span>
              <input id="dashboard-search-input" placeholder={searchPlaceholder} type="search" />
              <kbd>⌘</kbd><kbd>F</kbd>
            </label>
          ) : <span aria-hidden="true" />}
          <div className="dashboard-account-actions" aria-label="Signed-in user">
            <NotificationMenu enabled={guardState === "allowed"} />
            <div className="dashboard-account-menu-wrap" ref={accountMenuRef}>
              <button
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                className="dashboard-account-menu-trigger"
                onClick={() => {
                  setAccountMenuOpen((open) => !open);
                  setLogoutError("");
                }}
                ref={accountMenuTriggerRef}
                type="button"
              >
                <span className="dashboard-profile-avatar">{initial}</span>
                <span className="dashboard-profile-name">{displayName}</span>
                <Icon name="chevronDown" size={14} />
              </button>
              {accountMenuOpen ? (
                <div className="dashboard-account-menu" role="menu">
                  <div className="dashboard-account-menu-heading">
                    <strong>{displayName}</strong>
                    <span>{guardState === "checking" ? "Checking role…" : guardState === "allowed" ? displayRole : "Role unavailable"}</span>
                  </div>
                  {logoutError ? <p className="dashboard-account-menu-error" role="alert">{logoutError}</p> : null}
                  <button disabled={loggingOut || loggingOutEverywhere} onClick={signOut} role="menuitem" type="button">
                    {loggingOut ? "Signing out…" : "Sign out"}
                  </button>
                  <button
                    className="is-secondary"
                    disabled={loggingOut || loggingOutEverywhere}
                    onClick={signOutEverywhere}
                    role="menuitem"
                    type="button"
                  >
                    {loggingOutEverywhere ? "Signing out everywhere…" : "Sign out everywhere"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {guardState === "allowed" ? children : guardState === "unavailable" ? (
          <main className="dashboard-guard-state" aria-live="polite">
            <p className="eyebrow">Connection interrupted</p>
            <h1>Your session is still active.</h1>
            <p>We could not reach the application service. Reconnect and try again; you will remain on this page.</p>
            <button className="primary-button" onClick={() => setGuardAttempt((attempt) => attempt + 1)} type="button">Try again</button>
          </main>
        ) : (
          <main className="dashboard-guard-state" aria-live="polite">
            <p className="eyebrow">Checking access</p>
            <h1>Preparing your workspace…</h1>
            <p>We are confirming that this dashboard belongs to your account.</p>
          </main>
        )}
      </div>
    </div>
  );
}

function highestRoleLabel(roles: ReadonlyArray<{ roleKey: string }>): string {
  const rolePriority = [
    ["owner", "Owner"],
    ["manager", "Manager"],
    ["tutor", "Tutor"],
    ["parent", "Parent"],
    ["student", "Student"],
  ] as const;
  const roleKeys = new Set(roles.map((role) => role.roleKey));
  return rolePriority.find(([key]) => roleKeys.has(key))?.[1] ?? "Role unavailable";
}

function isActive(pathname: string, href: string, homeHref: string): boolean {
  if (href === homeHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function redirectForUnauthorizedRole(roles: Array<{ roleKey: string }>, currentHome: string): string {
  const roleKeys = new Set(roles.map((role) => role.roleKey));
  const expectedHome = roleHome(roleKeys);
  if (currentHome.startsWith("/app/admin")) {
    return roleKeys.has("owner") || roleKeys.has("manager") ? "" : expectedHome;
  }
  if (currentHome.startsWith("/app/parent")) {
    return roleKeys.has("parent") ? "" : expectedHome;
  }
  if (currentHome.startsWith("/app/student")) {
    return roleKeys.has("student") ? "" : expectedHome;
  }
  if (currentHome === "/app") {
    return roleKeys.has("tutor") && !roleKeys.has("owner") && !roleKeys.has("manager") ? "" : expectedHome;
  }
  return "";
}

function roleHome(roleKeys: Set<string>): string {
  if (roleKeys.has("owner") || roleKeys.has("manager")) return "/app/admin";
  if (roleKeys.has("parent")) return "/app/parent";
  if (roleKeys.has("student")) return "/app/student";
  if (roleKeys.has("tutor")) return "/app";
  return "/login";
}
