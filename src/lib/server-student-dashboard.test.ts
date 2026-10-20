import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mapStudentDashboard,
  type BackendStudentDashboard,
} from "./server-student-dashboard-mapper";

function backendDashboard(): BackendStudentDashboard {
  return {
    generated_at: "2026-10-20T12:00:00Z",
    student: {
      student_profile_id: "student-1",
      first_name: "Ama",
      last_name: "Ackor",
      preferred_name: "Amy",
      people_code: "STU1001",
      centre_id: "centre-1",
      centre_code: "STC-001",
      centre_name: "Labour Memorial Hall",
      centre_time_zone: "Europe/London",
      profile_status: "active",
      account_status: "active",
      email_verified: true,
      email_login_enabled: true,
      people_code_login_enabled: true,
      can_manage_own_bookings: true,
      current_placement: {
        id: "placement-1",
        status: "active",
        academic_year_id: "year-1",
        academic_year_name: "2026/27",
        academic_year_status: "current",
        academic_level_id: "level-1",
        academic_level_name: "Year 6",
        academic_level_status: "active",
      },
    },
    bookings: {
      next_confirmed: {
        id: "booking-1",
        session_id: "session-1",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        centre_time_zone: "Europe/London",
        subject_id: "subject-1",
        subject_name: "Mathematics",
        subject_code: "MATH",
        status: "confirmed",
        lesson_focus: "Fractions",
        starts_at: "2026-10-21T09:00:00Z",
        ends_at: "2026-10-21T11:00:00Z",
      },
      upcoming: [],
      counts: {
        upcoming: 1,
        confirmed: 1,
        waitlisted: 0,
        credits_required: 0,
        cancelled_last_30_days: 1,
      },
    },
    credits: { household_balance: 6, wallet_count: 1 },
    attendance: {
      total: 5,
      present: 3,
      late: 1,
      absent: 1,
      excused: 0,
      attended_sessions: 4,
      attended_minutes: 480,
      attended_hours: 8,
      attendance_rate: 80,
      recent: [{
        id: "attendance-1",
        session_id: "session-0",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        subject_id: "subject-1",
        subject_name: "Mathematics",
        status: "present",
        starts_at: "2026-10-19T09:00:00Z",
        ends_at: "2026-10-19T11:00:00Z",
        marked_at: "2026-10-19T09:03:00Z",
        self_checked_in: true,
      }],
    },
    recent_feedback: [{
      id: "feedback-1",
      centre_id: "centre-1",
      centre_name: "Labour Memorial Hall",
      subject_id: "subject-1",
      subject_name: "Mathematics",
      tutor_first_name: "Tutor",
      tutor_last_name: "One",
      feedback_text: "Good progress.",
      session_starts_at: "2026-10-19T09:00:00Z",
      published_at: "2026-10-19T12:00:00Z",
      unread: true,
    }],
    queries: {
      counts: { unresolved: 1, awaiting_centre: 1, awaiting_student: 0 },
      recent: [{
        id: "query-1",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        category: "booking",
        subject: "A booking question",
        status: "awaiting_staff",
        last_message_at: "2026-10-20T11:00:00Z",
      }],
    },
    notifications: {
      active_count: 1,
      unread_count: 1,
      unread_feedback: 1,
      recent: [{
        id: "notification-1",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        type: "session_feedback_published",
        title: "New tutor feedback",
        message: "Feedback is ready.",
        action_href: "/app/student/feedback?tab=feedback",
        available_at: "2026-10-19T12:00:00Z",
      }],
    },
    subject_participation: [{ key: "subject-1", label: "Mathematics", count: 4 }],
    actions: [{
      key: "unread_tutor_feedback",
      kind: "unread_feedback",
      title: "New tutor feedback is available",
      description: "1 feedback item is ready to review.",
      count: 1,
      href: "/app/student/feedback?tab=feedback",
    }],
  };
}

test("student dashboard mapping converts the complete backend contract to camelCase", () => {
  const result = mapStudentDashboard(backendDashboard());

  assert.equal(result.generatedAt, "2026-10-20T12:00:00Z");
  assert.equal(result.student.studentProfileId, "student-1");
  assert.equal(result.student.currentPlacement?.academicLevelName, "Year 6");
  assert.equal(result.student.canManageOwnBookings, true);
  assert.equal(result.bookings.nextConfirmed?.lessonFocus, "Fractions");
  assert.equal(result.bookings.counts.cancelledLast30Days, 1);
  assert.equal(result.credits.householdBalance, 6);
  assert.equal(result.attendance.attendedHours, 8);
  assert.equal(result.attendance.recent[0].selfCheckedIn, true);
  assert.equal(result.queries.counts.awaitingCentre, 1);
  assert.equal(result.recentFeedback[0].tutorFirstName, "Tutor");
  assert.equal(result.notifications.recent[0].actionHref, "/app/student/feedback?tab=feedback");
  assert.equal(result.subjectParticipation[0].count, 4);
  assert.equal(result.actions[0].kind, "unread_feedback");
});

test("student dashboard mapping preserves legitimate empty collections", () => {
  const value = backendDashboard();
  value.student.current_placement = undefined;
  value.bookings.next_confirmed = undefined;
  value.bookings.upcoming = [];
  value.attendance.recent = [];
  value.recent_feedback = [];
  value.queries.recent = [];
  value.notifications.recent = [];
  value.subject_participation = [];
  value.actions = [];

  const result = mapStudentDashboard(value);
  assert.equal(result.student.currentPlacement, undefined);
  assert.equal(result.bookings.nextConfirmed, undefined);
  assert.deepEqual(result.bookings.upcoming, []);
  assert.deepEqual(result.attendance.recent, []);
  assert.deepEqual(result.recentFeedback, []);
  assert.deepEqual(result.subjectParticipation, []);
  assert.deepEqual(result.actions, []);
});

test("student dashboard mapping rejects malformed or partial payloads", () => {
  assert.throws(
    () => mapStudentDashboard({ generated_at: "2026-10-20T12:00:00Z" }),
    /student dashboard\.student must be an object/,
  );

  const invalidCount = backendDashboard() as unknown as Record<string, unknown>;
  const attendance = invalidCount.attendance as Record<string, unknown>;
  attendance.attended_hours = "8";
  assert.throws(
    () => mapStudentDashboard(invalidCount),
    /attended_hours must be a non-negative finite number/,
  );
});
