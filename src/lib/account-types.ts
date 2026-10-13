export type Centre = {
  id: string;
  code: string;
  name: string;
};

export type RoleGrant = {
  roleKey: string;
  assignmentScope: string;
  centreId?: string;
};

export type Invitation = {
  id: string;
  status: string;
  expiresAt: string;
  emailDelivery?: InvitationEmailDelivery;
};

export type InvitationEmailDelivery = {
  status: "pending" | "smtp_accepted" | "failed" | "unavailable";
  attemptCount: number;
  lastAttemptedAt?: string;
  smtpAcceptedAt?: string;
  failedAt?: string;
  failureCategory?: string;
};

export type ManagedAccount = {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  accountStatus: string;
  roles: RoleGrant[];
  centres: Centre[];
  invitation?: Invitation;
  emailVerified: boolean;
  mfaEnabled: boolean;
  pendingDeletionEligible: boolean;
  pendingDeletionReason?: string;
};

export type InvitationDelivery = {
  invitationId: string;
  activationUrl: string;
  expiresAt: string;
};

export type AccountManagementContext = {
  centres: Centre[];
  assignableRoles: string[];
  roleCompositionRoles: string[];
  capabilities: {
    canCreateManagers: boolean;
    canDeletePendingManagers: boolean;
    canManageRoles: boolean;
    canAssignOwner: boolean;
    canAssignManager: boolean;
    canAssignTutor: boolean;
    canRemoveOwner: boolean;
    canRemoveManager: boolean;
    canRemoveTutor: boolean;
  };
  canResetMFA: boolean;
  actorUserId: string;
};

export type ProvisionAccountResult = {
  account: ManagedAccount;
  invitation: InvitationDelivery;
  emailDelivery?: InvitationEmailDelivery;
};

export type AccountLifecycleResult = {
  account: ManagedAccount;
  invitation?: InvitationDelivery;
  emailDelivery?: InvitationEmailDelivery;
};
