import assert from "node:assert/strict";
import { test } from "node:test";

import {
  canReissueProfileInvitation,
  studentEmailRequired,
  validOtherRelationshipDescription,
} from "./profile-onboarding-rules";

test("student email is required only without a selected guardian", () => {
  assert.equal(studentEmailRequired(""), true);
  assert.equal(studentEmailRequired("   "), true);
  assert.equal(studentEmailRequired("guardian-profile-id"), false);
});

test("Other relationship requires a short one-to-three-word description", () => {
  for (const value of ["guardian", "elder brother", "family friend carer"]) {
    assert.equal(validOtherRelationshipDescription(value), true);
  }
  for (const value of ["", "    ", "one two three four", "a".repeat(81)]) {
    assert.equal(validOtherRelationshipDescription(value), false);
  }
});

test("reissue control is visible only for a managed pending login account", () => {
  assert.equal(canReissueProfileInvitation("pending_activation", true), true);
  assert.equal(canReissueProfileInvitation("pending_activation", false), false);
  assert.equal(canReissueProfileInvitation("active", true), false);
  assert.equal(canReissueProfileInvitation(undefined, true), false);
});
