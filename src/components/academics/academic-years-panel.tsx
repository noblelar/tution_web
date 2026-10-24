"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
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
  const [dialogOpen, setDialogOpen] = useState(false);
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
      setDialogOpen(false);
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
      closeEditor();
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
      if (editingYearId === year.id) closeEditor();
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
    setDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingYearId("");
    setDraft(emptyYear);
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  function closeEditor() {
    setEditingYearId("");
    setDraft(emptyYear);
    setDialogOpen(false);
  }

  return (
    <>
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="academic-years-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-xl font-black text-slate-950" id="academic-years-title">Academic years</h2>
        <button className="primary-button" disabled={loading || pendingAction !== ""} onClick={openCreateDialog} type="button">Add planned year</button>
      </div>

      {error && !dialogOpen ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}

      {loading ? <p className="loading-state">Loading academic years…</p> : null}
      {!loading && !years.length ? <p className="empty-state">No academic years have been created yet.</p> : null}
      {!loading && years.length ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3" scope="col">Year</th>
                <th className="px-4 py-3" scope="col">Dates</th>
                <th className="px-4 py-3" scope="col">Status</th>
                <th className="px-4 py-3 text-right" scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {years.map((year) => (
                <tr key={year.id}>
                  <td className="px-4 py-3 font-black text-slate-900">{year.name}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(year.startDate)} – {formatDate(year.endDate)}</td>
                  <td className="px-4 py-3"><span className={`status-badge ${statusClass(year.status, styles)}`}>{year.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {year.status === "closed" ? <span className="self-center text-xs font-semibold text-slate-500">Historical record</span> : null}
                      {year.status !== "closed" ? <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={pendingAction !== ""} onClick={() => editYear(year)} type="button">Edit</button> : null}
                      {year.status === "planned" ? <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50" disabled={pendingAction !== ""} onClick={() => void changeStatus(year, "activate")} type="button">Make current</button> : null}
                      {year.status !== "closed" ? <button className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50" disabled={pendingAction !== ""} onClick={() => void changeStatus(year, "close")} type="button">Close year</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>

    <FormDialog
      open={dialogOpen}
      title={editingYearId ? "Edit academic year" : "Add planned academic year"}
      description="Define the high-level year used for planning and reporting across Tution."
      onOpenChange={(open) => { if (!open && pendingAction === "") closeEditor(); }}
    >
      <form className="account-form !mt-0 !gap-5 p-5 sm:p-6" onSubmit={submitYear}>
        <label>
          Year name
          <input maxLength={64} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. 2026/27" required value={draft.name} />
        </label>
        <div className={styles.twoFields}>
          <label>
            Start date
            <input onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} required type="date" value={draft.startDate} />
          </label>
          <label>
            End date
            <input min={draft.startDate || undefined} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} required type="date" value={draft.endDate} />
          </label>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="dialog-actions -mx-5 -mb-5 mt-1 flex-col-reverse border-t border-slate-200 px-5 !py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:px-6">
          <button className="w-full rounded-lg px-4 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 sm:w-auto" disabled={pendingAction !== ""} onClick={closeEditor} type="button">Cancel</button>
          <button className="primary-button w-full !px-5 !py-3 transition-colors hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 sm:w-auto" disabled={pendingAction !== ""} type="submit">
            {pendingAction === "create-year" || pendingAction === "update-year" ? "Saving…" : editingYearId ? "Save academic year" : "Add planned year"}
          </button>
        </div>
      </form>
    </FormDialog>
    </>
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
