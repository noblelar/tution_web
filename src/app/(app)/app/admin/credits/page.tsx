import { CreditManagement } from "@/components/credits";

export default function AdminCreditsPage() {
  return (
    <main className="management-shell">
      <header className="management-header"><div><p className="eyebrow">Tution administration</p><h1>Credits</h1><p className="mt-3 max-w-3xl text-slate-500">Award paid tuition hours and inspect the immutable household ledger.</p></div></header>
      <CreditManagement />
    </main>
  );
}
