"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import type { AcademicYear, AcademicYearList } from "@/lib/academic-types";
import styles from "./academic-setup.module.css";

type ApiError = { error?: string };
type YearDraft = { name: string; startDate: string; endDate: string };

const emptyYear: YearDraft = { name: "", startDate: "", endDate: "" };

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Request verification is unavailable.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export function AcademicYearsPanel({ centreId }: { centreId: string }) {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [draft, setDraft] = useState<YearDraft>(emptyYear);
  const [editingYearId, setEditingYearId] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadYears = useCallback(async () => {
    const response = await fetch(`/api/academics/years?centreId=${encodeURIComponent(centreId)}`, { cache: "no-store" });
    const result = (await response.json()) as AcademicYearList & ApiError;
    if (!response.ok) throw new Error(result.error ?? "Academic years could not be loaded.");
    setYears(result.academicYears ?? []);
  }, [centreId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      setNotice("");
      setEditingYearId("");
      setDraft(emptyYear);
      try {
        await loadYears();
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, "Academic years could not be loaded."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadYears]);

  async function submitYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingYearId ? "update-year" : "create-year";
    setPendingAction(action);
    setError("");
    setNotice("");
    try {
      await mutate(
        editingYearId ? `/api/academics/years/${encodeURIComponent(editingYearId)}` : "/api/academics/years",
        editingYearId ? "PUT" : "POST",
        { centreId, ...draft },
      );
      setNotice(editingYearId ? "Academic year updated." : "Academic year created as planned.");
      cancelEdit();
      await loadYears();
    } catch (caught) {
      setError(errorMessage(caught, "The academic year could not be saved."));
    } finally {
      setPendingAction("");
    }
  }

  async function changeStatus(year: AcademicYear, action: "activate" | "close") {
    const prompt = action === "activate"
      ? `Make ${year.name} the current academic year? Only one year can be current.`
      : `Close ${year.name}? Closed academic years remain available as history and cannot be edited or reopened.`;
    if (!window.confirm(prompt)) return;
    const key = `${year.id}:${action}`;
    setPendingAction(key);
    setError("");
    setNotice("");
    try {
      await mutate(`/api/academics/years/${encodeURIComponent(year.id)}/${action}`, "POST", { centreId });
      setNotice(action === "activate" ? `${year.name} is now the current academic year.` : `${year.name} has been closed and retained in history.`);
      if (editingYearId === year.id) cancelEdit();
      await loadYears();
    } catch (caught) {
      setError(errorMessage(caught, "The academic year status could not be changed."));
    } finally {
      setPendingAction("");
    }
  }

  async function mutate(path: string, method: "POST" | "PUT", body: Record<string, unknown>) {
    const csrf = await csrfToken();
    const response = await fetch(path, {
      method,
      headers: { "content-type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as ApiError;
    if (!response.ok) throw new Error(result.error ?? "The academic year could not be changed.");
  }

  function editYear(year: AcademicYear) {
    setEditingYearId(year.id);
    setDraft({ name: year.name, startDate: year.startDate, endDate: year.endDate });
    setError("");
    setNotice("");
  }

  function cancelEdit() {
    setEditingYearId("");
    setDraft(emptyYear);
  }

  const currentYear = years.find((year) => year.status === "current");

  return (
    <section className={`management-panel ${styles.cataloguePanel} ${styles.yearsPanel}`} aria-labelledby="academic-years-title">
      <header className={styles.panelHeader}>
        <div>
          <p className="eyebrow">{currentYear ? `Current: ${currentYear.name}` : "No current year selected"}</p>
          <h2 id="academic-years-title">Academic years</h2>
          <p>Use one high-level year for planning and reporting. This is not an operating calendar: Tution can continue teaching during school holidays.</p>
        </div>
      </header>

      {error ? <p className={`form-error ${styles.inlineMessage}`} role="alert">{error}</p> : null}
      {notice ? <p className={`${styles.success} ${styles.inlineMessage}`} role="status">{notice}</p> : null}

      <form className={`account-form ${styles.form} ${styles.yearForm}`} onSubmit={submitYear}>
        <label>
          Year name
          <input maxLength={64} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. 2026/27" required value={draft.name} />
        </label>
        <label>
          Start date
          <input onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required type="date" value={draft.startDate} />
        </label>
        <label>
          End date
          <input min={draft.startDate || undefined} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} required type="date" value={draft.endDate} />
        </label>
        <div className={styles.formActions}>
          <button className="primary-button" disabled={pendingAction !== ""} type="submit">{editingYearId ? "Save academic year" : "Add planned year"}</button>
          {editingYearId ? <button className={styles.secondaryButton} onClick={cancelEdit} type="button">Cancel</button> : null}
        </div>
      </form>

      <div className={`${styles.entries} ${styles.yearEntries}`}>
        {loading ? <p className="loading-state">Loading academic years…</p> : null}
        {!loading && !years.length ? <p className="empty-state">No academic years have been created yet.</p> : null}
        {!loading ? years.map((year) => (
          <article className={`${styles.entry} ${year.status === "current" ? styles.currentYear : ""}`} key={year.id}>
            <div className={styles.entryHeader}>
              <div>
                <div className={styles.entryTitle}><h3>{year.name}</h3></div>
                <p>{formatDate(year.startDate)} – {formatDate(year.endDate)}</p>
              </div>
              <span className={`status-badge ${statusClass(year.status, styles)}`}>{year.status}</span>
            </div>
            <div className={styles.entryFooter}>
              <span>{year.status === "closed" ? "Historical record" : "Planning and reporting scope"}</span>
              <div className={styles.entryActions}>
                {year.status !== "closed" ? <button disabled={pendingAction !== ""} onClick={() => editYear(year)} type="button">Edit</button> : null}
                {year.status === "planned" ? <button className={styles.restoreButton} disabled={pendingAction !== ""} onClick={() => void changeStatus(year, "activate")} type="button">Make current</button> : null}
                {year.status !== "closed" ? <button className={styles.dangerButton} disabled={pendingAction !== ""} onClick={() => void changeStatus(year, "close")} type="button">Close year</button> : null}
              </div>
            </div>
          </article>
        )) : null}
      </div>
    </section>
  );
}

function statusClass(status: AcademicYear["status"], sheet: typeof styles) {
  if (status === "current") return "status-active";
  if (status === "planned") return sheet.statusPlanned;
  return "status-disabled";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
}

function errorMessage(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
