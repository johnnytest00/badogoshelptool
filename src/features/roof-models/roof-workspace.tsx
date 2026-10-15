import type { ReactNode } from "react";

/** One continuous surface for editable roof measurements and their drawing. */
export function RoofWorkspace({
  context,
  measurements,
  drawing,
  results,
  actions,
  className = "",
  label = "Tetőmérési munkaterület",
}: Readonly<{
  context?: ReactNode;
  measurements: ReactNode;
  drawing?: ReactNode;
  results?: ReactNode;
  actions?: ReactNode;
  className?: string;
  label?: string;
}>) {
  return (
    <section className={`roof-workspace roof-workspace-surface${className ? ` ${className}` : ""}`} aria-label={label}>
      {context}
      {measurements}
      {drawing}
      {results}
      {actions}
    </section>
  );
}
