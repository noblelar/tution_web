import Link from "next/link";

import { AuditExplorer } from "./audit-explorer";

export default function AuditPage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <p className="eyebrow">Tution security operations</p>
          <h1>Audit events</h1>
        </div>
        <nav className="header-links" aria-label="Administration">
          <Link className="secondary-link" href="/app/admin/users">Accounts</Link>
          <Link className="secondary-link" href="/app/admin">Return home</Link>
        </nav>
      </header>
      <AuditExplorer />
    </main>
  );
}
