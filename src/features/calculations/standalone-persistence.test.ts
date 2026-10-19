import { describe, expect, it } from "vitest";
import { prepareStandaloneRevision } from "./standalone-persistence";

const profile = { schemaVersion: "1.0.0", profileType: "l", label: "Kézi L", coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent", thicknessMm: 1, straights: [{ id: "s1", tangentLengthMm: 50, dimensionSource: { kind: "user_provided", label: "Kézi" } }, { id: "s2", tangentLengthMm: 40, dimensionSource: { kind: "user_provided", label: "Kézi" } }], bends: [{ id: "b1", signedTurnDeg: 90, insideRadiusMm: 2, allowance: { mode: "unknown" } }] };

describe("standalone calculation preparation", () => {
  it("rejects the discontinued gutter and flashing calculator types", () => {
    for (const type of ["gutters.material-estimate", "sheet_metal.flashings.material-estimate"]) {
      expect(prepareStandaloneRevision(type, {}, "00000000-0000-4000-8000-000000000001", "DEMO")).toMatchObject({ ok: false });
    }
  });

  it("preserves incomplete profile width as null and binds the profile identity", () => {
    const result = prepareStandaloneRevision("sheet_metal.profiles.flat-pattern", profile, "00000000-0000-4000-8000-000000000007", "Kézi L");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.input).toMatchObject({ profileId: "00000000-0000-4000-8000-000000000007" });
      expect((result.value.output as { flatPattern: { widthMm: number | null } }).flatPattern.widthMm).toBeNull();
    }
    expect(prepareStandaloneRevision("sheet_metal.profiles.flat-pattern", { ...profile, profileId: "00000000-0000-4000-8000-000000000008" }, "00000000-0000-4000-8000-000000000007", "Kézi L")).toMatchObject({ ok: false });
  });
});
