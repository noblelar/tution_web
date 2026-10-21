import assert from "node:assert/strict";
import test from "node:test";

import { studentNavigation } from "./student-navigation";

test("student navigation exposes only implemented workspace routes", () => {
  assert.deepEqual(
    studentNavigation.map((item) => ({ label: item.label, href: item.href })),
    [
      { label: "Dashboard", href: "/app/student" },
      { label: "Sessions", href: "/app/student/sessions" },
      { label: "Bookings", href: "/app/student/bookings" },
      { label: "Credits", href: "/app/student/credits" },
      { label: "Feedback & Queries", href: "/app/student/feedback" },
      { label: "Learning Notes", href: "/app/student/notes" },
      { label: "Profile", href: "/app/student/profile" },
    ],
  );
});

test("student navigation does not contain duplicate destinations", () => {
  const destinations = studentNavigation.map((item) => item.href);
  assert.equal(new Set(destinations).size, destinations.length);
});
