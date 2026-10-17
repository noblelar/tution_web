import "server-only";

import type {
  SessionGenerationResult,
  SessionList,
  SessionSubjectOffering,
  SessionTemplate,
  SessionTemplateList,
  TeachingSession,
} from "@/lib/session-types";

export type BackendSessionSubjectTutor = {
  profile_id: string;
  name: string;
};

export type BackendSessionSubjectOffering = {
  id: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  display_order: number;
  tutors: BackendSessionSubjectTutor[];
};

export type BackendSessionTemplate = {
  id: string;
  organization_id: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  offered_subjects: BackendSessionSubjectOffering[];
  academic_year_id: string;
  academic_year_name: string;
  name: string;
  day_of_week: number;
  start_time: string;
  duration_minutes: 120;
  maximum_capacity?: number;
  booking_deadline_minutes: number;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type BackendSession = {
  id: string;
  organization_id: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  offered_subjects: BackendSessionSubjectOffering[];
  academic_year_id: string;
  academic_year_name: string;
  template_id?: string;
  generation_batch_id?: string;
  starts_at: string;
  ends_at: string;
  booking_deadline_at?: string;
  effective_booking_deadline_at: string;
  maximum_capacity?: number;
  status: "draft" | "published" | "cancelled" | "completed";
  published_at?: string;
  created_at: string;
  updated_at: string;
};

export type BackendSessionList = { sessions: BackendSession[] };
export type BackendSessionTemplateList = { templates: BackendSessionTemplate[] };
export type BackendSessionGenerationResult = { batch_id: string; sessions: BackendSession[] };

export function mapSessionTemplate(value: BackendSessionTemplate): SessionTemplate {
  return {
    id: value.id,
    organizationId: value.organization_id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    centreTimeZone: value.centre_time_zone,
    offeredSubjects: (value.offered_subjects ?? []).map(mapSubjectOffering),
    academicYearId: value.academic_year_id,
    academicYearName: value.academic_year_name,
    name: value.name,
    dayOfWeek: value.day_of_week,
    startTime: value.start_time,
    durationMinutes: value.duration_minutes,
    maximumCapacity: value.maximum_capacity,
    bookingDeadlineMinutes: value.booking_deadline_minutes,
    status: value.status,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapSession(value: BackendSession): TeachingSession {
  return {
    id: value.id,
    organizationId: value.organization_id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    centreTimeZone: value.centre_time_zone,
    offeredSubjects: (value.offered_subjects ?? []).map(mapSubjectOffering),
    academicYearId: value.academic_year_id,
    academicYearName: value.academic_year_name,
    templateId: value.template_id,
    generationBatchId: value.generation_batch_id,
    startsAt: value.starts_at,
    endsAt: value.ends_at,
    bookingDeadlineAt: value.booking_deadline_at,
    effectiveBookingDeadlineAt: value.effective_booking_deadline_at,
    maximumCapacity: value.maximum_capacity,
    status: value.status,
    publishedAt: value.published_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapSessionList(value: BackendSessionList): SessionList {
  return { sessions: (value.sessions ?? []).map(mapSession) };
}

export function mapSessionTemplateList(value: BackendSessionTemplateList): SessionTemplateList {
  return { templates: (value.templates ?? []).map(mapSessionTemplate) };
}

export function mapSessionGenerationResult(value: BackendSessionGenerationResult): SessionGenerationResult {
  return { batchId: value.batch_id, sessions: (value.sessions ?? []).map(mapSession) };
}

function mapSubjectOffering(value: BackendSessionSubjectOffering): SessionSubjectOffering {
  return {
    id: value.id,
    subjectId: value.subject_id,
    subjectName: value.subject_name,
    subjectCode: value.subject_code,
    displayOrder: value.display_order,
    tutors: (value.tutors ?? []).map((tutor) => ({ profileId: tutor.profile_id, name: tutor.name })),
  };
}
