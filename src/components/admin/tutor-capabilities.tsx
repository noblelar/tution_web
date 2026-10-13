"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Centre } from "@/lib/account-types";
import type {
  AcademicLevel,
  AcademicLevelList,
  Subject,
  SubjectList,
  TutorCapability,
  TutorCapabilityList,
} from "@/lib/academic-types";
import { StatusBadge } from "./student-management";

type CapabilityDraft = {
  subjectId: string;
  academicLevelId: string;
  isPrimarySubject: boolean;
};

type ApiError = { error?: string };
type CapabilityStatusFilter = "all" | "active" | "inactive";

const emptyDraft: CapabilityDraft = { subjectId: "", academicLevelId: "", isPrimarySubject: false };

export function TutorCapabilities({ tutorProfileId, preferredCentreId }: { tutorProfileId: string; preferredCentreId?: string }) {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [levels, setLevels] = useState<AcademicLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [capabilities, setCapabilities] = useState<TutorCapability[]>([]);
  const [draft, setDraft] = useState<CapabilityDraft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState<TutorCapability | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<CapabilityStatusFilter>("all");
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
        if (!response.ok) throw new Error(result.error ?? "Tutor capability management is unavailable.");
        const availableCentres = result.centres ?? [];
        const initialCentre = availableCentres.some((centre) => centre.id === preferredCentreId)
          ? preferredCentreId ?? ""
          : availableCentres[0]?.id ?? "";
        if (!initialCentre) throw new Error("You do not have an active centre management scope.");
        const records = await fetchCapabilityRecords(tutorProfileId, initialCentre);
        if (!active) return;
        setCentres(availableCentres);
        setCentreId(initialCentre);
        setLevels(records.levels);
        setSubjects(records.subjects);
        setCapabilities(records.capabilities);
      } catch (caught) {
        if (active) setError(errorMessage(caught, "Tutor capability management is unavailable."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [preferredCentreId, tutorProfileId]);

  const activeLevels = useMemo(() => levels.filter((level) => level.status === "active"), [levels]);
  const activeSubjects = useMemo(() => subjects.filter((subject) => subject.status === "active"), [subjects]);
  const visibleCapabilities = useMemo(
    () => capabilities.filter((capability) => statusFilter === "all" || capability.status === statusFilter),
    [capabilities, statusFilter],
  );
  const activeCount = capabilities.filter((capability) => capability.status === "active").length;

  async function reload(scopeCentreId: string) {
    const records = await fetchCapabilityRecords(tutorProfileId, scopeCentreId);
    setLevels(records.levels);
    setSubjects(records.subjects);
    setCapabilities(records.capabilities);
  }

  async function changeCentre(nextCentreId: string) {
    setCentreId(nextCentreId);
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await reload(nextCentreId);
    } catch (caught) {
      setError(errorMessage(caught, "Tutor capabilities could not be loaded."));
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingId("");
    setDraft({
      subjectId: activeSubjects[0]?.id ?? "",
      academicLevelId: activeLevels[0]?.id ?? "",
      isPrimarySubject: false,
    });
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  function openEdit(capability: TutorCapability) {
    setEditingId(capability.id);
    setDraft({
      subjectId: capability.subjectId,
      academicLevelId: capability.academicLevelId,
      isPrimarySubject: capability.isPrimarySubject,
    });
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
      const params = new URLSearchParams({ capabilityAction: action });
      if (editingId) params.set("capabilityId", editingId);
      else params.set("tutorProfileId", tutorProfileId);
      await mutateCapability(params, { centreId, ...draft });
      setDialogOpen(false);
      setEditingId("");
      setDraft(emptyDraft);
      setNotice(action === "create" ? "Teaching capability assigned." : "Teaching capability updated.");
      await reload(centreId);
    } catch (caught) {
      setError(errorMessage(caught, "The teaching capability could not be saved."));
    } finally {
      setPending("");
    }
  }

  function openDeactivation(capability: TutorCapability) {
    setDeactivationTarget(capability);
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

  async function changeStatus(capability: TutorCapability, action: "deactivate" | "reactivate", reason = "") {
    setPending(`${action}:${capability.id}`);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ capabilityAction: action, capabilityId: capability.id });
      await mutateCapability(params, { centreId, reason });
      setNotice(action === "deactivate" ? "Teaching capability deactivated and retained in history." : "Teaching capability reactivated.");
      await reload(centreId);
      if (action === "deactivate") {
        setDeactivationTarget(null);
        setDeactivationReason("");
      }
    } catch (caught) {
      setError(errorMessage(caught, "The teaching capability status could not be changed."));
    } finally {
      setPending("");
    }
  }

  const canAdd = Boolean(activeLevels.length && activeSubjects.length && centreId);

  return (
    <article className="student-detail-card is-wide">
      <div className="student-onboarding-next">
        <Icon name="book" size={18} />
        <div>
          <h2>Teaching capabilities</h2>
          <p>{activeCount} active subject-and-level combination{activeCount === 1 ? "" : "s"}. Capabilities are shared across Tution and authorized through the selected centre.</p>
        </div>
        <button className="student-primary-action" disabled={!canAdd || pending !== ""} onClick={openCreate} type="button">
          <Icon name="plus" size={16} /> Assign capability
        </button>
      </div>

      <label className="scope-control">
        Authorize through centre
        <select disabled={loading || pending !== ""} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>
          {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
        </select>
      </label>

      <label className="scope-control">
        Capability history
        <select disabled={loading || pending !== ""} onChange={(event) => setStatusFilter(event.target.value as CapabilityStatusFilter)} value={statusFilter}>
          <option value="all">All capabilities</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </label>

      {loading ? <p className="student-state-message">Loading teaching capabilities…</p> : null}
      {error && !dialogOpen && !deactivationTarget ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="student-state-message" role="status">{notice}</p> : null}
      {!loading && !capabilities.length ? <p className="empty-state">No teaching capabilities have been assigned to this tutor yet.</p> : null}
      {!loading && capabilities.length > 0 && !visibleCapabilities.length ? <p className="empty-state">No capabilities match the selected history filter.</p> : null}

      {visibleCapabilities.length ? (
        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Academic level</th>
                <th scope="col">Priority</th>
                <th scope="col">Catalogue</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleCapabilities.map((capability) => (
                <tr key={capability.id}>
                  <td><strong>{capability.subjectName}</strong><span>{capability.subjectCode}</span></td>
                  <td><strong>{capability.academicLevelName}</strong></td>
                  <td>{capability.isPrimarySubject ? <span className="student-status-badge is-active">Primary</span> : "Additional"}</td>
                  <td><span>{capability.subjectStatus === "active" && capability.academicLevelStatus === "active" ? "Available" : "Catalogue entry inactive"}</span></td>
                  <td><StatusBadge status={capability.status} /></td>
                  <td>
                    <div className="onboarding-action-row">
                      <button className="student-secondary-action" disabled={pending !== "" || capability.status !== "active" || capability.subjectStatus !== "active" || capability.academicLevelStatus !== "active"} onClick={() => openEdit(capability)} type="button">Edit</button>
                      {capability.status === "active" ? (
                        <button className="student-secondary-action" disabled={pending !== ""} onClick={() => openDeactivation(capability)} type="button">Deactivate</button>
                      ) : (
                        <button className="student-secondary-action" disabled={pending !== "" || capability.subjectStatus !== "active" || capability.academicLevelStatus !== "active"} onClick={() => void changeStatus(capability, "reactivate")} type="button">Reactivate</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <FormDialog
        open={dialogOpen}
        title={editingId ? "Edit teaching capability" : "Assign teaching capability"}
        description="Choose the subject and academic level this tutor is qualified to teach."
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
            Subject
            <select onChange={(event) => setDraft({ ...draft, subjectId: event.target.value })} required value={draft.subjectId}>
              {activeSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name} ({subject.code})</option>)}
            </select>
          </label>
          <label>
            Academic level
            <select onChange={(event) => setDraft({ ...draft, academicLevelId: event.target.value })} required value={draft.academicLevelId}>
              {activeLevels.map((level) => <option key={level.id} value={level.id}>{level.name}</option>)}
            </select>
          </label>
          <div className="form-check-grid">
            <label>
              <input checked={draft.isPrimarySubject} onChange={(event) => setDraft({ ...draft, isPrimarySubject: event.target.checked })} type="checkbox" />
              Mark this as a primary teaching subject
            </label>
          </div>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pending !== ""} onClick={() => setDialogOpen(false)} type="button">Cancel</button>
            <button className="primary-button" disabled={pending !== "" || !draft.subjectId || !draft.academicLevelId} type="submit">{pending ? "Saving…" : editingId ? "Save capability" : "Assign capability"}</button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(deactivationTarget)}
        title="Deactivate teaching capability"
        description={deactivationTarget ? `Retire ${deactivationTarget.subjectName} at ${deactivationTarget.academicLevelName} while retaining its history.` : "Retire this teaching capability while retaining its history."}
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
            <textarea
              autoFocus
              maxLength={500}
              onChange={(event) => setDeactivationReason(event.target.value)}
              placeholder="Explain why this tutor should no longer be assigned this capability."
              required
              rows={4}
              value={deactivationReason}
            />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pending !== ""} onClick={() => {
              setDeactivationTarget(null);
              setDeactivationReason("");
              setError("");
            }} type="button">Cancel</button>
            <button className="primary-button" disabled={pending !== "" || !deactivationReason.trim()} type="submit">
              {pending.startsWith("deactivate:") ? "Deactivating…" : "Deactivate capability"}
            </button>
          </div>
        </form>
      </FormDialog>
    </article>
  );
}

async function fetchCapabilityRecords(tutorProfileId: string, centreId: string) {
  const scope = `centreId=${encodeURIComponent(centreId)}`;
  const [levelResponse, subjectResponse, capabilityResponse] = await Promise.all([
    fetch(`/api/academics/levels?${scope}`, { cache: "no-store" }),
    fetch(`/api/academics/subjects?${scope}`, { cache: "no-store" }),
    fetch(`/api/profiles/onboarding/tutors?capabilitiesFor=${encodeURIComponent(tutorProfileId)}&${scope}`, { cache: "no-store" }),
  ]);
  const levelResult = (await levelResponse.json()) as AcademicLevelList & ApiError;
  const subjectResult = (await subjectResponse.json()) as SubjectList & ApiError;
  const capabilityResult = (await capabilityResponse.json()) as TutorCapabilityList & ApiError;
  if (!levelResponse.ok) throw new Error(levelResult.error ?? "Academic levels could not be loaded.");
  if (!subjectResponse.ok) throw new Error(subjectResult.error ?? "Subjects could not be loaded.");
  if (!capabilityResponse.ok) throw new Error(capabilityResult.error ?? "Tutor capabilities could not be loaded.");
  return {
    levels: levelResult.levels ?? [],
    subjects: subjectResult.subjects ?? [],
    capabilities: capabilityResult.capabilities ?? [],
  };
}

async function mutateCapability(params: URLSearchParams, body: Record<string, unknown>) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification is unavailable.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiError;
  if (!response.ok) throw new Error(result.error ?? "Tutor capability management failed.");
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
