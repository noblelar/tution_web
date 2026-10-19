import "server-only";

import type {
  FeedbackQuery,
  FeedbackQueryAuthorType,
  FeedbackQueryEvent,
  FeedbackQueryList,
  FeedbackQueryMessage,
  FeedbackQueryStatus,
  SessionFeedback,
  SessionFeedbackList,
  SessionFeedbackRevision,
} from "@/lib/feedback-types";
import {
  feedbackMaximumLength,
  feedbackQueryMessageMaximumLength,
  feedbackQuerySubjectMaximumLength,
  isFeedbackQueryCategory,
  normalizeRequiredText,
  optionalIdentifier,
} from "@/lib/feedback-rules";

export type BackendFeedbackRevision = {
  id: string;
  feedback_id: string;
  revision_number: number;
  feedback_text: string;
  authored_by_tutor_profile_id: string;
  authored_by_user_id: string;
  created_at: string;
};

export type BackendSessionFeedback = {
  id: string;
  centre_id: string;
  centre_name: string;
  session_id: string;
  session_subject_id: string;
  session_booking_id: string;
  student_profile_id: string;
  student_first_name: string;
  student_last_name: string;
  student_people_code: string;
  subject_id: string;
  subject_name: string;
  subject_code: string;
  session_starts_at: string;
  session_ends_at: string;
  authored_by_tutor_profile_id: string;
  authored_by_user_id: string;
  tutor_first_name: string;
  tutor_last_name: string;
  status: SessionFeedback["status"];
  published_revision_number?: number;
  published_by_user_id?: string;
  published_at?: string;
  withdrawn_by_user_id?: string;
  withdrawn_at?: string;
  replacement_for_feedback_id?: string;
  feedback_text?: string;
  latest_revision_number?: number;
  revisions: BackendFeedbackRevision[];
  created_at: string;
  updated_at: string;
};

export type BackendSessionFeedbackList = { feedback: BackendSessionFeedback[] };

export type BackendFeedbackQueryMessage = {
  id: string;
  query_id: string;
  authored_by_user_id: string;
  authored_by_type: FeedbackQueryAuthorType;
  author_first_name: string;
  author_last_name: string;
  message_text: string;
  created_at: string;
};

export type BackendFeedbackQueryEvent = {
  id: string;
  query_id: string;
  event_type: FeedbackQueryEvent["eventType"];
  actor_user_id: string;
  actor_first_name: string;
  actor_last_name: string;
  previous_status?: FeedbackQueryStatus;
  new_status?: FeedbackQueryStatus;
  previous_assigned_tutor_profile_id?: string;
  new_assigned_tutor_profile_id?: string;
  metadata?: unknown;
  occurred_at: string;
};

export type BackendFeedbackQuery = {
  id: string;
  centre_id: string;
  centre_name: string;
  student_profile_id: string;
  student_first_name: string;
  student_last_name: string;
  student_people_code: string;
  opened_by_user_id: string;
  opened_by_type: FeedbackQuery["openedByType"];
  opener_first_name: string;
  opener_last_name: string;
  category: FeedbackQuery["category"];
  subject: string;
  status: FeedbackQueryStatus;
  linked_feedback_id?: string;
  linked_session_booking_id?: string;
  linked_session_id?: string;
  linked_session_subject_id?: string;
  assigned_tutor_profile_id?: string;
  assigned_tutor_user_id?: string;
  assigned_tutor_first_name?: string;
  assigned_tutor_last_name?: string;
  assigned_by_user_id?: string;
  assigned_at?: string;
  resolution_proposed_by_user_id?: string;
  resolution_proposed_at?: string;
  resolved_by_user_id?: string;
  resolved_at?: string;
  last_message_at: string;
  messages: BackendFeedbackQueryMessage[];
  events: BackendFeedbackQueryEvent[];
  created_at: string;
  updated_at: string;
};

export type BackendFeedbackQueryList = { queries: BackendFeedbackQuery[] };

export function mapFeedbackRevision(value: BackendFeedbackRevision): SessionFeedbackRevision {
  return {
    id: value.id,
    feedbackId: value.feedback_id,
    revisionNumber: value.revision_number,
    feedbackText: value.feedback_text,
    authoredByTutorProfileId: value.authored_by_tutor_profile_id,
    authoredByUserId: value.authored_by_user_id,
    createdAt: value.created_at,
  };
}

export function mapSessionFeedback(value: BackendSessionFeedback): SessionFeedback {
  return {
    id: value.id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    sessionId: value.session_id,
    sessionSubjectId: value.session_subject_id,
    sessionBookingId: value.session_booking_id,
    studentProfileId: value.student_profile_id,
    studentFirstName: value.student_first_name,
    studentLastName: value.student_last_name,
    studentPeopleCode: value.student_people_code,
    subjectId: value.subject_id,
    subjectName: value.subject_name,
    subjectCode: value.subject_code,
    sessionStartsAt: value.session_starts_at,
    sessionEndsAt: value.session_ends_at,
    authoredByTutorProfileId: value.authored_by_tutor_profile_id,
    authoredByUserId: value.authored_by_user_id,
    tutorFirstName: value.tutor_first_name,
    tutorLastName: value.tutor_last_name,
    status: value.status,
    publishedRevisionNumber: value.published_revision_number,
    publishedByUserId: value.published_by_user_id,
    publishedAt: value.published_at,
    withdrawnByUserId: value.withdrawn_by_user_id,
    withdrawnAt: value.withdrawn_at,
    replacementForFeedbackId: value.replacement_for_feedback_id,
    feedbackText: value.feedback_text,
    latestRevisionNumber: value.latest_revision_number,
    revisions: (value.revisions ?? []).map(mapFeedbackRevision),
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapSessionFeedbackList(value: BackendSessionFeedbackList): SessionFeedbackList {
  return { feedback: (value.feedback ?? []).map(mapSessionFeedback) };
}

export function mapFeedbackQueryMessage(value: BackendFeedbackQueryMessage): FeedbackQueryMessage {
  return {
    id: value.id,
    queryId: value.query_id,
    authoredByUserId: value.authored_by_user_id,
    authoredByType: value.authored_by_type,
    authorFirstName: value.author_first_name,
    authorLastName: value.author_last_name,
    messageText: value.message_text,
    createdAt: value.created_at,
  };
}

export function mapFeedbackQueryEvent(value: BackendFeedbackQueryEvent): FeedbackQueryEvent {
  return {
    id: value.id,
    queryId: value.query_id,
    eventType: value.event_type,
    actorUserId: value.actor_user_id,
    actorFirstName: value.actor_first_name,
    actorLastName: value.actor_last_name,
    previousStatus: value.previous_status,
    newStatus: value.new_status,
    previousAssignedTutorProfileId: value.previous_assigned_tutor_profile_id,
    newAssignedTutorProfileId: value.new_assigned_tutor_profile_id,
    metadata: objectMetadata(value.metadata),
    occurredAt: value.occurred_at,
  };
}

export function mapFeedbackQuery(value: BackendFeedbackQuery): FeedbackQuery {
  return {
    id: value.id,
    centreId: value.centre_id,
    centreName: value.centre_name,
    studentProfileId: value.student_profile_id,
    studentFirstName: value.student_first_name,
    studentLastName: value.student_last_name,
    studentPeopleCode: value.student_people_code,
    openedByUserId: value.opened_by_user_id,
    openedByType: value.opened_by_type,
    openerFirstName: value.opener_first_name,
    openerLastName: value.opener_last_name,
    category: value.category,
    subject: value.subject,
    status: value.status,
    linkedFeedbackId: value.linked_feedback_id,
    linkedSessionBookingId: value.linked_session_booking_id,
    linkedSessionId: value.linked_session_id,
    linkedSessionSubjectId: value.linked_session_subject_id,
    assignedTutorProfileId: value.assigned_tutor_profile_id,
    assignedTutorUserId: value.assigned_tutor_user_id,
    assignedTutorFirstName: value.assigned_tutor_first_name,
    assignedTutorLastName: value.assigned_tutor_last_name,
    assignedByUserId: value.assigned_by_user_id,
    assignedAt: value.assigned_at,
    resolutionProposedByUserId: value.resolution_proposed_by_user_id,
    resolutionProposedAt: value.resolution_proposed_at,
    resolvedByUserId: value.resolved_by_user_id,
    resolvedAt: value.resolved_at,
    lastMessageAt: value.last_message_at,
    messages: (value.messages ?? []).map(mapFeedbackQueryMessage),
    events: (value.events ?? []).map(mapFeedbackQueryEvent),
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function mapFeedbackQueryList(value: BackendFeedbackQueryList): FeedbackQueryList {
  return { queries: (value.queries ?? []).map(mapFeedbackQuery) };
}

export async function feedbackDraftInput(request: Request) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const sessionBookingId = normalizeRequiredText(value.sessionBookingId, 200);
    const feedbackText = normalizeRequiredText(value.feedbackText, feedbackMaximumLength);
    const replacementForFeedbackId = optionalIdentifier(value.replacementForFeedbackId);
    if (!sessionBookingId || !feedbackText || replacementForFeedbackId === null) return null;
    return {
      session_booking_id: sessionBookingId,
      feedback_text: feedbackText,
      replacement_for_feedback_id: replacementForFeedbackId,
    };
  } catch {
    return null;
  }
}

export async function feedbackRevisionInput(request: Request) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const feedbackText = normalizeRequiredText(value.feedbackText, feedbackMaximumLength);
    return feedbackText ? { feedback_text: feedbackText } : null;
  } catch {
    return null;
  }
}

export async function feedbackQueryInput(request: Request) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const studentProfileId = normalizeRequiredText(value.studentProfileId, 200);
    const subject = normalizeRequiredText(value.subject, feedbackQuerySubjectMaximumLength);
    const messageText = normalizeRequiredText(value.messageText, feedbackQueryMessageMaximumLength);
    const linkedFeedbackId = optionalIdentifier(value.linkedFeedbackId);
    const linkedSessionBookingId = optionalIdentifier(value.linkedSessionBookingId);
    const linkedSessionId = optionalIdentifier(value.linkedSessionId);
    const linkedSessionSubjectId = optionalIdentifier(value.linkedSessionSubjectId);
    if (
      !studentProfileId ||
      !isFeedbackQueryCategory(value.category) ||
      !subject ||
      !messageText ||
      linkedFeedbackId === null ||
      linkedSessionBookingId === null ||
      linkedSessionId === null ||
      linkedSessionSubjectId === null ||
      (value.category === "feedback_follow_up" && !linkedFeedbackId) ||
      (value.category !== "feedback_follow_up" && Boolean(linkedFeedbackId)) ||
      (Boolean(linkedSessionSubjectId) && !linkedSessionId && !linkedSessionBookingId)
    ) return null;
    return {
      student_profile_id: studentProfileId,
      category: value.category,
      subject,
      message_text: messageText,
      linked_feedback_id: linkedFeedbackId,
      linked_session_booking_id: linkedSessionBookingId,
      linked_session_id: linkedSessionId,
      linked_session_subject_id: linkedSessionSubjectId,
    };
  } catch {
    return null;
  }
}

export async function feedbackQueryMessageInput(request: Request) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const messageText = normalizeRequiredText(value.messageText, feedbackQueryMessageMaximumLength);
    return messageText ? { message_text: messageText } : null;
  } catch {
    return null;
  }
}

export async function feedbackQueryAssignmentInput(request: Request) {
  try {
    const value = (await request.json()) as Record<string, unknown>;
    const tutorProfileId = normalizeRequiredText(value.tutorProfileId, 200);
    return tutorProfileId ? { tutor_profile_id: tutorProfileId } : null;
  } catch {
    return null;
  }
}

function objectMetadata(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
