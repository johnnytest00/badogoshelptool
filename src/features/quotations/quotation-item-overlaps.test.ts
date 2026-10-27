import { describe, expect, it } from "vitest";
import { findPotentialQuotationItemOverlaps, type PotentialOverlapLine } from "./quotation-item-overlaps";

type FixtureLine = PotentialOverlapLine & { unitPrice?: string; total?: string };

const line = (id: string, source: "material" | "calculation" | "manual", overrides: Partial<FixtureLine> = {}): FixtureLine => ({
  id, type: "MATERIAL", description: "Szarufa", quantity: "36", unit: "piece",
  sourceMaterialItemId: source === "material" ? `material-${id}` : "",
  calculationSourceKey: source === "calculation" ? `cut/rafters/${id}` : "",
  ...overrides,
});

describe("findPotentialQuotationItemOverlaps", () => {
  it("groups exact cross-source material names and canonical units without merging rows", () => {
    const result = findPotentialQuotationItemOverlaps([
      line("material-1", "material", { description: " Szarufa ", unit: "db" }),
      line("calculation-1", "calculation", { quantity: "36" }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.materialLines.map(({ id }) => id)).toEqual(["material-1"]);
    expect(result[0]?.calculationLines.map(({ id }) => id)).toEqual(["calculation-1"]);
  });

  it("keeps distinct specifications, units, labor, manual rows, and same-source rows out", () => {
    const result = findPotentialQuotationItemOverlaps([
      line("material-1", "material"), line("calculation-1", "calculation", { description: "Szarufa 5×10" }),
      line("material-2", "material", { unit: "m" }), line("calculation-2", "calculation", { unit: "m²" }),
      line("labor", "calculation", { type: "LABOR" }), line("manual", "manual"),
      line("material-3", "material", { description: "Kátránypapír" }),
      line("material-4", "material", { description: "kátránypapír" }),
    ]);

    expect(result).toEqual([]);
  });

  it("forms independent groups and ignores incomplete or ambiguous provenance", () => {
    const result = findPotentialQuotationItemOverlaps([
      line("m-a", "material", { description: "Léc" }), line("c-a", "calculation", { description: "léc" }),
      line("m-b", "material", { description: "Deszka" }), line("c-b", "calculation", { description: "deszka" }),
      line("empty", "material", { description: "  ", unit: "db" }),
      line("ambiguous", "material", { sourceMaterialItemId: "source", calculationSourceKey: "cut/rafters/1" }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map(({ description }) => description)).toEqual(["Léc", "Deszka"]);
  });

  it("leaves saved row values and totals untouched across separate revision snapshots", () => {
    const v1 = [
      line("m-1", "material", { unitPrice: "100", total: "3600" }),
      line("c-1", "calculation", { unitPrice: "200", total: "7200" }),
    ];
    const v1Before = structuredClone(v1);
    expect(findPotentialQuotationItemOverlaps(v1)).toHaveLength(1);
    expect(v1).toEqual(v1Before);

    const v2 = v1.map((row, index) => index === 0 ? { ...row, description: "Szarufa 5×10" } : row);
    expect(findPotentialQuotationItemOverlaps(v2)).toEqual([]);
    expect(findPotentialQuotationItemOverlaps(v1)).toHaveLength(1);
    expect(v1).toEqual(v1Before);
  });
});
