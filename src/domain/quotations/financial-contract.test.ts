import { describe, expect, it } from "vitest";
import { calculateQuotationFinancialContract, resolveTaxTreatment } from "./financial-contract";
import { validateStandaloneLines } from "./standalone";
import { quotationDraftSchema } from "./contracts";

describe("quotation financial contract", () => {
  it("keeps NET HUF, unresolved tax, and payable amount separate", () => {
    const result = calculateQuotationFinancialContract([
      { quantity: "2.5", unitPrice: "100.00", priceClass: "net" },
      { quantity: "1", unitPrice: "25.50", priceClass: "net" },
    ]);
    expect(result).toMatchObject({
      currency: "HUF", priceBasis: "net", netAmount: "275.50", taxAmount: null,
      grossAmount: null, totalPayable: null,
      taxTreatment: { status: "unresolved", treatmentId: null, parameters: null },
      rounding: { quantityScale: 6, moneyScale: 2, mode: "half_up", scope: "line" },
    });
  });

  it("preserves a GROSS input amount without inventing net or tax", () => {
    const result = calculateQuotationFinancialContract([{ quantity: "1", unitPrice: "127.00", priceClass: "gross" }]);
    expect(result).toMatchObject({ priceBasis: "gross", netAmount: null, taxAmount: null, grossAmount: "127.00", totalPayable: null });
  });

  it("retains PostgreSQL-compatible line half-up rounding", () => {
    const result = validateStandaloneLines([{ type: "OTHER", description: "DEMO", quantity: "0.5", unit: "db", unitPrice: "0.01", priceClass: "net" }]);
    expect(result.ok && result.totals.subtotal).toBe("0.01");
  });

  it("validates persisted JSONB lines whose optional fields are null", () => {
    const persistedLine = {
      type: "LABOR", description: "DEMO szerelési munkadíj", quantity: "2", unit: "óra",
      unitPrice: "12500", priceClass: "net", lineTotal: "25000.00", notes: null,
      variantId: null, priceId: null, takeoffItemId: null,
    };
    const validated = validateStandaloneLines([persistedLine]);
    expect(validated).toMatchObject({ ok: true, totals: { subtotal: "25000.00", currency: "HUF", priceClass: "net" } });
    const parsed = quotationDraftSchema.safeParse({ name: "DEMO", currency: "HUF", lines: [persistedLine] });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.lines[0].notes).toBeUndefined();
  });

  it("rejects mixed price bases and values that exceed NUMERIC(20,2)", () => {
    expect(() => calculateQuotationFinancialContract([
      { quantity: "1", unitPrice: "10.00", priceClass: "net" },
      { quantity: "1", unitPrice: "10.00", priceClass: "gross" },
    ])).toThrow("nem keverhető");
    const overflow = validateStandaloneLines([{ type: "OTHER", description: "DEMO", quantity: "999999999999.999999", unit: "db", unitPrice: "999999999999999999.99", priceClass: "net" }]);
    expect(overflow.ok).toBe(false);
  });

  it("does not turn a caller-provided tax label into a supported rule", () => {
    expect(resolveTaxTreatment("arbitrary-27-percent-label")).toEqual({ status: "unsupported", treatmentId: "arbitrary-27-percent-label", parameters: null });
    expect(resolveTaxTreatment(null)).toEqual({ status: "unresolved", treatmentId: null, parameters: null });
  });
});
