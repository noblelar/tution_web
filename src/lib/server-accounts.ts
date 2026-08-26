import "server-only";

import {
  AccountLifecycleResult,
  AccountManagementContext,
  Centre,
  Invitation,
  InvitationDelivery,
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
export type BackendInvitation = { id: string; status: string; expires_at: string };
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
  mfa_enabled: boolean;
};
export type BackendInvitationDelivery = {
  invitation_id: string;
  activation_url: string;
  expires_at: string;
};
export type BackendProvisionResult = {
  account: BackendManagedAccount;
  invitation: BackendInvitationDelivery;
};
export type BackendLifecycleResult = {
  account: BackendManagedAccount;
  invitation?: BackendInvitationDelivery;
};
export type BackendManagementContext = {
  centres: BackendCentre[];
  assignable_roles: string[];
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
  return { id: invitation.id, status: invitation.status, expiresAt: invitation.expires_at };
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
    mfaEnabled: account.mfa_enabled,
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
    canResetMFA: context.can_reset_mfa,
    actorUserId: context.actor_user_id,
  };
}

export function mapProvisionResult(result: BackendProvisionResult): ProvisionAccountResult {
  return { account: mapManagedAccount(result.account), invitation: mapInvitationDelivery(result.invitation) };
}

export function mapLifecycleResult(result: BackendLifecycleResult): AccountLifecycleResult {
  return {
    account: mapManagedAccount(result.account),
    invitation: result.invitation ? mapInvitationDelivery(result.invitation) : undefined,
  };
}
