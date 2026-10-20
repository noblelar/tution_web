import type {
  StudentDashboard,
  StudentDashboardAction,
  StudentDashboardBookings,
} from "./student-dashboard-types";

export type StudentDashboardStatusItem = {
  key: "confirmed" | "waitlisted" | "credits_required" | "cancelled";
  label: string;
  count: number;
  description: string;
};

export type StudentDashboardShortcut = {
  key: "sessions" | "bookings" | "credits" | "feedback" | "queries" | "profile";
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  unavailableReason?: string;
};

export type StudentDashboardActionTone = "critical" | "warning" | "informative";

export function studentDashboardDisplayName(dashboard: StudentDashboard): string {
  return (
    dashboard.student.preferredName?.trim() ||
    dashboard.student.firstName.trim() ||
    "there"
  );
}

export function studentDashboardPrimaryAction(
  dashboard: StudentDashboard,
): StudentDashboardAction | undefined {
  return dashboard.actions[0];
}

export function studentDashboardActionTone(
  action: StudentDashboardAction,
): StudentDashboardActionTone {
  if (action.kind === "credits_required") return "critical";
  if (action.kind === "query_response" || action.kind === "profile") return "warning";
  return "informative";
}

export function studentDashboardBookingStatuses(
  counts: StudentDashboardBookings["counts"],
): StudentDashboardStatusItem[] {
  return [
    {
      key: "confirmed",
      label: "Confirmed",
      count: counts.confirmed,
      description: "Upcoming sessions where your place is secured.",
    },
    {
      key: "waitlisted",
      label: "Waitlisted",
      count: counts.waitlisted,
      description: "Upcoming bookings waiting for an available place.",
    },
    {
      key: "credits_required",
      label: "Credits required",
      count: counts.creditsRequired,
      description: "Bookings waiting for available household credit.",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: counts.cancelledLast30Days,
      description: "Your bookings cancelled during the last 30 days.",
    },
  ];
}

export function studentDashboardShortcuts(
  dashboard: StudentDashboard,
): StudentDashboardShortcut[] {
  const canBook = dashboard.student.canManageOwnBookings;
  const bookingRestriction = canBook
    ? {}
    : {
        enabled: false,
        unavailableReason: "A parent or the centre currently manages your bookings.",
      };

  return [
    {
      key: "sessions",
      title: "Find a session",
      description: "Browse tuition sessions and choose a subject.",
      href: "/app/student/sessions",
      enabled: true,
      ...bookingRestriction,
    },
    {
      key: "bookings",
      title: "My bookings",
      description: "Review your upcoming and previous bookings.",
      href: "/app/student/bookings",
      enabled: true,
    },
    {
      key: "credits",
      title: "Available credits",
      description: "See the household credit available for your sessions.",
      href: "/app/student/credits",
      enabled: true,
    },
    {
      key: "feedback",
      title: "Tutor feedback",
      description: "Read feedback published after your sessions.",
      href: "/app/student/feedback?tab=feedback",
      enabled: true,
    },
    {
      key: "queries",
      title: "My queries",
      description: "Continue your private conversations with the centre.",
      href: "/app/student/feedback?tab=queries",
      enabled: true,
    },
    {
      key: "profile",
      title: "Student profile",
      description: "Review your centre, placement, and sign-in methods.",
      href: "/app/student/profile",
      enabled: true,
    },
  ];
}
