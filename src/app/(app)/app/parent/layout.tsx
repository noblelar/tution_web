import type { ReactNode } from "react";

import {
  DashboardShell,
  type DashboardNavItem,
} from "@/components/dashboard/dashboard-shell";

const parentNavigation: DashboardNavItem[] = [
  { label: "Dashboard", href: "/app/parent", icon: "grid" },
  { label: "Children", href: "/app/parent/children", icon: "users" },
  { label: "Schedule", href: "/app/parent/schedule", icon: "calendar" },
  { label: "Bookings", href: "/app/parent/bookings", icon: "check" },
  { label: "Credits", href: "/app/parent/credits", icon: "activity" },
  { label: "Reports", href: "/app/parent/reports", icon: "file" },
  { label: "Messages", href: "/app/parent/messages", icon: "message" },
  { label: "Profile", href: "/app/parent/profile", icon: "settings" },
];

export default function ParentLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      defaultDisplayName="Parent"
      homeHref="/app/parent"
      navigation={parentNavigation}
      navigationLabel="Parent navigation"
      searchPlaceholder="Search children, lessons, or reports"
    >
      {children}
    </DashboardShell>
  );
}
