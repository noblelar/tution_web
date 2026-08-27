import Link from "next/link";

import { AcademicSetup } from "@/components/academics";

export default function AdminClassesPage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <p className="eyebrow">Tution administration</p>
          <h1>Academic setup</h1>
        </div>
        <nav className="header-links" aria-label="Administration">
          <Link className="secondary-link" href="/app/admin/users">Accounts</Link>
          <Link className="secondary-link" href="/app/admin/audit">Audit events</Link>
          <Link className="secondary-link" href="/app/admin">Return home</Link>
        </nav>
      </header>
      <AcademicSetup />
    </main>
  );
}
