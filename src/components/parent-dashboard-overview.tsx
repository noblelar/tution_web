"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { Icon } from "@/components/dashboard/icons";
import type { IconName } from "@/components/dashboard/icons";
import {
  parentDashboardActionTone,
  parentDashboardBookingStatuses,
  parentDashboardDisplayName,
  parentDashboardPrimaryAction,
  parentDashboardShortcuts,
} from "@/lib/parent-dashboard-rules";
import type {
  ParentDashboard,
  ParentDashboardAction,
  ParentDashboardBooking,
  ParentDashboardCategoryCount,
  ParentDashboardChild,
  ParentDashboardFeedback,
  ParentDashboardNotification,
  ParentDashboardQuery,
} from "@/lib/parent-dashboard-types";

type ApiError = { error?: string };

const secondaryButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-orange-300 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-60";

export function ParentDashboardOverview() {
  const [dashboard, setDashboard] = useState<ParentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);

  const loadDashboard = useCallback((signal: AbortSignal) => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/parent/dashboard", {
          cache: "no-store",
          signal,
        });
        const result = await response.json().catch(() => ({})) as ParentDashboard & ApiError;
        if (!response.ok) {
          throw new Error(result.error || "Your dashboard could not be loaded right now.");
        }
        setDashboard(result);
      } catch (caught) {
        if (signal.aborted) return;
        setDashboard(null);
        setError(caught instanceof Error ? caught.message : "Your dashboard could not be loaded right now.");
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, [loadDashboard, refreshToken]);

  const bookingStatuses = useMemo(
    () => dashboard ? parentDashboardBookingStatuses(dashboard.bookings.counts) : [],
    [dashboard],
  );
  const shortcuts = useMemo(
    () => dashboard ? parentDashboardShortcuts(dashboard) : [],
    [dashboard],
  );
  const additionalBookings = useMemo(
    () => dashboard?.bookings.upcoming.filter((booking) => booking.id !== dashboard.bookings.next?.id) ?? [],
    [dashboard],
  );

  if (loading && !dashboard) return <ParentDashboardLoading />;

  if (error && !dashboard) {
    return (
      <main className="mx-auto min-h-full w-full max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="parent-dashboard-title">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Parent area</p>
          <h1 id="parent-dashboard-title" className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Household overview</h1>
        </header>
        <section role="alert" className="mt-8 max-w-2xl rounded-3xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-100 text-red-700"><Icon name="activity" /></span>
            <div>
              <h2 className="text-lg font-bold">The live dashboard is unavailable</h2>
              <p className="mt-1 text-sm leading-6 text-red-800">{error}</p>
              <button type="button" className={`${secondaryButton} mt-5 border-red-300 text-red-800 hover:border-red-400 hover:text-red-900`} onClick={() => setRefreshToken((value) => value + 1)}>
                Try again
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!dashboard) return null;

  const displayName = parentDashboardDisplayName(dashboard);
  const priorityAction = parentDashboardPrimaryAction(dashboard);
  const otherActions = priorityAction ? dashboard.actions.slice(1) : [];

  return (
    <main className="mx-auto min-h-full w-full max-w-[90rem] space-y-8 px-4 py-8 text-slate-950 sm:px-6 lg:px-8" aria-labelledby="parent-dashboard-title">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Parent area</p>
          <h1 id="parent-dashboard-title" className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Welcome back, {displayName}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Your children, bookings, credits, tutor feedback, and centre conversations in one live overview.</p>
        </div>
        <button type="button" className={secondaryButton} onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
          <Icon name="activity" size={17} />
          {loading ? "Refreshing…" : "Refresh data"}
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          The most recent refresh failed. The previous dashboard data remains visible. {error}
        </div>
      )}

      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 text-white shadow-xl shadow-slate-950/10" aria-labelledby="household-snapshot-title">
        <div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.35fr_0.65fr] xl:p-10">
          <div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-orange-200">
              <span>Household snapshot</span>
              {dashboard.household.academicYear && <span className="rounded-full bg-white/10 px-3 py-1 normal-case tracking-normal text-white">{dashboard.household.academicYear.name}</span>}
            </div>
            <h2 id="household-snapshot-title" className="mt-5 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
              {dashboard.bookings.next ? "Your next tuition session is ready." : "Everything important is gathered here."}
            </h2>
            {dashboard.bookings.next ? (
              <div className="mt-6 max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-orange-200">Next session</p>
                    <h3 className="mt-1 text-xl font-bold">{dashboard.bookings.next.subjectName}</h3>
                    <p className="mt-1 text-sm text-slate-200">{childName(dashboard.bookings.next)} · {dashboard.bookings.next.centreName}</p>
                  </div>
                  <BookingStatusBadge status={dashboard.bookings.next.status} dark />
                </div>
                <p className="mt-5 flex items-center gap-2 text-sm font-semibold text-white">
                  <Icon name="calendar" size={18} />
                  {formatDateTime(dashboard.bookings.next.startsAt, dashboard.bookings.next.centreTimeZone)}
                </p>
                {dashboard.bookings.next.lessonFocus && <p className="mt-2 text-sm leading-6 text-slate-300">Focus: {dashboard.bookings.next.lessonFocus}</p>}
                <Link href="/app/parent/bookings" className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-orange-200 hover:text-white hover:underline">
                  View booking <Icon name="chevronRight" size={16} />
                </Link>
              </div>
            ) : (
              <div className="mt-6 max-w-3xl rounded-2xl border border-white/15 bg-white/10 p-5 text-sm leading-6 text-slate-200">
                No upcoming booking is currently recorded. {dashboard.household.linkedChildren > 0 ? "Browse available sessions whenever you are ready." : "Your centre can help connect a child to this account."}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 self-end">
            <HeroMetric label="Linked children" value={dashboard.household.linkedChildren} icon="users" />
            <HeroMetric label="Credit balance" value={dashboard.credits.totalBalance} icon="activity" />
            <HeroMetric label="Upcoming" value={dashboard.bookings.counts.upcoming} icon="calendar" />
            <HeroMetric label="Unread updates" value={dashboard.notifications.unreadCount} icon="bell" />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-black/10 px-6 py-3 text-xs text-slate-300 sm:px-8 xl:px-10">
          <span>Live household data across {plural(dashboard.household.centres, "centre", "centres")}</span>
          <span>Updated {formatDateTime(dashboard.generatedAt)}</span>
        </div>
      </section>

      <section aria-labelledby="parent-actions-title" className="space-y-4">
        <SectionHeading
          eyebrow="Priority"
          title="Requires your attention"
          description="The most important household actions are ordered by urgency."
        />
        {priorityAction ? (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <AttentionCard action={priorityAction} priority />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {otherActions.length > 0 ? otherActions.map((action) => <AttentionCard key={action.key} action={action} />) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
                  <p className="text-sm font-bold">Only one action is currently outstanding</p>
                  <p className="mt-1 text-sm leading-6 text-emerald-800">Complete the priority item to bring your household overview up to date.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Icon name="check" /></span>
              <div><h3 className="font-bold">Nothing requires action</h3><p className="mt-1 text-sm leading-6 text-emerald-800">Your bookings, centre queries, tutor feedback, and profile are currently up to date.</p></div>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="booking-overview-title" className="space-y-4">
        <SectionHeading
          eyebrow="Bookings"
          title="Booking status"
          description="A live view of upcoming booking outcomes, plus cancellations from the last 30 days."
          action={<Link href="/app/parent/bookings" className="text-sm font-bold text-orange-700 hover:underline">View all bookings →</Link>}
        />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bookingStatuses.map((item) => (
            <article key={item.key} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-2xl ${bookingStatusIconClass(item.key)}`}><Icon name={item.key === "confirmed" ? "check" : item.key === "cancelled" ? "close" : "clock"} size={18} /></span>
                <strong className="text-3xl font-black tabular-nums text-slate-950">{item.count.toLocaleString("en-GB")}</strong>
              </div>
              <h3 className="mt-4 font-bold text-slate-950">{item.label}</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
            </article>
          ))}
        </div>
        {additionalBookings.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {additionalBookings.slice(0, 4).map((booking) => <UpcomingBookingCard key={booking.id} booking={booking} />)}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section aria-labelledby="linked-children-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            eyebrow="Household"
            title="Linked children"
            description={`${plural(dashboard.household.linkedChildren, "child", "children")} connected across ${plural(dashboard.household.centres, "centre", "centres")}.`}
            action={<Link href="/app/parent/children" className="text-sm font-bold text-orange-700 hover:underline">Open directory →</Link>}
          />
          {dashboard.household.children.length > 0 ? (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {dashboard.household.children.slice(0, 4).map((child) => <ChildCard key={child.studentProfileId} child={child} />)}
            </div>
          ) : (
            <EmptyState icon="users" title="No linked children yet" description="Ask the centre team to connect the appropriate student records to your parent account." />
          )}
        </section>

        <section aria-labelledby="credit-query-title" className="space-y-4">
          <h2 id="credit-query-title" className="sr-only">Credits and queries</h2>
          <article className={`rounded-3xl border p-6 shadow-sm ${dashboard.credits.totalBalance > 0 ? "border-slate-200 bg-white" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">Credits</p><h3 className="mt-2 text-xl font-bold">Household balance</h3></div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700"><Icon name="activity" /></span>
            </div>
            <strong className="mt-6 block text-5xl font-black tabular-nums">{dashboard.credits.totalBalance.toLocaleString("en-GB")}</strong>
            <p className="mt-2 text-sm text-slate-600">available {dashboard.credits.totalBalance === 1 ? "credit" : "credits"}</p>
            <Link href="/app/parent/credits" className={`${secondaryButton} mt-5`}>Review credits <Icon name="chevronRight" size={16} /></Link>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">Queries</p><h3 className="mt-2 text-xl font-bold">Centre conversations</h3></div>
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-100 text-sky-700"><Icon name="message" /></span>
            </div>
            <dl className="mt-5 grid grid-cols-3 gap-2">
              <QueryMetric label="Open" value={dashboard.queries.counts.unresolved} />
              <QueryMetric label="With centre" value={dashboard.queries.counts.awaitingCentre} />
              <QueryMetric label="Your reply" value={dashboard.queries.counts.awaitingParent} emphasis={dashboard.queries.counts.awaitingParent > 0} />
            </dl>
            <Link href="/app/parent/feedback?tab=queries" className={`${secondaryButton} mt-5`}>Open queries <Icon name="chevronRight" size={16} /></Link>
          </article>
        </section>
      </div>

      {dashboard.queries.recent.length > 0 && (
        <section aria-labelledby="recent-queries-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Communication" title="Recent queries" description="Open conversations between your household and the centre team." action={<Link href="/app/parent/feedback?tab=queries" className="text-sm font-bold text-orange-700 hover:underline">View all queries →</Link>} />
          <div className="mt-5 divide-y divide-slate-100">
            {dashboard.queries.recent.map((query) => <RecentQueryRow key={query.id} query={query} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="household-demographics-title" className="space-y-4">
        <SectionHeading eyebrow="Insights" title="Household demographics" description="A concise view of age, academic placement, centres, and confirmed subject demand for your linked children." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DistributionCard title="Age bands" items={dashboard.household.ageBands} emptyText="No age information is available." tone="orange" />
          <DistributionCard title="Academic levels" items={dashboard.household.academicLevels} emptyText="No academic placements are available." tone="violet" />
          <DistributionCard title="Centres" items={dashboard.household.centresBreakdown} emptyText="No linked centres are available." tone="sky" />
          <DistributionCard title="Upcoming subjects" items={dashboard.household.upcomingSubjects} emptyText="No confirmed subjects in the next 30 days." tone="emerald" />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section aria-labelledby="recent-feedback-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Learning" title="Recent tutor feedback" description="The latest published observations from your children’s tutors." action={<Link href="/app/parent/feedback?tab=feedback" className="text-sm font-bold text-orange-700 hover:underline">View all feedback →</Link>} />
          {dashboard.recentFeedback.length > 0 ? (
            <div className="mt-5 space-y-4">{dashboard.recentFeedback.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} />)}</div>
          ) : (
            <EmptyState icon="book" title="No tutor feedback yet" description="Published feedback will appear here after an attended tuition session." />
          )}
        </section>

        <section aria-labelledby="recent-notifications-title" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading eyebrow="Updates" title="Recent notifications" description={`${plural(dashboard.notifications.unreadCount, "unread update", "unread updates")} across your household.`} />
          {dashboard.notifications.recent.length > 0 ? (
            <div className="mt-5 space-y-3">{dashboard.notifications.recent.map((notification) => <NotificationCard key={notification.id} notification={notification} />)}</div>
          ) : (
            <EmptyState icon="bell" title="No active notifications" description="Booking, query, and feedback updates will appear here when they are available." />
          )}
        </section>
      </div>

      <section aria-labelledby="useful-shortcuts-title" className="space-y-4">
        <SectionHeading eyebrow="Quick access" title="Useful shortcuts" description="Move directly to the parent tools you use most often." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shortcuts.map((shortcut) => {
            const icon = shortcutIcon(shortcut.key);
            return shortcut.enabled ? (
              <Link key={shortcut.key} href={shortcut.href} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-orange-50 text-orange-700 transition group-hover:bg-orange-100"><Icon name={icon} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm text-slate-950">{shortcut.title}</strong><span className="mt-0.5 block text-xs leading-5 text-slate-500">{shortcut.description}</span></span>
                <Icon name="chevronRight" size={17} className="shrink-0 text-slate-400 group-hover:text-orange-600" />
              </Link>
            ) : (
              <div key={shortcut.key} aria-disabled="true" title={shortcut.unavailableReason} className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-slate-400">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-slate-100"><Icon name={icon} /></span>
                <span className="min-w-0"><strong className="block text-sm">{shortcut.title}</strong><span className="mt-0.5 block text-xs leading-5">{shortcut.unavailableReason}</span></span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ParentDashboardLoading() {
  return (
    <main className="mx-auto min-h-full w-full max-w-[90rem] space-y-8 px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="parent-dashboard-loading-title" aria-busy="true">
      <div className="sr-only" role="status">Loading your live household dashboard.</div>
      <header><div className="h-3 w-24 animate-pulse rounded bg-orange-100" /><div id="parent-dashboard-loading-title" className="mt-4 h-10 w-full max-w-md animate-pulse rounded-xl bg-slate-200" /><div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-slate-100" /></header>
      <div className="h-96 animate-pulse rounded-[2rem] bg-slate-900" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-40 animate-pulse rounded-3xl border border-slate-200 bg-white" />)}</div>
      <div className="grid gap-6 xl:grid-cols-2"><div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" /><div className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white" /></div>
    </main>
  );
}

function HeroMetric({ label, value, icon }: { label: string; value: number; icon: IconName }) {
  return <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm"><span className="flex items-center gap-2 text-xs font-semibold text-slate-300"><Icon name={icon} size={16} />{label}</span><strong className="mt-3 block text-3xl font-black tabular-nums">{value.toLocaleString("en-GB")}</strong></div>;
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">{eyebrow}</p><h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">{description}</p></div>{action}</div>;
}

function AttentionCard({ action, priority = false }: { action: ParentDashboardAction; priority?: boolean }) {
  const tone = parentDashboardActionTone(action);
  const styles = {
    critical: "border-red-200 bg-red-50 text-red-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    informative: "border-sky-200 bg-sky-50 text-sky-950",
  }[tone];
  const iconStyles = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-700",
    informative: "bg-sky-100 text-sky-700",
  }[tone];
  return <Link href={safeParentHref(action.href)} className={`group block rounded-3xl border p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 ${styles} ${priority ? "sm:p-7" : ""}`}>
    <div className="flex items-start justify-between gap-4"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${iconStyles}`}><Icon name={action.kind === "query_response" ? "message" : action.kind === "unread_feedback" ? "book" : action.kind === "profile" ? "settings" : "activity"} /></span><strong className="rounded-full bg-white/70 px-3 py-1 text-sm tabular-nums">{action.count.toLocaleString("en-GB")}</strong></div>
    <h3 className={`mt-5 font-bold ${priority ? "text-xl" : "text-base"}`}>{action.title}</h3><p className="mt-2 text-sm leading-6 opacity-80">{action.description}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-bold group-hover:underline">Take action <Icon name="chevronRight" size={16} /></span>
  </Link>;
}

function UpcomingBookingCard({ booking }: { booking: ParentDashboardBooking }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-orange-600">{booking.subjectCode}</p><h3 className="mt-1 font-bold">{booking.subjectName}</h3></div><BookingStatusBadge status={booking.status} /></div><p className="mt-3 text-sm text-slate-700">{childName(booking)}</p><p className="mt-1 text-xs text-slate-500">{formatDateTime(booking.startsAt, booking.centreTimeZone)}</p></article>;
}

function BookingStatusBadge({ status, dark = false }: { status: ParentDashboardBooking["status"]; dark?: boolean }) {
  const label = { confirmed: "Confirmed", waitlisted: "Waitlisted", credits_required: "Credits required", cancelled: "Cancelled" }[status];
  const styles = dark ? "bg-white/15 text-white" : {
    confirmed: "bg-emerald-100 text-emerald-800",
    waitlisted: "bg-sky-100 text-sky-800",
    credits_required: "bg-amber-100 text-amber-900",
    cancelled: "bg-slate-100 text-slate-700",
  }[status];
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${styles}`}>{label}</span>;
}

function ChildCard({ child }: { child: ParentDashboardChild }) {
  const name = child.preferredName?.trim() || child.firstName;
  return <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-sm font-black text-orange-700">{initials(child.firstName, child.lastName)}</span><div className="min-w-0"><h3 className="truncate font-bold text-slate-950">{name} {child.lastName}</h3><p className="mt-0.5 text-xs text-slate-500">{child.peopleCode} · age {child.ageYears}</p></div></div><dl className="mt-4 grid gap-2 text-xs"><div className="flex justify-between gap-4"><dt className="text-slate-500">Centre</dt><dd className="truncate text-right font-semibold text-slate-700">{child.centreName}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Academic level</dt><dd className="truncate text-right font-semibold text-slate-700">{child.academicLevel || "Not currently placed"}</dd></div></dl></article>;
}

function QueryMetric({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return <div className={`flex flex-col rounded-2xl p-3 text-center ${emphasis ? "bg-amber-100 text-amber-950" : "bg-slate-50 text-slate-800"}`}><dt className="order-2 mt-1 text-[0.68rem] font-bold uppercase tracking-wide opacity-70">{label}</dt><dd className="order-1 text-xl font-black tabular-nums">{value.toLocaleString("en-GB")}</dd></div>;
}

function RecentQueryRow({ query }: { query: ParentDashboardQuery }) {
  const status = query.status === "awaiting_parent" ? "Awaiting your reply" : query.status === "awaiting_staff" ? "With centre" : query.status.replaceAll("_", " ");
  return <Link href="/app/parent/feedback?tab=queries" className="group flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-slate-950 group-hover:text-orange-700">{query.subject}</h3><p className="mt-1 text-xs text-slate-500">{query.studentFirstName} {query.studentLastName} · {query.centreName}</p></div><div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${query.status === "awaiting_parent" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"}`}>{status}</span><p className="mt-2 text-xs text-slate-400">{formatDateTime(query.lastMessageAt)}</p></div></Link>;
}

function DistributionCard({ title, items, emptyText, tone }: { title: string; items: ParentDashboardCategoryCount[]; emptyText: string; tone: "orange" | "violet" | "sky" | "emerald" }) {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const bar = { orange: "bg-orange-500", violet: "bg-violet-500", sky: "bg-sky-500", emerald: "bg-emerald-500" }[tone];
  return <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-950">{title}</h3>{total > 0 ? <div className="mt-5 space-y-4">{items.filter((item) => item.count > 0).map((item) => <div key={item.key}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-600" title={item.label}>{item.label}</span><strong className="tabular-nums text-slate-950">{item.count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`${item.label}: ${item.count}`}><div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.max(6, (item.count / total) * 100)}%` }} /></div></div>)}</div> : <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">{emptyText}</p>}</article>;
}

function FeedbackCard({ feedback }: { feedback: ParentDashboardFeedback }) {
  return <Link href="/app/parent/feedback?tab=feedback" className={`group block rounded-2xl border p-4 transition hover:border-orange-300 ${feedback.unread ? "border-orange-200 bg-orange-50/70" : "border-slate-200 bg-slate-50"}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><h3 className="text-sm font-bold text-slate-950 group-hover:text-orange-700">{feedback.studentFirstName} {feedback.studentLastName}</h3>{feedback.unread && <span className="h-2 w-2 rounded-full bg-orange-500" aria-label="Unread" />}</div><p className="mt-1 text-xs text-slate-500">{feedback.subjectName} · {feedback.tutorFirstName} {feedback.tutorLastName}</p></div><time className="text-xs text-slate-400" dateTime={feedback.publishedAt}>{formatDate(feedback.publishedAt)}</time></div><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">{feedback.feedbackText}</p></Link>;
}

function NotificationCard({ notification }: { notification: ParentDashboardNotification }) {
  const unread = !notification.readAt;
  return <Link href={safeParentHref(notification.actionHref)} className={`group flex items-start gap-3 rounded-2xl border p-4 transition hover:border-orange-300 ${unread ? "border-orange-200 bg-orange-50/60" : "border-slate-200 bg-slate-50"}`}><span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unread ? "bg-orange-100 text-orange-700" : "bg-white text-slate-500"}`}><Icon name={notification.type.includes("query") ? "message" : notification.type.includes("feedback") ? "book" : "bell"} size={17} /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-3"><strong className="text-sm text-slate-950 group-hover:text-orange-700">{notification.title}</strong><time className="shrink-0 text-xs text-slate-400" dateTime={notification.availableAt}>{formatDate(notification.availableAt)}</time></span><span className="mt-1 block text-xs leading-5 text-slate-600">{notification.message}</span></span></Link>;
}

function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-500 shadow-sm"><Icon name={icon} /></span><h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3><p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{description}</p></div>;
}

function bookingStatusIconClass(status: string) {
  if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
  if (status === "waitlisted") return "bg-sky-100 text-sky-700";
  if (status === "credits_required") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

function shortcutIcon(key: string): IconName {
  switch (key) {
    case "sessions": return "calendar";
    case "bookings": return "check";
    case "children": return "users";
    case "credits": return "activity";
    case "queries": return "message";
    default: return "settings";
  }
}

function childName(booking: ParentDashboardBooking) {
  return `${booking.studentFirstName} ${booking.studentLastName}`.trim();
}

function initials(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || "ST";
}

function plural(value: number, singular: string, pluralValue: string) {
  return `${value.toLocaleString("en-GB")} ${value === 1 ? singular : pluralValue}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateTime(value: string, timeZone?: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  try {
    return date.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
      timeZoneName: timeZone ? "short" : undefined,
    });
  } catch {
    return date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }
}

function safeParentHref(value: string) {
  return value.startsWith("/app/parent") ? value : "/app/parent";
}
