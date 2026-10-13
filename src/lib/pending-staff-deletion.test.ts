import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canDeletePendingManager,
  canDeletePendingTutor,
  deletePendingStaff,
  PendingStaffDeletionError,
  pendingManagerDeletionEndpoint,
  pendingTutorDeletionEndpoint,
  type PendingStaffDeletionTarget,
} from "./pending-staff-deletion";

const manager = {
  id: "manager-id",
  accountStatus: "pending_activation",
  pendingDeletionEligible: true,
  roles: [{ roleKey: "manager" }],
};
const ownerContext = { actorUserId: "actor-id", capabilities: { canDeletePendingManagers: true } };
const tutor = {
  userId: "tutor-user-id",
  accountStatus: "pending_activation",
  pendingDeletionEligible: true,
  mfaRequired: false,
};
const tutorContext = { actorUserId: "actor-id", canDeletePendingTutors: true };
const target: PendingStaffDeletionTarget = {
  kind: "manager",
  name: "Pending Manager",
  email: "pending@example.test",
  endpoint: pendingManagerDeletionEndpoint(manager.id),
  eligible: true,
};

function stubFetch(replies: Array<Response | Error>) {
  const calls: Array<{ input: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push({ input: String(input), init });
    const reply = replies.shift();
    if (!reply) throw new Error("Unexpected request.");
    if (reply instanceof Error) throw reply;
    return reply;
  };
  return { calls, fetcher };
}

function csrfResponse() {
  return Response.json({ csrfToken: "non-secret-test-csrf" });
}

test("manager presentation requires backend eligibility, permission, exact role and a different actor", () => {
  assert.equal(canDeletePendingManager(manager, ownerContext), true);
  assert.equal(canDeletePendingManager(manager, { ...ownerContext, capabilities: { canDeletePendingManagers: false } }), false);
  assert.equal(canDeletePendingManager({ ...manager, pendingDeletionEligible: false }, ownerContext), false);
  assert.equal(canDeletePendingManager({ ...manager, accountStatus: "active" }, ownerContext), false);
  assert.equal(canDeletePendingManager(manager, { ...ownerContext, actorUserId: manager.id }), false);
  assert.equal(canDeletePendingManager({ ...manager, roles: [] }, ownerContext), false);
  for (const roleKey of ["owner", "tutor", "parent", "student"]) {
    assert.equal(canDeletePendingManager({ ...manager, roles: [...manager.roles, { roleKey }] }, ownerContext), false);
  }
});

test("tutor presentation hides deletion for active, privileged, self or denied accounts", () => {
  assert.equal(canDeletePendingTutor(tutor, tutorContext), true);
  assert.equal(canDeletePendingTutor(tutor, { ...tutorContext, canDeletePendingTutors: false }), false);
  assert.equal(canDeletePendingTutor(tutor, { ...tutorContext, actorUserId: tutor.userId }), false);
  assert.equal(canDeletePendingTutor({ ...tutor, mfaRequired: true }, tutorContext), false);
  assert.equal(canDeletePendingTutor({ ...tutor, pendingDeletionEligible: false }, tutorContext), false);
  for (const accountStatus of ["active", "suspended", "disabled"]) {
    assert.equal(canDeletePendingTutor({ ...tutor, accountStatus }, tutorContext), false);
  }
});

test("endpoint builders encode identifiers rather than accepting path or query injection", () => {
  assert.equal(pendingManagerDeletionEndpoint("id/with?query"), "/api/users/id%2Fwith%3Fquery/pending-account");
  assert.equal(pendingTutorDeletionEndpoint("id&action=other"), "/api/profiles/onboarding/tutors?action=delete-pending&tutorProfileId=id%26action%3Dother");
});

test("204 deletion sends one same-origin CSRF-protected DELETE and does not parse an empty response", async () => {
  const mock = stubFetch([csrfResponse(), new Response(null, { status: 204 })]);
  await deletePendingStaff(target, mock.fetcher);
  assert.equal(mock.calls.length, 2);
  assert.equal(mock.calls[0].input, "/api/auth/csrf");
  assert.equal(mock.calls[1].input, target.endpoint);
  assert.equal(mock.calls[1].init?.method, "DELETE");
  assert.equal(mock.calls[1].init?.credentials, "same-origin");
  assert.equal(mock.calls[1].init?.cache, "no-store");
  assert.equal(new Headers(mock.calls[1].init?.headers).get("x-csrf-token"), "non-secret-test-csrf");
  assert.equal(new Headers(mock.calls[1].init?.headers).has("authorization"), false);
  assert.equal(mock.calls[1].init?.body, undefined);
});

test("tutor deletion uses the tutor-profile endpoint, not a browser-supplied user or centre", async () => {
  const mock = stubFetch([csrfResponse(), new Response(null, { status: 204 })]);
  const tutorTarget = { ...target, kind: "tutor" as const, endpoint: pendingTutorDeletionEndpoint("profile-id") };
  await deletePendingStaff(tutorTarget, mock.fetcher);
  assert.equal(mock.calls[1].input, "/api/profiles/onboarding/tutors?action=delete-pending&tutorProfileId=profile-id");
  assert.equal(mock.calls[1].init?.body, undefined);
});

test("ineligible or non-BFF targets cannot send any requests", async () => {
  for (const invalid of [{ ...target, eligible: false }, { ...target, endpoint: "https://other.example.test/delete" }]) {
    const mock = stubFetch([]);
    await assert.rejects(deletePendingStaff(invalid, mock.fetcher), PendingStaffDeletionError);
    assert.equal(mock.calls.length, 0);
  }
});

test("CSRF errors and malformed CSRF responses cannot issue DELETE", async () => {
  for (const response of [Response.json({}, { status: 403 }), Response.json({}), Response.json({ csrfToken: "" }), new Error("offline")]) {
    const mock = stubFetch([response]);
    await assert.rejects(deletePendingStaff(target, mock.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof PendingStaffDeletionError);
      assert.equal(caught.requiresRefresh, false);
      return true;
    });
    assert.equal(mock.calls.length, 1);
  }
});

test("activation conflict or already-removed account requires refresh and never auto-retries", async () => {
  for (const status of [404, 409]) {
    const mock = stubFetch([csrfResponse(), Response.json({ error: "Account status changed." }, { status })]);
    await assert.rejects(deletePendingStaff(target, mock.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof PendingStaffDeletionError);
      assert.equal(caught.status, status);
      assert.equal(caught.message, "Account status changed.");
      assert.equal(caught.requiresRefresh, true);
      return true;
    });
    assert.equal(mock.calls.length, 2);
  }
});

test("permission, expired-session and rate-limit denials are not mistaken for deletion", async () => {
  for (const status of [401, 403, 429]) {
    const mock = stubFetch([csrfResponse(), Response.json({ error: "Access denied." }, { status })]);
    await assert.rejects(deletePendingStaff(target, mock.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof PendingStaffDeletionError);
      assert.equal(caught.status, status);
      assert.equal(caught.requiresRefresh, false);
      return true;
    });
    assert.equal(mock.calls.length, 2);
  }
});

test("uncertain network/service results require review rather than retrying a destructive request", async () => {
  for (const response of [new Error("response lost"), new Response("unavailable", { status: 503 }), Response.json({ unexpected: true })]) {
    const mock = stubFetch([csrfResponse(), response]);
    await assert.rejects(deletePendingStaff(target, mock.fetcher), (caught: unknown) => {
      assert.ok(caught instanceof PendingStaffDeletionError);
      assert.equal(caught.requiresRefresh, true);
      return true;
    });
    assert.equal(mock.calls.length, 2);
  }
});
