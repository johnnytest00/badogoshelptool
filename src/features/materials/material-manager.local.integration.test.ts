/* global process */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

const localDescribe = process.env.RUN_LOCAL_MATERIAL_MANAGER_TESTS === "1" ? describe : describe.skip;
const organizationId = "00000000-0000-4000-8000-000000000010";
const actorId = "00000000-0000-4000-8000-000000000001";
const fixtureId = randomUUID();
let databaseUrl = "";
let categoryId = "";
let productId = "";
let variantId = "";
let requestId = "";
let productName = "";

function localDatabaseUrl() {
  const output = execFileSync("supabase", ["status", "--output", "env"], {
    encoding: "utf8", env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: "1" },
  });
  const line = output.split("\n").find((entry) => entry.startsWith("DB_URL="));
  const value = line?.slice("DB_URL=".length).replace(/^['"]|['"]$/g, "");
  if (!value?.startsWith("postgresql://postgres:postgres@127.0.0.1:54322/")) {
    throw new Error("A concurrency test kizárólag a projekt helyi Supabase Postgres adatbázisát használhatja.");
  }
  return value;
}

async function actorTransaction<T>(applicationName: string, run: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: databaseUrl, application_name: applicationName });
  await client.connect();
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

localDescribe("F9.22 local Material Manager concurrency", () => {
  it("serializes identical product creation requests across two PostgreSQL connections", async () => {
    databaseUrl = localDatabaseUrl();
    requestId = randomUUID();
    productName = `DEMO F9.22 párhuzamos termék ${fixtureId}`;
    const fixtureClient = new Client({ connectionString: databaseUrl, application_name: "material-manager-concurrency-fixture" });
    await fixtureClient.connect();
    try {
      const category = await fixtureClient.query<{ id: string }>(
        "select id from public.material_categories where organization_id=$1::uuid and legacy_category='other' and is_default limit 1",
        [organizationId],
      );
      if (!category.rows[0]) throw new Error("A helyi DEMO műhely 'Egyéb anyag' kategóriája nem található.");
      categoryId = category.rows[0].id;
    } finally { await fixtureClient.end(); }

    const create = () => actorTransaction("material-manager-create-retry", async (client) => {
      const result = await client.query<{ product_id: string; variant_id: string; reused: boolean }>(
        "select * from public.create_material_manager_product($1::uuid,$2::uuid,$3::uuid,$4::text,$5::public.material_purchasing_unit,$6::numeric,$7::public.material_price_kind,$8::date)",
        [organizationId, requestId, categoryId, productName, "strand", "1234.50", "net", "2026-10-17"],
      );
      return result.rows[0];
    });
    const results = await Promise.all([create(), create()]);
    expect(results[0]?.product_id).toBeTruthy();
    expect(results[1]?.product_id).toBe(results[0]?.product_id);
    expect(results[1]?.variant_id).toBe(results[0]?.variant_id);
    expect(results.filter((result) => result.reused).length).toBe(1);
    productId = results[0]!.product_id;
    variantId = results[0]!.variant_id;
    const admin = new Client({ connectionString: databaseUrl, application_name: "material-manager-concurrency-assertion" });
    await admin.connect();
    try {
      const counts = await admin.query<{ products: string; variants: string; prices: string }>(
        "select (select count(*) from public.material_products where id=$1::uuid)::text as products, (select count(*) from public.material_variants where id=$2::uuid)::text as variants, (select count(*) from public.material_prices where variant_id=$2::uuid)::text as prices",
        [productId, variantId],
      );
      expect(counts.rows[0]).toEqual({ products: "1", variants: "1", prices: "1" });
    } finally { await admin.end(); }
  });

  it("serializes identical list writes and keeps a single immutable revision", async () => {
    if (!databaseUrl || !categoryId || !variantId || !requestId) throw new Error("A termékkonkurrencia előfeltétele nem teljesült.");
    const listRequestId = randomUUID();
    const itemId = randomUUID();
    const items = [{
      id: itemId, kind: "catalog", description: productName, materialCategory: "other", categoryId,
      quantity: "2.5", unit: "strand", variantId, priceId: null,
      manualPriceAmount: "", manualPriceKind: null, sourceRefs: [],
    }];
    const save = () => actorTransaction("material-list-revision-concurrency", async (client) => {
      const result = await client.query<{ list_id: string; revision_id: string; revision_number: number; version: number }>(
        "select * from public.save_workflow_material_list_revision($1::uuid,null,null,$2::text,$3::jsonb,0,$4::uuid)",
        [organizationId, `DEMO F9.22 párhuzamos anyaglista ${fixtureId}`, JSON.stringify(items), listRequestId],
      );
      return result.rows[0];
    });
    const results = await Promise.all([save(), save()]);
    expect(results[0]?.list_id).toBeTruthy();
    expect(results[1]?.list_id).toBe(results[0]?.list_id);
    expect(results[1]?.revision_id).toBe(results[0]?.revision_id);
    expect(results[0]?.version).toBe(1);
    expect(results[1]?.version).toBe(1);

    const admin = new Client({ connectionString: databaseUrl, application_name: "material-list-concurrency-assertion" });
    await admin.connect();
    try {
      const counts = await admin.query<{ revisions: string; items: string }>(
        "select (select count(*) from public.material_preparation_revisions where list_id=$1::uuid)::text as revisions, (select count(*) from jsonb_array_elements(items_snapshot))::text as items from public.material_preparation_revisions where id=$2::uuid",
        [results[0]!.list_id, results[0]!.revision_id],
      );
      expect(counts.rows[0]).toEqual({ revisions: "1", items: "1" });
    } finally { await admin.end(); }
  });
});
