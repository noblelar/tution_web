export type CentreStatus = "active" | "inactive";

export type ManagedCentre = {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  address: string;
  timeZone: string;
  status: CentreStatus;
};

export type CentreList = {
  centres: ManagedCentre[];
};

export type CentreFormValues = {
  code: string;
  name: string;
  address: string;
  timeZone: string;
};

export type CentreAccessRole = {
  roleKey: string;
  assignmentScope: string;
  centreId?: string;
};

export type CentreManagementCapabilities = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canManageStatus: boolean;
  canDelete: boolean;
};
