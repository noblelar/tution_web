import { Icon, type IconName } from "@/components/dashboard";

type AdminPlaceholderHighlight = {
  label: string;
  description: string;
  icon: IconName;
};

type AdminPagePlaceholderProps = {
  title: string;
  highlights?: AdminPlaceholderHighlight[];
};

const defaultHighlights: AdminPlaceholderHighlight[] = [
  {
    label: "Dashboard-ready layout",
    description: "This route now sits inside the manager and owner dashboard shell.",
    icon: "grid",
  },
  {
    label: "Stage 2 foundation",
    description: "The page is ready to connect to profiles, onboarding, and family-link data.",
    icon: "users",
  },
  {
    label: "Next implementation pass",
    description: "Tables, graphs, forms, and actions will be added in the dedicated feature phases.",
    icon: "check",
  },
];

export function AdminPagePlaceholder({ title, highlights }: AdminPagePlaceholderProps) {
  const pageHighlights = highlights ?? defaultHighlights;

  return (
    <main className="admin-main" aria-labelledby="admin-page-title">
      <header className="admin-page-heading">
        <div>
          <h1 id="admin-page-title">{title}</h1>
        </div>
      </header>
      <section className="admin-placeholder-grid" aria-label={`${title} planning areas`}>
        {pageHighlights.map((highlight) => (
          <article className="admin-placeholder-card" key={highlight.label}>
            <span className="admin-placeholder-icon">
              <Icon name={highlight.icon} size={18} />
            </span>
            <h2>{highlight.label}</h2>
            <p>{highlight.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
