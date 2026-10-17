import type { ReactNode } from "react";
import { LiquidGlassLayer } from "@/components/ui/liquid-glass-layer";

/** Shared translucent surface for groups of related, working controls. */
export function GlassToolbar({
  ariaLabel,
  children,
  className = "",
  libraryEffect = true,
}: Readonly<{
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  libraryEffect?: boolean;
}>) {
  const showLibraryEffect = libraryEffect && !className.split(/\s+/).includes("roof-calculator-toolbar");
  return (
    <div className={`glass-toolbar${className ? ` ${className}` : ""}`} role="group" aria-label={ariaLabel}>
      {showLibraryEffect && <LiquidGlassLayer radius={18} />}
      {children}
    </div>
  );
}
