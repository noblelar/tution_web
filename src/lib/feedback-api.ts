import type {
  AssignFeedbackQueryInput,
  CreateFeedbackQueryInput,
  CreateSessionFeedbackInput,
  FeedbackQuery,
  FeedbackQueryList,
  ReplyFeedbackQueryInput,
  SaveSessionFeedbackRevisionInput,
  SessionFeedback,
  SessionFeedbackList,
} from "./feedback-types";
import type { FeedbackContext } from "./feedback-context-types";

type Fetcher = typeof fetch;

export async function getFeedbackContext(
  centreId?: string,
  fetcher: Fetcher = fetch,
): Promise<FeedbackContext> {
  const query = centreId ? `?centreId=${encodeURIComponent(requiredIdentifier(centreId, "Centre"))}` : "";
  return getJSON<FeedbackContext>(`/api/feedback/context${query}`, "Feedback access could not be loaded.", fetcher, "context");
}

export class FeedbackApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "FeedbackApiError";
  }
}

export async function listSessionFeedback(
  centreId: string,
  fetcher: Fetcher = fetch,
): Promise<SessionFeedbackList> {
  return getJSON<SessionFeedbackList>(
    `/api/feedback?centreId=${encodeURIComponent(requiredIdentifier(centreId, "Centre"))}`,
    "Session feedback could not be loaded.",
    fetcher,
    "feedback-list",
  );
}

export async function getSessionFeedback(
  feedbackId: string,
  fetcher: Fetcher = fetch,
): Promise<SessionFeedback> {
  return getJSON<SessionFeedback>(
    `/api/feedback/${encodeURIComponent(requiredIdentifier(feedbackId, "Feedback"))}`,
    "Session feedback could not be loaded.",
    fetcher,
  );
}

export async function createSessionFeedback(
  input: CreateSessionFeedbackInput,
  fetcher: Fetcher = fetch,
): Promise<SessionFeedback> {
  return mutateJSON<SessionFeedback>(
    "/api/feedback",
    "POST",
    input,
    "Session feedback could not be saved.",
    fetcher,
  );
}

export async function saveSessionFeedbackRevision(
  feedbackId: string,
  input: SaveSessionFeedbackRevisionInput,
  fetcher: Fetcher = fetch,
): Promise<SessionFeedback> {
  return mutateJSON<SessionFeedback>(
    `/api/feedback/${encodeURIComponent(requiredIdentifier(feedbackId, "Feedback"))}/revisions`,
    "POST",
    input,
    "The feedback revision could not be saved.",
    fetcher,
  );
}

export async function publishSessionFeedback(
  feedbackId: string,
  fetcher: Fetcher = fetch,
): Promise<SessionFeedback> {
  return mutateJSON<SessionFeedback>(
    `/api/feedback/${encodeURIComponent(requiredIdentifier(feedbackId, "Feedback"))}/publish`,
    "POST",
    undefined,
    "The feedback could not be published.",
    fetcher,
  );
}

export async function withdrawSessionFeedback(
  feedbackId: string,
  fetcher: Fetcher = fetch,
): Promise<SessionFeedback> {
  return mutateJSON<SessionFeedback>(
    `/api/feedback/${encodeURIComponent(requiredIdentifier(feedbackId, "Feedback"))}/withdraw`,
    "POST",
    undefined,
    "The feedback could not be withdrawn.",
    fetcher,
  );
}

export async function listFeedbackQueries(
  centreId: string,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQueryList> {
  return getJSON<FeedbackQueryList>(
    `/api/feedback-queries?centreId=${encodeURIComponent(requiredIdentifier(centreId, "Centre"))}`,
    "Feedback queries could not be loaded.",
    fetcher,
    "query-list",
  );
}

export async function getFeedbackQuery(
  queryId: string,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return getJSON<FeedbackQuery>(
    `/api/feedback-queries/${encodeURIComponent(requiredIdentifier(queryId, "Query"))}`,
    "The feedback query could not be loaded.",
    fetcher,
  );
}

export async function createFeedbackQuery(
  input: CreateFeedbackQueryInput,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return mutateJSON<FeedbackQuery>(
    "/api/feedback-queries",
    "POST",
    input,
    "The query could not be created.",
    fetcher,
  );
}

export async function replyToFeedbackQuery(
  queryId: string,
  input: ReplyFeedbackQueryInput,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return mutateJSON<FeedbackQuery>(
    `/api/feedback-queries/${encodeURIComponent(requiredIdentifier(queryId, "Query"))}/messages`,
    "POST",
    input,
    "The query reply could not be sent.",
    fetcher,
  );
}

export async function assignFeedbackQuery(
  queryId: string,
  input: AssignFeedbackQueryInput,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return mutateJSON<FeedbackQuery>(
    `/api/feedback-queries/${encodeURIComponent(requiredIdentifier(queryId, "Query"))}/assignment`,
    "PUT",
    input,
    "The query could not be assigned.",
    fetcher,
  );
}

export async function proposeFeedbackQueryResolution(
  queryId: string,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return queryAction(queryId, "propose-resolution", "Resolution could not be proposed.", fetcher);
}

export async function resolveFeedbackQuery(
  queryId: string,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return queryAction(queryId, "resolve", "The query could not be resolved.", fetcher);
}

export async function reopenFeedbackQuery(
  queryId: string,
  fetcher: Fetcher = fetch,
): Promise<FeedbackQuery> {
  return queryAction(queryId, "reopen", "The query could not be reopened.", fetcher);
}

async function queryAction(
  queryId: string,
  action: "propose-resolution" | "resolve" | "reopen",
  fallbackError: string,
  fetcher: Fetcher,
): Promise<FeedbackQuery> {
  return mutateJSON<FeedbackQuery>(
    `/api/feedback-queries/${encodeURIComponent(requiredIdentifier(queryId, "Query"))}/${action}`,
    "POST",
    undefined,
    fallbackError,
    fetcher,
  );
}

type ResponseKind = "record" | "feedback-list" | "query-list" | "context";

async function getJSON<T>(path: string, fallbackError: string, fetcher: Fetcher, kind: ResponseKind = "record"): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(path, {
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new FeedbackApiError(fallbackError, 0);
  }
  return responseJSON(response, fallbackError, kind);
}

async function mutateJSON<T>(
  path: string,
  method: "POST" | "PUT",
  body: object | undefined,
  fallbackError: string,
  fetcher: Fetcher,
): Promise<T> {
  const csrfToken = await loadCSRFToken(fetcher);
  const headers = new Headers({ "x-csrf-token": csrfToken });
  const init: RequestInit = {
    method,
    cache: "no-store",
    credentials: "same-origin",
    headers,
  };
  if (body !== undefined) {
    headers.set("content-type", "application/json");
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetcher(path, init);
  } catch {
    throw new FeedbackApiError(`${fallbackError} The result could not be confirmed. Refresh before retrying.`, 0);
  }
  return responseJSON(response, fallbackError);
}

async function loadCSRFToken(fetcher: Fetcher): Promise<string> {
  let response: Response;
  try {
    response = await fetcher("/api/auth/csrf", {
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new FeedbackApiError("Request verification is unavailable.", 0);
  }
  const body = await jsonObject(response);
  if (!response.ok || !body || typeof body.csrfToken !== "string" || !body.csrfToken.trim()) {
    throw new FeedbackApiError(errorMessage(body ?? {}, "Request verification is unavailable."), response.status);
  }
  return body.csrfToken;
}

async function responseJSON<T>(response: Response, fallbackError: string, kind: ResponseKind = "record"): Promise<T> {
  const body = await jsonObject(response);
  if (!response.ok) {
    throw new FeedbackApiError(errorMessage(body ?? {}, fallbackError), response.status);
  }
  if (!body || !validResponse(body, kind)) {
    throw new FeedbackApiError(`${fallbackError} The response could not be confirmed. Refresh before retrying.`, 502);
  }
  return body as T;
}

function validResponse(body: Record<string, unknown>, kind: ResponseKind): boolean {
  switch (kind) {
    case "feedback-list": return Array.isArray(body.feedback);
    case "query-list": return Array.isArray(body.queries);
    case "context": return typeof body.actorUserId === "string" &&
      ["admin", "tutor", "household"].includes(String(body.viewer)) &&
      Array.isArray(body.centres) && Array.isArray(body.students) &&
      Array.isArray(body.eligibleBookings) && Array.isArray(body.assignmentTutors);
    case "record": return typeof body.id === "string" && body.id.trim().length > 0 && typeof body.status === "string";
  }
}

async function jsonObject(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const body = await response.json() as unknown;
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function errorMessage(body: Record<string, unknown>, fallback: string): string {
  return typeof body.error === "string" && body.error.trim() ? body.error : fallback;
}

function requiredIdentifier(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new FeedbackApiError(`${label} is required.`, 400);
  return normalized;
}
