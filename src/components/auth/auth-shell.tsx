import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="Tution welcome">
        <a className="auth-brand" href="/login">
          <span className="auth-brand-mark" />
          <span>Slough Tution Centre</span>
        </a>
        <div className="auth-brand-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="auth-feature-grid" aria-hidden="true">
          <span>Lessons</span>
          <span>Reports</span>
          <span>Credits</span>
          <span>Safeguarding</span>
        </div>
      </section>
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-card-heading">
          <p className="eyebrow">Secure portal</p>
          <h2 id="auth-title">{title}</h2>
        </div>
        {children}
      </section>
    </main>
  );
}
