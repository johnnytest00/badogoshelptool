import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  failWorkspace: false,
  requestedPlanId: null as string | null,
  planProjectId: "33333333-3333-4333-8333-333333333333",
  report: null as { plan: { timeline: Array<{ id: string }> } } | null,
}));

vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => ({ organizations: [{ id: "11111111-1111-4111-8111-111111111111" }] }) }));
vi.mock("@/features/projects/project-data", () => ({ getProjectForOrganization: async () => ({ name: "DEMO projekt", clientName: null, location: null }) }));
vi.mock("@/features/execution/execution-data", () => ({ getExecutionPlanningWorkspace: async (_org: string, _project: string, planId?: string) => {
  state.requestedPlanId = planId ?? null;
  if (state.failWorkspace) throw new Error("A munkanaplók részletei nem tölthetők be.");
  return { plans: [{ id: "22222222-2222-4222-8222-222222222222", projectId: state.planProjectId, title: "DEMO napló", description: null, tasks: [], photos: [], sourceQuotationName: null, sourceQuotationStatus: null, sourceRevisionId: null, sourceRevisionNumber: null, sourceSubtotal: null }], timelineByPlan: new Map([["22222222-2222-4222-8222-222222222222", Array.from({ length: 101 }, (_, index) => ({ id: `j${index}`, type: "journal", date: "2026-10-02", recordedAt: "2026-10-02T10:00:00Z" }))]]) };
} }));
vi.mock("@/features/execution/execution-report-pdf", () => ({ renderExecutionReportPdf: async (report: typeof state.report) => { state.report = report; return Buffer.from("%PDF-1.4\nDEMO"); }, safeExecutionReportFilename: () => "report.pdf" }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { name: "DEMO műhely" }, error: null }) }) }) }) }) }));

import { GET } from "./route";

const organizationId = "11111111-1111-4111-8111-111111111111";
const planId = "22222222-2222-4222-8222-222222222222";
const projectId = "33333333-3333-4333-8333-333333333333";
const request = () => new Request(`https://local.test/api/projektek/${projectId}/kivitelezesi-dokumentacio?organization=${organizationId}&plan=${planId}&sections=journal,events`);

beforeEach(() => { state.failWorkspace = false; state.requestedPlanId = null; state.planProjectId = projectId; state.report = null; });

describe("execution report route completeness", () => {
  it("passes the selected plan's complete timeline to the PDF renderer", async () => {
    const response = await GET(request(), { params: Promise.resolve({ projectId }) });
    expect(response.status).toBe(200);
    expect(state.requestedPlanId).toBe(planId);
    expect(state.report?.plan.timeline.map((item) => item.id)).toEqual(Array.from({ length: 101 }, (_, index) => `j${index}`));
  });

  it("returns a clear error and never renders when a required page fails", async () => {
    state.failWorkspace = true;
    const response = await GET(request(), { params: Promise.resolve({ projectId }) });
    expect(response.status).toBe(502);
    expect(await response.text()).toContain("teljes");
    expect(state.report).toBeNull();
  });

  it("does not render a plan from another project", async () => {
    state.planProjectId = "44444444-4444-4444-8444-444444444444";
    const response = await GET(request(), { params: Promise.resolve({ projectId }) });
    expect(response.status).toBe(404);
    expect(state.report).toBeNull();
  });
});
