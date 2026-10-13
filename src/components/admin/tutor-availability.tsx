"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { Icon } from "@/components/dashboard";
import { FormDialog } from "@/components/ui/form-dialog";
import type { Centre } from "@/lib/account-types";
import type { TutorAvailability, TutorAvailabilityList } from "@/lib/tutor-availability-types";
import { StatusBadge } from "./student-management";

type AvailabilityDraft = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type AvailabilityStatusFilter = "all" | "active" | "inactive";
type ApiError = { error?: string };

const days = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const emptyDraft: AvailabilityDraft = { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" };

export function TutorAvailabilityManagement({ tutorProfileId, preferredCentreId }: { tutorProfileId: string; preferredCentreId?: string }) {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [availability, setAvailability] = useState<TutorAvailability[]>([]);
  const [draft, setDraft] = useState<AvailabilityDraft>(emptyDraft);
  const [editingId, setEditingId] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState<TutorAvailability | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatusFilter>("all");
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
        if (!response.ok) throw new Error(result.error ?? "Tutor availability management is unavailable.");
        const authorizedCentres = result.centres ?? [];
        const tutorCentre = authorizedCentres.find((centre) => centre.id === preferredCentreId);
        const scopedCentres = tutorCentre ? [tutorCentre] : authorizedCentres.slice(0, 1);
        const initialCentreId = scopedCentres[0]?.id ?? "";
        if (!initialCentreId) throw new Error("You do not have access to this tutor's centre.");
        const records = await fetchTutorAvailability(tutorProfileId, initialCentreId);
        if (!active) return;
        setCentres(scopedCentres);
        setCentreId(initialCentreId);
        setAvailability(records);
      } catch (caught) {
        if (active) setError(errorMessage(caught, "Tutor availability management is unavailable."));
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [preferredCentreId, tutorProfileId]);

  const visibleAvailability = useMemo(
    () => availability.filter((window) => statusFilter === "all" || window.status === statusFilter),
    [availability, statusFilter],
  );
  const activeCount = availability.filter((window) => window.status === "active").length;

  async function reload() {
    setAvailability(await fetchTutorAvailability(tutorProfileId, centreId));
  }

  function openCreate() {
    setEditingId("");
    setDraft(emptyDraft);
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  function openEdit(window: TutorAvailability) {
    setEditingId(window.id);
    setDraft({ dayOfWeek: window.dayOfWeek, startTime: window.startTime, endTime: window.endTime });
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.startTime >= draft.endTime) {
      setError("End time must be later than start time.");
      return;
    }
    const action = editingId ? "update" : "create";
    setPending(action);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ availabilityAction: action });
      if (editingId) params.set("availabilityId", editingId);
      else params.set("tutorProfileId", tutorProfileId);
      await mutateAvailability(params, { centreId, ...draft });
      setDialogOpen(false);
      setEditingId("");
      setDraft(emptyDraft);
      setNotice(action === "create" ? "Weekly availability added." : "Weekly availability updated.");
      await reload();
    } catch (caught) {
      setError(errorMessage(caught, "Tutor availability could not be saved."));
    } finally {
      setPending("");
    }
  }

  function openDeactivation(window: TutorAvailability) {
    setDeactivationTarget(window);
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

  async function changeStatus(window: TutorAvailability, action: "deactivate" | "reactivate", reason = "") {
    setPending(`${action}:${window.id}`);
    setError("");
    setNotice("");
    try {
      const params = new URLSearchParams({ availabilityAction: action, availabilityId: window.id });
      await mutateAvailability(params, { centreId, reason });
      setNotice(action === "deactivate" ? "Availability deactivated and retained in history." : "Availability reactivated.");
      await reload();
      if (action === "deactivate") {
        setDeactivationTarget(null);
        setDeactivationReason("");
      }
    } catch (caught) {
      setError(errorMessage(caught, "Tutor availability status could not be changed."));
    } finally {
      setPending("");
    }
  }

  return (
    <article className="student-detail-card is-wide">
      <div className="student-onboarding-next">
        <Icon name="calendar" size={18} />
        <div>
          <h2>Weekly availability</h2>
          <p>{activeCount} active recurring window{activeCount === 1 ? "" : "s"}. Times use the selected centre&apos;s local time.</p>
        </div>
        <button className="student-primary-action" disabled={!centreId || pending !== ""} onClick={openCreate} type="button">
          <Icon name="plus" size={16} /> Add availability
        </button>
      </div>

      <label className="scope-control">
        Tutor centre
        <select disabled value={centreId}>
          {centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
        </select>
      </label>

      <label className="scope-control">
        Availability history
        <select disabled={loading || pending !== ""} onChange={(event) => setStatusFilter(event.target.value as AvailabilityStatusFilter)} value={statusFilter}>
          <option value="all">All availability</option>
          <option value="active">Active only</option>
          <option value="inactive">Inactive only</option>
        </select>
      </label>

      {loading ? <p className="student-state-message">Loading tutor availability…</p> : null}
      {error && !dialogOpen && !deactivationTarget ? <p className="form-error" role="alert">{error}</p> : null}
      {notice ? <p className="student-state-message" role="status">{notice}</p> : null}
      {!loading && !availability.length ? <p className="empty-state">No recurring availability has been recorded for this tutor.</p> : null}
      {!loading && availability.length > 0 && !visibleAvailability.length ? <p className="empty-state">No availability matches the selected history filter.</p> : null}

      {visibleAvailability.length ? (
        <div className="student-table-wrap">
          <table className="student-table">
            <thead>
              <tr>
                <th scope="col">Day</th>
                <th scope="col">Available from</th>
                <th scope="col">Available until</th>
                <th scope="col">Centre</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleAvailability.map((window) => (
                <tr key={window.id}>
                  <td><strong>{dayLabel(window.dayOfWeek)}</strong></td>
                  <td>{window.startTime}</td>
                  <td>{window.endTime}</td>
                  <td>{window.centreName}</td>
                  <td><StatusBadge status={window.status} /></td>
                  <td>
                    <div className="onboarding-action-row">
                      <button className="student-secondary-action" disabled={pending !== "" || window.status !== "active"} onClick={() => openEdit(window)} type="button">Edit</button>
                      {window.status === "active" ? (
                        <button className="student-secondary-action" disabled={pending !== ""} onClick={() => openDeactivation(window)} type="button">Deactivate</button>
                      ) : (
                        <button className="student-secondary-action" disabled={pending !== ""} onClick={() => void changeStatus(window, "reactivate")} type="button">Reactivate</button>
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
        title={editingId ? "Edit weekly availability" : "Add weekly availability"}
        description="Record a recurring weekly window when this tutor can be scheduled at their centre."
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
            Day of week
            <select onChange={(event) => setDraft({ ...draft, dayOfWeek: Number(event.target.value) })} value={draft.dayOfWeek}>
              {days.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
            </select>
          </label>
          <label>
            Available from
            <input onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} required type="time" value={draft.startTime} />
          </label>
          <label>
            Available until
            <input onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} required type="time" value={draft.endTime} />
          </label>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
          <div className="dialog-actions">
            <button disabled={pending !== ""} onClick={() => setDialogOpen(false)} type="button">Cancel</button>
            <button className="primary-button" disabled={pending !== "" || !draft.startTime || !draft.endTime} type="submit">
              {pending ? "Saving…" : editingId ? "Save availability" : "Add availability"}
            </button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(deactivationTarget)}
        title="Deactivate weekly availability"
        description={deactivationTarget ? `Retire the ${dayLabel(deactivationTarget.dayOfWeek)} ${deactivationTarget.startTime}–${deactivationTarget.endTime} window while retaining its history.` : "Retire this availability window while retaining its history."}
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
              {pending.startsWith("deactivate:") ? "Deactivating…" : "Deactivate availability"}
            </button>
          </div>
        </form>
      </FormDialog>
    </article>
  );
}

async function fetchTutorAvailability(tutorProfileId: string, centreId: string) {
  const params = new URLSearchParams({ availabilityFor: tutorProfileId, centreId });
  const response = await fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, { cache: "no-store" });
  const result = (await response.json()) as TutorAvailabilityList & ApiError;
  if (!response.ok) throw new Error(result.error ?? "Tutor availability could not be loaded.");
  return result.availability ?? [];
}

async function mutateAvailability(params: URLSearchParams, body: Record<string, unknown>) {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!csrfResponse.ok) throw new Error("Request verification is unavailable.");
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const response = await fetch(`/api/profiles/onboarding/tutors?${params.toString()}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-csrf-token": csrfToken },
    body: JSON.stringify(body),
  });
  const result = (await response.json()) as ApiError;
  if (!response.ok) throw new Error(result.error ?? "Tutor availability management failed.");
}

function dayLabel(dayOfWeek: number) {
  return days.find((day) => day.value === dayOfWeek)?.label ?? "Unknown day";
}

function errorMessage(caught: unknown, fallback: string) {
  return caught instanceof Error ? caught.message : fallback;
}
