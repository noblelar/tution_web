"use client";

import { type FormEvent, useRef, useState } from "react";

import { FeedbackDialog as FormDialog } from "./feedback-dialog";
import { createSessionFeedback, publishSessionFeedback, saveSessionFeedbackRevision, withdrawSessionFeedback } from "@/lib/feedback-api";
import type { FeedbackEligibleBooking, FeedbackWorkspaceMode } from "@/lib/feedback-context-types";
import { characterCount, feedbackMaximumLength, normalizeRequiredText } from "@/lib/feedback-rules";
import type { SessionFeedback } from "@/lib/feedback-types";
import { feedbackButton, feedbackDate, feedbackError, feedbackInput, feedbackSecondaryButton } from "./feedback-display";

type Props = {
  feedback: SessionFeedback | null;
  booking: FeedbackEligibleBooking | null;
  mode: FeedbackWorkspaceMode;
  userId: string;
  timeZone?: string;
  canWrite: boolean;
  replacementForFeedbackId?: string;
  onClose: () => void;
  onChanged: (feedback: SessionFeedback) => void;
};

const writingGuide = "Write a parent-facing passage covering the topic studied, engagement, strengths, areas to improve, homework, recommended next steps, and any helpful general comment.";

export function SessionFeedbackDialog({ feedback, booking, mode, userId, timeZone, canWrite, replacementForFeedbackId, onClose, onChanged }: Props) {
  const [record, setRecord] = useState(feedback);
  const [text, setText] = useState(feedback?.feedbackText ?? "");
  const [pending, setPending] = useState(false);
  const [confirmWithdrawal, setConfirmWithdrawal] = useState(false);
  const [error, setError] = useState("");
  const operationInProgress = useRef(false);
  const isStaff = mode === "admin" || mode === "tutor";
  const editable = canWrite && (!record || (record.status === "draft" && record.authoredByUserId === userId));
  const canWithdraw = record?.status === "published" && (mode === "admin" || (mode === "tutor" && record.authoredByUserId === userId));
  const name = record ? `${record.studentFirstName} ${record.studentLastName}` : `${booking?.studentFirstName ?? ""} ${booking?.studentLastName ?? ""}`;
  const subject = record?.subjectName ?? booking?.subjectName ?? "Session";
  const startsAt = record?.sessionStartsAt ?? booking?.sessionStartsAt ?? "";
  const count = characterCount(text);

  async function save(publish: boolean) {
    const normalized = normalizeRequiredText(text, feedbackMaximumLength);
    if (!normalized || !editable || operationInProgress.current) return;
    operationInProgress.current = true;
    setPending(true);
    setError("");
    let committed: SessionFeedback | null = null;
    let completed = false;
    try {
      let saved = record;
      if (!saved) {
        if (!booking) throw new Error("Choose an attended booking first.");
        saved = await createSessionFeedback({ sessionBookingId: booking.sessionBookingId, feedbackText: normalized, replacementForFeedbackId });
      } else if (normalized !== saved.feedbackText) {
        saved = await saveSessionFeedbackRevision(saved.id, { feedbackText: normalized });
      }
      // Retain a committed draft if publication fails; retry must not recreate it.
      setRecord(saved);
      committed = saved;
      if (publish) {
        const published = await publishSessionFeedback(saved.id);
        setRecord(published);
        committed = published;
      }
      completed = true;
    } catch (caught) {
      setError(feedbackError(caught, "Feedback could not be saved. Refresh before retrying if the result is uncertain."));
    } finally {
      operationInProgress.current = false;
      setPending(false);
    }
    if (committed) onChanged(committed);
    if (completed) onClose();
  }

  async function withdraw() {
    if (!record || !canWithdraw || operationInProgress.current) return;
    operationInProgress.current = true;
    setPending(true);
    setError("");
    let withdrawn: SessionFeedback | null = null;
    try {
      withdrawn = await withdrawSessionFeedback(record.id);
    } catch (caught) {
      setError(feedbackError(caught, "Feedback could not be withdrawn."));
    } finally { operationInProgress.current = false; setPending(false); }
    if (withdrawn) { onChanged(withdrawn); onClose(); }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(true);
  }

  return (
    <FormDialog open title={editable ? (record ? "Edit feedback draft" : "Write session feedback") : "Session feedback"} description={`${name} · ${subject} · ${feedbackDate(startsAt, timeZone)}`} onOpenChange={(open) => { if (!open && !operationInProgress.current) onClose(); }}>
      <div className="space-y-5 p-5 sm:p-6">
        {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{error}</p> : null}
        {record?.status === "withdrawn" ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">This feedback was withdrawn{record.withdrawnAt ? ` on ${feedbackDate(record.withdrawnAt, timeZone)}` : ""}.{isStaff ? " The original content is retained below for staff review." : " Its original content is no longer available. A tutor may publish replacement feedback."}</p> : null}
        {editable ? (
          <form className="space-y-5" onSubmit={submit}>
            {booking?.lessonFocus ? <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Requested lesson focus</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{booking.lessonFocus}</p></div> : null}
            <label className="grid gap-2 text-sm font-bold text-slate-800" htmlFor="session-feedback-text">Feedback for the household
              <textarea autoFocus className={`${feedbackInput} min-h-64 resize-y font-normal leading-6`} disabled={pending} id="session-feedback-text" onChange={(event) => setText(event.target.value)} placeholder={writingGuide} required rows={10} value={text} aria-describedby="session-feedback-guide session-feedback-count" />
            </label>
            <p className="text-xs leading-5 text-slate-500" id="session-feedback-guide">{writingGuide} Saving keeps a private draft. Publishing shares it with all linked parents and eligible students. Published text cannot be edited.</p>
            <p className={`text-right text-xs ${count > feedbackMaximumLength ? "text-red-700" : "text-slate-500"}`} id="session-feedback-count">{count.toLocaleString()} / 7,500 characters</p>
            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              <button className={feedbackSecondaryButton} disabled={pending} onClick={onClose} type="button">Cancel</button>
              <button className={feedbackSecondaryButton} disabled={pending || !text.trim() || count > feedbackMaximumLength} onClick={() => void save(false)} type="button">{pending ? "Saving…" : "Save draft"}</button>
              <button className={feedbackButton} disabled={pending || !text.trim() || count > feedbackMaximumLength} type="submit">{pending ? "Saving…" : "Publish feedback"}</button>
            </footer>
          </form>
        ) : (
          <>
            {record && (record.status !== "withdrawn" || isStaff) ? <>
              <p className="text-xs font-semibold text-slate-500">By {record.tutorFirstName} {record.tutorLastName} · {record.status === "draft" ? "Private draft" : record.status === "withdrawn" ? "Withdrawn publication" : "Published"}</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{record.feedbackText ?? "No feedback text is available."}</p>
            </> : null}
            <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
              <button className={feedbackSecondaryButton} disabled={pending} onClick={onClose} type="button">Close</button>
              {canWithdraw ? <button className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-bold text-red-700 disabled:opacity-50" disabled={pending} onClick={() => setConfirmWithdrawal((current) => !current)} type="button">Withdraw feedback</button> : null}
            </footer>
            {confirmWithdrawal ? <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm leading-6 text-red-900">Withdraw this publication? The household will see a withdrawal notice. Staff retain the original and its history. No reason is required.</p><button className={feedbackButton} disabled={pending} onClick={() => void withdraw()} type="button">{pending ? "Withdrawing…" : "Confirm withdrawal"}</button></div> : null}
          </>
        )}
        {isStaff && (record?.revisions.length ?? 0) > 0 ? <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer text-sm font-bold text-slate-700">Retained revision history ({record?.revisions.length})</summary><div className="mt-4 space-y-4">{record?.revisions.map((revision) => <article className="border-t border-slate-100 pt-3" key={revision.id}><p className="text-xs font-bold text-slate-500">Revision {revision.revisionNumber} · {feedbackDate(revision.createdAt, timeZone)}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{revision.feedbackText}</p></article>)}</div></details> : null}
      </div>
    </FormDialog>
  );
}
