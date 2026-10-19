export type FeedbackWorkspaceMode = "admin" | "tutor" | "parent" | "student";

export type FeedbackCentre = {
  id: string;
  code: string;
  name: string;
  timeZone: string;
};

export type FeedbackStudent = {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  peopleCode: string;
  centreId: string;
  centreName: string;
  canManageOwnBookings: boolean;
};

export type FeedbackEligibleBooking = {
  sessionBookingId: string;
  sessionId: string;
  sessionSubjectId: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  studentPeopleCode: string;
  subjectName: string;
  sessionStartsAt: string;
  sessionEndsAt: string;
  attendanceStatus: "present" | "late";
  lessonFocus?: string;
};

export type FeedbackAssignmentTutor = {
  id: string;
  name: string;
  assignedSessionSubjectIds: string[];
};

export type FeedbackContext = {
  actorUserId: string;
  viewer: "admin" | "tutor" | "household";
  tutorProfileId?: string;
  centres: FeedbackCentre[];
  students: FeedbackStudent[];
  eligibleBookings: FeedbackEligibleBooking[];
  assignmentTutors: FeedbackAssignmentTutor[];
};
