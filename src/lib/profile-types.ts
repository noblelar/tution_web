export type ParentStudentLink = {
  id: string;
  parentProfileId: string;
  studentProfileId: string;
  relationshipType: string;
  canViewBookings: boolean;
  canBookLessons: boolean;
  canReceiveReports: boolean;
  canManageCredits: boolean;
  linkStatus: string;
};

export type ParentStudentLinkList = {
  links: ParentStudentLink[];
};

export type StudentProfile = {
  id: string;
  organizationId: string;
  userId?: string;
  primaryCentreId?: string;
  peopleCode: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  emailLoginEnabled: boolean;
  peopleCodeLoginEnabled: boolean;
  profileStatus: string;
};

export type ProfileAdminContext = {
  peopleCode: {
    prefix: string;
    format: string;
    suffixLength: number;
    appliesTo: string[];
  };
  profileStatuses: string[];
  relationshipTypes: string[];
  relationshipActions: {
    defaultPermissions: string[];
  };
  studentAccess: {
    noEmailRequiresParentLink: boolean;
    noEmailLoginMethod: string;
    supportedLoginMethods: string[];
  };
  futureImport: {
    canPrepareImports: boolean;
    supportedOwners: string[];
    supportedStatuses: string[];
  };
};
