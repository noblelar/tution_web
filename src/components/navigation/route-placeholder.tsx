type RoutePlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function RoutePlaceholder({ eyebrow, title, description }: RoutePlaceholderProps) {
  return (
    <main className="baseline-shell">
      <section className="baseline-card" aria-labelledby="route-placeholder-title">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="route-placeholder-title">{title}</h1>
        <p>{description}</p>
      </section>
    </main>
  );
}
