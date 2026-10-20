import type {
  ParentDashboard,
  ParentDashboardAction,
  ParentDashboardBooking,
  ParentDashboardCategoryCount,
  ParentDashboardChild,
  ParentDashboardFeedback,
  ParentDashboardNotification,
  ParentDashboardQuery,
} from "@/lib/parent-dashboard-types";

type BackendCategoryCount = {
  key: string;
  label: string;
  count: number;
};

type BackendParentDashboardChild = {
  student_profile_id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  people_code: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  has_login_account: boolean;
  age_years: number;
  age_band: string;
  academic_level_id?: string;
  academic_level?: string;
};

type BackendParentDashboardBooking = {
  id: string;
  student_profile_id: string;
  student_first_name: string;
  student_last_name: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  status: ParentDashboardBooking["status"];
  lesson_focus?: string;
  starts_at: string;
  ends_at: string;
  queue_position?: number;
  cancelled_at?: string;
  cancellation_reason?: string;
};

type BackendParentDashboardQuery = {
  id: string;
  student_profile_id: string;
  student_first_name: string;
  student_last_name: string;
  centre_id: string;
  centre_name: string;
  category: string;
  subject: string;
  status: ParentDashboardQuery["status"];
  last_message_at: string;
};

type BackendParentDashboardFeedback = {
  id: string;
  student_profile_id: string;
  student_first_name: string;
  student_last_name: string;
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

type BackendParentDashboardNotification = {
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

type BackendParentDashboardAction = {
  key: string;
  kind: ParentDashboardAction["kind"];
  title: string;
  description: string;
  count: number;
  href: string;
};

export type BackendParentDashboard = {
  generated_at: string;
  parent: {
    parent_profile_id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    email: string;
    email_verified: boolean;
    phone_number?: string;
    profile_status: string;
    account_status: string;
  };
  household: {
    linked_children: number;
    centres: number;
    children_with_login: number;
    academic_year?: { id: string; name: string; status: string };
    children: BackendParentDashboardChild[];
    age_bands: BackendCategoryCount[];
    academic_levels: BackendCategoryCount[];
    centres_breakdown: BackendCategoryCount[];
    upcoming_subjects: BackendCategoryCount[];
  };
  bookings: {
    next?: BackendParentDashboardBooking;
    upcoming: BackendParentDashboardBooking[];
    counts: {
      upcoming: number;
      confirmed: number;
      waitlisted: number;
      credits_required: number;
      cancelled_last_30_days: number;
    };
  };
  credits: {
    total_balance: number;
    wallets: Array<{
      id: string;
      parent_profile_id: string;
      balance_credits: number;
    }>;
  };
  queries: {
    counts: {
      unresolved: number;
      awaiting_centre: number;
      awaiting_parent: number;
    };
    recent: BackendParentDashboardQuery[];
  };
  recent_feedback: BackendParentDashboardFeedback[];
  notifications: {
    active_count: number;
    unread_count: number;
    unread_feedback: number;
    recent: BackendParentDashboardNotification[];
  };
  actions: BackendParentDashboardAction[];
};

function mapCategoryCount(value: BackendCategoryCount): ParentDashboardCategoryCount {
  return { key: value.key, label: value.label, count: value.count };
}

function mapChild(value: BackendParentDashboardChild): ParentDashboardChild {
  return {
    studentProfileId: value.student_profile_id,
    firstName: value.first_name,
    lastName: value.last_name,
    preferredName: value.preferred_name,
    peopleCode: value.people_code,
    centreId: value.centre_id,
    centreName: value.centre_name,
    centreTimeZone: value.centre_time_zone,
    hasLoginAccount: value.has_login_account,
    ageYears: value.age_years,
    ageBand: value.age_band,
    academicLevelId: value.academic_level_id,
    academicLevel: value.academic_level,
  };
}

function mapBooking(value: BackendParentDashboardBooking): ParentDashboardBooking {
  return {
    id: value.id,
    studentProfileId: value.student_profile_id,
    studentFirstName: value.student_first_name,
    studentLastName: value.student_last_name,
    centreId: value.centre_id,
    centreName: value.centre_name,
    centreTimeZone: value.centre_time_zone,
    subjectId: value.subject_id,
    subjectName: value.subject_name,
    subjectCode: value.subject_code,
    status: value.status,
    lessonFocus: value.lesson_focus,
    startsAt: value.starts_at,
    endsAt: value.ends_at,
    queuePosition: value.queue_position,
    cancelledAt: value.cancelled_at,
    cancellationReason: value.cancellation_reason,
  };
}

function mapQuery(value: BackendParentDashboardQuery): ParentDashboardQuery {
  return {
    id: value.id,
    studentProfileId: value.student_profile_id,
    studentFirstName: value.student_first_name,
    studentLastName: value.student_last_name,
    centreId: value.centre_id,
    centreName: value.centre_name,
    category: value.category,
    subject: value.subject,
    status: value.status,
    lastMessageAt: value.last_message_at,
  };
}

function mapFeedback(value: BackendParentDashboardFeedback): ParentDashboardFeedback {
  return {
    id: value.id,
    studentProfileId: value.student_profile_id,
    studentFirstName: value.student_first_name,
    studentLastName: value.student_last_name,
    centreId: value.centre_id,
    centreName: value.centre_name,
    subjectId: value.subject_id,
    subjectName: value.subject_name,
    tutorFirstName: value.tutor_first_name,
    tutorLastName: value.tutor_last_name,
    feedbackText: value.feedback_text,
    sessionStartsAt: value.session_starts_at,
    publishedAt: value.published_at,
    unread: value.unread,
  };
}

function mapNotification(value: BackendParentDashboardNotification): ParentDashboardNotification {
  return {
    id: value.id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    type: value.type,
    title: value.title,
    message: value.message,
    actionHref: value.action_href,
    availableAt: value.available_at,
    readAt: value.read_at,
  };
}

function mapAction(value: BackendParentDashboardAction): ParentDashboardAction {
  return {
    key: value.key,
    kind: value.kind,
    title: value.title,
    description: value.description,
    count: value.count,
    href: value.href,
  };
}

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

function validateChild(value: unknown, label: string): void {
  const child = recordValue(value, label);
  for (const key of ["student_profile_id", "first_name", "last_name", "people_code", "centre_id", "centre_name", "centre_time_zone", "age_band"] as const) {
    stringValue(child[key], `${label}.${key}`);
  }
  optionalStringValue(child.preferred_name, `${label}.preferred_name`);
  optionalStringValue(child.academic_level_id, `${label}.academic_level_id`);
  optionalStringValue(child.academic_level, `${label}.academic_level`);
  booleanValue(child.has_login_account, `${label}.has_login_account`);
  numberValue(child.age_years, `${label}.age_years`);
}

const bookingStatuses = ["confirmed", "waitlisted", "credits_required", "cancelled"] as const;

function validateBooking(value: unknown, label: string): void {
  const booking = recordValue(value, label);
  for (const key of ["id", "student_profile_id", "student_first_name", "student_last_name", "centre_id", "centre_name", "centre_time_zone", "subject_id", "subject_name", "subject_code", "starts_at", "ends_at"] as const) {
    stringValue(booking[key], `${label}.${key}`);
  }
  enumValue(booking.status, bookingStatuses, `${label}.status`);
  optionalStringValue(booking.lesson_focus, `${label}.lesson_focus`);
  optionalStringValue(booking.cancelled_at, `${label}.cancelled_at`);
  optionalStringValue(booking.cancellation_reason, `${label}.cancellation_reason`);
  if (booking.queue_position !== undefined) numberValue(booking.queue_position, `${label}.queue_position`);
}

const queryStatuses = ["open", "assigned", "awaiting_staff", "awaiting_parent", "resolved"] as const;

function validateQuery(value: unknown, label: string): void {
  const query = recordValue(value, label);
  for (const key of ["id", "student_profile_id", "student_first_name", "student_last_name", "centre_id", "centre_name", "category", "subject", "last_message_at"] as const) {
    stringValue(query[key], `${label}.${key}`);
  }
  enumValue(query.status, queryStatuses, `${label}.status`);
}

function validateFeedback(value: unknown, label: string): void {
  const feedback = recordValue(value, label);
  for (const key of ["id", "student_profile_id", "student_first_name", "student_last_name", "centre_id", "centre_name", "subject_id", "subject_name", "tutor_first_name", "tutor_last_name", "feedback_text", "session_starts_at", "published_at"] as const) {
    stringValue(feedback[key], `${label}.${key}`);
  }
  booleanValue(feedback.unread, `${label}.unread`);
}

function validateNotification(value: unknown, label: string): void {
  const notification = recordValue(value, label);
  for (const key of ["id", "type", "title", "message", "action_href", "available_at"] as const) {
    stringValue(notification[key], `${label}.${key}`);
  }
  optionalStringValue(notification.centre_id, `${label}.centre_id`);
  optionalStringValue(notification.centre_name, `${label}.centre_name`);
  optionalStringValue(notification.read_at, `${label}.read_at`);
}

const actionKinds = ["credits_required", "query_response", "unread_feedback", "profile"] as const;

function validateAction(value: unknown, label: string): void {
  const action = recordValue(value, label);
  for (const key of ["key", "title", "description", "href"] as const) {
    stringValue(action[key], `${label}.${key}`);
  }
  enumValue(action.kind, actionKinds, `${label}.kind`);
  numberValue(action.count, `${label}.count`);
}

function assertBackendParentDashboard(value: unknown): asserts value is BackendParentDashboard {
  const dashboard = recordValue(value, "parent dashboard");
  stringValue(dashboard.generated_at, "parent dashboard.generated_at");

  const parent = recordValue(dashboard.parent, "parent dashboard.parent");
  for (const key of ["parent_profile_id", "first_name", "last_name", "email", "profile_status", "account_status"] as const) {
    stringValue(parent[key], `parent dashboard.parent.${key}`);
  }
  optionalStringValue(parent.preferred_name, "parent dashboard.parent.preferred_name");
  optionalStringValue(parent.phone_number, "parent dashboard.parent.phone_number");
  booleanValue(parent.email_verified, "parent dashboard.parent.email_verified");

  const household = recordValue(dashboard.household, "parent dashboard.household");
  for (const key of ["linked_children", "centres", "children_with_login"] as const) {
    numberValue(household[key], `parent dashboard.household.${key}`);
  }
  if (household.academic_year !== undefined) {
    const academicYear = recordValue(household.academic_year, "parent dashboard.household.academic_year");
    stringValue(academicYear.id, "parent dashboard.household.academic_year.id");
    stringValue(academicYear.name, "parent dashboard.household.academic_year.name");
    stringValue(academicYear.status, "parent dashboard.household.academic_year.status");
  }
  arrayValue(household.children, "parent dashboard.household.children").forEach((item, index) => validateChild(item, `parent dashboard.household.children[${index}]`));
  validateCategoryCounts(household.age_bands, "parent dashboard.household.age_bands");
  validateCategoryCounts(household.academic_levels, "parent dashboard.household.academic_levels");
  validateCategoryCounts(household.centres_breakdown, "parent dashboard.household.centres_breakdown");
  validateCategoryCounts(household.upcoming_subjects, "parent dashboard.household.upcoming_subjects");

  const bookings = recordValue(dashboard.bookings, "parent dashboard.bookings");
  if (bookings.next !== undefined) validateBooking(bookings.next, "parent dashboard.bookings.next");
  arrayValue(bookings.upcoming, "parent dashboard.bookings.upcoming").forEach((item, index) => validateBooking(item, `parent dashboard.bookings.upcoming[${index}]`));
  const bookingCounts = recordValue(bookings.counts, "parent dashboard.bookings.counts");
  for (const key of ["upcoming", "confirmed", "waitlisted", "credits_required", "cancelled_last_30_days"] as const) {
    numberValue(bookingCounts[key], `parent dashboard.bookings.counts.${key}`);
  }

  const credits = recordValue(dashboard.credits, "parent dashboard.credits");
  numberValue(credits.total_balance, "parent dashboard.credits.total_balance");
  arrayValue(credits.wallets, "parent dashboard.credits.wallets").forEach((item, index) => {
    const wallet = recordValue(item, `parent dashboard.credits.wallets[${index}]`);
    stringValue(wallet.id, `parent dashboard.credits.wallets[${index}].id`);
    stringValue(wallet.parent_profile_id, `parent dashboard.credits.wallets[${index}].parent_profile_id`);
    numberValue(wallet.balance_credits, `parent dashboard.credits.wallets[${index}].balance_credits`);
  });

  const queries = recordValue(dashboard.queries, "parent dashboard.queries");
  const queryCounts = recordValue(queries.counts, "parent dashboard.queries.counts");
  for (const key of ["unresolved", "awaiting_centre", "awaiting_parent"] as const) {
    numberValue(queryCounts[key], `parent dashboard.queries.counts.${key}`);
  }
  arrayValue(queries.recent, "parent dashboard.queries.recent").forEach((item, index) => validateQuery(item, `parent dashboard.queries.recent[${index}]`));

  arrayValue(dashboard.recent_feedback, "parent dashboard.recent_feedback").forEach((item, index) => validateFeedback(item, `parent dashboard.recent_feedback[${index}]`));

  const notifications = recordValue(dashboard.notifications, "parent dashboard.notifications");
  for (const key of ["active_count", "unread_count", "unread_feedback"] as const) {
    numberValue(notifications[key], `parent dashboard.notifications.${key}`);
  }
  arrayValue(notifications.recent, "parent dashboard.notifications.recent").forEach((item, index) => validateNotification(item, `parent dashboard.notifications.recent[${index}]`));
  arrayValue(dashboard.actions, "parent dashboard.actions").forEach((item, index) => validateAction(item, `parent dashboard.actions[${index}]`));
}

export function mapParentDashboard(value: unknown): ParentDashboard {
  assertBackendParentDashboard(value);
  return {
    generatedAt: value.generated_at,
    parent: {
      parentProfileId: value.parent.parent_profile_id,
      firstName: value.parent.first_name,
      lastName: value.parent.last_name,
      preferredName: value.parent.preferred_name,
      email: value.parent.email,
      emailVerified: value.parent.email_verified,
      phoneNumber: value.parent.phone_number,
      profileStatus: value.parent.profile_status,
      accountStatus: value.parent.account_status,
    },
    household: {
      linkedChildren: value.household.linked_children,
      centres: value.household.centres,
      childrenWithLogin: value.household.children_with_login,
      academicYear: value.household.academic_year
        ? {
            id: value.household.academic_year.id,
            name: value.household.academic_year.name,
            status: value.household.academic_year.status,
          }
        : undefined,
      children: (value.household.children ?? []).map(mapChild),
      ageBands: (value.household.age_bands ?? []).map(mapCategoryCount),
      academicLevels: (value.household.academic_levels ?? []).map(mapCategoryCount),
      centresBreakdown: (value.household.centres_breakdown ?? []).map(mapCategoryCount),
      upcomingSubjects: (value.household.upcoming_subjects ?? []).map(mapCategoryCount),
    },
    bookings: {
      next: value.bookings.next ? mapBooking(value.bookings.next) : undefined,
      upcoming: (value.bookings.upcoming ?? []).map(mapBooking),
      counts: {
        upcoming: value.bookings.counts.upcoming,
        confirmed: value.bookings.counts.confirmed,
        waitlisted: value.bookings.counts.waitlisted,
        creditsRequired: value.bookings.counts.credits_required,
        cancelledLast30Days: value.bookings.counts.cancelled_last_30_days,
      },
    },
    credits: {
      totalBalance: value.credits.total_balance,
      wallets: (value.credits.wallets ?? []).map((wallet) => ({
        id: wallet.id,
        parentProfileId: wallet.parent_profile_id,
        balanceCredits: wallet.balance_credits,
      })),
    },
    queries: {
      counts: {
        unresolved: value.queries.counts.unresolved,
        awaitingCentre: value.queries.counts.awaiting_centre,
        awaitingParent: value.queries.counts.awaiting_parent,
      },
      recent: (value.queries.recent ?? []).map(mapQuery),
    },
    recentFeedback: (value.recent_feedback ?? []).map(mapFeedback),
    notifications: {
      activeCount: value.notifications.active_count,
      unreadCount: value.notifications.unread_count,
      unreadFeedback: value.notifications.unread_feedback,
      recent: (value.notifications.recent ?? []).map(mapNotification),
    },
    actions: (value.actions ?? []).map(mapAction),
  };
}
