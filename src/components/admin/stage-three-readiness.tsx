"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/dashboard";
import type { Centre } from "@/lib/account-types";
import type { StageThreeReadiness, StageThreeReadinessCounts } from "@/lib/stage-three-readiness-types";

type ApiError = { error?: string };

const statusStyles = {
  ready: { label: "Ready", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  blocked: { label: "Blocked", className: "bg-red-50 text-red-700 ring-red-200" },
  attention: { label: "Attention required", className: "bg-amber-50 text-amber-700 ring-amber-200" },
} as const;

export function StageThreeReadinessPanel() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [readiness, setReadiness] = useState<StageThreeReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function initialize() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/users/context", { cache: "no-store" });
        const result = (await response.json()) as { centres?: Centre[] } & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Stage 3 readiness is unavailable.");
        const availableCentres = result.centres ?? [];
        const initialCentreId = availableCentres[0]?.id ?? "";
        if (!initialCentreId) throw new Error("You do not have an active centre management scope.");
        const record = await fetchReadiness(initialCentreId);
        if (!active) return;
        setCentres(availableCentres);
        setCentreId(initialCentreId);
        setReadiness(record);
      } catch (caught) {
        if (active) setError(errorMessage(caught));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, []);

  async function load(nextCentreId = centreId) {
    setLoading(true);
    setError("");
    try {
      setReadiness(await fetchReadiness(nextCentreId));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function changeCentre(nextCentreId: string) {
    setCentreId(nextCentreId);
    await load(nextCentreId);
  }

  const status = readiness ? statusStyles[readiness.status] : null;
  const outstanding = readiness
    ? [
        ...readiness.blockers.map((text) => ({ text, blocking: true })),
        ...readiness.warnings.map((text) => ({ text, blocking: false })),
      ]
    : [];

  return (
    <section aria-labelledby="stage-three-readiness-heading" className="grid gap-4">
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm md:grid-cols-[1fr_auto_1fr] md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <Icon name="book" size={18} />
          <h2 className="text-lg font-black tracking-tight text-slate-950" id="stage-three-readiness-heading">Readiness</h2>
          {status ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${status.className}`} role="status">{status.label}</span> : null}
        </div>
        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 md:justify-self-center">
          Center
          <select className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold normal-case tracking-normal text-slate-900 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100" disabled={loading} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
            {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
          </select>
        </label>
        <button className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 md:justify-self-end" disabled={loading || !centreId} onClick={() => void load()} type="button">
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {loading && !readiness ? <p className="text-sm text-slate-500">Checking Stage 3 readiness…</p> : null}

      {readiness ? (
        <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3" scope="col">Integration area</th>
                  <th className="px-4 py-3" scope="col">Configured</th>
                  <th className="px-4 py-3" scope="col">Required</th>
                  <th className="px-4 py-3" scope="col">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {readinessRows(readiness.counts).map((row) => (
                  <tr key={row.area}>
                    <td className="px-4 py-3 font-black text-slate-900">{row.area}</td>
                    <td className="px-4 py-3 text-slate-600">{row.configured}</td>
                    <td className="px-4 py-3 text-slate-600">{row.required}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ${row.met ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
                        {row.met ? "Met" : "Missing"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {outstanding.length ? (
            <div className="grid gap-2">
              <h3 className="text-sm font-black text-slate-900">Outstanding</h3>
              <ul className="grid gap-2">
                {outstanding.map((item) => {
                  const href = fixHref(item.text);
                  return (
                    <li className="flex items-start gap-2 text-sm" key={item.text}>
                      <span aria-hidden className={`mt-1.5 h-2 w-2 flex-none rounded-full ${item.blocking ? "bg-red-500" : "bg-amber-500"}`} />
                      {href ? (
                        <Link className="font-semibold text-slate-800 underline-offset-2 hover:underline" href={href}>{item.text}</Link>
                      ) : (
                        <span className="text-slate-800">{item.text}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function readinessRows(counts: StageThreeReadinessCounts) {
  const tutors = plural(counts.activeTutors, "tutor");
  const students = plural(counts.activeStudents, "student");
  return [
    { area: "Academic years", configured: counts.activeAcademicYears, required: "1", met: counts.activeAcademicYears >= 1 },
    { area: "Academic levels", configured: counts.activeAcademicLevels, required: "At least 1", met: counts.activeAcademicLevels >= 1 },
    { area: "Subjects", configured: counts.activeSubjects, required: "At least 1", met: counts.activeSubjects >= 1 },
    { area: "Tutor capabilities", configured: counts.tutorsWithCapabilities, required: `All ${tutors}`, met: counts.tutorsWithCapabilities >= counts.activeTutors },
    { area: "Tutor availability", configured: counts.tutorsWithAvailability, required: `All ${tutors}`, met: counts.tutorsWithAvailability >= counts.activeTutors },
    { area: "Current student placements", configured: counts.studentsWithCurrentPlacement, required: `All ${students}`, met: counts.studentsWithCurrentPlacement >= counts.activeStudents },
  ];
}

function fixHref(item: string) {
  const text = item.toLowerCase();
  if (/academic|subject|level/.test(text)) return "/app/admin/classes";
  if (/tutor/.test(text)) return "/app/admin/tutors";
  if (/student/.test(text)) return "/app/admin/students";
  return null;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

async function fetchReadiness(centreId: string) {
  const params = new URLSearchParams({ readiness: "stage-three", centreId });
  const response = await fetch(`/api/academics/levels?${params.toString()}`, { cache: "no-store" });
  const result = (await response.json()) as StageThreeReadiness & ApiError;
  if (!response.ok) throw new Error(result.error ?? "Stage 3 readiness could not be checked.");
  return result;
}

function errorMessage(caught: unknown) {
  return caught instanceof Error ? caught.message : "Stage 3 readiness could not be checked.";
}
