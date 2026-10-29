import { beforeEach, describe, expect, it, vi } from "vitest";

const organizationId = "123e4567-e89b-42d3-a456-426614174000";
const planId = "123e4567-e89b-42d3-a456-426614174001";
const revisionOne = "123e4567-e89b-42d3-a456-426614174002";
const revisionTwo = "123e4567-e89b-42d3-a456-426614174003";
const state = vi.hoisted(() => ({ auth: null as { userId: string; organizations: { id: string }[] } | null, rpc: vi.fn(), complete: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
vi.mock("@/features/calculations/construction-data", () => ({ isCompleteConstructionRevision: (...args: unknown[]) => state.complete(...args) }));

import { createExecutionPlanAction } from "./execution-actions";

function form(revisions: string[] = []) {
  const data = new FormData();
  data.set("organizationId", organizationId);
  data.set("title", "DEMO munkanapló");
  data.set("requestKey", "123e4567-e89b-42d3-a456-426614174004");
  revisions.forEach((revision) => data.append("calculationRevisionIds", revision));
  return data;
}

describe("createExecutionPlanAction calculation sources", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth = { userId: "user-1", organizations: [{ id: organizationId }] };
    state.complete.mockResolvedValue(true);
    state.rpc.mockResolvedValue({ data: [{ plan_id: planId }], error: null });
  });

  it("creates a work log without calculations", async () => {
    expect(await createExecutionPlanAction(form())).toMatchObject({ ok: true, planId });
    expect(state.rpc).toHaveBeenCalledTimes(1);
    expect(state.rpc).toHaveBeenCalledWith("create_execution_plan", expect.objectContaining({ p_source_quotation_id: null }));
  });

  it("links one or more unique immutable revisions after creating the work log", async () => {
    state.rpc.mockResolvedValueOnce({ data: [{ plan_id: planId }], error: null });
    const data = form([revisionOne, revisionOne, revisionTwo]);
    data.set("sourceQuotationId", "123e4567-e89b-42d3-a456-426614174005");
    data.set("sourceRevisionId", "123e4567-e89b-42d3-a456-426614174006");
    expect(await createExecutionPlanAction(data)).toMatchObject({ ok: true, planId });
    expect(state.complete).toHaveBeenCalledTimes(2);
    expect(state.rpc).toHaveBeenCalledTimes(3);
    expect(state.rpc).toHaveBeenNthCalledWith(1, "create_execution_plan", expect.objectContaining({
      p_source_quotation_id: "123e4567-e89b-42d3-a456-426614174005",
      p_source_revision_id: "123e4567-e89b-42d3-a456-426614174006",
    }));
    expect(state.rpc).toHaveBeenNthCalledWith(2, "link_execution_plan_document", expect.objectContaining({
      p_organization_id: organizationId, p_execution_plan_id: planId, p_document_kind: "calculation", p_document_id: revisionOne,
    }));
    expect(state.rpc).toHaveBeenNthCalledWith(3, "link_execution_plan_document", expect.objectContaining({
      p_organization_id: organizationId, p_execution_plan_id: planId, p_document_kind: "calculation", p_document_id: revisionTwo,
    }));
  });

  it("rejects invalid, inaccessible or incomplete revisions before creating anything", async () => {
    expect(await createExecutionPlanAction(form(["invalid"]))).toMatchObject({ ok: false });
    state.complete.mockResolvedValue(false);
    expect(await createExecutionPlanAction(form([revisionOne]))).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("reports a failed link while preserving the created work log for an idempotent retry", async () => {
    state.rpc.mockResolvedValueOnce({ data: [{ plan_id: planId }], error: null }).mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    expect(await createExecutionPlanAction(form([revisionOne]))).toMatchObject({ ok: false, planId, error: expect.stringContaining("elkészült") });
  });
});
