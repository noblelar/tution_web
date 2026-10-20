import type { Centre, ManagedAccount } from "@/lib/account-types";

export type ParentStudentLink = {
  id: string;
  parentProfileId: string;
  studentProfileId: string;
  relationshipType: string;
  relationshipDescription?: string;
  canViewBookings: boolean;
  canBookLessons: boolean;
  canReceiveReports: boolean;
  canManageCredits: boolean;
  canReceiveCommunications: boolean;
  canCollectStudent: boolean;
  canAccessBilling: boolean;
  canAccessAcademics: boolean;
  linkStatus: string;
};

export type ParentStudentLinkList = {
  links: ParentStudentLink[];
};

export type ParentProfile = {
  id: string;
  organizationId: string;
  userId: string;
  accountEmail?: string;
  accountStatus?: string;
  emailVerified: boolean;
  invitation?: TutorInvitationStatus;
  primaryCentreId?: string;
  peopleCode: string;
  preferredName?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  countyRegion?: string;
  postalCode?: string;
  country?: string;
  marketingOptIn: boolean;
  contactConsent: boolean;
  profileStatus: string;
};

export type ParentProfileList = {
  parents: ParentProfile[];
};

export type ParentProfileCentre = {
  id: string;
  code: string;
  name: string;
};

export type ParentSelfProfile = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  peopleCode: string;
  primaryCentre?: ParentProfileCentre;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  countyRegion?: string;
  postalCode?: string;
  country?: string;
  marketingOptIn: boolean;
  contactConsent: boolean;
  profileStatus: string;
  accountStatus: string;
  profileUpdatedAt: string;
};

export type ParentOnboardingResult = {
  account: ManagedAccount;
  parent: ParentProfile;
};

export type TutorProfile = {
  id: string;
  organizationId: string;
  userId: string;
  primaryCentreId?: string;
  primaryCentreName?: string;
  firstName: string;
  lastName: string;
  email: string;
  preferredName?: string;
  phoneNumber?: string;
  accountStatus: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  mfaRequired: boolean;
  profileStatus: string;
  pendingDeletionEligible: boolean;
  pendingDeletionReason?: string;
  invitation?: TutorInvitationStatus;
};

export type TutorProfileList = {
  tutors: TutorProfile[];
};

export type TutorInvitationEmailDelivery = {
  status: "pending" | "smtp_accepted" | "failed";
  attemptCount: number;
  lastAttemptedAt?: string;
  smtpAcceptedAt?: string;
  failedAt?: string;
  failureCategory?: string;
};

export type TutorInvitation = {
  id: string;
  status: string;
  expiresAt: string;
  emailDelivery: TutorInvitationEmailDelivery;
};

export type TutorInvitationStatus = {
  id: string;
  status: string;
  expiresAt: string;
  emailDelivery?: TutorInvitationEmailDelivery;
};

export type TutorOnboardingResult = {
  account: ManagedAccount;
  tutor: TutorProfile;
  invitation: TutorInvitation;
};

export type TutorManagementContext = {
  centres: Centre[];
  canOnboardTutors: boolean;
  canManageInvitations: boolean;
  canSuspendTutors: boolean;
  canRestoreSuspendedTutors: boolean;
  canDisableTutors: boolean;
  canRestoreDisabledTutors: boolean;
  canResetTutorMFA: boolean;
  canDeletePendingTutors: boolean;
  actorUserId: string;
};

export type StudentProfile = {
  id: string;
  organizationId: string;
  userId?: string;
  accountEmail?: string;
  accountStatus?: string;
  emailVerified: boolean;
  invitation?: TutorInvitationStatus;
  primaryCentreId?: string;
  peopleCode: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender?: string;
  schoolName?: string;
  academicYearGroup?: string;
  referralSource?: string;
  notes?: string;
  emailLoginEnabled: boolean;
  peopleCodeLoginEnabled: boolean;
  profileStatus: string;
};

export type StudentProfileList = {
  students: StudentProfile[];
};

export type StudentProfileCentre = {
  id: string;
  code: string;
  name: string;
};

export type StudentAcademicPlacement = {
  id: string;
  status: string;
  academicYearId: string;
  academicYearName: string;
  academicYearStatus: string;
  academicLevelId: string;
  academicLevelName: string;
  academicLevelStatus: string;
};

export type StudentSelfProfile = {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  gender?: string;
  schoolName?: string;
  academicYearGroup?: string;
  email?: string;
  emailVerified: boolean;
  peopleCode: string;
  primaryCentre?: StudentProfileCentre;
  currentPlacement?: StudentAcademicPlacement;
  emailLoginEnabled: boolean;
  peopleCodeLoginEnabled: boolean;
  canManageOwnBookings: boolean;
  profileStatus: string;
  accountStatus: string;
  profileUpdatedAt: string;
};

export type StudentOnboardingResult = {
  account?: ManagedAccount;
  student: StudentProfile;
  parentLink?: ParentStudentLink;
};

export type ParentStudentOnboardingResult = {
  parentAccount: ManagedAccount;
  studentAccount?: ManagedAccount;
  parent: ParentProfile;
  student: StudentProfile;
  parentLink: ParentStudentLink;
};

export type ProfileAdminContext = {
  canOnboardProfiles: boolean;
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
