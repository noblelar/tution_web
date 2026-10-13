"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import { CentreFormValues, ManagedCentre } from "@/lib/centre-types";

type ApiError = { error?: string };
type CurrentUser = {
  roles: Array<{ roleKey?: string; role_key?: string }>;
};

function normalizedRoleKey(role: { roleKey?: string; role_key?: string }) {
  return (role.roleKey ?? role.role_key ?? "").trim().toLowerCase();
}

const emptyForm: CentreFormValues = {
  code: "",
  name: "",
  address: "",
  timeZone: "Europe/London",
};

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Request verification is unavailable.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export function CentreManagement() {
  const [centres, setCentres] = useState<ManagedCentre[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [formValues, setFormValues] = useState<CentreFormValues>(emptyForm);
  const [editingCentre, setEditingCentre] = useState<ManagedCentre | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCentres = useCallback(async () => {
    const response = await fetch("/api/centres", { cache: "no-store" });
    const result = (await response.json()) as { centres?: ManagedCentre[] } & ApiError;
    if (!response.ok) throw new Error(result.error ?? "Centres could not be loaded.");
    const loadedCentres = result.centres ?? [];
    setCentres(loadedCentres);
    return loadedCentres;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError("");
      try {
        const userResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const userResult = (await userResponse.json()) as { user?: CurrentUser } & ApiError;
        if (!userResponse.ok || !userResult.user) {
          throw new Error(userResult.error ?? "Your session could not be verified.");
        }
        if (cancelled) return;
        setCurrentUser(userResult.user);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Your session could not be verified.");
          setLoading(false);
        }
        return;
      }

      try {
        const loadedCentres = await loadCentres();
        const isOwner = userResult.user.roles.some((role) => normalizedRoleKey(role) === "owner");
        if (!loadedCentres.length && isOwner) {
          setNotice("Complete organization setup by creating your first centre.");
          setDialogOpen(true);
        }
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Centres could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadCentres]);

  const filteredCentres = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return centres.filter((centre) => {
      const matchesStatus = statusFilter === "all" || centre.status === statusFilter;
      const matchesQuery = !needle || [centre.name, centre.code, centre.address].some((value) => value.toLowerCase().includes(needle));
      return matchesStatus && matchesQuery;
    });
  }, [centres, query, statusFilter]);

  const activeCount = centres.filter((centre) => centre.status === "active").length;
  const inactiveCount = centres.filter((centre) => centre.status === "inactive").length;
  const roleKeys = useMemo(() => currentUser?.roles.map(normalizedRoleKey).filter(Boolean) ?? [], [currentUser]);
  const roleSummary = roleKeys.length ? roleKeys.join(" · ") : loading ? "Checking your access…" : "No role returned";
  const canManageCentres = roleKeys.includes("owner");
  const canViewCentres = canManageCentres || roleKeys.includes("manager");

  function openCreateDialog() {
    if (!canManageCentres) return;
    setEditingCentre(null);
    setFormValues(emptyForm);
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  function openEditDialog(centre: ManagedCentre) {
    if (!canManageCentres) return;
    setEditingCentre(centre);
    setFormValues({
      code: centre.code,
      name: centre.name,
      address: centre.address,
      timeZone: centre.timeZone,
    });
    setError("");
    setNotice("");
    setDialogOpen(true);
  }

  function updateForm(event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = event.currentTarget;
    setFormValues((current) => ({ ...current, [target.name]: target.value }));
  }

  async function saveCentre() {
    if (!canManageCentres) {
      setError("Only owners can change centre details.");
      return;
    }
    setError("");
    setNotice("");
    setPendingAction("save-centre");
    try {
      const creatingFirstCentre = !editingCentre && centres.length === 0;
      const csrf = await csrfToken();
      const path = editingCentre ? `/api/centres/${encodeURIComponent(editingCentre.id)}` : "/api/centres";
      const response = await fetch(path, {
        method: editingCentre ? "PATCH" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(formValues),
      });
      const result = (await response.json()) as ManagedCentre & ApiError;
      if (!response.ok) throw new Error(result.error ?? "The centre could not be saved.");
      setDialogOpen(false);
      setNotice(editingCentre ? "Centre updated." : creatingFirstCentre ? "First centre created. Organization setup is complete." : "Centre created.");
      await loadCentres();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The centre could not be saved.");
    } finally {
      setPendingAction("");
    }
  }

  async function changeStatus(centre: ManagedCentre, action: "deactivate" | "reactivate") {
    if (!canManageCentres) {
      setError("Only owners can change centre status.");
      return;
    }
    setError("");
    setNotice("");
    if (action === "deactivate" && !window.confirm(`Deactivate ${centre.name}? It will stay in history but should not be used for new operations.`)) {
      return;
    }
    setPendingAction(`${centre.id}:${action}`);
    try {
      const csrf = await csrfToken();
      const response = await fetch(`/api/centres/${encodeURIComponent(centre.id)}/${action}`, {
        method: "POST",
        headers: { "x-csrf-token": csrf },
      });
      const result = (await response.json()) as ManagedCentre & ApiError;
      if (!response.ok) throw new Error(result.error ?? "The centre status could not be changed.");
      setNotice(action === "deactivate" ? "Centre deactivated." : "Centre reactivated.");
      await loadCentres();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The centre status could not be changed.");
    } finally {
      setPendingAction("");
    }
  }

  return (
    <main className="admin-main centre-management-page" aria-labelledby="centres-page-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="centres-page-title">Centres</h1>
          <p>Manage tuition centre names, addresses, and lifecycle access from the admin dashboard.</p>
        </div>
      </header>
      <section className="management-panel centre-command-panel" aria-labelledby="centres-summary-title">
        <div>
          <p className="eyebrow">{canManageCentres ? "Owner controls" : "Manager view"}</p>
          <h2 id="centres-summary-title">Tuition centres</h2>
          <p>
            {canManageCentres
              ? "Manage the official centre list stored in PostgreSQL. Deactivation is soft removal: the centre remains in historical records but is removed from active use."
              : "View the centre details available to your manager scope. Centre changes are reserved for owner users."}
          </p>
        </div>
        <div className="centre-status-stack">
          <div className="centre-stats" aria-label="Centre status summary">
            <span><strong>{centres.length}</strong> total</span>
            <span><strong>{activeCount}</strong> active</span>
            <span><strong>{inactiveCount}</strong> inactive</span>
          </div>
          <p className={canManageCentres ? "owner-access-state" : "read-only-state"} role="status">
            {canManageCentres ? "Owner access detected" : canViewCentres ? "Read-only manager access" : "Centre management role not detected"}
            <span>Roles: {roleSummary}</span>
          </p>
        </div>
        {canManageCentres ? <button className="primary-button" type="button" onClick={openCreateDialog}>Add centre</button> : null}
      </section>

      <section className="management-panel account-list-panel" aria-labelledby="centres-list-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Database-backed locations</p>
            <h2 id="centres-list-title">Centre directory</h2>
          </div>
          <div className="centre-filters">
            <label>
              Search
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, code, or address" />
            </label>
            <label>
              Status
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "active" | "inactive")}>
                <option value="all">All centres</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </label>
          </div>
        </div>

        {notice ? <p className="success-state" role="status">{notice}</p> : null}
        {!canManageCentres && currentUser ? (
          <p className="read-only-state" role="status">
            {canViewCentres
              ? "Read-only centre access: managers can view centre names and addresses, but only owners can add, edit, deactivate, or reactivate centres."
              : "Your session did not return an owner or manager role for centre management. If this is your owner account, sign out and sign back in so the latest role grants are loaded."}
          </p>
        ) : null}
        {error ? <p className="form-error action-error" role="alert">{error}</p> : null}
        {loading ? <p className="loading-state">Loading centres…</p> : null}
        {!loading && filteredCentres.length === 0 ? (
          <p className="empty-state">
            {centres.length === 0 && canManageCentres
              ? "No centres have been created. Add the first centre to complete organization setup."
              : "No centres match this view yet."}
          </p>
        ) : null}

        <div className="centre-cards">
          {filteredCentres.map((centre) => (
            <article className="centre-card" key={centre.id}>
              <div className="account-summary">
                <div>
                  <p className="centre-code">{centre.code}</p>
                  <h3>{centre.name}</h3>
                </div>
                <span className={`status-badge status-${centre.status}`}>{centre.status}</span>
              </div>
              <p className="centre-address">{centre.address}</p>
              <dl className="centre-meta">
                <div>
                  <dt>Time zone</dt>
                  <dd>{centre.timeZone}</dd>
                </div>
                <div>
                  <dt>Centre ID</dt>
                  <dd>{centre.id}</dd>
                </div>
              </dl>
              {canManageCentres ? (
                <div className="account-actions">
                  <button disabled={pendingAction.startsWith(centre.id)} type="button" onClick={() => openEditDialog(centre)}>Edit</button>
                  {centre.status === "active" ? (
                    <button
                      className="danger-button"
                      disabled={pendingAction.startsWith(centre.id)}
                      type="button"
                      onClick={() => void changeStatus(centre, "deactivate")}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      disabled={pendingAction.startsWith(centre.id)}
                      type="button"
                      onClick={() => void changeStatus(centre, "reactivate")}
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <FormDialog
        open={dialogOpen}
        title={editingCentre ? "Edit centre" : "Add centre"}
        description={centres.length === 0 ? "Create the first operational centre for this organization." : "Use the official centre name and full address that staff should recognize."}
        onOpenChange={setDialogOpen}
      >
        <form
          className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6"
          onSubmit={(event) => {
            event.preventDefault();
            void saveCentre();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              Centre code
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                name="code"
                required
                maxLength={16}
                value={formValues.code}
                onChange={updateForm}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">
              Time zone
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                name="timeZone"
                required
                maxLength={64}
                value={formValues.timeZone}
                onChange={updateForm}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Centre name
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              name="name"
              required
              maxLength={160}
              value={formValues.name}
              onChange={updateForm}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">
            Centre address
            <textarea
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
              name="address"
              required
              maxLength={500}
              rows={4}
              value={formValues.address}
              onChange={updateForm}
            />
          </label>
          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <div className="-mx-5 -mb-5 mt-1 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={pendingAction === "save-centre"}
              type="button"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-transparent bg-[#ff4b12] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e6400c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              disabled={pendingAction === "save-centre"}
              type="submit"
            >
              {pendingAction === "save-centre" ? "Saving…" : editingCentre ? "Save changes" : "Create centre"}
            </button>
          </div>
        </form>
      </FormDialog>
    </main>
  );
}
