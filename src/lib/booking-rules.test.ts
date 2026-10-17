import assert from "node:assert/strict";
import { test } from "node:test";

import { balanceAfterConfirmedBooking, bookingCreditCost, canConfirmBookingFromBalance, lessonFocusCharacterCount, lessonFocusMaximumLength, normalizeLessonFocus } from "./booking-rules";

test("every confirmed session consumes exactly two credits", () => {
  assert.equal(bookingCreditCost, 2);
  assert.equal(balanceAfterConfirmedBooking(10), 8);
});

test("a zero balance may confirm one session and become minus two", () => {
  assert.equal(canConfirmBookingFromBalance(0), true);
  assert.equal(balanceAfterConfirmedBooking(0), -2);
});

test("a negative balance cannot self-confirm another session", () => {
  assert.equal(canConfirmBookingFromBalance(-1), false);
  assert.equal(canConfirmBookingFromBalance(-2), false);
});

test("lesson focus is optional, trimmed, and limited to 500 characters", () => {
  assert.equal(normalizeLessonFocus("  atoms and the periodic table  "), "atoms and the periodic table");
  assert.equal(normalizeLessonFocus("   "), "");
  assert.equal(lessonFocusMaximumLength, 500);
  assert.throws(() => normalizeLessonFocus("x".repeat(501)), /500 characters/);
  assert.equal(lessonFocusCharacterCount("🧪".repeat(500)), 500);
  assert.equal(normalizeLessonFocus("🧪".repeat(500)), "🧪".repeat(500));
  assert.throws(() => normalizeLessonFocus("🧪".repeat(501)), /500 characters/);
});

