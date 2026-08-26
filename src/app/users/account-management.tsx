"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import {
  AccountLifecycleResult,
  AccountManagementContext,
  InvitationDelivery,
  ManagedAccount,
  ProvisionAccountResult,
} from "@/lib/account-types";

type ApiError = { error?: string };

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState("");

  const loadAccounts = useCallback(async (centreId: string) => {
    const query = centreId ? `?centreId=${encodeURIComponent(centreId)}` : "";
    const response = await fetch(`/api/users${query}`, { cache: "no-store" });
    const result = (await response.json()) as { accounts?: ManagedAccount[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Accounts could not be loaded.");
    setAccounts(result.accounts ?? []);
  }, []);

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
        const initialScope = result.assignableRoles.includes("manager") ? "" : initialCentre;
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

  async function provision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const roleKeys = context?.assignableRoles.filter((role) => form.get(`role-${role}`) === "on") ?? [];
    setError("");
    setDelivery(null);
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
          roleKeys,
        }),
      });
      const result = (await response.json()) as ProvisionAccountResult & ApiError;
      if (!response.ok) throw new Error(result.error ?? "The account could not be provisioned.");
      setDelivery(result.invitation);
      formElement.reset();
      await loadAccounts(scope);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The account could not be provisioned.");
    } finally {
      setPendingAction("");
    }
  }

  async function mutateAccount(account: ManagedAccount, action: "resend" | "revoke" | "suspend" | "restore" | "disable" | "mfa-reset") {
    setError("");
    setDelivery(null);
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
      const result = (await response.json()) as (InvitationDelivery | AccountLifecycleResult) & ApiError;
      if (!response.ok) throw new Error(result.error ?? "The account action failed.");
      if (action === "resend") setDelivery(result as InvitationDelivery);
      if (!invitationAction && action !== "mfa-reset" && (result as AccountLifecycleResult).invitation) {
        setDelivery((result as AccountLifecycleResult).invitation ?? null);
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

  return (
    <div className="management-grid">
      <section className="management-panel" aria-labelledby="provision-title">
        <p className="eyebrow">Manager-led access</p>
        <h2 id="provision-title">Provision an account</h2>
        <p>Create a pending account and copy its one-time activation link to the recipient.</p>
        <form className="account-form" onSubmit={provision}>
          <div className="field-row">
            <label>First name<input name="firstName" required maxLength={100} /></label>
            <label>Last name<input name="lastName" required maxLength={100} /></label>
          </div>
          <label>Email address<input name="email" type="email" autoComplete="off" required /></label>
          <label>Phone number <span>(optional)</span><input name="phoneNumber" type="tel" maxLength={32} /></label>
          <label>Centre
            <select value={provisionCentre} onChange={(event) => setProvisionCentre(event.target.value)} required>
              {context.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}
            </select>
          </label>
          <fieldset>
            <legend>Roles</legend>
            <div className="role-options">
              {context.assignableRoles.map((role) => (
                <label key={role}><input name={`role-${role}`} type="checkbox" /> {role}</label>
              ))}
            </div>
          </fieldset>
          <button className="primary-button" disabled={pendingAction === "provision"} type="submit">
            {pendingAction === "provision" ? "Provisioning…" : "Provision account"}
          </button>
        </form>
      </section>

      <section className="management-panel account-list-panel" aria-labelledby="accounts-title">
        <div className="panel-heading">
          <div><p className="eyebrow">Centre scope</p><h2 id="accounts-title">Managed accounts</h2></div>
          <label className="scope-control">View
            <select value={scope} onChange={(event) => void changeScope(event.target.value)}>
              {context.assignableRoles.includes("manager") ? <option value="">All centres</option> : null}
              {context.centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name}</option>)}
            </select>
          </label>
        </div>

        {delivery ? (
          <div className="invitation-alert" role="status">
            <strong>Copy this one-time activation link now.</strong>
            <code>{delivery.activationUrl}</code>
            <button type="button" onClick={() => void navigator.clipboard.writeText(delivery.activationUrl)}>Copy link</button>
            <small>Expires {new Date(delivery.expiresAt).toLocaleString()}.</small>
          </div>
        ) : null}
        {error ? <p className="form-error action-error" role="alert">{error}</p> : null}
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
              <p className="account-meta">{account.roles.map((role) => role.roleKey).join(" · ")} · {account.centres.map((centre) => centre.name).join(", ")}</p>
              <div className="account-actions">
                {account.accountStatus === "pending_activation" ? (
                  <>
                    <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "resend")} type="button">New invitation</button>
                    <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "revoke")} type="button">Revoke invitation</button>
                  </>
                ) : null}
                {account.accountStatus === "active" ? <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "suspend")} type="button">Suspend</button> : null}
                {account.accountStatus === "suspended" || account.accountStatus === "disabled" ? <button disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "restore")} type="button">Restore</button> : null}
                {account.accountStatus !== "disabled" ? <button className="danger-button" disabled={pendingAction.startsWith(account.id)} onClick={() => void mutateAccount(account, "disable")} type="button">Disable</button> : null}
                {context.canResetMFA && account.mfaEnabled && account.id !== context.actorUserId && account.roles.some((role) => role.roleKey === "owner" || role.roleKey === "manager") ? (
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
    </div>
  );
}
