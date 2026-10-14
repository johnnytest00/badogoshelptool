import { beforeEach, describe, expect, it, vi } from "vitest";
import { listStandaloneCalculations } from "./standalone-data";
import { GABLE_TRAPEZOIDAL_COVERING_ID } from "@/features/roof-models/gable-trapezoidal-covering-persistence";
import { createClient } from "@/infrastructure/supabase/server";

vi.mock("@/features/auth/auth.server", () => ({ getAuthContext: vi.fn(async () => ({ userId: "creator", organizations: [{ id: "org" }] })) }));
vi.mock("@/infrastructure/supabase/server", () => ({ createClient: vi.fn() }));

function query(data: unknown[], calls: string[]) {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order", "limit"]) builder[method] = (...args: unknown[]) => { calls.push(`${method}:${args.join(":")}`); return builder; };
  builder.then = (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data, error: null }).then(resolve);
  return builder;
}

describe("mentett trapézlemez-fedések listája", () => {
  beforeEach(() => vi.clearAllMocks());
  it("a tényleges registry azonosítót és standalone szervezeti szűrést használja", async () => {
    const calls: string[] = [];
    vi.mocked(createClient).mockResolvedValue({ from: (table: string) => table === "calculations" ? query([{ id: "covering", calculator_type: GABLE_TRAPEZOIDAL_COVERING_ID, display_name: "DEMO fedés", current_revision_id: "rev", created_at: "2026-10-14", updated_at: "2026-10-14" }], calls) : query([{ id: "rev", revision_number: 2 }], calls) } as never);
    const rows = await listStandaloneCalculations("org", GABLE_TRAPEZOIDAL_COVERING_ID);
    expect(rows).toMatchObject([{ calculationId: "covering", calculatorType: GABLE_TRAPEZOIDAL_COVERING_ID, currentRevisionNumber: 2 }]);
    expect(calls).toContain("eq:organization_id:org");
    expect(calls).toContain("eq:ownership_scope:standalone");
    expect(calls).toContain(`eq:calculator_type:${GABLE_TRAPEZOIDAL_COVERING_ID}`);
    expect(calls).toContain("limit:100");
  });
});
