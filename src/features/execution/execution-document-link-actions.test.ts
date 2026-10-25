import { beforeEach, describe, expect, it, vi } from "vitest";

const org = "123e4567-e89b-42d3-a456-426614174000";
const plan = "123e4567-e89b-42d3-a456-426614174001";
const document = "123e4567-e89b-42d3-a456-426614174002";
const key = "123e4567-e89b-42d3-a456-426614174003";
const state = vi.hoisted(() => ({ auth: null as { userId: string; organizations: { id: string }[] } | null, rpc: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => state.auth }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));

import { createExecutionPlanAndLinkDocumentAction, linkExecutionPlanDocumentAction, unlinkExecutionPlanDocumentAction } from "./execution-document-link-actions";

describe("work log document link actions", () => {
  beforeEach(() => { vi.clearAllMocks(); state.auth = { userId: "user-1", organizations: [{ id: org }] }; });

  it("rejects callers outside the organization before touching the database", async () => {
    state.auth = { userId: "user-1", organizations: [{ id: "00000000-0000-4000-8000-000000000999" }] };
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: plan, kind: "quotation", documentId: document, requestKey: key })).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("rejects malformed identifiers", async () => {
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: "nope", kind: "quotation", documentId: document, requestKey: key })).toMatchObject({ ok: false });
    expect(await unlinkExecutionPlanDocumentAction({ organizationId: org, linkId: "nope", planId: plan, kind: "material_list", documentId: document })).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });

  it("links with the caller-supplied idempotency key and never sends an organization other than the checked one", async () => {
    state.rpc.mockResolvedValue({ data: [{ link_id: "l1", created: false }], error: null });
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: plan, kind: "material_list", documentId: document, requestKey: key })).toEqual({ ok: true, planId: plan, created: false });
    expect(state.rpc).toHaveBeenCalledWith("link_execution_plan_document", { p_organization_id: org, p_execution_plan_id: plan, p_document_kind: "material_list", p_document_id: document, p_request_key: key });
  });

  it("links a calculation by its exact saved revision and explains a foreign calculation", async () => {
    state.rpc.mockResolvedValueOnce({ data: [{ link_id: "l2", created: true }], error: null });
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: plan, kind: "calculation", documentId: document, requestKey: key })).toEqual({ ok: true, planId: plan, created: true });
    expect(state.rpc).toHaveBeenCalledWith("link_execution_plan_document", { p_organization_id: org, p_execution_plan_id: plan, p_document_kind: "calculation", p_document_id: document, p_request_key: key });
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501", message: "calculation access denied" } });
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: plan, kind: "calculation", documentId: document, requestKey: key })).toMatchObject({ ok: false, error: expect.stringContaining("saját, mentett kalkulációd") });
  });

  it("maps database access and duplicate errors to Hungarian user messages", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: plan, kind: "quotation", documentId: document, requestKey: key })).toMatchObject({ ok: false, error: expect.stringContaining("hozzáférés") });
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "23505" } });
    expect(await linkExecutionPlanDocumentAction({ organizationId: org, planId: plan, kind: "material_list", documentId: document, requestKey: key })).toMatchObject({ ok: false, error: expect.stringContaining("már ehhez") });
  });

  it("unlinks through the audit RPC and does not delete anything itself", async () => {
    state.rpc.mockResolvedValue({ data: [{ link_id: key, removed: true }], error: null });
    expect(await unlinkExecutionPlanDocumentAction({ organizationId: org, linkId: key, planId: plan, kind: "quotation", documentId: document })).toEqual({ ok: true, planId: plan });
    expect(state.rpc).toHaveBeenCalledTimes(1);
    expect(state.rpc).toHaveBeenCalledWith("unlink_execution_plan_document", { p_organization_id: org, p_link_id: key });
  });

  it("creates a project-less work log and then links, reporting a partial failure honestly", async () => {
    state.rpc.mockResolvedValueOnce({ data: [{ plan_id: plan }], error: null }).mockResolvedValueOnce({ data: null, error: { code: "40001" } });
    const result = await createExecutionPlanAndLinkDocumentAction({ organizationId: org, title: "DEMO", kind: "quotation", documentId: document, planRequestKey: key, linkRequestKey: plan });
    expect(state.rpc).toHaveBeenNthCalledWith(1, "create_execution_plan", expect.objectContaining({ p_project_id: null, p_request_key: key }));
    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("A munkanapló elkészült") });
  });
});
