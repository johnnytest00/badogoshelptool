import { beforeEach, describe, expect, it, vi } from "vitest";

const ids = { org: "00000000-0000-4000-8000-0000000000a1", takeoff: "00000000-0000-4000-8000-0000000000a2", key: "00000000-0000-4000-8000-0000000000a3", list: "00000000-0000-4000-8000-0000000000a4" };
const state = vi.hoisted(() => ({ role: "owner" as string | null, rpc: vi.fn(), filters: [] as Array<[string, unknown]> }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => ({ organizations: state.role ? [{ id: "00000000-0000-4000-8000-0000000000a1", role: state.role }] : [] }) }));
vi.mock("@/infrastructure/supabase/server", () => ({
  createClient: async () => ({
    rpc: state.rpc,
    from: () => {
      const builder: Record<string, unknown> = {};
      for (const op of ["select", "eq", "is"]) builder[op] = (...args: unknown[]) => { state.filters.push([op, args]); return builder; };
      builder.maybeSingle = async () => ({ data: { name: "DEMO kimutatás", version: 2 }, error: null });
      return builder;
    },
  }),
}));

import { approveStandaloneTakeoffAction, createMaterialListFromTakeoffAction } from "./takeoff-list-actions";

describe("takeoff → material list actions", () => {
  beforeEach(() => { state.role = "owner"; state.rpc.mockReset(); state.filters = []; });

  it("approves only for admin/owner and only project-less takeoffs, with the stored version", async () => {
    state.rpc.mockResolvedValue({ error: null });
    expect(await approveStandaloneTakeoffAction({ organizationId: ids.org, takeoffId: ids.takeoff })).toEqual({ ok: true });
    expect(state.filters).toContainEqual(["is", ["project_id", null]]);
    expect(state.rpc).toHaveBeenCalledWith("approve_material_takeoff", { p_organization_id: ids.org, p_takeoff_id: ids.takeoff, p_expected_version: 2 });
    state.role = "member"; state.rpc.mockClear();
    expect(await approveStandaloneTakeoffAction({ organizationId: ids.org, takeoffId: ids.takeoff })).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("creates the list through the idempotent RPC and returns its id", async () => {
    state.rpc.mockResolvedValue({ data: [{ list_id: ids.list }], error: null });
    expect(await createMaterialListFromTakeoffAction({ organizationId: ids.org, takeoffId: ids.takeoff, requestKey: ids.key })).toEqual({ ok: true, listId: ids.list });
    expect(state.rpc).toHaveBeenCalledWith("save_workflow_material_list_from_takeoff", expect.objectContaining({ p_takeoff_id: ids.takeoff, p_request_key: ids.key, p_name: "DEMO kimutatás · anyaglista" }));
  });

  it("reports a stale source and rejects a non-member or malformed input without calling the database", async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: "40001", message: "stale" } });
    expect(await createMaterialListFromTakeoffAction({ organizationId: ids.org, takeoffId: ids.takeoff, requestKey: ids.key })).toMatchObject({ ok: false, error: expect.stringContaining("új revíziót") });
    state.rpc.mockClear(); state.role = null;
    expect(await createMaterialListFromTakeoffAction({ organizationId: ids.org, takeoffId: ids.takeoff, requestKey: ids.key })).toMatchObject({ ok: false });
    expect(await createMaterialListFromTakeoffAction({ organizationId: "x", takeoffId: ids.takeoff, requestKey: ids.key })).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
