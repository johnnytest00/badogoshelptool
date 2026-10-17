import type { ReactNode } from "react";
import { LiquidGlassLayer } from "@/components/ui/liquid-glass-layer";

/** Compact shared page title surface. Section headings stay outside this component. */
export function GlassPageHeader({
  title,
  titleId,
  context,
  actions,
  className = "",
}: Readonly<{
  title: string;
  titleId?: string;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
}>) {
  const showLibraryEffect = !className.split(/\s+/).includes("roof-calculator-toolbar");
  return (
    <header className={`glass-page-header${className ? ` ${className}` : ""}`}>
      {showLibraryEffect && <LiquidGlassLayer />}
      <div className="glass-page-header-copy">
        <h1 id={titleId}>{title}</h1>
        {context && <div className="glass-page-header-context">{context}</div>}
      </div>
      {actions && <div className="glass-page-header-actions">{actions}</div>}
    </header>
  );
}
