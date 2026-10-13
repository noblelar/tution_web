"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/dashboard";
import type { Centre } from "@/lib/account-types";
import type { StageThreeReadiness } from "@/lib/stage-three-readiness-types";

type ApiError = { error?: string };

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

  return (
    <section aria-labelledby="stage-three-readiness-heading" className="student-detail-card is-wide">
      <div className="student-onboarding-next">
        <Icon name="book" size={18} />
        <div>
          <h2 id="stage-three-readiness-heading">Stage 3 integration readiness</h2>
          <p>Confirm the academic foundation and assignment coverage before class scheduling depends on this data.</p>
        </div>
        <button className="student-secondary-action" disabled={loading || !centreId} onClick={() => void load()} type="button">
          {loading ? "Checking…" : "Refresh readiness"}
        </button>
      </div>

      <label className="scope-control">
        Management centre
        <select disabled={loading} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
          {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
        </select>
      </label>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {loading && !readiness ? <p className="student-state-message">Checking Stage 3 readiness…</p> : null}

      {readiness ? (
        <>
          <p className="student-state-message" role="status">
            <strong>{readiness.status === "ready" ? "Ready" : readiness.status === "blocked" ? "Blocked" : "Attention required"}.</strong>{" "}
            {readiness.ready ? "The centre has complete Stage 3 assignment coverage." : "Review the outstanding items below."}
          </p>

          <div className="student-table-wrap">
            <table className="student-table">
              <thead><tr><th scope="col">Integration area</th><th scope="col">Configured</th><th scope="col">Total active</th></tr></thead>
              <tbody>
                <tr><td><strong>Academic years</strong></td><td>{readiness.counts.activeAcademicYears}</td><td>1 required</td></tr>
                <tr><td><strong>Academic levels</strong></td><td>{readiness.counts.activeAcademicLevels}</td><td>At least 1</td></tr>
                <tr><td><strong>Subjects</strong></td><td>{readiness.counts.activeSubjects}</td><td>At least 1</td></tr>
                <tr><td><strong>Tutor capabilities</strong></td><td>{readiness.counts.tutorsWithCapabilities}</td><td>{readiness.counts.activeTutors} tutors</td></tr>
                <tr><td><strong>Tutor availability</strong></td><td>{readiness.counts.tutorsWithAvailability}</td><td>{readiness.counts.activeTutors} tutors</td></tr>
                <tr><td><strong>Current student placements</strong></td><td>{readiness.counts.studentsWithCurrentPlacement}</td><td>{readiness.counts.activeStudents} students</td></tr>
              </tbody>
            </table>
          </div>

          {readiness.blockers.length ? <ReadinessItems title="Blocking configuration" items={readiness.blockers} alert /> : null}
          {readiness.warnings.length ? <ReadinessItems title="Assignment coverage" items={readiness.warnings} /> : null}
        </>
      ) : null}
    </section>
  );
}

function ReadinessItems({ title, items, alert = false }: { title: string; items: string[]; alert?: boolean }) {
  return (
    <div className="student-state-message" role={alert ? "alert" : undefined}>
      <strong>{title}</strong>
      <ul>{items.map((item) => <li key={item}>{item}</li>)}</ul>
    </div>
  );
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
