import "server-only";

import { ParentStudentLink, ParentStudentLinkList } from "@/lib/profile-types";

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
