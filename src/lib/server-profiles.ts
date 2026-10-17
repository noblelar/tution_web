import "server-only";

import {
  ParentStudentLink,
  ParentStudentLinkList,
  ParentStudentOnboardingResult,
  ParentOnboardingResult,
  ParentProfile,
  ParentProfileList,
  ProfileAdminContext,
  StudentProfile,
  StudentProfileList,
  StudentOnboardingResult,
  TutorProfile,
  TutorProfileList,
  TutorInvitation,
  TutorManagementContext,
  TutorOnboardingResult,
} from "@/lib/profile-types";
import { BackendManagedAccount, mapManagedAccount } from "@/lib/server-accounts";

export type BackendParentStudentLink = {
  id: string;
  parent_profile_id: string;
  student_profile_id: string;
  relationship_type: string;
  relationship_description?: string;
  can_view_bookings: boolean;
  can_book_lessons: boolean;
  can_receive_reports: boolean;
  can_manage_credits: boolean;
  can_receive_communications: boolean;
  can_collect_student: boolean;
  can_access_billing: boolean;
  can_access_academics: boolean;
  link_status: string;
};

export type BackendParentStudentLinkList = {
  links: BackendParentStudentLink[];
};

export type BackendParentProfile = {
  id: string;
  organization_id: string;
  user_id: string;
  account_email?: string;
  account_status?: string;
  email_verified?: boolean;
  invitation?: BackendTutorProfile["invitation"];
  primary_centre_id?: string;
  people_code: string;
  preferred_name?: string;
  phone_number?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  county_region?: string;
  postal_code?: string;
  country?: string;
  marketing_opt_in: boolean;
  contact_consent: boolean;
  profile_status: string;
};

export type BackendParentProfileList = {
  parents: BackendParentProfile[];
};

export type BackendParentOnboardingResult = {
  account: BackendManagedAccount;
  parent: BackendParentProfile;
};

export type BackendTutorProfile = {
  id: string;
  organization_id: string;
  user_id: string;
  primary_centre_id?: string;
  primary_centre_name?: string;
  first_name: string;
  last_name: string;
  email: string;
  preferred_name?: string;
  phone_number?: string;
  account_status: string;
  email_verified: boolean;
  mfa_enabled: boolean;
  mfa_required: boolean;
  profile_status: string;
  pending_deletion_eligible?: boolean;
  pending_deletion_reason?: string;
  invitation?: {
    id: string;
    status: string;
    expires_at: string;
    email_delivery?: {
      status: "pending" | "smtp_accepted" | "failed";
      attempt_count: number;
      last_attempted_at?: string;
      smtp_accepted_at?: string;
      failed_at?: string;
      failure_category?: string;
    };
  };
};

export type BackendTutorProfileList = {
  tutors: BackendTutorProfile[];
};

export type BackendTutorInvitation = {
  id: string;
  status: string;
  expires_at: string;
  email_delivery: {
    status: "pending" | "smtp_accepted" | "failed";
    attempt_count: number;
    last_attempted_at?: string;
    smtp_accepted_at?: string;
    failed_at?: string;
    failure_category?: string;
  };
};

export type BackendTutorOnboardingResult = {
  account: BackendManagedAccount;
  tutor: BackendTutorProfile;
  invitation: BackendTutorInvitation;
};

export type BackendTutorManagementContext = {
  centres: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  can_onboard_tutors: boolean;
  can_manage_invitations: boolean;
  can_suspend_tutors: boolean;
  can_restore_suspended_tutors: boolean;
  can_disable_tutors: boolean;
  can_restore_disabled_tutors: boolean;
  can_reset_tutor_mfa: boolean;
  can_delete_pending_tutors?: boolean;
  actor_user_id: string;
};

export type BackendStudentProfile = {
  id: string;
  organization_id: string;
  user_id?: string;
  account_email?: string;
  account_status?: string;
  email_verified?: boolean;
  invitation?: BackendTutorProfile["invitation"];
  primary_centre_id?: string;
  people_code: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth: string;
  gender?: string;
  school_name?: string;
  academic_year_group?: string;
  referral_source?: string;
  notes?: string;
  email_login_enabled: boolean;
  people_code_login_enabled: boolean;
  profile_status: string;
};

export type BackendStudentProfileList = {
  students: BackendStudentProfile[];
};

export type BackendStudentOnboardingResult = {
  account?: BackendManagedAccount;
  student: BackendStudentProfile;
  parent_link?: BackendParentStudentLink;
};

export type BackendParentStudentOnboardingResult = {
  parent_account: BackendManagedAccount;
  student_account?: BackendManagedAccount;
  parent: BackendParentProfile;
  student: BackendStudentProfile;
  parent_link: BackendParentStudentLink;
};

export type BackendProfileAdminContext = {
  can_onboard_profiles: boolean;
  people_code: {
    prefix: string;
    format: string;
    suffix_length: number;
    applies_to: string[];
  };
  profile_statuses: string[];
  relationship_types: string[];
  relationship_actions: {
    default_permissions: string[];
  };
  student_access: {
    no_email_requires_parent_link: boolean;
    no_email_login_method: string;
    supported_login_methods: string[];
  };
  future_import: {
    can_prepare_imports: boolean;
    supported_owners: string[];
    supported_statuses: string[];
  };
};

export function mapParentStudentLink(link: BackendParentStudentLink): ParentStudentLink {
  return {
    id: link.id,
    parentProfileId: link.parent_profile_id,
    studentProfileId: link.student_profile_id,
    relationshipType: link.relationship_type,
    relationshipDescription: link.relationship_description,
    canViewBookings: link.can_view_bookings,
    canBookLessons: link.can_book_lessons,
    canReceiveReports: link.can_receive_reports,
    canManageCredits: link.can_manage_credits,
    canReceiveCommunications: link.can_receive_communications,
    canCollectStudent: link.can_collect_student,
    canAccessBilling: link.can_access_billing,
    canAccessAcademics: link.can_access_academics,
    linkStatus: link.link_status,
  };
}

export function mapParentStudentLinkList(list: BackendParentStudentLinkList): ParentStudentLinkList {
  return { links: list.links.map(mapParentStudentLink) };
}

export function mapParentProfile(parent: BackendParentProfile): ParentProfile {
  return {
    id: parent.id,
    organizationId: parent.organization_id,
    userId: parent.user_id,
    accountEmail: parent.account_email,
    accountStatus: parent.account_status,
    emailVerified: parent.email_verified === true,
    invitation: parent.invitation ? mapProfileInvitationStatus(parent.invitation) : undefined,
    primaryCentreId: parent.primary_centre_id,
    peopleCode: parent.people_code,
    preferredName: parent.preferred_name,
    phoneNumber: parent.phone_number,
    addressLine1: parent.address_line1,
    addressLine2: parent.address_line2,
    city: parent.city,
    countyRegion: parent.county_region,
    postalCode: parent.postal_code,
    country: parent.country,
    marketingOptIn: parent.marketing_opt_in,
    contactConsent: parent.contact_consent,
    profileStatus: parent.profile_status,
  };
}

export function mapParentProfileList(list: BackendParentProfileList): ParentProfileList {
  return { parents: list.parents.map(mapParentProfile) };
}

export function mapParentOnboardingResult(result: BackendParentOnboardingResult): ParentOnboardingResult {
  return {
    account: mapManagedAccount(result.account),
    parent: mapParentProfile(result.parent),
  };
}

export function mapTutorProfile(tutor: BackendTutorProfile): TutorProfile {
  return {
    id: tutor.id,
    organizationId: tutor.organization_id,
    userId: tutor.user_id,
    primaryCentreId: tutor.primary_centre_id,
    primaryCentreName: tutor.primary_centre_name,
    firstName: tutor.first_name,
    lastName: tutor.last_name,
    email: tutor.email,
    preferredName: tutor.preferred_name,
    phoneNumber: tutor.phone_number,
    accountStatus: tutor.account_status,
    emailVerified: tutor.email_verified,
    mfaEnabled: tutor.mfa_enabled,
    mfaRequired: tutor.mfa_required,
    profileStatus: tutor.profile_status,
    pendingDeletionEligible: tutor.pending_deletion_eligible === true,
    pendingDeletionReason: tutor.pending_deletion_reason,
    invitation: tutor.invitation
      ? {
          id: tutor.invitation.id,
          status: tutor.invitation.status,
          expiresAt: tutor.invitation.expires_at,
          emailDelivery: tutor.invitation.email_delivery
            ? {
                status: tutor.invitation.email_delivery.status,
                attemptCount: tutor.invitation.email_delivery.attempt_count,
                lastAttemptedAt: tutor.invitation.email_delivery.last_attempted_at,
                smtpAcceptedAt: tutor.invitation.email_delivery.smtp_accepted_at,
                failedAt: tutor.invitation.email_delivery.failed_at,
                failureCategory: tutor.invitation.email_delivery.failure_category,
              }
            : undefined,
        }
      : undefined,
  };
}

function mapProfileInvitationStatus(invitation: NonNullable<BackendTutorProfile["invitation"]>) {
  return {
    id: invitation.id,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    emailDelivery: invitation.email_delivery
      ? {
          status: invitation.email_delivery.status,
          attemptCount: invitation.email_delivery.attempt_count,
          lastAttemptedAt: invitation.email_delivery.last_attempted_at,
          smtpAcceptedAt: invitation.email_delivery.smtp_accepted_at,
          failedAt: invitation.email_delivery.failed_at,
          failureCategory: invitation.email_delivery.failure_category,
        }
      : undefined,
  };
}

export function mapTutorProfileList(list: BackendTutorProfileList): TutorProfileList {
  return { tutors: list.tutors.map(mapTutorProfile) };
}

export function mapTutorOnboardingResult(result: BackendTutorOnboardingResult): TutorOnboardingResult {
  return {
    account: mapManagedAccount(result.account),
    tutor: mapTutorProfile(result.tutor),
    invitation: mapTutorInvitation(result.invitation),
  };
}

export function mapTutorInvitation(invitation: BackendTutorInvitation): TutorInvitation {
  return {
    id: invitation.id,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    emailDelivery: {
      status: invitation.email_delivery.status,
      attemptCount: invitation.email_delivery.attempt_count,
      lastAttemptedAt: invitation.email_delivery.last_attempted_at,
      smtpAcceptedAt: invitation.email_delivery.smtp_accepted_at,
      failedAt: invitation.email_delivery.failed_at,
      failureCategory: invitation.email_delivery.failure_category,
    },
  };
}

export function mapTutorManagementContext(context: BackendTutorManagementContext): TutorManagementContext {
  return {
    centres: (context.centres ?? []).map((centre) => ({
      id: centre.id,
      code: centre.code,
      name: centre.name,
    })),
    canOnboardTutors: context.can_onboard_tutors,
    canManageInvitations: context.can_manage_invitations,
    canSuspendTutors: context.can_suspend_tutors,
    canRestoreSuspendedTutors: context.can_restore_suspended_tutors,
    canDisableTutors: context.can_disable_tutors,
    canRestoreDisabledTutors: context.can_restore_disabled_tutors,
    canResetTutorMFA: context.can_reset_tutor_mfa,
    canDeletePendingTutors: context.can_delete_pending_tutors === true,
    actorUserId: context.actor_user_id,
  };
}

export function mapStudentProfile(student: BackendStudentProfile): StudentProfile {
  return {
    id: student.id,
    organizationId: student.organization_id,
    userId: student.user_id,
    accountEmail: student.account_email,
    accountStatus: student.account_status,
    emailVerified: student.email_verified === true,
    invitation: student.invitation ? mapProfileInvitationStatus(student.invitation) : undefined,
    primaryCentreId: student.primary_centre_id,
    peopleCode: student.people_code,
    firstName: student.first_name,
    lastName: student.last_name,
    preferredName: student.preferred_name,
    dateOfBirth: student.date_of_birth,
    gender: student.gender,
    schoolName: student.school_name,
    academicYearGroup: student.academic_year_group,
    referralSource: student.referral_source,
    notes: student.notes,
    emailLoginEnabled: student.email_login_enabled,
    peopleCodeLoginEnabled: student.people_code_login_enabled,
    profileStatus: student.profile_status,
  };
}

export function mapStudentProfileList(list: BackendStudentProfileList): StudentProfileList {
  return { students: list.students.map(mapStudentProfile) };
}

export function mapStudentOnboardingResult(result: BackendStudentOnboardingResult): StudentOnboardingResult {
  return {
    account: result.account ? mapManagedAccount(result.account) : undefined,
    student: mapStudentProfile(result.student),
    parentLink: result.parent_link ? mapParentStudentLink(result.parent_link) : undefined,
  };
}

export function mapParentStudentOnboardingResult(result: BackendParentStudentOnboardingResult): ParentStudentOnboardingResult {
  return {
    parentAccount: mapManagedAccount(result.parent_account),
    studentAccount: result.student_account ? mapManagedAccount(result.student_account) : undefined,
    parent: mapParentProfile(result.parent),
    student: mapStudentProfile(result.student),
    parentLink: mapParentStudentLink(result.parent_link),
  };
}

export function mapProfileAdminContext(context: BackendProfileAdminContext): ProfileAdminContext {
  return {
    canOnboardProfiles: context.can_onboard_profiles,
    peopleCode: {
      prefix: context.people_code.prefix,
      format: context.people_code.format,
      suffixLength: context.people_code.suffix_length,
      appliesTo: context.people_code.applies_to,
    },
    profileStatuses: context.profile_statuses,
    relationshipTypes: context.relationship_types,
    relationshipActions: {
      defaultPermissions: context.relationship_actions.default_permissions,
    },
    studentAccess: {
      noEmailRequiresParentLink: context.student_access.no_email_requires_parent_link,
      noEmailLoginMethod: context.student_access.no_email_login_method,
      supportedLoginMethods: context.student_access.supported_login_methods,
    },
    futureImport: {
      canPrepareImports: context.future_import.can_prepare_imports,
      supportedOwners: context.future_import.supported_owners,
      supportedStatuses: context.future_import.supported_statuses,
    },
  };
}
