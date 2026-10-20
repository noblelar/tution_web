import assert from "node:assert/strict";
import test from "node:test";

import type { StudentSelfProfile } from "./profile-types";
import { studentLoginMethods, studentProfileDisplayName, studentProfileInitials, studentProfileReadiness } from "./student-profile-rules";

function profile(overrides: Partial<StudentSelfProfile> = {}): StudentSelfProfile {
  return {
    id: "student-1",
    firstName: "Maya",
    lastName: "Patel",
    dateOfBirth: "2012-04-12",
    email: "maya@example.com",
    emailVerified: true,
    peopleCode: "STC-ABC123",
    primaryCentre: { id: "centre-1", code: "STC-001", name: "Labour Memorial Hall" },
    currentPlacement: {
      id: "placement-1",
      status: "active",
      academicYearId: "year-1",
      academicYearName: "2026/27",
      academicYearStatus: "active",
      academicLevelId: "level-1",
      academicLevelName: "Year 8",
      academicLevelStatus: "active",
    },
    emailLoginEnabled: true,
    peopleCodeLoginEnabled: true,
    canManageOwnBookings: true,
    profileStatus: "active",
    accountStatus: "active",
    profileUpdatedAt: "2026-10-19T12:00:00Z",
    ...overrides,
  };
}

test("student profile uses preferred name while retaining legal-name initials", () => {
  const value = profile({ preferredName: "May" });
  assert.equal(studentProfileDisplayName(value), "May");
  assert.equal(studentProfileInitials(value), "MP");
});

test("student login methods reflect only enabled authentication paths", () => {
  assert.deepEqual(studentLoginMethods(profile({ emailLoginEnabled: false })), ["People Code and date of birth"]);
  assert.deepEqual(studentLoginMethods(profile({ peopleCodeLoginEnabled: false })), ["Email and password"]);
});

test("student profile readiness requires centre, current placement, and login access", () => {
  const result = studentProfileReadiness(profile({ primaryCentre: undefined, currentPlacement: undefined, emailLoginEnabled: false, peopleCodeLoginEnabled: false }));
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ["primary centre", "current academic placement", "login method"]);
});
