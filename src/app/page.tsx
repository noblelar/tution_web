import Link from "next/link";

export default function Home() {
  return (
    <main className="baseline-shell">
      <section aria-labelledby="page-title" className="baseline-card">
        <p className="eyebrow">Engineering baseline</p>
        <h1 id="page-title">Tution</h1>
        <p>
          Identity, secure authentication, centre-scoped administration, and
          immutable audit operations are available as the Stage 1 foundation.
        </p>
        <nav className="home-actions" aria-label="Tution administration">
          <Link className="primary-link" href="/users">Manage accounts</Link>
          <Link className="secondary-link" href="/audit">Review audit events</Link>
        </nav>
      </section>
    </main>
  );
}
