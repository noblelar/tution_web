"use client";

import { useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Icon } from "@/components/dashboard";
import {
  createStudentNote,
  deleteStudentNote,
  getStudentNoteHistory,
  getStudentNotesContext,
  listStudentNotes,
  StudentNotesApiError,
  updateStudentNote,
} from "@/lib/student-notes-api";
import { studentNoteTextMaximumLength } from "@/lib/student-notes-rules";
import { dispatchStudentNotesUpdated, dispatchStudentPromptRefresh } from "@/lib/student-notes-events";
import type {
  SaveStudentLearningNoteInput,
  StudentLearningNote,
  StudentLearningNoteRevision,
  StudentNoteListFilters,
  StudentNotesContext,
  StudentNoteSubject,
  StudentNoteUnderstandingLevel,
} from "@/lib/student-notes-types";

import { NoteDialog } from "./note-dialog";

type FilterDraft = { subject: "" | StudentNoteSubject; from: string; through: string; search: string };

const emptyFilters: FilterDraft = { subject: "", from: "", through: "", search: "" };
const subjectLabels: Record<StudentNoteSubject, string> = { english: "English", maths: "Maths", science: "Science" };
const subjectStyles: Record<StudentNoteSubject, string> = {
  english: "border-amber-200 bg-amber-50 text-amber-800",
  maths: "border-sky-200 bg-sky-50 text-sky-800",
  science: "border-emerald-200 bg-emerald-50 text-emerald-800",
};
const understandingLabels: Record<StudentNoteUnderstandingLevel, string> = {
  understood_everything: "I understood everything",
  understood_most: "I understood most of it",
  need_some_help: "I need some help",
  did_not_understand: "I did not understand it yet",
};

export function NotesView() {
  const searchParams = useSearchParams();
  const [notes, setNotes] = useState<StudentLearningNote[]>([]);
  const [context, setContext] = useState<StudentNotesContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filterDraft, setFilterDraft] = useState<FilterDraft>(emptyFilters);
  const [activeFilters, setActiveFilters] = useState<StudentNoteListFilters>({});
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<StudentLearningNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<StudentLearningNote | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [historyNote, setHistoryNote] = useState<StudentLearningNote | null>(null);
  const [history, setHistory] = useState<StudentLearningNoteRevision[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const handledRecordRequest = useRef("");
  const promptOpenedEditor = useRef(false);

  const refreshWorkspace = useCallback(async (filters: StudentNoteListFilters, initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setLoadError("");
    try {
      const [nextContext, nextNotes] = await Promise.all([getStudentNotesContext(), listStudentNotes(filters)]);
      setContext(nextContext);
      setNotes(nextNotes.notes);
    } catch (caught) {
      setLoadError(apiErrorMessage(caught, "Your learning notes could not be loaded right now."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void refreshWorkspace({}, true); }, [refreshWorkspace]);

  useEffect(() => {
    if (searchParams.get("record") !== "1") {
      handledRecordRequest.current = "";
      return;
    }
    if (!context) return;
    const requestKey = searchParams.toString();
    if (handledRecordRequest.current === requestKey) return;

    handledRecordRequest.current = requestKey;
    promptOpenedEditor.current = Boolean(searchParams.get("prompt")?.trim());
    setEditingNote(null);
    setEditorOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("record");
    url.searchParams.delete("prompt");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [context, searchParams]);

  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).filter((value) => value !== undefined && value !== "").length,
    [activeFilters],
  );

  function openCreate() { setEditingNote(null); setEditorOpen(true); }
  function openEdit(note: StudentLearningNote) { setEditingNote(note); setEditorOpen(true); }

  async function saveNote(input: SaveStudentLearningNoteInput) {
    if (editingNote) await updateStudentNote(editingNote.id, input);
    else await createStudentNote(input);
    promptOpenedEditor.current = false;
    setEditorOpen(false);
    setEditingNote(null);
    await refreshWorkspace(activeFilters);
    dispatchStudentNotesUpdated();
  }

  function applyFilters() {
    const filters: StudentNoteListFilters = {
      ...(filterDraft.subject ? { subject: filterDraft.subject } : {}),
      ...(filterDraft.from ? { from: filterDraft.from } : {}),
      ...(filterDraft.through ? { through: filterDraft.through } : {}),
      ...(filterDraft.search.trim() ? { search: filterDraft.search.trim() } : {}),
    };
    setActiveFilters(filters);
    void refreshWorkspace(filters);
  }

  function clearFilters() {
    setFilterDraft(emptyFilters);
    setActiveFilters({});
    void refreshWorkspace({});
  }

  async function confirmDelete() {
    if (!deletingNote) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteStudentNote(deletingNote.id);
      setDeletingNote(null);
      await refreshWorkspace(activeFilters);
      dispatchStudentNotesUpdated();
    } catch (caught) {
      setDeleteError(apiErrorMessage(caught, "Your reflection could not be deleted."));
    } finally {
      setDeleting(false);
    }
  }

  async function openHistory(note: StudentLearningNote) {
    setHistoryNote(note);
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const result = await getStudentNoteHistory(note.id);
      setHistory(result.revisions);
    } catch (caught) {
      setHistoryError(apiErrorMessage(caught, "Your note history could not be loaded."));
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8" aria-labelledby="student-notes-title">
      <section className="overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm">
        <div className="grid gap-6 px-5 py-7 sm:px-8 sm:py-9 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-700"><Icon name="book" size={15} /> Private learning journal</span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl" id="student-notes-title">What did you learn today?</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">Have you learnt any English, Maths, or Science today? Record what made sense and what you would like to revisit during tuition.</p>
          </div>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none" disabled={loading || !context || context.remainingToday < 1} onClick={openCreate} type="button"><Icon name="plus" size={18} /> Record today&apos;s learning</button>
        </div>
        <div className="grid border-t border-orange-100 bg-white/70 sm:grid-cols-3">
          <OverviewMetric label="Today&apos;s reflections" value={context ? `${context.activeTodayCount} of ${context.maximumDailyReflections}` : "—"} />
          <OverviewMetric label="Still available today" value={context ? String(context.remainingToday) : "—"} />
          <OverviewMetric label="Centre-local date" value={context ? formatReflectionDate(context.reflectionDate) : "—"} />
        </div>
      </section>

      {context && context.remainingToday === 0 ? <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white"><Icon name="check" size={15} /></span><div><strong className="font-bold">Today&apos;s reflections are complete.</strong><p className="mt-1 leading-6 text-emerald-800">You can still edit what you recorded or review earlier notes.</p></div></div> : null}
      {loadError ? <ErrorBanner message={loadError} onRetry={() => void refreshWorkspace(activeFilters)} /> : null}

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Filter learning notes">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_0.7fr_0.7fr_0.7fr_auto] xl:items-end">
          <label className="block text-sm font-semibold text-slate-700">Search your notes<span className="relative mt-2 block"><Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" name="search" size={17} /><input className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-3 focus:ring-orange-100" maxLength={150} onChange={(event) => setFilterDraft((current) => ({ ...current, search: event.target.value }))} placeholder="Fractions, light, vocabulary…" value={filterDraft.search} /></span></label>
          <FilterSelect value={filterDraft.subject} onChange={(subject) => setFilterDraft((current) => ({ ...current, subject }))} />
          <DateFilter label="From" value={filterDraft.from} onChange={(from) => setFilterDraft((current) => ({ ...current, from }))} />
          <DateFilter label="Through" value={filterDraft.through} onChange={(through) => setFilterDraft((current) => ({ ...current, through }))} />
          <div className="flex gap-2"><button className="min-h-11 flex-1 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 xl:flex-none" disabled={refreshing} onClick={applyFilters} type="button">Apply</button>{activeFilterCount ? <button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={clearFilters} type="button">Clear</button> : null}</div>
        </div>
      </section>

      <section className="mt-7" aria-labelledby="learning-journal-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Your private timeline</p><h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950" id="learning-journal-heading">Learning journal</h2></div><p className="text-sm text-slate-500">{refreshing ? "Refreshing…" : `${notes.length} ${notes.length === 1 ? "reflection" : "reflections"}`}</p></div>
        {loading ? <LoadingCards /> : null}
        {!loading && !notes.length && !loadError ? <EmptyNotes filtered={activeFilterCount > 0} onCreate={openCreate} canCreate={Boolean(context?.remainingToday)} /> : null}
        {!loading && notes.length ? <div className="mt-5 grid gap-4 lg:grid-cols-2">{notes.map((note) => <NoteCard key={note.id} note={note} timeZone={context?.centreTimeZone} onEdit={() => openEdit(note)} onDelete={() => { setDeleteError(""); setDeletingNote(note); }} onHistory={() => void openHistory(note)} />)}</div> : null}
      </section>

      {context ? <NoteEditorDialog key={`${editingNote?.id ?? "new"}-${editorOpen}`} context={context} note={editingNote} open={editorOpen} onOpenChange={(open) => {
        setEditorOpen(open);
        if (!open) {
          setEditingNote(null);
          if (promptOpenedEditor.current) {
            promptOpenedEditor.current = false;
            dispatchStudentPromptRefresh();
          }
        }
      }} onSave={saveNote} /> : null}
      <DeleteNoteDialog note={deletingNote} error={deleteError} deleting={deleting} onCancel={() => setDeletingNote(null)} onConfirm={() => void confirmDelete()} />
      <NoteHistoryDialog note={historyNote} revisions={history} loading={historyLoading} error={historyError} timeZone={context?.centreTimeZone} onOpenChange={(open) => { if (!open) setHistoryNote(null); }} />
    </main>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }) {
  return <div className="border-orange-100 px-5 py-4 sm:border-r sm:px-8 sm:last:border-r-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-black text-slate-950">{value}</p></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900"><p>{message}</p><button className="rounded-lg border border-red-300 bg-white px-3 py-2 font-bold text-red-800 hover:bg-red-100" onClick={onRetry} type="button">Try again</button></div>;
}

function FilterSelect({ value, onChange }: { value: FilterDraft["subject"]; onChange: (value: FilterDraft["subject"]) => void }) {
  return <label className="block text-sm font-semibold text-slate-700">Subject<select className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100" onChange={(event) => onChange(event.target.value as FilterDraft["subject"])} value={value}><option value="">All subjects</option><option value="english">English</option><option value="maths">Maths</option><option value="science">Science</option></select></label>;
}

function DateFilter({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100" onChange={(event) => onChange(event.target.value)} type="date" value={value} /></label>;
}

function NoteCard({ note, timeZone, onEdit, onDelete, onHistory }: { note: StudentLearningNote; timeZone?: string; onEdit: () => void; onDelete: () => void; onHistory: () => void }) {
  return <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-3 py-1 text-xs font-bold ${subjectStyles[note.subjectArea]}`}>{subjectLabels[note.subjectArea]}</span><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">Reflection {note.dailySequence}</span></div><time className="text-xs font-semibold text-slate-500" dateTime={note.reflectionDate}>{formatReflectionDate(note.reflectionDate)}</time></div><h3 className="mt-5 text-base font-bold text-slate-950">{understandingLabels[note.understandingLevel]}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.learnedText}</p>{note.helpText ? <div className="mt-4 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3"><p className="text-xs font-bold uppercase tracking-wide text-orange-700">What I want to revisit</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-orange-950">{note.helpText}</p></div> : null}<div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">{note.linkedSessionBookingId ? <span className="rounded-full bg-slate-100 px-2.5 py-1">Linked session</span> : null}{note.linkedFeedbackId ? <span className="rounded-full bg-slate-100 px-2.5 py-1">Linked tutor feedback</span> : null}<span className="rounded-full bg-slate-100 px-2.5 py-1">Private to you</span></div><footer className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4"><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700" onClick={onEdit} type="button">Edit</button><button className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50" onClick={onHistory} type="button">History</button><button className="rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50" onClick={onDelete} type="button">Delete</button><span className="ml-auto text-xs text-slate-400">Updated {formatDateTime(note.updatedAt, timeZone)}</span></footer></article>;
}

function LoadingCards() {
  return <div className="mt-5 grid gap-4 lg:grid-cols-2" aria-label="Loading notes">{[0, 1, 2, 3].map((item) => <div className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white p-6" key={item}><div className="h-6 w-24 rounded-full bg-slate-100" /><div className="mt-6 h-4 w-2/3 rounded bg-slate-100" /><div className="mt-3 h-4 w-full rounded bg-slate-100" /><div className="mt-2 h-4 w-5/6 rounded bg-slate-100" /></div>)}</div>;
}

function EmptyNotes({ filtered, canCreate, onCreate }: { filtered: boolean; canCreate: boolean; onCreate: () => void }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-white text-orange-600 shadow-sm"><Icon name="book" size={23} /></span><h3 className="mt-4 text-lg font-bold text-slate-900">{filtered ? "No reflections match these filters" : "Your learning journal starts here"}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{filtered ? "Clear or change the filters to find another note." : "Write down something you learned today and anything you would like a tutor to explain again."}</p>{!filtered && canCreate ? <button className="mt-5 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-700" onClick={onCreate} type="button">Record my learning</button> : null}</div>;
}

function NoteEditorDialog({ open, note, context, onOpenChange, onSave }: { open: boolean; note: StudentLearningNote | null; context: StudentNotesContext; onOpenChange: (open: boolean) => void; onSave: (input: SaveStudentLearningNoteInput) => Promise<void> }) {
  const [subjectArea, setSubjectArea] = useState<StudentNoteSubject>(note?.subjectArea ?? context.subjects[0] ?? "english");
  const [understandingLevel, setUnderstandingLevel] = useState<StudentNoteUnderstandingLevel>(note?.understandingLevel ?? "understood_everything");
  const [learnedText, setLearnedText] = useState(note?.learnedText ?? "");
  const [helpText, setHelpText] = useState(note?.helpText ?? "");
  const [linkedSessionBookingId, setLinkedSessionBookingId] = useState(note?.linkedSessionBookingId ?? "");
  const [linkedFeedbackId, setLinkedFeedbackId] = useState(note?.linkedFeedbackId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const retainedSessionMissing = Boolean(note?.linkedSessionBookingId && !context.recentSessions.some((item) => item.sessionBookingId === note.linkedSessionBookingId));
  const retainedFeedbackMissing = Boolean(note?.linkedFeedbackId && !context.publishedFeedback.some((item) => item.feedbackId === note.linkedFeedbackId));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ subjectArea, understandingLevel, learnedText, ...(helpText.trim() ? { helpText } : {}), ...(linkedSessionBookingId ? { linkedSessionBookingId } : {}), ...(linkedFeedbackId ? { linkedFeedbackId } : {}) });
    } catch (caught) {
      setError(apiErrorMessage(caught, note ? "Your reflection could not be updated." : "Your reflection could not be saved."));
    } finally { setSaving(false); }
  }

  function changeSession(nextSessionId: string) {
    setLinkedSessionBookingId(nextSessionId);
    if (linkedFeedbackId) {
      const feedback = context.publishedFeedback.find((item) => item.feedbackId === linkedFeedbackId);
      if (feedback && feedback.sessionBookingId !== nextSessionId) setLinkedFeedbackId("");
    }
  }

  function changeFeedback(nextFeedbackId: string) {
    setLinkedFeedbackId(nextFeedbackId);
    const feedback = context.publishedFeedback.find((item) => item.feedbackId === nextFeedbackId);
    if (feedback) setLinkedSessionBookingId(feedback.sessionBookingId);
  }

  return <NoteDialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }} title={note ? "Edit your reflection" : "Record today's learning"} description="Write this in your own words. Your personal note is visible only to you in this initial release."><form onSubmit={submit}><div className="space-y-6 px-5 py-6 sm:px-7">{error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}<div className="grid gap-5 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-800">Subject<select className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100" onChange={(event) => setSubjectArea(event.target.value as StudentNoteSubject)} value={subjectArea}>{context.subjects.map((subject) => <option key={subject} value={subject}>{subjectLabels[subject]}</option>)}</select></label><label className="block text-sm font-bold text-slate-800">How did it feel?<select className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100" onChange={(event) => setUnderstandingLevel(event.target.value as StudentNoteUnderstandingLevel)} value={understandingLevel}>{context.understandingLevels.map((level) => <option key={level} value={level}>{understandingLabels[level]}</option>)}</select></label></div><TextAreaField label="What did you learn?" hint="Describe the idea, method, example, or new fact that you learned." required value={learnedText} onChange={setLearnedText} /><TextAreaField label="What would you like to learn again?" hint="Optional: describe anything that still feels unclear or needs more practice." value={helpText} onChange={setHelpText} /><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5"><h3 className="font-bold text-slate-900">Connect this note to your tuition</h3><p className="mt-1 text-sm leading-6 text-slate-500">Optional. You can link one of your recent sessions or published tutor feedback.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700">Recent session<select className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100" onChange={(event) => changeSession(event.target.value)} value={linkedSessionBookingId}><option value="">No linked session</option>{retainedSessionMissing && note?.linkedSessionBookingId ? <option value={note.linkedSessionBookingId}>Previously linked session</option> : null}{context.recentSessions.map((session) => <option key={session.sessionBookingId} value={session.sessionBookingId}>{session.subjectName} · {formatDateTime(session.startsAt, context.centreTimeZone)}</option>)}</select></label><label className="block text-sm font-semibold text-slate-700">Tutor feedback<select className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-orange-500 focus:ring-3 focus:ring-orange-100" onChange={(event) => changeFeedback(event.target.value)} value={linkedFeedbackId}><option value="">No linked feedback</option>{retainedFeedbackMissing && note?.linkedFeedbackId ? <option value={note.linkedFeedbackId}>Previously linked feedback</option> : null}{context.publishedFeedback.map((feedback) => <option key={feedback.feedbackId} value={feedback.feedbackId}>{feedback.subjectName} · {feedback.tutorFirstName} {feedback.tutorLastName}</option>)}</select></label></div></div></div><footer className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-7"><button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" disabled={saving} onClick={() => onOpenChange(false)} type="button">Cancel</button><button className="min-h-11 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60" disabled={saving || !learnedText.trim()} type="submit">{saving ? "Saving…" : note ? "Save changes" : "Save reflection"}</button></footer></form></NoteDialog>;
}

function TextAreaField({ label, hint, value, required = false, onChange }: { label: string; hint: string; value: string; required?: boolean; onChange: (value: string) => void }) {
  return <label className="block text-sm font-bold text-slate-800">{label}<span className="mt-1 block text-xs font-normal leading-5 text-slate-500">{hint}</span><textarea className="mt-2 min-h-32 w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-3 focus:ring-orange-100" maxLength={studentNoteTextMaximumLength} onChange={(event) => onChange(event.target.value)} placeholder={required ? "Today I learned…" : "I would like more help with…"} required={required} value={value} /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{Array.from(value).length} / {studentNoteTextMaximumLength}</span></label>;
}

function DeleteNoteDialog({ note, error, deleting, onCancel, onConfirm }: { note: StudentLearningNote | null; error: string; deleting: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <NoteDialog open={Boolean(note)} onOpenChange={(open) => { if (!open && !deleting) onCancel(); }} size="small" title="Delete this reflection?" description="The note will disappear from your journal, but its revision history is retained securely."><div className="px-5 py-6 sm:px-7">{error ? <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}<p className="text-sm leading-6 text-slate-600">This action can free one of today&apos;s two reflection spaces when the note belongs to today.</p><div className="mt-6 flex justify-end gap-3"><button className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50" disabled={deleting} onClick={onCancel} type="button">Keep note</button><button className="min-h-11 rounded-xl bg-red-600 px-4 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-wait disabled:opacity-60" disabled={deleting} onClick={onConfirm} type="button">{deleting ? "Deleting…" : "Delete note"}</button></div></div></NoteDialog>;
}

function NoteHistoryDialog({ note, revisions, loading, error, timeZone, onOpenChange }: { note: StudentLearningNote | null; revisions: StudentLearningNoteRevision[]; loading: boolean; error: string; timeZone?: string; onOpenChange: (open: boolean) => void }) {
  return <NoteDialog open={Boolean(note)} onOpenChange={onOpenChange} title="Reflection history" description="Each saved version is retained so that changes to your learning record remain traceable."><div className="px-5 py-6 sm:px-7">{loading ? <p className="py-10 text-center text-sm text-slate-500">Loading revision history…</p> : null}{error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}{!loading && !error ? <ol className="space-y-4">{revisions.map((revision) => <li className="relative rounded-2xl border border-slate-200 p-5" key={revision.id}><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${subjectStyles[revision.subjectArea]}`}>{subjectLabels[revision.subjectArea]}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold capitalize text-slate-600">{revision.changeType}</span></div><time className="text-xs text-slate-400">{formatDateTime(revision.createdAt, timeZone)}</time></div><p className="mt-4 text-sm font-bold text-slate-900">Version {revision.revisionNumber} · {understandingLabels[revision.understandingLevel]}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{revision.learnedText}</p>{revision.helpText ? <p className="mt-3 rounded-xl bg-orange-50 px-3 py-2 text-sm leading-6 text-orange-900"><strong>Revisit:</strong> {revision.helpText}</p> : null}</li>)}</ol> : null}{!loading && !error && !revisions.length ? <p className="py-10 text-center text-sm text-slate-500">No revision history is available.</p> : null}</div></NoteDialog>;
}

function formatReflectionDate(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatDateTime(value: string, timeZone?: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timeZone || "Europe/London" }).format(date); }
  catch { return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date); }
}

function apiErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof StudentNotesApiError && caught.message.trim() ? caught.message : fallback;
}
