import type {
  ParentDashboard,
  ParentDashboardAction,
  ParentDashboardBookingCounts,
} from "./parent-dashboard-types";

export type ParentDashboardStatusItem = {
  key: "confirmed" | "waitlisted" | "credits_required" | "cancelled";
  label: string;
  count: number;
  description: string;
};

export type ParentDashboardShortcut = {
  key: "sessions" | "bookings" | "children" | "credits" | "queries" | "profile";
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  unavailableReason?: string;
};

export type ParentDashboardActionTone = "critical" | "warning" | "informative";

export function parentDashboardDisplayName(dashboard: ParentDashboard): string {
  return (
    dashboard.parent.preferredName?.trim() ||
    dashboard.parent.firstName.trim() ||
    `${dashboard.parent.firstName} ${dashboard.parent.lastName}`.trim() ||
    "there"
  );
}

export function parentDashboardPrimaryAction(
  dashboard: ParentDashboard,
): ParentDashboardAction | undefined {
  return dashboard.actions[0];
}

export function parentDashboardActionTone(
  action: ParentDashboardAction,
): ParentDashboardActionTone {
  if (action.kind === "credits_required") return "critical";
  if (action.kind === "query_response" || action.kind === "profile") return "warning";
  return "informative";
}

export function parentDashboardBookingStatuses(
  counts: ParentDashboardBookingCounts,
): ParentDashboardStatusItem[] {
  return [
    {
      key: "confirmed",
      label: "Confirmed",
      count: counts.confirmed,
      description: "Upcoming sessions with a secured place.",
    },
    {
      key: "waitlisted",
      label: "Waitlisted",
      count: counts.waitlisted,
      description: "Upcoming bookings waiting for a place.",
    },
    {
      key: "credits_required",
      label: "Credits required",
      count: counts.creditsRequired,
      description: "Bookings that need household credit.",
    },
    {
      key: "cancelled",
      label: "Cancelled",
      count: counts.cancelledLast30Days,
      description: "Bookings cancelled during the last 30 days.",
    },
  ];
}

export function parentDashboardShortcuts(
  dashboard: ParentDashboard,
): ParentDashboardShortcut[] {
  const hasLinkedChildren = dashboard.household.linkedChildren > 0;
  const requiresChild = hasLinkedChildren
    ? {}
    : {
        enabled: false,
        unavailableReason: "A linked child is required before this area can be used.",
      };

  return [
    {
      key: "sessions",
      title: "Find a session",
      description: "Browse available tuition sessions and subjects.",
      href: "/app/parent/sessions",
      enabled: true,
      ...requiresChild,
    },
    {
      key: "bookings",
      title: "Manage bookings",
      description: "Review upcoming and previous household bookings.",
      href: "/app/parent/bookings",
      enabled: true,
      ...requiresChild,
    },
    {
      key: "children",
      title: "Linked children",
      description: "View every child connected to your account.",
      href: "/app/parent/children",
      enabled: true,
    },
    {
      key: "credits",
      title: "Household credits",
      description: "Review credit balances and transactions.",
      href: "/app/parent/credits",
      enabled: true,
    },
    {
      key: "queries",
      title: "Queries",
      description: "Contact the centre about a linked child.",
      href: "/app/parent/feedback?tab=queries",
      enabled: true,
      ...requiresChild,
    },
    {
      key: "profile",
      title: "Parent profile",
      description: "Review your contact details and preferences.",
      href: "/app/parent/profile",
      enabled: true,
    },
  ];
}
