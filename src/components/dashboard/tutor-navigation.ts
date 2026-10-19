import type { DashboardNavItem } from "./dashboard-shell";

export const tutorNavigation: DashboardNavItem[] = [
  { label: "Account settings", href: "/app", icon: "settings" },
  { label: "Attendance", href: "/app/attendance", icon: "check" },
  { label: "Feedback & Queries", href: "/app/tutor/feedback", icon: "message" },
];
