import { describe, expect, it } from "vitest";
import { appliedLaborKeys, buildLaborLine, isBillingQuantity, laborMarker, offerLaborRates, type LaborBase, type LaborRate } from "./labor-rate";

const area: LaborRate = { id: "r1", name: "DEMO tető", basis: "roof_area_m2", rateAmount: "1500.50", priceClass: "net" };
const length: LaborRate = { id: "r2", name: "DEMO eresz", basis: "run_length_m", rateAmount: "900.00", priceClass: "gross" };
const roof: LaborBase = { itemId: "i1", label: "Tetőfelület", quantity: "73.246", unit: "m²" };
const gutter: LaborBase = { itemId: "i2", label: "Ereszszakasz", quantity: "12.5", unit: "m" };

describe("labor rate offers", () => {
  it("pairs a rate only with a base of the identical unit", () => {
    const offers = offerLaborRates([area, length], [roof, gutter], null, []);
    expect(offers.map((o) => `${o.rate.id}:${o.base.itemId}`)).toEqual(["r1:i1", "r2:i2"]);
    expect(offers.every((o) => o.status === "available")).toBe(true);
  });
  it("refuses to mix net and gross", () => {
    const [offer] = offerLaborRates([length], [gutter], "net", []);
    expect(offer).toMatchObject({ status: "unavailable", reason: expect.stringContaining("keverhető") });
  });
  it("does not offer a rate twice for the same base", () => {
    const [offer] = offerLaborRates([area], [roof], "net", ["r1:i1"]);
    expect(offer.status).toBe("unavailable");
  });
});

describe("buildLaborLine", () => {
  it("uses the verified quantity and the stored rate with traceable notes", () => {
    const line = buildLaborLine(area, roof, { materialListId: "l1", materialRevisionId: "v1" });
    expect(line).toMatchObject({ type: "LABOR", quantity: "73.246", unit: "m²", unitPrice: "1500.50", priceClass: "net", priceProvenance: "user_entered" });
    expect(line.laborSource).toEqual({ rateId: "r1", materialListId: "l1", materialRevisionId: "v1", materialItemId: "i1" });
    expect(line.notes).toContain("73.246 m²");
  });

  it("keeps the source in provenance when the billing quantity is adjusted and marks the deviation", () => {
    const line = buildLaborLine(area, roof, { materialListId: "l1", materialRevisionId: "v1" }, "70");
    expect(line.quantity).toBe("70");
    expect(line.laborSource.materialItemId).toBe("i1");
    expect(line.notes).toContain("73.246 m²");
    expect(line.notes).toContain("módosítva: 70 m²");
    expect(buildLaborLine(area, roof, { materialListId: "l1", materialRevisionId: "v1" }, "73.2460").notes).not.toContain("módosítva");
    expect(isBillingQuantity("0")).toBe(false);
    expect(isBillingQuantity("1,5")).toBe(false);
    expect(isBillingQuantity("12.5")).toBe(true);
  });

  it("detects applied pairs from structured provenance and legacy note markers", () => {
    expect(appliedLaborKeys([{ laborSource: { rateId: "r1", materialItemId: "i1" } }, { notes: `x ${laborMarker("r2", "i2")}` }, { notes: "szabad" }])).toEqual(["r1:i1", "r2:i2"]);
  });
});

describe("quotation-level unit price override", () => {
  const rate = { id: "r", name: "DEMO", basis: "roof_area_m2" as const, rateAmount: "1500.00", priceClass: "net" as const };
  const base = { itemId: "i", label: "Tető", quantity: "10", unit: "m²" as const };
  const src = { materialListId: "l", materialRevisionId: "v" };
  it("keeps the stored rate by default and records an explicit override without touching the rate", () => {
    expect(buildLaborLine(rate, base, src).unitPrice).toBe("1500.00");
    const line = buildLaborLine(rate, base, src, "10", "1700");
    expect(line.unitPrice).toBe("1700");
    expect(line.notes).toContain("felülírva");
    expect(line.laborSource.rateId).toBe("r");
    expect(rate.rateAmount).toBe("1500.00");
  });
});
