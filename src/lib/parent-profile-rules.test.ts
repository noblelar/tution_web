import assert from "node:assert/strict";
import { test } from "node:test";

import type { BookingParticipant } from "./booking-types";
import type { ParentSelfProfile } from "./profile-types";
import {
  formatParentAddress,
  parentProfileDisplayName,
  parentProfileHouseholdSummary,
  parentProfileInitials,
  parentProfileReadiness,
} from "./parent-profile-rules";

function profile(overrides: Partial<ParentSelfProfile> = {}): ParentSelfProfile {
  return {
    id: "parent-1",
    firstName: "Noble",
    lastName: "Ackor",
    email: "parent@example.com",
    emailVerified: true,
    phoneNumber: "07700000000",
    peopleCode: "STC-ABC123",
    primaryCentre: { id: "centre-1", code: "STC-001", name: "Labour Memorial Hall" },
    marketingOptIn: false,
    contactConsent: true,
    profileStatus: "active",
    accountStatus: "active",
    profileUpdatedAt: "2026-10-19T10:00:00Z",
    ...overrides,
  };
}

test("parent profile presentation uses preferred name and legal-name initials", () => {
  const value = profile({ preferredName: "Nobes" });
  assert.equal(parentProfileDisplayName(value), "Nobes");
  assert.equal(parentProfileInitials(value), "NA");
});

test("parent address removes empty values and joins the locality", () => {
  assert.deepEqual(formatParentAddress(profile({
    addressLine1: "1 High Street",
    addressLine2: " ",
    city: "Slough",
    countyRegion: "Berkshire",
    postalCode: "SL1 1AA",
    country: "United Kingdom",
  })), ["1 High Street", "Slough, Berkshire", "SL1 1AA", "United Kingdom"]);
});

test("readiness identifies missing required contact and centre details", () => {
  const readiness = parentProfileReadiness(profile({ phoneNumber: undefined, primaryCentre: undefined, emailVerified: false }));
  assert.equal(readiness.contactDetailsReady, false);
  assert.equal(readiness.centreAssigned, false);
  assert.equal(readiness.emailVerified, false);
  assert.deepEqual(readiness.missingRequiredDetails, ["phone number", "primary centre"]);
});

test("household summary counts unique centres and requires a linked child for queries", () => {
  const participants = [
    participant("student-1", "centre-1"),
    participant("student-2", "centre-1"),
    participant("student-3", "centre-2"),
  ];
  assert.deepEqual(parentProfileHouseholdSummary(participants), {
    children: 3,
    centres: 2,
    canStartQuery: true,
    queryCentreId: "centre-1",
  });
  assert.equal(parentProfileHouseholdSummary([]).canStartQuery, false);
});

function participant(studentProfileId: string, centreId: string): BookingParticipant {
  return {
    studentProfileId,
    firstName: "Student",
    lastName: studentProfileId,
    peopleCode: studentProfileId,
    centreId,
    centreName: centreId,
    canManageOwnBookings: false,
    hasLoginAccount: false,
    wallets: [],
  };
}
