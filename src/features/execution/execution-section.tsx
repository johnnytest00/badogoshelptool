"use client";

import type { SyntheticEvent } from "react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";

export function ExecutionSection({ children, defaultOpen = false }: Readonly<{ children: React.ReactNode; defaultOpen?: boolean }>) {
  function resetNestedSectionsWhenClosed(event: SyntheticEvent<HTMLDetailsElement>) {
    if (!event.currentTarget.open) closeNestedExecutionDisclosures(event.currentTarget);
  }

  return (
    <GlassDisclosure id="kivitelezes" className="project-execution-disclosure" defaultOpen={defaultOpen} onToggle={resetNestedSectionsWhenClosed} summary={<h2>Kivitelezés</h2>} contentClassName="project-execution-content">{children}</GlassDisclosure>
  );
}

export function ExecutionSubsection({ title, children, defaultOpen = false }: Readonly<{ title: string; children: React.ReactNode; defaultOpen?: boolean }>) {
  return (
    <GlassDisclosure className="execution-nested-disclosure" defaultOpen={defaultOpen} summary={title} contentClassName="execution-nested-content">{children}</GlassDisclosure>
  );
}

export function closeNestedExecutionDisclosures(root: Pick<HTMLDetailsElement, "querySelectorAll">) {
  root.querySelectorAll<HTMLDetailsElement>("details.execution-nested-disclosure").forEach((disclosure) => {
    disclosure.open = false;
  });
}
