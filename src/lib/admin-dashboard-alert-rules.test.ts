import assert from "node:assert/strict";
import { test } from "node:test";

import { dashboardActions } from "./admin-dashboard-alert-rules";
import type { DashboardAlerts } from "./admin-dashboard-types";

const empty: DashboardAlerts = {
  pendingTutors: 0, pendingManagers: 0, pendingGuardians: 0, pendingStudents: 0,
  unresolvedQueries: 0, failedDeliveries: [],
};

test("empty operational state shows no action links", () => {
  assert.deepEqual(dashboardActions(empty), []);
});

test("failed deliveries precede pending activations and link to their management areas", () => {
  const actions = dashboardActions({
    ...empty,
    pendingTutors: 2,
    pendingGuardians: 1,
    unresolvedQueries: 3,
    failedDeliveries: [
      { messageType: "manager_activation", count: 1, latestAt: "2026-10-18T12:00:00Z" },
      { messageType: "unknown", count: 4, latestAt: "2026-10-18T11:00:00Z" },
    ],
  });
  assert.deepEqual(actions.map((action) => action.key), [
    "failed-manager_activation", "pending-tutors", "pending-guardians", "unresolved-queries",
  ]);
  assert.equal(actions[0].href, "/app/admin/users");
  assert.equal(actions[1].href, "/app/admin/tutors");
  assert.equal(actions[2].href, "/app/admin/parents");
  assert.equal(actions[3].href, "/app/admin/feedback");
});
