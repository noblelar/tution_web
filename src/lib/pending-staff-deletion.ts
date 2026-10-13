export type PendingStaffDeletionTarget = {
  kind: "manager" | "tutor";
  name: string;
  email: string;
  endpoint: string;
  eligible: boolean;
};

export class PendingStaffDeletionError extends Error {
  constructor(message: string, public readonly status: number, public readonly requiresRefresh: boolean) {
    super(message);
    this.name = "PendingStaffDeletionError";
  }
}

export function pendingManagerDeletionEndpoint(userId: string): string {
  return `/api/users/${encodeURIComponent(userId)}/pending-account`;
}

export function pendingTutorDeletionEndpoint(tutorProfileId: string): string {
  return `/api/profiles/onboarding/tutors?action=delete-pending&tutorProfileId=${encodeURIComponent(tutorProfileId)}`;
}

// Narrow, fail-closed presentation guards; the Go transaction rechecks all policy.
export function canDeletePendingManager(
  account: {
    id: string;
    accountStatus: string;
    pendingDeletionEligible: boolean;
    roles: ReadonlyArray<{ roleKey: string }>;
  },
  context: { actorUserId: string; capabilities: { canDeletePendingManagers: boolean } },
): boolean {
  return context.capabilities.canDeletePendingManagers === true &&
    account.pendingDeletionEligible === true && account.accountStatus === "pending_activation" &&
    account.id !== context.actorUserId && account.roles.length > 0 &&
    account.roles.every((role) => role.roleKey === "manager");
}

export function canDeletePendingTutor(
  tutor: { userId: string; accountStatus: string; pendingDeletionEligible: boolean; mfaRequired: boolean },
  context: { actorUserId: string; canDeletePendingTutors: boolean },
): boolean {
  return context.canDeletePendingTutors === true && tutor.pendingDeletionEligible === true &&
    tutor.accountStatus === "pending_activation" && tutor.userId !== context.actorUserId &&
    !tutor.mfaRequired;
}

export async function deletePendingStaff(target: PendingStaffDeletionTarget, fetcher: typeof fetch = fetch): Promise<void> {
  if (!target.eligible) {
    throw new PendingStaffDeletionError("This account is no longer eligible for deletion. Review its current status.", 409, true);
  }
  // Only known, same-origin BFF endpoints may receive this destructive request.
  if (!/^\/api\/users\/[^/?#]+\/pending-account$/.test(target.endpoint) &&
      !/^\/api\/profiles\/onboarding\/tutors\?action=delete-pending&tutorProfileId=[^&#]+$/.test(target.endpoint)) {
    throw new PendingStaffDeletionError("The pending account request is invalid.", 400, false);
  }

  let csrfToken: string;
  try {
    const response = await fetcher("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) {
      throw new PendingStaffDeletionError("Request verification is unavailable. Sign in again if your session has expired.", response.status, false);
    }
    const body = await response.json() as { csrfToken?: unknown };
    if (typeof body.csrfToken !== "string" || !body.csrfToken.trim()) {
      throw new PendingStaffDeletionError("Request verification is unavailable. No deletion was sent.", 400, false);
    }
    csrfToken = body.csrfToken;
  } catch (caught) {
    if (caught instanceof PendingStaffDeletionError) throw caught;
    throw new PendingStaffDeletionError("Request verification is unavailable. No deletion was sent.", 0, false);
  }

  let response: Response;
  try {
    response = await fetcher(target.endpoint, {
      method: "DELETE",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrfToken },
    });
  } catch {
    // The response can be lost after commit: never assume failure or auto-retry.
    throw new PendingStaffDeletionError("Deletion could not be confirmed. Refresh the account details before trying again.", 0, true);
  }
  if (response.status === 204) return;
  let message = "The pending account could not be deleted.";
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) message = body.error;
  } catch {
    // Non-JSON service failures must still leave the dialog open.
  }
  if (response.ok) message = "Deletion could not be confirmed. Refresh the account details before trying again.";
  throw new PendingStaffDeletionError(
    message,
    response.status,
    response.ok || response.status === 404 || response.status === 409 || response.status >= 500,
  );
}
