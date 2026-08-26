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
