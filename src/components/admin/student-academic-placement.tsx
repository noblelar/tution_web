"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Centre } from "@/lib/account-types";
import type { StudentPlacement, StudentPlacementList } from "@/lib/student-placement-types";
import { StatusBadge } from "./student-management";

type AcademicLevelRecord = { id: string; name: string; status: "active" | "inactive" };
type AcademicYearRecord = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "closed";
};
type PlacementDraft = { academicYearId: string; academicLevelId: string };
type PlacementStatusFilter = "all" | "active" | "inactive";
type ApiError = { error?: string };

const emptyDraft: PlacementDraft = { academicYearId: "", academicLevelId: "" };

export function StudentAcademicPlacement({ studentProfileId, preferredCentreId }: { studentProfileId: string; preferredCentreId?: string }) {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [levels, setLevels] = useState<AcademicLevelRecord[]>([]);
  const [years, setYears] = useState<AcademicYearRecord[]>([]);
  const [placements, setPlacements] = useState<StudentPlacement[]>([]);
  const [draft, setDraft] = useState<PlacementDraft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState<StudentPlacement | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<PlacementStatusFilter>("all");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function initialize() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/users/context", { cache: "no-store" });
        const result = (await response.json()) as { centres?: Centre[] } & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Student academic placement is unavailable.");
        const authorizedCentres = result.centres ?? [];
        const studentCentre = authorizedCentres.find((centre) => centre.id === preferredCentreId);
        const scopedCentres = studentCentre ? [studentCentre] : authorizedCentres.slice(0, 1);
        const initialCentreId = scopedCentres[0]?.id ?? "";
        if (!initialCentreId) throw new Error("You do not have access to this student's centre.");
        const records = await fetchPlacementRecords(studentProfileId, initialCentreId);
        if (!active) return;
        setCentres(scopedCentres);
        setCentreId(initialCentreId);
        setLevels(records.levels);
        setYears(records.years);
        setPlacements(records.placements);
      } catch (caught) {
        if (active) setError(errorMessage(caught, "Student academic placement is unavailable."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [preferredCentreId, studentProfileId]);

  const activeLevels = useMemo(() => levels.filter((level) => level.status === "active"), [levels]);
  const openYears = useMemo(() => years.filter((year) => year.status !== "closed"), [years]);
  const assignedYearIds = useMemo(() => new Set(placements.map((placement) => placement.academicYearId)), [placements]);
  const visiblePlacements = useMemo(
    () => placements.filter((placement) => statusFilter === "all" || placement.status === statusFilter),
    [placements, statusFilter],
  );
  const unassignedYears = openYears.filter((year) => !assignedYearIds.has(year.id));
  const activeCount = placements.filter((placement) => placement.status === "active").length;

  async function reload() {
    const records = await fetchPlacementRecords(studentProfileId, centreId);
    setLevels(records.levels);
    setYears(records.years);
    setPlacements(records.placements);
  }

  function openCreate() {
    setEditingId("");
    setDraft({ academicYearId: unassignedYears[0]?.id ?? "", academicLevelId: activeLevels[0]?.id ?? "" });
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  function openEdit(placement: StudentPlacement) {
    setEditingId(placement.id);
    setDraft({ academicYearId: placement.academicYearId, academicLevelId: placement.academicLevelId });
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = editingId ? "update" : "create";
    setPending(action);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ placementAction: action });
      if (editingId) params.set("placementId", editingId);
      else params.set("studentProfileId", studentProfileId);
      await mutatePlacement(params, { centreId, ...draft });
      setDialogOpen(false);
      setEditingId("");
      setDraft(emptyDraft);
      setNotice(action === "create" ? "Student academic placement assigned." : "Student academic placement updated.");
      await reload();
    } catch (caught) {
      setError(errorMessage(caught, "Student academic placement could not be saved."));
    } finally {
      setPending("");
    }
  }

  function openDeactivation(placement: StudentPlacement) {
    setDeactivationTarget(placement);
    setDeactivationReason("");
    setError("");
    setNotice("");
  }

  async function deactivate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deactivationTarget) return;
    const reason = deactivationReason.trim();
    if (!reason) {
      setError("A deactivation reason is required.");
      return;
    }
    await changeStatus(deactivationTarget, "deactivate", reason);
  }

  async function changeStatus(placement: StudentPlacement, action: "deactivate" | "reactivate", reason = "") {
    setPending(`${action}:${placement.id}`);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ placementAction: action, placementId: placement.id });
      await mutatePlacement(params, { centreId, reason });
      setNotice(action === "deactivate" ? "Placement deactivated and retained in history." : "Placement reactivated.");
      await reload();
      if (action === "deactivate") {
        setDeactivationTarget(null);
        setDeactivationReason("");
      }
    } catch (caught) {
      setError(errorMessage(caught, "Student placement status could not be changed."));
    } finally {
      setPending("");
    }
  }

  const canCreate = Boolean(centreId && unassignedYears.length && activeLevels.length);

  return (
    <article className="student-detail-card is-wide">
      <div className="student-onboarding-next">
        <Icon name="book" size={18} />
        <div>
          <h2>Academic placement</h2>
          <p>{activeCount} active academic-year placement{activeCount === 1 ? "" : "s"}. Each year records one academic level for this student.</p>
        </div>
        <button className="student-primary-action" disabled={!canCreate || pending !== ""} onClick={openCreate} type="button">
          <Icon name="plus" size={16} /> Assign placement
        </button>
      </div>

      <label className="scope-control">
        Student centre
        <select disabled value={centreId}>
          {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
        </select>
      </label>

      <label className="scope-control">
        Placement history
        <select disabled={loading || pending !== ""} onChange={(event) => setStatusFilter(event.target.value as PlacementStatusFilter)} value={statusFilter}>
          <option value="all">All placements</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </label>

      {loading ? <p className="student-state-message">Loading academic placement…</p> : null}
      {error && !dialogOpen && !deactivationTarget ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="student-state-message" role="status">{notice}</p> : null}
      {!loading && !placements.length ? <p className="empty-state">This student has not been placed into an academic level yet.</p> : null}
      {!loading && placements.length > 0 && !visiblePlacements.length ? <p className="empty-state">No placements match the selected history filter.</p> : null}

      {visiblePlacements.length ? (
        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th scope="col">Academic year</th>
                <th scope="col">Academic level</th>
                <th scope="col">Timeline</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visiblePlacements.map((placement) => {
                const year = yearById(years, placement.academicYearId);
                const level = levelById(levels, placement.academicLevelId);
                const referencesAvailable = year?.status !== "closed" && level?.status === "active";
                return (
                  <tr key={placement.id}>
                    <td><strong>{year?.name ?? "Unknown academic year"}</strong></td>
                    <td>{level?.name ?? "Unknown academic level"}</td>
                    <td>{year ? `${formatDate(year.startDate)} – ${formatDate(year.endDate)}` : "Unavailable"}</td>
                    <td><StatusBadge status={placement.status} /></td>
                    <td>
                      <div className="onboarding-action-row">
                        <button className="student-secondary-action" disabled={pending !== "" || placement.status !== "active" || !referencesAvailable} onClick={() => openEdit(placement)} type="button">Edit</button>
                        {placement.status === "active" ? (
                          <button className="student-secondary-action" disabled={pending !== ""} onClick={() => openDeactivation(placement)} type="button">Deactivate</button>
                        ) : (
                          <button className="student-secondary-action" disabled={pending !== "" || !referencesAvailable} onClick={() => void changeStatus(placement, "reactivate")} type="button">Reactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      <FormDialog
        open={dialogOpen}
        title={editingId ? "Edit academic placement" : "Assign academic placement"}
        description="Choose the academic year and the level at which this student should be taught."
        onOpenChange={(open) => {
          if (!open && pending === "") {
            setDialogOpen(false);
            setEditingId("");
            setError("");
          }
        }}
      >
        <form className="account-form" onSubmit={submit}>
          <label>
            Academic year
            <select onChange={(event) => setDraft({ ...draft, academicYearId: event.target.value })} required value={draft.academicYearId}>
              {(editingId ? openYears.filter((year) => year.id === draft.academicYearId || !assignedYearIds.has(year.id)) : unassignedYears).map((year) => (
                <option key={year.id} value={year.id}>{year.name} ({formatDate(year.startDate)} – {formatDate(year.endDate)})</option>
              ))}
            </select>
          </label>
          <label>
            Academic level
            <select onChange={(event) => setDraft({ ...draft, academicLevelId: event.target.value })} required value={draft.academicLevelId}>
              {activeLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
            </select>
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pending !== ""} onClick={() => setDialogOpen(false)} type="button">Cancel</button>
            <button className="primary-button" disabled={pending !== "" || !draft.academicYearId || !draft.academicLevelId} type="submit">
              {pending ? "Saving…" : editingId ? "Save placement" : "Assign placement"}
            </button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(deactivationTarget)}
        title="Deactivate academic placement"
        description="Retire this placement while retaining the student's academic history."
        onOpenChange={(open) => {
          if (!open && pending === "") {
            setDeactivationTarget(null);
            setDeactivationReason("");
            setError("");
          }
        }}
      >
        <form className="account-form" onSubmit={deactivate}>
          <label>
            Reason for deactivation
            <textarea autoFocus maxLength={500} onChange={(event) => setDeactivationReason(event.target.value)} required rows={4} value={deactivationReason} />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pending !== ""} onClick={() => {
              setDeactivationTarget(null);
              setDeactivationReason("");
              setError("");
            }} type="button">Cancel</button>
            <button className="primary-button" disabled={pending !== "" || !deactivationReason.trim()} type="submit">
              {pending.startsWith("deactivate:") ? "Deactivating…" : "Deactivate placement"}
            </button>
          </div>
        </form>
      </FormDialog>
    </article>
  );
}

async function fetchPlacementRecords(studentProfileId: string, centreId: string) {
  const scope = `centreId=${encodeURIComponent(centreId)}`;
  const [levelResponse, yearResponse, placementResponse] = await Promise.all([
    fetch(`/api/academics/levels?${scope}`, { cache: "no-store" }),
    fetch(`/api/academics/years?${scope}`, { cache: "no-store" }),
    fetch(`/api/profiles/onboarding/students?placementsFor=${encodeURIComponent(studentProfileId)}&${scope}`, { cache: "no-store" }),
  ]);
  const levelResult = (await levelResponse.json()) as { levels?: AcademicLevelRecord[] } & ApiError;
  const yearResult = (await yearResponse.json()) as { years?: AcademicYearRecord[] } & ApiError;
  const placementResult = (await placementResponse.json()) as StudentPlacementList & ApiError;
  if (!levelResponse.ok) throw new Error(levelResult.error ?? "Academic levels could not be loaded.");
  if (!yearResponse.ok) throw new Error(yearResult.error ?? "Academic years could not be loaded.");
  if (!placementResponse.ok) throw new Error(placementResult.error ?? "Student placements could not be loaded.");
  return {
    levels: levelResult.levels ?? [],
    years: yearResult.years ?? [],
    placements: placementResult.placements ?? [],
  };
}

async function mutatePlacement(params: URLSearchParams, body: Record<string, unknown>) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification is unavailable.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(`/api/profiles/onboarding/students?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiError;
  if (!response.ok) throw new Error(result.error ?? "Student academic placement management failed.");
}

function yearById(years: AcademicYearRecord[], id: string) {
  return years.find((year) => year.id === id);
}

function levelById(levels: AcademicLevelRecord[], id: string) {
  return levels.find((level) => level.id === id);
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
