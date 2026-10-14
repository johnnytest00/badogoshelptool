import { describe, expect, it } from "vitest";
import { validateStandaloneLines } from "./standalone";

const item = (type: "LABOR" | "OTHER", description: string, unitPrice: string) => ({
  type, description, quantity: "2", unit: "óra", unitPrice, priceClass: "net" as const,
});

describe("standalone quotation draft lines", () => {
  it("accepts manual service and other rows without catalog references", () => {
    const result = validateStandaloneLines([item("LABOR", "Kézi munkadíj", "5.25"), item("OTHER", "Kézi kiszállás", "2.00")]);
    expect(result).toMatchObject({ ok: true, totals: { subtotal: "14.50", currency: "HUF", priceClass: "net" } });
  });

  it("allows a genuinely incomplete draft with no lines", () => {
    expect(validateStandaloneLines([])).toMatchObject({ ok: true, totals: { subtotal: "0.00", priceClass: null } });
  });

  it("rejects missing item fields, unsupported decimals and mixed net/gross rows", () => {
    expect(validateStandaloneLines([{ ...item("LABOR", "", "1.00") }]).ok).toBe(false);
    expect(validateStandaloneLines([item("LABOR", "Túl pontos ár", "1.001")]).ok).toBe(false);
    expect(validateStandaloneLines([item("LABOR", "Nettó", "1.00"), { ...item("OTHER", "Bruttó", "1.00"), priceClass: "gross" }]).ok).toBe(false);
  });

  it("rejects non-positive quantities and amounts over the supported maximum", () => {
    expect(validateStandaloneLines([{ ...item("LABOR", "Nulla mennyiség", "1.00"), quantity: "0" }]).ok).toBe(false);
    expect(validateStandaloneLines([item("LABOR", "Túl nagy", "1000000000000000000.00")]).ok).toBe(false);
  });
});
