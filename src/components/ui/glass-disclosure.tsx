import { useId, type ReactNode } from "react";

/** Native, keyboard-operable disclosure with the shared Liquid Glass trigger. */
export function GlassDisclosure({
  summary,
  children,
  className = "",
  contentClassName = "",
}: Readonly<{
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}>) {
  const contentId = useId();
  return (
    <details className={`glass-disclosure${className ? ` ${className}` : ""}`}>
      <summary aria-controls={contentId}>{summary}</summary>
      <div id={contentId} className="glass-disclosure-content">
        <div className={contentClassName}>{children}</div>
      </div>
    </details>
  );
}
