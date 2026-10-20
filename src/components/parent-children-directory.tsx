"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { BookingContext, SessionBooking } from "@/lib/booking-types";
import { buildParentChildDirectory, filterParentChildDirectory, parentChildDirectoryMetrics, type ParentChildDirectoryItem } from "@/lib/parent-children-rules";

type ApiError = { error?: string };

const secondaryButton = "inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50";
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100";

export function ParentChildrenDirectory() {
  const [context, setContext] = useState<BookingContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [centreId, setCentreId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" });
      const result = (await response.json().catch(() => ({}))) as BookingContext & ApiError;
      if (!response.ok) throw new Error(result.error ?? "Linked children could not be loaded.");
      setContext(result);
    } catch (caught) {
      setContext(null);
      setError(caught instanceof Error ? caught.message : "Linked children could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const children = useMemo(() => buildParentChildDirectory(context?.participants ?? [], context?.bookings ?? []), [context]);
  const filtered = useMemo(() => filterParentChildDirectory(children, search, centreId), [centreId, children, search]);
  const metrics = useMemo(() => parentChildDirectoryMetrics(children), [children]);
  const centres = useMemo(
    () => Array.from(
      new Map<string, string>(
        children.map((child) => [child.centreId, child.centreName] as const),
      ).entries(),
    ).sort((left, right) => left[1].localeCompare(right[1])),
    [children],
  );

  return (
    <main className="management-shell">
      <header className="management-header">
        <div><p className="eyebrow">Parent area</p><h1>Children</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">View every actively linked student, their next tuition session, household credits, and booking activity.</p></div>
        <button className={secondaryButton} disabled={loading} onClick={() => void load()} type="button">{loading ? "Refreshing…" : "Refresh"}</button>
      </header>

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState error={error} onRetry={() => void load()} /> : null}

      {!loading && !error && context ? children.length ? (
        <div className="grid gap-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Children overview">
            <Metric label="Linked children" value={metrics.children} detail="Active guardian links" />
            <Metric label="Centres" value={metrics.centres} detail="Across your household" />
            <Metric label="Upcoming bookings" value={metrics.upcomingBookings} detail="All linked children" />
            <Metric label="Needs credits" value={metrics.bookingsRequiringCredits} detail={metrics.bookingsRequiringCredits ? "Review required" : "Nothing outstanding"} warning={metrics.bookingsRequiringCredits > 0} />
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="child-search">Search<input className={inputClass} id="child-search" onChange={(event) => setSearch(event.target.value)} placeholder="Name or people code" type="search" value={search} /></label>
            <label className="grid gap-2 text-sm font-bold text-slate-700" htmlFor="child-centre">Centre<select className={inputClass} id="child-centre" onChange={(event) => setCentreId(event.target.value)} value={centreId}><option value="">All centres</option>{centres.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
          </section>

          <section className="grid gap-5 lg:grid-cols-2" aria-label="Linked children">
            {filtered.length ? filtered.map((child) => <ChildCard child={child} key={child.studentProfileId} />) : <NoResults onClear={() => { setSearch(""); setCentreId(""); }} />}
          </section>
        </div>
      ) : <EmptyState /> : null}
    </main>
  );
}

function ChildCard({ child }: { child: ParentChildDirectoryItem }) {
  const bookingHref = `/app/parent/bookings?studentId=${encodeURIComponent(child.studentProfileId)}`;
  const feedbackHref = `/app/parent/feedback?centreId=${encodeURIComponent(child.centreId)}&tab=queries`;
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-black text-orange-800">{initials(child.firstName, child.lastName)}</span><div className="min-w-0"><h2 className="truncate text-lg font-black text-slate-950">{child.firstName} {child.lastName}</h2><p className="mt-1 truncate text-sm text-slate-500">{child.peopleCode} · {child.centreName}</p></div></div>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${child.hasLoginAccount ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>{child.hasLoginAccount ? "Student login active" : "Guardian managed"}</span>
      </div>
      <div className="grid gap-4 p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <SmallMetric label="Household credits" value={child.wallets.length ? String(child.walletBalance) : "—"} />
          <SmallMetric label="Upcoming" value={String(child.upcomingBookings.length)} />
          <SmallMetric label="Needs credits" value={String(child.bookingsRequiringCredits)} warning={child.bookingsRequiringCredits > 0} />
        </div>
        {child.nextBooking ? <NextBooking booking={child.nextBooking} /> : <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No upcoming booking has been made for this student.</p>}
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Link className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-orange-700" href={bookingHref}>View bookings</Link>
          <Link className={secondaryButton} href="/app/parent/sessions">Find a session</Link>
          <Link className={secondaryButton} href={feedbackHref}>Feedback &amp; queries</Link>
          <Link className={secondaryButton} href="/app/parent/credits">Credits</Link>
        </div>
      </div>
    </article>
  );
}

function NextBooking({ booking }: { booking: SessionBooking }) {
  return <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-orange-700">Next session</p><h3 className="mt-1 font-black text-slate-950">{booking.subjectName}</h3><p className="mt-1 text-sm text-slate-600">{formatSession(booking.startsAt, booking.endsAt, booking.centreTimeZone)}</p></div><BookingStatus status={booking.status} /></div>{booking.lessonFocus ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600"><span className="font-bold">Learning focus:</span> {booking.lessonFocus}</p> : null}</div>;
}

function Metric({ label, value, detail, warning = false }: { label: string; value: number; detail: string; warning?: boolean }) { return <article className={`rounded-2xl border p-5 shadow-sm ${warning ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}><p className={`text-xs font-black uppercase tracking-[0.13em] ${warning ? "text-amber-700" : "text-slate-400"}`}>{label}</p><p className="mt-3 text-4xl font-black text-slate-950">{value}</p><p className="mt-2 text-sm font-semibold text-slate-500">{detail}</p></article>; }
function SmallMetric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) { return <div className={`rounded-xl p-3 ${warning ? "bg-amber-50" : "bg-slate-50"}`}><p className={`text-[10px] font-black uppercase tracking-wide ${warning ? "text-amber-700" : "text-slate-400"}`}>{label}</p><p className="mt-1 text-xl font-black text-slate-950">{value}</p></div>; }
function BookingStatus({ status }: { status: SessionBooking["status"] }) { const style = status === "confirmed" ? "bg-emerald-100 text-emerald-800" : status === "waitlisted" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"; return <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${style}`}>{status.replaceAll("_", " ")}</span>; }
function LoadingState() { return <div className="grid animate-pulse gap-6" aria-label="Loading linked children" role="status"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div className="h-32 rounded-2xl bg-slate-200" key={index} />)}</div><div className="grid gap-5 lg:grid-cols-2"><div className="h-80 rounded-2xl bg-slate-200" /><div className="h-80 rounded-2xl bg-slate-200" /></div></div>; }
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) { return <section className="rounded-2xl border border-red-200 bg-red-50 p-5" role="alert"><h2 className="font-black text-red-900">Children could not be loaded</h2><p className="mt-1 text-sm text-red-700">{error}</p><button className={`${secondaryButton} mt-4`} onClick={onRetry} type="button">Try again</button></section>; }
function EmptyState() { return <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-xl font-black text-orange-800">0</span><h2 className="mt-4 text-xl font-black text-slate-950">No linked children are available</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Ask the centre to confirm your guardian-to-student link. Children appear here after that link is active.</p><Link className="mt-5 inline-flex rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-black text-white" href="/app/parent/feedback?tab=queries">Contact the centre</Link></section>; }
function NoResults({ onClear }: { onClear: () => void }) { return <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center lg:col-span-2"><h2 className="text-lg font-black text-slate-900">No children match these filters</h2><p className="mt-1 text-sm text-slate-500">Try a different name, people code, or centre.</p><button className={`${secondaryButton} mt-4`} onClick={onClear} type="button">Clear filters</button></div>; }
function initials(firstName: string, lastName: string) { return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || "S"; }
function formatSession(startsAt: string, endsAt: string, timeZone: string) { const date = new Date(startsAt); const dateText = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(date); const time = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }); return `${dateText} · ${time.format(date)}–${time.format(new Date(endsAt))}`; }
