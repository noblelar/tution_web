import {
  studentNoteSubjects,
  studentNoteUnderstandingLevels,
  type SaveStudentLearningNoteInput,
  type StudentNoteListFilters,
  type StudentNoteSubject,
  type StudentNoteUnderstandingLevel,
  type StudentReflectionPromptDeferMinutes,
} from "./student-notes-types";

export const studentNoteTextMaximumLength = 1500;
export const studentNoteSearchMaximumLength = 150;
export const studentNoteListMaximumLimit = 100;
export const studentReflectionPromptDeferOptions: StudentReflectionPromptDeferMinutes[] = [30, 60, 120];

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function isStudentNoteSubject(value: unknown): value is StudentNoteSubject {
  return typeof value === "string" && studentNoteSubjects.includes(value as StudentNoteSubject);
}

export function isStudentNoteUnderstandingLevel(value: unknown): value is StudentNoteUnderstandingLevel {
  return typeof value === "string" && studentNoteUnderstandingLevels.includes(value as StudentNoteUnderstandingLevel);
}

export function isStudentReflectionPromptDeferMinutes(value: unknown): value is StudentReflectionPromptDeferMinutes {
  return typeof value === "number" && studentReflectionPromptDeferOptions.includes(value as StudentReflectionPromptDeferMinutes);
}

export function prepareStudentNoteInput(value: unknown): SaveStudentLearningNoteInput | null {
  if (!isRecord(value)) return null;
  const learnedText = requiredText(value.learnedText, studentNoteTextMaximumLength);
  const helpText = optionalText(value.helpText, studentNoteTextMaximumLength);
  const linkedSessionBookingId = optionalIdentifier(value.linkedSessionBookingId);
  const linkedFeedbackId = optionalIdentifier(value.linkedFeedbackId);
  if (
    !isStudentNoteSubject(value.subjectArea) ||
    !isStudentNoteUnderstandingLevel(value.understandingLevel) ||
    !learnedText ||
    helpText === null ||
    linkedSessionBookingId === null ||
    linkedFeedbackId === null
  ) return null;

  return {
    subjectArea: value.subjectArea,
    understandingLevel: value.understandingLevel,
    learnedText,
    ...(helpText ? { helpText } : {}),
    ...(linkedSessionBookingId ? { linkedSessionBookingId } : {}),
    ...(linkedFeedbackId ? { linkedFeedbackId } : {}),
  };
}

export function prepareStudentNoteFilters(value: StudentNoteListFilters): StudentNoteListFilters | null {
  const subject = value.subject;
  if (subject !== undefined && !isStudentNoteSubject(subject)) return null;
  const from = optionalDate(value.from);
  const through = optionalDate(value.through);
  const search = optionalText(value.search, studentNoteSearchMaximumLength);
  if (from === null || through === null || search === null) return null;
  if (from && through && through < from) return null;
  if (value.limit !== undefined && (!Number.isInteger(value.limit) || value.limit < 1 || value.limit > studentNoteListMaximumLimit)) {
    return null;
  }
  return {
    ...(subject ? { subject } : {}),
    ...(from ? { from } : {}),
    ...(through ? { through } : {}),
    ...(search ? { search } : {}),
    ...(value.limit !== undefined ? { limit: value.limit } : {}),
  };
}

export function studentNoteListQuery(filters: StudentNoteListFilters): string | null {
  const prepared = prepareStudentNoteFilters(filters);
  if (!prepared) return null;
  const query = new URLSearchParams();
  if (prepared.subject) query.set("subject", prepared.subject);
  if (prepared.from) query.set("from", prepared.from);
  if (prepared.through) query.set("through", prepared.through);
  if (prepared.search) query.set("search", prepared.search);
  if (prepared.limit !== undefined) query.set("limit", String(prepared.limit));
  return query.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredText(value: unknown, maximum: number): string | null {
  if (typeof value !== "string") return null;
  const prepared = value.trim();
  return prepared && Array.from(prepared).length <= maximum ? prepared : null;
}

function optionalText(value: unknown, maximum: number): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const prepared = value.trim();
  if (!prepared) return undefined;
  return Array.from(prepared).length <= maximum ? prepared : null;
}

function optionalIdentifier(value: unknown): string | undefined | null {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") return null;
  const prepared = value.trim();
  return prepared && prepared.length <= 200 ? prepared : null;
}

function optionalDate(value: unknown): string | undefined | null {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const prepared = value.trim();
  if (!datePattern.test(prepared)) return null;
  const date = new Date(`${prepared}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== prepared ? null : prepared;
}
