import { describe, expect, it } from "vitest";
import { constructionCalculatorCatalog } from "@/domain/calculations/construction/catalog";
import { initialConstructionCalculatorId, loadConstructionCalculatorDefinition } from "./construction-calculator-loading";

describe("construction calculator loading", () => {
  it("resolves the requested verified calculator and falls back to the suite default", () => {
    expect(initialConstructionCalculatorId("concrete.pile")).toBe("concrete.pile");
    expect(initialConstructionCalculatorId("unknown.calculator")).toBe("roof.rafter-cut");
    expect(initialConstructionCalculatorId("roof.rafter-cut")).toBe("roof.rafter-cut");
  });

  it("loads every verified calculator from its matching category module", async () => {
    const verified = constructionCalculatorCatalog.filter((item) => item.status === "verified");
    const definitions = await Promise.all(verified.map((item) => loadConstructionCalculatorDefinition(item.id)));

    expect(definitions.map((definition) => definition?.reference.id).sort()).toEqual(verified.map((item) => item.id).sort());
    definitions.forEach((definition, index) => {
      expect(definition?.reference.category).toBe(verified[index].category);
    });
  });

  it("preserves representative calculations", async () => {
    const rafter = await loadConstructionCalculatorDefinition("roof.rafter-cut");
    const pile = await loadConstructionCalculatorDefinition("concrete.pile");
    expect(rafter?.calculate({ horizontalHalfSpanMm: 4000, riseMm: 3000, eaveProjectionMm: 0, seatCutHeightMm: 0 })[0]).toMatchObject({ label: "Gerendahossz az ereszig", value: 5000, unit: "mm" });
    expect(pile?.calculate({ count: 2, diameterMm: 1000, lengthMm: 1000 })[0]).toMatchObject({ label: "Cölöpök száma", value: 2, unit: "db" });
  });
});
