import type {
  CentreAccessRole,
  CentreManagementCapabilities,
} from "@/lib/centre-types";

function normalized(value: string): string {
  return value.trim().toLowerCase();
}

function isCentreAssignment(role: CentreAccessRole, centreId: string): boolean {
  return (
    normalized(role.assignmentScope) === "centre" &&
    role.centreId === centreId
  );
}

/**
 * Supplies presentation-level controls only. The Go API remains authoritative
 * for every centre read and mutation.
 */
export function centreManagementCapabilities(
  roles: CentreAccessRole[],
  centreId?: string,
): CentreManagementCapabilities {
  const isOwner = roles.some((role) => normalized(role.roleKey) === "owner");
  if (isOwner) {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canManageStatus: true,
      canDelete: true,
    };
  }

  const assignedRoles = centreId
    ? roles.filter((role) => isCentreAssignment(role, centreId))
    : roles.filter((role) => normalized(role.assignmentScope) === "centre" && Boolean(role.centreId));
  const isManager = assignedRoles.some((role) => normalized(role.roleKey) === "manager");
  const isTutor = assignedRoles.some((role) => normalized(role.roleKey) === "tutor");

  return {
    canView: isManager || isTutor,
    canCreate: false,
    canEdit: Boolean(centreId) && isManager,
    canManageStatus: Boolean(centreId) && isManager,
    canDelete: false,
  };
}
