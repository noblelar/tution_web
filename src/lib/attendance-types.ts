export type AttendanceStatus = "present" | "late" | "absent" | "excused";

export type AttendanceRecord = {
  id: string;
  bookingId: string;
  sessionId: string;
  studentProfileId: string;
  status: AttendanceStatus;
  originSource: "manual" | "qr" | "automatic";
  lastSource: "manual" | "qr" | "automatic";
  hasSelfCheckIn: boolean;
  markedByUserId?: string;
  markedAt: string;
  checkedInAt?: string;
  creditDisposition: "consumed" | "refunded";
  createdAt: string;
  updatedAt: string;
};

export type AttendanceRosterBooking = {
  bookingId: string;
  sessionSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  studentPeopleCode: string;
  parentProfileId: string;
  parentName: string;
  bookingSource: "parent" | "student" | "admin";
  lessonFocus?: string;
  confirmedAt: string;
  attendance?: AttendanceRecord;
};

export type AttendanceRosterSession = {
  id: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  startsAt: string;
  endsAt: string;
  status: string;
  qrActive: boolean;
  qrExpiresAt?: string;
  bookings: AttendanceRosterBooking[];
};

export type AttendanceContext = {
  centreId: string;
  centreName: string;
  canGenerateQr: boolean;
  canOverrideQr: boolean;
  sessions: AttendanceRosterSession[];
};

export type AttendanceQrToken = {
  sessionId: string;
  centreId: string;
  token: string;
  actionPath: string;
  validFrom: string;
  expiresAt: string;
};

export type CheckInCandidate = {
  bookingId: string;
  sessionSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  studentPeopleCode: string;
  alreadyCheckedIn: boolean;
  checkedInAt?: string;
};

export type CheckInContext = {
  sessionId: string;
  centreName: string;
  centreTimeZone: string;
  startsAt: string;
  endsAt: string;
  candidates: CheckInCandidate[];
};

export type CheckInResult = { attendance: AttendanceRecord[] };

