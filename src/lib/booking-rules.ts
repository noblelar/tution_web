export const bookingCreditCost = 2 as const;
export const lessonFocusMaximumLength = 500 as const;

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

