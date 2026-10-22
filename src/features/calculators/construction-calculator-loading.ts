import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";

import type { CalculatorDefinition } from "./construction-calculator-types";

const defaultCalculatorId = "roof.rafter-cut";

export function initialConstructionCalculatorId(id: string): string {
  return constructionCalculatorCatalog.some((item) => item.id === id && item.status === "verified") ? id : defaultCalculatorId;
}

export async function loadConstructionCalculatorDefinition(id: string): Promise<CalculatorDefinition | null> {
  const reference = constructionCalculatorCatalog.find((item) => item.id === id && item.status === "verified");
  if (!reference) return null;

  const { definitions } = reference.category === "roof"
    ? await import("./roof-calculator-definitions")
    : reference.category === "stair"
      ? await import("./stair-calculator-definitions")
      : await import("./concrete-calculator-definitions");
  return definitions[id] ?? null;
}
