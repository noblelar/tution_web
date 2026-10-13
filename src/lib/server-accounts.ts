import "server-only";

import {
  AccountLifecycleResult,
  AccountManagementContext,
  Centre,
  Invitation,
  InvitationDelivery,
  InvitationEmailDelivery,
  ManagedAccount,
  ProvisionAccountResult,
  RoleGrant,
} from "@/lib/account-types";

export type BackendCentre = { id: string; code: string; name: string };
export type BackendRoleGrant = {
  role_key: string;
  assignment_scope: string;
  centre_id?: string;
};
export type BackendInvitationEmailDelivery = {
  status: "pending" | "smtp_accepted" | "failed" | "unavailable";
  attempt_count: number;
  last_attempted_at?: string;
  smtp_accepted_at?: string;
  failed_at?: string;
  failure_category?: string;
};
export type BackendInvitation = {
  id: string;
  status: string;
  expires_at: string;
  email_delivery?: BackendInvitationEmailDelivery;
};
export type BackendManagedAccount = {
  id: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  account_status: string;
  roles: BackendRoleGrant[];
  centres: BackendCentre[];
  invitation?: BackendInvitation;
  email_verified: boolean;
  mfa_enabled: boolean;
  pending_deletion_eligible?: boolean;
  pending_deletion_reason?: string;
};
export type BackendInvitationDelivery = {
  invitation_id: string;
  activation_url: string;
  expires_at: string;
};
export type BackendProvisionResult = {
  account: BackendManagedAccount;
  invitation: BackendInvitationDelivery;
  email_delivery?: BackendInvitationEmailDelivery;
};
export type BackendLifecycleResult = {
  account: BackendManagedAccount;
  invitation?: BackendInvitationDelivery;
  email_delivery?: BackendInvitationEmailDelivery;
};
export type BackendManagementContext = {
  centres: BackendCentre[];
  assignable_roles: string[];
  role_composition_roles: string[];
  capabilities: {
    can_create_managers: boolean;
    can_delete_pending_managers?: boolean;
    can_manage_roles: boolean;
    can_assign_owner: boolean;
    can_assign_manager: boolean;
    can_assign_tutor: boolean;
    can_remove_owner: boolean;
    can_remove_manager: boolean;
    can_remove_tutor: boolean;
  };
  can_reset_mfa: boolean;
  actor_user_id: string;
};

function mapCentre(centre: BackendCentre): Centre {
  return centre;
}

function mapRole(role: BackendRoleGrant): RoleGrant {
  return {
    roleKey: role.role_key,
    assignmentScope: role.assignment_scope,
    centreId: role.centre_id,
  };
}

function mapInvitation(invitation: BackendInvitation): Invitation {
  return {
    id: invitation.id,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    emailDelivery: invitation.email_delivery ? mapInvitationEmailDelivery(invitation.email_delivery) : undefined,
  };
}

export function mapInvitationEmailDelivery(delivery: BackendInvitationEmailDelivery): InvitationEmailDelivery {
  return {
    status: delivery.status,
    attemptCount: delivery.attempt_count,
    lastAttemptedAt: delivery.last_attempted_at,
    smtpAcceptedAt: delivery.smtp_accepted_at,
    failedAt: delivery.failed_at,
    failureCategory: delivery.failure_category,
  };
}

export function mapManagedAccount(account: BackendManagedAccount): ManagedAccount {
  return {
    id: account.id,
    organizationId: account.organization_id,
    firstName: account.first_name,
    lastName: account.last_name,
    email: account.email,
    phoneNumber: account.phone_number,
    accountStatus: account.account_status,
    roles: account.roles.map(mapRole),
    centres: account.centres.map(mapCentre),
    invitation: account.invitation ? mapInvitation(account.invitation) : undefined,
    emailVerified: account.email_verified,
    mfaEnabled: account.mfa_enabled,
    pendingDeletionEligible: account.pending_deletion_eligible === true,
    pendingDeletionReason: account.pending_deletion_reason,
  };
}

export function mapInvitationDelivery(invitation: BackendInvitationDelivery): InvitationDelivery {
  return {
    invitationId: invitation.invitation_id,
    activationUrl: invitation.activation_url,
    expiresAt: invitation.expires_at,
  };
}

export function mapManagementContext(context: BackendManagementContext): AccountManagementContext {
  return {
    centres: context.centres.map(mapCentre),
    assignableRoles: context.assignable_roles,
    roleCompositionRoles: context.role_composition_roles,
    capabilities: {
      canCreateManagers: context.capabilities.can_create_managers,
      canDeletePendingManagers: context.capabilities.can_delete_pending_managers === true,
      canManageRoles: context.capabilities.can_manage_roles,
      canAssignOwner: context.capabilities.can_assign_owner,
      canAssignManager: context.capabilities.can_assign_manager,
      canAssignTutor: context.capabilities.can_assign_tutor,
      canRemoveOwner: context.capabilities.can_remove_owner,
      canRemoveManager: context.capabilities.can_remove_manager,
      canRemoveTutor: context.capabilities.can_remove_tutor,
    },
    canResetMFA: context.can_reset_mfa,
    actorUserId: context.actor_user_id,
  };
}

export function mapProvisionResult(result: BackendProvisionResult): ProvisionAccountResult {
  return {
    account: mapManagedAccount(result.account),
    invitation: mapInvitationDelivery(result.invitation),
    emailDelivery: result.email_delivery ? mapInvitationEmailDelivery(result.email_delivery) : undefined,
  };
}

export function mapLifecycleResult(result: BackendLifecycleResult): AccountLifecycleResult {
  return {
    account: mapManagedAccount(result.account),
    invitation: result.invitation ? mapInvitationDelivery(result.invitation) : undefined,
    emailDelivery: result.email_delivery ? mapInvitationEmailDelivery(result.email_delivery) : undefined,
  };
}
