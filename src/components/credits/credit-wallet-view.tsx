"use client";

import { useEffect, useState } from "react";

import type { CreditLedgerEntry, CreditWallet, ViewerCreditContext } from "@/lib/credit-types";

type ApiError = { error?: string };

export function CreditWalletView({ audience }: { audience: "parent" | "student" }) {
  const [context, setContext] = useState<ViewerCreditContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch("/api/credits", { cache: "no-store" });
        const result = (await response.json().catch(() => ({}))) as ViewerCreditContext & ApiError;
        if (!response.ok) throw new Error(result.error ?? "Credit information could not be loaded.");
        if (!cancelled) setContext(result);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Credit information could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="management-shell">
      <header className="management-header"><div><p className="eyebrow">{audience} area</p><h1>Credits</h1><p className="mt-3 max-w-3xl text-slate-500">One credit represents one paid tuition hour. A two-hour session uses two credits.</p></div></header>
      {loading ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500">Loading household credits…</p> : null}
      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-700" role="alert">{error}</p> : null}
      {!loading && context ? <section className="grid gap-5">{context.wallets.length ? context.wallets.map((item) => <WalletPanel audience={audience} entries={item.entries} key={item.wallet.parentProfileId} wallet={item.wallet} />) : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><h2 className="text-xl font-black text-slate-900">No household wallet is available</h2><p className="mt-2 text-slate-500">An administrator can confirm your household and student links.</p></div>}</section> : null}
    </main>
  );
}

function WalletPanel({ wallet, entries, audience }: { wallet: CreditWallet; entries: CreditLedgerEntry[]; audience: "parent" | "student" }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-5 bg-slate-950 p-6 text-white sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-orange-400">Shared household wallet</p><h2 className="mt-2 text-2xl font-black">{wallet.parentFirstName} {wallet.parentLastName}</h2><p className="mt-1 text-sm text-slate-300">Credits never expire and are shared by actively linked students.</p></div><div className="rounded-2xl bg-white/10 px-6 py-4 text-center"><p className="text-4xl font-black">{wallet.balanceCredits}</p><p className="text-xs font-bold uppercase tracking-wide text-slate-300">Available credits</p></div></div>
      <div className="grid gap-6 p-6">
        <section><h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Linked students</h3><div className="mt-3 flex flex-wrap gap-2">{wallet.children.length ? wallet.children.map((child) => <span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-bold text-orange-800" key={child.id}>{child.firstName} {child.lastName} · {child.centreName}</span>) : <span className="text-sm text-slate-500">No active students are linked.</span>}</div></section>
        {audience === "parent" ? <section><h3 className="text-sm font-black uppercase tracking-wide text-slate-400">Ledger history</h3><div className="mt-3 grid gap-2">{entries.length ? entries.map((entry) => <ViewerEntry entry={entry} key={entry.id} />) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No credit changes have been recorded yet.</p>}</div></section> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Payment references and household ledger notes are visible only to the parent account. Your shared available balance is shown above.</p>}
      </div>
    </article>
  );
}

function ViewerEntry({ entry }: { entry: CreditLedgerEntry }) {
  const label = entry.kind === "manual_award" ? "Credits added" : entry.kind === "manual_award_reversal" ? "Award reversed" : entry.kind.replaceAll("_", " ");
  return <div className="grid gap-2 rounded-xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-bold capitalize text-slate-800">{label}</p><p className="text-sm text-slate-500">{entry.centreName} · {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.createdAt))}</p></div><div className="text-right"><p className={`text-lg font-black ${entry.deltaCredits > 0 ? "text-emerald-700" : "text-red-700"}`}>{entry.deltaCredits > 0 ? "+" : ""}{entry.deltaCredits}</p><p className="text-xs text-slate-400">Balance {entry.balanceAfterCredits}</p></div></div>;
}
