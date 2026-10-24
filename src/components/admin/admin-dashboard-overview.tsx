"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { topSubjectBuckets } from "@/lib/admin-dashboard-chart-rules";
import { dashboardActions, type DashboardAction } from "@/lib/admin-dashboard-alert-rules";
import type { AdminDashboard, DashboardBucket, DashboardWeeklyPoint } from "@/lib/admin-dashboard-types";

type Filters = { centreId: string; from: string; through: string; academicYearId: string };
const emptyFilters: Filters = { centreId: "", from: "", through: "", academicYearId: "" };

export function AdminDashboardOverview() {
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [refresh, setRefresh] = useState(0);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (applied.centreId) query.set("centreId", applied.centreId);
    if (applied.from) query.set("from", applied.from);
    if (applied.through) query.set("through", applied.through);
    if (applied.academicYearId) query.set("academicYearId", applied.academicYearId);
    const suffix = query.size ? `?${query.toString()}` : "";
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await fetch(`/api/admin/dashboard${suffix}`, { cache: "no-store", signal: controller.signal });
        const body = await result.json() as AdminDashboard & { error?: string };
        if (!result.ok) throw new Error(body.error || "Dashboard could not be loaded.");
        setDashboard(body);
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Dashboard could not be loaded.");
        setDashboard(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [applied, refresh]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.from && draft.through && draft.through < draft.from) {
      setError("The end date must not be before the start date.");
      return;
    }
    setApplied({ ...draft });
  }

  const counts = dashboard?.counts;
  const occupancy = counts && counts.capacitySeats > 0
    ? Math.round((counts.occupiedSeats / counts.capacitySeats) * 100)
    : null;
  const actions = dashboard ? dashboardActions(dashboard.alerts) : [];

  return (
    <main className="admin-main mx-auto max-w-7xl space-y-7 px-4 py-8 text-slate-900 sm:px-6 lg:px-8" aria-labelledby="admin-dashboard-title">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 id="admin-dashboard-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Overview</h1>
        </div>
        <button type="button" onClick={() => setRefresh((value) => value + 1)} disabled={loading} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:border-orange-400 disabled:opacity-50">Refresh data</button>
      </header>

      <form onSubmit={applyFilters} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] lg:items-end" aria-label="Dashboard filters">
        <label className="grid gap-1 text-sm font-medium text-slate-700">Centre
          <select value={draft.centreId} onChange={(event) => setDraft({ ...draft, centreId: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
            <option value="">{dashboard?.scope === "organization" ? "All centres" : "All assigned centres"}</option>
            {dashboard?.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Academic year
          <select value={draft.academicYearId} onChange={(event) => setDraft({ ...draft, academicYearId: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900">
            <option value="">Current or latest</option>
            {dashboard?.academicYears.map((year) => <option key={year.id} value={year.id}>{year.name}{year.status === "current" ? " · current" : ""}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">From
          <input type="date" value={draft.from} onChange={(event) => setDraft({ ...draft, from: event.target.value })} placeholder={dashboard?.from} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">Through
          <input type="date" value={draft.through} onChange={(event) => setDraft({ ...draft, through: event.target.value })} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3" />
        </label>
        <button type="submit" className="min-h-11 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white hover:bg-orange-700">Apply</button>
      </form>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {loading && <p role="status" className="text-sm text-slate-600">Loading live dashboard data…</p>}

      {dashboard && !loading && <>
        {dashboard.centres.length === 0 && dashboard.scope === "organization" && (
          <div role="alert" className="rounded-2xl border border-orange-300 bg-orange-50 p-5 text-orange-950">
            <h2 className="font-semibold">A centre must be created</h2>
            <p className="mt-1 text-sm">Your dashboard is available, but centre-dependent operations cannot begin until a centre exists.</p>
            <Link href="/app/admin/centres" className="mt-3 inline-block text-sm font-semibold underline">Manage centres</Link>
          </div>
        )}
        <p className="text-xs text-slate-500">Showing {dashboard.from} through {dashboard.through} · {dashboard.timeZone} · Updated {new Date(dashboard.generatedAt).toLocaleString("en-GB", { timeZone: dashboard.timeZone })}</p>

        <section aria-labelledby="dashboard-actions-title" className="space-y-4">
          <div>
            <h2 id="dashboard-actions-title" className="text-xl font-semibold">Needs attention</h2>
            <p className="text-sm text-slate-600">Current activation, email-delivery, and family-query work in your authorized centres. These counts are not limited by the chart date range; a pending account may also have a failed email.</p>
          </div>
          {actions.length === 0 ? (
            <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">No pending activation, failed invitation delivery, or unresolved query needs attention in the active centres shown.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {actions.map((action) => <ActionCard key={action.key} action={action} timeZone={dashboard.timeZone} />)}
            </div>
          )}
        </section>

        <DashboardSection title="People and centres" description="Current active records in the selected scope.">
          <Metric label="Active students" value={counts!.activeStudents} href="/app/admin/students" />
          <Metric label="Active tutors" value={counts!.activeTutors} href="/app/admin/tutors" />
          <Metric label="Active centres" value={counts!.activeCentres} href="/app/admin/centres" />
        </DashboardSection>

        <DashboardSection title="Upcoming teaching" description="Published sessions only; today follows the reporting time zone.">
          <Metric label="Sessions today" value={counts!.sessionsToday} href="/app/admin/sessions" />
          <Metric label="Next 7 days" value={counts!.sessionsNext7Days} href="/app/admin/schedule" />
        </DashboardSection>

        <DashboardSection title="Booking demand" description="Bookings for published or completed sessions within the selected date range.">
          <Metric label="Confirmed" value={counts!.confirmedBookings} href="/app/admin/bookings" />
          <Metric label="Waitlisted" value={counts!.waitlistedBookings} href="/app/admin/bookings" />
          <Metric label="Credits required" value={counts!.creditsRequiredBookings} href="/app/admin/bookings" />
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Capacity usage</p>
            <strong className="mt-3 block text-3xl font-semibold">{occupancy === null ? "Not available" : `${occupancy}%`}</strong>
            <p className="mt-2 text-xs text-slate-500">{counts!.capacitySessions} sessions with a capacity set · {counts!.occupiedSeats} of {counts!.capacitySeats} seats confirmed</p>
          </article>
        </DashboardSection>

        <section aria-labelledby="dashboard-insights-title" className="space-y-4">
          <div>
            <h2 id="dashboard-insights-title" className="text-xl font-semibold">Demographics and teaching</h2>
            <p className="text-sm text-slate-600">Aggregate patterns for the selected centre scope; no individual student details are shown.</p>
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartPanel title="Attendance outcomes" subtitle="Recorded results for sessions at least one hour past their end in the selected period. Unrecorded bookings are excluded.">
              <BucketBars items={dashboard.charts.attendance} emptyText="No recorded attendance in this period." tone="orange" />
            </ChartPanel>
            <ChartPanel title="Student age bands" subtitle={`Active students, age as of ${new Date(dashboard.generatedAt).toLocaleDateString("en-GB", { timeZone: dashboard.timeZone })}.`}>
              <BucketBars items={dashboard.charts.ageBands} emptyText="No active student profiles in this scope." tone="blue" />
            </ChartPanel>
            <ChartPanel title="Academic levels" subtitle={dashboard.selectedAcademicYearId ? `Active student placements for ${dashboard.academicYears.find((year) => year.id === dashboard.selectedAcademicYearId)?.name ?? "the selected academic year"}; unplaced students shown separately.` : "Choose an academic year to view student placements."}>
              <BucketBars items={dashboard.charts.academicLevels} emptyText={dashboard.selectedAcademicYearId ? "No active students or placements in this scope." : "No academic year is configured."} tone="purple" />
            </ChartPanel>
            <ChartPanel title="Subject demand" subtitle="Confirmed bookings by their selected subject in the date range; each booking is counted once.">
              <BucketBars items={topSubjectBuckets(dashboard.charts.subjectDemand)} emptyText="No confirmed bookings in this period." tone="green" />
            </ChartPanel>
            <div className="xl:col-span-2">
              <ChartPanel title="Weekly teaching and bookings" subtitle="Published or completed sessions by local calendar week, compared with confirmed bookings for those sessions.">
                <WeeklyBars points={dashboard.charts.weeklyTrend} />
              </ChartPanel>
            </div>
          </div>
        </section>
      </>}
    </main>
  );
}

function ActionCard({ action, timeZone }: { action: DashboardAction; timeZone: string }) {
  return <Link href={action.href} className="group block rounded-2xl border border-amber-200 bg-white p-5 shadow-sm transition hover:border-orange-400 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
    <div className="flex items-start justify-between gap-4">
      <h3 className="text-sm font-semibold leading-5 text-slate-900">{action.title}</h3>
      <strong className="rounded-full bg-amber-100 px-2.5 py-1 text-sm tabular-nums text-amber-950" aria-label={`${action.count} items`}>{action.count.toLocaleString("en-GB")}</strong>
    </div>
    <p className="mt-2 text-xs leading-5 text-slate-600">{action.description}</p>
    {action.latestAt && <p className="mt-2 text-xs text-slate-500">Latest failure: {new Date(action.latestAt).toLocaleString("en-GB", { timeZone })}</p>}
    <span className="mt-4 inline-block text-xs font-semibold text-orange-700 group-hover:underline">Open management area →</span>
  </Link>;
}

function DashboardSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <section aria-label={title} className="space-y-4"><div><h2 className="text-xl font-semibold">{title}</h2><p className="text-sm text-slate-600">{description}</p></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div></section>;
}

function Metric({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link href={href} className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md"><p className="text-sm font-medium text-slate-600">{label}</p><strong className="mt-3 block text-3xl font-semibold tabular-nums">{value.toLocaleString("en-GB")}</strong><span className="mt-3 inline-block text-xs font-semibold text-orange-700">View details →</span></Link>;
}

function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h3 className="text-base font-semibold text-slate-900">{title}</h3>
    <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
    <div className="mt-5">{children}</div>
  </article>;
}

function BucketBars({ items, emptyText, tone }: { items: DashboardBucket[]; emptyText: string; tone: "orange" | "blue" | "purple" | "green" }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  if (total === 0) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{emptyText}</p>;
  const colour = { orange: "bg-orange-500", blue: "bg-sky-500", purple: "bg-violet-500", green: "bg-emerald-500" }[tone];
  return <div className="space-y-3">
    {items.map((item) => <div key={item.key}>
      <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-slate-700" title={item.label}>{item.label}</span><strong className="tabular-nums text-slate-900">{item.count.toLocaleString("en-GB")}</strong></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className={`h-full rounded-full ${colour}`} style={{ width: `${(item.count / total) * 100}%` }} /></div>
    </div>)}
    <p className="pt-1 text-xs text-slate-500">Total: {total.toLocaleString("en-GB")}</p>
  </div>;
}

function WeeklyBars({ points }: { points: DashboardWeeklyPoint[] }) {
  if (points.every((point) => point.sessions === 0 && point.confirmedBookings === 0)) {
    return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No published or completed sessions in this period.</p>;
  }
  const maximum = Math.max(1, ...points.flatMap((point) => [point.sessions, point.confirmedBookings]));
  return <div>
    <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-600"><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-orange-500" />Sessions</span><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" />Confirmed bookings</span></div>
    <div className="flex gap-3 overflow-x-auto pb-2" aria-label="Weekly session and confirmed booking counts">
      {points.map((point) => <div key={point.weekStart} className="min-w-20 flex-1 text-center">
        <div className="flex h-36 items-end justify-center gap-1 border-b border-slate-200 px-2" aria-hidden="true">
          <div className="w-5 rounded-t bg-orange-500" style={{ height: `${(point.sessions / maximum) * 100}%` }} />
          <div className="w-5 rounded-t bg-sky-500" style={{ height: `${(point.confirmedBookings / maximum) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-700">{new Date(`${point.weekStart}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })}</p>
        <p className="text-xs tabular-nums text-slate-500">{point.sessions} / {point.confirmedBookings}</p>
      </div>)}
    </div>
    <p className="mt-2 text-xs text-slate-500">Values below each week show sessions / confirmed bookings.</p>
  </div>;
}
