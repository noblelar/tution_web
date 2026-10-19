import type { FeedbackQueryCategory } from "./feedback-rules";

export type SessionFeedbackStatus = "draft" | "published" | "withdrawn";

export type SessionFeedbackRevision = {
  id: string;
  feedbackId: string;
  revisionNumber: number;
  feedbackText: string;
  authoredByTutorProfileId: string;
  authoredByUserId: string;
  createdAt: string;
};

export type SessionFeedback = {
  id: string;
  centreId: string;
  centreName: string;
  sessionId: string;
  sessionSubjectId: string;
  sessionBookingId: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  studentPeopleCode: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  sessionStartsAt: string;
  sessionEndsAt: string;
  authoredByTutorProfileId: string;
  authoredByUserId: string;
  tutorFirstName: string;
  tutorLastName: string;
  status: SessionFeedbackStatus;
  publishedRevisionNumber?: number;
  publishedByUserId?: string;
  publishedAt?: string;
  withdrawnByUserId?: string;
  withdrawnAt?: string;
  replacementForFeedbackId?: string;
  feedbackText?: string;
  latestRevisionNumber?: number;
  revisions: SessionFeedbackRevision[];
  createdAt: string;
  updatedAt: string;
};

export type SessionFeedbackList = { feedback: SessionFeedback[] };

export type CreateSessionFeedbackInput = {
  sessionBookingId: string;
  feedbackText: string;
  replacementForFeedbackId?: string;
};

export type SaveSessionFeedbackRevisionInput = {
  feedbackText: string;
};

export type FeedbackQueryStatus =
  | "open"
  | "assigned"
  | "awaiting_staff"
  | "awaiting_parent"
  | "resolved";

export type FeedbackQueryAuthorType = "owner" | "manager" | "tutor" | "parent" | "student";

export type FeedbackQueryMessage = {
  id: string;
  queryId: string;
  authoredByUserId: string;
  authoredByType: FeedbackQueryAuthorType;
  authorFirstName: string;
  authorLastName: string;
  messageText: string;
  createdAt: string;
};

export type FeedbackQueryEvent = {
  id: string;
  queryId: string;
  eventType: "opened" | "assigned" | "status_changed" | "replied" | "resolution_proposed" | "resolved" | "reopened";
  actorUserId: string;
  actorFirstName: string;
  actorLastName: string;
  previousStatus?: FeedbackQueryStatus;
  newStatus?: FeedbackQueryStatus;
  previousAssignedTutorProfileId?: string;
  newAssignedTutorProfileId?: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

export type FeedbackQuery = {
  id: string;
  centreId: string;
  centreName: string;
  studentProfileId: string;
  studentFirstName: string;
  studentLastName: string;
  studentPeopleCode: string;
  openedByUserId: string;
  openedByType: "parent" | "student";
  openerFirstName: string;
  openerLastName: string;
  category: FeedbackQueryCategory;
  subject: string;
  status: FeedbackQueryStatus;
  linkedFeedbackId?: string;
  linkedSessionBookingId?: string;
  linkedSessionId?: string;
  linkedSessionSubjectId?: string;
  assignedTutorProfileId?: string;
  assignedTutorUserId?: string;
  assignedTutorFirstName?: string;
  assignedTutorLastName?: string;
  assignedByUserId?: string;
  assignedAt?: string;
  resolutionProposedByUserId?: string;
  resolutionProposedAt?: string;
  resolvedByUserId?: string;
  resolvedAt?: string;
  lastMessageAt: string;
  messages: FeedbackQueryMessage[];
  events: FeedbackQueryEvent[];
  createdAt: string;
  updatedAt: string;
};

export type FeedbackQueryList = { queries: FeedbackQuery[] };

export type CreateFeedbackQueryInput = {
  studentProfileId: string;
  category: FeedbackQueryCategory;
  subject: string;
  messageText: string;
  linkedFeedbackId?: string;
  linkedSessionBookingId?: string;
  linkedSessionId?: string;
  linkedSessionSubjectId?: string;
};

export type ReplyFeedbackQueryInput = {
  messageText: string;
};

export type AssignFeedbackQueryInput = {
  tutorProfileId: string;
};
