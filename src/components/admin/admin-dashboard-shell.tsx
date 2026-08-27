import type { ReactNode } from "react";

import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";

const adminNavigation: DashboardNavItem[] = [
  { label: "Dashboard", href: "/app/admin", icon: "grid" },
  { label: "Students", href: "/app/admin/students", icon: "users" },
  { label: "Parents", href: "/app/admin/parents", icon: "users" },
  { label: "Tutors", href: "/app/admin/tutors", icon: "book" },
  { label: "Centres", href: "/app/admin/centres", icon: "grid" },
  { label: "Schedule", href: "/app/admin/schedule", icon: "calendar" },
  { label: "Classes", href: "/app/admin/classes", icon: "palette" },
  { label: "Bookings", href: "/app/admin/bookings", icon: "check" },
  { label: "Credits", href: "/app/admin/credits", icon: "activity" },
  { label: "Reports", href: "/app/admin/reports", icon: "file" },
  { label: "Users", href: "/app/admin/users", icon: "settings" },
  { label: "Audit", href: "/app/admin/audit", icon: "activity" },
  { label: "Settings", href: "/app/admin/settings", icon: "settings" },
];

export function AdminDashboardShell({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      defaultDisplayName="Manager"
      homeHref="/app/admin"
      navigation={adminNavigation}
      navigationLabel="Admin navigation"
      searchPlaceholder="Search people, profiles, or actions"
    >
      {children}
    </DashboardShell>
  );
}
