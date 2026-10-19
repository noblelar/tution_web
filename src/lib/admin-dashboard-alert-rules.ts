import type { DashboardAlerts } from "./admin-dashboard-types";

export type DashboardAction = {
  key: string;
  title: string;
  description: string;
  count: number;
  href: string;
  latestAt?: string;
};

const invitationAreas: Record<string, { name: string; href: string }> = {
  tutor_activation: { name: "tutor", href: "/app/admin/tutors" },
  manager_activation: { name: "manager", href: "/app/admin/users" },
  parent_activation: { name: "guardian", href: "/app/admin/parents" },
  student_activation: { name: "student", href: "/app/admin/students" },
};

export function dashboardActions(alerts: DashboardAlerts): DashboardAction[] {
  const failed: DashboardAction[] = alerts.failedDeliveries
    .filter((item) => item.count > 0 && invitationAreas[item.messageType])
    .map((item) => ({
      key: `failed-${item.messageType}`,
      title: `Failed ${invitationAreas[item.messageType].name} invitation email${item.count === 1 ? "" : "s"}`,
      description: "Review delivery and retry the invitation in the management area.",
      count: item.count,
      href: invitationAreas[item.messageType].href,
      latestAt: item.latestAt,
    }));

  const pending: DashboardAction[] = [
    { key: "pending-tutors", title: "Tutors awaiting activation", description: "Review pending tutor invitations.", count: alerts.pendingTutors, href: "/app/admin/tutors" },
    { key: "pending-managers", title: "Managers awaiting activation", description: "Review pending manager invitations.", count: alerts.pendingManagers, href: "/app/admin/users" },
    { key: "pending-guardians", title: "Guardians awaiting activation", description: "Review pending guardian invitations.", count: alerts.pendingGuardians, href: "/app/admin/parents" },
    { key: "pending-students", title: "Students awaiting activation", description: "Review students with email sign-in pending.", count: alerts.pendingStudents, href: "/app/admin/students" },
    { key: "unresolved-queries", title: "Unresolved family queries", description: "Review open conversations in the centre inbox.", count: alerts.unresolvedQueries, href: "/app/admin/feedback" },
  ];
  return [...failed, ...pending.filter((item) => item.count > 0)];
}
