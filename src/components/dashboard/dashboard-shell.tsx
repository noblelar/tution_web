"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "./icons";

type NavItem = {
  label: string;
  href: string;
  icon: "activity" | "book" | "calendar" | "file" | "grid" | "headphones" | "message" | "settings" | "users";
};

const primaryNavigation: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "grid" },
  { label: "Assignments", href: "/assignments", icon: "book" },
  { label: "Schedule", href: "/schedule", icon: "calendar" },
  { label: "Recordings", href: "/recordings", icon: "headphones" },
  { label: "Discussions", href: "/discussions", icon: "message" },
  { label: "Resources", href: "/resources", icon: "file" },
  { label: "Notes", href: "/notes", icon: "book" },
  { label: "Downloads", href: "/downloads", icon: "activity" },
  { label: "Classes", href: "/classes", icon: "users" },
  { label: "Courses", href: "/courses", icon: "book" },
  { label: "Settings", href: "/settings", icon: "settings" },
];

export function DashboardShell({ children, activeHref = "/" }: { children: ReactNode; activeHref?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="dashboard-app-shell">
      <button className="dashboard-menu-toggle" type="button" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>
        <Icon name="menu" size={21} />
      </button>
      {sidebarOpen ? <button className="dashboard-sidebar-overlay" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} /> : null}
      <aside className={`dashboard-sidebar${sidebarOpen ? " is-open" : ""}`}>
        <div className="dashboard-brand-row">
          <Link className="dashboard-brand" href="/" onClick={() => setSidebarOpen(false)}>
            <span className="dashboard-brand-mark">▰</span>
            <span>DESIGNO</span>
          </Link>
          <button className="dashboard-sidebar-close" type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" size={17} />
          </button>
        </div>
        <nav className="dashboard-navigation" aria-label="Main navigation">
          {primaryNavigation.map((item) => (
            <Link className={`dashboard-nav-item${item.href === activeHref ? " is-active" : ""}`} href={item.href} key={item.label} onClick={() => setSidebarOpen(false)}>
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
            <input id="dashboard-search-input" placeholder="Search" type="search" />
            <kbd>⌘</kbd><kbd>F</kbd>
          </label>
          <div className="dashboard-account-actions">
            <button className="dashboard-icon-button" type="button" aria-label="Notifications"><span className="dashboard-notification-dot" /><Icon name="activity" size={17} /></button>
            <span className="dashboard-profile-avatar">H</span>
            <span className="dashboard-profile-name">Harsh</span>
            <Icon name="chevronDown" size={14} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
