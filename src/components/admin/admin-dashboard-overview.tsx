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
  status: "Ready" | "Next" | "Planned";
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
    label: "Admin routes",
    value: "12",
    helper: "Manager and owner routes are now dashboard-mounted.",
    tone: "purple",
    icon: "activity",
  },
];

const profileReadiness: BarMetric[] = [
  { label: "People code foundation", value: 100, display: "100%" },
  { label: "Student access lifecycle", value: 100, display: "100%" },
  { label: "Family relationship rules", value: 100, display: "100%" },
  { label: "Dashboard data APIs", value: 40, display: "Next" },
  { label: "Live directory screens", value: 25, display: "Next" },
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
    description: "Search, filter, and profile-summary cards are next in Phase 3.",
    status: "Next",
  },
  {
    label: "Parents and links",
    description: "Relationship management moves into the dashboard in Phase 4.",
    status: "Planned",
  },
  {
    label: "Manager-led onboarding",
    description: "Parent, student, and parent-with-student forms follow in Phase 5.",
    status: "Planned",
  },
];

const quickActions = [
  { label: "Students", href: "/app/admin/students", description: "Prepare student directory and detail views.", icon: "users" as IconName },
  { label: "Parents", href: "/app/admin/parents", description: "Prepare parent records and linked children.", icon: "grid" as IconName },
  { label: "Tutors", href: "/app/admin/tutors", description: "Prepare tutor onboarding and assignment space.", icon: "book" as IconName },
];

export function AdminDashboardOverview() {
  return (
    <main className="admin-main admin-dashboard" aria-labelledby="admin-dashboard-title">
      <header className="admin-dashboard-hero">
        <div>
          <p className="eyebrow">Admin area</p>
          <h1 id="admin-dashboard-title">Manager dashboard</h1>
          <p>
            A Stage 2 command centre for profile demographics, relationship health,
            onboarding readiness, and manager action points.
          </p>
        </div>
        <div className="admin-dashboard-status" aria-label="Stage 2 dashboard status">
          <span>Stage 2</span>
          <strong>Dashboard-facing pass</strong>
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
          <PanelHeading title="Manager action queue" subtitle="The next build path from this landing page" />
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
          <PanelHeading title="Onboarding trend" subtitle="Dashboard structure ready for live weekly profile counts" />
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
          <PanelHeading title="Quick routes" subtitle="Move into the next dashboard management areas" />
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
