import { describe, expect, it } from "vitest";
import { buildStandaloneDraftPdfData } from "./standalone-quotation-pdf";
import { renderQuotationPdf } from "./quotation-pdf";

function fixture(overrides: Record<string, unknown> = {}) {
  const lines = [
    { type: "MATERIAL", description: "DEMO kézi lemez", quantity: "2", unit: "db", unitPrice: "1000.00", priceClass: "net", lineTotal: "2000.00", notes: "DEMO adat" },
    { type: "LABOR", description: "DEMO szerelés", quantity: "1.5", unit: "óra", unitPrice: "4000.00", priceClass: "net", lineTotal: "6000.00" },
    { type: "MATERIAL", description: "DEMO katalógus elem", quantity: "1", unit: "db", unitPrice: "2500.00", priceClass: "net", lineTotal: "2500.00", materialSnapshot: { productName: "DEMO termék", variantName: "DEMO változat", price: { amount: "2500.00", currency: "HUF", priceKind: "net" } } },
  ];
  const revision = {
    id: "revision-v1", revision_number: 1, currency: "HUF", price_class: "net", subtotal: "10500.00",
    input_snapshot: { name: "DEMO ajánlat V1", document: { issuer: { organizationName: "DEMO műhely", businessName: "DEMO Bt." }, recipient: { source: "manual", name: "DEMO címzett" }, notes: null, terms: null } },
    line_items_snapshot: lines,
    totals_snapshot: { complete: true, currency: "HUF", priceClass: "net", subtotal: "10500.00" },
    financial_contract: { schemaVersion: 1, sourceVersion: "F9.7.6.6.3.2b", currency: "HUF", priceBasis: "net", netAmount: "10500.00", taxTreatment: { status: "unresolved", treatmentId: null, parameters: null }, taxAmount: null, grossAmount: null, totalPayable: null, rounding: { quantityScale: 6, moneyScale: 2, mode: "half_up", scope: "line" } },
  };
  return {
    quotation: { id: "quote-id", name: "Current name", currency: "HUF" }, organizationName: "DEMO műhely",
    revision: { ...revision, ...overrides },
  } as Parameters<typeof buildStandaloneDraftPdfData>[0];
}

describe("standalone draft PDF snapshot", () => {
  it("uses saved manual, LABOR and catalog line amounts and historical revision identity", () => {
    const result = buildStandaloneDraftPdfData(fixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.quotation.name).toBe("DEMO ajánlat V1");
    expect(result.data.revision.id).toBe("revision-v1");
    expect(result.data.revision.lines.map((line) => line.lineTotal)).toEqual(["2000.00", "6000.00", "2500.00"]);
    expect(result.data.revision.lines[2]?.materialSnapshot).toEqual({ productName: "DEMO termék", variantName: "DEMO változat", price: { amount: "2500.00", currency: "HUF", priceKind: "net" } });
    expect(JSON.stringify(result.data)).not.toMatch(/VAT|ÁFA|bruttó|fizetendő/i);
  });

  it("keeps both source names and revision numbers available for the customer PDF", () => {
    const result = buildStandaloneDraftPdfData({ ...fixture(),
      materialSource: { listName: "DEMO anyaglista", revisionNumber: 2 },
      calculationSource: { calculationName: "DEMO kalkuláció", calculatorLabel: "Faanyag és vágáslista", revisionNumber: 3 },
    } as Parameters<typeof buildStandaloneDraftPdfData>[0]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.materialSource).toEqual({ listName: "DEMO anyaglista", revisionLabel: "V2" });
    expect(result.data.calculationSource).toEqual({ calculationName: "DEMO kalkuláció", calculatorLabel: "Faanyag és vágáslista", revisionLabel: "V3" });
  });

  it("rejects gross basis and inconsistent saved totals", () => {
    expect(buildStandaloneDraftPdfData(fixture({ price_class: "gross" })).ok).toBe(false);
    expect(buildStandaloneDraftPdfData(fixture({ subtotal: "10501.00" })).ok).toBe(false);
    expect(buildStandaloneDraftPdfData(fixture({ financial_contract: { ...fixture().revision.financial_contract as object, taxAmount: "0.00" } })).ok).toBe(false);
    expect(buildStandaloneDraftPdfData(fixture({ financial_contract: { ...fixture().revision.financial_contract as object, rounding: { quantityScale: 3 } } })).ok).toBe(false);
  });

  it("omits missing optional fields and renders a valid PDF from saved data", async () => {
    const result = buildStandaloneDraftPdfData(fixture());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const buffer = await renderQuotationPdf(result.data);
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(buffer.byteLength).toBeGreaterThan(1000);
  });

  it("keeps the existing project quotation document renderer available", async () => {
    const buffer = await renderQuotationPdf({
      organizationName: "DEMO műhely", quotation: { id: "project-quote", name: "DEMO projekt ajánlat", currency: "HUF" },
      revision: { id: "project-v1", number: 1, createdAt: "2026-10-14T10:00:00.000Z", lines: [], subtotal: "0.00", priceClass: "net", currency: "HUF", totals: { complete: true } },
      project: { name: "DEMO projekt", location: null, description: null }, client: null, documentSnapshot: null,
    });
    expect(buffer.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });

  it("produces a multipage PDF with a fixed draft notice layer", async () => {
    const lines = Array.from({ length: 70 }, (_, index) => ({ type: "LABOR", description: `DEMO munkadíj ${index + 1}`, quantity: "1", unit: "óra", unitPrice: "1.00", priceClass: "net", lineTotal: "1.00" }));
    const result = buildStandaloneDraftPdfData(fixture({
      subtotal: "70.00", line_items_snapshot: lines,
      totals_snapshot: { complete: true, currency: "HUF", priceClass: "net", subtotal: "70.00" },
      financial_contract: { schemaVersion: 1, sourceVersion: "F9.7.6.6.3.2b", currency: "HUF", priceBasis: "net", netAmount: "70.00", taxTreatment: { status: "unresolved", treatmentId: null, parameters: null }, taxAmount: null, grossAmount: null, totalPayable: null, rounding: { quantityScale: 6, moneyScale: 2, mode: "half_up", scope: "line" } },
    }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const buffer = await renderQuotationPdf(result.data);
    const pageObjects = buffer.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? [];
    expect(pageObjects.length).toBeGreaterThan(1);
  });
});
