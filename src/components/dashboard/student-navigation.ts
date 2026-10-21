import type { DashboardNavItem } from "./dashboard-shell";

export const studentNavigation: DashboardNavItem[] = [
  { label: "Dashboard", href: "/app/student", icon: "grid" },
  { label: "Sessions", href: "/app/student/sessions", icon: "calendar" },
  { label: "Bookings", href: "/app/student/bookings", icon: "check" },
  { label: "Credits", href: "/app/student/credits", icon: "activity" },
  { label: "Feedback & Queries", href: "/app/student/feedback", icon: "message" },
  { label: "Learning Notes", href: "/app/student/notes", icon: "book" },
  { label: "Profile", href: "/app/student/profile", icon: "settings" },
];
