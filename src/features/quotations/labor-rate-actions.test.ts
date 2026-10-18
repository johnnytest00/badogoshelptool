import { beforeEach, describe, expect, it, vi } from "vitest";

const org = "123e4567-e89b-42d3-a456-426614174000";
const key = "123e4567-e89b-42d3-a456-426614174003";
const state = vi.hoisted(() => ({ role: "owner", rpc: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: async () => ({ userId: "u", organizations: [{ id: "123e4567-e89b-42d3-a456-426614174000", role: state.role }] }) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: async () => ({ rpc: state.rpc }) }));
import { archiveLaborRateAction, createLaborRateAction } from "./labor-rate-actions";

const valid = { organizationId: org, requestKey: key, name: "DEMO", basis: "roof_area_m2" as const, priceClass: "net" as const, rateAmount: "1500,5" };
describe("labor rate actions", () => {
  beforeEach(() => { vi.clearAllMocks(); state.role = "owner"; state.rpc.mockResolvedValue({ data: [{ rate_id: "r" }], error: null }); });
  it("normalises the decimal comma and passes the idempotency key", async () => {
    expect(await createLaborRateAction(valid)).toEqual({ ok: true });
    expect(state.rpc).toHaveBeenCalledWith("create_organization_labor_rate", expect.objectContaining({ p_rate_amount: "1500.5", p_request_key: key, p_price_class: "net" }));
  });
  it("rejects invalid amounts and non-admin members before the database", async () => {
    expect(await createLaborRateAction({ ...valid, rateAmount: "1.005" })).toMatchObject({ ok: false });
    state.role = "member";
    expect(await createLaborRateAction(valid)).toMatchObject({ ok: false });
    expect(await archiveLaborRateAction({ organizationId: org, rateId: key })).toMatchObject({ ok: false });
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
