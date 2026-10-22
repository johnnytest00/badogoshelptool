import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getGableCoveringTakeoffOptions } from "@/features/material-takeoffs/takeoff-data";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

type QueryCall = { table: string; columns: string; filters: Array<[string, string, unknown]>; orders: Array<[string, unknown]>; limit: number | null; rows: number; bytes: number };
function configureCatalog(rows: Record<string, Record<string, unknown>[]>) {
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
      const data = queryRows.map((row) => Object.fromEntries(call.columns.split(", ").map((column) => [column, row[column]])));
      call.rows = data.length;
      call.bytes = Buffer.byteLength(JSON.stringify(data));
      return Promise.resolve({ data, error: null }).then(resolve, reject);
    };
    return builder;
  } } as never);
  return calls;
}

const products = [
  { id: "roof", organization_id: "org-a", manufacturer_id: "maker", category: "roof_covering", category_id: "roof-category", name: "Roof panel", product_code: "R-1", status: "active", data_provenance: "verified", source_name: "Roof source", description: "unused" },
  { id: "sheet", organization_id: "org-a", manufacturer_id: "maker", category: "sheet_metal", category_id: "sheet-category", name: "Sheet metal", product_code: "S-1", status: "active", data_provenance: "verified", source_name: null, description: "unused" },
  { id: "foreign-roof", organization_id: "org-b", manufacturer_id: "foreign-maker", category: "roof_covering", category_id: "roof-category", name: "Other organization", product_code: "X-1", status: "active", data_provenance: "verified", source_name: null, description: "must remain scoped out" },
  { id: "other", organization_id: "org-a", manufacturer_id: "maker", category: "gutter", category_id: "gutter-category", name: "Gutter", product_code: "G-1", status: "active", data_provenance: "verified", source_name: null, description: "unused" },
];
const variants = [
  { id: "roof-v", organization_id: "org-a", product_id: "roof", name: "Black", sku: "R-B", purchasing_unit: "piece", nominal_width_mm: 1100, effective_width_mm: 1000, length_mm: 4000, technical_specs: { profile: "R" }, data_provenance: "verified", source_name: "Variant source", thickness_mm: 0.5, packaging_quantity: 1 },
  { id: "sheet-v", organization_id: "org-a", product_id: "sheet", name: "Folded", sku: "S-F", purchasing_unit: "piece", nominal_width_mm: 500, effective_width_mm: 450, length_mm: 2000, technical_specs: {}, data_provenance: "user_provided", source_name: null, thickness_mm: 0.7, packaging_quantity: 1 },
  { id: "foreign-v", organization_id: "org-b", product_id: "foreign-roof", name: "Foreign", sku: "X-1", purchasing_unit: "piece", nominal_width_mm: 1000, effective_width_mm: 900, length_mm: 3000, technical_specs: {}, data_provenance: "verified", source_name: null, thickness_mm: 0.5, packaging_quantity: 1 },
  { id: "gutter-v", organization_id: "org-a", product_id: "other", name: "Round", sku: "G-R", purchasing_unit: "piece", nominal_width_mm: null, effective_width_mm: null, length_mm: null, technical_specs: {}, data_provenance: "verified", source_name: null, thickness_mm: null, packaging_quantity: null },
];
const rows = {
  material_products: products,
  material_manufacturers: [{ id: "maker", organization_id: "org-a", name: "Maker", website: null, notes: null, created_by: "actor", created_at: "", updated_at: "" }],
  material_categories: [
    { id: "roof-category", organization_id: "org-a", name: "Fedés", legacy_category: "roof_covering", is_default: false, is_active: true, created_by: "actor", created_at: "", updated_at: "" },
    { id: "sheet-category", organization_id: "org-a", name: "Lemez", legacy_category: "sheet_metal", is_default: false, is_active: true, created_by: "actor", created_at: "", updated_at: "" },
  ],
  material_variants: variants,
  material_prices: [
    { id: "price-old", organization_id: "org-a", variant_id: "roof-v", option_id: "supplier", amount: 2900, currency: "HUF", purchasing_unit: "piece", price_kind: "net", price_source: null, effective_date: "2026-01-01", recorded_at: "2026-01-01T00:00:00Z", data_provenance: "verified", source_name: "Supplier", source_url: null, source_date: null, source_notes: null, created_by: "actor", created_at: "" },
    { id: "price-current", organization_id: "org-a", variant_id: "roof-v", option_id: "supplier", amount: 3200, currency: "HUF", purchasing_unit: "piece", price_kind: "net", price_source: null, effective_date: "2026-02-01", recorded_at: "2026-02-01T00:00:00Z", data_provenance: "verified", source_name: "Supplier", source_url: null, source_date: null, source_notes: null, created_by: "actor", created_at: "" },
  ],
  material_price_options: [{ id: "supplier", variant_id: "roof-v", label: "Supplier", status: "active", organization_id: "org-a" }],
};

describe("gable covering takeoff options", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads both categories once and preserves order, variant data and effective price selection", async () => {
    const baselineCalls = configureCatalog(rows);
    await Promise.all([
      getMaterialProductsForOrganization("org-a", { category: "roof_covering" }),
      getMaterialProductsForOrganization("org-a", { category: "sheet_metal" }),
    ]);
    const calls = configureCatalog(rows);

    const options = await getGableCoveringTakeoffOptions("org-a");

    expect(options.map(({ id, productId, productName, productCategory, variantName, effectiveWidthMm, latestPrice }) => ({ id, productId, productName, productCategory, variantName, effectiveWidthMm, latestPrice: latestPrice && { amount: latestPrice.amount, effectiveDate: latestPrice.effectiveDate } }))).toEqual([
      { id: "roof-v", productId: "roof", productName: "Roof panel", productCategory: "roof_covering", variantName: "Black", effectiveWidthMm: 1000, latestPrice: { amount: 3200, effectiveDate: "2026-02-01" } },
      { id: "sheet-v", productId: "sheet", productName: "Sheet metal", productCategory: "sheet_metal", variantName: "Folded", effectiveWidthMm: 450, latestPrice: null },
    ]);
    expect(baselineCalls).toHaveLength(12);
    expect(calls).toHaveLength(7);
    expect(calls.reduce((total, { bytes }) => total + bytes, 0)).toBeLessThan(baselineCalls.reduce((total, { bytes }) => total + bytes, 0));
    expect(calls.reduce((total, { rows }) => total + rows, 0)).toBeLessThan(baselineCalls.reduce((total, { rows }) => total + rows, 0));
    expect(calls.filter(({ table }) => table === "material_products")).toHaveLength(2);
    expect(calls.filter(({ table }) => table === "material_manufacturers")).toHaveLength(1);
    expect(calls.filter(({ table }) => table === "material_categories")).toHaveLength(1);
    expect(calls.filter(({ table }) => table === "material_variants")).toHaveLength(1);
    expect(calls.filter(({ table }) => table === "material_prices")).toHaveLength(1);
    expect(calls.filter(({ table }) => table === "material_price_options")).toHaveLength(1);
    expect(calls.filter(({ table }) => table === "material_products").map(({ filters }) => filters.find(([, column]) => column === "category")?.[2])).toEqual(["roof_covering", "sheet_metal"]);
    expect(calls.every(({ filters }) => filters.some(([kind, column, value]) => kind === "eq" && column === "organization_id" && value === "org-a"))).toBe(true);
    expect(calls.filter(({ table }) => table === "material_products").every(({ orders, limit }) => orders.some(([column, options]) => column === "updated_at" && JSON.stringify(options) === JSON.stringify({ ascending: false })) && limit === 200)).toBe(true);
  });

  it("returns no options when both requested categories are empty", async () => {
    const emptyCatalog = { material_products: [] };
    const baselineCalls = configureCatalog(emptyCatalog);
    await Promise.all([
      getMaterialProductsForOrganization("org-empty", { category: "roof_covering" }),
      getMaterialProductsForOrganization("org-empty", { category: "sheet_metal" }),
    ]);
    const calls = configureCatalog(emptyCatalog);
    await expect(getGableCoveringTakeoffOptions("org-empty")).resolves.toEqual([]);
    expect(baselineCalls).toHaveLength(6);
    expect(calls).toHaveLength(2);
  });
});
