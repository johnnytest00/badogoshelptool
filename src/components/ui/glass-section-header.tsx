import type { ReactNode } from "react";
import { LiquidGlassLayer } from "@/components/ui/liquid-glass-layer";

/** Compact glass title bubble for a primary section within a page. */
export function GlassSectionHeader({
  title,
  id,
  actions,
  className = "",
}: Readonly<{
  title: string;
  id?: string;
  actions?: ReactNode;
  className?: string;
}>) {
  return (
    <header className={`glass-section-header${className ? ` ${className}` : ""}`}>
      <LiquidGlassLayer radius={18} />
      <h2 id={id}>{title}</h2>
      {actions && <div className="glass-section-header-actions">{actions}</div>}
    </header>
  );
}
