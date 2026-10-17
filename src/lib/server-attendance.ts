import "server-only";

import type {
  AttendanceContext,
  AttendanceQrToken,
  AttendanceRecord,
  AttendanceRosterBooking,
  AttendanceRosterSession,
  CheckInCandidate,
  CheckInContext,
  CheckInResult,
} from "@/lib/attendance-types";

export type BackendAttendanceRecord = {
  id: string; booking_id: string; session_id: string; student_profile_id: string;
  status: AttendanceRecord["status"]; origin_source: AttendanceRecord["originSource"];
  last_source: AttendanceRecord["lastSource"]; has_self_check_in: boolean;
  marked_by_user_id?: string; marked_at: string; checked_in_at?: string;
  credit_disposition: AttendanceRecord["creditDisposition"]; created_at: string; updated_at: string;
};

type BackendRosterBooking = {
  booking_id: string; session_subject_id: string; subject_id: string;
  subject_name: string; subject_code: string;
  student_profile_id: string; student_first_name: string;
  student_last_name: string; student_people_code: string; parent_profile_id: string;
  parent_name: string; booking_source: AttendanceRosterBooking["bookingSource"];
  lesson_focus?: string; confirmed_at: string; attendance?: BackendAttendanceRecord;
};

type BackendRosterSession = {
  id: string; centre_id: string; centre_name: string; centre_time_zone: string;
  starts_at: string; ends_at: string;
  status: string; qr_active: boolean; qr_expires_at?: string; bookings: BackendRosterBooking[];
};

export type BackendAttendanceContext = {
  centre_id: string; centre_name: string; can_generate_qr: boolean;
  can_override_qr: boolean; sessions: BackendRosterSession[];
};

export type BackendAttendanceQrToken = {
  session_id: string; centre_id: string; token: string; action_path: string;
  valid_from: string; expires_at: string;
};

type BackendCheckInCandidate = {
  booking_id: string; session_subject_id: string; subject_id: string;
  subject_name: string; subject_code: string;
  student_profile_id: string; student_first_name: string;
  student_last_name: string; student_people_code: string;
  already_checked_in: boolean; checked_in_at?: string;
};

export type BackendCheckInContext = {
  session_id: string; centre_name: string; centre_time_zone: string;
  starts_at: string; ends_at: string; candidates: BackendCheckInCandidate[];
};

export type BackendCheckInResult = { attendance: BackendAttendanceRecord[] };

export function mapAttendance(value: BackendAttendanceRecord): AttendanceRecord {
  return { id: value.id, bookingId: value.booking_id, sessionId: value.session_id, studentProfileId: value.student_profile_id, status: value.status, originSource: value.origin_source, lastSource: value.last_source, hasSelfCheckIn: value.has_self_check_in, markedByUserId: value.marked_by_user_id, markedAt: value.marked_at, checkedInAt: value.checked_in_at, creditDisposition: value.credit_disposition, createdAt: value.created_at, updatedAt: value.updated_at };
}

function mapRosterBooking(value: BackendRosterBooking): AttendanceRosterBooking {
  return { bookingId: value.booking_id, sessionSubjectId: value.session_subject_id, subjectId: value.subject_id, subjectName: value.subject_name, subjectCode: value.subject_code, studentProfileId: value.student_profile_id, studentFirstName: value.student_first_name, studentLastName: value.student_last_name, studentPeopleCode: value.student_people_code, parentProfileId: value.parent_profile_id, parentName: value.parent_name, bookingSource: value.booking_source, lessonFocus: value.lesson_focus, confirmedAt: value.confirmed_at, attendance: value.attendance ? mapAttendance(value.attendance) : undefined };
}

function mapRosterSession(value: BackendRosterSession): AttendanceRosterSession {
  return { id: value.id, centreId: value.centre_id, centreName: value.centre_name, centreTimeZone: value.centre_time_zone, startsAt: value.starts_at, endsAt: value.ends_at, status: value.status, qrActive: value.qr_active, qrExpiresAt: value.qr_expires_at, bookings: (value.bookings ?? []).map(mapRosterBooking) };
}

export function mapAttendanceContext(value: BackendAttendanceContext): AttendanceContext {
  return { centreId: value.centre_id, centreName: value.centre_name, canGenerateQr: value.can_generate_qr, canOverrideQr: value.can_override_qr, sessions: (value.sessions ?? []).map(mapRosterSession) };
}

export function mapQrToken(value: BackendAttendanceQrToken): AttendanceQrToken {
  return { sessionId: value.session_id, centreId: value.centre_id, token: value.token, actionPath: value.action_path, validFrom: value.valid_from, expiresAt: value.expires_at };
}

function mapCheckInCandidate(value: BackendCheckInCandidate): CheckInCandidate {
  return { bookingId: value.booking_id, sessionSubjectId: value.session_subject_id, subjectId: value.subject_id, subjectName: value.subject_name, subjectCode: value.subject_code, studentProfileId: value.student_profile_id, studentFirstName: value.student_first_name, studentLastName: value.student_last_name, studentPeopleCode: value.student_people_code, alreadyCheckedIn: value.already_checked_in, checkedInAt: value.checked_in_at };
}

export function mapCheckInContext(value: BackendCheckInContext): CheckInContext {
  return { sessionId: value.session_id, centreName: value.centre_name, centreTimeZone: value.centre_time_zone, startsAt: value.starts_at, endsAt: value.ends_at, candidates: (value.candidates ?? []).map(mapCheckInCandidate) };
}

export function mapCheckInResult(value: BackendCheckInResult): CheckInResult {
  return { attendance: (value.attendance ?? []).map(mapAttendance) };
}

