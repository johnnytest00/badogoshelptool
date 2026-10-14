import { describe, expect, it } from "vitest";
import { prepareStandaloneRevision } from "./standalone-persistence";

const gutter = { gutterStockLengthMm: 3000, runs: [{ id: "r1", name: "DEMO eresz", lengthMm: 6500, measurementSource: "demo", roofEdge: null, bracketSpacingMm: null }], downpipes: [], manualComponents: [] };
const flashing = { sectionSpec: { nominalLengthMm: 3000, nominalLengthSource: { kind: "user_provided", label: "Kézi" }, connection: { mode: "unknown" } }, runs: [{ id: "s1", category: "custom", name: "Kézi szegély", lengthMm: 1500, lengthSource: "user_provided", roofEdgeReference: null, startExtensionMm: 0, endExtensionMm: 0, reserveMm: 0, installationNotes: [] }], manualComponents: [] };
const profile = { schemaVersion: "1.0.0", profileType: "l", label: "Kézi L", coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent", thicknessMm: 1, straights: [{ id: "s1", tangentLengthMm: 50, dimensionSource: { kind: "user_provided", label: "Kézi" } }, { id: "s2", tangentLengthMm: 40, dimensionSource: { kind: "user_provided", label: "Kézi" } }], bends: [{ id: "b1", signedTurnDeg: 90, insideRadiusMm: 2, allowance: { mode: "unknown" } }] };

describe("standalone calculation preparation", () => {
  it("recalculates and preserves accepted gutter input values", () => {
    const result = prepareStandaloneRevision("gutters.material-estimate", gutter, "00000000-0000-4000-8000-000000000001", "DEMO eresz");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.input).toMatchObject(gutter);
      expect((result.value.output as { totals: { gutterStockSections: number } }).totals.gutterStockSections).toBe(3);
    }
  });

  it("preserves incomplete flashing semantics and rejects geometry references", () => {
    const incomplete = prepareStandaloneRevision("sheet_metal.flashings.material-estimate", flashing, "00000000-0000-4000-8000-000000000002", "Kézi szegély");
    expect(incomplete.ok).toBe(true);
    if (incomplete.ok) expect((incomplete.value.output as { runs: { status: string; estimatedSectionCount: number | null }[] }).runs[0]).toMatchObject({ status: "incomplete", estimatedSectionCount: null });
    const sourced = { ...flashing, runs: [{ ...flashing.runs[0], lengthSource: "geometry", roofEdgeReference: { roofModelId: "00000000-0000-4000-8000-000000000003", roofModelRevisionId: "00000000-0000-4000-8000-000000000004", calculationId: "00000000-0000-4000-8000-000000000005", calculationRevisionId: "00000000-0000-4000-8000-000000000006", edgeId: "ridge", outputField: "lengths.ridgeLineMm", suggestedLengthMm: 1500, lengthOverridden: false } }] };
    expect(prepareStandaloneRevision("sheet_metal.flashings.material-estimate", sourced, "00000000-0000-4000-8000-000000000002", "Kézi szegély")).toMatchObject({ ok: false });
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
