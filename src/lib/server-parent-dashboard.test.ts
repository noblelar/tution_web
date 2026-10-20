import assert from "node:assert/strict";
import { test } from "node:test";

import {
  mapParentDashboard,
  type BackendParentDashboard,
} from "./server-parent-dashboard-mapper";

function backendDashboard(): BackendParentDashboard {
  return {
    generated_at: "2026-10-19T12:00:00Z",
    parent: {
      parent_profile_id: "parent-1",
      first_name: "Noble",
      last_name: "Ackor",
      preferred_name: "Nobes",
      email: "parent@example.com",
      email_verified: true,
      phone_number: "07700000000",
      profile_status: "active",
      account_status: "active",
    },
    household: {
      linked_children: 1,
      centres: 1,
      children_with_login: 0,
      academic_year: { id: "year-1", name: "2026/27", status: "current" },
      children: [{
        student_profile_id: "student-1",
        first_name: "Student",
        last_name: "One",
        people_code: "STC-001",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        centre_time_zone: "Europe/London",
        has_login_account: false,
        age_years: 10,
        age_band: "8_10",
        academic_level_id: "level-1",
        academic_level: "Year 5",
      }],
      age_bands: [{ key: "8_10", label: "8–10", count: 1 }],
      academic_levels: [{ key: "level-1", label: "Year 5", count: 1 }],
      centres_breakdown: [{ key: "centre-1", label: "Labour Memorial Hall", count: 1 }],
      upcoming_subjects: [{ key: "subject-1", label: "Mathematics", count: 2 }],
    },
    bookings: {
      next: {
        id: "booking-1",
        student_profile_id: "student-1",
        student_first_name: "Student",
        student_last_name: "One",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        centre_time_zone: "Europe/London",
        subject_id: "subject-1",
        subject_name: "Mathematics",
        subject_code: "MATH",
        status: "confirmed",
        lesson_focus: "Fractions",
        starts_at: "2026-10-20T09:00:00Z",
        ends_at: "2026-10-20T11:00:00Z",
      },
      upcoming: [],
      counts: {
        upcoming: 1,
        confirmed: 1,
        waitlisted: 0,
        credits_required: 0,
        cancelled_last_30_days: 2,
      },
    },
    credits: {
      total_balance: 6,
      wallets: [{ id: "wallet-1", parent_profile_id: "parent-1", balance_credits: 6 }],
    },
    queries: {
      counts: { unresolved: 1, awaiting_centre: 1, awaiting_parent: 0 },
      recent: [{
        id: "query-1",
        student_profile_id: "student-1",
        student_first_name: "Student",
        student_last_name: "One",
        centre_id: "centre-1",
        centre_name: "Labour Memorial Hall",
        category: "booking",
        subject: "A booking question",
        status: "awaiting_staff",
        last_message_at: "2026-10-19T11:00:00Z",
      }],
    },
    recent_feedback: [{
      id: "feedback-1",
      student_profile_id: "student-1",
      student_first_name: "Student",
      student_last_name: "One",
      centre_id: "centre-1",
      centre_name: "Labour Memorial Hall",
      subject_id: "subject-1",
      subject_name: "Mathematics",
      tutor_first_name: "Tutor",
      tutor_last_name: "One",
      feedback_text: "Good progress.",
      session_starts_at: "2026-10-18T09:00:00Z",
      published_at: "2026-10-18T12:00:00Z",
      unread: true,
    }],
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
        action_href: "/app/parent/feedback?tab=feedback",
        available_at: "2026-10-18T12:00:00Z",
      }],
    },
    actions: [{
      key: "unread_tutor_feedback",
      kind: "unread_feedback",
      title: "New tutor feedback is available",
      description: "1 feedback item is ready to review.",
      count: 1,
      href: "/app/parent/feedback?tab=feedback",
    }],
  };
}

test("parent dashboard mapping converts the complete backend contract to camelCase", () => {
  const result = mapParentDashboard(backendDashboard());

  assert.equal(result.generatedAt, "2026-10-19T12:00:00Z");
  assert.equal(result.parent.parentProfileId, "parent-1");
  assert.equal(result.household.academicYear?.name, "2026/27");
  assert.equal(result.household.children[0].studentProfileId, "student-1");
  assert.equal(result.household.children[0].academicLevel, "Year 5");
  assert.equal(result.bookings.next?.lessonFocus, "Fractions");
  assert.equal(result.bookings.counts.cancelledLast30Days, 2);
  assert.equal(result.credits.wallets[0].balanceCredits, 6);
  assert.equal(result.queries.counts.awaitingCentre, 1);
  assert.equal(result.queries.recent[0].lastMessageAt, "2026-10-19T11:00:00Z");
  assert.equal(result.recentFeedback[0].tutorFirstName, "Tutor");
  assert.equal(result.notifications.recent[0].actionHref, "/app/parent/feedback?tab=feedback");
  assert.equal(result.actions[0].kind, "unread_feedback");
});

test("parent dashboard mapping preserves legitimate empty collections", () => {
  const value = backendDashboard();
  value.household.children = [];
  value.bookings.next = undefined;
  value.bookings.upcoming = [];
  value.queries.recent = [];
  value.recent_feedback = [];
  value.notifications.recent = [];
  value.actions = [];

  const result = mapParentDashboard(value);
  assert.equal(result.bookings.next, undefined);
  assert.deepEqual(result.household.children, []);
  assert.deepEqual(result.queries.recent, []);
  assert.deepEqual(result.recentFeedback, []);
  assert.deepEqual(result.notifications.recent, []);
  assert.deepEqual(result.actions, []);
});

test("parent dashboard mapping rejects malformed or partial payloads", () => {
  assert.throws(
    () => mapParentDashboard({ generated_at: "2026-10-19T12:00:00Z" }),
    /parent dashboard\.parent must be an object/,
  );

  const invalidCount = backendDashboard() as unknown as Record<string, unknown>;
  const household = invalidCount.household as Record<string, unknown>;
  household.linked_children = "1";
  assert.throws(
    () => mapParentDashboard(invalidCount),
    /linked_children must be a non-negative finite number/,
  );
});
