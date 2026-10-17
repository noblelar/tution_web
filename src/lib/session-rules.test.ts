import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizeSessionSubjectSelections, sessionDurationMinutes, toCentreInput, zonedInputToISO } from "./session-rules";

test("sessions have a fixed two-hour duration", () => {
  assert.equal(sessionDurationMinutes, 120);
});

test("centre-local winter time is converted to UTC", () => {
  assert.equal(zonedInputToISO("2026-01-17T10:00", "Europe/London"), "2026-01-17T10:00:00.000Z");
});

test("centre-local summer time observes daylight saving", () => {
  assert.equal(zonedInputToISO("2026-07-18T10:00", "Europe/London"), "2026-07-18T09:00:00.000Z");
});

test("stored timestamps display in the centre local time", () => {
  assert.equal(toCentreInput("2026-07-18T09:00:00.000Z", "Europe/London"), "2026-07-18T10:00");
});

test("subject selections require at least one unique subject", () => {
  assert.throws(() => normalizeSessionSubjectSelections([]), /at least one subject/i);
  assert.throws(
    () => normalizeSessionSubjectSelections([{ subjectId: "maths", tutorProfileIds: [] }, { subjectId: "maths", tutorProfileIds: [] }]),
    /only be offered once/i,
  );
});

test("subject selections normalize duplicate tutor assignments", () => {
  assert.deepEqual(
    normalizeSessionSubjectSelections([{ subjectId: " maths ", tutorProfileIds: ["tutor-1", "tutor-1", " tutor-2 "] }]),
    [{ subjectId: "maths", tutorProfileIds: ["tutor-1", "tutor-2"] }],
  );
});

test("subject and tutor collection limits match the backend contract", () => {
  assert.throws(
    () => normalizeSessionSubjectSelections(Array.from({ length: 51 }, (_, index) => ({ subjectId: `subject-${index}`, tutorProfileIds: [] }))),
    /more than 50 subjects/i,
  );
  assert.throws(
    () => normalizeSessionSubjectSelections([{ subjectId: "maths", tutorProfileIds: Array.from({ length: 21 }, (_, index) => `tutor-${index}`) }]),
    /more than 20 tutors/i,
  );
});
