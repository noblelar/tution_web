"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard/icons";
import { FormDialog } from "@/components/ui/form-dialog";
import type { BookingContext, SessionBooking } from "@/lib/booking-types";
import { balanceAfterConfirmedBooking, bookingCreditCost, canCancelBooking, lessonFocusCharacterCount, lessonFocusMaximumLength, normalizeLessonFocus, preferredBookingWallet, studentSessionBookingState } from "@/lib/booking-rules";
import type { SessionList, TeachingSession } from "@/lib/session-types";

type ApiError = { error?: string };
type Dialog = "book" | "focus" | "cancel" | null;

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
  const [cancellationBooking, setCancellationBooking] = useState<SessionBooking | null>(null);
  const [requestedSessionId, setRequestedSessionId] = useState("");
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
    const participants = bookingResult.participants ?? [];
    const requestedStudentId = new URLSearchParams(window.location.search).get("studentId")?.trim() ?? "";
    const requestedSession = new URLSearchParams(window.location.search).get("sessionId")?.trim() ?? "";
    const first = participants.find((item) => item.studentProfileId === requestedStudentId) ?? participants[0];
    setStudentId((current) => participants.some((item) => item.studentProfileId === current) ? current : first?.studentProfileId || "");
    setWalletParentId((current) => preferredBookingWallet(first?.wallets ?? [], current)?.parentProfileId ?? "");
    setRequestedSessionId(requestedSession);
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
  const wallet = participant?.wallets.find((item) => item.parentProfileId === walletParentId) ?? preferredBookingWallet(participant?.wallets ?? []);
  const participantCentreId = participant?.centreId;
  const existing = useMemo(() => new Set((context?.bookings ?? []).filter((item) => item.status !== "cancelled").map((item) => `${item.sessionId}:${item.studentProfileId}`)), [context]);
  const available = sessions
    .filter((item) => item.status === "published" && item.offeredSubjects.length > 0 && (!participantCentreId || item.centreId === participantCentreId))
    .sort((left, right) => Number(right.id === requestedSessionId) - Number(left.id === requestedSessionId) || new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime());
  const shownBookings = (context?.bookings ?? []).filter((item) => !participant || item.studentProfileId === participant.studentProfileId);
  const canManage = audience === "parent" || Boolean(participant?.canManageOwnBookings);
  const lessonFocusTooLong = lessonFocusCharacterCount(lessonFocus) > lessonFocusMaximumLength;

  function selectStudent(next: string) {
    setStudentId(next);
    const nextParticipant = context?.participants.find((item) => item.studentProfileId === next);
    setWalletParentId(preferredBookingWallet(nextParticipant?.wallets ?? [])?.parentProfileId ?? "");
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

  function openCancellation(item: SessionBooking) {
    setCancellationBooking(item);
    setDialog("cancel");
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
      await mutate<SessionBooking>(`/api/bookings/${encodeURIComponent(item.id)}?operation=${operation}`, "POST", operation === "cancel" ? { reason: audience === "student" ? "Cancelled by student" : "Cancelled by the account holder" } : {});
      if (operation === "cancel") {
        setDialog(null);
        setCancellationBooking(null);
      }
      setNotice(operation === "cancel" ? (item.status === "confirmed" ? "The booking was cancelled and two booking credits were returned." : "The booking was cancelled. No credits had been used for this booking.") : "The waiting booking is now confirmed and two credits were used.");
      await load();
    } catch (caught) { setError(message(caught, operation === "cancel" ? "The booking could not be cancelled." : "The waiting booking could not be confirmed.")); }
    finally { setPending(""); }
  }

  function closeDialog() {
    if (pending) return;
    setDialog(null); setBookingSession(null); setFocusBooking(null); setCancellationBooking(null); setSessionSubjectId(""); setLessonFocus(""); setError("");
  }

  return (
    <main className="mx-auto min-h-full w-full max-w-[90rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">{audience} area</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Bookings</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Book a published two-hour session, choose one offered subject, and optionally tell the tutor what {audience === "student" ? "you want" : "the student wants"} to focus on.</p></header>
      {loading ? <div className="grid gap-5" aria-busy="true" aria-label="Loading bookings"><div className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-white" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div className="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white" key={index} />)}</div></div> : null}
      {error && !dialog ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}
      {!loading && context ? (
        <div className="grid gap-6">
          {context.participants.length === 0 ? <Empty text="No active student booking profile is connected to this account. Ask the centre team to review the account." /> : audience === "student" && participant ? (
            <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6" aria-label="Your booking access">
              <BookingSummary icon="users" label="Student" value={`${participant.firstName} ${participant.lastName}`} detail={participant.peopleCode} />
              <BookingSummary icon="calendar" label="Centre" value={participant.centreName} detail="Only sessions at this centre are shown" />
              <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wide text-slate-400">Booking credit</p>{participant.wallets.length > 1 ? <select aria-label="Booking credit source" className={`${selectClass} mt-2`} onChange={(event) => setWalletParentId(event.target.value)} value={wallet?.parentProfileId ?? ""}>{participant.wallets.map((item, index) => <option key={item.parentProfileId} value={item.parentProfileId}>Credit source {index + 1} · {item.balanceCredits} credits</option>)}</select> : <p className="mt-2 text-2xl font-black tabular-nums text-slate-950">{wallet ? `${wallet.balanceCredits} credits` : "Unavailable"}</p>}<p className="mt-2 text-xs leading-5 text-slate-500">Guardian identities are not displayed in the student workspace.</p></div>
              {!participant.canManageOwnBookings ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 sm:col-span-3">Self-managed bookings are not enabled. You can review existing bookings, but a parent or the centre must create and change them.</p> : null}
              {participant.canManageOwnBookings && !wallet ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900 sm:col-span-3">No active household credit source is connected. Ask the centre team to review your guardian link.</p> : null}
              {wallet && wallet.balanceCredits < 0 ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-3">The selected household credit source is in debit. Add credit before making another booking.</p> : null}
            </section>
          ) : (
            <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-slate-700">Student<select className={selectClass} onChange={(event) => selectStudent(event.target.value)} value={studentId}>{context.participants.map((item) => <option key={item.studentProfileId} value={item.studentProfileId}>{item.firstName} {item.lastName} · {item.centreName}</option>)}</select></label>
              <label className="grid gap-1.5 text-sm font-bold text-slate-700">Household wallet<select className={selectClass} onChange={(event) => setWalletParentId(event.target.value)} value={wallet?.parentProfileId ?? ""}>{participant?.wallets.map((item) => <option key={item.parentProfileId} value={item.parentProfileId}>{item.parentName} · {item.balanceCredits} credits</option>)}</select></label>
              {wallet && wallet.balanceCredits < 0 ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 sm:col-span-2">This household wallet is in debit. Add credit before making another booking.</p> : null}
            </section>
          )}

          {participant ? <section className="grid gap-4" id="available-sessions"><div><h2 className="text-xl font-black text-slate-950">Available sessions</h2><p className="mt-1 text-sm text-slate-500">Choose one subject from the programme. A balance of zero may confirm one session and become −2.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{available.length ? available.map((item) => {
            const bookingState = studentSessionBookingState({ hasActiveBooking: existing.has(`${item.id}:${participant.studentProfileId}`), canManageOwnBookings: canManage, walletBalances: wallet ? [wallet.balanceCredits] : [], effectiveBookingDeadlineAt: item.effectiveBookingDeadlineAt });
            return <SessionOption featured={item.id === requestedSessionId} item={item} key={item.id} pending={pending === "book" && bookingSession?.id === item.id} state={bookingState} onBook={() => openBooking(item)} />;
          }) : <Empty text="No published sessions are currently available for this student’s centre." />}</div></section> : null}

          {participant ? <section className="grid gap-4"><div><h2 className="text-xl font-black text-slate-950">{audience === "student" ? "My bookings" : "Booking history"}</h2><p className="mt-1 text-sm text-slate-500">Learning-focus notes remain editable until attendance is recorded. Cancellation is permanently blocked as soon as attendance is marked.</p></div><div className="grid gap-3">{shownBookings.length ? shownBookings.map((item) => <BookingCard audience={audience} item={item} canManage={audience === "parent" || Boolean(participant.canManageOwnBookings)} key={item.id} pending={pending} onCancel={openCancellation} onChange={changeBooking} onEditFocus={openFocus} />) : <Empty text="No bookings have been made yet." />}</div></section> : null}
        </div>
      ) : null}

      <FormDialog open={dialog === "book"} title="Book session" description={`Choose exactly one subject. The optional learning focus helps the tutor prepare for ${audience === "student" ? "you" : "this student"}.`} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <form className="grid gap-4 p-5" onSubmit={book}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-black uppercase tracking-wide text-orange-600">{bookingSession?.centreName}</p><p className="mt-1 text-sm font-bold text-slate-900">{bookingSession ? formatSession(bookingSession.startsAt, bookingSession.centreTimeZone) : ""}</p></div>
          <label className="grid gap-1.5 text-sm font-bold text-slate-700">Subject<select className={selectClass} onChange={(event) => setSessionSubjectId(event.target.value)} required value={sessionSubjectId}>{bookingSession?.offeredSubjects.map((item) => <option key={item.id} value={item.id}>{item.subjectName} ({item.subjectCode})</option>)}</select></label>
          {wallet ? <div className="grid grid-cols-2 gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm"><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">Current credit</p><p className="mt-1 text-xl font-black tabular-nums text-slate-950">{wallet.balanceCredits}</p></div><div><p className="text-xs font-bold uppercase tracking-wide text-orange-700">If confirmed</p><p className="mt-1 text-xl font-black tabular-nums text-slate-950">{balanceAfterConfirmedBooking(wallet.balanceCredits)}</p></div><p className="col-span-2 text-xs leading-5 text-slate-600">A full session joins the waiting list without using credits. Two credits are used only when the booking is confirmed.</p></div> : null}
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

      <FormDialog open={dialog === "cancel"} title="Cancel booking?" description="Review the booking before confirming this change." onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <div className="grid gap-4 p-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-black text-slate-950">{cancellationBooking?.subjectName}</p><p className="mt-1 text-sm text-slate-600">{cancellationBooking ? formatSession(cancellationBooking.startsAt, cancellationBooking.centreTimeZone) : ""}</p></div>
          <p className="text-sm leading-6 text-slate-600">{cancellationBooking?.status === "confirmed" ? "Cancelling before attendance is recorded returns the two booking credits to the household credit source." : "This booking has not used any credits, so cancelling it will not create a refund."}</p>
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Once any attendance result is recorded, this action is no longer available.</p>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={Boolean(pending)} onClick={closeDialog} type="button">Keep booking</button><button className="rounded-xl border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={Boolean(pending) || !cancellationBooking} onClick={() => { if (cancellationBooking) void changeBooking(cancellationBooking, "cancel"); }} type="button">{pending ? "Cancelling…" : "Confirm cancellation"}</button></div>
        </div>
      </FormDialog>
    </main>
  );
}

function SessionOption({ item, state, featured, pending, onBook }: { item: TeachingSession; state: ReturnType<typeof studentSessionBookingState>; featured: boolean; pending: boolean; onBook: () => void }) {
  const date = formatSession(item.startsAt, item.centreTimeZone);
  const copy = sessionActionCopy(state);
  return <article className={`grid gap-4 rounded-3xl border bg-white p-5 shadow-sm ${featured ? "border-orange-400 ring-4 ring-orange-100" : "border-slate-200"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">{item.centreName}</p><h3 className="mt-1 text-xl font-black text-slate-950">{item.offeredSubjects.length} subject{item.offeredSubjects.length === 1 ? "" : "s"} available</h3><p className="mt-2 text-sm font-semibold text-slate-700">{date}</p></div>{featured ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-bold text-orange-800">Selected</span> : null}</div><div className="flex flex-wrap gap-2">{item.offeredSubjects.map((subject) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700" key={subject.id}>{subject.subjectName}</span>)}</div><div className="grid gap-2 rounded-xl bg-slate-50 p-3 text-sm"><div className="flex items-center justify-between"><span className="font-semibold text-slate-500">Cost</span><strong className="text-slate-900">{bookingCreditCost} credits</strong></div><p className="text-xs leading-5 text-slate-500">{copy.description}</p></div><button className={buttonClass} disabled={state !== "bookable" || pending} onClick={onBook} type="button">{pending ? "Booking…" : copy.action}</button></article>;
}

function BookingCard({ item, audience, canManage, pending, onChange, onCancel, onEditFocus }: { item: SessionBooking; audience: "parent" | "student"; canManage: boolean; pending: string; onChange: (item: SessionBooking, operation: "cancel" | "confirm") => Promise<void>; onCancel: (item: SessionBooking) => void; onEditFocus: (item: SessionBooking) => void }) {
  const active = item.status !== "cancelled";
  const canEditFocus = active && canManage && !item.lessonFocusLocked;
  return <article className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950">{item.subjectName}{audience === "parent" ? ` · ${item.studentFirstName} ${item.studentLastName}` : ""}</h3><Status value={item.status} />{item.lessonFocusLocked ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-blue-700">Attendance recorded</span> : null}</div><p className="mt-1 text-sm text-slate-500">{formatSession(item.startsAt, item.centreTimeZone)} · {item.centreName}</p><p className="mt-1 text-xs font-semibold text-slate-400">{audience === "parent" ? `Household: ${item.parentName} · ` : ""}Current booking credit balance {item.walletBalance}{item.queuePosition ? ` · Queue position ${item.queuePosition}` : ""}</p>{item.lessonFocus ? <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50/60 px-3 py-2"><p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Learning focus</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.lessonFocus}</p></div> : <p className="mt-2 text-xs italic text-slate-400">No learning focus has been added.</p>}{active && item.lessonFocusLocked ? <p className="mt-2 text-xs font-semibold text-slate-600">Attendance has been recorded. The learning focus and cancellation are now locked.</p> : null}</div><div className="flex flex-wrap gap-2">{canEditFocus ? <button className={secondaryButton} disabled={pending !== ""} onClick={() => onEditFocus(item)} type="button">{item.lessonFocus ? "Edit focus" : "Add focus"}</button> : null}{item.status === "credits_required" && canManage ? <button className={buttonClass} disabled={pending !== "" || item.walletBalance < 0} onClick={() => void onChange(item, "confirm")} type="button">Use credits and confirm</button> : null}{canManage && canCancelBooking(item.status, item.lessonFocusLocked) ? <button className={secondaryButton} disabled={pending !== ""} onClick={() => onCancel(item)} type="button">Cancel booking</button> : null}</div></article>;
}

function BookingSummary({ icon, label, value, detail }: { icon: "users" | "calendar"; label: string; value: string; detail: string }) {
  return <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-700"><Icon name={icon} /></span><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div></div>;
}

function sessionActionCopy(state: ReturnType<typeof studentSessionBookingState>) {
  return {
    bookable: { action: "Choose subject and book", description: "Booking is open and the selected credit source can be used." },
    already_booked: { action: "Already booked", description: "An active booking already exists for this student and session." },
    booking_closed: { action: "Booking closed", description: "The booking deadline for this session has passed." },
    managed_by_parent_or_centre: { action: "Managed for you", description: "A parent or the centre team manages bookings for this student." },
    household_credit_unavailable: { action: "Credit unavailable", description: "An active household credit source is required before booking." },
    household_in_debit: { action: "Credit required", description: "The selected household credit source is in debit." },
  }[state];
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
