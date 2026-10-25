import { describe, expect, it } from "vitest";
import { DEMO_MATERIAL_PROFILES, initialSpecState } from "@/domain/calculations/roof-material-spec";
import { definitions } from "./roof-calculator-definitions";
import {
  computeConstruction, constructionInputSnapshot, constructionInputSnapshotSchema, constructionOutputSnapshot, isSaveableComputation,
  isSaveableConstructionCalculator, materialStateFromSnapshot, normalizedConstructionInput,
} from "./construction-computation";
import type { RoofMaterialUiState } from "./material-spec-editor";

const rafter = definitions["roof.rafter-cut"];
const timber = definitions["roof.timber-cutlist"];
const material: RoofMaterialUiState = {
  requested: { timber: true, underlay: false, covering: false },
  layout: { rafterMaxSpacingMm: 900 },
  specs: { covering: initialSpecState(false), underlay: initialSpecState(false), rafter: initialSpecState(false), batten: initialSpecState(false) },
};
const timberValues = { roofShape: "gable", lengthMm: "10000", widthMm: "8000", pitchDegrees: "35", eaveOverhangMm: "0" };

describe("computeConstruction", () => {
  it("reproduces the verified rafter-cut result", () => {
    const result = computeConstruction(rafter, { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "0" }, null, []);
    expect(isSaveableComputation(result)).toBe(true);
    expect(result.rows.find((line) => line.label === "Szarufa teljes hossza")?.value).toBeCloseTo(4206.476, 3);
  });

  it("is not saveable while a required field is missing or the engine rejects the input", () => {
    expect(isSaveableComputation(computeConstruction(rafter, { horizontalHalfSpanMm: "3000", riseMm: "", eaveProjectionMm: "0", seatCutHeightMm: "0" }, null, []))).toBe(false);
    const invalid = computeConstruction(rafter, { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "0", seatCutHeightMm: "2500" }, null, []);
    expect(invalid.error).not.toBeNull();
    expect(isSaveableComputation(invalid)).toBe(false);
  });

  it("produces the timber layout and cut list from the material state", () => {
    const result = computeConstruction(timber, timberValues, material, DEMO_MATERIAL_PROFILES);
    expect(result.timberLayout?.rafters?.count).toBe(26);
    expect(result.cutList?.rafters).toEqual([{ lengthMm: 4883, count: 26 }]);
  });

  it("always lays out with a 0 mm edge strip and drops legacy inset keys (M6, 12/1 A)", () => {
    const legacy = { ...material, layout: { rafterMaxSpacingMm: 900, rafterStartInsetMm: 1000, rafterEndInsetMm: 1000, battenStartInsetMm: 50 } };
    expect(computeConstruction(timber, timberValues, legacy, DEMO_MATERIAL_PROFILES).timberLayout?.rafters?.count).toBe(26);
    expect(constructionInputSnapshot(timber, timberValues, legacy).material?.layout).toEqual({ rafterMaxSpacingMm: 900 });
    // A revision saved before M6 with explicit 0 mm strips must reopen as unchanged.
    const saved = { ...constructionInputSnapshot(timber, timberValues, material), material: { ...constructionInputSnapshot(timber, timberValues, material).material!, layout: { rafterMaxSpacingMm: 900, rafterStartInsetMm: 0, rafterEndInsetMm: 0 } } };
    expect(normalizedConstructionInput(saved)).toEqual(constructionInputSnapshot(timber, timberValues, material));
  });

  it("adds rafter joints without changing the lines of a revision that has no joint input", () => {
    const values = { horizontalHalfSpanMm: "4000", riseMm: "3100", eaveProjectionMm: "400", seatCutHeightMm: "100", ridgeJoint: "opposed" };
    const plain = computeConstruction(rafter, values, null, []);
    expect(plain.rows).toHaveLength(5);
    expect(plain.rafterJoints?.joints[0]).toMatchObject({ status: "incomplete" });
    const withDepth = computeConstruction(rafter, { ...values, rafterDepthMm: "200" }, null, []);
    expect(withDepth.rows.find((line) => line.label === "Alsó felfekvés (talpszelemen) · Vízszintes ülékhossz")?.value).toBeCloseTo(200, 9);
    expect(computeConstruction(timber, timberValues, material, DEMO_MATERIAL_PROFILES).rafterJoints).toBeNull();
  });
});

describe("construction snapshots", () => {
  it("keeps only defined fields and validates the saved input contract", () => {
    const snapshot = constructionInputSnapshot(timber, { ...timberValues, unrelated: "x" }, material);
    expect(snapshot.fields).not.toHaveProperty("unrelated");
    expect(snapshot.material?.layout.rafterMaxSpacingMm).toBe(900);
    expect(constructionInputSnapshotSchema.parse(snapshot)).toEqual(snapshot);
    expect(materialStateFromSnapshot(snapshot)).toEqual(material);
    expect(constructionInputSnapshot(rafter, { horizontalHalfSpanMm: "3000" }, material).material).toBeNull();
  });

  it("rejects unknown keys and wrong schema versions", () => {
    const snapshot = constructionInputSnapshot(rafter, { horizontalHalfSpanMm: "3000" }, null);
    expect(constructionInputSnapshotSchema.safeParse({ ...snapshot, schemaVersion: "v0" }).success).toBe(false);
    expect(constructionInputSnapshotSchema.safeParse({ ...snapshot, extra: true }).success).toBe(false);
  });

  it("records the server-recomputed output with quantity meaning and cut list", () => {
    const output = constructionOutputSnapshot("roof.timber-cutlist", computeConstruction(timber, timberValues, material, DEMO_MATERIAL_PROFILES));
    expect(output.takeoff?.parts.find((part) => part.id === "rafters")?.quantities.map((quantity) => quantity.meaning)).toContain("LAYOUT");
    expect(output.cutList?.rafters[0]).toEqual({ lengthMm: 4883, count: 26 });
    expect(output.specifications).not.toBeNull();
    expect(JSON.parse(JSON.stringify(output))).toEqual(output);
  });

  it("limits saving to the approved roof scope", () => {
    expect(["roof.rafter-cut", "roof.material-takeoff", "roof.timber-cutlist", "roof.truss-members"].every(isSaveableConstructionCalculator)).toBe(true);
    expect(isSaveableConstructionCalculator("stair.wood.spiral")).toBe(false);
  });
});
