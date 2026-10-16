import { useId, type ReactNode, type SyntheticEvent } from "react";

/** Native, keyboard-operable disclosure with the shared Liquid Glass trigger. */
export function GlassDisclosure({
  summary,
  children,
  className = "",
  contentClassName = "",
  id,
  defaultOpen = false,
  onToggle,
}: Readonly<{
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  id?: string;
  defaultOpen?: boolean;
  onToggle?: (event: SyntheticEvent<HTMLDetailsElement>) => void;
}>) {
  const contentId = useId();
  return (
    <details id={id} className={`glass-disclosure${className ? ` ${className}` : ""}`} open={defaultOpen || undefined} onToggle={onToggle}>
      <summary aria-controls={contentId}>{summary}</summary>
      <div id={contentId} className="glass-disclosure-content">
        <div className={contentClassName}>{children}</div>
      </div>
    </details>
  );
}
