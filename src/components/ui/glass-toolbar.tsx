import type { ReactNode } from "react";

/** Shared translucent surface for groups of related, working controls. */
export function GlassToolbar({
  ariaLabel,
  children,
  className = "",
}: Readonly<{
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}>) {
  return (
    <div className={`glass-toolbar${className ? ` ${className}` : ""}`} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}
