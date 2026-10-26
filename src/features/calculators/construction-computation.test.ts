import { describe, expect, it } from "vitest";
import { DEMO_MATERIAL_PROFILES, initialSpecState } from "@/domain/calculations/roof-material-spec";
import { definitions } from "./roof-calculator-definitions";
import {
  computeConstruction, previewPlaneBirdsmouths, constructionInputSnapshot, isFieldVisible, constructionInputSnapshotSchema, constructionOutputSnapshot, isSaveableComputation,
  isCompleteConstructionOutput, isSaveableConstructionCalculator, materialStateFromSnapshot, normalizedConstructionInput, comparableConstructionInput,
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
    expect(isSaveableComputation(result)).toBe(true);
    expect(result.completeness).toEqual({ status: "complete", reasons: [], limitations: [] });
    expect(result.timberLayout?.rafters?.count).toBe(26);
    expect(result.cutList?.rafters).toEqual([{ lengthMm: 4883, count: 26 }]);
  });

  it("does not treat roof geometry as a complete timber result without a layout", () => {
    const result = computeConstruction(timber, timberValues, { ...material, layout: {} }, DEMO_MATERIAL_PROFILES);
    expect(result.geometry).not.toBeNull();
    expect(result.materialTakeoff?.status).toBe("INCOMPLETE");
    expect(result.completeness).toMatchObject({ status: "incomplete", reasons: expect.arrayContaining([expect.stringContaining("Szarufa")]) });
    expect(isSaveableComputation(result)).toBe(false);
  });

  it("does not save an incomplete or invalid timber cross-section", () => {
    const incomplete = { ...material, specs: { ...material.specs, rafter: { mode: "manual" as const, profileId: null, entered: { sectionWidthMm: 80 } } } };
    const invalid = { ...material, specs: { ...material.specs, rafter: { mode: "manual" as const, profileId: null, entered: { sectionWidthMm: 0, sectionHeightMm: 200 } } } };
    expect(isSaveableComputation(computeConstruction(timber, timberValues, incomplete, DEMO_MATERIAL_PROFILES))).toBe(false);
    const invalidResult = computeConstruction(timber, timberValues, invalid, DEMO_MATERIAL_PROFILES);
    expect(isSaveableComputation(invalidResult)).toBe(false);
    expect(invalidResult.completeness.status).toBe("invalid");
  });

  it("marks a requested but unsupported material layout as not calculable", () => {
    const underlayOnly: RoofMaterialUiState = {
      requested: { timber: false, underlay: true, covering: false }, layout: {},
      specs: { ...material.specs, underlay: { mode: "manual", profileId: null, entered: { rollWidthMm: 1500, rollLengthMm: 50000, sideOverlapMm: 100, endOverlapMm: 100, installationDirection: "eave-to-ridge" } } },
    };
    const result = computeConstruction(definitions["roof.material-takeoff"], { roofShape: "pyramid", sideMm: "6000", pitchDegrees: "45" }, underlayOnly, []);
    expect(result.materialTakeoff?.status).toBe("UNSUPPORTED");
    expect(result.completeness.status).toBe("unsupported");
    expect(isSaveableComputation(result)).toBe(false);
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

describe("birdsmouth in the roof calculators (M9.3 phase 1)", () => {
  // 35°, h 200, HAP 100: H = 200/cos35; plumb = H − 100; seat = plumb / tan35 (same formula as the rafter-cut calculator).
  const rad = 35 * Math.PI / 180, plumb = 200 / Math.cos(rad) - 100, seat = plumb / Math.tan(rad);
  const withSection: RoofMaterialUiState = { ...material, specs: { ...material.specs, rafter: { mode: "manual", profileId: null, entered: { sectionWidthMm: 80, sectionHeightMm: 200 } } } };
  const line = (rows: readonly { label: string; value: unknown }[], end: string) => rows.find((row) => row.label.startsWith("KARMI · 35°") && row.label.endsWith(end))?.value;

  it("adds the notch lines when requested and keeps the result complete", () => {
    const result = computeConstruction(timber, { ...timberValues, birdsmouth: "true", seatCutHeightMm: "100" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(result.completeness).toEqual({ status: "complete", reasons: [], limitations: [] });
    expect(line(result.rows, "Függővágás magassága")).toBeCloseTo(plumb, 9);
    expect(line(result.rows, "Vízszintes ülékhossz")).toBeCloseTo(seat, 9);
    expect(result.birdsmouths?.every((plane) => plane.status === "computed")).toBe(true);
  });

  it("is incomplete while the seat cut height or the rafter depth is missing", () => {
    const noSeat = computeConstruction(timber, { ...timberValues, birdsmouth: "true", seatCutHeightMm: "" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(noSeat.completeness).toMatchObject({ status: "incomplete", reasons: expect.arrayContaining([expect.stringContaining("HAP · szarufa felső élének magassága a talpszelemen felett")]) });
    const noDepth = computeConstruction(timber, { ...timberValues, birdsmouth: "true", seatCutHeightMm: "100" }, material, DEMO_MATERIAL_PROFILES);
    expect(noDepth.completeness).toMatchObject({ status: "incomplete", reasons: expect.arrayContaining([expect.stringContaining("Szarufa keresztmetszet magassága")]) });
    expect(isSaveableComputation(noDepth)).toBe(false);
  });

  it("leaves results and old revisions unchanged when the notch is not requested", () => {
    const before = computeConstruction(timber, timberValues, withSection, DEMO_MATERIAL_PROFILES);
    const off = computeConstruction(timber, { ...timberValues, birdsmouth: "", seatCutHeightMm: "100" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(off.rows).toEqual(before.rows);
    expect(off.birdsmouths).toBeNull();
    // A pre-M9.3 revision stores every field of its time ("" when empty) but none of the three new keys.
    const newKeys = ["birdsmouth", "seatCutHeightMm", "plateWidthMm"];
    const current = Object.fromEntries(timber.fields.map((field) => [field.key, (timberValues as Record<string, string>)[field.key] ?? field.initial ?? ""]));
    const historical = { ...constructionInputSnapshot(timber, current, material), fields: Object.fromEntries(Object.entries(current).filter(([key]) => !newKeys.includes(key))) };
    const hydrated = comparableConstructionInput(timber, historical)!;
    // Reopened, the editor holds the same values plus "" for the new keys, so the revision is not shown as modified.
    expect(JSON.stringify(hydrated)).toBe(JSON.stringify(constructionInputSnapshot(timber, Object.fromEntries(timber.fields.map((field) => [field.key, (hydrated.fields as Record<string, string>)[field.key]])), material)));
    expect(hydrated.fields).toMatchObject({ birdsmouth: "", seatCutHeightMm: "", plateWidthMm: "" });
  });

  it("ignores the notch in the material takeoff when rafters are not requested", () => {
    const takeoff = definitions["roof.material-takeoff"];
    const coveringOnly: RoofMaterialUiState = { ...withSection, requested: { timber: false, underlay: true, covering: false } };
    const result = computeConstruction(takeoff, { ...timberValues, birdsmouth: "true", seatCutHeightMm: "" }, coveringOnly, DEMO_MATERIAL_PROFILES);
    expect(result.birdsmouths).toBeNull();
    expect(result.completeness.reasons.some((reason) => reason.includes("KARMI") || reason.includes("Talpszelemen"))).toBe(false);
  });
});

describe("rafter joints in the roof calculators (M9.5)", () => {
  const rad = 35 * Math.PI / 180, tan = Math.tan(rad), H = 200 / Math.cos(rad);
  const withSection: RoofMaterialUiState = { ...material, specs: { ...material.specs, rafter: { mode: "manual", profileId: null, entered: { sectionWidthMm: 80, sectionHeightMm: 200 } } } };
  const joints = { ...timberValues, birdsmouth: "true", seatCutHeightMm: "100", purlinFaceMm: "2000", purlinTopMm: "1350", ridgeJoint: "purlin", ridgePurlinWidthMm: "160", ridgePurlinTopMm: "2640" };

  it("computes the wall plate, the purlin and the ridge purlin on both gable sides and saves their values", () => {
    const result = computeConstruction(timber, joints, withSection, DEMO_MATERIAL_PROFILES);
    expect(result.completeness).toEqual({ status: "complete", reasons: [], limitations: [] });
    // Independent: plumb cut = support top − lower edge at its face, lower edge = HAP + x·tanα − h/cosα.
    const purlinPlumb = 1350 - (100 + 2000 * tan - H), ridgePlumb = 2640 - (100 + (4000 - 80) * tan - H);
    for (const plane of result.birdsmouths!) {
      const byId = (id: string) => plane.joints!.joints.find((joint) => joint.id === id)!;
      expect(byId("purlin").status).toBe("computed");
      expect(byId("purlin").values.find((item) => item.label === "Függővágás magassága")!.value).toBeCloseTo(purlinPlumb, 9);
      expect(byId("ridge").values.find((item) => item.label === "Függővágás magassága")!.value).toBeCloseTo(ridgePlumb, 9);
    }
    expect(result.rows.find((row) => row.label === "Derékszelemen · 35° · Függővágás magassága")?.value).toBeCloseTo(purlinPlumb, 9);
    expect(result.rows.find((row) => row.label === "Gerincszelemen · 35° · Függővágás magassága")?.value).toBeCloseTo(ridgePlumb, 9);
    expect(constructionOutputSnapshot("roof.timber-cutlist", result).jointStatus?.map((item) => `${item.name}:${item.status}`)).toEqual(
      ["Talpszelemen:computed", "Derékszelemen:computed", "Gerincszelemen:computed", "Talpszelemen:computed", "Derékszelemen:computed", "Gerincszelemen:computed"]);
  });

  it("blocks saving while a purlin pair is half given or a ridge joint is invalid", () => {
    const half = computeConstruction(timber, { ...joints, purlinTopMm: "" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(half.completeness).toMatchObject({ status: "incomplete", reasons: expect.arrayContaining(["Derékszelemen · Derékszelemen felső síkjának magassága"]) });
    const wrongSide = computeConstruction(timber, { ...joints, purlinFaceMm: "5000" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(wrongSide.completeness.status).toBe("invalid");
    expect(isSaveableComputation(wrongSide)).toBe(false);
  });

  it("keeps not-applicable planes and unsupported joints as saved limitations (CRR-03)", () => {
    const mansard = computeConstruction(timber, { roofShape: "mansard", lengthMm: "10000", widthMm: "8000", lowerRunMm: "1000", lowerRiseMm: "2000", upperRiseMm: "1000", birdsmouth: "true", seatCutHeightMm: "100" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(mansard.completeness.status).toBe("complete");
    expect(mansard.completeness.limitations).toEqual(expect.arrayContaining([expect.stringContaining("nem eresznél kezdődnek"), expect.stringContaining("törésvonalán")]));
    const output = constructionOutputSnapshot("roof.timber-cutlist", mansard);
    expect(output.jointStatus?.filter((item) => item.status === "not-applicable")).toHaveLength(2);
    expect(output.jointStatus?.filter((item) => item.status === "unsupported").every((item) => item.name === "Felső vég")).toBe(true);
    const shed = computeConstruction(timber, { roofShape: "shed", lengthMm: "10000", widthMm: "4000", pitchDegrees: "15", eaveOverhangMm: "0", birdsmouth: "true", seatCutHeightMm: "60" }, withSection, DEMO_MATERIAL_PROFILES);
    expect(shed.completeness.limitations).toEqual([expect.stringContaining("félnyeregtető felső élén")]);
  });

  it("hides ridge data that the chosen ridge joint or a switched-off joint calculation does not use", () => {
    const visible = (values: Record<string, string>) => timber.fields.filter((field) => isFieldVisible(field, values)).map((field) => field.key);
    expect(visible({ ...timberValues, birdsmouth: "true", ridgeJoint: "opposed" })).not.toContain("ridgeBoardThicknessMm");
    expect(visible({ ...timberValues, birdsmouth: "true", ridgeJoint: "board" })).toContain("ridgeBoardThicknessMm");
    expect(visible({ ...timberValues, birdsmouth: "false", ridgeJoint: "board" })).not.toContain("ridgeBoardThicknessMm");
    expect(visible({ ...timberValues, roofShape: "shed", birdsmouth: "true" })).not.toContain("ridgeJoint");
  });

  it("does not show an M9.3 revision as modified: new keys hydrate to their defaults", () => {
    const m93Keys = timber.fields.map((field) => field.key).filter((key) => !["purlinFaceMm", "purlinTopMm", "ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"].includes(key));
    const all = Object.fromEntries(timber.fields.map((field) => [field.key, ({ ...timberValues, birdsmouth: "true", seatCutHeightMm: "100" } as Record<string, string>)[field.key] ?? field.initial ?? ""]));
    const historical = constructionInputSnapshot(timber, all, material);
    const stored = { ...historical, fields: Object.fromEntries(Object.entries(historical.fields).filter(([key]) => m93Keys.includes(key))) };
    const hydrated = comparableConstructionInput(timber, stored)!;
    const editor = Object.fromEntries(timber.fields.map((field) => [field.key, stored.fields[field.key] ?? field.initial ?? ""]));
    expect(hydrated).toEqual(constructionInputSnapshot(timber, editor, material));
    expect(hydrated.fields).toMatchObject({ ridgeJoint: "opposed", purlinFaceMm: "" });
  });
});

describe("server field contract (CRR-07)", () => {
  const base = { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "500", seatCutHeightMm: "100", rafterDepthMm: "200" };
  it.each([
    ["negative optional plate width", { plateWidthMm: "-5" }, "nem lehet negatív"],
    ["zero plate width", { plateWidthMm: "0" }, "0 nem megengedett"],
    ["zero rafter depth", { rafterDepthMm: "0" }, "0 nem megengedett"],
    ["text in a number field", { purlinFaceMm: "abc" }, "nem szám"],
    ["infinite value", { ridgePurlinTopMm: "Infinity" }, "nem szám"],
    ["too large length", { horizontalHalfSpanMm: "1000001" }, "legfeljebb"],
    ["unknown ridge joint", { ridgeJoint: "glued" }, "nem választható"],
  ])("rejects a manipulated %s instead of reading it as not given", (_name, change, message) => {
    const result = computeConstruction(rafter, { ...base, ...change }, null, []);
    expect(result.completeness.status).toBe("invalid");
    expect(result.completeness.reasons.some((reason) => reason.includes(message))).toBe(true);
    expect(isSaveableComputation(result)).toBe(false);
  });
  it("still accepts empty optional fields and an allowed zero", () => {
    expect(isSaveableComputation(computeConstruction(rafter, { ...base, plateWidthMm: "", eaveProjectionMm: "0" }, null, []))).toBe(true);
  });
  it("rejects a saved output whose joint state is not complete, and still reads earlier outputs", () => {
    const result = computeConstruction(timber, timberValues, material, DEMO_MATERIAL_PROFILES);
    const output = constructionOutputSnapshot("roof.timber-cutlist", result);
    expect(output.jointStatus).toBeUndefined();
    expect(isCompleteConstructionOutput(output)).toBe(isCompleteConstructionOutput({ ...output }));
    expect(isCompleteConstructionOutput({ ...output, jointStatus: [{ planeId: "x", plane: "1. tetősík", joint: "purlin", name: "Derékszelemen", status: "invalid" }] })).toBe(false);
  });
});

describe("construction snapshots", () => {
  it("compares a historical V2 rafter snapshot with hydrated defaults without changing its stored mm values", () => {
    const historical = constructionInputSnapshot(rafter, { horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "600", seatCutHeightMm: "0" }, null);
    const hydrated = constructionInputSnapshot(rafter, Object.fromEntries(rafter.fields.map((field) => [field.key, historical.fields[field.key] ?? field.initial ?? ""])), null);
    expect(comparableConstructionInput(rafter, historical)).toEqual(hydrated);
    const originalResult = computeConstruction(rafter, historical.fields, null, []);
    const hydratedResult = computeConstruction(rafter, hydrated.fields, null, []);
    expect(hydratedResult.rows).toEqual(originalResult.rows);
    expect(hydratedResult.rafterJoints?.joints.map((joint) => joint.status)).toEqual(originalResult.rafterJoints?.joints.map((joint) => joint.status));
    expect(historical.fields).toEqual({ horizontalHalfSpanMm: "3000", riseMm: "2000", eaveProjectionMm: "600", seatCutHeightMm: "0" });
    expect(comparableConstructionInput(rafter, { ...historical, fields: { ...historical.fields, removedField: "42" } })).toBeNull();
    expect(comparableConstructionInput(rafter, { ...historical, fields: { riseMm: "2000" } })).toBeNull();
  });

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
    expect(isCompleteConstructionOutput(output)).toBe(true);
    expect(output.takeoff?.parts.find((part) => part.id === "rafters")?.quantities.map((quantity) => quantity.meaning)).toContain("LAYOUT");
    expect(output.cutList?.rafters[0]).toEqual({ lengthMm: 4883, count: 26 });
    expect(output.specifications).not.toBeNull();
    expect(JSON.parse(JSON.stringify(output))).toEqual(output);
    expect(isCompleteConstructionOutput({ ...output, takeoff: { ...output.takeoff!, status: "INCOMPLETE" } })).toBe(false);
    expect(isCompleteConstructionOutput({ schemaVersion: "construction-suite.output.v1", calculatorId: "roof.rafter-cut", lines: [] })).toBe(false);
  });

  it("limits saving to the approved roof scope", () => {
    expect(["roof.rafter-cut", "roof.material-takeoff", "roof.timber-cutlist", "roof.truss-members"].every(isSaveableConstructionCalculator)).toBe(true);
    expect(isSaveableConstructionCalculator("stair.wood.spiral")).toBe(false);
  });
});

describe("KARMI preview without the rafter layout (M9.15.1)", () => {
  const takeoff = definitions["roof.material-takeoff"];
  const manual = { mode: "manual" as const, profileId: null, entered: { sectionWidthMm: 80, sectionHeightMm: 200 } };
  // Rafter layout off (timber not requested), spacing never entered.
  const noLayout: RoofMaterialUiState = { requested: { timber: false, underlay: true, covering: false }, layout: {}, specs: { ...material.specs, rafter: manual } };
  const values = { ...timberValues, birdsmouth: "true", seatCutHeightMm: "100" };
  const geometryOf = (state: RoofMaterialUiState, input: Record<string, string> = values) => computeConstruction(takeoff, input, state, DEMO_MATERIAL_PROFILES);

  it("computes the same notch as the layout path, without line count or spacing", () => {
    const base = geometryOf(noLayout);
    expect(base.birdsmouths).toBeNull();
    const preview = previewPlaneBirdsmouths(takeoff, values, noLayout, DEMO_MATERIAL_PROFILES, base.geometry)!;
    const full = geometryOf({ ...noLayout, requested: { timber: true, underlay: false, covering: false }, layout: { rafterMaxSpacingMm: 900 } }).birdsmouths!;
    expect(preview.map((plane) => [plane.status, plane.seat?.values, plane.runMm, plane.pitchDegrees])).toEqual(full.map((plane) => [plane.status, plane.seat?.values, plane.runMm, plane.pitchDegrees]));
    expect(preview.every((plane) => plane.lineCount === 0 && plane.spacingMm === 0)).toBe(true);
  });

  it("does not change completeness, saving or output of the calculation", () => {
    const withValues = geometryOf(noLayout), without = geometryOf(noLayout, { ...values, birdsmouth: "" });
    expect(withValues.completeness.status).toBe(without.completeness.status);
    expect(withValues.rows).toEqual(without.rows);
    expect(withValues.timberLayout).toBeNull();
  });

  it("shows nothing when joints are not asked and reports incomplete without a rafter section", () => {
    const geometry = geometryOf(noLayout).geometry;
    expect(previewPlaneBirdsmouths(takeoff, { ...values, birdsmouth: "" }, noLayout, DEMO_MATERIAL_PROFILES, geometry)).toBeNull();
    const noSection = previewPlaneBirdsmouths(takeoff, values, { ...noLayout, specs: { ...noLayout.specs, rafter: initialSpecState(false) } }, DEMO_MATERIAL_PROFILES, geometry)!;
    expect(noSection.every((plane) => plane.status === "incomplete")).toBe(true);
    expect(previewPlaneBirdsmouths(rafter, values, null, [], geometry)).toBeNull();
  });

  it("also serves the timber cut list before a rafter spacing is entered", () => {
    const noSpacing: RoofMaterialUiState = { ...noLayout, requested: { timber: true, underlay: false, covering: false } };
    const result = computeConstruction(timber, values, noSpacing, DEMO_MATERIAL_PROFILES);
    expect(result.birdsmouths).toBeNull();
    expect(previewPlaneBirdsmouths(timber, values, noSpacing, DEMO_MATERIAL_PROFILES, result.geometry)?.every((plane) => plane.status === "computed")).toBe(true);
  });
});
