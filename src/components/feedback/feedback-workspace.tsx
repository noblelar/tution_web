"use client";

import { useEffect, useRef, useState } from "react";

import { SummaryStat } from "@/components/ui/summary-stat";
import { getFeedbackContext, getFeedbackQuery, getSessionFeedback, listFeedbackQueries, listSessionFeedback } from "@/lib/feedback-api";
import type { FeedbackContext, FeedbackEligibleBooking, FeedbackWorkspaceMode } from "@/lib/feedback-context-types";
import type { FeedbackQuery, SessionFeedback } from "@/lib/feedback-types";
import { feedbackButton, feedbackDate, feedbackError, feedbackInput, feedbackSecondaryButton, queryStatusLabels } from "./feedback-display";
import { NewQueryDialog, QueryThreadDialog } from "./query-dialogs";
import { SessionFeedbackDialog } from "./session-feedback-dialog";

type Scope = { centreId: string; context: FeedbackContext; feedback: SessionFeedback[]; queries: FeedbackQuery[] };
type Editor = { feedback: SessionFeedback | null; booking: FeedbackEligibleBooking | null; replacementForFeedbackId?: string };
type Tab = "feedback" | "queries" | "write";

export function FeedbackWorkspace({ audience }: { audience: FeedbackWorkspaceMode }) {
  const [access, setAccess] = useState<FeedbackContext | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [centreId, setCentreId] = useState("");
  const [tab, setTab] = useState<Tab>("feedback");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [query, setQuery] = useState<FeedbackQuery | null>(null);
  const [newQuery, setNewQuery] = useState<{ feedback?: SessionFeedback } | null>(null);
  const detailGeneration = useRef(0);
  const openingRequest = useRef(false);
  const initializedLocation = useRef(false);

  useEffect(() => () => { detailGeneration.current += 1; }, []);

  useEffect(() => {
    let active = true;
    async function loadAccess() {
      try {
        const context = await getFeedbackContext();
        if (!active) return;
        const location = new URLSearchParams(window.location.search);
        const requestedCentre = location.get("centreId");
        setAccess(context);
        setCentreId((current) => context.centres.some((centre) => centre.id === current) ? current : (context.centres.find((centre) => centre.id === requestedCentre)?.id ?? context.centres[0]?.id ?? ""));
        if (!initializedLocation.current) {
          initializedLocation.current = true;
          if (location.get("tab") === "queries") setTab("queries");
        }
        if (!context.centres.length) setLoading(false);
      } catch (caught) {
        if (active) { setError(feedbackError(caught, "Feedback access could not be loaded.")); setLoading(false); }
      }
    }
    void loadAccess();
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!centreId) return;
    let active = true;
    async function loadScope() {
      setLoading(true);
      setError("");
      try {
        const [context, feedback, queries] = await Promise.all([
          getFeedbackContext(centreId), listSessionFeedback(centreId), listFeedbackQueries(centreId),
        ]);
        if (active) setScope({ centreId, context, feedback: feedback.feedback, queries: queries.queries });
      } catch (caught) {
        if (active) { setScope(null); setError(feedbackError(caught, "This feedback workspace could not be loaded.")); }
      } finally { if (active) setLoading(false); }
    }
    void loadScope();
    return () => { active = false; };
  }, [centreId, attempt]);

  const current = scope?.centreId === centreId ? scope : null;
  const context = current?.context ?? access;
  const mode = context?.viewer === "admin" ? "admin" : context?.viewer === "tutor" ? "tutor" : audience === "student" ? "student" : "parent";
  const isHousehold = context?.viewer === "household";
  const centre = context?.centres.find((item) => item.id === centreId) ?? access?.centres.find((item) => item.id === centreId);
  const participants = (context?.students ?? []).filter((student) => student.centreId === centreId);
  const feedback = current?.feedback ?? [];
  const queries = current?.queries ?? [];
  const eligibleBookings = current?.context.eligibleBookings ?? [];
  const writableBookings = eligibleBookings.filter((booking) => !feedback.some((item) => item.sessionBookingId === booking.sessionBookingId && item.status !== "withdrawn"));
  const searchText = search.trim().toLocaleLowerCase();
  const shownFeedback = feedback.filter((item) =>
    (status === "all" || item.status === status) && `${item.studentFirstName} ${item.studentLastName} ${item.studentPeopleCode} ${item.subjectName} ${item.tutorFirstName} ${item.tutorLastName}`.toLocaleLowerCase().includes(searchText),
  );
  const shownQueries = queries.filter((item) =>
    (status === "all" || item.status === status) && `${item.subject} ${item.studentFirstName} ${item.studentLastName} ${item.studentPeopleCode} ${item.openerFirstName} ${item.openerLastName}`.toLocaleLowerCase().includes(searchText),
  );
  const shownBookings = writableBookings.filter((item) => `${item.studentFirstName} ${item.studentLastName} ${item.studentPeopleCode} ${item.subjectName}`.toLocaleLowerCase().includes(searchText));

  function switchTab(next: Tab) { setTab(next); setStatus("all"); setSearch(""); }

  function feedbackChanged(value: SessionFeedback) {
    if (value.centreId !== centreId) return;
    setScope((previous) => previous?.centreId === value.centreId ? { ...previous, feedback: [value, ...previous.feedback.filter((item) => item.id !== value.id)] } : previous);
    setNotice(value.status === "published" ? "Feedback published to the household." : value.status === "withdrawn" ? "Feedback withdrawn. Its staff history is retained." : "Feedback draft saved.");
  }

  function queryChanged(value: FeedbackQuery) {
    if (value.centreId !== centreId) return;
    setScope((previous) => previous?.centreId === value.centreId ? { ...previous, queries: [value, ...previous.queries.filter((item) => item.id !== value.id)] } : previous);
    setQuery(value);
  }

  async function openFeedback(item: SessionFeedback) {
    if (openingRequest.current) return;
    openingRequest.current = true;
    const generation = ++detailGeneration.current;
    setOpening(item.id); setError("");
    try {
      const detail = await getSessionFeedback(item.id);
      if (generation !== detailGeneration.current) return;
      setEditor({ feedback: detail, booking: eligibleBookings.find((booking) => booking.sessionBookingId === detail.sessionBookingId) ?? null });
    } catch (caught) { if (generation === detailGeneration.current) setError(feedbackError(caught, "Feedback could not be opened.")); }
    finally { if (generation === detailGeneration.current) { openingRequest.current = false; setOpening(""); } }
  }

  async function openQuery(item: FeedbackQuery) {
    if (openingRequest.current) return;
    openingRequest.current = true;
    const generation = ++detailGeneration.current;
    setOpening(item.id); setError("");
    try { const detail = await getFeedbackQuery(item.id); if (generation === detailGeneration.current) setQuery(detail); }
    catch (caught) { if (generation === detailGeneration.current) setError(feedbackError(caught, "The query could not be opened.")); }
    finally { if (generation === detailGeneration.current) { openingRequest.current = false; setOpening(""); } }
  }

  function writeFeedback(booking: FeedbackEligibleBooking) {
    const withdrawn = feedback.filter((item) => item.sessionBookingId === booking.sessionBookingId && item.status === "withdrawn")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    setEditor({ feedback: null, booking, replacementForFeedbackId: withdrawn?.id });
  }

  const assignmentTutors = (current?.context.assignmentTutors ?? []).filter((tutor) => !query?.linkedSessionSubjectId || tutor.assignedSessionSubjectIds.includes(query.linkedSessionSubjectId));
  const showWriting = Boolean(context?.tutorProfileId);
  const dialogOpen = Boolean(editor || query || newQuery);

  function changeCentre(value: string) {
    detailGeneration.current += 1;
    openingRequest.current = false;
    setOpening(""); setEditor(null); setQuery(null); setNewQuery(null);
    setCentreId(value); setScope(null); setStatus("all"); setSearch(""); setNotice("");
  }

  return (
    <main className="management-shell">
      {mode === "admin" ? null : <header className="management-header">
        <div><p className="eyebrow">{mode === "tutor" ? "Tutor workspace" : "Your tuition centre"}</p><h1>Feedback &amp; Queries</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">{mode === "tutor" ? "Share feedback after attendance and respond to queries assigned to you." : "Read tutor feedback and ask your centre about learning, sessions, bookings, or attendance."}</p></div>
      </header>}

      <div className="grid gap-5">
        {mode === "admin" ? <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <h2 className="text-lg font-black tracking-tight text-slate-950">Feedback &amp; Queries</h2>
          {!loading && current ? <dl className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Feedback summary">
            <SummaryStat label="Published feedback" value={feedback.filter((item) => item.status === "published").length} tooltip="Feedback shared with households" />
            <SummaryStat label="Active centre queries" value={queries.filter((item) => item.status !== "resolved").length} tooltip="Queries not yet resolved" />
            <SummaryStat label="Resolved queries" value={queries.filter((item) => item.status === "resolved").length} tooltip="Queries marked resolved" />
          </dl> : null}
          {access?.centres.length ? <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="feedback-centre">Centre<select className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100" disabled={dialogOpen || Boolean(opening)} id="feedback-centre" onChange={(event) => changeCentre(event.target.value)} value={centreId}>{access.centres.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label> : null}
        </section> : null}
        {error ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4" role="alert"><p className="text-sm text-red-800">{error}</p><button className={feedbackSecondaryButton} disabled={loading || dialogOpen || Boolean(opening)} onClick={() => { setError(""); setAttempt((value) => value + 1); }} type="button">Try again</button></div> : null}
        {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{notice}</p> : null}

        {access?.centres.length && mode !== "admin" ? <section className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div><h2 className="text-lg font-bold text-slate-900">{isHousehold ? "Your feedback and enquiries" : "Centre workspace"}</h2><p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">{isHousehold ? "Feedback is shared with linked guardians. A query is private to its submitter and the staff handling it." : "Records and actions reflect your current centre and subject assignments."}</p></div>
          <label className="grid w-full gap-2 text-sm font-bold text-slate-700 sm:w-72" htmlFor="feedback-centre">Centre<select className={feedbackInput} disabled={dialogOpen || Boolean(opening)} id="feedback-centre" onChange={(event) => changeCentre(event.target.value)} value={centreId}>{access.centres.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.code})</option>)}</select></label>
        </section> : null}

        {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500" role="status">Loading feedback and queries…</p> : null}
        {!loading && !error && access && !access.centres.length ? <EmptyState title="No feedback centre is available" description={audience === "student" ? "Ask your centre to enable the permission to manage your own bookings. This permission also enables feedback and queries." : "Your account needs an active centre assignment or a linked student to access this area."} /> : null}

        {!loading && current ? <>
          {mode === "admin" ? null : <section className="grid gap-3 sm:grid-cols-3" aria-label="Feedback overview">
            <Metric label="Published feedback" value={feedback.filter((item) => item.status === "published").length} />
            <Metric label="Active queries" value={queries.filter((item) => item.status !== "resolved").length} />
            <Metric label={showWriting ? "Attended bookings awaiting feedback" : "Resolved queries"} value={showWriting ? writableBookings.length : queries.filter((item) => item.status === "resolved").length} />
          </section>}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4 sm:px-5">
              <div className="flex flex-wrap gap-2" aria-label="Feedback views">{(["feedback", "queries", ...(showWriting ? ["write"] : [])] as Tab[]).map((item) => <button aria-pressed={tab === item} className={tab === item ? feedbackButton : feedbackSecondaryButton} key={item} onClick={() => switchTab(item)} type="button">{item === "feedback" ? "Session feedback" : item === "queries" ? (mode === "admin" ? "Centre inbox" : "Queries") : "Write feedback"}</button>)}</div>
              <div className="flex gap-2"><button className={feedbackSecondaryButton} disabled={dialogOpen || Boolean(opening)} onClick={() => setAttempt((value) => value + 1)} type="button">Refresh</button>{isHousehold && participants.length ? <button className={feedbackButton} disabled={dialogOpen || Boolean(opening)} onClick={() => setNewQuery({})} type="button">New query</button> : null}</div>
            </div>
            <div className="grid gap-4 border-b border-slate-100 p-4 sm:grid-cols-[minmax(0,1fr)_14rem] sm:p-5">
              <label className="grid gap-2 text-xs font-bold text-slate-600" htmlFor="feedback-search">Search<input className={feedbackInput} id="feedback-search" onChange={(event) => setSearch(event.target.value)} placeholder={tab === "queries" ? "Subject, student, or submitter" : "Student, people code, or subject"} type="search" value={search} /></label>
              {tab !== "write" ? <label className="grid gap-2 text-xs font-bold text-slate-600" htmlFor="feedback-status">Status<select className={feedbackInput} id="feedback-status" onChange={(event) => setStatus(event.target.value)} value={status}><option value="all">All statuses</option>{tab === "feedback" ? <>{!isHousehold ? <option value="draft">Draft</option> : null}<option value="published">Published</option><option value="withdrawn">Withdrawn</option></> : Object.entries(queryStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label> : null}
            </div>
            <div className="space-y-4 p-4 sm:p-5">
              {tab === "feedback" ? shownFeedback.length ? shownFeedback.map((item) => <article className="rounded-xl border border-slate-200 p-4 sm:p-5" key={item.id}>
                <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-600">{item.subjectName}</p><h3 className="mt-1 text-base font-bold text-slate-900">{item.studentFirstName} {item.studentLastName}</h3><p className="mt-1 text-xs text-slate-500">{item.studentPeopleCode} · {feedbackDate(item.sessionStartsAt, centre?.timeZone)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "published" ? "bg-emerald-50 text-emerald-800" : item.status === "withdrawn" ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{item.status === "draft" ? "Draft" : item.status === "published" ? "Published" : "Withdrawn"}</span></div>
                <p className="mt-3 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">{item.status === "withdrawn" && isHousehold ? "This feedback was withdrawn. Its original text is no longer available." : item.feedbackText}</p>
                <div className="mt-4 flex flex-wrap gap-2"><button className={feedbackSecondaryButton} disabled={Boolean(opening)} onClick={() => void openFeedback(item)} type="button">{opening === item.id ? "Opening…" : item.status === "draft" && item.authoredByUserId === context?.actorUserId && eligibleBookings.some((booking) => booking.sessionBookingId === item.sessionBookingId) ? "Continue draft" : "View feedback"}</button>{isHousehold && participants.some((student) => student.studentProfileId === item.studentProfileId) ? <button className={feedbackSecondaryButton} onClick={() => setNewQuery({ feedback: item })} type="button">Ask about this feedback</button> : null}</div>
              </article>) : <EmptyState title="No session feedback found" description={isHousehold ? "Published tutor feedback and withdrawal notices will appear here." : "Optional tutor feedback appears after an attended booking has been reviewed."} /> : null}

              {tab === "queries" ? shownQueries.length ? shownQueries.map((item) => <article className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:p-5" key={item.id}><div className="min-w-0 flex-1"><h3 className="break-words text-base font-bold text-slate-900">{item.subject}</h3><p className="mt-1 text-sm text-slate-600">{item.studentFirstName} {item.studentLastName} · {item.studentPeopleCode}</p><p className="mt-2 text-xs leading-5 text-slate-500">From {item.openerFirstName} {item.openerLastName} · Updated {feedbackDate(item.lastMessageAt, centre?.timeZone)}</p><p className="mt-1 text-xs text-slate-500">{item.assignedTutorProfileId ? `Assigned to ${item.assignedTutorFirstName ?? ""} ${item.assignedTutorLastName ?? ""}` : "With the centre inbox"}</p></div><div className="flex flex-col items-end gap-3"><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status === "resolved" ? "bg-emerald-50 text-emerald-800" : "bg-orange-50 text-orange-800"}`}>{queryStatusLabels[item.status]}</span><button className={feedbackSecondaryButton} disabled={Boolean(opening)} onClick={() => void openQuery(item)} type="button">{opening === item.id ? "Opening…" : "Open query"}</button></div></article>) : <EmptyState title="No queries found" description={mode === "tutor" ? "Queries appear here when the centre assigns them to you." : isHousehold ? "Start a private query using New query, or follow up from a feedback record." : "New household enquiries will arrive in this centre inbox."} /> : null}

              {tab === "write" ? shownBookings.length ? shownBookings.map((booking) => <article className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 p-4 sm:p-5" key={booking.sessionBookingId}><div><h3 className="text-base font-bold text-slate-900">{booking.studentFirstName} {booking.studentLastName}</h3><p className="mt-1 text-sm text-slate-600">{booking.subjectName} · {booking.studentPeopleCode}</p><p className="mt-2 text-xs text-slate-500">{feedbackDate(booking.sessionStartsAt, centre?.timeZone)} · {booking.attendanceStatus === "late" ? "Late" : "Present"}</p><p className="mt-1 text-xs text-slate-500">{feedback.some((item) => item.sessionBookingId === booking.sessionBookingId && item.status === "withdrawn") ? "Replacement feedback available" : "Feedback is optional"}</p></div><button className={feedbackButton} onClick={() => writeFeedback(booking)} type="button">Write feedback</button></article>) : <EmptyState title="No attended bookings awaiting feedback" description="A booking appears here after present or late attendance is recorded for a subject currently assigned to you. Continue existing drafts in Session feedback." /> : null}
            </div>
          </section>
        </> : null}
      </div>

      {editor ? <SessionFeedbackDialog booking={editor.booking} canWrite={Boolean(editor.booking)} feedback={editor.feedback} key={editor.feedback?.id ?? editor.booking?.sessionBookingId} mode={mode} onChanged={feedbackChanged} onClose={() => setEditor(null)} replacementForFeedbackId={editor.replacementForFeedbackId} timeZone={centre?.timeZone} userId={context?.actorUserId ?? ""} /> : null}
      {query ? <QueryThreadDialog key={query.id} mode={mode} onChanged={queryChanged} onClose={() => setQuery(null)} query={query} tutors={assignmentTutors} userId={context?.actorUserId ?? ""} /> : null}
      {newQuery ? <NewQueryDialog initialFeedback={newQuery.feedback} key={newQuery.feedback?.id ?? "new-query"} onClose={() => setNewQuery(null)} onCreated={(value) => { queryChanged(value); setNewQuery(null); setTab("queries"); setStatus("all"); setNotice("Your query was sent to the centre inbox."); }} open participants={participants} /> : null}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p></div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-xl bg-slate-50 p-6 text-center sm:p-10"><h3 className="text-base font-bold text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div>;
}
