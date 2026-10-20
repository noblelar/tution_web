"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard/icons";
import type { BookingContext } from "@/lib/booking-types";
import { studentSessionBookingState, type StudentSessionBookingState } from "@/lib/booking-rules";
import type { SessionList, TeachingSession } from "@/lib/session-types";

type ApiError = { error?: string };

export function SessionDirectory({ audience }: { audience: "parent" | "student" }) {
  const [upcoming, setUpcoming] = useState<TeachingSession[]>([]);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [sessionResponse, bookingResponse] = await Promise.all([
          fetch("/api/sessions", { cache: "no-store" }),
          audience === "student" ? fetch("/api/bookings", { cache: "no-store" }) : Promise.resolve(null),
        ]);
        const sessionResult = (await sessionResponse.json().catch(() => ({}))) as SessionList & ApiError;
        if (!sessionResponse.ok) throw new Error(sessionResult.error ?? "Sessions could not be loaded.");

        let nextBookingContext: BookingContext | null = null;
        if (bookingResponse) {
          const bookingResult = (await bookingResponse.json().catch(() => ({}))) as BookingContext & ApiError;
          if (!bookingResponse.ok) throw new Error(bookingResult.error ?? "Your booking access could not be loaded.");
          nextBookingContext = bookingResult;
        }

        const now = Date.now();
        const participant = nextBookingContext?.participants[0];
        const available = (sessionResult.sessions ?? []).filter((item) => (
          item.status === "published"
          && new Date(item.endsAt).getTime() > now
          && (!participant || item.centreId === participant.centreId)
        ));
        if (!cancelled) {
          setUpcoming(available);
          setBookingContext(nextBookingContext);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Sessions could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [audience]);

  const participant = bookingContext?.participants[0];
  const activeBookings = useMemo(() => new Map(
    (bookingContext?.bookings ?? [])
      .filter((booking) => booking.status !== "cancelled" && (!participant || booking.studentProfileId === participant.studentProfileId))
      .map((booking) => [booking.sessionId, booking]),
  ), [bookingContext, participant]);
  const walletBalances = participant?.wallets.map((wallet) => wallet.balanceCredits) ?? [];
  const bookableCount = audience === "student" && participant ? upcoming.filter((session) => studentSessionBookingState({
    hasActiveBooking: activeBookings.has(session.id),
    canManageOwnBookings: participant.canManageOwnBookings,
    walletBalances,
    effectiveBookingDeadlineAt: session.effectiveBookingDeadlineAt,
  }) === "bookable").length : upcoming.length;

  return (
    <main className="mx-auto min-h-full w-full max-w-[90rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">{audience} area</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Sessions</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">Explore the published two-hour teaching programme, see the available subjects, and move into booking with the right session already selected.</p></div>
        {!loading && !error ? <div className="flex gap-3"><Metric label="Upcoming" value={upcoming.length} /><Metric label={audience === "student" ? "Ready to book" : "Published"} value={bookableCount} /></div> : null}
      </header>

      {audience === "student" && !loading && !error && participant ? (
        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-6" aria-label="Student session access">
          <Summary icon="users" label="Student" value={`${participant.firstName} ${participant.lastName}`} detail={participant.peopleCode} />
          <Summary icon="calendar" label="Centre" value={participant.centreName} detail="Sessions are limited to your assigned centre" />
          <Summary icon="check" label="Self-booking" value={participant.canManageOwnBookings ? "Enabled" : "Managed for you"} detail={participant.canManageOwnBookings ? "You can create and manage your own bookings" : "A parent or the centre manages new bookings"} />
        </section>
      ) : null}

      {loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Loading available sessions">{Array.from({ length: 3 }, (_, index) => <div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" key={index} />)}</div> : null}
      {error ? <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {audience === "student" && !loading && !error && !participant ? <EmptyState title="Student booking access is unavailable" description="Your student profile is not connected to an active centre booking record. Ask the centre team to review your account." /> : null}

      {!loading && !error && (audience !== "student" || participant) ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Published sessions">
          {upcoming.length ? upcoming.map((item) => {
            const state = audience === "student" && participant ? studentSessionBookingState({
              hasActiveBooking: activeBookings.has(item.id),
              canManageOwnBookings: participant.canManageOwnBookings,
              walletBalances,
              effectiveBookingDeadlineAt: item.effectiveBookingDeadlineAt,
            }) : undefined;
            return <SessionCard audience={audience} item={item} key={item.id} state={state} />;
          }) : <EmptyState title="No published sessions yet" description="New sessions will appear here after your centre publishes them." />}
        </section>
      ) : null}
    </main>
  );
}

function SessionCard({ item, audience, state }: { item: TeachingSession; audience: "parent" | "student"; state?: StudentSessionBookingState }) {
  const formatter = new Intl.DateTimeFormat("en-GB", { timeZone: item.centreTimeZone, weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: item.centreTimeZone, hour: "2-digit", minute: "2-digit" });
  const stateCopy = state ? studentSessionStateCopy(state) : null;
  const primary = state === undefined || state === "bookable";
  return (
    <article className={`flex flex-col gap-5 rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${state === "already_booked" ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.14em] text-orange-600">{item.centreName}</p><h2 className="mt-1 text-xl font-black text-slate-950">Teaching session</h2></div>{stateCopy ? <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${stateCopy.style}`}>{stateCopy.label}</span> : null}</div>
      <div className="rounded-2xl bg-slate-950 p-4 text-white"><p className="flex items-center gap-2 text-sm font-semibold"><Icon name="calendar" size={17} />{formatter.format(new Date(item.startsAt))}</p><p className="mt-2 flex items-center gap-2 text-xs text-slate-300"><Icon name="clock" size={15} />Ends {timeFormatter.format(new Date(item.endsAt))} · 2 hours</p></div>
      <div className="grid gap-2" aria-label="Subjects available to book">
        {item.offeredSubjects.map((offering) => <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3" key={offering.id}><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-900">{offering.subjectName}</strong><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{offering.subjectCode}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{offering.tutors.length ? offering.tutors.map((tutor) => tutor.name).join(", ") : "Tutor to be assigned"}</p></div>)}
      </div>
      <div className="mt-auto space-y-3"><div className="rounded-xl border border-slate-100 bg-slate-50 p-3"><p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Booking deadline</p><p className="mt-1 text-sm font-semibold text-slate-700">{formatDeadline(item.effectiveBookingDeadlineAt, item.centreTimeZone)}</p>{stateCopy ? <p className="mt-2 text-xs leading-5 text-slate-500">{stateCopy.description}</p> : null}</div><Link className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-center text-sm font-black transition ${primary ? "border-orange-600 bg-orange-600 text-white hover:bg-orange-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`} href={`/app/${audience}/bookings?sessionId=${encodeURIComponent(item.id)}`}>{state === "already_booked" ? "Review booking" : state === "bookable" || !state ? "Open booking controls" : "View booking details"}<Icon name="chevronRight" size={16} /></Link></div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="min-w-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm"><strong className="block text-2xl font-black tabular-nums text-slate-950">{value.toLocaleString("en-GB")}</strong><span className="text-xs font-semibold text-slate-500">{label}</span></div>;
}

function Summary({ icon, label, value, detail }: { icon: "users" | "calendar" | "check"; label: string; value: string; detail: string }) {
  return <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-700"><Icon name={icon} /></span><div><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 font-bold text-slate-950">{value}</p><p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p></div></div>;
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center md:col-span-2 xl:col-span-3"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm"><Icon name="calendar" /></span><h2 className="mt-4 text-xl font-black text-slate-900">{title}</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p></div>;
}

function studentSessionStateCopy(state: StudentSessionBookingState) {
  return {
    bookable: { label: "Ready to book", description: "Your self-booking access and household credit are ready.", style: "bg-emerald-100 text-emerald-800" },
    already_booked: { label: "Booked", description: "You already have an active booking for this session.", style: "bg-emerald-100 text-emerald-800" },
    booking_closed: { label: "Booking closed", description: "The booking deadline has passed. Existing bookings remain visible.", style: "bg-slate-100 text-slate-700" },
    managed_by_parent_or_centre: { label: "Managed booking", description: "A parent or the centre team manages bookings for this account.", style: "bg-sky-100 text-sky-800" },
    household_credit_unavailable: { label: "Credit unavailable", description: "No active household credit source is connected to this student.", style: "bg-amber-100 text-amber-900" },
    household_in_debit: { label: "Credit required", description: "The connected household credit is in debit, so another booking cannot be created.", style: "bg-amber-100 text-amber-900" },
  }[state];
}

function formatDeadline(value: string, timeZone: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-GB", { timeZone, day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
