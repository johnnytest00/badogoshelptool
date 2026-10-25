import { describe, expect, it } from "vitest";
import { readSupabase, SupabaseReadError } from "./read-error";

describe("Supabase read error boundary", () => {
  it("preserves data on successful reads", async () => {
    await expect(readSupabase(Promise.resolve({ data: [{ id: "row" }], error: null }), "read failed"))
      .resolves.toEqual({ data: [{ id: "row" }], error: null });
  });

  it.each([
    [{ code: "42501", message: "permission denied" }, "access_denied"],
    [{ status: 403 }, "access_denied"],
    [{ code: "XX000", message: "temporary database failure" }, "unavailable"],
  ] as const)("classifies database error %j", async (error, failure) => {
    await expect(readSupabase(Promise.resolve({ data: null, error }), "section unavailable"))
      .rejects.toMatchObject({ name: "SupabaseReadError", failure, message: "section unavailable" });
  });

  it("classifies rejected transport reads as unavailable", async () => {
    await expect(readSupabase(Promise.reject(new TypeError("fetch failed")), "section unavailable"))
      .rejects.toMatchObject({ name: "SupabaseReadError", failure: "unavailable" });
  });

  it("turns only typed read failures into optional-section states", async () => {
    const { loadOptionalExecutionSection } = await import("@/features/execution/execution-workspace-read");
    const good = loadOptionalExecutionSection(async () => ["independent sibling"]);
    const denied = loadOptionalExecutionSection(async () => { throw new SupabaseReadError("denied", "access_denied"); });
    const offline = loadOptionalExecutionSection(async () => { throw new SupabaseReadError("offline", "unavailable"); });

    await expect(Promise.all([good, denied, offline])).resolves.toEqual([
      { status: "loaded", data: ["independent sibling"] },
      { status: "access_denied" },
      { status: "unavailable" },
    ]);
    await expect(loadOptionalExecutionSection(async () => { throw new Error("programming error"); }))
      .rejects.toThrow("programming error");
  });
});
