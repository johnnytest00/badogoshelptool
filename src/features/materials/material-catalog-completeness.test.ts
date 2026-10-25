import { beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@/infrastructure/supabase/server";
import { getCalculatorMaterialProfiles, getMaterialProductForOrganization, getMaterialProductPage, getMaterialProductsForCategories, getMaterialProductsForOrganization, getMaterialProductsForVariantIds } from "./material-data";

vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

type Row = Record<string, unknown>;
type Call = { table: string; filters: Array<[string, string, unknown]>; range: [number, number] | null; limit: number | null; rows: number; bytes: number };
let rows: Record<string, Row[]>;
let calls: Call[];

function product(index: number, organizationId = "org", status = "active") {
  const id = `p${String(index).padStart(3, "0")}`;
  return { id, organization_id: organizationId, manufacturer_id: null, category: "roof_covering", category_id: "category", name: index === 0 ? "DEMO Régi panel" : `DEMO Panel ${index}`, description: null, product_code: `DEMO-${index}`, status, data_provenance: "user_provided", source_name: null, source_url: null, source_date: null, source_notes: null, created_by: null, created_at: "2026-01-01", updated_at: `2026-01-${String(index % 28 + 1).padStart(2, "0")}T00:00:00Z` };
}

function configure() {
  calls = [];
  vi.mocked(createClient).mockResolvedValue({ from(table: string) {
    const call: Call = { table, filters: [], range: null, limit: null, rows: 0, bytes: 0 };
    calls.push(call);
    const order: Array<{ column: string; ascending: boolean }> = [];
    let search = "";
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => { call.filters.push(["eq", column, value]); return query; },
      in: (column: string, values: unknown[]) => { call.filters.push(["in", column, values]); return query; },
      or: (expression: string) => { search = expression.match(/name\.ilike\.%(.*?)%/)?.[1] ?? ""; return query; },
      order: (column: string, options?: { ascending?: boolean }) => { order.push({ column, ascending: options?.ascending !== false }); return query; },
      limit: (value: number) => { call.limit = value; return query; },
      range: (from: number, to: number) => { call.range = [from, to]; return query; },
      maybeSingle: async () => { const result = execute(); return { data: result.data[0] ?? null, error: null }; },
      then: (resolve: (value: ReturnType<typeof execute>) => unknown) => Promise.resolve(resolve(execute())),
    };
    function execute() {
      let filtered = (rows[table] ?? []).filter((row) => call.filters.every(([kind, column, value]) => kind === "in" ? (value as unknown[]).includes(row[column]) : row[column] === value));
      if (search) filtered = filtered.filter((row) => String(row.name ?? "").toLowerCase().includes(search.toLowerCase()) || String(row.product_code ?? "").toLowerCase().includes(search.toLowerCase()));
      filtered.sort((left, right) => { for (const { column, ascending } of order) { const compare = String(left[column] ?? "").localeCompare(String(right[column] ?? "")); if (compare) return ascending ? compare : -compare; } return 0; });
      const count = filtered.length;
      const data = call.range ? filtered.slice(call.range[0], call.range[1] + 1) : call.limit === null ? filtered.slice(0, 1000) : filtered.slice(0, call.limit);
      call.rows = data.length; call.bytes = Buffer.byteLength(JSON.stringify(data));
      return { data, error: null, count };
    }
    return query;
  } } as never);
}

beforeEach(() => {
  rows = { material_products: [], material_manufacturers: [], material_categories: [{ id: "category", organization_id: "org", name: "Fedés", legacy_category: "roof_covering", is_default: true, is_active: true, created_at: "", updated_at: "" }], material_variants: [], material_prices: [], material_price_options: [] };
  configure();
});

describe("QA-02 catalog completeness", () => {
  it.each([0, 1, 199, 200, 201, 525])("finds the exact oldest product with %i products", async (count) => {
    rows.material_products = Array.from({ length: count }, (_, index) => product(index));
    const result = await getMaterialProductForOrganization("org", "p000");
    expect(result?.id ?? null).toBe(count ? "p000" : null);
    if (count > 200) expect(calls.find((call) => call.table === "material_products")?.filters).toContainEqual(["eq", "id", "p000"]);
  });

  it("keeps another organization's and a missing product indistinguishable", async () => {
    rows.material_products = [product(0, "other-org")];
    expect(await getMaterialProductForOrganization("org", "p000")).toBeNull();
    expect(await getMaterialProductForOrganization("org", "missing")).toBeNull();
  });

  it("pages with a unique tie-breaker and searches before paging at 525 products", async () => {
    rows.material_products = Array.from({ length: 525 }, (_, index) => product(index));
    const first = await getMaterialProductPage("org", { page: 1, search: "" });
    const later = await getMaterialProductPage("org", { page: 11, search: "" });
    const searched = await getMaterialProductPage("org", { page: 1, search: "Régi panel" });
    const searchedLater = await getMaterialProductPage("org", { page: 11, search: "DEMO Panel" });
    expect(first.products).toHaveLength(50);
    expect(first.total).toBe(525);
    expect(first.hasNext).toBe(true);
    expect(first.products.slice(0, 2).map((item) => item.id)).toEqual(["p503", "p475"]);
    expect(later.products).toHaveLength(25);
    expect(later.hasNext).toBe(false);
    expect(new Set([...first.products, ...later.products].map((item) => item.id)).size).toBe(75);
    expect(searched.products.map((item) => item.id)).toEqual(["p000"]);
    expect(searchedLater.products).toHaveLength(24);
    expect(searchedLater.hasNext).toBe(false);
    expect(calls.filter((call) => call.table === "material_products").map((call) => call.range)).toEqual([[0, 49], [500, 549], [0, 49], [500, 549]]);
  });

  it("keeps archived products visible only when requested, including direct detail", async () => {
    rows.material_products = [product(0, "org", "archived")];
    expect((await getMaterialProductPage("org", { page: 1 })).products).toEqual([]);
    expect((await getMaterialProductPage("org", { page: 1, includeArchived: true })).products.map((item) => item.id)).toEqual(["p000"]);
    expect((await getMaterialProductForOrganization("org", "p000"))?.status).toBe("archived");
  });

  it("includes the 201st active roof product in calculator profiles and category options without loading prices for profiles", async () => {
    rows.material_products = Array.from({ length: 201 }, (_, index) => product(index));
    rows.material_variants = [{ id: "v-old", organization_id: "org", product_id: "p000", name: "Alap", sku: null, purchasing_unit: "piece", nominal_width_mm: 1000, effective_width_mm: 900, length_mm: 2000, technical_specs: {}, data_provenance: "user_provided", source_name: null }];
    const profiles = await getCalculatorMaterialProfiles("org");
    expect(profiles.some((profile) => profile.catalog?.productId === "p000")).toBe(true);
    expect(calls.some((call) => call.table === "material_prices")).toBe(false);
    configure();
    const options = await getMaterialProductsForCategories("org", ["roof_covering"]);
    expect(options).toHaveLength(201);
    expect(options.find((item) => item.id === "p000")?.variants.map((item) => item.id)).toEqual(["v-old"]);
  });

  it("keeps every historical price when a directly opened variant has over 1000 price rows", async () => {
    rows.material_products = [product(0)];
    rows.material_variants = [{ id: "v-old", organization_id: "org", product_id: "p000", name: "Alap", sku: null, purchasing_unit: "piece", nominal_width_mm: null, effective_width_mm: null, length_mm: null, technical_specs: {}, data_provenance: "user_provided", source_name: null }];
    rows.material_prices = Array.from({ length: 1101 }, (_, index) => ({ id: `price-${String(index).padStart(4, "0")}`, organization_id: "org", variant_id: "v-old", option_id: null, amount: index + 1, currency: "HUF", purchasing_unit: "piece", price_kind: "net", price_source: null, effective_date: "2026-01-01", recorded_at: "2026-01-01", data_provenance: "user_provided", source_name: null, source_url: null, source_date: null, source_notes: null, created_by: null, created_at: "2026-01-01" }));
    const detail = await getMaterialProductForOrganization("org", "p000");
    expect(detail?.variants[0].prices).toHaveLength(1101);
    expect(calls.filter((call) => call.table === "material_prices").map((call) => call.range)).toEqual([[0, 199], [200, 399], [400, 599], [600, 799], [800, 999], [1000, 1199]]);
  });

  it("does not truncate legacy server consumers and hydrates only authorized saved variants", async () => {
    rows.material_products = [...Array.from({ length: 525 }, (_, index) => product(index)), product(526, "other-org")];
    rows.material_variants = [
      { id: "v-old", organization_id: "org", product_id: "p000", name: "Alap", purchasing_unit: "piece", data_provenance: "user_provided" },
      { id: "v-other", organization_id: "other-org", product_id: "p526", name: "Alap", purchasing_unit: "piece", data_provenance: "user_provided" },
    ];
    expect(await getMaterialProductsForOrganization("org")).toHaveLength(525);
    expect((await getMaterialProductsForVariantIds("org", ["v-old", "v-other"])).map((item) => item.id)).toEqual(["p000"]);
    expect(calls.filter((call) => call.table === "material_products").slice(0, 3).map((call) => call.range)).toEqual([[0, 199], [200, 399], [400, 599]]);
  });
});
