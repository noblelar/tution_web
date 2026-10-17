export type SessionStatus = "draft" | "published" | "cancelled" | "completed";
export type SessionTemplateStatus = "active" | "inactive";

export type SessionSubjectTutor = {
  profileId: string;
  name: string;
};

export type SessionSubjectOffering = {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  displayOrder: number;
  tutors: SessionSubjectTutor[];
};

export type SessionSubjectInput = {
  subjectId: string;
  tutorProfileIds: string[];
};

export type SessionTemplate = {
  id: string;
  organizationId: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  offeredSubjects: SessionSubjectOffering[];
  academicYearId: string;
  academicYearName: string;
  name: string;
  dayOfWeek: number;
  startTime: string;
  durationMinutes: 120;
  maximumCapacity?: number;
  bookingDeadlineMinutes: number;
  status: SessionTemplateStatus;
  createdAt: string;
  updatedAt: string;
};

export type TeachingSession = {
  id: string;
  organizationId: string;
  centreId: string;
  centreName: string;
  centreTimeZone: string;
  offeredSubjects: SessionSubjectOffering[];
  academicYearId: string;
  academicYearName: string;
  templateId?: string;
  generationBatchId?: string;
  startsAt: string;
  endsAt: string;
  bookingDeadlineAt?: string;
  effectiveBookingDeadlineAt: string;
  maximumCapacity?: number;
  status: SessionStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type SessionList = { sessions: TeachingSession[] };
export type SessionTemplateList = { templates: SessionTemplate[] };
export type SessionGenerationResult = { batchId: string; sessions: TeachingSession[] };

export type SessionInput = {
  centreId: string;
  offeredSubjects: SessionSubjectInput[];
  academicYearId: string;
  startsAt: string;
  bookingDeadlineAt?: string;
  maximumCapacity?: number;
};

export type SessionTemplateInput = {
  centreId: string;
  name: string;
  offeredSubjects: SessionSubjectInput[];
  academicYearId: string;
  dayOfWeek: number;
  startTime: string;
  maximumCapacity?: number;
  bookingDeadlineMinutes: number;
};
