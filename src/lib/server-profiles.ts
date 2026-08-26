import "server-only";

import {
  ParentStudentLink,
  ParentStudentLinkList,
  ProfileAdminContext,
  StudentProfile,
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
  email_login_enabled: boolean;
  people_code_login_enabled: boolean;
  profile_status: string;
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
    emailLoginEnabled: student.email_login_enabled,
    peopleCodeLoginEnabled: student.people_code_login_enabled,
    profileStatus: student.profile_status,
  };
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
