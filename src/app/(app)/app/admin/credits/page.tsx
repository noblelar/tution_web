import { CreditManagement } from "@/components/credits";

export default function AdminCreditsPage() {
  return (
    <main className="management-shell">
      <header className="management-header"><div><h1>Credits</h1></div></header>
      <CreditManagement />
    </main>
  );
}
