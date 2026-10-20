import assert from "node:assert/strict";
import { test } from "node:test";

import type { BookingParticipant, SessionBooking } from "./booking-types";
import { buildParentChildDirectory, filterParentChildDirectory, parentChildDirectoryMetrics } from "./parent-children-rules";

const participants: BookingParticipant[] = [
  { studentProfileId: "student-2", firstName: "Zara", lastName: "Brown", peopleCode: "ST-002", centreId: "centre-2", centreName: "North Centre", canManageOwnBookings: false, hasLoginAccount: false, wallets: [{ parentProfileId: "parent-1", parentName: "Parent", balanceCredits: 2 }] },
  { studentProfileId: "student-1", firstName: "Adam", lastName: "Ackor", peopleCode: "ST-001", centreId: "centre-1", centreName: "Labour Memorial Hall", canManageOwnBookings: true, hasLoginAccount: true, wallets: [{ parentProfileId: "parent-1", parentName: "Parent", balanceCredits: 6 }] },
];

function booking(overrides: Partial<SessionBooking>): SessionBooking {
  return {
    id: "booking-1", centreId: "centre-1", centreName: "Labour Memorial Hall", centreTimeZone: "Europe/London",
    sessionId: "session-1", sessionSubjectId: "session-subject-1", subjectId: "subject-1", subjectName: "Mathematics", subjectCode: "MATH",
    studentProfileId: "student-1", studentFirstName: "Adam", studentLastName: "Ackor", studentPeopleCode: "ST-001",
    parentProfileId: "parent-1", parentName: "Parent", walletBalance: 6, status: "confirmed", source: "parent", lessonFocusLocked: false,
    startsAt: "2026-10-20T09:00:00Z", endsAt: "2026-10-20T11:00:00Z", createdAt: "2026-10-01T09:00:00Z", updatedAt: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

test("directory sorts children and selects only future active bookings", () => {
  const items = buildParentChildDirectory(participants, [
    booking({ id: "later", startsAt: "2026-10-22T09:00:00Z", endsAt: "2026-10-22T11:00:00Z" }),
    booking({ id: "next", startsAt: "2026-10-20T09:00:00Z", endsAt: "2026-10-20T11:00:00Z" }),
    booking({ id: "cancelled", status: "cancelled" }),
    booking({ id: "past", startsAt: "2026-10-10T09:00:00Z", endsAt: "2026-10-10T11:00:00Z" }),
  ], new Date("2026-10-19T00:00:00Z").getTime());

  assert.deepEqual(items.map((item) => item.studentProfileId), ["student-1", "student-2"]);
  assert.equal(items[0].nextBooking?.id, "next");
  assert.deepEqual(items[0].upcomingBookings.map((item) => item.id), ["next", "later"]);
});

test("directory filters by name, people code, centre and centre identifier", () => {
  const items = buildParentChildDirectory(participants, []);
  assert.deepEqual(filterParentChildDirectory(items, "adam", "").map((item) => item.studentProfileId), ["student-1"]);
  assert.deepEqual(filterParentChildDirectory(items, "ST-002", "").map((item) => item.studentProfileId), ["student-2"]);
  assert.deepEqual(filterParentChildDirectory(items, "north", "centre-2").map((item) => item.studentProfileId), ["student-2"]);
  assert.deepEqual(filterParentChildDirectory(items, "adam", "centre-2"), []);
});

test("directory metrics count centres, bookings and credit actions", () => {
  const items = buildParentChildDirectory(participants, [
    booking({ id: "confirmed" }),
    booking({ id: "credits", status: "credits_required", studentProfileId: "student-2", centreId: "centre-2", centreName: "North Centre" }),
  ], new Date("2026-10-19T00:00:00Z").getTime());
  assert.deepEqual(parentChildDirectoryMetrics(items), { children: 2, centres: 2, upcomingBookings: 2, bookingsRequiringCredits: 1 });
});
