import assert from "node:assert/strict";
import { test } from "node:test";

import { balanceAfterConfirmedBooking, bookingCreditCost, canCancelBooking, canCancelSession, canConfirmBookingFromBalance, lessonFocusCharacterCount, lessonFocusMaximumLength, normalizeLessonFocus, preferredBookingWallet, studentSessionBookingState } from "./booking-rules";

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

test("cancellation action disappears once any attendance is recorded", () => {
  assert.equal(canCancelBooking("confirmed", false), true);
  assert.equal(canCancelBooking("waitlisted", false), true);
  assert.equal(canCancelBooking("credits_required", false), true);
  assert.equal(canCancelBooking("confirmed", true), false);
  assert.equal(canCancelBooking("cancelled", false), false);
});

test("session cancellation action is blocked by an active attended booking", () => {
  const bookings = [
    { sessionId: "one", status: "confirmed" as const, lessonFocusLocked: true },
    { sessionId: "two", status: "confirmed" as const, lessonFocusLocked: false },
  ];
  assert.equal(canCancelSession(bookings, "one"), false);
  assert.equal(canCancelSession(bookings, "two"), true);
  assert.equal(canCancelSession([{ sessionId: "one", status: "cancelled", lessonFocusLocked: true }], "one"), true);
});

test("student session controls explain why a session cannot be booked", () => {
  const future = "2026-12-01T12:00:00Z";
  const now = new Date("2026-11-01T12:00:00Z").getTime();
  assert.equal(studentSessionBookingState({ hasActiveBooking: true, canManageOwnBookings: true, walletBalances: [10], effectiveBookingDeadlineAt: future, now }), "already_booked");
  assert.equal(studentSessionBookingState({ hasActiveBooking: false, canManageOwnBookings: true, walletBalances: [10], effectiveBookingDeadlineAt: "2026-10-01T12:00:00Z", now }), "booking_closed");
  assert.equal(studentSessionBookingState({ hasActiveBooking: false, canManageOwnBookings: false, walletBalances: [10], effectiveBookingDeadlineAt: future, now }), "managed_by_parent_or_centre");
  assert.equal(studentSessionBookingState({ hasActiveBooking: false, canManageOwnBookings: true, walletBalances: [], effectiveBookingDeadlineAt: future, now }), "household_credit_unavailable");
  assert.equal(studentSessionBookingState({ hasActiveBooking: false, canManageOwnBookings: true, walletBalances: [-2], effectiveBookingDeadlineAt: future, now }), "household_in_debit");
  assert.equal(studentSessionBookingState({ hasActiveBooking: false, canManageOwnBookings: true, walletBalances: [0], effectiveBookingDeadlineAt: future, now }), "bookable");
});

test("a usable household wallet is preferred without exposing its owner", () => {
  const wallets = [
    { parentProfileId: "one", balanceCredits: -2 },
    { parentProfileId: "two", balanceCredits: 4 },
  ];
  assert.equal(preferredBookingWallet(wallets)?.parentProfileId, "two");
  assert.equal(preferredBookingWallet(wallets, "one")?.parentProfileId, "two");
  assert.equal(preferredBookingWallet([{ parentProfileId: "one", balanceCredits: -2 }])?.parentProfileId, "one");
});

