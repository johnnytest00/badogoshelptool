import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getCalculatorMaterialProfiles, getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { catalogProfilesFromProducts } from "@/domain/calculations/roof-material-catalog";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

type QueryCall = { table: string; columns: string; filters: Array<[string, string, unknown]>; orders: Array<[string, unknown]>; limit: number | null; rows: number; bytes: number };
function configureCatalog(rows: Record<string, Record<string, unknown>[]>, failingTable?: string) {
  const calls: QueryCall[] = [];
  vi.mocked(createClient).mockResolvedValue({ from(table: string) {
    const call: QueryCall = { table, columns: "", filters: [], orders: [], limit: null, rows: 0, bytes: 0 };
    calls.push(call);
    let queryRows = rows[table] ?? [];
    const builder: Record<string, unknown> = {};
    builder.select = (columns: string) => { call.columns = columns; return builder; };
    builder.eq = (column: string, value: unknown) => { call.filters.push(["eq", column, value]); queryRows = queryRows.filter((row) => row[column] === value); return builder; };
    builder.in = (column: string, values: unknown[]) => { call.filters.push(["in", column, values]); queryRows = queryRows.filter((row) => values.includes(row[column])); return builder; };
    builder.order = (column: string, options: unknown) => { call.orders.push([column, options]); return builder; };
    builder.limit = (value: number) => { call.limit = value; return builder; };
    builder.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
      const data = failingTable === table ? null : queryRows.map((row) => Object.fromEntries(call.columns.split(", ").map((column) => [column, row[column]])));
      call.rows = data?.length ?? 0;
      call.bytes = Buffer.byteLength(JSON.stringify(data));
      return Promise.resolve({ data, error: failingTable === table ? { message: "private database detail" } : null }).then(resolve, reject);
    };
    return builder;
  } } as never);
  return calls;
}

const rows = {
  material_products: [
    { id: "product-a", organization_id: "org-a", manufacturer_id: "maker-a", category: "roof_covering", category_id: "category-a", name: "Panel", status: "active", data_provenance: "verified", source_name: "Manufacturer sheet", product_code: null, description: "large unused description", source_url: "https://example.invalid/product", source_date: "2026-01-01", source_notes: "historical product source", created_by: "actor-a", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" },
    { id: "product-b", organization_id: "org-b", manufacturer_id: "maker-b", category: "timber", category_id: "category-b", name: "Other organization", status: "active", data_provenance: "verified", source_name: null },
  ],
  material_manufacturers: [{ id: "maker-a", organization_id: "org-a", name: "Maker", website: "https://maker.example", notes: "manufacturer notes", created_by: "actor-a", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }],
  material_categories: [{ id: "category-a", organization_id: "org-a", name: "Fedés egyedi", is_active: true, legacy_category: "roof_covering", is_default: false, created_by: "actor-a", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }],
  material_variants: [{ id: "variant-a", organization_id: "org-a", product_id: "product-a", name: "Antracit", sku: "A-1", purchasing_unit: "piece", nominal_width_mm: 1100, effective_width_mm: 1050, length_mm: 4000, technical_specs: { usable_covering_length_mm: "3800" }, data_provenance: "user_provided", source_name: "Variant sheet", thickness_mm: 0.5, packaging_quantity: 1, source_url: "https://example.invalid/variant", source_date: "2026-01-01", source_notes: "variant source notes", created_by: "actor-a", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }],
  material_prices: [
    { id: "old-price", organization_id: "org-a", variant_id: "variant-a", option_id: "supplier-a", amount: 2800, currency: "HUF", purchasing_unit: "piece", price_kind: "net", price_source: null, effective_date: "2026-01-01", recorded_at: "2026-01-01T00:00:00Z", data_provenance: "verified", source_name: "Supplier A", source_url: null, source_date: null, source_notes: null, created_by: "actor-a", created_at: "2026-01-01T00:00:00Z" },
    { id: "new-price", organization_id: "org-a", variant_id: "variant-a", option_id: "supplier-a", amount: 3100, currency: "HUF", purchasing_unit: "piece", price_kind: "net", price_source: null, effective_date: "2026-02-01", recorded_at: "2026-02-01T00:00:00Z", data_provenance: "verified", source_name: "Supplier A", source_url: null, source_date: null, source_notes: null, created_by: "actor-a", created_at: "2026-02-01T00:00:00Z" },
  ],
  material_price_options: [{ id: "supplier-a", variant_id: "variant-a", label: "Supplier A", status: "active", organization_id: "org-a" }],
};

describe("calculator material profiles data", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the same profile contract using only organization-scoped profile columns", async () => {
    const baselineCalls = configureCatalog(rows);
    const baselineProducts = await getMaterialProductsForOrganization("org-a");
    const baselineProfiles = catalogProfilesFromProducts(baselineProducts);
    const optimizedCalls = configureCatalog(rows);

    const profiles = await getCalculatorMaterialProfiles("org-a");

    expect(profiles).toEqual(baselineProfiles);
    expect(profiles).toHaveLength(4);
    expect(profiles[0]).toMatchObject({
      id: "variant-a", group: "covering", label: "Maker · Panel · Antracit", verification: "user_provided",
      sourceReference: "Anyagkezelő: Maker · Panel · Antracit (forrás: Variant sheet)",
      catalog: { productId: "product-a", variantId: "variant-a", categoryName: "Fedés egyedi", categoryMatch: true },
      values: { nominalWidthMm: 1100, effectiveCoveringWidthMm: 1050, physicalLengthMm: 4000, usableCoveringLengthMm: 3800 },
    });
    expect(baselineCalls).toHaveLength(6);
    expect(optimizedCalls).toHaveLength(4);
    expect(optimizedCalls.map(({ table }) => table).sort()).toEqual(["material_categories", "material_manufacturers", "material_products", "material_variants"]);
    expect(optimizedCalls.every(({ filters }) => filters.some(([kind, column, value]) => kind === "eq" && column === "organization_id" && value === "org-a"))).toBe(true);
    expect(optimizedCalls.find(({ table }) => table === "material_products")?.columns).not.toContain("description");
    expect(optimizedCalls.find(({ table }) => table === "material_variants")?.columns).toContain("technical_specs");
    expect(optimizedCalls.some(({ table }) => table === "material_prices" || table === "material_price_options")).toBe(false);
    expect(optimizedCalls.find(({ table }) => table === "material_products")?.orders).toContainEqual(["updated_at", { ascending: false }]);
    expect(optimizedCalls.find(({ table }) => table === "material_products")?.limit).toBe(200);
    expect(optimizedCalls.reduce((total, { bytes }) => total + bytes, 0)).toBeLessThan(baselineCalls.reduce((total, { bytes }) => total + bytes, 0));
  });

  it("returns no profiles for an empty organization catalog without loading related tables", async () => {
    const baselineCalls = configureCatalog({ material_products: [] });
    await expect(getMaterialProductsForOrganization("org-empty")).resolves.toEqual([]);
    const calls = configureCatalog({ material_products: [] });
    await expect(getCalculatorMaterialProfiles("org-empty")).resolves.toEqual([]);
    expect(baselineCalls).toHaveLength(3);
    expect(calls.map(({ table }) => table)).toEqual(["material_products"]);
  });

  it("keeps the calculator catalog failure signal when a selected related read fails", async () => {
    configureCatalog(rows, "material_variants");
    await expect(getCalculatorMaterialProfiles("org-a")).rejects.toMatchObject({ message: "Az anyagkapcsolatok betöltése nem sikerült." });
  });
});
