import type { ReactNode } from "react";

/** Compact shared page title surface. Section headings stay outside this component. */
export function GlassPageHeader({
  title,
  context,
  actions,
  className = "",
}: Readonly<{
  title: string;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <header className={`glass-page-header${className ? ` ${className}` : ""}`}>
      <div className="glass-page-header-copy">
        <h1>{title}</h1>
        {context && <div className="glass-page-header-context">{context}</div>}
      </div>
      {actions && <div className="glass-page-header-actions">{actions}</div>}
    </header>
  );
}
