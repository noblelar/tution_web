export const bookingCreditCost = 2 as const;
export const lessonFocusMaximumLength = 500 as const;

export type StudentSessionBookingState =
  | "bookable"
  | "already_booked"
  | "booking_closed"
  | "managed_by_parent_or_centre"
  | "household_credit_unavailable"
  | "household_in_debit";

export function lessonFocusCharacterCount(value: string) {
  return Array.from(value).length;
}

export function normalizeLessonFocus(value: string) {
  const result = value.trim();
  if (lessonFocusCharacterCount(result) > lessonFocusMaximumLength) throw new Error(`Lesson focus must be ${lessonFocusMaximumLength} characters or fewer.`);
  return result;
}

export function canConfirmBookingFromBalance(balanceCredits: number) {
  return Number.isInteger(balanceCredits) && balanceCredits >= 0;
}

export function balanceAfterConfirmedBooking(balanceCredits: number) {
  return balanceCredits - bookingCreditCost;
}

// Presentation only. The Go cancellation transaction makes the final decision.
export function canCancelBooking(status: "confirmed" | "waitlisted" | "credits_required" | "cancelled", attendanceRecorded: boolean) {
  return status !== "cancelled" && !attendanceRecorded;
}

export function canCancelSession(bookings: Array<{ sessionId: string; status: "confirmed" | "waitlisted" | "credits_required" | "cancelled"; lessonFocusLocked: boolean }>, sessionId: string) {
  return !bookings.some((booking) => booking.sessionId === sessionId && booking.status !== "cancelled" && booking.lessonFocusLocked);
}

export function studentSessionBookingState(input: {
  hasActiveBooking: boolean;
  canManageOwnBookings: boolean;
  walletBalances: number[];
  effectiveBookingDeadlineAt: string;
  now?: number;
}): StudentSessionBookingState {
  if (input.hasActiveBooking) return "already_booked";

  const deadline = new Date(input.effectiveBookingDeadlineAt).getTime();
  if (!Number.isFinite(deadline) || (input.now ?? Date.now()) >= deadline) return "booking_closed";
  if (!input.canManageOwnBookings) return "managed_by_parent_or_centre";
  if (input.walletBalances.length === 0) return "household_credit_unavailable";
  if (!input.walletBalances.some((balance) => canConfirmBookingFromBalance(balance))) return "household_in_debit";
  return "bookable";
}

export function preferredBookingWallet<T extends { parentProfileId: string; balanceCredits: number }>(wallets: T[], currentParentProfileId = "") {
  const current = wallets.find((wallet) => wallet.parentProfileId === currentParentProfileId);
  if (current && canConfirmBookingFromBalance(current.balanceCredits)) return current;
  return wallets.find((wallet) => canConfirmBookingFromBalance(wallet.balanceCredits)) ?? current ?? wallets[0];
}

