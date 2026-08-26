"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { AuditAccessContext, AuditEvent, AuditEventList } from "@/lib/audit-types";

type ApiError = { error?: string };
type Filters = {
  scope: string;
  actionKey: string;
  outcome: string;
  actorUserId: string;
  occurredFrom: string;
  occurredTo: string;
};

const emptyFilters: Filters = {
  scope: "",
  actionKey: "",
  outcome: "",
  actorUserId: "",
  occurredFrom: "",
  occurredTo: "",
};

function toRFC3339(value: string): string {
  return value ? new Date(value).toISOString() : "";
}

function actorLabel(event: AuditEvent): string {
  if (!event.actor) return event.actorType;
  const name = [event.actor.firstName, event.actor.lastName].filter(Boolean).join(" ");
  return name || event.actor.email || event.actor.userId || event.actorType;
}

function hasDetails(event: AuditEvent): boolean {
  return Object.keys(event.previousValues).length > 0 ||
    Object.keys(event.newValues).length > 0 ||
    Object.keys(event.metadata).length > 0;
}

export function AuditExplorer() {
  const [context, setContext] = useState<AuditAccessContext | null>(null);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestEvents = useCallback(async (active: Filters, cursor = "", append = false) => {
    const query = new URLSearchParams();
    if (active.scope) query.set("centreId", active.scope);
    if (active.actionKey.trim()) query.set("actionKey", active.actionKey.trim());
    if (active.outcome) query.set("outcome", active.outcome);
    if (active.actorUserId.trim()) query.set("actorUserId", active.actorUserId.trim());
    if (active.occurredFrom) query.set("occurredFrom", toRFC3339(active.occurredFrom));
    if (active.occurredTo) query.set("occurredTo", toRFC3339(active.occurredTo));
    if (cursor) query.set("cursor", cursor);
    query.set("limit", "50");
    const response = await fetch(`/api/audit/events?${query.toString()}`, { cache: "no-store" });
    const result = (await response.json()) as AuditEventList & ApiError;
    if (!response.ok) throw new Error(result.error ?? "Audit events could not be loaded.");
    setEvents((current) => append ? [...current, ...result.events] : result.events);
    setNextCursor(result.nextCursor);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/audit/context", { cache: "no-store" });
        const result = (await response.json()) as AuditAccessContext & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Audit access is unavailable.");
        if (cancelled) return;
        const initialScope = result.canViewOrganizationWide ? "" : (result.centres[0]?.id ?? "");
        const initialFilters = { ...emptyFilters, scope: initialScope };
        setContext(result);
        setFilters(initialFilters);
        await requestEvents(initialFilters);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Audit access is unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [requestEvents]);

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await requestEvents(filters);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit events could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor) return;
    setLoading(true);
    setError("");
    try {
      await requestEvents(filters, nextCursor, true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "More audit events could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  if (error && !context) return <p className="access-state form-error">{error}</p>;
  if (!context) return <p className="loading-state">Loading audit access…</p>;

  return (
    <div className="audit-layout">
      <aside className="management-panel audit-policy" aria-labelledby="retention-heading">
        <p className="eyebrow">Retention control</p>
        <h2 id="retention-heading">{context.retentionPolicy.securityAdministrationMonths} months</h2>
        <p>Security and administrative events remain append-only for the approved retention period.</p>
        <dl>
          <div><dt>Automatic expiry</dt><dd>{context.retentionPolicy.automatedExpiryEnabled ? "Enabled" : "Disabled"}</dd></div>
          <div><dt>Policy source</dt><dd>{context.retentionPolicy.policySource}</dd></div>
          <div><dt>Confirmed</dt><dd>{new Date(context.retentionPolicy.confirmedAt).toLocaleDateString()}</dd></div>
        </dl>
      </aside>

      <section className="management-panel audit-results" aria-labelledby="events-heading">
        <div className="panel-heading">
          <div><p className="eyebrow">Immutable evidence</p><h2 id="events-heading">Event stream</h2></div>
          <span className="event-count">{events.length} loaded</span>
        </div>
        <form className="audit-filters" onSubmit={applyFilters}>
          <label>Scope
            <select value={filters.scope} onChange={(event) => setFilters({ ...filters, scope: event.target.value })}>
              {context.canViewOrganizationWide && <option value="">All centres</option>}
              {context.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
            </select>
          </label>
          <label>Outcome
            <select value={filters.outcome} onChange={(event) => setFilters({ ...filters, outcome: event.target.value })}>
              <option value="">All outcomes</option><option value="succeeded">Succeeded</option>
              <option value="denied">Denied</option><option value="failed">Failed</option>
            </select>
          </label>
          <label>Action key<input value={filters.actionKey} onChange={(event) => setFilters({ ...filters, actionKey: event.target.value })} placeholder="identity.login" /></label>
          <label>Actor user ID<input value={filters.actorUserId} onChange={(event) => setFilters({ ...filters, actorUserId: event.target.value })} placeholder="UUID" /></label>
          <label>From<input type="datetime-local" value={filters.occurredFrom} onChange={(event) => setFilters({ ...filters, occurredFrom: event.target.value })} /></label>
          <label>To<input type="datetime-local" value={filters.occurredTo} onChange={(event) => setFilters({ ...filters, occurredTo: event.target.value })} /></label>
          <button className="primary-button" disabled={loading} type="submit">Apply filters</button>
        </form>
        {error && <p className="form-error">{error}</p>}
        <div className="audit-events" aria-live="polite">
          {!loading && events.length === 0 && <p className="empty-state">No audit events match this scope.</p>}
          {events.map((event) => (
            <article className="audit-event" key={event.id}>
              <div className="audit-event-heading">
                <div><h3>{event.actionKey}</h3><p>{new Date(event.occurredAt).toLocaleString()}</p></div>
                <span className={`status-badge outcome-${event.outcome}`}>{event.outcome}</span>
              </div>
              <dl className="audit-event-meta">
                <div><dt>Actor</dt><dd>{actorLabel(event)}</dd></div>
                <div><dt>Scope</dt><dd>{event.centre?.name ?? "Organization"}</dd></div>
                <div><dt>Target</dt><dd>{event.targetEntityType}{event.targetEntityId ? ` · ${event.targetEntityId}` : ""}</dd></div>
                {event.requestId && <div><dt>Request</dt><dd>{event.requestId}</dd></div>}
              </dl>
              {hasDetails(event) && <details><summary>Safe event details</summary><pre>{JSON.stringify({ previousValues: event.previousValues, newValues: event.newValues, metadata: event.metadata }, null, 2)}</pre></details>}
            </article>
          ))}
        </div>
        {nextCursor && <button className="load-more-button" disabled={loading} onClick={loadMore} type="button">Load more</button>}
        {loading && <p className="loading-state">Loading audit events…</p>}
      </section>
    </div>
  );
}
