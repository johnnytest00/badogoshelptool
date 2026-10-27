import type { QuotationLine } from "@/domain/quotations/contracts";
import { quotationPurchasingUnitIdentity } from "./quotation-material-state";

export type PotentialOverlapLine = Pick<QuotationLine, "type" | "description" | "quantity" | "unit"> & {
  id: string;
  sourceMaterialItemId?: string;
  calculationSourceKey?: string;
};

export type PotentialQuotationItemOverlap = Readonly<{
  key: string;
  description: string;
  materialLines: PotentialOverlapLine[];
  calculationLines: PotentialOverlapLine[];
}>;

function normalizedDescription(description: string): string {
  return description.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("hu-HU");
}

/** Reports exact cross-source material matches; names only suggest overlap and never change quote data. */
export function findPotentialQuotationItemOverlaps(lines: readonly PotentialOverlapLine[]): PotentialQuotationItemOverlap[] {
  const groups = new Map<string, { description: string; materialLines: PotentialOverlapLine[]; calculationLines: PotentialOverlapLine[] }>();
  for (const line of lines) {
    if (line.type !== "MATERIAL" || !line.description.trim() || !line.unit.trim()) continue;
    const fromMaterialList = Boolean(line.sourceMaterialItemId);
    const fromCalculation = Boolean(line.calculationSourceKey);
    if (fromMaterialList === fromCalculation) continue;
    const description = normalizedDescription(line.description);
    const key = `${description}\u0000${quotationPurchasingUnitIdentity(line.unit)}`;
    const group = groups.get(key) ?? { description: line.description.trim(), materialLines: [], calculationLines: [] };
    (fromMaterialList ? group.materialLines : group.calculationLines).push(line);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .filter(([, group]) => group.materialLines.length > 0 && group.calculationLines.length > 0)
    .map(([key, group]) => ({ key, ...group }));
}
