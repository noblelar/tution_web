import "server-only";

import type { FeedbackContext } from "@/lib/feedback-context-types";

export type BackendFeedbackContext = {
  actor_user_id: string;
  viewer: FeedbackContext["viewer"];
  tutor_profile_id?: string;
  centres: Array<{ id: string; code: string; name: string; time_zone: string }>;
  students: Array<{
    student_profile_id: string; first_name: string; last_name: string; people_code: string;
    centre_id: string; centre_name: string; can_manage_own_bookings: boolean;
  }>;
  eligible_bookings: Array<{
    session_booking_id: string; session_id: string; session_subject_id: string;
    student_profile_id: string; student_first_name: string; student_last_name: string;
    student_people_code: string; subject_name: string; session_starts_at: string;
    session_ends_at: string; attendance_status: "present" | "late"; lesson_focus?: string;
  }>;
  assignment_tutors: Array<{ id: string; name: string; assigned_session_subject_ids: string[] }>;
};

export function mapFeedbackContext(value: BackendFeedbackContext): FeedbackContext {
  return {
    actorUserId: value.actor_user_id,
    viewer: value.viewer,
    tutorProfileId: value.tutor_profile_id,
    centres: (value.centres ?? []).map((centre) => ({
      id: centre.id, code: centre.code, name: centre.name, timeZone: centre.time_zone,
    })),
    students: (value.students ?? []).map((student) => ({
      studentProfileId: student.student_profile_id, firstName: student.first_name,
      lastName: student.last_name, peopleCode: student.people_code,
      centreId: student.centre_id, centreName: student.centre_name,
      canManageOwnBookings: student.can_manage_own_bookings,
    })),
    eligibleBookings: (value.eligible_bookings ?? []).map((booking) => ({
      sessionBookingId: booking.session_booking_id, sessionId: booking.session_id,
      sessionSubjectId: booking.session_subject_id, studentProfileId: booking.student_profile_id,
      studentFirstName: booking.student_first_name, studentLastName: booking.student_last_name,
      studentPeopleCode: booking.student_people_code, subjectName: booking.subject_name,
      sessionStartsAt: booking.session_starts_at, sessionEndsAt: booking.session_ends_at,
      attendanceStatus: booking.attendance_status, lessonFocus: booking.lesson_focus,
    })),
    assignmentTutors: (value.assignment_tutors ?? []).map((tutor) => ({
      id: tutor.id, name: tutor.name, assignedSessionSubjectIds: tutor.assigned_session_subject_ids ?? [],
    })),
  };
}
