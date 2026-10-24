import { SessionManagement } from "@/components/sessions";

export default function AdminSessionsPage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <h1>Sessions</h1>
        </div>
      </header>
      <SessionManagement />
    </main>
  );
}
