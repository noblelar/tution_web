"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PendingStaffDeleteDialog } from "@/components/admin/pending-staff-delete-dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { canDeletePendingManager, pendingManagerDeletionEndpoint } from "@/lib/pending-staff-deletion";
import {
  AccountLifecycleResult,
  AccountManagementContext,
  InvitationDelivery,
  InvitationEmailDelivery,
  ManagedAccount,
  ProvisionAccountResult,
  RoleGrant,
} from "@/lib/account-types";

type ApiError = { error?: string };
type StaffRole = "owner" | "manager" | "tutor";
type RoleOperation = "assign" | "remove";

const roleLabels: Record<StaffRole, string> = { owner: "Owner", manager: "Manager", tutor: "Tutor" };
const inputClasses = "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";
const primaryButtonClasses = "inline-flex min-h-11 items-center justify-center rounded-xl border border-orange-600 bg-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:border-orange-700 hover:bg-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-55";
const secondaryButtonClasses = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-55";
const dangerButtonClasses = "inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-bold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus:ring-4 focus:ring-red-100 disabled:cursor-not-allowed disabled:opacity-55";

async function csrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { cache: "no-store" });
  if (!response.ok) throw new Error("Request verification is unavailable.");
  return ((await response.json()) as { csrfToken: string }).csrfToken;
}

export function AccountManagement() {
  const [context, setContext] = useState<AccountManagementContext | null>(null);
  const [scope, setScope] = useState("");
  const [provisionCentre, setProvisionCentre] = useState("");
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [delivery, setDelivery] = useState<InvitationDelivery | null>(null);
  const [emailDelivery, setEmailDelivery] = useState<InvitationEmailDelivery | null>(null);
  const [error, setError] = useState("");
  const [provisionError, setProvisionError] = useState("");
  const [roleError, setRoleError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<ManagedAccount | null>(null);
  const [roleToAdd, setRoleToAdd] = useState<StaffRole | "">("");
  const [roleCentre, setRoleCentre] = useState("");
  const [deletionTarget, setDeletionTarget] = useState<ManagedAccount | null>(null);
  const [deletionMessage, setDeletionMessage] = useState("");
  const accountsRequest = useRef(0);

  const loadAccounts = useCallback(async (centreId: string) => {
    const requestId = ++accountsRequest.current;
    const query = centreId ? `?centreId=${encodeURIComponent(centreId)}` : "";
    const response = await fetch(`/api/users${query}`, { cache: "no-store" });
    const result = (await response.json()) as { accounts?: ManagedAccount[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Accounts could not be loaded.");
    if (requestId === accountsRequest.current) setAccounts(result.accounts ?? []);
  }, []);

  const activeOwnerCount = useMemo(
    () => accounts.filter((account) => account.accountStatus === "active" && hasRole(account, "owner")).length,
    [accounts],
  );

  const assignableRoles = useMemo(() => {
    if (!context || !roleTarget) return [];
    return context.roleCompositionRoles
      .filter(isStaffRole)
      .filter((role) => !hasRole(roleTarget, role))
      .filter((role) => canAssignRole(context, role));
  }, [context, roleTarget]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/users/context", { cache: "no-store" });
        const result = (await response.json()) as AccountManagementContext & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Account management is unavailable.");
        if (cancelled) return;
        setContext(result);
        const initialCentre = result.centres[0]?.id ?? "";
        setProvisionCentre(initialCentre);
        setRoleCentre(initialCentre);
        const initialScope = result.capabilities.canCreateManagers ? "" : initialCentre;
        setScope(initialScope);
        await loadAccounts(initialScope);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Account management is unavailable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadAccounts]);

  async function changeScope(value: string) {
    setScope(value);
    setError("");
    setLoading(true);
    try {
      await loadAccounts(value);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Accounts could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshDeletionContext() {
    const [response] = await Promise.all([
      fetch("/api/users/context", { cache: "no-store" }),
      loadAccounts(scope),
    ]);
    const result = await response.json() as AccountManagementContext & ApiError;
    if (!response.ok) throw new Error(result.error ?? "Account controls could not refresh.");
    setContext(result);
  }

  function pendingManagerDeleted(account: ManagedAccount) {
    setDeletionTarget(null);
    setRoleTarget((target) => target?.id === account.id ? null : target);
    setAccounts((current) => current.filter((item) => item.id !== account.id));
    // Never leave a removed account's one-time fallback invitation on screen.
    setDelivery(null);
    setEmailDelivery(null);
    setError("");
    setDeletionMessage(`The pending manager account for ${account.firstName} ${account.lastName} was permanently deleted. Its audit record is retained.`);
    void loadAccounts(scope).catch(() => {
      setError("The account was deleted, but the list could not refresh. Reload this page to see the current accounts.");
    });
  }

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setProvisionError("");
    setDelivery(null);
    setEmailDelivery(null);
    setPendingAction("provision");
    try {
      const csrf = await csrfToken();
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({
          firstName: String(form.get("firstName") ?? ""),
          lastName: String(form.get("lastName") ?? ""),
          email: String(form.get("email") ?? ""),
          phoneNumber: String(form.get("phoneNumber") ?? ""),
          centreId: provisionCentre,
        }),
      });
      const result = (await response.json()) as ProvisionAccountResult & ApiError;
      if (!response.ok) throw new Error(result.error ?? "The account could not be provisioned.");
      setDelivery(result.invitation);
      setEmailDelivery(result.emailDelivery ?? null);
      formElement.reset();
      setManagerDialogOpen(false);
      try {
        await loadAccounts(scope);
      } catch {
        setError("The manager was added, but the account list could not refresh. Refresh this page to see the new account.");
      }
    } catch (caught) {
      setProvisionError(caught instanceof Error ? caught.message : "The manager account could not be added.");
    } finally {
      setPendingAction("");
    }
  }

  function openRoleDialog(account: ManagedAccount) {
    if (!context?.capabilities.canManageRoles) return;
    const firstMissingRole = context.roleCompositionRoles
      .filter(isStaffRole)
      .find((role) => !hasRole(account, role) && canAssignRole(context, role));
    setRoleTarget(account);
    setRoleToAdd(firstMissingRole ?? "");
    setRoleCentre(account.centres[0]?.id ?? context.centres[0]?.id ?? "");
    setRoleError("");
  }

  function setRoleDialogState(open: boolean) {
    if (!open && pendingAction.startsWith("role:")) return;
    if (!open) {
      setRoleTarget(null);
      setRoleToAdd("");
      setRoleError("");
    }
  }

  async function changeRole(account: ManagedAccount, role: StaffRole, centreId: string | undefined, operation: RoleOperation) {
    if (!context) return;
    const selfChange = account.id === context.actorUserId;
    if (selfChange && !window.confirm("Changing one of your own roles will end this session. You will need to sign in again and may be required to complete MFA. Continue?")) return;

    setRoleError("");
    setError("");
    const actionKey = `role:${account.id}:${operation}:${role}`;
    setPendingAction(actionKey);
    try {
      const csrf = await csrfToken();
      const response = await fetch(`/api/users/${encodeURIComponent(account.id)}/roles`, {
        method: operation === "assign" ? "POST" : "DELETE",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ roleKey: role, centreId }),
      });
      const result = (await response.json()) as ManagedAccount & ApiError;
      if (!response.ok) throw new Error(result.error ?? `The ${roleLabels[role].toLowerCase()} role could not be ${operation === "assign" ? "assigned" : "removed"}.`);

      if (selfChange) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "content-type": "application/json", "x-csrf-token": csrf },
          body: JSON.stringify({}),
        }).catch(() => undefined);
        window.location.assign("/login");
        return;
      }
      setRoleTarget(null);
      setRoleToAdd("");
      await loadAccounts(scope);
    } catch (caught) {
      setRoleError(caught instanceof Error ? caught.message : "The role change failed.");
    } finally {
      setPendingAction("");
    }
  }

  async function submitRoleAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!context || !roleTarget || !roleToAdd) return;
    const eligibility = roleAssignmentEligibility(roleTarget, roleToAdd);
    if (!eligibility.allowed) {
      setRoleError(eligibility.reason);
      return;
    }
    if (roleRequiresCentre(roleToAdd) && !roleCentre) {
      setRoleError("Select the centre where this role will apply.");
      return;
    }
    await changeRole(roleTarget, roleToAdd, roleRequiresCentre(roleToAdd) ? roleCentre : undefined, "assign");
  }

  async function removeRole(account: ManagedAccount, role: RoleGrant) {
    if (!context || !isStaffRole(role.roleKey)) return;
    const safeguard = roleRemovalEligibility(account, role, context, scope === "" ? activeOwnerCount : null);
    if (!safeguard.allowed) {
      setRoleError(safeguard.reason);
      return;
    }
    const centreName = role.centreId ? centreLabel(role.centreId, account, context) : "the organization";
    if (!window.confirm(`Remove the ${roleLabels[role.roleKey]} role for ${account.firstName} ${account.lastName} from ${centreName}? Their active sessions will end.`)) return;
    await changeRole(account, role.roleKey, role.centreId, "remove");
  }

  function setManagerDialogState(open: boolean) {
    if (!open && pendingAction === "provision") return;
    setManagerDialogOpen(open);
    if (!open) setProvisionError("");
  }

  async function mutateAccount(account: ManagedAccount, action: "resend" | "revoke" | "suspend" | "restore" | "disable" | "mfa-reset") {
    setError("");
    setDelivery(null);
    setEmailDelivery(null);
    setPendingAction(`${account.id}:${action}`);
    const centreId = scope || account.centres[0]?.id;
    if (action !== "mfa-reset" && !centreId) {
      setError("This account has no manageable centre.");
      setPendingAction("");
      return;
    }
    try {
      const csrf = await csrfToken();
      const invitationAction = action === "resend" || action === "revoke";
      const path = action === "mfa-reset"
        ? `/api/users/${encodeURIComponent(account.id)}/mfa/reset`
        : invitationAction
        ? `/api/users/${encodeURIComponent(account.id)}/invitation`
        : `/api/users/${encodeURIComponent(account.id)}/${action}`;
      const response = await fetch(path, {
        method: action === "revoke" ? "DELETE" : "POST",
        headers: { "content-type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify(action === "mfa-reset" ? {} : { centreId }),
      });
      const result = (await response.json()) as (ProvisionAccountResult | AccountLifecycleResult) & ApiError;
      if (!response.ok) throw new Error(result.error ?? "The account action failed.");
      if (action === "resend") {
        const invitationResult = result as ProvisionAccountResult;
        setDelivery(invitationResult.invitation);
        setEmailDelivery(invitationResult.emailDelivery ?? null);
      }
      if (!invitationAction && action !== "mfa-reset" && (result as AccountLifecycleResult).invitation) {
        setDelivery((result as AccountLifecycleResult).invitation ?? null);
        setEmailDelivery((result as AccountLifecycleResult).emailDelivery ?? null);
      }
      await loadAccounts(scope);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account action failed.");
    } finally {
      setPendingAction("");
    }
  }

  if (loading && !context) return <p className="loading-state">Loading account controls…</p>;
  if (!context) {
    return (
      <div className="access-state">
        <p className="form-error" role="alert">{error || "Account management is unavailable."}</p>
        <Link className="primary-link" href="/login">Sign in again</Link>
      </div>
    );
  }

  const selectedRoleEligibility = roleTarget && roleToAdd
    ? roleAssignmentEligibility(roleTarget, roleToAdd)
    : { allowed: false, reason: "Select a role to add." };

  return (
    <div className="space-y-6">
      <section className="management-panel account-list-panel" aria-labelledby="accounts-title">
        <div className="panel-heading">
          <div><p className="eyebrow">Centre scope</p><h2 id="accounts-title">Managed accounts</h2></div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="grid min-w-48 gap-1.5 text-sm font-bold text-slate-700">View
              <select className={inputClasses} value={scope} onChange={(event) => void changeScope(event.target.value)}>
                {context.capabilities.canCreateManagers ? <option value="">All centres</option> : null}
                {context.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
              </select>
            </label>
            {context.capabilities.canCreateManagers ? (
              <button className={primaryButtonClasses} onClick={() => { setProvisionError(""); setManagerDialogOpen(true); }} type="button">Add manager</button>
            ) : null}
          </div>
        </div>

        {!context.capabilities.canManageRoles ? (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
            <strong>Read-only access.</strong> Managers can review staff in their assigned centre, but only an owner can add managers or change staff roles.
          </div>
        ) : null}

        {delivery ? (
          <div className="invitation-alert flex flex-col gap-2" role="status">
            <strong>
              {emailDelivery?.status === "smtp_accepted"
                ? "Activation email accepted by the mail server."
                : "The activation email was not delivered; use the fallback link."}
            </strong>
            <code>{delivery.activationUrl}</code>
            <button type="button" onClick={() => void navigator.clipboard.writeText(delivery.activationUrl)}>Copy link</button>
            <small>
              One-time fallback link · expires {new Date(delivery.expiresAt).toLocaleString()}.
              {emailDelivery?.failureCategory ? ` Delivery status: ${emailDelivery.failureCategory.replaceAll("_", " ")}.` : ""}
            </small>
          </div>
        ) : null}
        {error ? <p className="form-error action-error" role="alert">{error}</p> : null}
        {deletionMessage ? <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{deletionMessage}</p> : null}
        {loading ? <p className="loading-state">Refreshing accounts…</p> : null}
        {!loading && accounts.length === 0 ? <p className="empty-state">No managed accounts are in this scope yet.</p> : null}
        <div className="account-cards">
          {accounts.map((account) => (
            <article className="account-card" key={account.id}>
              <div className="account-summary">
                <div>
                  <h3>{account.firstName} {account.lastName}</h3>
                  <p>{account.email}</p>
                </div>
                <span className={`status-badge status-${account.accountStatus}`}>{account.accountStatus.replaceAll("_", " ")}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {account.roles.map((role) => (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold capitalize text-slate-700" key={roleKey(role)}>
                    {role.roleKey}{role.centreId ? ` · ${centreLabel(role.centreId, account, context)}` : ""}
                  </span>
                ))}
              </div>
              <p className="account-meta mt-3">
                {account.centres.length > 0 ? account.centres.map((centre) => centre.name).join(", ") : "Organization access"}
                {account.emailVerified ? " · Email verified" : " · Email not verified"}
                {account.mfaEnabled ? " · MFA enabled" : ""}
              </p>
              {account.accountStatus === "pending_activation" && account.invitation?.emailDelivery ? (
                <p className="text-sm text-slate-600">
                  Email: {account.invitation.emailDelivery.status === "smtp_accepted" ? "accepted by mail server" : account.invitation.emailDelivery.status.replaceAll("_", " ")}
                </p>
              ) : null}
              <div className="account-actions">
                {context.capabilities.canManageRoles && hasAnyStaffRole(account) ? (
                  <button
                    className="border-orange-200 text-orange-700 hover:border-orange-300 hover:bg-orange-50"
                    disabled={pendingAction.startsWith(account.id) || pendingAction.startsWith(`role:${account.id}`)}
                    onClick={() => openRoleDialog(account)}
                    type="button"
                  >
                    Manage roles
                  </button>
                ) : null}
                {isTutorAccount(account) ? (
                  <Link href="/app/admin/tutors">Manage in tutor area</Link>
                ) : context.capabilities.canCreateManagers && account.accountStatus === "pending_activation" && hasRole(account, "manager") ? (
                  <>
                    <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "resend")} type="button">New invitation</button>
                    <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "revoke")} type="button">Revoke invitation</button>
                  </>
                ) : null}
                {canDeletePendingManager(account, context) ? (
                  <button
                    className="border-red-200 text-red-700 hover:border-red-300 hover:bg-red-50"
                    disabled={Boolean(pendingAction) || loading}
                    onClick={() => { setDeletionMessage(""); setRoleTarget(null); setDeletionTarget(account); }}
                    type="button"
                  >
                    Delete pending account
                  </button>
                ) : null}
                {!isTutorAccount(account) && context.capabilities.canManageRoles && account.accountStatus === "active" ? <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "suspend")} type="button">Suspend</button> : null}
                {!isTutorAccount(account) && context.capabilities.canManageRoles && (account.accountStatus === "suspended" || account.accountStatus === "disabled") ? <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "restore")} type="button">Restore</button> : null}
                {!isTutorAccount(account) && context.capabilities.canManageRoles && account.accountStatus !== "disabled" ? <button className="danger-button" disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "disable")} type="button">Disable</button> : null}
                {!isTutorAccount(account) && context.canResetMFA && account.mfaEnabled && account.id !== context.actorUserId && account.roles.some((role) => role.roleKey === "owner" || role.roleKey === "manager") ? (
                  <button
                    className="danger-button"
                    disabled={pendingAction.startsWith(account.id)}
                    onClick={() => {
                      if (window.confirm(`Reset MFA and revoke every session for ${account.firstName} ${account.lastName}?`)) {
                        void mutateAccount(account, "mfa-reset");
                      }
                    }}
                    type="button"
                  >
                    Reset MFA
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      {deletionTarget ? (
        <PendingStaffDeleteDialog
          key={deletionTarget.id}
          target={{
            kind: "manager",
            name: `${deletionTarget.firstName} ${deletionTarget.lastName}`,
            email: deletionTarget.email,
            endpoint: pendingManagerDeletionEndpoint(deletionTarget.id),
            eligible: accounts.some((account) => account.id === deletionTarget.id && canDeletePendingManager(account, context)),
          }}
          onClose={() => setDeletionTarget(null)}
          onDeleted={() => pendingManagerDeleted(deletionTarget)}
          onRefresh={refreshDeletionContext}
        />
      ) : null}

      <FormDialog
        open={managerDialogOpen}
        title="Add manager"
        description="Create a pending manager account for one centre. Tution will send a 48-hour activation link."
        onOpenChange={setManagerDialogState}
      >
        <form className="grid gap-5 px-5 py-5 sm:px-6 sm:py-6" onSubmit={provision}>
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-950">
            Only managers can be created here. Tutors are onboarded from the Tutor area, while Owner and additional staff roles are assigned to eligible existing staff.
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-800">First name
              <input className={inputClasses} name="firstName" required maxLength={100} autoComplete="given-name" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-800">Last name
              <input className={inputClasses} name="lastName" required maxLength={100} autoComplete="family-name" />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Email address
            <input className={inputClasses} name="email" type="email" autoComplete="off" required />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Phone number <span className="font-normal text-slate-500">(optional)</span>
            <input className={inputClasses} name="phoneNumber" type="tel" maxLength={32} autoComplete="tel" />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-slate-800">Centre
            <select className={inputClasses} value={provisionCentre} onChange={(event) => setProvisionCentre(event.target.value)} required>
              <option value="" disabled>Select a centre</option>
              {context.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
            </select>
          </label>
          {provisionError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{provisionError}</p> : null}
          <div className="-mx-5 -mb-5 mt-1 flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6">
            <button className={`${secondaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === "provision"} onClick={() => setManagerDialogState(false)} type="button">Cancel</button>
            <button className={`${primaryButtonClasses} w-full sm:w-auto`} disabled={pendingAction === "provision" || !provisionCentre} type="submit">
              {pendingAction === "provision" ? "Adding manager…" : "Add manager"}
            </button>
          </div>
        </form>
      </FormDialog>

      <FormDialog
        open={Boolean(roleTarget)}
        title={roleTarget ? `Manage roles for ${roleTarget.firstName} ${roleTarget.lastName}` : "Manage staff roles"}
        description="Add or remove staff roles without deleting the account or its historical records. Every change ends the affected user's active sessions."
        onOpenChange={setRoleDialogState}
      >
        {roleTarget ? (
          <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="mb-1 text-sm font-bold text-slate-900">{roleTarget.email}</p>
                <p className="mb-0 text-xs text-slate-600">{roleTarget.accountStatus.replaceAll("_", " ")} · {roleTarget.emailVerified ? "Email verified" : "Email not verified"}</p>
              </div>
              <span className={`status-badge status-${roleTarget.accountStatus}`}>{roleTarget.accountStatus.replaceAll("_", " ")}</span>
            </div>

            <section aria-labelledby="current-roles-title">
              <div className="mb-3">
                <h3 id="current-roles-title" className="mb-1 text-base font-bold text-slate-900">Current roles</h3>
                <p className="mb-0 text-sm leading-6 text-slate-600">A role can only be removed when at least one other role will remain.</p>
              </div>
              <div className="grid gap-3">
                {roleTarget.roles.map((role) => {
                  const staffRole = isStaffRole(role.roleKey) ? role.roleKey : null;
                  const safeguard = staffRole
                    ? roleRemovalEligibility(roleTarget, role, context, scope === "" ? activeOwnerCount : null)
                    : { allowed: false, reason: "This role is managed in its dedicated area." };
                  const rolePending = staffRole && pendingAction === `role:${roleTarget.id}:remove:${staffRole}`;
                  return (
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between" key={roleKey(role)}>
                      <div>
                        <p className="mb-1 text-sm font-bold capitalize text-slate-900">{role.roleKey}</p>
                        <p className="mb-0 text-xs leading-5 text-slate-500">
                          {role.centreId ? centreLabel(role.centreId, roleTarget, context) : "Organization-wide"}
                          {!safeguard.allowed ? ` · ${safeguard.reason}` : ""}
                        </p>
                      </div>
                      {staffRole ? (
                        <button
                          className={dangerButtonClasses}
                          disabled={!safeguard.allowed || Boolean(rolePending) || pendingAction.startsWith("role:")}
                          onClick={() => void removeRole(roleTarget, role)}
                          type="button"
                        >
                          {rolePending ? "Removing…" : `Remove ${roleLabels[staffRole]}`}
                        </button>
                      ) : <span className="text-xs font-semibold text-slate-500">Managed elsewhere</span>}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="border-t border-slate-200 pt-5" aria-labelledby="add-role-title">
              <div className="mb-4">
                <h3 id="add-role-title" className="mb-1 text-base font-bold text-slate-900">Add a role</h3>
                <p className="mb-0 text-sm leading-6 text-slate-600">Owner access is organization-wide. Manager and Tutor access must be attached to one centre.</p>
              </div>
              {assignableRoles.length > 0 ? (
                <form className="grid gap-4" onSubmit={submitRoleAssignment}>
                  <label className="grid gap-2 text-sm font-semibold text-slate-800">Role
                    <select className={inputClasses} value={roleToAdd} onChange={(event) => setRoleToAdd(event.target.value as StaffRole)} required>
                      {assignableRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
                    </select>
                  </label>
                  {roleToAdd && roleRequiresCentre(roleToAdd) ? (
                    <label className="grid gap-2 text-sm font-semibold text-slate-800">Centre
                      <select className={inputClasses} value={roleCentre} onChange={(event) => setRoleCentre(event.target.value)} required>
                        <option value="" disabled>Select a centre</option>
                        {context.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
                      </select>
                    </label>
                  ) : null}
                  {!selectedRoleEligibility.allowed ? (
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">{selectedRoleEligibility.reason}</p>
                  ) : (
                    <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
                      This change will revoke the user&apos;s active sessions. A newly privileged user must complete the required MFA step on their next sign-in.
                    </p>
                  )}
                  <button
                    className={primaryButtonClasses}
                    disabled={!selectedRoleEligibility.allowed || (Boolean(roleToAdd) && roleRequiresCentre(roleToAdd) && !roleCentre) || pendingAction.startsWith("role:")}
                    type="submit"
                  >
                    {pendingAction.startsWith(`role:${roleTarget.id}:assign:`) ? "Adding role…" : "Add role"}
                  </button>
                </form>
              ) : (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">All available staff roles are already assigned to this account.</p>
              )}
            </section>

            {roleError ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">{roleError}</p> : null}
            <div className="-mx-5 -mb-5 flex justify-end border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
              <button className={secondaryButtonClasses} disabled={pendingAction.startsWith("role:")} onClick={() => setRoleDialogState(false)} type="button">Close</button>
            </div>
          </div>
        ) : null}
      </FormDialog>
    </div>
  );
}

function isStaffRole(role: string): role is StaffRole {
  return role === "owner" || role === "manager" || role === "tutor";
}

function hasRole(account: ManagedAccount, role: StaffRole) {
  return account.roles.some((grant) => grant.roleKey === role);
}

function hasAnyStaffRole(account: ManagedAccount) {
  return account.roles.some((grant) => isStaffRole(grant.roleKey));
}

function isTutorAccount(account: ManagedAccount) {
  return hasRole(account, "tutor");
}

function roleRequiresCentre(role: StaffRole) {
  return role === "manager" || role === "tutor";
}

function canAssignRole(context: AccountManagementContext, role: StaffRole) {
  if (role === "owner") return context.capabilities.canAssignOwner;
  if (role === "manager") return context.capabilities.canAssignManager;
  return context.capabilities.canAssignTutor;
}

function canRemoveRole(context: AccountManagementContext, role: StaffRole) {
  if (role === "owner") return context.capabilities.canRemoveOwner;
  if (role === "manager") return context.capabilities.canRemoveManager;
  return context.capabilities.canRemoveTutor;
}

function roleAssignmentEligibility(account: ManagedAccount, role: StaffRole): { allowed: boolean; reason: string } {
  if (account.accountStatus === "pending_activation") {
    return { allowed: false, reason: "This person must complete account activation before another role can be added." };
  }
  if (account.accountStatus === "suspended" || account.accountStatus === "disabled") {
    return { allowed: false, reason: "Restore this account before adding another role." };
  }
  if (account.accountStatus !== "active") {
    return { allowed: false, reason: "Only active staff accounts can receive another role." };
  }
  if ((role === "owner" || role === "manager") && !account.emailVerified) {
    return { allowed: false, reason: "The email address must be verified before Owner or Manager access can be assigned." };
  }
  if (!hasAnyStaffRole(account)) {
    return { allowed: false, reason: "Only existing Tutor, Manager, or Owner staff accounts can receive another staff role." };
  }
  return { allowed: true, reason: "" };
}

function roleRemovalEligibility(account: ManagedAccount, role: RoleGrant, context: AccountManagementContext, activeOwnerCount: number | null) {
  if (!isStaffRole(role.roleKey) || !canRemoveRole(context, role.roleKey)) {
    return { allowed: false, reason: "You do not have permission to remove this role." };
  }
  if (account.roles.length <= 1) {
    return { allowed: false, reason: "Assign another role before removing this account's only role." };
  }
  if (role.roleKey === "owner" && account.id === context.actorUserId) {
    return { allowed: false, reason: "You cannot remove your own Owner role." };
  }
  if (role.roleKey === "owner" && activeOwnerCount === null) {
    return { allowed: false, reason: "Switch to All centres to confirm another active Owner before removing this role." };
  }
  if (role.roleKey === "owner" && activeOwnerCount <= 1) {
    return { allowed: false, reason: "The final active Owner role cannot be removed." };
  }
  if (roleRequiresCentre(role.roleKey) && !role.centreId) {
    return { allowed: false, reason: "This legacy role has no centre scope and cannot be changed here." };
  }
  return { allowed: true, reason: "" };
}

function centreLabel(centreId: string, account: ManagedAccount, context: AccountManagementContext) {
  return account.centres.find((centre) => centre.id === centreId)?.name
    ?? context.centres.find((centre) => centre.id === centreId)?.name
    ?? "Assigned centre";
}

function roleKey(role: RoleGrant) {
  return `${role.roleKey}:${role.centreId ?? "organization"}`;
}
