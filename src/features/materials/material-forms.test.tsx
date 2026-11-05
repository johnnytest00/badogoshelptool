import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MaterialProductForm, MaterialManagerProductForm, VariantForm } from "./material-forms";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const product = {
  id: "product", organizationId: "org", categoryId: "category", category: "other" as const, categoryName: "Egyéb anyag", categoryActive: true,
  name: "DEMO termék", description: "Leírás", manufacturerId: null, manufacturerName: null, productCode: "DEMO-1", status: "active" as const,
  provenance: "verified" as const, sourceName: "Gyártói adatlap", sourceUrl: "https://example.test", sourceDate: "2026-01-01", sourceNotes: "Ellenőrzött", createdAt: "", updatedAt: "", variants: [],
};

describe("material forms", () => {
  it("shows only the simple product fields and does not render provenance controls", () => {
    const html = renderToStaticMarkup(<MaterialProductForm organizationId="org" manufacturers={[]} categories={[]} product={product} />);
    expect(html).toContain('name="name"');
    expect(html).toContain('name="manufacturerId"');
    expect(html).toContain('name="productCode"');
    expect(html).toContain('name="description"');
    expect(html).not.toContain("További termékadatok");
    expect(html).not.toContain("Forrás neve");
    expect(html).not.toContain("Adat eredete");
  });

  it("shows optional price fields immediately without an effective date", () => {
    const html = renderToStaticMarkup(<MaterialManagerProductForm organizationId="org" categories={[{ id: "category", organizationId: "org", name: "Egyéb anyag", legacyCategory: "other", isDefault: false, isActive: true, createdAt: "", updatedAt: "" }]} />);
    expect(html).toContain('name="priceAmount"');
    expect(html).toContain('name="priceSupplier"');
    expect(html).not.toContain("<details");
    expect(html).not.toContain("Érvényes dátum");
    expect(html).not.toContain("A méretet írd a névbe");
    expect(html).not.toContain("Az egység határozza meg");
  });

  it("does not render the advanced technical editor while retaining the variant basics", () => {
    const html = renderToStaticMarkup(<VariantForm organizationId="org" productId="product" variant={{
      id: "variant", productId: "product", name: "75×200×5000 mm", sku: "SKU", purchasingUnit: "piece", nominalWidthMm: 75,
      effectiveWidthMm: null, thicknessMm: null, lengthMm: 5000, packagingQuantity: null, technicalSpecs: { section_height_mm: "200" },
      provenance: "verified", sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null, prices: [], priceOptions: [], latestPrice: null,
    }} />);
    expect(html).toContain('name="name"');
    expect(html).toContain('name="sku"');
    expect(html).not.toContain("Műszaki adatok");
    expect(html).not.toContain("name=\"technicalSpecs\"");
    expect(html).not.toContain("name=\"section_height_mm\"");
  });
});
