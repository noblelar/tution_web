import "server-only";

import type { NextRequest } from "next/server";

import { lessonFocusCharacterCount, lessonFocusMaximumLength } from "@/lib/booking-rules";
import type {
  BookingContext,
  BookingParticipant,
  BookingWalletOption,
  SessionBooking,
  SessionCancellationResult,
  StudentBookingPermission,
} from "@/lib/booking-types";

export type BackendBookingWalletOption = {
  parent_profile_id: string;
  parent_name: string;
  wallet_id?: string;
  balance_credits: number;
};

export type BackendBookingParticipant = {
  student_profile_id: string;
  first_name: string;
  last_name: string;
  people_code: string;
  centre_id: string;
  centre_name: string;
  can_manage_own_bookings: boolean;
  has_login_account: boolean;
  wallets: BackendBookingWalletOption[];
};

export type BackendSessionBooking = {
  id: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  session_id: string;
  session_subject_id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  student_profile_id: string;
  student_first_name: string;
  student_last_name: string;
  student_people_code: string;
  parent_profile_id: string;
  parent_name: string;
  wallet_id?: string;
  wallet_balance: number;
  status: SessionBooking["status"];
  source: SessionBooking["source"];
  lesson_focus?: string;
  lesson_focus_locked: boolean;
  starts_at: string;
  ends_at: string;
  confirmed_at?: string;
  waitlisted_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  queue_position?: number;
  created_at: string;
  updated_at: string;
};

export type BackendBookingContext = {
  centre_id?: string;
  centre_name?: string;
  can_administer: boolean;
  participants: BackendBookingParticipant[];
  bookings: BackendSessionBooking[];
};

export type BackendStudentBookingPermission = {
  student_profile_id: string;
  can_manage_own_bookings: boolean;
};

export type BackendSessionCancellationResult = {
  session_id: string;
  cancelled_bookings: number;
  refunded_bookings: number;
};

export async function bookingInput(request: NextRequest, includeCentre: boolean) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const centreId = inputText(value.centreId);
    const sessionId = inputText(value.sessionId);
    const sessionSubjectId = inputText(value.sessionSubjectId);
    const studentProfileId = inputText(value.studentProfileId);
    const parentProfileId = inputText(value.parentProfileId);
    const lessonFocus = inputText(value.lessonFocus);
    if (!sessionId || !sessionSubjectId || !studentProfileId || !parentProfileId || lessonFocusCharacterCount(lessonFocus) > lessonFocusMaximumLength || (includeCentre && (!centreId || lessonFocus))) return null;
    return {
      centre_id: centreId || undefined,
      session_id: sessionId,
      session_subject_id: sessionSubjectId,
      student_profile_id: studentProfileId,
      parent_profile_id: parentProfileId,
      lesson_focus: lessonFocus || undefined,
    };
  } catch {
    return null;
  }
}

export function mapBookingWallet(value: BackendBookingWalletOption): BookingWalletOption {
  return { parentProfileId: value.parent_profile_id, parentName: value.parent_name, walletId: value.wallet_id, balanceCredits: value.balance_credits };
}

export function mapBookingParticipant(value: BackendBookingParticipant): BookingParticipant {
  return { studentProfileId: value.student_profile_id, firstName: value.first_name, lastName: value.last_name, peopleCode: value.people_code, centreId: value.centre_id, centreName: value.centre_name, canManageOwnBookings: value.can_manage_own_bookings, hasLoginAccount: value.has_login_account, wallets: (value.wallets ?? []).map(mapBookingWallet) };
}

export function mapSessionBooking(value: BackendSessionBooking): SessionBooking {
  return { id: value.id, centreId: value.centre_id, centreName: value.centre_name, centreTimeZone: value.centre_time_zone, sessionId: value.session_id, sessionSubjectId: value.session_subject_id, subjectId: value.subject_id, subjectName: value.subject_name, subjectCode: value.subject_code, studentProfileId: value.student_profile_id, studentFirstName: value.student_first_name, studentLastName: value.student_last_name, studentPeopleCode: value.student_people_code, parentProfileId: value.parent_profile_id, parentName: value.parent_name, walletId: value.wallet_id, walletBalance: value.wallet_balance, status: value.status, source: value.source, lessonFocus: value.lesson_focus, lessonFocusLocked: value.lesson_focus_locked, startsAt: value.starts_at, endsAt: value.ends_at, confirmedAt: value.confirmed_at, waitlistedAt: value.waitlisted_at, cancelledAt: value.cancelled_at, cancellationReason: value.cancellation_reason, queuePosition: value.queue_position, createdAt: value.created_at, updatedAt: value.updated_at };
}

export function mapBookingContext(value: BackendBookingContext): BookingContext {
  return { centreId: value.centre_id, centreName: value.centre_name, canAdminister: value.can_administer, participants: (value.participants ?? []).map(mapBookingParticipant), bookings: (value.bookings ?? []).map(mapSessionBooking) };
}

export function mapStudentBookingPermission(value: BackendStudentBookingPermission): StudentBookingPermission {
  return { studentProfileId: value.student_profile_id, canManageOwnBookings: value.can_manage_own_bookings };
}

export function mapSessionCancellation(value: BackendSessionCancellationResult): SessionCancellationResult {
  return { sessionId: value.session_id, cancelledBookings: value.cancelled_bookings, refundedBookings: value.refunded_bookings };
}

function inputText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
