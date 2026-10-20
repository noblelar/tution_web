import type {
  StudentDashboard,
  StudentDashboardAction,
  StudentDashboardAttendanceItem,
  StudentDashboardBooking,
  StudentDashboardCategoryCount,
  StudentDashboardFeedback,
  StudentDashboardNotification,
  StudentDashboardQuery,
} from "@/lib/student-dashboard-types";

type BackendCategoryCount = { key: string; label: string; count: number };

type BackendStudentDashboardBooking = {
  id: string;
  session_id: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  status: StudentDashboardBooking["status"];
  lesson_focus?: string;
  starts_at: string;
  ends_at: string;
  queue_position?: number;
};

type BackendStudentDashboardAttendanceItem = {
  id: string;
  session_id: string;
  centre_id: string;
  centre_name: string;
  subject_id: string;
  subject_name: string;
  status: StudentDashboardAttendanceItem["status"];
  starts_at: string;
  ends_at: string;
  marked_at: string;
  self_checked_in: boolean;
};

type BackendStudentDashboardFeedback = {
  id: string;
  centre_id: string;
  centre_name: string;
  subject_id: string;
  subject_name: string;
  tutor_first_name: string;
  tutor_last_name: string;
  feedback_text: string;
  session_starts_at: string;
  published_at: string;
  unread: boolean;
};

type BackendStudentDashboardQuery = {
  id: string;
  centre_id: string;
  centre_name: string;
  category: string;
  subject: string;
  status: StudentDashboardQuery["status"];
  last_message_at: string;
};

type BackendStudentDashboardNotification = {
  id: string;
  centre_id?: string;
  centre_name?: string;
  type: string;
  title: string;
  message: string;
  action_href: string;
  available_at: string;
  read_at?: string;
};

type BackendStudentDashboardAction = {
  key: string;
  kind: StudentDashboardAction["kind"];
  title: string;
  description: string;
  count: number;
  href: string;
};

export type BackendStudentDashboard = {
  generated_at: string;
  student: {
    student_profile_id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    people_code: string;
    centre_id?: string;
    centre_code?: string;
    centre_name?: string;
    centre_time_zone?: string;
    profile_status: string;
    account_status: string;
    email_verified: boolean;
    email_login_enabled: boolean;
    people_code_login_enabled: boolean;
    can_manage_own_bookings: boolean;
    current_placement?: {
      id: string;
      status: string;
      academic_year_id: string;
      academic_year_name: string;
      academic_year_status: string;
      academic_level_id: string;
      academic_level_name: string;
      academic_level_status: string;
    };
  };
  bookings: {
    next_confirmed?: BackendStudentDashboardBooking;
    upcoming: BackendStudentDashboardBooking[];
    counts: {
      upcoming: number;
      confirmed: number;
      waitlisted: number;
      credits_required: number;
      cancelled_last_30_days: number;
    };
  };
  credits: { household_balance: number; wallet_count: number };
  attendance: {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    attended_sessions: number;
    attended_minutes: number;
    attended_hours: number;
    attendance_rate: number;
    recent: BackendStudentDashboardAttendanceItem[];
  };
  recent_feedback: BackendStudentDashboardFeedback[];
  queries: {
    counts: { unresolved: number; awaiting_centre: number; awaiting_student: number };
    recent: BackendStudentDashboardQuery[];
  };
  notifications: {
    active_count: number;
    unread_count: number;
    unread_feedback: number;
    recent: BackendStudentDashboardNotification[];
  };
  subject_participation: BackendCategoryCount[];
  actions: BackendStudentDashboardAction[];
};

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function optionalStringValue(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== "string") {
    throw new TypeError(`${label} must be a string when supplied.`);
  }
}

function numberValue(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative finite number.`);
  }
  return value;
}

function booleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean.`);
  return value;
}

function enumValue(value: unknown, allowed: readonly string[], label: string): string {
  const prepared = stringValue(value, label);
  if (!allowed.includes(prepared)) throw new TypeError(`${label} is not supported.`);
  return prepared;
}

function validateCategoryCounts(value: unknown, label: string): void {
  arrayValue(value, label).forEach((item, index) => {
    const record = recordValue(item, `${label}[${index}]`);
    stringValue(record.key, `${label}[${index}].key`);
    stringValue(record.label, `${label}[${index}].label`);
    numberValue(record.count, `${label}[${index}].count`);
  });
}

const bookingStatuses = ["confirmed", "waitlisted", "credits_required"] as const;
const attendanceStatuses = ["present", "late", "absent", "excused"] as const;
const queryStatuses = ["open", "assigned", "awaiting_staff", "awaiting_parent", "resolved"] as const;
const actionKinds = ["credits_required", "query_response", "unread_feedback", "profile"] as const;

function validateBooking(value: unknown, label: string): void {
  const item = recordValue(value, label);
  for (const key of ["id", "session_id", "centre_id", "centre_name", "centre_time_zone", "subject_id", "subject_name", "subject_code", "starts_at", "ends_at"] as const) {
    stringValue(item[key], `${label}.${key}`);
  }
  enumValue(item.status, bookingStatuses, `${label}.status`);
  optionalStringValue(item.lesson_focus, `${label}.lesson_focus`);
  if (item.queue_position !== undefined) numberValue(item.queue_position, `${label}.queue_position`);
}

function validateAttendance(value: unknown, label: string): void {
  const item = recordValue(value, label);
  for (const key of ["id", "session_id", "centre_id", "centre_name", "subject_id", "subject_name", "starts_at", "ends_at", "marked_at"] as const) {
    stringValue(item[key], `${label}.${key}`);
  }
  enumValue(item.status, attendanceStatuses, `${label}.status`);
  booleanValue(item.self_checked_in, `${label}.self_checked_in`);
}

function validateFeedback(value: unknown, label: string): void {
  const item = recordValue(value, label);
  for (const key of ["id", "centre_id", "centre_name", "subject_id", "subject_name", "tutor_first_name", "tutor_last_name", "feedback_text", "session_starts_at", "published_at"] as const) {
    stringValue(item[key], `${label}.${key}`);
  }
  booleanValue(item.unread, `${label}.unread`);
}

function validateQuery(value: unknown, label: string): void {
  const item = recordValue(value, label);
  for (const key of ["id", "centre_id", "centre_name", "category", "subject", "last_message_at"] as const) {
    stringValue(item[key], `${label}.${key}`);
  }
  enumValue(item.status, queryStatuses, `${label}.status`);
}

function validateNotification(value: unknown, label: string): void {
  const item = recordValue(value, label);
  for (const key of ["id", "type", "title", "message", "action_href", "available_at"] as const) {
    stringValue(item[key], `${label}.${key}`);
  }
  optionalStringValue(item.centre_id, `${label}.centre_id`);
  optionalStringValue(item.centre_name, `${label}.centre_name`);
  optionalStringValue(item.read_at, `${label}.read_at`);
}

function validateAction(value: unknown, label: string): void {
  const item = recordValue(value, label);
  for (const key of ["key", "title", "description", "href"] as const) {
    stringValue(item[key], `${label}.${key}`);
  }
  enumValue(item.kind, actionKinds, `${label}.kind`);
  numberValue(item.count, `${label}.count`);
}

function assertBackendStudentDashboard(value: unknown): asserts value is BackendStudentDashboard {
  const dashboard = recordValue(value, "student dashboard");
  stringValue(dashboard.generated_at, "student dashboard.generated_at");

  const student = recordValue(dashboard.student, "student dashboard.student");
  for (const key of ["student_profile_id", "first_name", "last_name", "people_code", "profile_status", "account_status"] as const) {
    stringValue(student[key], `student dashboard.student.${key}`);
  }
  for (const key of ["preferred_name", "centre_id", "centre_code", "centre_name", "centre_time_zone"] as const) {
    optionalStringValue(student[key], `student dashboard.student.${key}`);
  }
  for (const key of ["email_verified", "email_login_enabled", "people_code_login_enabled", "can_manage_own_bookings"] as const) {
    booleanValue(student[key], `student dashboard.student.${key}`);
  }
  if (student.current_placement !== undefined) {
    const placement = recordValue(student.current_placement, "student dashboard.student.current_placement");
    for (const key of ["id", "status", "academic_year_id", "academic_year_name", "academic_year_status", "academic_level_id", "academic_level_name", "academic_level_status"] as const) {
      stringValue(placement[key], `student dashboard.student.current_placement.${key}`);
    }
  }

  const bookings = recordValue(dashboard.bookings, "student dashboard.bookings");
  if (bookings.next_confirmed !== undefined) validateBooking(bookings.next_confirmed, "student dashboard.bookings.next_confirmed");
  arrayValue(bookings.upcoming, "student dashboard.bookings.upcoming").forEach((item, index) => validateBooking(item, `student dashboard.bookings.upcoming[${index}]`));
  const bookingCounts = recordValue(bookings.counts, "student dashboard.bookings.counts");
  for (const key of ["upcoming", "confirmed", "waitlisted", "credits_required", "cancelled_last_30_days"] as const) {
    numberValue(bookingCounts[key], `student dashboard.bookings.counts.${key}`);
  }

  const credits = recordValue(dashboard.credits, "student dashboard.credits");
  numberValue(credits.household_balance, "student dashboard.credits.household_balance");
  numberValue(credits.wallet_count, "student dashboard.credits.wallet_count");

  const attendance = recordValue(dashboard.attendance, "student dashboard.attendance");
  for (const key of ["total", "present", "late", "absent", "excused", "attended_sessions", "attended_minutes", "attended_hours", "attendance_rate"] as const) {
    numberValue(attendance[key], `student dashboard.attendance.${key}`);
  }
  arrayValue(attendance.recent, "student dashboard.attendance.recent").forEach((item, index) => validateAttendance(item, `student dashboard.attendance.recent[${index}]`));

  arrayValue(dashboard.recent_feedback, "student dashboard.recent_feedback").forEach((item, index) => validateFeedback(item, `student dashboard.recent_feedback[${index}]`));
  const queries = recordValue(dashboard.queries, "student dashboard.queries");
  const queryCounts = recordValue(queries.counts, "student dashboard.queries.counts");
  for (const key of ["unresolved", "awaiting_centre", "awaiting_student"] as const) {
    numberValue(queryCounts[key], `student dashboard.queries.counts.${key}`);
  }
  arrayValue(queries.recent, "student dashboard.queries.recent").forEach((item, index) => validateQuery(item, `student dashboard.queries.recent[${index}]`));

  const notifications = recordValue(dashboard.notifications, "student dashboard.notifications");
  for (const key of ["active_count", "unread_count", "unread_feedback"] as const) {
    numberValue(notifications[key], `student dashboard.notifications.${key}`);
  }
  arrayValue(notifications.recent, "student dashboard.notifications.recent").forEach((item, index) => validateNotification(item, `student dashboard.notifications.recent[${index}]`));
  validateCategoryCounts(dashboard.subject_participation, "student dashboard.subject_participation");
  arrayValue(dashboard.actions, "student dashboard.actions").forEach((item, index) => validateAction(item, `student dashboard.actions[${index}]`));
}

function mapBooking(item: BackendStudentDashboardBooking): StudentDashboardBooking {
  return {
    id: item.id, sessionId: item.session_id,
    centreId: item.centre_id, centreName: item.centre_name, centreTimeZone: item.centre_time_zone,
    subjectId: item.subject_id, subjectName: item.subject_name, subjectCode: item.subject_code,
    status: item.status, lessonFocus: item.lesson_focus, startsAt: item.starts_at,
    endsAt: item.ends_at, queuePosition: item.queue_position,
  };
}

function mapAttendance(item: BackendStudentDashboardAttendanceItem): StudentDashboardAttendanceItem {
  return {
    id: item.id, sessionId: item.session_id,
    centreId: item.centre_id, centreName: item.centre_name,
    subjectId: item.subject_id, subjectName: item.subject_name,
    status: item.status, startsAt: item.starts_at, endsAt: item.ends_at,
    markedAt: item.marked_at, selfCheckedIn: item.self_checked_in,
  };
}

function mapFeedback(item: BackendStudentDashboardFeedback): StudentDashboardFeedback {
  return {
    id: item.id, centreId: item.centre_id, centreName: item.centre_name,
    subjectId: item.subject_id, subjectName: item.subject_name,
    tutorFirstName: item.tutor_first_name, tutorLastName: item.tutor_last_name,
    feedbackText: item.feedback_text, sessionStartsAt: item.session_starts_at,
    publishedAt: item.published_at, unread: item.unread,
  };
}

function mapQuery(item: BackendStudentDashboardQuery): StudentDashboardQuery {
  return {
    id: item.id, centreId: item.centre_id, centreName: item.centre_name,
    category: item.category, subject: item.subject, status: item.status,
    lastMessageAt: item.last_message_at,
  };
}

function mapNotification(item: BackendStudentDashboardNotification): StudentDashboardNotification {
  return {
    id: item.id, centreId: item.centre_id, centreName: item.centre_name,
    type: item.type, title: item.title, message: item.message,
    actionHref: item.action_href, availableAt: item.available_at, readAt: item.read_at,
  };
}

function mapAction(item: BackendStudentDashboardAction): StudentDashboardAction {
  return {
    key: item.key, kind: item.kind, title: item.title,
    description: item.description, count: item.count, href: item.href,
  };
}

export function mapStudentDashboard(value: unknown): StudentDashboard {
  assertBackendStudentDashboard(value);
  const placement = value.student.current_placement;
  return {
    generatedAt: value.generated_at,
    student: {
      studentProfileId: value.student.student_profile_id,
      firstName: value.student.first_name,
      lastName: value.student.last_name,
      preferredName: value.student.preferred_name,
      peopleCode: value.student.people_code,
      centreId: value.student.centre_id,
      centreCode: value.student.centre_code,
      centreName: value.student.centre_name,
      centreTimeZone: value.student.centre_time_zone,
      profileStatus: value.student.profile_status,
      accountStatus: value.student.account_status,
      emailVerified: value.student.email_verified,
      emailLoginEnabled: value.student.email_login_enabled,
      peopleCodeLoginEnabled: value.student.people_code_login_enabled,
      canManageOwnBookings: value.student.can_manage_own_bookings,
      currentPlacement: placement ? {
        id: placement.id,
        status: placement.status,
        academicYearId: placement.academic_year_id,
        academicYearName: placement.academic_year_name,
        academicYearStatus: placement.academic_year_status,
        academicLevelId: placement.academic_level_id,
        academicLevelName: placement.academic_level_name,
        academicLevelStatus: placement.academic_level_status,
      } : undefined,
    },
    bookings: {
      nextConfirmed: value.bookings.next_confirmed ? mapBooking(value.bookings.next_confirmed) : undefined,
      upcoming: value.bookings.upcoming.map(mapBooking),
      counts: {
        upcoming: value.bookings.counts.upcoming,
        confirmed: value.bookings.counts.confirmed,
        waitlisted: value.bookings.counts.waitlisted,
        creditsRequired: value.bookings.counts.credits_required,
        cancelledLast30Days: value.bookings.counts.cancelled_last_30_days,
      },
    },
    credits: {
      householdBalance: value.credits.household_balance,
      walletCount: value.credits.wallet_count,
    },
    attendance: {
      total: value.attendance.total,
      present: value.attendance.present,
      late: value.attendance.late,
      absent: value.attendance.absent,
      excused: value.attendance.excused,
      attendedSessions: value.attendance.attended_sessions,
      attendedMinutes: value.attendance.attended_minutes,
      attendedHours: value.attendance.attended_hours,
      attendanceRate: value.attendance.attendance_rate,
      recent: value.attendance.recent.map(mapAttendance),
    },
    recentFeedback: value.recent_feedback.map(mapFeedback),
    queries: {
      counts: {
        unresolved: value.queries.counts.unresolved,
        awaitingCentre: value.queries.counts.awaiting_centre,
        awaitingStudent: value.queries.counts.awaiting_student,
      },
      recent: value.queries.recent.map(mapQuery),
    },
    notifications: {
      activeCount: value.notifications.active_count,
      unreadCount: value.notifications.unread_count,
      unreadFeedback: value.notifications.unread_feedback,
      recent: value.notifications.recent.map(mapNotification),
    },
    subjectParticipation: value.subject_participation.map((item): StudentDashboardCategoryCount => ({
      key: item.key, label: item.label, count: item.count,
    })),
    actions: value.actions.map(mapAction),
  };
}
