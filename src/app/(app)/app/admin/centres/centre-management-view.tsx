"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { feedbackButton } from "@/components/feedback/feedback-display";
import { FormDialog } from "@/components/ui/form-dialog";
import { SummaryStat } from "@/components/ui/summary-stat";
import { centreManagementCapabilities } from "@/lib/centre-access";
import {
  CentreAccessRole,
  CentreFormValues,
  ManagedCentre,
} from "@/lib/centre-types";

type ApiError = { error?: string };
type CurrentUser = { roles: CentreAccessRole[] };
type StatusAction = "deactivate" | "reactivate";
type StatusChange = { centre: ManagedCentre; action: StatusAction };

const emptyForm: CentreFormValues = {
  code: "",
  name: "",
  address: "",
  timeZone: "Europe/London",
};

const primaryButtonClasses = "inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent bg-[#ff4b12] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e6400c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClasses = "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/30 disabled:cursor-not-allowed disabled:opacity-60";
const dangerButtonClasses = "inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60";
const inputClasses = "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

function normalizedRoleKey(role: CentreAccessRole): string {
  return role.roleKey.trim().toLowerCase();
}

function hasRealAddress(address: string): boolean {
  const normalized = address.trim();
  return normalized !== "" && normalized.toLowerCase() !== "address pending";
}

function sortedCentres(centres: ManagedCentre[]): ManagedCentre[] {
  return [...centres].sort((left, right) => left.name.localeCompare(right.name));
}

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Request verification is unavailable.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

async function apiError(response: Response, fallback: string): Promise<string> {
  try {
    const result = (await response.json()) as ApiError;
    return result.error?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export function CentreManagement() {
  const [centres, setCentres] = useState<ManagedCentre[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formValues, setFormValues] = useState<CentreFormValues>(emptyForm);
  const [editingCentre, setEditingCentre] = useState<ManagedCentre | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusChange, setStatusChange] = useState<StatusChange | null>(null);
  const [deletingCentre, setDeletingCentre] = useState<ManagedCentre | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [pageError, setPageError] = useState("");
  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCentres = useCallback(async () => {
    const response = await fetch("/api/centres", { cache: "no-store" });
    if (!response.ok) throw new Error(await apiError(response, "Centres could not be loaded."));
    const result = (await response.json()) as { centres?: ManagedCentre[] };
    const loadedCentres = sortedCentres(result.centres ?? []);
    setCentres(loadedCentres);
    return loadedCentres;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPageError("");
      try {
        const userResponse = await fetch("/api/auth/me", { cache: "no-store" });
        if (!userResponse.ok) {
          throw new Error(await apiError(userResponse, "Your session could not be verified."));
        }
        const userResult = (await userResponse.json()) as { user?: CurrentUser };
        if (!userResult.user) throw new Error("Your session could not be verified.");
        if (cancelled) return;
        setCurrentUser(userResult.user);

        const loadedCentres = await loadCentres();
        if (
          !loadedCentres.length &&
          centreManagementCapabilities(userResult.user.roles).canCreate
        ) {
          setNotice("Complete organization setup by creating your first centre.");
          setFormValues(emptyForm);
          setDialogOpen(true);
        }
      } catch (caught) {
        if (!cancelled) {
          setPageError(caught instanceof Error ? caught.message : "Centres could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [loadCentres]);

  const roles = useMemo(() => currentUser?.roles ?? [], [currentUser]);
  const pageCapabilities = useMemo(() => centreManagementCapabilities(roles), [roles]);
  const roleKeys = useMemo(
    () => Array.from(new Set(roles.map(normalizedRoleKey).filter(Boolean))),
    [roles],
  );
  const isOwner = roleKeys.includes("owner");
  const isManager = roleKeys.includes("manager");
  const isTutor = roleKeys.includes("tutor");

  const filteredCentres = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return centres.filter((centre) => {
      const matchesStatus = statusFilter === "all" || centre.status === statusFilter;
      const matchesQuery =
        !needle ||
        [centre.name, centre.code, centre.address].some((value) =>
          value.toLowerCase().includes(needle),
        );
      return matchesStatus && matchesQuery;
    });
  }, [centres, query, statusFilter]);

  const activeCount = centres.filter((centre) => centre.status === "active").length;
  const inactiveCount = centres.length - activeCount;
  const preparedForm = {
    code: formValues.code.trim().toUpperCase(),
    name: formValues.name.trim(),
    address: formValues.address.trim(),
    timeZone: formValues.timeZone.trim(),
  };
  const formRequiresRealAddress = !editingCentre || editingCentre.status === "active";
  const formReady =
    /^[A-Z0-9_-]{1,16}$/.test(preparedForm.code) &&
    preparedForm.name !== "" &&
    preparedForm.address !== "" &&
    preparedForm.timeZone !== "" &&
    (!formRequiresRealAddress || hasRealAddress(preparedForm.address));

  function upsertCentre(saved: ManagedCentre) {
    setCentres((current) =>
      sortedCentres(
        current.some((centre) => centre.id === saved.id)
          ? current.map((centre) => (centre.id === saved.id ? saved : centre))
          : [...current, saved],
      ),
    );
  }

  function openCreateDialog() {
    if (!pageCapabilities.canCreate) return;
    setEditingCentre(null);
    setFormValues(emptyForm);
    setFormError("");
    setPageError("");
    setNotice("");
    setDialogOpen(true);
  }

  function openEditDialog(centre: ManagedCentre) {
    if (!centreManagementCapabilities(roles, centre.id).canEdit) return;
    setEditingCentre(centre);
    setFormValues({
      code: centre.code,
      name: centre.name,
      address: centre.address,
      timeZone: centre.timeZone,
    });
    setFormError("");
    setPageError("");
    setNotice("");
    setDialogOpen(true);
  }

  function updateForm(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = event.currentTarget;
    setFormValues((current) => ({
      ...current,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  function setFormOpen(open: boolean) {
    if (pendingAction === "save-centre") return;
    setDialogOpen(open);
    if (!open) setFormError("");
  }

  async function saveCentre() {
    const capability = editingCentre
      ? centreManagementCapabilities(roles, editingCentre.id).canEdit
      : pageCapabilities.canCreate;
    if (!capability) {
      setFormError(
        editingCentre
          ? "You cannot edit this centre."
          : "Only an owner can create a centre.",
      );
      return;
    }
    if (!formReady) {
      setFormError(
        formRequiresRealAddress && !hasRealAddress(preparedForm.address)
          ? "Provide the centre's real address before saving it as an active centre."
          : "Complete all centre details using a valid centre code.",
      );
      return;
    }

    setFormError("");
    setPageError("");
    setNotice("");
    setPendingAction("save-centre");
    try {
      const creatingFirstCentre = !editingCentre && centres.length === 0;
      const csrf = await csrfToken();
      const path = editingCentre
        ? `/api/centres/${encodeURIComponent(editingCentre.id)}`
        : "/api/centres";
      const response = await fetch(path, {
        method: editingCentre ? "PATCH" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(preparedForm),
      });
      if (!response.ok) {
        throw new Error(await apiError(response, "The centre could not be saved."));
      }
      const saved = (await response.json()) as ManagedCentre;
      upsertCentre(saved);
      setDialogOpen(false);
      setNotice(
        editingCentre
          ? "Centre details updated."
          : creatingFirstCentre
            ? "First centre created. Organization setup is complete."
            : "Centre created.",
      );
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : "The centre could not be saved.");
    } finally {
      setPendingAction("");
    }
  }

  function requestStatusChange(centre: ManagedCentre, action: StatusAction) {
    if (!centreManagementCapabilities(roles, centre.id).canManageStatus) return;
    setPageError("");
    setNotice("");
    if (action === "reactivate" && !hasRealAddress(centre.address)) {
      setPageError(`Add a real address to ${centre.name} before reactivating it.`);
      return;
    }
    setStatusChange({ centre, action });
  }

  function setStatusDialogOpen(open: boolean) {
    if (statusChange && pendingAction === `${statusChange.centre.id}:${statusChange.action}`) return;
    if (!open) setStatusChange(null);
  }

  async function changeStatus() {
    if (!statusChange) return;
    const { centre, action } = statusChange;
    if (!centreManagementCapabilities(roles, centre.id).canManageStatus) {
      setPageError("You cannot change this centre's status.");
      setStatusChange(null);
      return;
    }

    setPageError("");
    setNotice("");
    setPendingAction(`${centre.id}:${action}`);
    try {
      const csrf = await csrfToken();
      const response = await fetch(`/api/centres/${encodeURIComponent(centre.id)}/${action}`, {
        method: "POST",
        headers: { "x-csrf-token": csrf },
      });
      if (!response.ok) {
        throw new Error(await apiError(response, "The centre status could not be changed."));
      }
      const saved = (await response.json()) as ManagedCentre;
      upsertCentre(saved);
      setStatusChange(null);
      setNotice(action === "deactivate" ? "Centre deactivated." : "Centre reactivated.");
    } catch (caught) {
      setPageError(
        caught instanceof Error ? caught.message : "The centre status could not be changed.",
      );
      setStatusChange(null);
    } finally {
      setPendingAction("");
    }
  }

  function openDeleteDialog(centre: ManagedCentre) {
    if (!centreManagementCapabilities(roles, centre.id).canDelete) return;
    setDeletingCentre(centre);
    setDeleteConfirmation("");
    setDeleteError("");
    setPageError("");
    setNotice("");
  }

  function setDeleteDialogOpen(open: boolean) {
    if (deletingCentre && pendingAction === `${deletingCentre.id}:delete`) return;
    if (!open) {
      setDeletingCentre(null);
      setDeleteConfirmation("");
      setDeleteError("");
    }
  }

  async function deleteCentre() {
    if (!deletingCentre) return;
    if (!centreManagementCapabilities(roles, deletingCentre.id).canDelete) {
      setDeleteError("Only an owner can permanently delete a centre.");
      return;
    }
    if (deleteConfirmation.trim().toUpperCase() !== deletingCentre.code.toUpperCase()) {
      setDeleteError(`Type ${deletingCentre.code} to confirm permanent deletion.`);
      return;
    }

    const centre = deletingCentre;
    setDeleteError("");
    setPendingAction(`${centre.id}:delete`);
    try {
      const csrf = await csrfToken();
      const response = await fetch(`/api/centres/${encodeURIComponent(centre.id)}`, {
        method: "DELETE",
        headers: { "x-csrf-token": csrf },
      });
      if (!response.ok) {
        throw new Error(await apiError(response, "The centre could not be deleted."));
      }
      setCentres((current) => current.filter((item) => item.id !== centre.id));
      setDeletingCentre(null);
      setDeleteConfirmation("");
      setNotice(`${centre.name} was permanently deleted.`);
    } catch (caught) {
      setDeleteError(
        caught instanceof Error ? caught.message : "The centre could not be deleted.",
      );
    } finally {
      setPendingAction("");
    }
  }

  const accessDescription = isOwner
    ? "Manage every centre, including creation and permanent deletion when no platform data is linked."
    : isManager
      ? "Edit, activate, or deactivate the centres assigned to you. Creation and permanent deletion remain owner-only."
      : isTutor
        ? "View the centres assigned to you. Centre administration remains read-only for tutors."
        : "Your account does not currently include a centre-management role.";

  return (
    <main className="admin-main grid gap-6" aria-labelledby="centres-page-title">
      <section
        className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
        aria-labelledby="centres-page-title"
      >
        <h1 id="centres-page-title" className="text-lg font-black tracking-tight text-slate-950" title={accessDescription}>Centres</h1>
        <dl className="flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Centre status summary">
          <SummaryStat label="Total" value={centres.length} tooltip="All centres in this organization" />
          <SummaryStat label="Active" value={activeCount} tooltip="Centres currently open for operations" />
          <SummaryStat label="Inactive" value={inactiveCount} tooltip="Centres currently deactivated" />
        </dl>
        {pageCapabilities.canCreate ? <button className={feedbackButton} type="button" onClick={openCreateDialog}>Add centre</button> : null}
      </section>

      <section className="management-panel grid gap-5" aria-label="Centre directory">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-end">
          <div className="grid w-full gap-3 sm:grid-cols-[minmax(13rem,1fr)_minmax(10rem,0.45fr)] lg:max-w-2xl">
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              Search
              <input className={inputClasses} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, code, or address" />
            </label>
            <label className="grid gap-1.5 text-xs font-bold text-slate-600">
              Status
              <select className={inputClasses} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}>
                <option value="all">All centres</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
          </div>
        </div>

        {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">{notice}</p> : null}
        {!isOwner && currentUser ? (
          <p className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-900" role="status">
            {isManager ? "Managers can edit and change the status of assigned centres. Adding and permanently deleting centres remain owner-only." : isTutor ? "Tutor access is read-only and limited to assigned centres." : "No centre-management access was returned for this account."}
          </p>
        ) : null}
        {pageError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{pageError}</p> : null}
        {loading ? <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600">Loading centres…</p> : null}
        {!loading && filteredCentres.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm font-medium text-slate-600">
            {centres.length === 0 && pageCapabilities.canCreate ? "No centres have been created. Add the first centre to complete organization setup." : centres.length === 0 ? "No centres are assigned to your account." : "No centres match the current search and status filters."}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredCentres.map((centre) => {
            const capabilities = centreManagementCapabilities(roles, centre.id);
            const centrePending = pendingAction.startsWith(`${centre.id}:`);
            const realAddressAvailable = hasRealAddress(centre.address);
            return (
              <article className="flex min-h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" key={centre.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs font-black uppercase tracking-[0.08em] text-orange-600">{centre.code}</p>
                    <h3 className="break-words text-lg font-bold text-slate-950">{centre.name}</h3>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold capitalize ${centre.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{centre.status}</span>
                </div>
                <div className="grid gap-1">
                  <p className="break-words text-sm leading-6 text-slate-700">{realAddressAvailable ? centre.address : "No operational address provided"}</p>
                  {!realAddressAvailable ? <p className="text-xs font-semibold text-amber-700">A real address is required before this centre can be activated.</p> : null}
                </div>
                {capabilities.canEdit || capabilities.canManageStatus || capabilities.canDelete ? (
                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                    {capabilities.canEdit ? <button className={secondaryButtonClasses} disabled={centrePending} type="button" onClick={() => openEditDialog(centre)}>Edit details</button> : null}
                    {capabilities.canManageStatus && centre.status === "active" ? <button className={dangerButtonClasses} disabled={centrePending} type="button" onClick={() => requestStatusChange(centre, "deactivate")}>Deactivate</button> : null}
                    {capabilities.canManageStatus && centre.status === "inactive" ? <button className={secondaryButtonClasses} disabled={centrePending || !realAddressAvailable} title={realAddressAvailable ? undefined : "Add a real address before reactivating this centre."} type="button" onClick={() => requestStatusChange(centre, "reactivate")}>Reactivate</button> : null}
                    {capabilities.canDelete ? <button className={`${dangerButtonClasses} sm:ml-auto`} disabled={centrePending} type="button" onClick={() => openDeleteDialog(centre)}>Delete permanently</button> : null}
                  </div>
                ) : <p className="mt-auto border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500">Read-only centre access</p>}
              </article>
            );
          })}
        </div>
      </section>

      <FormDialog open={dialogOpen} title={editingCentre ? "Edit centre" : "Add centre"} description={centres.length === 0 ? "Create the first operational centre for this organization." : "Use the official centre name and full address that staff should recognize."} onOpenChange={setFormOpen}>
        <form className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void saveCentre(); }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Centre code<input className={inputClasses} name="code" required maxLength={16} pattern="[A-Za-z0-9_-]+" autoComplete="off" value={formValues.code} onChange={updateForm} /><span className="text-xs font-normal text-slate-500">Letters, numbers, hyphens, or underscores only.</span></label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Time zone<input className={inputClasses} name="timeZone" required maxLength={64} value={formValues.timeZone} onChange={updateForm} /></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Centre name<input className={inputClasses} name="name" required maxLength={160} value={formValues.name} onChange={updateForm} /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Centre address<textarea className={`${inputClasses} resize-y`} name="address" required maxLength={500} rows={4} placeholder="Full operational address" value={formValues.address} onChange={updateForm} /><span className="text-xs font-normal text-slate-500">Active centres require a real operational address; “Address pending” is not accepted.</span></label>
          {formError ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{formError}</p> : null}
          <div className="-mx-5 -mb-5 mt-1 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
            <button className={`${secondaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === "save-centre"} type="button" onClick={() => setFormOpen(false)}>Cancel</button>
            <button className={`${primaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === "save-centre" || !formReady} type="submit">{pendingAction === "save-centre" ? "Saving…" : editingCentre ? "Save changes" : "Create centre"}</button>
          </div>
        </form>
      </FormDialog>

      {statusChange ? (
        <FormDialog open title={statusChange.action === "deactivate" ? "Deactivate centre" : "Reactivate centre"} description={statusChange.action === "deactivate" ? "Deactivate the centre without removing its history or linked data." : "Restore the centre for active operational use."} onOpenChange={setStatusDialogOpen}>
          <div className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6">
            <div className={`rounded-xl border px-4 py-4 text-sm leading-6 ${statusChange.action === "deactivate" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
              {statusChange.action === "deactivate" ? <p><strong>{statusChange.centre.name}</strong> will remain in historical records but will no longer be available for active operational use.</p> : <p><strong>{statusChange.centre.name}</strong> will become available for active operational use again.</p>}
            </div>
            <div className="-mx-5 -mb-5 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
              <button className={`${secondaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === `${statusChange.centre.id}:${statusChange.action}`} type="button" onClick={() => setStatusDialogOpen(false)}>Cancel</button>
              <button className={`${statusChange.action === "deactivate" ? dangerButtonClasses : primaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === `${statusChange.centre.id}:${statusChange.action}`} type="button" onClick={() => void changeStatus()}>{pendingAction === `${statusChange.centre.id}:${statusChange.action}` ? "Updating…" : statusChange.action === "deactivate" ? "Deactivate centre" : "Reactivate centre"}</button>
            </div>
          </div>
        </FormDialog>
      ) : null}

      {deletingCentre ? (
        <FormDialog open title="Permanently delete centre" description="Permanent deletion is only available when the centre has no linked platform data." onOpenChange={setDeleteDialogOpen}>
          <form className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void deleteCentre(); }}>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-6 text-red-900"><p className="font-bold">This action cannot be undone.</p><p>If {deletingCentre.name} has schedules, classes, assignments, profiles, or other linked data, deletion will be blocked and the centre can only be deactivated.</p></div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-[0.08em] text-orange-600">{deletingCentre.code}</p><p className="mt-1 font-bold text-slate-950">{deletingCentre.name}</p><p className="mt-1 text-sm text-slate-600">{deletingCentre.address}</p></div>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Type <strong>{deletingCentre.code}</strong> to confirm<input className={inputClasses} autoComplete="off" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} /></label>
            {deleteError ? <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{deleteError}</p> : null}
            <div className="-mx-5 -mb-5 mt-1 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
              <button className={`${secondaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === `${deletingCentre.id}:delete`} type="button" onClick={() => setDeleteDialogOpen(false)}>Cancel</button>
              <button className={`${dangerButtonClasses} w-full sm:w-auto`} disabled={pendingAction === `${deletingCentre.id}:delete` || deleteConfirmation.trim().toUpperCase() !== deletingCentre.code.toUpperCase()} type="submit">{pendingAction === `${deletingCentre.id}:delete` ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </form>
        </FormDialog>
      ) : null}
    </main>
  );
}
