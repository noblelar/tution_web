"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import type { BookingContext, SessionBooking } from "@/lib/booking-types";
import { bookingCreditCost, canCancelBooking, lessonFocusCharacterCount, lessonFocusMaximumLength, normalizeLessonFocus } from "@/lib/booking-rules";
import type { SessionList, TeachingSession } from "@/lib/session-types";

type ApiError = { error?: string };
type Dialog = "book" | "focus" | null;

const buttonClass = "rounded-xl border border-orange-600 bg-orange-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const selectClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

export function BookingDirectory({ audience }: { audience: "parent" | "student" }) {
  const [context, setContext] = useState<BookingContext | null>(null);
  const [sessions, setSessions] = useState<TeachingSession[]>([]);
  const [studentId, setStudentId] = useState("");
  const [walletParentId, setWalletParentId] = useState("");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [bookingSession, setBookingSession] = useState<TeachingSession | null>(null);
  const [sessionSubjectId, setSessionSubjectId] = useState("");
  const [focusBooking, setFocusBooking] = useState<SessionBooking | null>(null);
  const [lessonFocus, setLessonFocus] = useState("");
  const [pending, setPending] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const [bookingResponse, sessionResponse] = await Promise.all([
      fetch("/api/bookings", { cache: "no-store" }),
      fetch("/api/sessions", { cache: "no-store" }),
    ]);
    const bookingResult = (await bookingResponse.json().catch(() => ({}))) as BookingContext & ApiError;
    const sessionResult = (await sessionResponse.json().catch(() => ({}))) as SessionList & ApiError;
    if (!bookingResponse.ok) throw new Error(bookingResult.error ?? "Bookings could not be loaded.");
    if (!sessionResponse.ok) throw new Error(sessionResult.error ?? "Sessions could not be loaded.");
    setContext(bookingResult);
    const now = Date.now();
    setSessions((sessionResult.sessions ?? []).filter((item) => new Date(item.endsAt).getTime() > now));
    const first = bookingResult.participants?.[0];
    setStudentId((current) => current || first?.studentProfileId || "");
    setWalletParentId((current) => current || first?.wallets?.[0]?.parentProfileId || "");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try { await load(); }
      catch (caught) { if (!cancelled) setError(message(caught, "Bookings could not be loaded.")); }
      finally { if (!cancelled) setLoading(false); }
    }
    void start();
    return () => { cancelled = true; };
  }, [load]);

  const participant = context?.participants.find((item) => item.studentProfileId === studentId);
  const wallet = participant?.wallets.find((item) => item.parentProfileId === walletParentId) ?? participant?.wallets[0];
  const participantCentreId = participant?.centreId;
  const existing = useMemo(() => new Set((context?.bookings ?? []).filter((item) => item.status !== "cancelled").map((item) => `${item.sessionId}:${item.studentProfileId}`)), [context]);
  const available = sessions.filter((item) => item.status === "published" && item.offeredSubjects.length > 0 && (!participantCentreId || item.centreId === participantCentreId));
  const canManage = audience === "parent" || Boolean(participant?.canManageOwnBookings);
  const hasBookingCreditAccess = Boolean(wallet && wallet.balanceCredits >= 0);
  const lessonFocusTooLong = lessonFocusCharacterCount(lessonFocus) > lessonFocusMaximumLength;

  function selectStudent(next: string) {
    setStudentId(next);
    const nextParticipant = context?.participants.find((item) => item.studentProfileId === next);
    setWalletParentId(nextParticipant?.wallets[0]?.parentProfileId ?? "");
  }

  function openBooking(session: TeachingSession) {
    setBookingSession(session);
    setSessionSubjectId(session.offeredSubjects[0]?.id ?? "");
    setLessonFocus("");
    setDialog("book");
    setError("");
    setNotice("");
  }

  async function book(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!participant || !wallet || !bookingSession || !sessionSubjectId) return;
    setPending("book"); setError(""); setNotice("");
    try {
      const result = await mutate<SessionBooking>("/api/bookings", "POST", {
        sessionId: bookingSession.id,
        sessionSubjectId,
        studentProfileId: participant.studentProfileId,
        parentProfileId: wallet.parentProfileId,
        lessonFocus: normalizeLessonFocus(lessonFocus),
      });
      setDialog(null); setBookingSession(null); setSessionSubjectId(""); setLessonFocus("");
      setNotice(result.status === "confirmed" ? "The session is confirmed and two credits were used." : "The session is full. The student was added to the waiting list without using credits.");
      await load();
    } catch (caught) { setError(message(caught, "The booking could not be created.")); }
    finally { setPending(""); }
  }

  function openFocus(item: SessionBooking) {
    setFocusBooking(item);
    setLessonFocus(item.lessonFocus ?? "");
    setDialog("focus");
    setError("");
    setNotice("");
  }

  async function saveFocus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!focusBooking) return;
    setPending("focus"); setError("");
    try {
      await mutate<SessionBooking>(`/api/bookings/${encodeURIComponent(focusBooking.id)}/focus`, "PUT", { lessonFocus: normalizeLessonFocus(lessonFocus) });
      setDialog(null); setFocusBooking(null); setLessonFocus("");
      setNotice("The lesson focus was updated.");
      await load();
    } catch (caught) { setError(message(caught, "The lesson focus could not be updated.")); }
    finally { setPending(""); }
  }

  async function changeBooking(item: SessionBooking, operation: "cancel" | "confirm") {
    setPending(`${operation}:${item.id}`); setError(""); setNotice("");
    try {
      await mutate<SessionBooking>(`/api/bookings/${encodeURIComponent(item.id)}?operation=${operation}`, "POST", operation === "cancel" ? { reason: "Cancelled by the account holder" } : {});
      setNotice(operation === "cancel" ? "The booking was cancelled and its booking credits were returned, if applicable." : "The waiting booking is now confirmed and two credits were used.");
      await load();
    } catch (caught) { setError(message(caught, operation === "cancel" ? "The booking could not be cancelled." : "The waiting booking could not be confirmed.")); }
    finally { setPending(""); }
  }

  function closeDialog() {
    if (pending) return;
    setDialog(null); setBookingSession(null); setFocusBooking(null); setSessionSubjectId(""); setLessonFocus(""); setError("");
  }

  return (
    <main className="management-shell">
      <header className="management-header"><div><p className="eyebrow">{audience} area</p><h1>Bookings</h1><p className="mt-3 max-w-3xl text-slate-500">Book a published two-hour session, choose one offered subject, and optionally tell the tutor what the student wants to focus on.</p></div></header>
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading bookings…</p> : null}
      {error && !dialog ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}
      {!loading && context ? (
        <div className="grid gap-6">
          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Student<select className={selectClass} onChange={(event) => selectStudent(event.target.value)} value={studentId}>{context.participants.map((item) => <option key={item.studentProfileId} value={item.studentProfileId}>{item.firstName} {item.lastName} · {item.centreName}</option>)}</select></label>
            <label className="grid gap-1.5 text-sm font-bold text-slate-700">Household wallet<select className={selectClass} onChange={(event) => setWalletParentId(event.target.value)} value={wallet?.parentProfileId ?? ""}>{participant?.wallets.map((item) => <option key={item.parentProfileId} value={item.parentProfileId}>{item.parentName} · {item.balanceCredits} credits</option>)}</select></label>
            {audience === "student" && participant && !participant.canManageOwnBookings ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 sm:col-span-2">An administrator has not enabled self-managed bookings for this student account. Existing bookings remain visible.</p> : null}
            {wallet && wallet.balanceCredits < 0 ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">This household wallet is in debit. Add credit before making another booking.</p> : null}
          </section>

          <section className="grid gap-4"><div><h2 className="text-xl font-black text-slate-950">Available sessions</h2><p className="mt-1 text-sm text-slate-500">Choose one subject from the programme. A balance of zero may confirm one session and become −2.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{available.length && participant ? available.map((item) => <SessionOption item={item} alreadyBooked={existing.has(`${item.id}:${participant.studentProfileId}`)} canManage={canManage && hasBookingCreditAccess} key={item.id} pending={pending === "book" && bookingSession?.id === item.id} onBook={() => openBooking(item)} />) : <Empty text="No published sessions are currently available for this student’s centre." />}</div></section>

          <section className="grid gap-4"><div><h2 className="text-xl font-black text-slate-950">Booking history</h2><p className="mt-1 text-sm text-slate-500">Learning-focus notes remain editable until attendance is recorded.</p></div><div className="grid gap-3">{context.bookings.length ? context.bookings.map((item) => <BookingCard item={item} canManage={audience === "parent" || Boolean(context.participants.find((student) => student.studentProfileId === item.studentProfileId)?.canManageOwnBookings)} key={item.id} pending={pending} onChange={changeBooking} onEditFocus={openFocus} />) : <Empty text="No bookings have been made yet." />}</div></section>
        </div>
      ) : null}

      <FormDialog open={dialog === "book"} title="Book session" description="Choose exactly one subject. The optional learning focus helps the tutor prepare for this student." onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <form className="grid gap-4 p-5" onSubmit={book}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-orange-600">{bookingSession?.centreName}</p><p className="mt-1 text-sm font-bold text-slate-900">{bookingSession ? formatSession(bookingSession.startsAt, bookingSession.centreTimeZone) : ""}</p></div>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">Subject<select className={selectClass} onChange={(event) => setSessionSubjectId(event.target.value)} required value={sessionSubjectId}>{bookingSession?.offeredSubjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName} ({item.subjectCode})</option>)}</select></label>
          <LessonFocusField value={lessonFocus} onChange={setLessonFocus} />
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={Boolean(pending)} onClick={closeDialog} type="button">Cancel</button><button className={buttonClass} disabled={Boolean(pending) || !sessionSubjectId || lessonFocusTooLong} type="submit">{pending ? "Booking…" : `Book for ${bookingCreditCost} credits`}</button></div>
        </form>
      </FormDialog>

      <FormDialog open={dialog === "focus"} title="Update lesson focus" description="Add or revise what the student wants to study. This becomes read-only as soon as attendance is marked." onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <form className="grid gap-4 p-5" onSubmit={saveFocus}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-sm font-black text-slate-900">{focusBooking?.subjectName}</p><p className="mt-1 text-xs text-slate-500">{focusBooking ? formatSession(focusBooking.startsAt, focusBooking.centreTimeZone) : ""}</p></div>
          <LessonFocusField value={lessonFocus} onChange={setLessonFocus} />
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={Boolean(pending)} onClick={closeDialog} type="button">Cancel</button><button className={buttonClass} disabled={Boolean(pending) || lessonFocusTooLong} type="submit">{pending ? "Saving…" : "Save lesson focus"}</button></div>
        </form>
      </FormDialog>
    </main>
  );
}

function SessionOption({ item, alreadyBooked, canManage, pending, onBook }: { item: TeachingSession; alreadyBooked: boolean; canManage: boolean; pending: boolean; onBook: () => void }) {
  const date = formatSession(item.startsAt, item.centreTimeZone);
  return <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">{item.centreName}</p><h3 className="mt-1 text-xl font-black text-slate-950">{item.offeredSubjects.length} subject{item.offeredSubjects.length === 1 ? "" : "s"} available</h3><p className="mt-2 text-sm font-semibold text-slate-700">{date}</p></div><div className="flex flex-wrap gap-2">{item.offeredSubjects.map((subject) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700" key={subject.id}>{subject.subjectName}</span>)}</div><div className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span className="font-semibold text-slate-500">Cost</span><strong className="text-slate-900">{bookingCreditCost} credits</strong></div><button className={buttonClass} disabled={!canManage || alreadyBooked || pending} onClick={onBook} type="button">{alreadyBooked ? "Already booked" : pending ? "Booking…" : "Choose subject and book"}</button></article>;
}

function BookingCard({ item, canManage, pending, onChange, onEditFocus }: { item: SessionBooking; canManage: boolean; pending: string; onChange: (item: SessionBooking, operation: "cancel" | "confirm") => Promise<void>; onEditFocus: (item: SessionBooking) => void }) {
  const active = item.status !== "cancelled";
  const canEditFocus = active && canManage && !item.lessonFocusLocked;
  return <article className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{item.subjectName} · {item.studentFirstName} {item.studentLastName}</h3><Status value={item.status} />{item.lessonFocusLocked ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-blue-700">Attendance recorded</span> : null}</div><p className="mt-1 text-sm text-slate-500">{formatSession(item.startsAt, item.centreTimeZone)} · {item.centreName}</p><p className="mt-1 text-xs font-semibold text-slate-400">Household: {item.parentName} · Current balance {item.walletBalance}{item.queuePosition ? ` · Queue position ${item.queuePosition}` : ""}</p>{item.lessonFocus ? <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Learning focus</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.lessonFocus}</p></div> : <p className="mt-2 text-xs italic text-slate-400">No learning focus has been added.</p>}{active && item.lessonFocusLocked && canManage ? <p className="mt-2 text-xs font-semibold text-slate-600">Cancellation is unavailable after attendance is recorded.</p> : null}</div><div className="flex flex-wrap gap-2">{canEditFocus ? <button className={secondaryButton} disabled={pending !== ""} onClick={() => onEditFocus(item)} type="button">{item.lessonFocus ? "Edit focus" : "Add focus"}</button> : null}{item.status === "credits_required" && canManage ? <button className={buttonClass} disabled={pending !== "" || item.walletBalance < 0} onClick={() => void onChange(item, "confirm")} type="button">Use credits and confirm</button> : null}{canManage && canCancelBooking(item.status, item.lessonFocusLocked) ? <button className={secondaryButton} disabled={pending !== ""} onClick={() => void onChange(item, "cancel")} type="button">Cancel booking</button> : null}</div></article>;
}

function LessonFocusField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const characterCount = lessonFocusCharacterCount(value);
  const tooLong = characterCount > lessonFocusMaximumLength;
  return <label className="grid gap-1.5 text-sm font-bold text-slate-700">Learning focus <span className="font-normal text-slate-400">Optional</span><textarea aria-invalid={tooLong} className={`${selectClass} min-h-28 resize-y ${tooLong ? "border-red-400 focus:border-red-500 focus:ring-red-100" : ""}`} onChange={(event) => onChange(event.target.value)} placeholder="For example: atoms, bonding, or the periodic table" value={value} /><span className={`text-right text-xs font-semibold ${tooLong ? "text-red-600" : "text-slate-400"}`}>{characterCount}/{lessonFocusMaximumLength}{tooLong ? " · shorten this note to continue" : ""}</span></label>;
}

function Status({ value }: { value: SessionBooking["status"] }) { const style = value === "confirmed" ? "bg-emerald-100 text-emerald-700" : value === "cancelled" ? "bg-slate-100 text-slate-600" : value === "credits_required" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"; return <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${style}`}>{value.replaceAll("_", " ")}</span>; }
function Empty({ text }: { text: string }) { return <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">{text}</p>; }
function formatSession(value: string, timeZone: string) { return new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
async function mutate<T>(path: string, method: "POST" | "PUT", body: Record<string, unknown>): Promise<T> { const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" }); const csrf = (await csrfResponse.json().catch(() => ({}))) as { csrfToken?: string; error?: string }; if (!csrfResponse.ok || !csrf.csrfToken) throw new Error(csrf.error ?? "Request verification is unavailable."); const response = await fetch(path, { method, headers: { "content-type": "application/json", "x-csrf-token": csrf.csrfToken }, body: JSON.stringify(body) }); const result = (await response.json().catch(() => ({}))) as T & ApiError; if (!response.ok) throw new Error(result.error ?? "The booking change could not be completed."); return result; }
function message(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
