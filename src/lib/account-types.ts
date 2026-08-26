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
  mfaEnabled: boolean;
};

export type InvitationDelivery = {
  invitationId: string;
  activationUrl: string;
  expiresAt: string;
};

export type AccountManagementContext = {
  centres: Centre[];
  assignableRoles: string[];
  canResetMFA: boolean;
  actorUserId: string;
};

export type ProvisionAccountResult = {
  account: ManagedAccount;
  invitation: InvitationDelivery;
};

export type AccountLifecycleResult = {
  account: ManagedAccount;
  invitation?: InvitationDelivery;
};
