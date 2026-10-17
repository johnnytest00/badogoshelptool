import { useId, type ReactNode, type SyntheticEvent } from "react";
import { LiquidGlassLayer } from "@/components/ui/liquid-glass-layer";

/** Native, keyboard-operable disclosure with the shared Liquid Glass trigger. */
export function GlassDisclosure({
  summary,
  children,
  className = "",
  contentClassName = "",
  id,
  defaultOpen = false,
  onToggle,
  libraryEffect = false,
}: Readonly<{
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  defaultOpen?: boolean;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
  libraryEffect?: boolean;
}>) {
  const contentId = useId();
  return (
    <details id={id} className={`glass-disclosure${className ? ` ${className}` : ""}`} open={defaultOpen || undefined} onToggle={onToggle}>
      {libraryEffect && <LiquidGlassLayer radius={16} />}
      <summary aria-controls={contentId}>{summary}</summary>
      <div id={contentId} className="glass-disclosure-content">
        <div className={contentClassName}>{children}</div>
      </div>
    </details>
  );
}
