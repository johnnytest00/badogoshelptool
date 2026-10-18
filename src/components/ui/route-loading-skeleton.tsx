type SkeletonKind = "dashboard" | "workspace" | "list" | "form";

export function RouteLoadingSkeleton({ label = "Az oldal", kind = "workspace" }: Readonly<{ label?: string; kind?: SkeletonKind }>) {
  return <main id="main-content" tabIndex={-1} className="dashboard-shell glass-route-loading" aria-busy="true">
    <div className="dashboard-container">
      <p className="sr-only" role="status" aria-live="polite">{label} betöltése folyamatban…</p>
      <div className="route-skeleton-heading" aria-hidden="true"><i /><i /><i /></div>
      <div className={`route-skeleton-grid is-${kind}`} aria-hidden="true">
        {Array.from({ length: kind === "dashboard" ? 6 : kind === "form" ? 3 : 4 }, (_, index) => <section className="route-skeleton-surface" key={index}>
          <i className="route-skeleton-line is-short" /><i className="route-skeleton-line" /><i className="route-skeleton-line is-wide" />
          {kind !== "form" && <div className="route-skeleton-row"><i /><i /><i /></div>}
        </section>)}
      </div>
    </div>
  </main>;
}
