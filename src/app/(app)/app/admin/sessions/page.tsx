import { SessionManagement } from "@/components/sessions";

export default function AdminSessionsPage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <p className="eyebrow">Tution administration</p>
          <h1>Sessions</h1>
          <p className="mt-3 max-w-3xl text-slate-500">Build, generate, assign and publish the centre&apos;s two-hour teaching sessions.</p>
        </div>
      </header>
      <SessionManagement />
    </main>
  );
}
