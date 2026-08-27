"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icons";

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
};

type CurrentUser = {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
};

const studentNavigation: DashboardNavItem[] = [
  { label: "Dashboard", href: "/app/student", icon: "grid" },
  { label: "Assignments", href: "/app/student/assignments", icon: "book" },
  { label: "Schedule", href: "/app/student/schedule", icon: "calendar" },
  { label: "Recordings", href: "/app/student/recordings", icon: "headphones" },
  { label: "Notes", href: "/app/student/notes", icon: "file" },
  { label: "Resources", href: "/app/student/resources", icon: "file" },
  { label: "Reports", href: "/app/student/reports", icon: "activity" },
  { label: "Profile", href: "/app/student/profile", icon: "settings" },
];

export function DashboardShell({
  children,
  defaultDisplayName = "Student",
  homeHref = "/app/student",
  navigation = studentNavigation,
  navigationLabel = "Student navigation",
  searchPlaceholder = "Search",
}: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        if (!response.ok) return;
        const result = (await response.json()) as CurrentUser;
        const firstName = result.user?.firstName?.trim();
        const lastName = result.user?.lastName?.trim();
        const email = result.user?.email?.trim();
        const name = [firstName, lastName].filter(Boolean).join(" ") || email || defaultDisplayName;
        if (active) setDisplayName(name);
      } catch {
        // Keep the neutral fallback.
      }
    }
    void loadUser();
    return () => {
      active = false;
    };
  }, [defaultDisplayName]);

  const initial = displayName.trim().charAt(0).toUpperCase() || "S";

  async function signOut() {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!csrfResponse.ok) throw new Error("Sign out verification failed.");
      const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
      const response = await fetch("/api/auth/logout", {
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
      setLoggingOut(false);
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
        <header className="dashboard-topbar">
          <label className="dashboard-search" htmlFor="dashboard-search-input">
            <Icon name="search" size={16} />
            <span className="visually-hidden">Search dashboard</span>
            <input id="dashboard-search-input" placeholder={searchPlaceholder} type="search" />
            <kbd>⌘</kbd><kbd>F</kbd>
          </label>
          <div className="dashboard-account-actions" aria-label="Signed-in user">
            <button className="dashboard-icon-button" type="button" aria-label="Notifications">
              <span className="dashboard-notification-dot" />
              <Icon name="activity" size={17} />
            </button>
            <div className="dashboard-account-menu-wrap">
              <button
                aria-expanded={accountMenuOpen}
                aria-haspopup="menu"
                className="dashboard-account-menu-trigger"
                onClick={() => {
                  setAccountMenuOpen((open) => !open);
                  setLogoutError("");
                }}
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
                    <span>Signed in to Tution</span>
                  </div>
                  {logoutError ? <p className="dashboard-account-menu-error" role="alert">{logoutError}</p> : null}
                  <button disabled={loggingOut} onClick={signOut} role="menuitem" type="button">
                    {loggingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string, homeHref: string): boolean {
  if (href === homeHref) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
