"use client";

import { type FormEvent, useRef, useState } from "react";

import { FeedbackDialog as FormDialog } from "./feedback-dialog";
import { queryStatusLabels } from "./feedback-display";
import type { FeedbackStudent } from "@/lib/feedback-context-types";
import {
  assignFeedbackQuery,
  createFeedbackQuery,
  proposeFeedbackQueryResolution,
  reopenFeedbackQuery,
  replyToFeedbackQuery,
  resolveFeedbackQuery,
} from "@/lib/feedback-api";
import {
  characterCount,
  feedbackQueryCategories,
  feedbackQueryMessageMaximumLength,
  feedbackQuerySubjectMaximumLength,
  isFeedbackQueryCategory,
  normalizeRequiredText,
  type FeedbackQueryCategory,
} from "@/lib/feedback-rules";
import type { FeedbackQuery, FeedbackQueryEvent, SessionFeedback } from "@/lib/feedback-types";

const fieldClass = "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100";
const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const primaryButtonClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-600 bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50";

export const queryCategoryLabels: Record<FeedbackQueryCategory, string> = {
  feedback_follow_up: "Feedback follow-up",
  academic_progress: "Academic progress",
  session: "Session",
  booking: "Booking",
  attendance: "Attendance",
  other: "Other",
};

type QueryThreadDialogProps = {
  query: FeedbackQuery | null;
  mode: "admin" | "tutor" | "parent" | "student";
  userId: string;
  tutors: Array<{ id: string; name: string }>;
  onClose: () => void;
  onChanged: (query: FeedbackQuery) => void;
};
type ThreadAction = "reply" | "assign" | "propose" | "resolve" | "reopen";

export function QueryThreadDialog(props: QueryThreadDialogProps) {
  if (!props.query) return null;
  return <QueryThread key={props.query.id} {...props} query={props.query} />;
}

function QueryThread({ query, mode, userId, tutors, onClose, onChanged }: QueryThreadDialogProps & { query: FeedbackQuery }) {
  const [reply, setReply] = useState("");
  const [selectedTutor, setSelectedTutor] = useState(query.assignedTutorProfileId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ThreadAction | null>(null);
  const operationInProgress = useRef(false);
  const isAdmin = mode === "admin";
  const isStaff = isAdmin || mode === "tutor";
  const isSubmitter = query.openedByUserId === userId;
  const isAssignedTutor = mode === "tutor" && query.assignedTutorUserId === userId;
  const isResolved = query.status === "resolved";
  const canReply = !isResolved && (isAdmin || isSubmitter || isAssignedTutor);
  const canResolve = !isResolved && (isAdmin || isSubmitter);
  const messages = [...query.messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  function close() {
    if (!operationInProgress.current) onClose();
  }

  async function mutate(action: ThreadAction, mutation: () => Promise<FeedbackQuery>) {
    if (operationInProgress.current) return;
    operationInProgress.current = true;
    setBusy(action);
    setError(null);
    let updated: FeedbackQuery | undefined;
    try {
      updated = await mutation();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The query could not be updated. Please try again.");
    } finally {
      operationInProgress.current = false;
      setBusy(null);
    }
    if (updated) {
      if (action === "reply") setReply("");
      onChanged(updated);
    }
  }

  function sendReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReply || operationInProgress.current) return;
    const messageText = normalizeRequiredText(reply, feedbackQueryMessageMaximumLength);
    if (!messageText) {
      setError("Enter a reply of 1–7,500 characters.");
      return;
    }
    void mutate("reply", () => replyToFeedbackQuery(query.id, { messageText }));
  }

  function assignTutor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAdmin || isResolved || operationInProgress.current) return;
    if (!selectedTutor || !tutors.some((tutor) => tutor.id === selectedTutor)) {
      setError("Select a tutor to assign this query to.");
      return;
    }
    void mutate("assign", () => assignFeedbackQuery(query.id, { tutorProfileId: selectedTutor }));
  }

  return (
    <FormDialog open title={query.subject} description="Private conversation with the centre about this student." onOpenChange={(open) => { if (!open) close(); }}>
      <div aria-busy={busy !== null} className="max-h-[65dvh] space-y-6 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
        {error && <ErrorNotice message={error} />}
        <section aria-label="Query details" className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm font-semibold text-slate-900">{query.studentFirstName} {query.studentLastName}</p>
            <span className={"rounded-full px-3 py-1 text-xs font-semibold " + (isResolved ? "bg-emerald-100 text-emerald-800" : "bg-white text-orange-800")}>
              {query.status === "awaiting_parent" && isStaff ? "Awaiting submitter response" : queryStatusLabels[query.status]}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 text-sm sm:grid-cols-2">
            <Detail label="Centre" value={query.centreName} />
            <Detail label="Category" value={queryCategoryLabels[query.category]} />
            <Detail label="Submitted by" value={query.openerFirstName + " " + query.openerLastName} />
            <Detail label="Opened" value={formatDate(query.createdAt)} />
            <Detail label="Assigned tutor" value={[query.assignedTutorFirstName, query.assignedTutorLastName].filter(Boolean).join(" ") || "Centre team"} />
            {query.linkedFeedbackId && <Detail label="Context" value="Follow-up to tutor session feedback" />}
            {!query.linkedFeedbackId && query.linkedSessionId && <Detail label="Context" value="Linked to a session" />}
          </dl>
          <p className="mb-0 mt-3 text-xs leading-relaxed text-slate-600">Only the person who submitted this query and authorized staff can read this conversation. Other linked parents and guardians cannot view this thread.</p>
        </section>
        {query.resolutionProposedAt && !isResolved && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
            The assigned tutor has proposed resolving this query. {canResolve ? "If your query has been answered, you can mark it as resolved." : "The submitter or centre management can mark it as resolved."}
          </div>
        )}
        {isAdmin && !isResolved && (
          <form className="space-y-3 rounded-2xl border border-slate-200 p-4" onSubmit={assignTutor}>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="query-assigned-tutor">Assign to a tutor</label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <select className={fieldClass} disabled={busy !== null || tutors.length === 0} id="query-assigned-tutor" onChange={(event) => setSelectedTutor(event.target.value)} value={selectedTutor} required>
                <option value="">Select tutor</option>
                {tutors.map((tutor) => <option key={tutor.id} value={tutor.id}>{tutor.name}</option>)}
              </select>
              <button className={secondaryButtonClass + " shrink-0"} disabled={busy !== null || !selectedTutor || selectedTutor === query.assignedTutorProfileId} type="submit">{busy === "assign" ? "Assigning…" : "Assign tutor"}</button>
            </div>
            <p className="m-0 text-xs leading-relaxed text-slate-500">{tutors.length === 0 ? "No eligible tutors are available for this query. The centre team can still respond." : query.linkedSessionSubjectId ? "Only active tutors assigned to the linked session subject can be assigned." : "Assign an active tutor from this centre when their input is needed."}</p>
          </form>
        )}
        <section aria-label="Conversation" className="space-y-4">
          <h3 className="m-0 text-base font-semibold text-slate-900">Conversation</h3>
          {messages.length === 0 ? <p className="text-sm text-slate-500">No messages are available.</p> : messages.map((message) => (
            <article key={message.id} className={"rounded-2xl border p-4 " + (message.authoredByUserId === userId ? "border-orange-200 bg-orange-50/60" : "border-slate-200 bg-white")}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="m-0 text-sm font-semibold text-slate-900">{message.authoredByUserId === userId ? "You" : (message.authorFirstName + " " + message.authorLastName).trim() || "Centre team"}</p>
                  <p className="mb-0 mt-1 text-xs capitalize text-slate-500">{message.authoredByType}</p>
                </div>
                <time className="text-xs text-slate-500" dateTime={message.createdAt}>{formatDate(message.createdAt)}</time>
              </div>
              <p className="mb-0 mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{message.messageText}</p>
            </article>
          ))}
        </section>
        {canReply && (
          <form className="space-y-3 border-t border-slate-200 pt-5" onSubmit={sendReply}>
            <label className="block text-sm font-semibold text-slate-800" htmlFor="query-reply">Reply</label>
            <textarea aria-describedby="query-reply-limit" className={fieldClass + " min-h-36 resize-y"} disabled={busy !== null} id="query-reply" onChange={(event) => setReply(event.target.value)} placeholder="Write your response to this query…" required rows={5} value={reply} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className={"m-0 text-xs " + (characterCount(reply) > feedbackQueryMessageMaximumLength ? "text-red-700" : "text-slate-500")} id="query-reply-limit">{characterCount(reply).toLocaleString()} / {feedbackQueryMessageMaximumLength.toLocaleString()} characters</p>
              <button className={primaryButtonClass} disabled={busy !== null || !reply.trim() || characterCount(reply) > feedbackQueryMessageMaximumLength} type="submit">{busy === "reply" ? "Sending…" : "Send reply"}</button>
            </div>
          </form>
        )}
        {isResolved && <p className="m-0 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">This query is resolved and its conversation is read-only. {isAdmin ? "Reopen it to continue the conversation." : "Contact centre management if this query needs to be reopened."}</p>}
        {isStaff && query.events.length > 0 && (
          <details className="rounded-2xl border border-slate-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-slate-700">Query history</summary>
            <ol className="mb-0 mt-4 list-none space-y-3 p-0">
              {[...query.events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt)).map((event) => (
                <li key={event.id} className="border-l-2 border-orange-200 pl-3 text-xs text-slate-600">
                  <p className="m-0 font-semibold text-slate-800">{eventDescription(event)}</p>
                  <p className="mb-0 mt-1">{(event.actorFirstName + " " + event.actorLastName).trim() || "Centre team"} · <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time></p>
                </li>
              ))}
            </ol>
          </details>
        )}
      </div>
      <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:flex-wrap sm:justify-end sm:px-7">
        <button className={secondaryButtonClass} disabled={busy !== null} onClick={close} type="button">Close</button>
        {isAssignedTutor && !isResolved && !query.resolutionProposedAt && <button className={secondaryButtonClass} disabled={busy !== null} onClick={() => { void mutate("propose", () => proposeFeedbackQueryResolution(query.id)); }} type="button">{busy === "propose" ? "Proposing…" : "Propose resolution"}</button>}
        {canResolve && <button className={primaryButtonClass} disabled={busy !== null} onClick={() => { void mutate("resolve", () => resolveFeedbackQuery(query.id)); }} type="button">{busy === "resolve" ? "Resolving…" : "Mark as resolved"}</button>}
        {isAdmin && isResolved && <button className={primaryButtonClass} disabled={busy !== null} onClick={() => { void mutate("reopen", () => reopenFeedbackQuery(query.id)); }} type="button">{busy === "reopen" ? "Reopening…" : "Reopen query"}</button>}
      </footer>
    </FormDialog>
  );
}

type NewQueryDialogProps = {
  open: boolean;
  participants: FeedbackStudent[];
  initialFeedback?: SessionFeedback;
  onClose: () => void;
  onCreated: (query: FeedbackQuery) => void;
};

export function NewQueryDialog(props: NewQueryDialogProps) {
  if (!props.open) return null;
  return <NewQuery key={props.initialFeedback?.id ?? "general"} {...props} />;
}

function NewQuery({ participants, initialFeedback, onClose, onCreated }: NewQueryDialogProps) {
  const [studentProfileId, setStudentProfileId] = useState(initialFeedback?.studentProfileId ?? participants[0]?.studentProfileId ?? "");
  const [category, setCategory] = useState<FeedbackQueryCategory>(initialFeedback ? "feedback_follow_up" : "academic_progress");
  const [subject, setSubject] = useState(initialFeedback ? "Feedback: " + initialFeedback.subjectName : "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const operationInProgress = useRef(false);
  const isFollowUp = category === "feedback_follow_up";
  const participant = participants.find((item) => item.studentProfileId === studentProfileId);
  const hasFollowUpParticipant = Boolean(initialFeedback && participants.some((item) => item.studentProfileId === initialFeedback.studentProfileId && item.centreId === initialFeedback.centreId));

  function close() {
    if (!operationInProgress.current) onClose();
  }

  function changeCategory(value: string) {
    if (!isFeedbackQueryCategory(value) || (value === "feedback_follow_up" && !initialFeedback)) return;
    setCategory(value);
    if (value === "feedback_follow_up" && initialFeedback) setStudentProfileId(initialFeedback.studentProfileId);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (operationInProgress.current) return;
    setError(null);
    const normalizedSubject = normalizeRequiredText(subject, feedbackQuerySubjectMaximumLength);
    const messageText = normalizeRequiredText(message, feedbackQueryMessageMaximumLength);
    if (!participant) {
      setError("Select an eligible student for this query.");
      return;
    }
    if (isFollowUp && (!initialFeedback || !hasFollowUpParticipant || participant.studentProfileId !== initialFeedback.studentProfileId || participant.centreId !== initialFeedback.centreId)) {
      setError("The selected feedback must belong to this student and centre.");
      return;
    }
    if (!normalizedSubject) {
      setError("Enter a subject of 1–160 characters.");
      return;
    }
    if (!messageText) {
      setError("Enter a message of 1–7,500 characters.");
      return;
    }
    operationInProgress.current = true;
    setBusy(true);
    let created: FeedbackQuery | undefined;
    try {
      created = await createFeedbackQuery({
        studentProfileId: participant.studentProfileId,
        category,
        subject: normalizedSubject,
        messageText,
        ...(isFollowUp && initialFeedback ? {
          linkedFeedbackId: initialFeedback.id,
          linkedSessionBookingId: initialFeedback.sessionBookingId,
          linkedSessionId: initialFeedback.sessionId,
          linkedSessionSubjectId: initialFeedback.sessionSubjectId,
        } : {}),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your query could not be sent. Your message has been retained.");
    } finally {
      operationInProgress.current = false;
      setBusy(false);
    }
    if (created) {
      onCreated(created);
      onClose();
    }
  }

  return (
    <FormDialog open title={isFollowUp ? "Ask about this feedback" : "Send a query to the centre"} description="Ask for information or support about a student. Your query is handled privately by the centre team." onOpenChange={(open) => { if (!open) close(); }}>
      <form aria-busy={busy} onSubmit={submit}>
        <div className="max-h-[65dvh] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {error && <ErrorNotice message={error} />}
          {participants.length === 0 && <ErrorNotice message="No eligible students are available. Please contact your centre administrator." />}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800" htmlFor="new-query-student">Student</label>
              <select className={fieldClass} disabled={busy || isFollowUp || participants.length === 0} id="new-query-student" onChange={(event) => setStudentProfileId(event.target.value)} required value={studentProfileId}>
                <option value="">Select student</option>
                {participants.map((item) => <option key={item.studentProfileId} value={item.studentProfileId}>{item.firstName} {item.lastName} · {item.centreName}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800" htmlFor="new-query-category">Category</label>
              <select className={fieldClass} disabled={busy} id="new-query-category" onChange={(event) => changeCategory(event.target.value)} value={category}>
                {feedbackQueryCategories.filter((item) => item !== "feedback_follow_up" || initialFeedback).map((item) => <option key={item} value={item}>{queryCategoryLabels[item]}</option>)}
              </select>
            </div>
          </div>
          {participant && <p className="m-0 rounded-xl border border-orange-100 bg-orange-50 p-3 text-sm text-slate-700">Your query will be sent to <strong>{participant.centreName}</strong>.</p>}
          {isFollowUp && initialFeedback && <p className="m-0 rounded-xl border border-slate-200 p-3 text-sm text-slate-600">Following up on <strong>{initialFeedback.subjectName}</strong> feedback for {initialFeedback.studentFirstName} {initialFeedback.studentLastName}, session {formatDate(initialFeedback.sessionStartsAt)}.</p>}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800" htmlFor="new-query-subject">Subject</label>
            <input aria-describedby="new-query-subject-limit" className={fieldClass} disabled={busy} id="new-query-subject" onChange={(event) => setSubject(event.target.value)} placeholder="What would you like help with?" required type="text" value={subject} />
            <p className={"m-0 text-xs " + (characterCount(subject) > feedbackQuerySubjectMaximumLength ? "text-red-700" : "text-slate-500")} id="new-query-subject-limit">{characterCount(subject)} / {feedbackQuerySubjectMaximumLength} characters</p>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800" htmlFor="new-query-message">Message</label>
            <textarea aria-describedby="new-query-message-limit" className={fieldClass + " min-h-44 resize-y"} disabled={busy} id="new-query-message" onChange={(event) => setMessage(event.target.value)} placeholder="Describe your question or the information you need. Include any details that will help the centre team respond." required rows={7} value={message} />
            <p className={"m-0 text-xs " + (characterCount(message) > feedbackQueryMessageMaximumLength ? "text-red-700" : "text-slate-500")} id="new-query-message-limit">{characterCount(message).toLocaleString()} / {feedbackQueryMessageMaximumLength.toLocaleString()} characters</p>
          </div>
          <p className="m-0 text-xs leading-relaxed text-slate-500">Replies and updates appear in Feedback & Queries and your in-app notifications. This private thread is visible to you and authorized staff; it is not shared with other guardians.</p>
        </div>
        <footer className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <button className={secondaryButtonClass} disabled={busy} onClick={close} type="button">Cancel</button>
          <button className={primaryButtonClass} disabled={busy || !participant || !subject.trim() || !message.trim() || characterCount(subject) > feedbackQuerySubjectMaximumLength || characterCount(message) > feedbackQueryMessageMaximumLength || (isFollowUp && !hasFollowUpParticipant)} type="submit">{busy ? "Sending…" : "Send query"}</button>
        </footer>
      </form>
    </FormDialog>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="ml-0 mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div>;
}

function ErrorNotice({ message }: { message: string }) {
  return <p className="m-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">{message}</p>;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function eventDescription(event: FeedbackQueryEvent): string {
  switch (event.eventType) {
    case "opened": return "Query opened";
    case "assigned": return "Tutor assignment updated";
    case "replied": return "Reply added";
    case "resolution_proposed": return "Resolution proposed by tutor";
    case "resolved": return "Query resolved";
    case "reopened": return "Query reopened";
    case "status_changed": return event.newStatus ? "Status changed to " + queryStatusLabels[event.newStatus].toLowerCase() : "Status updated";
  }
}
