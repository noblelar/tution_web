"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { feedbackButton, feedbackSecondaryButton } from "@/components/feedback/feedback-display";
import { SessionSubjectEditor } from "@/components/sessions/session-subject-editor";
import { FormDialog } from "@/components/ui/form-dialog";
import { SummaryStat } from "@/components/ui/summary-stat";
import type { AcademicYear, AcademicYearList, Subject, SubjectList } from "@/lib/academic-types";
import type { CentreList, ManagedCentre } from "@/lib/centre-types";
import type { TutorProfile, TutorProfileList } from "@/lib/profile-types";
import { formatSessionDateTime, formatSessionTime, normalizeSessionSubjectSelections, toCentreInput, zonedInputToISO } from "@/lib/session-rules";
import type { SessionSubjectSelection } from "@/lib/session-rules";
import type {
  SessionGenerationResult,
  SessionList,
  SessionSubjectOffering,
  SessionTemplate,
  SessionTemplateList,
  TeachingSession,
} from "@/lib/session-types";

type ApiError = { error?: string };
type View = "sessions" | "templates";
type SessionDraft = {
  offeredSubjects: SessionSubjectSelection[];
  academicYearId: string;
  startsAt: string;
  bookingDeadlineAt: string;
  maximumCapacity: string;
};
type TemplateDraft = {
  name: string;
  offeredSubjects: SessionSubjectSelection[];
  academicYearId: string;
  dayOfWeek: string;
  startTime: string;
  maximumCapacity: string;
  bookingDeadlineMinutes: string;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";
const labelClass = "grid gap-1.5 text-sm font-semibold text-slate-800";
const secondaryButton = "rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50";
const primaryButton = "rounded-xl border border-orange-600 bg-orange-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-50";
const dangerButton = "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50";

const emptySession: SessionDraft = {
  offeredSubjects: [],
  academicYearId: "",
  startsAt: "",
  bookingDeadlineAt: "",
  maximumCapacity: "",
};
const emptyTemplate: TemplateDraft = {
  name: "",
  offeredSubjects: [],
  academicYearId: "",
  dayOfWeek: "6",
  startTime: "10:00",
  maximumCapacity: "",
  bookingDeadlineMinutes: "60",
};
function countLabel(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function SessionManagement() {
  const [view, setView] = useState<View>("sessions");
  const [centres, setCentres] = useState<ManagedCentre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [tutors, setTutors] = useState<TutorProfile[]>([]);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [sessionDraft, setSessionDraft] = useState<SessionDraft>(emptySession);
  const [templateDraft, setTemplateDraft] = useState<TemplateDraft>(emptyTemplate);
  const [editingSessionId, setEditingSessionId] = useState("");
  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [generatingTemplate, setGeneratingTemplate] = useState<SessionTemplate | null>(null);
  const [generationDates, setGenerationDates] = useState("");
  const [assigningSubject, setAssigningSubject] = useState<{ session: TeachingSession; offering: SessionSubjectOffering } | null>(null);
  const [assignedTutorIds, setAssignedTutorIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"session" | "template" | "generate" | "assign" | null>(null);
  const [expandedSessionIds, setExpandedSessionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedCentre = useMemo(() => centres.find((centre) => centre.id === centreId), [centreId, centres]);
  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.status === "active"), [subjects]);
  const usableYears = useMemo(() => academicYears.filter((year) => year.status !== "closed"), [academicYears]);
  const activeTutors = useMemo(
    () => tutors.filter((tutor) => tutor.primaryCentreId === centreId && tutor.accountStatus === "active" && tutor.profileStatus === "active"),
    [centreId, tutors],
  );

  const loadScope = useCallback(async (scopeCentreId: string) => {
    const query = `?centreId=${encodeURIComponent(scopeCentreId)}`;
    const [subjectData, yearData, tutorData, sessionData, templateData] = await Promise.all([
      getJson<SubjectList>(`/api/academics/subjects${query}`, "Subjects could not be loaded."),
      getJson<AcademicYearList>(`/api/academics/years${query}`, "Academic years could not be loaded."),
      getJson<TutorProfileList>(`/api/profiles/onboarding/tutors${query}`, "Tutors could not be loaded."),
      getJson<SessionList>(`/api/sessions${query}`, "Sessions could not be loaded."),
      getJson<SessionTemplateList>(`/api/session-templates${query}`, "Session templates could not be loaded."),
    ]);
    setSubjects(subjectData.subjects ?? []);
    setAcademicYears(yearData.academicYears ?? []);
    setTutors(tutorData.tutors ?? []);
    setSessions(sessionData.sessions ?? []);
    setTemplates(templateData.templates ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await getJson<CentreList>("/api/centres", "Centres could not be loaded.");
        const available = (result.centres ?? []).filter((centre) => centre.status === "active");
        const initial = available[0]?.id ?? "";
        if (!initial) throw new Error("Create and activate a centre before managing sessions.");
        if (cancelled) return;
        setCentres(available);
        setCentreId(initial);
        await loadScope(initial);
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, "Session management is unavailable."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadScope]);

  async function changeCentre(nextCentreId: string) {
    setCentreId(nextCentreId);
    setLoading(true);
    setError("");
    setNotice("");
    closeDialogs();
    try { await loadScope(nextCentreId); }
    catch (caught) { setError(errorMessage(caught, "The selected centre could not be loaded.")); }
    finally { setLoading(false); }
  }

  function openNewSession() {
    setEditingSessionId("");
    setSessionDraft({
      ...emptySession,
      offeredSubjects: initialSubjectSelection(activeSubjects),
      academicYearId: usableYears[0]?.id ?? "",
    });
    setDialog("session");
    clearFeedback();
  }

  function editSession(item: TeachingSession) {
    setEditingSessionId(item.id);
    setSessionDraft({
      offeredSubjects: offeringSelections(item.offeredSubjects),
      academicYearId: item.academicYearId,
      startsAt: toCentreInput(item.startsAt, item.centreTimeZone),
      bookingDeadlineAt: item.bookingDeadlineAt ? toCentreInput(item.bookingDeadlineAt, item.centreTimeZone) : "",
      maximumCapacity: item.maximumCapacity ? String(item.maximumCapacity) : "",
    });
    setDialog("session");
    clearFeedback();
  }

  async function saveSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCentre) return;
    setPending("session"); setError(""); setNotice("");
    try {
      const payload = {
        centreId,
        offeredSubjects: normalizeSessionSubjectSelections(sessionDraft.offeredSubjects),
        academicYearId: sessionDraft.academicYearId,
        startsAt: zonedInputToISO(sessionDraft.startsAt, selectedCentre.timeZone),
        bookingDeadlineAt: sessionDraft.bookingDeadlineAt ? zonedInputToISO(sessionDraft.bookingDeadlineAt, selectedCentre.timeZone) : undefined,
        maximumCapacity: optionalNumber(sessionDraft.maximumCapacity),
      };
      await mutate<TeachingSession>(editingSessionId ? `/api/sessions/${encodeURIComponent(editingSessionId)}` : "/api/sessions", editingSessionId ? "PUT" : "POST", payload);
      setDialog(null);
      setNotice(editingSessionId ? "Session updated." : "Draft session created.");
      await loadScope(centreId);
    } catch (caught) { setError(errorMessage(caught, "The session could not be saved.")); }
    finally { setPending(""); }
  }

  function openNewTemplate() {
    setEditingTemplateId("");
    setTemplateDraft({ ...emptyTemplate, offeredSubjects: initialSubjectSelection(activeSubjects), academicYearId: usableYears[0]?.id ?? "" });
    setDialog("template");
    clearFeedback();
  }

  function editTemplate(item: SessionTemplate) {
    setEditingTemplateId(item.id);
    setTemplateDraft({
      name: item.name,
      offeredSubjects: offeringSelections(item.offeredSubjects),
      academicYearId: item.academicYearId,
      dayOfWeek: String(item.dayOfWeek),
      startTime: item.startTime,
      maximumCapacity: item.maximumCapacity ? String(item.maximumCapacity) : "",
      bookingDeadlineMinutes: String(item.bookingDeadlineMinutes),
    });
    setDialog("template");
    clearFeedback();
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("template"); setError(""); setNotice("");
    try {
      await mutate<SessionTemplate>(editingTemplateId ? `/api/session-templates/${encodeURIComponent(editingTemplateId)}` : "/api/session-templates", editingTemplateId ? "PUT" : "POST", {
        centreId,
        name: templateDraft.name,
        offeredSubjects: normalizeSessionSubjectSelections(templateDraft.offeredSubjects),
        academicYearId: templateDraft.academicYearId,
        dayOfWeek: Number(templateDraft.dayOfWeek),
        startTime: templateDraft.startTime,
        maximumCapacity: optionalNumber(templateDraft.maximumCapacity),
        bookingDeadlineMinutes: Number(templateDraft.bookingDeadlineMinutes),
      });
      setDialog(null);
      setNotice(editingTemplateId ? "Session template updated." : "Session template created.");
      await loadScope(centreId);
    } catch (caught) { setError(errorMessage(caught, "The session template could not be saved.")); }
    finally { setPending(""); }
  }

  async function publish(item: TeachingSession) {
    setPending(`publish:${item.id}`); clearFeedback();
    try {
      await mutate<TeachingSession>(`/api/sessions/${encodeURIComponent(item.id)}/publish`, "POST", { centreId });
      setNotice("Session published. Parents and eligible students can now see it.");
      await loadScope(centreId);
    } catch (caught) { setError(errorMessage(caught, "The session could not be published.")); }
    finally { setPending(""); }
  }

  function openAssignment(item: TeachingSession, offering: SessionSubjectOffering) {
    setAssigningSubject({ session: item, offering });
    setAssignedTutorIds(offering.tutors.map((tutor) => tutor.profileId));
    setDialog("assign");
    clearFeedback();
  }

  async function assignTutors(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assigningSubject) return;
    setPending("assign"); setError("");
    try {
      await mutate<TeachingSession>(`/api/sessions/${encodeURIComponent(assigningSubject.session.id)}/subjects/${encodeURIComponent(assigningSubject.offering.id)}/tutors`, "PUT", { centreId, tutorProfileIds: assignedTutorIds });
      setDialog(null);
      setNotice(assignedTutorIds.length ? "Subject tutors updated." : "Subject tutor assignments removed.");
      await loadScope(centreId);
    } catch (caught) { setError(errorMessage(caught, "The tutor assignment could not be updated.")); }
    finally { setPending(""); }
  }

  async function changeTemplateStatus(item: SessionTemplate) {
    const nextStatus = item.status === "active" ? "inactive" : "active";
    setPending(`template-status:${item.id}`); clearFeedback();
    try {
      await mutate<SessionTemplate>(`/api/session-templates/${encodeURIComponent(item.id)}/status`, "POST", { centreId, status: nextStatus });
      setNotice(`Template ${nextStatus === "active" ? "reactivated" : "deactivated"}.`);
      await loadScope(centreId);
    } catch (caught) { setError(errorMessage(caught, "The template status could not be changed.")); }
    finally { setPending(""); }
  }

  function openGeneration(item: SessionTemplate) {
    setGeneratingTemplate(item);
    setGenerationDates("");
    setDialog("generate");
    clearFeedback();
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!generatingTemplate) return;
    const dates = [...new Set(generationDates.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))];
    setPending("generate"); setError("");
    try {
      const result = await mutate<SessionGenerationResult>(`/api/session-templates/${encodeURIComponent(generatingTemplate.id)}/generate`, "POST", { centreId, dates });
      setDialog(null);
      setView("sessions");
      setNotice(`${result.sessions.length} draft session${result.sessions.length === 1 ? "" : "s"} generated.`);
      await loadScope(centreId);
    } catch (caught) { setError(errorMessage(caught, "Sessions could not be generated.")); }
    finally { setPending(""); }
  }

  function toggleSession(id: string) {
    setExpandedSessionIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function clearFeedback() { setError(""); setNotice(""); }
  function closeDialogs() {
    setDialog(null); setEditingSessionId(""); setEditingTemplateId("");
    setGeneratingTemplate(null); setAssigningSubject(null); setAssignedTutorIds([]); setError("");
  }

  const draftCount = sessions.filter((item) => item.status === "draft").length;
  const publishedCount = sessions.filter((item) => item.status === "published").length;
  const activeTemplateCount = templates.filter((item) => item.status === "active").length;

  return (
    <div className="grid gap-5">
      <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h2 className="text-lg font-black tracking-tight text-slate-950">Sessions</h2>
        {!loading && centreId ? <dl className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Session summary">
          <SummaryStat label="Draft sessions" value={draftCount} tooltip="Sessions not yet published" />
          <SummaryStat label="Published sessions" value={publishedCount} tooltip="Sessions published to students" />
          <SummaryStat label="Active templates" value={activeTemplateCount} tooltip="Templates available to generate sessions" />
        </dl> : null}
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500" htmlFor="sessions-centre">
          Centre
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100" disabled={loading || pending !== ""} id="sessions-centre" onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
            {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
          </select>
        </label>
      </section>

      {error && !dialog ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4 sm:px-5">
          <div className="flex flex-wrap gap-2" aria-label="Session views">
            {(["sessions", "templates"] as const).map((item) => (
              <button aria-pressed={view === item} className={view === item ? feedbackButton : feedbackSecondaryButton} key={item} onClick={() => setView(item)} type="button">{item === "sessions" ? "Sessions" : "Templates"}</button>
            ))}
          </div>
          <button className={feedbackButton} disabled={loading || !centreId || !activeSubjects.length || !usableYears.length} onClick={view === "sessions" ? openNewSession : openNewTemplate} type="button">
            {view === "sessions" ? "Create session" : "Create template"}
          </button>
        </div>
        <div className="space-y-4 p-4 sm:p-5">

      {loading ? <p className="rounded-xl border border-slate-200 p-6 text-sm text-slate-500" role="status">Loading sessions…</p> : null}

      {!loading && view === "sessions" ? (
        <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Sessions">
          {sessions.length ? sessions.map((item) => {
            const expanded = expandedSessionIds.includes(item.id);
            const tutorCount = new Set(item.offeredSubjects.flatMap((offering) => offering.tutors.map((tutor) => tutor.profileId))).size;
            return (
              <article className="grid gap-3 rounded-xl border border-slate-200 p-4" key={item.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${item.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{item.status}</span>
                    {item.maximumCapacity ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">Capacity {item.maximumCapacity}</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">Open capacity</span>}
                  </div>
                  <button aria-expanded={expanded} className={secondaryButton} onClick={() => toggleSession(item.id)} type="button">{expanded ? "Hide details" : "Show details"}</button>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-950">{formatSessionDateTime(item.startsAt, item.centreTimeZone)} – {formatSessionTime(item.endsAt, item.centreTimeZone)}</h3>
                  <p className="mt-1 text-xs text-slate-500">Booking deadline {formatSessionDateTime(item.effectiveBookingDeadlineAt, item.centreTimeZone)}</p>
                </div>
                <p className="text-xs font-bold text-slate-600">{countLabel(item.offeredSubjects.length, "subject")} · {countLabel(tutorCount, "tutor")}</p>
                {expanded ? (
                  <div className="grid gap-4 border-t border-slate-100 pt-4">
                    <SubjectOfferingList disabled={pending !== "" || item.status === "cancelled" || item.status === "completed"} offerings={item.offeredSubjects} onManage={(offering) => openAssignment(item, offering)} />
                    <dl className="text-sm text-slate-600">
                      <dt className="font-bold text-slate-400">Academic year</dt>
                      <dd>{item.academicYearName}</dd>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                      {item.status === "draft" ? <button className={secondaryButton} disabled={pending !== ""} onClick={() => editSession(item)} type="button">Edit</button> : null}
                      {item.status === "draft" ? <button className={primaryButton} disabled={pending !== ""} onClick={() => void publish(item)} type="button">{pending === `publish:${item.id}` ? "Publishing…" : "Publish"}</button> : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          }) : <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No sessions yet" description="Create a single draft or generate sessions from a reusable template." /></div>}
        </section>
      ) : null}

      {!loading && view === "templates" ? (
        <section className="grid gap-4 md:grid-cols-2" aria-label="Session templates">
          {templates.length ? templates.map((item) => (
            <article className="grid gap-4 rounded-xl border border-slate-200 p-4 sm:p-5" key={item.id}>
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-wide text-orange-600">{weekdays[item.dayOfWeek]} at {item.startTime}</p><h3 className="mt-1 text-lg font-black text-slate-950">{item.name}</h3></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${item.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status}</span>
              </div>
              <SubjectOfferingList offerings={item.offeredSubjects} />
              <dl className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div><dt className="font-bold text-slate-400">Academic year</dt><dd>{item.academicYearName}</dd></div>
                <div><dt className="font-bold text-slate-400">Capacity</dt><dd>{item.maximumCapacity ?? "Not limited"}</dd></div>
              </dl>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <button className={secondaryButton} disabled={pending !== ""} onClick={() => editTemplate(item)} type="button">Edit</button>
                <button className={item.status === "active" ? dangerButton : secondaryButton} disabled={pending !== ""} onClick={() => void changeTemplateStatus(item)} type="button">{item.status === "active" ? "Deactivate" : "Reactivate"}</button>
                <button className={primaryButton} disabled={pending !== "" || item.status !== "active"} onClick={() => openGeneration(item)} type="button">Generate sessions</button>
              </div>
            </article>
          )) : <div className="md:col-span-2"><EmptyState title="No templates yet" description="Create a reusable weekly pattern, then choose each date you want to generate." /></div>}
        </section>
      ) : null}
        </div>
      </section>

      <FormDialog open={dialog === "session"} title={editingSessionId ? "Edit draft session" : "Create a session"} description={`The session is exactly two hours and uses ${selectedCentre?.timeZone ?? "the centre time zone"}.`} onOpenChange={(open) => { if (!open && !pending) closeDialogs(); }}>
        <form className="grid gap-4 p-5" onSubmit={saveSession}>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Academic year" value={sessionDraft.academicYearId} onChange={(value) => setSessionDraft({ ...sessionDraft, academicYearId: value })} options={usableYears.map((item) => ({ value: item.id, label: item.name }))} />
            <label className={labelClass}>Starts at<input className={inputClass} onChange={(event) => setSessionDraft({ ...sessionDraft, startsAt: event.target.value })} required type="datetime-local" value={sessionDraft.startsAt} /></label>
            <label className={labelClass}>Booking deadline <span className="font-normal text-slate-400">Optional; defaults to start time</span><input className={inputClass} onChange={(event) => setSessionDraft({ ...sessionDraft, bookingDeadlineAt: event.target.value })} type="datetime-local" value={sessionDraft.bookingDeadlineAt} /></label>
            <label className={labelClass}>Maximum students <span className="font-normal text-slate-400">Optional</span><input className={inputClass} min={1} onChange={(event) => setSessionDraft({ ...sessionDraft, maximumCapacity: event.target.value })} type="number" value={sessionDraft.maximumCapacity} /></label>
          </div>
          <SessionSubjectEditor onChange={(offeredSubjects) => setSessionDraft({ ...sessionDraft, offeredSubjects })} subjects={activeSubjects} tutors={activeTutors} value={sessionDraft.offeredSubjects} />
          {editingSessionId ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">Once this session has a booking, its subject list cannot be changed. Tutor assignments can still be managed independently for each subject.</p> : null}
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <DialogActions pending={pending === "session"} submitLabel={editingSessionId ? "Save changes" : "Create draft"} onCancel={closeDialogs} />
        </form>
      </FormDialog>

      <FormDialog open={dialog === "template"} title={editingTemplateId ? "Edit session template" : "Create session template"} description="Store a weekly pattern without creating an endless recurrence. Dates are always selected explicitly." onOpenChange={(open) => { if (!open && !pending) closeDialogs(); }}>
        <form className="grid gap-4 p-5" onSubmit={saveTemplate}>
          <label className={labelClass}>Template name<input className={inputClass} maxLength={160} onChange={(event) => setTemplateDraft({ ...templateDraft, name: event.target.value })} placeholder="Saturday morning programme" required value={templateDraft.name} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Academic year" value={templateDraft.academicYearId} onChange={(value) => setTemplateDraft({ ...templateDraft, academicYearId: value })} options={usableYears.map((item) => ({ value: item.id, label: item.name }))} />
            <SelectField label="Weekday" value={templateDraft.dayOfWeek} onChange={(value) => setTemplateDraft({ ...templateDraft, dayOfWeek: value })} options={weekdays.map((label, index) => ({ value: String(index), label }))} />
            <label className={labelClass}>Start time<input className={inputClass} onChange={(event) => setTemplateDraft({ ...templateDraft, startTime: event.target.value })} required type="time" value={templateDraft.startTime} /></label>
            <label className={labelClass}>Maximum students <span className="font-normal text-slate-400">Optional</span><input className={inputClass} min={1} onChange={(event) => setTemplateDraft({ ...templateDraft, maximumCapacity: event.target.value })} type="number" value={templateDraft.maximumCapacity} /></label>
            <label className={labelClass}>Booking closes (minutes before start)<input className={inputClass} min={0} onChange={(event) => setTemplateDraft({ ...templateDraft, bookingDeadlineMinutes: event.target.value })} required type="number" value={templateDraft.bookingDeadlineMinutes} /></label>
          </div>
          <SessionSubjectEditor onChange={(offeredSubjects) => setTemplateDraft({ ...templateDraft, offeredSubjects })} subjects={activeSubjects} tutors={activeTutors} value={templateDraft.offeredSubjects} />
          <p className="text-xs leading-5 text-slate-500">Generated sessions receive a snapshot of this subject and tutor list. Later template changes do not alter sessions that already exist.</p>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <DialogActions pending={pending === "template"} submitLabel={editingTemplateId ? "Save changes" : "Create template"} onCancel={closeDialogs} />
        </form>
      </FormDialog>

      <FormDialog open={dialog === "generate"} title="Generate selected sessions" description={`${generatingTemplate?.name ?? "Template"}: enter only ${generatingTemplate ? weekdays[generatingTemplate.dayOfWeek] : "matching"} dates in YYYY-MM-DD format.`} onOpenChange={(open) => { if (!open && !pending) closeDialogs(); }}>
        <form className="grid gap-4 p-5" onSubmit={generate}>
          <label className={labelClass}>Session dates<textarea className={`${inputClass} min-h-36 resize-y`} onChange={(event) => setGenerationDates(event.target.value)} placeholder={"2026-10-17\n2026-10-24\n2026-10-31"} required value={generationDates} /></label>
          <p className="text-sm leading-6 text-slate-500">Use one date per line or separate dates with commas. Between 1 and 52 future dates may be generated at once.</p>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <DialogActions pending={pending === "generate"} submitLabel="Generate drafts" onCancel={closeDialogs} />
        </form>
      </FormDialog>

      <FormDialog open={dialog === "assign"} title={`Manage tutors for ${assigningSubject?.offering.subjectName ?? "subject"}`} description="Select any number of tutors. Every selected tutor must belong to this centre and have an active capability for this subject." onOpenChange={(open) => { if (!open && !pending) closeDialogs(); }}>
        <form className="grid gap-4 p-5" onSubmit={assignTutors}>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-black text-slate-800">Assigned tutors</legend>
            {activeTutors.length ? activeTutors.map((tutor) => {
              const option = tutorOption(tutor);
              return <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-200 hover:bg-orange-50/50" key={tutor.id}><input checked={assignedTutorIds.includes(tutor.id)} className="size-4 accent-orange-600" onChange={() => setAssignedTutorIds((current) => current.includes(tutor.id) ? current.filter((id) => id !== tutor.id) : [...current, tutor.id])} type="checkbox" /><span>{option.label}</span></label>;
            }) : <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">No active tutors are available at this centre.</p>}
          </fieldset>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <DialogActions pending={pending === "assign"} submitLabel="Save tutor assignments" onCancel={closeDialogs} />
        </form>
      </FormDialog>
    </div>
  );
}

function SubjectOfferingList({ offerings, onManage, disabled = false }: { offerings: SessionSubjectOffering[]; onManage?: (offering: SessionSubjectOffering) => void; disabled?: boolean }) {
  return (
    <div className="grid gap-2" aria-label="Offered subjects">
      {offerings.map((offering) => (
        <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" key={offering.id}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-slate-900">{offering.subjectName}</strong>
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{offering.subjectCode}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-slate-500">{offering.tutors.length ? offering.tutors.map((tutor) => tutor.name).join(", ") : "Tutors can be assigned later"}</p>
          </div>
          {onManage ? <button className={secondaryButton} disabled={disabled} onClick={() => onManage(offering)} type="button">Manage tutors</button> : null}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><h3 className="text-lg font-black text-slate-900">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p></div>;
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className={labelClass}>{label}<select className={inputClass} onChange={(event) => onChange(event.target.value)} required={options[0]?.value !== ""} value={value}>{options.map((option) => <option key={`${option.value}:${option.label}`} value={option.value}>{option.label}</option>)}</select></label>;
}

function DialogActions({ pending, submitLabel, onCancel }: { pending: boolean; submitLabel: string; onCancel: () => void }) {
  return <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={pending} onClick={onCancel} type="button">Cancel</button><button className={primaryButton} disabled={pending} type="submit">{pending ? "Saving…" : submitLabel}</button></div>;
}

function tutorOption(tutor: TutorProfile) {
  return { value: tutor.id, label: [tutor.firstName, tutor.lastName].filter(Boolean).join(" ") || tutor.email };
}

function initialSubjectSelection(subjects: Subject[]): SessionSubjectSelection[] {
  return subjects[0] ? [{ subjectId: subjects[0].id, tutorProfileIds: [] }] : [];
}

function offeringSelections(offerings: SessionSubjectOffering[]): SessionSubjectSelection[] {
  return offerings.map((offering) => ({ subjectId: offering.subjectId, tutorProfileIds: offering.tutors.map((tutor) => tutor.profileId) }));
}

async function getJson<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" });
  const result = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(result.error ?? fallback);
  return result;
}

async function mutate<T>(path: string, method: "POST" | "PUT", body: Record<string, unknown>): Promise<T> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  const csrfResult = (await csrfResponse.json().catch(() => ({}))) as { csrfToken?: string; error?: string };
  if (!csrfResponse.ok || !csrfResult.csrfToken) throw new Error(csrfResult.error ?? "Request verification is unavailable.");
  const response = await fetch(path, { method, headers: { "content-type": "application/json", "x-csrf-token": csrfResult.csrfToken }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(result.error ?? "The requested change could not be completed.");
  return result;
}

function optionalNumber(value: string): number | undefined {
  return value.trim() ? Number(value) : undefined;
}

function errorMessage(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
