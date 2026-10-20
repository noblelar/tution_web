export type StudentDashboardCategoryCount = {
  key: string;
  label: string;
  count: number;
};

export type StudentDashboardPlacement = {
  id: string;
  status: string;
  academicYearId: string;
  academicYearName: string;
  academicYearStatus: string;
  academicLevelId: string;
  academicLevelName: string;
  academicLevelStatus: string;
};

export type StudentDashboardStudent = {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  peopleCode: string;
  centreId?: string;
  centreCode?: string;
  centreName?: string;
  centreTimeZone?: string;
  profileStatus: string;
  accountStatus: string;
  emailVerified: boolean;
  emailLoginEnabled: boolean;
  peopleCodeLoginEnabled: boolean;
  canManageOwnBookings: boolean;
  currentPlacement?: StudentDashboardPlacement;
};

export type StudentDashboardBookingStatus =
  | "confirmed"
  | "waitlisted"
  | "credits_required";

export type StudentDashboardBooking = {
  id: string;
  sessionId: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  status: StudentDashboardBookingStatus;
  lessonFocus?: string;
  startsAt: string;
  endsAt: string;
  queuePosition?: number;
};

export type StudentDashboardBookings = {
  nextConfirmed?: StudentDashboardBooking;
  upcoming: StudentDashboardBooking[];
  counts: {
    upcoming: number;
    confirmed: number;
    waitlisted: number;
    creditsRequired: number;
    cancelledLast30Days: number;
  };
};

export type StudentDashboardCredits = {
  householdBalance: number;
  walletCount: number;
};

export type StudentDashboardAttendanceItem = {
  id: string;
  sessionId: string;
  centreId: string;
  centreName: string;
  subjectId: string;
  subjectName: string;
  status: "present" | "late" | "absent" | "excused";
  startsAt: string;
  endsAt: string;
  markedAt: string;
  selfCheckedIn: boolean;
};

export type StudentDashboardAttendance = {
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendedSessions: number;
  attendedMinutes: number;
  attendedHours: number;
  attendanceRate: number;
  recent: StudentDashboardAttendanceItem[];
};

export type StudentDashboardFeedback = {
  id: string;
  centreId: string;
  centreName: string;
  subjectId: string;
  subjectName: string;
  tutorFirstName: string;
  tutorLastName: string;
  feedbackText: string;
  sessionStartsAt: string;
  publishedAt: string;
  unread: boolean;
};

export type StudentDashboardQuery = {
  id: string;
  centreId: string;
  centreName: string;
  category: string;
  subject: string;
  status: "open" | "assigned" | "awaiting_staff" | "awaiting_parent" | "resolved";
  lastMessageAt: string;
};

export type StudentDashboardQueries = {
  counts: {
    unresolved: number;
    awaitingCentre: number;
    awaitingStudent: number;
  };
  recent: StudentDashboardQuery[];
};

export type StudentDashboardNotification = {
  id: string;
  centreId?: string;
  centreName?: string;
  type: string;
  title: string;
  message: string;
  actionHref: string;
  availableAt: string;
  readAt?: string;
};

export type StudentDashboardNotifications = {
  activeCount: number;
  unreadCount: number;
  unreadFeedback: number;
  recent: StudentDashboardNotification[];
};

export type StudentDashboardAction = {
  key: string;
  kind: "credits_required" | "query_response" | "unread_feedback" | "profile";
  title: string;
  description: string;
  count: number;
  href: string;
};

export type StudentDashboard = {
  generatedAt: string;
  student: StudentDashboardStudent;
  bookings: StudentDashboardBookings;
  credits: StudentDashboardCredits;
  attendance: StudentDashboardAttendance;
  recentFeedback: StudentDashboardFeedback[];
  queries: StudentDashboardQueries;
  notifications: StudentDashboardNotifications;
  subjectParticipation: StudentDashboardCategoryCount[];
  actions: StudentDashboardAction[];
};
