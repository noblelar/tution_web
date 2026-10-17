"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import { FormDialog } from "@/components/ui/form-dialog";
import type { CentreList, ManagedCentre } from "@/lib/centre-types";
import type { AdminCreditContext, CreditLedgerEntry, CreditMutationResult, CreditWallet } from "@/lib/credit-types";

type ApiError = { error?: string };
type AwardDraft = { credits: string; paymentMethod: "cash" | "bank_transfer" | "other"; paymentReference: string; note: string };

const emptyAward: AwardDraft = { credits: "2", paymentMethod: "bank_transfer", paymentReference: "", note: "" };
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100 disabled:bg-slate-100";
const labelClass = "grid gap-1.5 text-sm font-semibold text-slate-800";
const primaryButton = "rounded-xl border border-orange-600 bg-orange-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-wait disabled:opacity-50";
const secondaryButton = "rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50";
const dangerButton = "rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-50";

export function CreditManagement() {
  const [centres, setCentres] = useState<ManagedCentre[]>([]);
  const [centreId, setCentreId] = useState("");
  const [context, setContext] = useState<AdminCreditContext | null>(null);
  const [search, setSearch] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<CreditWallet | null>(null);
  const [awardDraft, setAwardDraft] = useState<AwardDraft>(emptyAward);
  const [reversingEntry, setReversingEntry] = useState<CreditLedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [dialog, setDialog] = useState<"award" | "reverse" | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadContext = useCallback(async (scopeCentreId: string) => {
    const response = await fetch(`/api/credits?centreId=${encodeURIComponent(scopeCentreId)}`, { cache: "no-store" });
    const result = (await response.json().catch(() => ({}))) as AdminCreditContext & ApiError;
    if (!response.ok) throw new Error(result.error ?? "Credit management could not be loaded.");
    setContext(result);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/centres", { cache: "no-store" });
        const result = (await response.json().catch(() => ({}))) as CentreList & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Centres could not be loaded.");
        const available = (result.centres ?? []).filter((centre) => centre.status === "active");
        const initial = available[0]?.id ?? "";
        if (!initial) throw new Error("Create and activate a centre before managing credits.");
        if (cancelled) return;
        setCentres(available);
        setCentreId(initial);
        await loadContext(initial);
      } catch (caught) {
        if (!cancelled) setError(errorMessage(caught, "Credit management is unavailable."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [loadContext]);

  const filteredWallets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return context?.wallets ?? [];
    return (context?.wallets ?? []).filter((wallet) => [wallet.parentFirstName, wallet.parentLastName, wallet.parentEmail, wallet.parentPeopleCode, ...wallet.children.flatMap((child) => [child.firstName, child.lastName, child.peopleCode])].some((value) => value.toLowerCase().includes(query)));
  }, [context, search]);
  const totalBalance = useMemo(() => (context?.wallets ?? []).reduce((total, wallet) => total + wallet.balanceCredits, 0), [context]);
  const fundedHouseholds = useMemo(() => (context?.wallets ?? []).filter((wallet) => wallet.balanceCredits > 0).length, [context]);

  async function changeCentre(nextCentreId: string) {
    setCentreId(nextCentreId); setLoading(true); clearFeedback(); closeDialog();
    try { await loadContext(nextCentreId); }
    catch (caught) { setError(errorMessage(caught, "Credit management could not be loaded.")); }
    finally { setLoading(false); }
  }

  function openAward(wallet: CreditWallet) {
    setSelectedWallet(wallet); setAwardDraft(emptyAward); setDialog("award"); clearFeedback();
  }

  async function award(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedWallet) return;
    setPending(true); setError(""); setNotice("");
    try {
      const result = await mutate<CreditMutationResult>("/api/credits/awards", {
        centreId,
        parentProfileId: selectedWallet.parentProfileId,
        credits: Number(awardDraft.credits),
        paymentMethod: awardDraft.paymentMethod,
        paymentReference: awardDraft.paymentReference || undefined,
        note: awardDraft.note || undefined,
      });
      setDialog(null);
      setNotice(`${result.entry.deltaCredits} credits awarded to ${selectedWallet.parentFirstName} ${selectedWallet.parentLastName}.`);
      await loadContext(centreId);
    } catch (caught) { setError(errorMessage(caught, "Credits could not be awarded.")); }
    finally { setPending(false); }
  }

  function openReversal(entry: CreditLedgerEntry) {
    setReversingEntry(entry); setReversalReason(""); setDialog("reverse"); clearFeedback();
  }

  async function reverseAward(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reversingEntry) return;
    setPending(true); setError(""); setNotice("");
    try {
      await mutate<CreditMutationResult>(`/api/credits/${encodeURIComponent(reversingEntry.id)}/reverse`, { centreId, reason: reversalReason });
      setDialog(null);
      setNotice("The award was reversed with a new immutable ledger entry.");
      await loadContext(centreId);
    } catch (caught) { setError(errorMessage(caught, "The award could not be reversed.")); }
    finally { setPending(false); }
  }

  function clearFeedback() { setError(""); setNotice(""); }
  function closeDialog() { if (!pending) { setDialog(null); setSelectedWallet(null); setReversingEntry(null); setError(""); } }

  return (
    <div className="grid gap-6">
      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-end">
        <div><p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600">Household wallets</p><h2 className="text-2xl font-black tracking-tight text-slate-950">Manual credit management</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Record paid tuition hours against a parent&apos;s shared family wallet. Every change is retained in an immutable centre-attributed ledger.</p></div>
        <label className="grid min-w-64 gap-1.5 text-sm font-bold text-slate-700">Management centre<select className={inputClass} disabled={loading || pending} onChange={(event) => void changeCentre(event.target.value)} value={centreId}>{centres.map((centre) => <option key={centre.id} value={centre.id}>{centre.name} ({centre.code})</option>)}</select></label>
      </section>

      {error && !dialog ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700" role="status">{notice}</p> : null}
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading household credits…</p> : null}

      {!loading && context ? (
        <>
          <section className="grid gap-4 sm:grid-cols-3" aria-label="Credit summary">
            <Stat label="Households" value={context.wallets.length} helper={`Visible through ${context.centreName}`} />
            <Stat label="Funded households" value={fundedHouseholds} helper="Balances above zero" />
            <Stat label="Combined balance" value={totalBalance} helper="Credits across visible wallets" />
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">Households</h2><p className="mt-1 text-sm text-slate-500">Choose a household to record paid credit.</p></div><label className="grid min-w-64 gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">Search<input className={inputClass} onChange={(event) => setSearch(event.target.value)} placeholder="Parent, child, email or code" type="search" value={search} /></label></div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredWallets.length ? filteredWallets.map((wallet) => (
                <article className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" key={wallet.parentProfileId}>
                  <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-slate-950">{wallet.parentFirstName} {wallet.parentLastName}</h3><p className="text-sm text-slate-500">{wallet.parentEmail}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">{wallet.parentPeopleCode}</p></div><Balance value={wallet.balanceCredits} /></div>
                  <div className="flex flex-wrap gap-1.5">{wallet.children.length ? wallet.children.map((child) => <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600" key={child.id}>{child.firstName} {child.lastName}</span>) : <span className="text-xs text-slate-400">No active child at this centre</span>}</div>
                  <button className={primaryButton} disabled={pending} onClick={() => openAward(wallet)} type="button">Award credits</button>
                </article>
              )) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 md:col-span-2 xl:col-span-3">No matching households were found.</p>}
            </div>
          </section>

          <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div><h2 className="text-xl font-black text-slate-950">Centre ledger</h2><p className="mt-1 text-sm text-slate-500">Entries recorded through {context.centreName}. History cannot be edited or deleted.</p></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Date</th><th className="px-3 py-3">Household</th><th className="px-3 py-3">Entry</th><th className="px-3 py-3">Payment</th><th className="px-3 py-3 text-right">Change</th><th className="px-3 py-3 text-right">Balance</th><th className="px-3 py-3"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{context.entries.length ? context.entries.map((entry) => <LedgerRow entry={entry} wallet={context.wallets.find((wallet) => wallet.id === entry.walletId)} key={entry.id} onReverse={openReversal} pending={pending} />) : <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={7}>No credits have been recorded through this centre.</td></tr>}</tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      <FormDialog open={dialog === "award"} title="Award household credits" description={`${selectedWallet?.parentFirstName ?? "Household"} ${selectedWallet?.parentLastName ?? ""} will share these credits with all actively linked children.`} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <form className="grid gap-4 p-5" onSubmit={award}>
          <div className="rounded-xl bg-orange-50 p-4 text-sm text-orange-900"><strong>One credit equals one hour.</strong> A standard Tution session will use two credits during the booking phase.</div>
          <div className="grid gap-4 sm:grid-cols-2"><label className={labelClass}>Credits<input className={inputClass} min={1} onChange={(event) => setAwardDraft({ ...awardDraft, credits: event.target.value })} required type="number" value={awardDraft.credits} /></label><label className={labelClass}>Payment method<select className={inputClass} onChange={(event) => setAwardDraft({ ...awardDraft, paymentMethod: event.target.value as AwardDraft["paymentMethod"] })} value={awardDraft.paymentMethod}><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></label></div>
          <label className={labelClass}>Payment reference <span className="font-normal text-slate-400">Optional</span><input className={inputClass} maxLength={160} onChange={(event) => setAwardDraft({ ...awardDraft, paymentReference: event.target.value })} value={awardDraft.paymentReference} /></label>
          <label className={labelClass}>Administrative note <span className="font-normal text-slate-400">Optional; never shown to students</span><textarea className={`${inputClass} min-h-24 resize-y`} maxLength={1000} onChange={(event) => setAwardDraft({ ...awardDraft, note: event.target.value })} value={awardDraft.note} /></label>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={pending} onClick={closeDialog} type="button">Cancel</button><button className={primaryButton} disabled={pending} type="submit">{pending ? "Recording…" : "Record award"}</button></div>
        </form>
      </FormDialog>

      <FormDialog open={dialog === "reverse"} title="Reverse credit award" description="This creates an equal negative entry. The original award and this reason remain permanently in the ledger." onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <form className="grid gap-4 p-5" onSubmit={reverseAward}>
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">This will remove {reversingEntry?.deltaCredits ?? 0} credits from the current household balance.</div>
          <label className={labelClass}>Reversal reason<textarea className={`${inputClass} min-h-28 resize-y`} maxLength={1000} onChange={(event) => setReversalReason(event.target.value)} required value={reversalReason} /></label>
          {error ? <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button className={secondaryButton} disabled={pending} onClick={closeDialog} type="button">Cancel</button><button className={dangerButton} disabled={pending} type="submit">{pending ? "Reversing…" : "Reverse award"}</button></div>
        </form>
      </FormDialog>
    </div>
  );
}

function Stat({ label, value, helper }: { label: string; value: number; helper: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-1 text-sm text-slate-500">{helper}</p></div>; }
function Balance({ value }: { value: number }) { return <span className={`rounded-xl px-3 py-2 text-lg font-black ${value > 0 ? "bg-emerald-100 text-emerald-700" : value < 0 ? "bg-red-100 text-red-700" : "bg-slate-200 text-slate-600"}`}>{value}</span>; }

function LedgerRow({ entry, wallet, pending, onReverse }: { entry: CreditLedgerEntry; wallet?: CreditWallet; pending: boolean; onReverse: (entry: CreditLedgerEntry) => void }) {
  return <tr className="border-b border-slate-100 align-top"><td className="whitespace-nowrap px-3 py-4 text-slate-500">{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</td><td className="px-3 py-4"><strong className="text-slate-900">{wallet ? `${wallet.parentFirstName} ${wallet.parentLastName}` : "Household"}</strong><span className="block text-xs text-slate-400">{wallet?.parentPeopleCode}</span></td><td className="px-3 py-4"><span className="font-semibold text-slate-700">{entry.kind === "manual_award" ? "Manual award" : entry.kind === "manual_award_reversal" ? "Award reversal" : entry.kind.replaceAll("_", " ")}</span>{entry.note ? <span className="block max-w-xs text-xs text-slate-400">{entry.note}</span> : null}</td><td className="px-3 py-4 text-slate-600">{entry.paymentMethod ? entry.paymentMethod.replaceAll("_", " ") : "—"}{entry.paymentReference ? <span className="block text-xs text-slate-400">{entry.paymentReference}</span> : null}</td><td className={`px-3 py-4 text-right font-black ${entry.deltaCredits > 0 ? "text-emerald-700" : "text-red-700"}`}>{entry.deltaCredits > 0 ? "+" : ""}{entry.deltaCredits}</td><td className="px-3 py-4 text-right font-bold text-slate-700">{entry.balanceAfterCredits}</td><td className="px-3 py-4 text-right">{entry.reversible ? <button className={dangerButton} disabled={pending} onClick={() => onReverse(entry)} type="button">Reverse</button> : null}</td></tr>;
}

async function mutate<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const csrfResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
  const csrf = (await csrfResponse.json().catch(() => ({}))) as { csrfToken?: string; error?: string };
  if (!csrfResponse.ok || !csrf.csrfToken) throw new Error(csrf.error ?? "Request verification is unavailable.");
  const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": csrf.csrfToken }, body: JSON.stringify(body) });
  const result = (await response.json().catch(() => ({}))) as T & ApiError;
  if (!response.ok) throw new Error(result.error ?? "The credit change could not be completed.");
  return result;
}

function errorMessage(caught: unknown, fallback: string) { return caught instanceof Error ? caught.message : fallback; }
