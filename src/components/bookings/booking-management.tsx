"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import { SummaryStat } from "@/components/ui/summary-stat";
import { Switch } from "@/components/ui/switch";
import { canCancelBooking, canCancelSession } from "@/lib/booking-rules";
import type { BookingContext, BookingParticipant, SessionBooking, SessionCancellationResult } from "@/lib/booking-types";
import type { CentreList, ManagedCentre } from "@/lib/centre-types";
import type { SessionList, TeachingSession } from "@/lib/session-types";

type ApiError = { error?: string };
type Dialog = "create" | "cancel-booking" | "cancel-session" | "self-booking" | null;

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";
const primaryButton = "rounded-xl border border-orange-600 bg-orange-600 px-3.5 py-2 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const dangerButton = "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50";

export function BookingManagement() {
  const [centres, setCentres] = useState<ManagedCentre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [context, setContext] = useState<BookingContext | null>(null);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [sessionId, setSessionId] = useState("");
  const [sessionSubjectId, setSessionSubjectId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  const [targetBooking, setTargetBooking] = useState<SessionBooking | null>(null);
  const [targetSession, setTargetSession] = useState<TeachingSession | null>(null);
  const [reason, setReason] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCentre = useCallback(async (selectedCentre: string) => {
    const [bookingResponse, sessionResponse] = await Promise.all([
      fetch(`/api/bookings?centreId=${encodeURIComponent(selectedCentre)}`, { cache: "no-store" }),
      fetch(`/api/sessions?centreId=${encodeURIComponent(selectedCentre)}`, { cache: "no-store" }),
    ]);
    const bookingResult = (await bookingResponse.json().catch(() => ({}))) as BookingContext & ApiError;
    const sessionResult = (await sessionResponse.json().catch(() => ({}))) as SessionList & ApiError;
    if (!bookingResponse.ok) throw new Error(bookingResult.error ?? "Booking management could not be loaded.");
    if (!sessionResponse.ok) throw new Error(sessionResult.error ?? "Sessions could not be loaded.");
    setContext(bookingResult);
    setSessions(sessionResult.sessions ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const response = await fetch("/api/centres", { cache: "no-store" });
        const result = (await response.json().catch(() => ({}))) as CentreList & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Centres could not be loaded.");
        const available = (result.centres ?? []).filter((centre) => centre.status === "active");
        const initial = available[0]?.id ?? "";
        if (!initial) throw new Error("Create and activate a centre before managing bookings.");
        if (cancelled) return;
        setCentres(available); setCentreId(initial);
        await loadCentre(initial);
      } catch (caught) { if (!cancelled) setError(message(caught, "Booking management is unavailable.")); }
      finally { if (!cancelled) setLoading(false); }
    }
    void start();
    return () => { cancelled = true; };
  }, [loadCentre]);

  const published = useMemo(
    () => sessions.filter((item) => item.status === "published" && item.offeredSubjects.length > 0 && new Date(item.endsAt).getTime() > Date.now()),
    [sessions],
  );
  const selectedSession = published.find((item) => item.id === sessionId);
  const selectedStudent = context?.participants.find((item) => item.studentProfileId === studentId);
  const selectedWallet = selectedStudent?.wallets.find((item) => item.parentProfileId === parentId) ?? selectedStudent?.wallets[0];
  const confirmed = (context?.bookings ?? []).filter((item) => item.status === "confirmed").length;
  const waiting = (context?.bookings ?? []).filter((item) => item.status === "waitlisted" || item.status === "credits_required").length;
  const visibleParticipants = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    return [...(context?.participants ?? [])]
      .filter((item) => !query || `${item.firstName} ${item.lastName}`.toLowerCase().includes(query) || item.peopleCode.toLowerCase().includes(query))
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  }, [context, studentSearch]);

  async function changeCentre(next: string) {
    setCentreId(next); setLoading(true); closeDialog(); setError(""); setNotice("");
    try { await loadCentre(next); }
    catch (caught) { setError(message(caught, "Booking management could not be loaded.")); }
    finally { setLoading(false); }
  }

  function openCreate(session?: TeachingSession) {
    const firstStudent = context?.participants[0];
    const nextSession = session ?? published[0];
    setSessionId(nextSession?.id ?? "");
    setSessionSubjectId(nextSession?.offeredSubjects[0]?.id ?? "");
    setStudentId(firstStudent?.studentProfileId ?? "");
    setParentId(firstStudent?.wallets[0]?.parentProfileId ?? "");
    setDialog("create"); setError(""); setNotice("");
  }

  function selectSession(next: string) {
    const session = published.find((item) => item.id === next);
    setSessionId(next);
    setSessionSubjectId(session?.offeredSubjects[0]?.id ?? "");
  }

  function selectStudent(next: string) {
    setStudentId(next);
    const participant = context?.participants.find((item) => item.studentProfileId === next);
    setParentId(participant?.wallets[0]?.parentProfileId ?? "");
  }

  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedStudent || !selectedWallet || !sessionId || !sessionSubjectId) return;
    setPending("create"); setError("");
    try {
      const result = await mutate<SessionBooking>("/api/bookings/admin", "POST", { centreId, sessionId, sessionSubjectId, studentProfileId: selectedStudent.studentProfileId, parentProfileId: selectedWallet.parentProfileId });
      setDialog(null);
      setNotice(result.status === "confirmed" ? "The student was booked and two credits were used." : "The session is full. The student was added to the waiting list without a debit.");
      await loadCentre(centreId);
    } catch (caught) { setError(message(caught, "The booking could not be created.")); }
    finally { setPending(""); }
  }

  async function updatePermission(participant: BookingParticipant) {
    setPending(`permission:${participant.studentProfileId}`); setError(""); setNotice("");
    try {
      await mutate(`/api/bookings/students/${encodeURIComponent(participant.studentProfileId)}/permission`, "PUT", { centreId, canManageOwnBookings: !participant.canManageOwnBookings });
      setNotice(`${participant.firstName}'s self-booking permission was ${participant.canManageOwnBookings ? "disabled" : "enabled"}.`);
      await loadCentre(centreId);
    } catch (caught) { setError(message(caught, "The student permission could not be updated.")); }
    finally { setPending(""); }
  }

  async function confirmWaiting(item: SessionBooking) {
    setPending(`confirm:${item.id}`); setError(""); setNotice("");
    try {
      await mutate(`/api/bookings/${encodeURIComponent(item.id)}?operation=confirm`, "POST", { centreId });
      setNotice("The first waiting booking was confirmed and two credits were used.");
      await loadCentre(centreId);
    } catch (caught) { setError(message(caught, "The waiting booking could not be confirmed.")); }
    finally { setPending(""); }
  }

  async function cancelBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!targetBooking) return;
    setPending("cancel-booking"); setError("");
    try {
      await mutate(`/api/bookings/${encodeURIComponent(targetBooking.id)}?operation=cancel`, "POST", { centreId, reason });
      setDialog(null); setNotice("The booking was cancelled and its booking credits were returned, if applicable."); await loadCentre(centreId);
    } catch (caught) { setError(message(caught, "The booking could not be cancelled.")); }
    finally { setPending(""); }
  }

  async function cancelSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!targetSession) return;
    setPending("cancel-session"); setError("");
    try {
      const result = await mutate<SessionCancellationResult>(`/api/bookings/sessions/${encodeURIComponent(targetSession.id)}/cancel`, "POST", { centreId, reason });
      setDialog(null); setNotice(`The session and ${result.cancelledBookings} active booking(s) were cancelled; ${result.refundedBookings} confirmed booking(s) were refunded.`); await loadCentre(centreId);
    } catch (caught) { setError(message(caught, "The session could not be cancelled.")); }
    finally { setPending(""); }
  }

  function closeDialog() { if (!pending) { setDialog(null); setTargetBooking(null); setTargetSession(null); setSessionSubjectId(""); setReason(""); setError(""); } }

  return <div className="grid gap-6">
    <section className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <h2 className="text-lg font-black tracking-tight text-slate-950">Bookings</h2>
      {!loading && context ? (
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Booking summary">
          <SummaryStat label="Confirmed" value={confirmed} tooltip="Students with a confirmed booking" />
          <SummaryStat label="Waiting" value={waiting} tooltip="Waitlisted or awaiting credits" />
          <SummaryStat label="Published sessions" value={published.length} tooltip="Open operational sessions" />
        </dl>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button className={secondaryButton} onClick={() => { setStudentSearch(""); setDialog("self-booking"); setError(""); }} type="button">Student self-booking</button>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">Centre<select className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100" disabled={loading || Boolean(pending)} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>{centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}</select></label>
      </div>
    </section>
    {error && !dialog ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
    {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}
    {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading booking operations…</p> : null}
    {!loading && context ? <>
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-slate-950">Published sessions</h2>
            <p className="mt-1 text-sm text-slate-500">Bookings are first-come, first-served against the shared session capacity.</p>
          </div>
          <button className={primaryButton} disabled={!published.length || !context.participants.length} onClick={() => openCreate()} type="button">Add student booking</button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {published.length ? published.map((item) => (
            <article className="grid gap-3 rounded-xl border border-slate-200 p-4" key={item.id}>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-orange-600">{item.offeredSubjects.length} offered {item.offeredSubjects.length === 1 ? "subject" : "subjects"}</p>
                <h3 className="font-black text-slate-950">{formatDate(item.startsAt, item.centreTimeZone)}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.maximumCapacity ? `Shared capacity ${item.maximumCapacity}` : "No capacity limit"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.offeredSubjects.map((subject) => <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-black text-orange-700" key={subject.id}>{subject.subjectCode} · {subject.subjectName}</span>)}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={secondaryButton} onClick={() => openCreate(item)} type="button">Book student</button>
                {canCancelSession(context.bookings, item.id) ? <button className={dangerButton} onClick={() => { setTargetSession(item); setReason(""); setDialog("cancel-session"); setError(""); }} type="button">Cancel session</button> : <span className="self-center text-xs font-semibold text-slate-600">Cannot cancel: attendance recorded</span>}
              </div>
            </article>
          )) : <Empty text="No published future sessions with offered subjects are available in this centre." />}
        </div>
      </section>
      <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-950">Booking register</h2>
          <p className="mt-1 text-sm text-slate-500">Selected subjects and student lesson-focus notes remain visible for operational review.</p>
        </div>
        <div className="grid gap-3">
          {context.bookings.length ? context.bookings.map((item) => (
            <article className="grid gap-4 rounded-xl border border-slate-200 p-4 lg:grid-cols-[1fr_auto] lg:items-center" key={item.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-slate-900">{item.studentFirstName} {item.studentLastName} · {item.subjectCode} · {item.subjectName}</strong>
                  <Status value={item.status} />
                  {item.lessonFocusLocked ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-slate-600">Attendance recorded</span> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{formatDate(item.startsAt, item.centreTimeZone)} · {item.parentName} · Balance {item.walletBalance}{item.queuePosition ? ` · Queue ${item.queuePosition}` : ""}</p>
                {item.lessonFocus ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Lesson focus</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.lessonFocus}</p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {(item.status === "waitlisted" || item.status === "credits_required") && item.queuePosition === 1 ? <button className={primaryButton} disabled={Boolean(pending)} onClick={() => void confirmWaiting(item)} type="button">Confirm place</button> : null}
                {canCancelBooking(item.status, item.lessonFocusLocked) ? <button className={dangerButton} disabled={Boolean(pending)} onClick={() => { setTargetBooking(item); setReason(""); setDialog("cancel-booking"); setError(""); }} type="button">Cancel</button> : item.status !== "cancelled" ? <span className="self-center text-xs font-semibold text-slate-600">Cancellation unavailable after attendance</span> : null}
              </div>
            </article>
          )) : <Empty text="No bookings have been recorded in this centre." />}
        </div>
      </section>
    </> : null}

    <FormDialog open={dialog === "self-booking"} title="Student self-booking" description="Students need an activated login and this permission to book their own sessions. Parent booking permissions stay on the household link." onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <div className="grid gap-4 p-5">
        <label className="grid gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Search by name or student code<input className={inputClass} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Name or student code" type="search" value={studentSearch} /></label>
        <ul className="grid max-h-[60vh] gap-2 overflow-y-auto">
          {visibleParticipants.length ? visibleParticipants.map((item) => (
            <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3" key={item.studentProfileId}>
              <div className="min-w-0"><p className="truncate font-black text-slate-900">{item.firstName} {item.lastName}</p><p className="text-xs font-semibold text-slate-500">{item.peopleCode} · {item.hasLoginAccount ? "Activated login" : "Activation required"}</p></div>
              <Switch aria-label={`Self-booking for ${item.firstName} ${item.lastName}`} checked={item.canManageOwnBookings} disabled={Boolean(pending) || (!item.hasLoginAccount && !item.canManageOwnBookings)} onCheckedChange={() => void updatePermission(item)} />
            </li>
          )) : <Empty text="No students match this search." />}
        </ul>
      </div>
    </FormDialog>

    <FormDialog open={dialog === "create"} title="Add student booking" description="Choose one subject offered in this session. A confirmed booking uses two credits against the shared session capacity." onOpenChange={(open) => { if (!open) closeDialog(); }}>
      <form className="grid gap-4 p-5" onSubmit={createBooking}>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Session
          <select className={inputClass} onChange={(event) => selectSession(event.target.value)} required value={sessionId}>
            {published.map((item) => <option key={item.id} value={item.id}>{formatDate(item.startsAt, item.centreTimeZone)} · {item.offeredSubjects.length} {item.offeredSubjects.length === 1 ? "subject" : "subjects"}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Subject
          <select className={inputClass} disabled={!selectedSession} onChange={(event) => setSessionSubjectId(event.target.value)} required value={sessionSubjectId}>
            {selectedSession?.offeredSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.subjectName} ({subject.subjectCode})</option>)}
          </select>
          <span className="text-xs font-medium text-slate-500">Only subjects offered by the selected session can be booked.</span>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Student
          <select className={inputClass} onChange={(event) => selectStudent(event.target.value)} required value={studentId}>
            {context?.participants.map((item) => <option key={item.studentProfileId} value={item.studentProfileId}>{item.firstName} {item.lastName} ({item.peopleCode})</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-slate-700">
          Household wallet
          <select className={inputClass} onChange={(event) => setParentId(event.target.value)} required value={selectedWallet?.parentProfileId ?? ""}>
            {selectedStudent?.wallets.map((item) => <option key={item.parentProfileId} value={item.parentProfileId}>{item.parentName} · {item.balanceCredits} credits</option>)}
          </select>
        </label>
        {!selectedWallet ? <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">Link this student to an active parent before creating a booking.</p> : null}
        {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button className={secondaryButton} onClick={closeDialog} type="button">Cancel</button>
          <button className={primaryButton} disabled={pending !== "" || !selectedWallet || !sessionSubjectId} type="submit">{pending ? "Booking…" : "Create booking"}</button>
        </div>
      </form>
    </FormDialog>
    <ReasonDialog dangerLabel="Cancel booking" description="Cancellation is only available before attendance is recorded. Confirmed bookings are refunded immediately; waiting records have no credit to return." error={error} onClose={closeDialog} onSubmit={cancelBooking} open={dialog === "cancel-booking"} pending={pending !== ""} reason={reason} setReason={setReason} title="Cancel student booking" />
    <ReasonDialog dangerLabel="Cancel session and refund" description="This cancels every active booking only if none has attendance recorded. Confirmed bookings receive a two-credit refund." error={error} onClose={closeDialog} onSubmit={cancelSession} open={dialog === "cancel-session"} pending={pending !== ""} reason={reason} setReason={setReason} title="Cancel published session" />
  </div>;
}

function ReasonDialog({ open, title, description, dangerLabel, reason, setReason, pending, error, onClose, onSubmit }: { open: boolean; title: string; description: string; dangerLabel: string; reason: string; setReason: (value: string) => void; pending: boolean; error: string; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) { return <FormDialog open={open} title={title} description={description} onOpenChange={(value) => { if (!value) onClose(); }}><form className="grid gap-4 p-5" onSubmit={onSubmit}><label className="grid gap-1.5 text-sm font-bold text-slate-700">Reason<textarea className={`${inputClass} min-h-28 resize-y`} maxLength={1000} onChange={(event) => setReason(event.target.value)} required value={reason} /></label>{error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}<div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={pending} onClick={onClose} type="button">Keep record</button><button className={dangerButton} disabled={pending} type="submit">{pending ? "Processing…" : dangerLabel}</button></div></form></FormDialog>; }
function Status({ value }: { value: SessionBooking["status"] }) { const style = value === "confirmed" ? "bg-emerald-100 text-emerald-700" : value === "cancelled" ? "bg-slate-100 text-slate-600" : value === "credits_required" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"; return <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${style}`}>{value.replaceAll("_", " ")}</span>; }
function Empty({ text }: { text: string }) { return <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 md:col-span-2">{text}</p>; }
function formatDate(value: string, timeZone: string) { return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
async function mutate<T = unknown>(path: string, method: "POST" | "PUT", body: Record<string, unknown>): Promise<T> { const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" }); const csrf = (await csrfResponse.json().catch(() => ({}))) as { csrfToken?: string; error?: string }; if (!csrfResponse.ok || !csrf.csrfToken) throw new Error(csrf.error ?? "Request verification is unavailable."); const response = await fetch(path, { method, headers: { "content-type": "application/json", "x-csrf-token": csrf.csrfToken }, body: JSON.stringify(body) }); const result = (await response.json().catch(() => ({}))) as T & ApiError; if (!response.ok) throw new Error(result.error ?? "The booking change could not be completed."); return result; }
function message(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
