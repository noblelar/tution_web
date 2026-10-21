import type {
  StudentLearningNote,
  StudentLearningNoteList,
  StudentLearningNoteRevision,
  StudentLearningNoteRevisionList,
  StudentNoteFeedbackOption,
  StudentNotesContext,
  StudentNoteSessionOption,
  StudentNoteSubject,
  StudentNoteUnderstandingLevel,
  StudentReflectionPrompt,
  StudentReflectionPromptDeferMinutes,
  StudentReflectionPromptState,
} from "./student-notes-types";
import {
  isStudentReflectionPromptDeferMinutes,
  isStudentNoteSubject,
  isStudentNoteUnderstandingLevel,
} from "./student-notes-rules";

export type BackendStudentLearningNote = {
  id: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  student_profile_id: string;
  reflection_date: string;
  daily_sequence: number;
  subject_area: StudentNoteSubject;
  understanding_level: StudentNoteUnderstandingLevel;
  learned_text: string;
  help_text?: string;
  linked_session_booking_id?: string;
  linked_feedback_id?: string;
  deleted_at?: string;
  created_at: string;
  updated_at: string;
};

export type BackendStudentLearningNoteList = { notes: BackendStudentLearningNote[] };

export type BackendStudentLearningNoteRevision = {
  id: string;
  note_id: string;
  revision_number: number;
  change_type: StudentLearningNoteRevision["changeType"];
  reflection_date: string;
  daily_sequence: number;
  subject_area: StudentNoteSubject;
  understanding_level: StudentNoteUnderstandingLevel;
  learned_text: string;
  help_text?: string;
  linked_session_booking_id?: string;
  linked_feedback_id?: string;
  created_at: string;
};

export type BackendStudentLearningNoteRevisionList = {
  revisions: BackendStudentLearningNoteRevision[];
};

export type BackendStudentNotesContext = {
  student_profile_id: string;
  centre_id: string;
  centre_name: string;
  centre_time_zone: string;
  reflection_date: string;
  active_today_count: number;
  remaining_today: number;
  maximum_daily_reflections: number;
  subjects: StudentNoteSubject[];
  understanding_levels: StudentNoteUnderstandingLevel[];
  recent_sessions: Array<{
    session_booking_id: string;
    session_id: string;
    subject_id: string;
    subject_name: string;
    subject_code: string;
    starts_at: string;
    ends_at: string;
  }>;
  published_feedback: Array<{
    feedback_id: string;
    session_booking_id: string;
    subject_id: string;
    subject_name: string;
    tutor_first_name: string;
    tutor_last_name: string;
    preview: string;
    session_starts_at: string;
    published_at: string;
  }>;
};

export type BackendStudentReflectionPrompt = {
  id: string;
  slot: StudentReflectionPrompt["slot"];
  local_date: string;
  scheduled_at: string;
  expires_at: string;
  last_presented_at?: string;
  snoozed_until?: string;
  last_defer_minutes?: StudentReflectionPromptDeferMinutes;
};

export type BackendStudentReflectionPromptState = {
  local_date: string;
  active_today_count: number;
  maximum_daily_reflections: number;
  due_prompt?: BackendStudentReflectionPrompt;
  next_check_at?: string;
  defer_options_minutes: StudentReflectionPromptDeferMinutes[];
};

export function mapStudentLearningNote(value: unknown): StudentLearningNote {
  assertStudentLearningNote(value, "student note");
  return {
    id: value.id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    centreTimeZone: value.centre_time_zone,
    studentProfileId: value.student_profile_id,
    reflectionDate: value.reflection_date,
    dailySequence: value.daily_sequence,
    subjectArea: value.subject_area,
    understandingLevel: value.understanding_level,
    learnedText: value.learned_text,
    helpText: value.help_text,
    linkedSessionBookingId: value.linked_session_booking_id,
    linkedFeedbackId: value.linked_feedback_id,
    deletedAt: value.deleted_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapStudentLearningNoteList(value: unknown): StudentLearningNoteList {
  const record = recordValue(value, "student note list");
  const notes = arrayValue(record.notes, "student note list.notes");
  return { notes: notes.map(mapStudentLearningNote) };
}

export function mapStudentLearningNoteRevision(value: unknown): StudentLearningNoteRevision {
  assertStudentLearningNoteRevision(value, "student note revision");
  return {
    id: value.id,
    noteId: value.note_id,
    revisionNumber: value.revision_number,
    changeType: value.change_type,
    reflectionDate: value.reflection_date,
    dailySequence: value.daily_sequence,
    subjectArea: value.subject_area,
    understandingLevel: value.understanding_level,
    learnedText: value.learned_text,
    helpText: value.help_text,
    linkedSessionBookingId: value.linked_session_booking_id,
    linkedFeedbackId: value.linked_feedback_id,
    createdAt: value.created_at,
  };
}

export function mapStudentLearningNoteRevisionList(value: unknown): StudentLearningNoteRevisionList {
  const record = recordValue(value, "student note revision list");
  const revisions = arrayValue(record.revisions, "student note revision list.revisions");
  return { revisions: revisions.map(mapStudentLearningNoteRevision) };
}

export function mapStudentNotesContext(value: unknown): StudentNotesContext {
  assertStudentNotesContext(value);
  return {
    studentProfileId: value.student_profile_id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    centreTimeZone: value.centre_time_zone,
    reflectionDate: value.reflection_date,
    activeTodayCount: value.active_today_count,
    remainingToday: value.remaining_today,
    maximumDailyReflections: value.maximum_daily_reflections,
    subjects: [...value.subjects],
    understandingLevels: [...value.understanding_levels],
    recentSessions: value.recent_sessions.map(mapSessionOption),
    publishedFeedback: value.published_feedback.map(mapFeedbackOption),
  };
}

export function mapStudentReflectionPromptState(value: unknown): StudentReflectionPromptState {
  const state = recordValue(value, "student reflection prompt state");
  stringValue(state.local_date, "student reflection prompt state.local_date");
  nonNegativeIntegerValue(state.active_today_count, "student reflection prompt state.active_today_count");
  positiveIntegerValue(state.maximum_daily_reflections, "student reflection prompt state.maximum_daily_reflections");
  optionalStringValue(state.next_check_at, "student reflection prompt state.next_check_at");
  const options = arrayValue(state.defer_options_minutes, "student reflection prompt state.defer_options_minutes");
  if (!options.every(isStudentReflectionPromptDeferMinutes)) {
    throw new TypeError("student reflection prompt state.defer_options_minutes contains an unsupported value.");
  }
  return {
    localDate: state.local_date as string,
    activeTodayCount: state.active_today_count as number,
    maximumDailyReflections: state.maximum_daily_reflections as number,
    duePrompt: state.due_prompt === undefined ? undefined : mapStudentReflectionPrompt(state.due_prompt),
    nextCheckAt: state.next_check_at as string | undefined,
    deferOptionsMinutes: [...options] as StudentReflectionPromptDeferMinutes[],
  };
}

function mapStudentReflectionPrompt(value: unknown): StudentReflectionPrompt {
  const prompt = recordValue(value, "student reflection prompt");
  for (const key of ["id", "local_date", "scheduled_at", "expires_at"] as const) {
    stringValue(prompt[key], `student reflection prompt.${key}`);
  }
  if (prompt.slot !== "afternoon" && prompt.slot !== "evening") {
    throw new TypeError("student reflection prompt.slot is not supported.");
  }
  for (const key of ["last_presented_at", "snoozed_until"] as const) {
    optionalStringValue(prompt[key], `student reflection prompt.${key}`);
  }
  if (prompt.last_defer_minutes !== undefined && !isStudentReflectionPromptDeferMinutes(prompt.last_defer_minutes)) {
    throw new TypeError("student reflection prompt.last_defer_minutes is not supported.");
  }
  return {
    id: prompt.id as string,
    slot: prompt.slot,
    localDate: prompt.local_date as string,
    scheduledAt: prompt.scheduled_at as string,
    expiresAt: prompt.expires_at as string,
    lastPresentedAt: prompt.last_presented_at as string | undefined,
    snoozedUntil: prompt.snoozed_until as string | undefined,
    lastDeferMinutes: prompt.last_defer_minutes,
  };
}

function mapSessionOption(value: BackendStudentNotesContext["recent_sessions"][number]): StudentNoteSessionOption {
  return {
    sessionBookingId: value.session_booking_id,
    sessionId: value.session_id,
    subjectId: value.subject_id,
    subjectName: value.subject_name,
    subjectCode: value.subject_code,
    startsAt: value.starts_at,
    endsAt: value.ends_at,
  };
}

function mapFeedbackOption(value: BackendStudentNotesContext["published_feedback"][number]): StudentNoteFeedbackOption {
  return {
    feedbackId: value.feedback_id,
    sessionBookingId: value.session_booking_id,
    subjectId: value.subject_id,
    subjectName: value.subject_name,
    tutorFirstName: value.tutor_first_name,
    tutorLastName: value.tutor_last_name,
    preview: value.preview,
    sessionStartsAt: value.session_starts_at,
    publishedAt: value.published_at,
  };
}

function assertStudentLearningNote(value: unknown, label: string): asserts value is BackendStudentLearningNote {
  const note = recordValue(value, label);
  for (const key of ["id", "centre_id", "centre_name", "centre_time_zone", "student_profile_id", "reflection_date", "learned_text", "created_at", "updated_at"] as const) {
    stringValue(note[key], `${label}.${key}`);
  }
  dailySequenceValue(note.daily_sequence, `${label}.daily_sequence`);
  if (!isStudentNoteSubject(note.subject_area)) throw new TypeError(`${label}.subject_area is not supported.`);
  if (!isStudentNoteUnderstandingLevel(note.understanding_level)) throw new TypeError(`${label}.understanding_level is not supported.`);
  for (const key of ["help_text", "linked_session_booking_id", "linked_feedback_id", "deleted_at"] as const) {
    optionalStringValue(note[key], `${label}.${key}`);
  }
}

function assertStudentLearningNoteRevision(value: unknown, label: string): asserts value is BackendStudentLearningNoteRevision {
  const revision = recordValue(value, label);
  for (const key of ["id", "note_id", "reflection_date", "learned_text", "created_at"] as const) {
    stringValue(revision[key], `${label}.${key}`);
  }
  positiveIntegerValue(revision.revision_number, `${label}.revision_number`);
  dailySequenceValue(revision.daily_sequence, `${label}.daily_sequence`);
  if (!["create", "update", "delete"].includes(String(revision.change_type))) {
    throw new TypeError(`${label}.change_type is not supported.`);
  }
  if (!isStudentNoteSubject(revision.subject_area)) throw new TypeError(`${label}.subject_area is not supported.`);
  if (!isStudentNoteUnderstandingLevel(revision.understanding_level)) throw new TypeError(`${label}.understanding_level is not supported.`);
  for (const key of ["help_text", "linked_session_booking_id", "linked_feedback_id"] as const) {
    optionalStringValue(revision[key], `${label}.${key}`);
  }
}

function assertStudentNotesContext(value: unknown): asserts value is BackendStudentNotesContext {
  const context = recordValue(value, "student notes context");
  for (const key of ["student_profile_id", "centre_id", "centre_name", "centre_time_zone", "reflection_date"] as const) {
    stringValue(context[key], `student notes context.${key}`);
  }
  for (const key of ["active_today_count", "remaining_today", "maximum_daily_reflections"] as const) {
    nonNegativeIntegerValue(context[key], `student notes context.${key}`);
  }
  const subjects = arrayValue(context.subjects, "student notes context.subjects");
  if (!subjects.every(isStudentNoteSubject)) throw new TypeError("student notes context.subjects contains an unsupported value.");
  const levels = arrayValue(context.understanding_levels, "student notes context.understanding_levels");
  if (!levels.every(isStudentNoteUnderstandingLevel)) throw new TypeError("student notes context.understanding_levels contains an unsupported value.");
  arrayValue(context.recent_sessions, "student notes context.recent_sessions").forEach((item, index) => {
    const session = recordValue(item, `student notes context.recent_sessions[${index}]`);
    for (const key of ["session_booking_id", "session_id", "subject_id", "subject_name", "subject_code", "starts_at", "ends_at"] as const) {
      stringValue(session[key], `student notes context.recent_sessions[${index}].${key}`);
    }
  });
  arrayValue(context.published_feedback, "student notes context.published_feedback").forEach((item, index) => {
    const feedback = recordValue(item, `student notes context.published_feedback[${index}]`);
    for (const key of ["feedback_id", "session_booking_id", "subject_id", "subject_name", "tutor_first_name", "tutor_last_name", "preview", "session_starts_at", "published_at"] as const) {
      stringValue(feedback[key], `student notes context.published_feedback[${index}].${key}`);
    }
  });
}

function recordValue(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function arrayValue(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${label} must be a non-empty string.`);
  return value;
}

function optionalStringValue(value: unknown, label: string): void {
  if (value !== undefined && (typeof value !== "string" || !value.trim())) {
    throw new TypeError(`${label} must be a non-empty string when supplied.`);
  }
}

function nonNegativeIntegerValue(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new TypeError(`${label} must be a non-negative integer.`);
  return value;
}

function positiveIntegerValue(value: unknown, label: string): number {
  const number = nonNegativeIntegerValue(value, label);
  if (number < 1) throw new TypeError(`${label} must be a positive integer.`);
  return number;
}

function dailySequenceValue(value: unknown, label: string): number {
  const number = positiveIntegerValue(value, label);
  if (number > 2) throw new TypeError(`${label} must be 1 or 2.`);
  return number;
}
