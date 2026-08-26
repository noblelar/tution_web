import Link from "next/link";

import { AccountManagement } from "./account-management";

export default function UsersPage() {
  return (
    <main className="management-shell">
      <header className="management-header">
        <div>
          <p className="eyebrow">Tution administration</p>
          <h1>Accounts and invitations</h1>
        </div>
        <nav className="header-links" aria-label="Administration">
          <Link className="secondary-link" href="/audit">Audit events</Link>
          <Link className="secondary-link" href="/">Return home</Link>
        </nav>
      </header>
      <AccountManagement />
    </main>
  );
}
