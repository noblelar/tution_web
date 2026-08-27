import "server-only";

import {
  ParentStudentLink,
  ParentStudentLinkList,
  ParentProfile,
  ParentProfileList,
  ProfileAdminContext,
  StudentProfile,
  StudentProfileList,
} from "@/lib/profile-types";

export type BackendParentStudentLink = {
  id: string;
  parent_profile_id: string;
  student_profile_id: string;
  relationship_type: string;
  can_view_bookings: boolean;
  can_book_lessons: boolean;
  can_receive_reports: boolean;
  can_manage_credits: boolean;
  link_status: string;
};

export type BackendParentStudentLinkList = {
  links: BackendParentStudentLink[];
};

export type BackendParentProfile = {
  id: string;
  organization_id: string;
  user_id: string;
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

export type BackendStudentProfile = {
  id: string;
  organization_id: string;
  user_id?: string;
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

export type BackendProfileAdminContext = {
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
    canViewBookings: link.can_view_bookings,
    canBookLessons: link.can_book_lessons,
    canReceiveReports: link.can_receive_reports,
    canManageCredits: link.can_manage_credits,
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

export function mapStudentProfile(student: BackendStudentProfile): StudentProfile {
  return {
    id: student.id,
    organizationId: student.organization_id,
    userId: student.user_id,
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

export function mapProfileAdminContext(context: BackendProfileAdminContext): ProfileAdminContext {
  return {
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
