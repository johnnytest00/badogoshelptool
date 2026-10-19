import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeCalculator } from "@/domain/calculations/engine";
import { sheetMetalProfileCalculator, sheetMetalProfileInputSchema } from "@/domain/calculations/sheet-metal-profile";
import { createTemplate, toDomainInput } from "./profile-editor-model";

const ids = { org: "00000000-0000-4000-8000-0000000000a1", calc: "00000000-0000-4000-8000-0000000000a2", rev: "00000000-0000-4000-8000-0000000000a3", variant: "00000000-0000-4000-8000-0000000000a4", key: "00000000-0000-4000-8000-0000000000a5", user: "00000000-0000-4000-8000-0000000000a6" };
const state = vi.hoisted(() => ({ tables: [] as string[], filters: [] as Array<[string, string, unknown]>, rpc: vi.fn(), revision: null as unknown }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => ({ userId: "00000000-0000-4000-8000-0000000000a6", organizations: [{ id: "00000000-0000-4000-8000-0000000000a1" }] }) }));
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: async () => ({
    rpc: state.rpc,
    from: (table: string) => {
      state.tables.push(table);
      const builder: Record<string, unknown> = {};
      for (const op of ["select", "eq", "is"]) builder[op] = (...args: unknown[]) => { state.filters.push([table, op, args]); return builder; };
      builder.maybeSingle = async () => ({ data: table === "calculations" ? { id: ids.calc, current_revision_id: ids.rev } : state.revision, error: null });
      return builder;
    },
  }),
}));

import { createProfileTakeoffDraftAction } from "./profile-actions";

function form(extra: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ organizationId: ids.org, calculationId: ids.calc, revisionId: ids.rev, variantId: ids.variant, requestKey: ids.key, name: "DEMO piszkozat", ...extra })) data.set(key, value);
  return data;
}

describe("independent profile takeoff draft", () => {
  beforeEach(() => {
    state.tables = []; state.filters = []; state.rpc.mockReset();
    const input = sheetMetalProfileInputSchema.parse({ ...toDomainInput(createTemplate("l")), profileId: ids.calc, formedRunLengthMm: 2000, pieceCount: 3,
      material: { catalogVariantId: ids.variant, materialSpec: "DEMO-A", provenance: { kind: "catalog_snapshot", label: "DEMO", catalogVariantId: ids.variant } },
      bends: toDomainInput(createTemplate("l")).bends.map((bend) => ({ ...bend, allowance: { mode: "explicit_ba", baMm: 3, source: { kind: "user_provided", label: "DEMO BA" } } })) });
    const calculated = executeCalculator(sheetMetalProfileCalculator, input);
    if (!calculated.ok) throw new Error("fixture must calculate");
    state.revision = { input_snapshot: input, output_snapshot: calculated.output, input_schema_version: sheetMetalProfileCalculator.inputSchemaVersion, calculator_implementation_version: sheetMetalProfileCalculator.implementationVersion };
  });

  it("transfers a caller-owned profile without any project lookup and passes a null project to the RPC", async () => {
    state.rpc.mockResolvedValue({ data: [{ takeoff_id: "t-1" }], error: null });
    expect(await createProfileTakeoffDraftAction(form())).toEqual({ ok: true, takeoffId: "t-1" });
    expect(state.tables).not.toContain("projects");
    expect(state.filters).toContainEqual(["calculations", "eq", ["ownership_scope", "standalone"]]);
    expect(state.filters).toContainEqual(["calculations", "eq", ["created_by", ids.user]]);
    expect(state.rpc).toHaveBeenCalledWith("create_profile_takeoff_draft", expect.objectContaining({ p_project_id: null, p_calculation_id: ids.calc, p_request_key: ids.key }));
  });

  it("rejects a malformed project id instead of silently treating it as independent", async () => {
    expect(await createProfileTakeoffDraftAction(form({ projectId: "not-a-uuid" }))).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
