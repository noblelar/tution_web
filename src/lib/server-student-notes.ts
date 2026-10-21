import "server-only";

import type { SaveStudentLearningNoteInput, StudentNoteListFilters, StudentReflectionPromptDeferMinutes } from "./student-notes-types";
import { isStudentReflectionPromptDeferMinutes, prepareStudentNoteInput, studentNoteListQuery } from "./student-notes-rules";

export {
  mapStudentLearningNote,
  mapStudentLearningNoteList,
  mapStudentLearningNoteRevisionList,
  mapStudentNotesContext,
  mapStudentReflectionPromptState,
  type BackendStudentLearningNote,
  type BackendStudentLearningNoteList,
  type BackendStudentLearningNoteRevisionList,
  type BackendStudentNotesContext,
  type BackendStudentReflectionPromptState,
} from "./server-student-notes-mapper";

export type BackendStudentNoteMutation = {
  subject_area: SaveStudentLearningNoteInput["subjectArea"];
  understanding_level: SaveStudentLearningNoteInput["understandingLevel"];
  learned_text: string;
  help_text?: string;
  linked_session_booking_id?: string;
  linked_feedback_id?: string;
};

export async function studentNoteMutationInput(request: Request): Promise<BackendStudentNoteMutation | null> {
  try {
    const input = prepareStudentNoteInput(await request.json());
    if (!input) return null;
    return {
      subject_area: input.subjectArea,
      understanding_level: input.understandingLevel,
      learned_text: input.learnedText,
      ...(input.helpText ? { help_text: input.helpText } : {}),
      ...(input.linkedSessionBookingId ? { linked_session_booking_id: input.linkedSessionBookingId } : {}),
      ...(input.linkedFeedbackId ? { linked_feedback_id: input.linkedFeedbackId } : {}),
    };
  } catch {
    return null;
  }
}

export function studentNoteBackendListPath(url: URL): string | null {
  const limitValue = url.searchParams.get("limit")?.trim();
  const limit = limitValue ? Number(limitValue) : undefined;
  const filters: StudentNoteListFilters = {
    subject: url.searchParams.get("subject")?.trim() as StudentNoteListFilters["subject"],
    from: url.searchParams.get("from")?.trim(),
    through: url.searchParams.get("through")?.trim(),
    search: url.searchParams.get("search")?.trim(),
    limit,
  };
  const query = studentNoteListQuery(filters);
  if (query === null) return null;
  return `/v1/student/notes${query ? `?${query}` : ""}`;
}

export async function studentPromptDeferralInput(request: Request): Promise<{ minutes: StudentReflectionPromptDeferMinutes } | null> {
  try {
    const body = await request.json() as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    const minutes = (body as Record<string, unknown>).minutes;
    return isStudentReflectionPromptDeferMinutes(minutes) ? { minutes } : null;
  } catch {
    return null;
  }
}
