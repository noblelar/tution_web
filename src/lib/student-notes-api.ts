import type {
  SaveStudentLearningNoteInput,
  StudentLearningNote,
  StudentLearningNoteList,
  StudentLearningNoteRevisionList,
  StudentNoteListFilters,
  StudentNotesContext,
  StudentReflectionPromptDeferMinutes,
  StudentReflectionPromptState,
} from "./student-notes-types";
import { isStudentReflectionPromptDeferMinutes, prepareStudentNoteInput, studentNoteListQuery } from "./student-notes-rules";

type Fetcher = typeof fetch;
type ResponseKind = "note" | "list" | "context" | "history" | "promptState";

export class StudentNotesApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "StudentNotesApiError";
  }
}

export async function listStudentNotes(
  filters: StudentNoteListFilters = {},
  fetcher: Fetcher = fetch,
): Promise<StudentLearningNoteList> {
  const query = studentNoteListQuery(filters);
  if (query === null) throw new StudentNotesApiError("Note filters are invalid.", 400);
  return getJSON<StudentLearningNoteList>(
    `/api/student/notes${query ? `?${query}` : ""}`,
    "Your notes could not be loaded.",
    "list",
    fetcher,
  );
}

export async function getStudentNotesContext(fetcher: Fetcher = fetch): Promise<StudentNotesContext> {
  return getJSON<StudentNotesContext>(
    "/api/student/notes/context",
    "Your note options could not be loaded.",
    "context",
    fetcher,
  );
}

export async function getStudentReflectionPromptState(fetcher: Fetcher = fetch): Promise<StudentReflectionPromptState> {
  return getJSON<StudentReflectionPromptState>(
    "/api/student/notes/prompts",
    "Your learning reminder could not be checked.",
    "promptState",
    fetcher,
  );
}

export async function deferStudentReflectionPrompt(
  promptId: string,
  minutes: StudentReflectionPromptDeferMinutes,
  fetcher: Fetcher = fetch,
): Promise<StudentReflectionPromptState> {
  if (!isStudentReflectionPromptDeferMinutes(minutes)) {
    throw new StudentNotesApiError("Reminder interval is invalid.", 400);
  }
  return mutateJSON<StudentReflectionPromptState>(
    `/api/student/notes/prompts/${encodeURIComponent(requiredIdentifier(promptId))}/defer`,
    "POST",
    { minutes },
    "Your learning reminder could not be postponed.",
    fetcher,
    "promptState",
  );
}

export async function dismissStudentReflectionPrompt(
  promptId: string,
  fetcher: Fetcher = fetch,
): Promise<StudentReflectionPromptState> {
  return mutateJSON<StudentReflectionPromptState>(
    `/api/student/notes/prompts/${encodeURIComponent(requiredIdentifier(promptId))}/dismiss`,
    "POST",
    {},
    "Your learning reminder could not be dismissed.",
    fetcher,
    "promptState",
  );
}

export async function getStudentNote(noteId: string, fetcher: Fetcher = fetch): Promise<StudentLearningNote> {
  return getJSON<StudentLearningNote>(
    `/api/student/notes/${encodeURIComponent(requiredIdentifier(noteId))}`,
    "Your note could not be loaded.",
    "note",
    fetcher,
  );
}

export async function getStudentNoteHistory(
  noteId: string,
  fetcher: Fetcher = fetch,
): Promise<StudentLearningNoteRevisionList> {
  return getJSON<StudentLearningNoteRevisionList>(
    `/api/student/notes/${encodeURIComponent(requiredIdentifier(noteId))}/history`,
    "Your note history could not be loaded.",
    "history",
    fetcher,
  );
}

export async function createStudentNote(
  input: SaveStudentLearningNoteInput,
  fetcher: Fetcher = fetch,
): Promise<StudentLearningNote> {
  return mutateJSON<StudentLearningNote>(
    "/api/student/notes",
    "POST",
    preparedMutation(input),
    "Your reflection could not be saved.",
    fetcher,
  );
}

export async function updateStudentNote(
  noteId: string,
  input: SaveStudentLearningNoteInput,
  fetcher: Fetcher = fetch,
): Promise<StudentLearningNote> {
  return mutateJSON<StudentLearningNote>(
    `/api/student/notes/${encodeURIComponent(requiredIdentifier(noteId))}`,
    "PUT",
    preparedMutation(input),
    "Your reflection could not be updated.",
    fetcher,
  );
}

export async function deleteStudentNote(noteId: string, fetcher: Fetcher = fetch): Promise<void> {
  const preparedNoteId = requiredIdentifier(noteId);
  const csrfToken = await loadCSRFToken(fetcher);
  let response: Response;
  try {
    response = await fetcher(`/api/student/notes/${encodeURIComponent(preparedNoteId)}`, {
      method: "DELETE",
      cache: "no-store",
      credentials: "same-origin",
      headers: { "x-csrf-token": csrfToken },
    });
  } catch {
    throw uncertainMutationError("Your reflection could not be deleted.");
  }
  if (!response.ok) {
    const body = await jsonObject(response);
    throw new StudentNotesApiError(errorMessage(body, "Your reflection could not be deleted."), response.status);
  }
  if (response.status !== 204) throw uncertainMutationError("Your reflection could not be deleted.", 502);
}

function preparedMutation(input: SaveStudentLearningNoteInput): SaveStudentLearningNoteInput {
  const prepared = prepareStudentNoteInput(input);
  if (!prepared) throw new StudentNotesApiError("Reflection details are invalid.", 400);
  return prepared;
}

async function getJSON<T>(path: string, fallback: string, kind: ResponseKind, fetcher: Fetcher): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(path, { cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new StudentNotesApiError(fallback, 0);
  }
  return responseJSON<T>(response, fallback, kind);
}

async function mutateJSON<T>(
  path: string,
  method: "POST" | "PUT",
  body: object,
  fallback: string,
  fetcher: Fetcher,
  kind: ResponseKind = "note",
): Promise<T> {
  const csrfToken = await loadCSRFToken(fetcher);
  let response: Response;
  try {
    response = await fetcher(path, {
      method,
      cache: "no-store",
      credentials: "same-origin",
      headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify(body),
    });
  } catch {
    throw uncertainMutationError(fallback);
  }
  return responseJSON<T>(response, fallback, kind, true);
}

async function loadCSRFToken(fetcher: Fetcher): Promise<string> {
  let response: Response;
  try {
    response = await fetcher("/api/auth/csrf", { cache: "no-store", credentials: "same-origin" });
  } catch {
    throw new StudentNotesApiError("Request verification is unavailable.", 0);
  }
  const body = await jsonObject(response);
  if (!response.ok || typeof body?.csrfToken !== "string" || !body.csrfToken.trim()) {
    throw new StudentNotesApiError(errorMessage(body, "Request verification is unavailable."), response.status);
  }
  return body.csrfToken;
}

async function responseJSON<T>(
  response: Response,
  fallback: string,
  kind: ResponseKind,
  mutation = false,
): Promise<T> {
  const body = await jsonObject(response);
  if (!response.ok) throw new StudentNotesApiError(errorMessage(body, fallback), response.status);
  if (!body || !validResponse(body, kind)) {
    const message = mutation
      ? `${fallback} The result could not be confirmed. Refresh before retrying.`
      : fallback;
    throw new StudentNotesApiError(message, 502);
  }
  return body as T;
}

function validResponse(body: Record<string, unknown>, kind: ResponseKind): boolean {
  switch (kind) {
    case "note":
      return typeof body.id === "string" && typeof body.subjectArea === "string" && typeof body.learnedText === "string";
    case "list":
      return Array.isArray(body.notes);
    case "history":
      return Array.isArray(body.revisions);
    case "context":
      return typeof body.studentProfileId === "string" &&
        typeof body.reflectionDate === "string" &&
        Array.isArray(body.subjects) &&
        Array.isArray(body.understandingLevels) &&
        Array.isArray(body.recentSessions) &&
        Array.isArray(body.publishedFeedback);
    case "promptState": {
      if (!(typeof body.localDate === "string" &&
        typeof body.activeTodayCount === "number" &&
        typeof body.maximumDailyReflections === "number" &&
        Array.isArray(body.deferOptionsMinutes) &&
        body.deferOptionsMinutes.every(isStudentReflectionPromptDeferMinutes))) return false;
      if (body.duePrompt === undefined) return true;
      if (!body.duePrompt || typeof body.duePrompt !== "object" || Array.isArray(body.duePrompt)) return false;
      const prompt = body.duePrompt as Record<string, unknown>;
      return typeof prompt.id === "string" && Boolean(prompt.id.trim()) &&
        (prompt.slot === "afternoon" || prompt.slot === "evening") &&
        typeof prompt.localDate === "string" &&
        typeof prompt.scheduledAt === "string" &&
        typeof prompt.expiresAt === "string";
    }
  }
}

async function jsonObject(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = await response.json() as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function errorMessage(body: Record<string, unknown> | null, fallback: string): string {
  const message = body?.error;
  return typeof message === "string" && message.trim() ? message : fallback;
}

function requiredIdentifier(value: string): string {
  const prepared = value.trim();
  if (!prepared || prepared.length > 200) throw new StudentNotesApiError("Note is invalid.", 400);
  return prepared;
}

function uncertainMutationError(fallback: string, status = 0): StudentNotesApiError {
  return new StudentNotesApiError(`${fallback} The result could not be confirmed. Refresh before retrying.`, status);
}
