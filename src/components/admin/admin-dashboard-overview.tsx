import Link from "next/link";

import { Icon, type IconName } from "@/components/dashboard";

type MetricCard = {
  label: string;
  value: string;
  helper: string;
  tone: "orange" | "green" | "blue" | "purple";
  icon: IconName;
};

type BarMetric = {
  label: string;
  value: number;
  display: string;
};

type ActivityItem = {
  label: string;
  description: string;
  status: "Ready" | "Deferred";
};

const metrics: MetricCard[] = [
  {
    label: "Profile foundation",
    value: "Ready",
    helper: "People-code, parent, and student structures are available.",
    tone: "orange",
    icon: "users",
  },
  {
    label: "No-email student access",
    value: "Enabled",
    helper: "Students can use people code and date of birth when eligible.",
    tone: "green",
    icon: "check",
  },
  {
    label: "Family permissions",
    value: "4 core",
    helper: "Bookings, lessons, reports, and credits are represented.",
    tone: "blue",
    icon: "grid",
  },
  {
    label: "Dashboard shell",
    value: "Guarded",
    helper: "Admin, parent, and student areas now check role access before rendering.",
    tone: "purple",
    icon: "activity",
  },
];

const profileReadiness: BarMetric[] = [
  { label: "People code foundation", value: 100, display: "100%" },
  { label: "Student access lifecycle", value: 100, display: "100%" },
  { label: "Family relationship rules", value: 100, display: "100%" },
  { label: "Manager-led onboarding forms", value: 100, display: "100%" },
  { label: "Role-aware dashboard guarding", value: 100, display: "100%" },
];

const relationshipMix = [
  { label: "Guardian", value: 38, className: "is-orange" },
  { label: "Mother", value: 27, className: "is-green" },
  { label: "Father", value: 24, className: "is-blue" },
  { label: "Other", value: 11, className: "is-purple" },
];

const activity: ActivityItem[] = [
  {
    label: "Students directory",
    description: "Search, filtering, profile cards, detail pages, people-code visibility, and lifecycle actions are in place.",
    status: "Ready",
  },
  {
    label: "Parents and links",
    description: "Parent directory, parent detail, linked-student permissions, and relationship lifecycle controls are in place.",
    status: "Ready",
  },
  {
    label: "Manager-led onboarding",
    description: "Parent, student, parent-with-student, and tutor onboarding workflows are now dashboard-facing.",
    status: "Ready",
  },
  {
    label: "Live dashboard metrics",
    description: "Operational graph data is intentionally deferred until later stages add bookings, attendance, credits, and reports.",
    status: "Deferred",
  },
];

const quickActions = [
  { label: "Students", href: "/app/admin/students", description: "Manage student profiles, people codes, and lifecycle controls.", icon: "users" as IconName },
  { label: "Parents", href: "/app/admin/parents", description: "Manage parent records and linked-student permissions.", icon: "grid" as IconName },
  { label: "Tutors", href: "/app/admin/tutors", description: "Onboard tutors and prepare the future tutor directory.", icon: "book" as IconName },
  { label: "Settings", href: "/app/admin/settings", description: "Review your signed-in account and session controls.", icon: "settings" as IconName },
];

export function AdminDashboardOverview() {
  return (
    <main className="admin-main admin-dashboard" aria-labelledby="admin-dashboard-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="admin-dashboard-title">Manager dashboard</h1>
          <p>
            A Stage 2 command centre for managed profiles, family relationships,
            onboarding workflows, and access-boundary readiness.
          </p>
        </div>
        <div className="admin-dashboard-status" aria-label="Stage 2 dashboard status">
          <span>Stage 2</span>
          <strong>Ready for Stage 3 planning</strong>
        </div>
      </header>

      <section className="admin-metric-grid" aria-label="Profile and onboarding summary">
        {metrics.map((metric) => (
          <article className={`admin-metric-card is-${metric.tone}`} key={metric.label}>
            <span className="admin-metric-icon">
              <Icon name={metric.icon} size={18} />
            </span>
            <div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <span>{metric.helper}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="admin-dashboard-grid" aria-label="Admin profile dashboard panels">
        <article className="admin-panel admin-readiness-panel">
          <PanelHeading title="Profile readiness" subtitle="Current dashboard-facing Stage 2 coverage" />
          <div className="admin-bar-list">
            {profileReadiness.map((item) => (
              <div className="admin-bar-row" key={item.label}>
                <div>
                  <span>{item.label}</span>
                  <strong>{item.display}</strong>
                </div>
                <div className="admin-bar-track" aria-hidden="true">
                  <span style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-donut-panel">
          <PanelHeading title="Relationship coverage" subtitle="Permission model prepared for linked families" />
          <div className="admin-donut-wrap">
            <div className="admin-donut" aria-label="Relationship type visual summary" />
            <ul className="admin-donut-legend">
              {relationshipMix.map((item) => (
                <li key={item.label}>
                  <span className={item.className} />
                  <strong>{item.value}%</strong>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="admin-panel admin-action-panel">
          <PanelHeading title="Stage 2 completion notes" subtitle="What is ready now, and what is intentionally deferred" />
          <div className="admin-activity-list">
            {activity.map((item) => (
              <div className="admin-activity-row" key={item.label}>
                <span className={`admin-status-pill is-${item.status.toLowerCase()}`}>{item.status}</span>
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-wide-panel">
          <PanelHeading title="Onboarding trend" subtitle="Visual placeholder retained until later stages provide live operational data" />
          <div className="admin-trend-chart" aria-label="Onboarding trend placeholder chart">
            {[42, 58, 50, 76, 68, 86, 74].map((height, index) => (
              <div className="admin-trend-column" key={index}>
                <span style={{ height: `${height}%` }} />
                <small>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel admin-quick-panel">
          <PanelHeading title="Quick routes" subtitle="Move into the active Stage 2 management areas" />
          <div className="admin-quick-list">
            {quickActions.map((action) => (
              <Link className="admin-quick-link" href={action.href} key={action.label}>
                <span>
                  <Icon name={action.icon} size={17} />
                </span>
                <div>
                  <strong>{action.label}</strong>
                  <p>{action.description}</p>
                </div>
                <Icon name="chevronRight" size={15} />
              </Link>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

function PanelHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="admin-panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <button type="button" aria-label={`More options for ${title}`}>
        <Icon name="more" size={17} />
      </button>
    </header>
  );
}
