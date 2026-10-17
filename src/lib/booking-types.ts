export type BookingWalletOption = {
  parentProfileId: string;
  parentName: string;
  walletId?: string;
  balanceCredits: number;
};

export type BookingParticipant = {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  peopleCode: string;
  centreId: string;
  centreName: string;
  canManageOwnBookings: boolean;
  hasLoginAccount: boolean;
  wallets: BookingWalletOption[];
};

export type SessionBooking = {
  id: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  sessionId: string;
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
  walletId?: string;
  walletBalance: number;
  status: "confirmed" | "waitlisted" | "credits_required" | "cancelled";
  source: "parent" | "student" | "admin";
  lessonFocus?: string;
  lessonFocusLocked: boolean;
  startsAt: string;
  endsAt: string;
  confirmedAt?: string;
  waitlistedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  queuePosition?: number;
  createdAt: string;
  updatedAt: string;
};

export type BookingContext = {
  centreId?: string;
  centreName?: string;
  canAdminister: boolean;
  participants: BookingParticipant[];
  bookings: SessionBooking[];
};

export type StudentBookingPermission = {
  studentProfileId: string;
  canManageOwnBookings: boolean;
};

export type SessionCancellationResult = {
  sessionId: string;
  cancelledBookings: number;
  refundedBookings: number;
};

