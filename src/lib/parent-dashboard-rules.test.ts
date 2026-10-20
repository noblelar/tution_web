import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parentDashboardActionTone,
  parentDashboardBookingStatuses,
  parentDashboardDisplayName,
  parentDashboardPrimaryAction,
  parentDashboardShortcuts,
} from "./parent-dashboard-rules";
import type { ParentDashboard } from "./parent-dashboard-types";

function dashboard(overrides: Partial<ParentDashboard> = {}): ParentDashboard {
  return {
    generatedAt: "2026-10-19T12:00:00Z",
    parent: {
      parentProfileId: "parent-1",
      firstName: "Noble",
      lastName: "Ackor",
      preferredName: "Nobes",
      email: "parent@example.com",
      emailVerified: true,
      phoneNumber: "07700000000",
      profileStatus: "active",
      accountStatus: "active",
    },
    household: {
      linkedChildren: 1,
      centres: 1,
      childrenWithLogin: 0,
      children: [],
      ageBands: [],
      academicLevels: [],
      centresBreakdown: [],
      upcomingSubjects: [],
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
    credits: { totalBalance: 5, wallets: [] },
    queries: {
      counts: { unresolved: 2, awaitingCentre: 1, awaitingParent: 1 },
      recent: [],
    },
    recentFeedback: [],
    notifications: { activeCount: 1, unreadCount: 1, unreadFeedback: 0, recent: [] },
    actions: [],
    ...overrides,
  };
}

test("the parent greeting prefers the preferred name and falls back to the first name", () => {
  assert.equal(parentDashboardDisplayName(dashboard()), "Nobes");
  const withoutPreferredName = dashboard();
  withoutPreferredName.parent.preferredName = " ";
  assert.equal(parentDashboardDisplayName(withoutPreferredName), "Noble");
});

test("the first backend-ranked action remains the dashboard priority", () => {
  const value = dashboard({
    actions: [
      { key: "credits", kind: "credits_required", title: "Credits", description: "Add credits", count: 1, href: "/credits" },
      { key: "query", kind: "query_response", title: "Reply", description: "Reply now", count: 2, href: "/queries" },
    ],
  });
  assert.equal(parentDashboardPrimaryAction(value)?.key, "credits");
  assert.equal(parentDashboardActionTone(value.actions[0]), "critical");
  assert.equal(parentDashboardActionTone(value.actions[1]), "warning");
});

test("booking status presentation maps all dashboard counts", () => {
  const items = parentDashboardBookingStatuses(dashboard().bookings.counts);
  assert.deepEqual(items.map((item) => [item.key, item.count]), [
    ["confirmed", 2],
    ["waitlisted", 1],
    ["credits_required", 1],
    ["cancelled", 3],
  ]);
});

test("child-dependent shortcuts are unavailable until a child is linked", () => {
  const value = dashboard();
  value.household.linkedChildren = 0;
  const shortcuts = parentDashboardShortcuts(value);

  assert.equal(shortcuts.find((item) => item.key === "sessions")?.enabled, false);
  assert.equal(shortcuts.find((item) => item.key === "bookings")?.enabled, false);
  assert.equal(shortcuts.find((item) => item.key === "queries")?.enabled, false);
  assert.equal(shortcuts.find((item) => item.key === "children")?.enabled, true);
  assert.equal(shortcuts.find((item) => item.key === "credits")?.enabled, true);
  assert.equal(shortcuts.find((item) => item.key === "profile")?.enabled, true);
});
