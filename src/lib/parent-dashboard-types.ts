export type ParentDashboardCategoryCount = {
  key: string;
  label: string;
  count: number;
};

export type ParentDashboardParent = {
  parentProfileId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  emailVerified: boolean;
  phoneNumber?: string;
  profileStatus: string;
  accountStatus: string;
};

export type ParentDashboardAcademicYear = {
  id: string;
  name: string;
  status: string;
};

export type ParentDashboardChild = {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  peopleCode: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  hasLoginAccount: boolean;
  ageYears: number;
  ageBand: string;
  academicLevelId?: string;
  academicLevel?: string;
};

export type ParentDashboardHousehold = {
  linkedChildren: number;
  centres: number;
  childrenWithLogin: number;
  academicYear?: ParentDashboardAcademicYear;
  children: ParentDashboardChild[];
  ageBands: ParentDashboardCategoryCount[];
  academicLevels: ParentDashboardCategoryCount[];
  centresBreakdown: ParentDashboardCategoryCount[];
  upcomingSubjects: ParentDashboardCategoryCount[];
};

export type ParentDashboardBookingStatus =
  | "confirmed"
  | "waitlisted"
  | "credits_required"
  | "cancelled";

export type ParentDashboardBooking = {
  id: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  status: ParentDashboardBookingStatus;
  lessonFocus?: string;
  startsAt: string;
  endsAt: string;
  queuePosition?: number;
  cancelledAt?: string;
  cancellationReason?: string;
};

export type ParentDashboardBookingCounts = {
  upcoming: number;
  confirmed: number;
  waitlisted: number;
  creditsRequired: number;
  cancelledLast30Days: number;
};

export type ParentDashboardBookings = {
  next?: ParentDashboardBooking;
  upcoming: ParentDashboardBooking[];
  counts: ParentDashboardBookingCounts;
};

export type ParentDashboardWallet = {
  id: string;
  parentProfileId: string;
  balanceCredits: number;
};

export type ParentDashboardCredits = {
  totalBalance: number;
  wallets: ParentDashboardWallet[];
};

export type ParentDashboardQueryStatus =
  | "open"
  | "assigned"
  | "awaiting_staff"
  | "awaiting_parent"
  | "resolved";

export type ParentDashboardQuery = {
  id: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  centreId: string;
  centreName: string;
  category: string;
  subject: string;
  status: ParentDashboardQueryStatus;
  lastMessageAt: string;
};

export type ParentDashboardQueryCounts = {
  unresolved: number;
  awaitingCentre: number;
  awaitingParent: number;
};

export type ParentDashboardQueries = {
  counts: ParentDashboardQueryCounts;
  recent: ParentDashboardQuery[];
};

export type ParentDashboardFeedback = {
  id: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
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

export type ParentDashboardNotification = {
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

export type ParentDashboardNotifications = {
  activeCount: number;
  unreadCount: number;
  unreadFeedback: number;
  recent: ParentDashboardNotification[];
};

export type ParentDashboardActionKind =
  | "credits_required"
  | "query_response"
  | "unread_feedback"
  | "profile";

export type ParentDashboardAction = {
  key: string;
  kind: ParentDashboardActionKind;
  title: string;
  description: string;
  count: number;
  href: string;
};

export type ParentDashboard = {
  generatedAt: string;
  parent: ParentDashboardParent;
  household: ParentDashboardHousehold;
  bookings: ParentDashboardBookings;
  credits: ParentDashboardCredits;
  queries: ParentDashboardQueries;
  recentFeedback: ParentDashboardFeedback[];
  notifications: ParentDashboardNotifications;
  actions: ParentDashboardAction[];
};
