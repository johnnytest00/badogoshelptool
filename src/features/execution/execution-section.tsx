"use client";

import type { SyntheticEvent } from "react";
import { ChevronDown } from "lucide-react";

export function ExecutionSection({ children }: Readonly<{ children: React.ReactNode }>) {
  function resetNestedSectionsWhenClosed(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) closeNestedExecutionDisclosures(event.currentTarget);
  }

  return (
    <details id="kivitelezes" className="project-execution-disclosure" onToggle={resetNestedSectionsWhenClosed}>
      <summary>
        <h2>Kivitelezés</h2>
        <ChevronDown aria-hidden="true" className="execution-disclosure-chevron" />
      </summary>
      <div className="project-execution-content">{children}</div>
    </details>
  );
}

export function ExecutionSubsection({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <details className="execution-nested-disclosure">
      <summary>{title}</summary>
      <div className="execution-nested-content">{children}</div>
    </details>
  );
}

export function closeNestedExecutionDisclosures(root: Pick<HTMLDetailsElement, "querySelectorAll">) {
  root.querySelectorAll<HTMLDetailsElement>("details.execution-nested-disclosure").forEach((disclosure) => {
    disclosure.open = false;
  });
}
