"use client";

import { FormEvent, Fragment, useCallback, useEffect, useState } from "react";

import {
  AuditAccessContext,
  AuditEvent,
  AuditEventList,
} from "@/lib/audit-types";

type ApiError = { error?: string };
type Filters = {
  scope: string;
  actionKey: string;
  outcome: string;
  actorUserId: string;
  occurredFrom: string;
  occurredTo: string;
};

type RangePreset = "24h" | "7d" | "30d" | "all";
type TimeRange = RangePreset | "custom";

const emptyFilters: Filters = {
  scope: "",
  actionKey: "",
  outcome: "",
  actorUserId: "",
  occurredFrom: "",
  occurredTo: "",
};

const rangeOptions: { value: RangePreset; label: string }[] = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

const rangeHours: Record<Exclude<RangePreset, "all">, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

const outcomeStyles: Record<string, string> = {
  succeeded: "bg-emerald-100 text-emerald-800",
  denied: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

const fieldClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

const secondaryButtonClass =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-60";

function toRFC3339(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

function presetStart(range: Exclude<RangePreset, "all">): string {
  const start = new Date(Date.now() - rangeHours[range] * 60 * 60 * 1000);
  const offsetMs = start.getTimezoneOffset() * 60 * 1000;
  return new Date(start.getTime() - offsetMs).toISOString().slice(0, 16);
}

function actorLabel(event: AuditEvent): string {
  if (!event.actor) return event.actorType;
  const name = [event.actor.firstName, event.actor.lastName]
    .filter(Boolean)
    .join(" ");
  return name || event.actor.email || event.actor.userId || event.actorType;
}

function hasDetails(event: AuditEvent): boolean {
  return (
    Object.keys(event.previousValues).length > 0 ||
    Object.keys(event.newValues).length > 0 ||
    Object.keys(event.metadata).length > 0
  );
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AuditExplorer() {
  const [context, setContext] = useState<AuditAccessContext | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>("all");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestEvents = useCallback(
    async (active: Filters, cursor = "", append = false) => {
      const query = new URLSearchParams();
      if (active.scope) query.set("centreId", active.scope);
      if (active.actionKey.trim())
        query.set("actionKey", active.actionKey.trim());
      if (active.outcome) query.set("outcome", active.outcome);
      if (active.actorUserId.trim())
        query.set("actorUserId", active.actorUserId.trim());
      if (active.occurredFrom)
        query.set("occurredFrom", toRFC3339(active.occurredFrom));
      if (active.occurredTo)
        query.set("occurredTo", toRFC3339(active.occurredTo));
      if (cursor) query.set("cursor", cursor);
      query.set("limit", "50");
      const response = await fetch(`/api/audit/events?${query.toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as AuditEventList & ApiError;
      if (!response.ok)
        throw new Error(result.error ?? "Audit events could not be loaded.");
      setEvents((current) =>
        append ? [...current, ...result.events] : result.events,
      );
      setNextCursor(result.nextCursor);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/audit/context", {
          cache: "no-store",
        });
        const result = (await response.json()) as AuditAccessContext & ApiError;
        if (!response.ok)
          throw new Error(result.error ?? "Audit access is unavailable.");
        if (cancelled) return;
        const initialScope = result.canViewOrganizationWide
          ? ""
          : (result.centres[0]?.id ?? "");
        const initialFilters = { ...emptyFilters, scope: initialScope };
        setContext(result);
        setFilters(initialFilters);
        await requestEvents(initialFilters);
      } catch (caught) {
        if (!cancelled)
          setError(
            caught instanceof Error
              ? caught.message
              : "Audit access is unavailable.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [requestEvents]);

  async function runQuery(next: Filters) {
    setLoading(true);
    setError("");
    try {
      await requestEvents(next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Audit events could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRange(filters.occurredFrom || filters.occurredTo ? "custom" : "all");
    await runQuery(filters);
  }

  async function selectRange(next: RangePreset) {
    const nextFilters = {
      ...filters,
      occurredFrom: next === "all" ? "" : presetStart(next),
      occurredTo: "",
    };
    setRange(next);
    setFilters(nextFilters);
    await runQuery(nextFilters);
  }

  async function changeOutcome(outcome: string) {
    const nextFilters = { ...filters, outcome };
    setFilters(nextFilters);
    await runQuery(nextFilters);
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    setError("");
    try {
      await requestEvents(filters, nextCursor, true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "More events could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (error && !context)
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {error}
      </p>
    );
  if (!context) return <p className="text-sm text-slate-600">Loading…</p>;

  const advancedCount =
    [filters.actionKey, filters.actorUserId].filter((value) => value.trim())
      .length + (range === "custom" ? 1 : 0);

  return (
    <div className="grid gap-5">
      <section
        aria-label="Retention policy"
        className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-slate-200 bg-white px-5 py-4"
      >
        <div className="flex items-baseline gap-2">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-orange-700">
            Retention
          </p>
          <strong className="text-xl font-black text-orange-700">
            {context.retentionPolicy.securityAdministrationMonths} months
          </strong>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-2">
          <div className="flex items-baseline gap-2">
            <dt className="text-xs font-bold text-slate-500">Automatic expiry</dt>
            <dd className="text-sm font-medium text-slate-900">
              {context.retentionPolicy.automatedExpiryEnabled
                ? "Enabled"
                : "Disabled"}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-xs font-bold text-slate-500">Policy source</dt>
            <dd className="text-sm font-medium text-slate-900">
              {context.retentionPolicy.policySource}
            </dd>
          </div>
          <div className="flex items-baseline gap-2">
            <dt className="text-xs font-bold text-slate-500">Confirmed</dt>
            <dd className="text-sm font-medium text-slate-900">
              {new Date(
                context.retentionPolicy.confirmedAt,
              ).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="events-heading"
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950" id="events-heading">
            Events
          </h2>
          <span className="text-sm font-bold text-slate-500">
            {events.length} loaded
          </span>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              Outcome
              <select
                className={fieldClass}
                onChange={(event) => changeOutcome(event.target.value)}
                value={filters.outcome}
              >
                <option value="">All outcomes</option>
                <option value="succeeded">Succeeded</option>
                <option value="denied">Denied</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <div
              aria-label="Time range"
              className="flex flex-wrap gap-1.5"
              role="group"
            >
              {rangeOptions.map((option) => (
                <button
                  aria-pressed={range === option.value}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 aria-pressed:border-orange-600 aria-pressed:bg-orange-600 aria-pressed:text-white disabled:opacity-60"
                  disabled={loading}
                  key={option.value}
                  onClick={() => selectRange(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <button
            aria-controls="audit-more-filters"
            aria-expanded={showMoreFilters}
            className={secondaryButtonClass}
            onClick={() => setShowMoreFilters((open) => !open)}
            type="button"
          >
            More filters{advancedCount > 0 ? ` (${advancedCount})` : ""}
          </button>
        </div>

        <form
          className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-3"
          hidden={!showMoreFilters}
          id="audit-more-filters"
          onSubmit={applyFilters}
        >
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            Scope
            <select
              className={fieldClass}
              onChange={(event) =>
                setFilters({ ...filters, scope: event.target.value })
              }
              value={filters.scope}
            >
              {context.canViewOrganizationWide && (
                <option value="">All centres</option>
              )}
              {context.centres.map((centre) => (
                <option key={centre.id} value={centre.id}>
                  {centre.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            Action key
            <input
              className={fieldClass}
              onChange={(event) =>
                setFilters({ ...filters, actionKey: event.target.value })
              }
              placeholder="identity.login"
              value={filters.actionKey}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            Actor ID
            <input
              className={fieldClass}
              onChange={(event) =>
                setFilters({ ...filters, actorUserId: event.target.value })
              }
              placeholder="UUID"
              value={filters.actorUserId}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            From
            <input
              className={fieldClass}
              onChange={(event) =>
                setFilters({ ...filters, occurredFrom: event.target.value })
              }
              type="datetime-local"
              value={filters.occurredFrom}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600">
            To
            <input
              className={fieldClass}
              onChange={(event) =>
                setFilters({ ...filters, occurredTo: event.target.value })
              }
              type="datetime-local"
              value={filters.occurredTo}
            />
          </label>
          <button
            className="justify-self-start self-end rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            Apply filters
          </button>
        </form>

        {error && (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}

        <div
          aria-live="polite"
          className="max-h-[65vh] overflow-auto rounded-xl border border-slate-200"
        >
          {!loading && events.length === 0 && (
            <p className="px-5 py-8 text-center text-sm font-medium text-slate-600">
              No events match these filters.
            </p>
          )}
          {events.length > 0 && (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {["Time", "Outcome", "Action", "Actor", "Scope", "Target"].map(
                    (heading) => (
                      <th
                        className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-[0.7rem] font-extrabold uppercase tracking-[0.06em] text-slate-500"
                        key={heading}
                        scope="col"
                      >
                        {heading}
                      </th>
                    ),
                  )}
                  <th
                    className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2.5"
                    scope="col"
                  >
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => {
                  const expanded = expandedId === event.id;
                  const canExpand = hasDetails(event) || Boolean(event.requestId);
                  const startsDay =
                    index === 0 ||
                    dayKey(events[index - 1].occurredAt) !==
                      dayKey(event.occurredAt);
                  return (
                    <Fragment key={event.id}>
                      {startsDay && (
                        <tr>
                          <th
                            className="bg-white px-3 pb-1.5 pt-4 text-left text-xs font-black text-slate-900"
                            colSpan={7}
                            scope="colgroup"
                          >
                            {dayLabel(event.occurredAt)}
                          </th>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap border-b border-slate-100 px-3 py-2.5 align-top tabular-nums text-slate-500">
                          {new Date(event.occurredAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 align-top">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold capitalize ${outcomeStyles[event.outcome] ?? "bg-slate-100 text-slate-700"}`}
                          >
                            {event.outcome}
                          </span>
                        </td>
                        <td className="break-all border-b border-slate-100 px-3 py-2.5 align-top font-bold text-slate-900">
                          {event.actionKey}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 align-top text-slate-700">
                          {actorLabel(event)}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 align-top text-slate-700">
                          {event.centre?.name ?? "Organization"}
                        </td>
                        <td className="break-all border-b border-slate-100 px-3 py-2.5 align-top text-slate-700">
                          {event.targetEntityType}
                          {event.targetEntityId ? ` · ${event.targetEntityId}` : ""}
                        </td>
                        <td className="border-b border-slate-100 px-3 py-2.5 align-top">
                          {canExpand && (
                            <button
                              aria-controls={`audit-details-${event.id}`}
                              aria-expanded={expanded}
                              className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-orange-700 transition hover:bg-orange-50"
                              onClick={() =>
                                setExpandedId(expanded ? null : event.id)
                              }
                              type="button"
                            >
                              {expanded ? "Hide" : "Details"}
                            </button>
                          )}
                        </td>
                      </tr>
                      {expanded && (
                        <tr
                          className="bg-slate-50"
                          id={`audit-details-${event.id}`}
                        >
                          <td className="px-4 py-4" colSpan={7}>
                            {event.requestId && (
                              <p className="text-xs text-slate-500">
                                Request{" "}
                                <code className="break-all font-mono text-slate-800">
                                  {event.requestId}
                                </code>
                              </p>
                            )}
                            {hasDetails(event) && (
                              <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3.5 text-xs text-slate-100">
                                {JSON.stringify(
                                  {
                                    previousValues: event.previousValues,
                                    newValues: event.newValues,
                                    metadata: event.metadata,
                                  },
                                  null,
                                  2,
                                )}
                              </pre>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {nextCursor && (
          <button
            className="w-full rounded-lg border border-slate-300 bg-white py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-50 disabled:opacity-60"
            disabled={loading}
            onClick={loadMore}
            type="button"
          >
            Load more
          </button>
        )}
        {loading && <p className="text-sm text-slate-600">Loading…</p>}
      </section>
    </div>
  );
}
