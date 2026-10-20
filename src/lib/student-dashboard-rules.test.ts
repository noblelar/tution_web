import assert from "node:assert/strict";
import { test } from "node:test";

import {
  studentDashboardActionTone,
  studentDashboardBookingStatuses,
  studentDashboardDisplayName,
  studentDashboardPrimaryAction,
  studentDashboardShortcuts,
} from "./student-dashboard-rules";
import type { StudentDashboard } from "./student-dashboard-types";

function dashboard(): StudentDashboard {
  return {
    generatedAt: "2026-10-20T12:00:00Z",
    student: {
      studentProfileId: "student-1",
      firstName: "Ama",
      lastName: "Ackor",
      preferredName: "Amy",
      peopleCode: "STU1001",
      centreId: "centre-1",
      centreName: "Labour Memorial Hall",
      centreTimeZone: "Europe/London",
      profileStatus: "active",
      accountStatus: "active",
      emailVerified: true,
      emailLoginEnabled: true,
      peopleCodeLoginEnabled: true,
      canManageOwnBookings: true,
    },
    bookings: {
      upcoming: [],
      counts: {
        upcoming: 4,
        confirmed: 2,
        waitlisted: 1,
        creditsRequired: 1,
        cancelledLast30Days: 3,
      },
    },
    credits: { householdBalance: 5, walletCount: 1 },
    attendance: {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      attendedSessions: 0,
      attendedMinutes: 0,
      attendedHours: 0,
      attendanceRate: 0,
      recent: [],
    },
    recentFeedback: [],
    queries: {
      counts: { unresolved: 0, awaitingCentre: 0, awaitingStudent: 0 },
      recent: [],
    },
    notifications: { activeCount: 0, unreadCount: 0, unreadFeedback: 0, recent: [] },
    subjectParticipation: [],
    actions: [],
  };
}

test("student greeting prefers the preferred name and falls back to the first name", () => {
  const value = dashboard();
  assert.equal(studentDashboardDisplayName(value), "Amy");
  value.student.preferredName = " ";
  assert.equal(studentDashboardDisplayName(value), "Ama");
});

test("the first server-ranked student action remains the page priority", () => {
  const value = dashboard();
  value.actions = [
    { key: "credits", kind: "credits_required", title: "Credits", description: "Add credits", count: 1, href: "/app/student/bookings" },
    { key: "query", kind: "query_response", title: "Reply", description: "Reply now", count: 2, href: "/app/student/feedback?tab=queries" },
  ];
  assert.equal(studentDashboardPrimaryAction(value)?.key, "credits");
  assert.equal(studentDashboardActionTone(value.actions[0]), "critical");
  assert.equal(studentDashboardActionTone(value.actions[1]), "warning");
});

test("student booking presentation maps every status count", () => {
  const items = studentDashboardBookingStatuses(dashboard().bookings.counts);
  assert.deepEqual(items.map((item) => [item.key, item.count]), [
    ["confirmed", 2],
    ["waitlisted", 1],
    ["credits_required", 1],
    ["cancelled", 3],
  ]);
});

test("session discovery is disabled when the student cannot manage bookings", () => {
  const value = dashboard();
  value.student.canManageOwnBookings = false;
  const shortcuts = studentDashboardShortcuts(value);
  assert.equal(shortcuts.find((item) => item.key === "sessions")?.enabled, false);
  assert.equal(shortcuts.find((item) => item.key === "bookings")?.enabled, true);
  assert.equal(shortcuts.find((item) => item.key === "feedback")?.enabled, true);
  assert.equal(shortcuts.find((item) => item.key === "profile")?.enabled, true);
});
