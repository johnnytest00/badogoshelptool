import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ConstructionCalculatorSuite, limitationGroups } from "@/features/calculators/construction-suite";
import { takeoffLines } from "@/features/calculators/roof-calculator-definitions";
import { loadConstructionCalculatorDefinition } from "@/features/calculators/construction-calculator-loading";
import { createCalculationSnapshot, replayRoofCalculation } from "./roof-calculation-snapshot";
import { calculateRoofGeometry } from "./roof-geometry";
import { calculateRoofMaterialTakeoff, roofTakeoffCriticalWarnings } from "./roof-material-takeoff";
import { calculateRoofUnderlayLayout } from "./roof-underlay";
import { roofTimberInputFromParameters } from "./roof-timber-layout";
import {
  DEMO_MATERIAL_PROFILES, MANUAL_REFERENCE, coveringParametersFromSpec, createSpecSnapshot, initialSpecState, overhangFromField, resolveMaterialSpec,
  restoreProductValues, setSpecEntry, switchSpecMode, timberParametersFromSpecs, underlayParametersFromSpec, type SpecState,
} from "./roof-material-spec";

const m = 1_000;
const gable = (overhang: { front?: number; rear?: number } = {}) => calculateRoofGeometry({ type: "gable", geometry: { inputMode: "angle", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofPitchDegrees: 45, eaveOverhangMm: 0, frontGableOverhangMm: overhang.front ?? 0, rearGableOverhangMm: overhang.rear ?? 0 } });
const shed = () => calculateRoofGeometry({ type: "shed", lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 30, eaveOverhangMm: 0 });
const productState = (profileId: string): SpecState => ({ mode: "product", profileId, entered: {} });
const covering = (state: SpecState) => resolveMaterialSpec("covering", state, DEMO_MATERIAL_PROFILES);
const takeoffOf = (geometry: ReturnType<typeof gable>, state: SpecState) => {
  const spec = covering(state);
  return calculateRoofMaterialTakeoff(geometry, { covering: coveringParametersFromSpec(spec), requested: { timber: false, underlay: false, covering: true }, specSnapshot: createSpecSnapshot([spec]) });
};

describe("product and manual material specification", () => {
  it("fills known fields from the selected product and records their source", () => {
    const spec = covering(productState("demo-covering-sheet"));
    expect(spec.values).toMatchObject({ nominalWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, physicalLengthMm: 4_000, usableCoveringLengthMm: 3_900 });
    expect(Object.values(spec.sources).every((source) => source === "product")).toBe(true);
    expect(spec.profile?.verification).toBe("demo");
    expect(spec.referenceLabel).toContain("DEMO");
  });

  it("works manually without any catalog product and never claims manufacturer provenance", () => {
    let state = initialSpecState(false);
    for (const [key, value] of Object.entries({ nominalWidthMm: 1_100, effectiveCoveringWidthMm: 1_000, physicalLengthMm: 4_000, usableCoveringLengthMm: 3_900 })) state = setSpecEntry(state, key, value);
    const spec = covering(state);
    expect(spec.profile).toBeNull();
    expect(Object.values(spec.sources).every((source) => source === "manual")).toBe(true);
    expect(spec.referenceLabel).toBe(MANUAL_REFERENCE);
    const result = takeoffOf(gable(), state);
    expect(result.status).toBe("VALID");
    expect(result.covering.columnCount).toBe(20);
    expect(result.covering.totalSheetCount).toBe(40); // 10 columns per plane x 2 planes, ceil(4242.64 / 3900) = 2 sheets per column
  });

  it("gives the same result for the product and for the identical manual values", () => {
    const product = takeoffOf(gable(), productState("demo-covering-sheet"));
    const manual = takeoffOf(gable(), switchSpecMode(productState("demo-covering-sheet"), "manual", covering(productState("demo-covering-sheet"))));
    expect(manual.covering.totalSheetCount).toBe(product.covering.totalSheetCount);
    expect(manual.parts.find((part) => part.id === "covering")?.specification?.profile).toBeNull();
  });

  it("keeps incomplete product data incomplete instead of guessing", () => {
    const state = productState("demo-covering-partial");
    expect(covering(state).missingKeys).toEqual(["effectiveCoveringWidthMm", "physicalLengthMm", "usableCoveringLengthMm"]);
    const result = takeoffOf(gable(), state);
    expect(result.status).toBe("INCOMPLETE");
    expect(result.covering.totalSheetCount).toBeNull();
  });

  it("preserves overrides, marks them, recalculates, and restores the product values", () => {
    const base = productState("demo-covering-sheet");
    const overridden = setSpecEntry(base, "effectiveCoveringWidthMm", 500);
    const spec = covering(overridden);
    expect(spec.sources.effectiveCoveringWidthMm).toBe("override");
    expect(spec.sources.nominalWidthMm).toBe("product");
    expect(spec.overriddenKeys).toEqual(["effectiveCoveringWidthMm"]);
    expect(spec.productValues.effectiveCoveringWidthMm).toBe(1_000);
    expect(spec.referenceLabel).toContain("felülírt");
    expect(takeoffOf(gable(), overridden).covering.columnCount).toBe(40); // 10 m / 0.5 m = 20 per plane
    const restored = restoreProductValues(overridden, covering(overridden));
    expect(covering(restored).values.effectiveCoveringWidthMm).toBe(1_000);
    expect(takeoffOf(gable(), restored).covering.columnCount).toBe(20);
    expect(covering(restoreProductValues(overridden, covering(overridden), "effectiveCoveringWidthMm")).overriddenKeys).toEqual([]);
  });

  it("product → manual keeps the visible values as the user's own entries; manual → product keeps them as visible overrides", () => {
    const overridden = setSpecEntry(productState("demo-covering-sheet"), "physicalLengthMm", 5_000);
    const manual = switchSpecMode(overridden, "manual", covering(overridden));
    const manualSpec = covering(manual);
    expect(manualSpec.values).toMatchObject({ physicalLengthMm: 5_000, effectiveCoveringWidthMm: 1_000 });
    expect(Object.values(manualSpec.sources).every((source) => source === "manual")).toBe(true);
    const back = covering(switchSpecMode(manual, "product", manualSpec));
    expect(back.profile?.id).toBe("demo-covering-sheet");
    expect(back.sources.physicalLengthMm).toBe("override");
  });

  it("distinguishes zero, missing and invalid values", () => {
    const base = { rollWidthMm: 1_500, rollLengthMm: 50_000, sideOverlapMm: 100 };
    const underlayState = (extra: Record<string, number>) => {
      const state = Object.entries({ ...base, ...extra }).reduce((acc, [key, value]) => setSpecEntry(acc, key, value), initialSpecState(false));
      return setSpecEntry(state, "installationDirection", "eave-to-ridge");
    };
    const resolve = (state: SpecState) => resolveMaterialSpec("underlay", state, DEMO_MATERIAL_PROFILES);
    const zero = resolve(underlayState({ endOverlapMm: 0 }));
    expect(zero.values.endOverlapMm).toBe(0);
    expect(calculateRoofUnderlayLayout(gable(), underlayParametersFromSpec(zero)).status).toBe("VALID");
    const missing = resolve(underlayState({}));
    expect("endOverlapMm" in missing.values).toBe(false);
    expect(calculateRoofUnderlayLayout(gable(), underlayParametersFromSpec(missing)).status).toBe("INCOMPLETE");
    const invalid = resolve(underlayState({ endOverlapMm: -5 }));
    expect(calculateRoofUnderlayLayout(gable(), underlayParametersFromSpec(invalid)).status).toBe("INVALID");
  });

  it("does not make unrequested groups invalidate the takeoff", () => {
    const none = calculateRoofMaterialTakeoff(shed(), { requested: { timber: false, underlay: false, covering: false } });
    expect(none.status).toBe("VALID");
    expect(none.reasons).toEqual([]);
    expect(none.parts.filter((part) => part.requested).map((part) => part.id)).toEqual(["geometry"]);
    const timberOnly = calculateRoofMaterialTakeoff(shed(), { timber: { rafter: { maxSpacingMm: 1_000, startInsetMm: 0, endInsetMm: 0 } }, requested: { timber: true, underlay: false, covering: false } });
    expect(timberOnly.status).toBe("VALID");
    expect(calculateRoofMaterialTakeoff(shed()).status).toBe("INCOMPLETE"); // historical default: everything requested
  });

  it("labels quantities by meaning and never promotes anything to a procurement quantity", () => {
    const rafter = resolveMaterialSpec("rafter", productState("demo-rafter-80x200"), DEMO_MATERIAL_PROFILES);
    const underlay = resolveMaterialSpec("underlay", productState("demo-underlay-roll"), DEMO_MATERIAL_PROFILES);
    const coveringSpec = covering(productState("demo-covering-sheet"));
    const batten = resolveMaterialSpec("batten", productState("demo-batten-50x30"), DEMO_MATERIAL_PROFILES);
    const timber = roofTimberInputFromParameters(timberParametersFromSpecs({ rafterMaxSpacingMm: 1_000, rafterStartInsetMm: 0, rafterEndInsetMm: 0 }, rafter, batten));
    const result = calculateRoofMaterialTakeoff(gable(), { timber: timber ?? undefined, underlay: { ...underlayParametersFromSpec(underlay), installationDirection: "eave-to-ridge" }, covering: coveringParametersFromSpec(coveringSpec), specSnapshot: createSpecSnapshot([rafter, batten, underlay, coveringSpec]) });
    const quantities = result.parts.flatMap((part) => part.quantities);
    expect(quantities.some((quantity) => quantity.meaning === "PROCUREMENT")).toBe(false);
    expect(result.parts.find((part) => part.id === "geometry")?.quantities[0]).toMatchObject({ meaning: "GEOMETRIC", unit: "m²" });
    const rafters = result.parts.find((part) => part.id === "rafters")!;
    // 11 rafters per plane at 1 m over 10 m, each 3 m / cos 45° long; nominal volume = length x 80 x 200 mm
    expect(rafters.quantities.find((quantity) => quantity.unit === "db")?.value).toBe(22);
    expect(rafters.quantities.find((quantity) => quantity.meaning === "NOMINAL")?.value).toBeCloseTo(22 * 3 * Math.SQRT2 * 0.016, 6);
    expect(rafters.specification?.profile?.id).toBe("demo-rafter-80x200");
    expect(result.parts.find((part) => part.id === "battens")?.requested).toBe(false); // no batten spacing given
  });

  it("snapshot data reproduces the same takeoff", () => {
    const state = setSpecEntry(productState("demo-covering-sheet"), "effectiveCoveringWidthMm", 800);
    const first = takeoffOf(gable(), state);
    const restored = JSON.parse(JSON.stringify(first.specSnapshot)).groups.covering;
    const second = calculateRoofMaterialTakeoff(gable(), { covering: coveringParametersFromSpec(restored), requested: { timber: false, underlay: false, covering: true } });
    expect(second.covering.totalSheetCount).toBe(first.covering.totalSheetCount);
    expect(first.specSnapshot).toMatchObject({ persisted: false, schemaVersion: 1 });
  });
});

describe("F9.50.3 integrity corrections", () => {
  const resolveSection = (group: "rafter" | "batten", entered: Record<string, number>) => resolveMaterialSpec(group, { mode: "manual", profileId: null, entered }, DEMO_MATERIAL_PROFILES);
  const timberResult = (rafter: Record<string, number>, batten: Record<string, number>) => {
    const r = resolveSection("rafter", rafter), b = resolveSection("batten", batten);
    const timber = roofTimberInputFromParameters(timberParametersFromSpecs({ rafterMaxSpacingMm: 1_000, rafterStartInsetMm: 0, rafterEndInsetMm: 0, battenMaxSpacingMm: 500, battenStartInsetMm: 0, battenEndInsetMm: 0 }, r, b));
    return calculateRoofMaterialTakeoff(gable(), { timber: timber ?? undefined, requested: { timber: true, underlay: false, covering: false }, specSnapshot: createSpecSnapshot([r, b]) });
  };

  it("keeps an entered width, flags the missing height, and keeps rafter lengths valid", () => {
    const spec = resolveSection("rafter", { sectionWidthMm: 80 });
    expect(spec.values.sectionWidthMm).toBe(80);
    expect(spec.issues.sectionHeightMm).toContain("magasság");
    const result = timberResult({ sectionWidthMm: 80 }, {});
    const rafters = result.parts.find((part) => part.id === "rafters")!;
    expect(rafters.status).toBe("VALID");
    expect(rafters.quantities.find((quantity) => quantity.unit === "db")?.value).toBe(22);
    expect(rafters.quantities.some((quantity) => quantity.meaning === "NOMINAL")).toBe(false);
    expect(rafters.incompleteQuantities[0]).toMatchObject({ label: "Névleges keresztmetszeti térfogat" });
    expect(result.status).toBe("VALID");
  });

  it("handles battens the same way and leaves a complete rafter section alone", () => {
    const result = timberResult({ sectionWidthMm: 80, sectionHeightMm: 200 }, { sectionHeightMm: 30 });
    expect(resolveSection("batten", { sectionHeightMm: 30 }).issues.sectionWidthMm).toContain("szélesség");
    const battens = result.parts.find((part) => part.id === "battens")!;
    expect(battens.incompleteQuantities).toHaveLength(1);
    expect(battens.quantities.some((quantity) => quantity.meaning === "NOMINAL")).toBe(false);
    const rafters = result.parts.find((part) => part.id === "rafters")!;
    expect(rafters.incompleteQuantities).toHaveLength(0);
    expect(rafters.quantities.some((quantity) => quantity.meaning === "NOMINAL")).toBe(true);
  });

  it("global restore keeps manual-only values and restores only real overrides", () => {
    // DEMO partial profile only knows nominalWidthMm: effective width typed = manual-only, nominal width typed = override.
    let state = productState("demo-covering-partial");
    state = setSpecEntry(setSpecEntry(state, "effectiveCoveringWidthMm", 900), "nominalWidthMm", 1_200);
    const before = covering(state);
    expect(before.sources).toMatchObject({ effectiveCoveringWidthMm: "manual", nominalWidthMm: "override" });
    expect(before.overriddenKeys).toEqual(["nominalWidthMm"]);
    const restored = restoreProductValues(state, before);
    const after = covering(restored);
    expect(after.values).toMatchObject({ nominalWidthMm: 1_100, effectiveCoveringWidthMm: 900 });
    expect(after.sources).toMatchObject({ nominalWidthMm: "product", effectiveCoveringWidthMm: "manual" });
    expect(restoreProductValues(state, before, "effectiveCoveringWidthMm")).toEqual(state); // manual-only is not an override
    expect(restoreProductValues(state, before, "nominalWidthMm").entered).toEqual({ effectiveCoveringWidthMm: 900 });
  });

  it("recomputes provenance when the product changes and keeps every entry", () => {
    const state = setSpecEntry(setSpecEntry(productState("demo-covering-sheet"), "physicalLengthMm", 5_000), "manufacturerConstraintReference", "saját jegyzet");
    expect(covering(state).sources.physicalLengthMm).toBe("override");
    const switched = { ...state, profileId: "demo-covering-partial" };
    const spec = covering(switched);
    expect(spec.sources.physicalLengthMm).toBe("manual"); // the partial product has no length
    expect(spec.values.physicalLengthMm).toBe(5_000);
    expect(spec.missingKeys).toContain("effectiveCoveringWidthMm");
    expect(covering(restoreProductValues(switched, spec)).values.physicalLengthMm).toBe(5_000);
  });

  it("replays the complete calculation from a JSON round-tripped snapshot", () => {
    const rafter = resolveMaterialSpec("rafter", setSpecEntry(productState("demo-rafter-80x200"), "sectionHeightMm", 220), DEMO_MATERIAL_PROFILES);
    const batten = resolveSection("batten", { sectionWidthMm: 50 });
    const underlay = resolveMaterialSpec("underlay", setSpecEntry(productState("demo-underlay-roll"), "installationDirection", "eave-to-ridge"), DEMO_MATERIAL_PROFILES);
    const cover = covering(setSpecEntry(productState("demo-covering-sheet"), "effectiveCoveringWidthMm", 800));
    const layout = { rafterMaxSpacingMm: 900, rafterStartInsetMm: 0, rafterEndInsetMm: 0, battenMaxSpacingMm: 400, battenStartInsetMm: 0, battenEndInsetMm: 0 };
    const fields = { roofShape: "gable", lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 45, eaveOverhangMm: 200, frontGableOverhangMm: 500, rearGableOverhangMm: 0 };
    const requested = { timber: true, underlay: true, covering: true };
    const snapshot = createCalculationSnapshot({ calculatorId: "roof.material-takeoff", roofShape: "gable", fields, requested, timberLayout: layout, specs: [rafter, batten, underlay, cover] });
    expect(snapshot).toMatchObject({ schemaVersion: 1, persisted: false, calculatorId: "roof.material-takeoff", roofShape: "gable", requested, timberLayout: layout });
    expect(snapshot.fields).toMatchObject({ frontGableOverhangMm: 500, rearGableOverhangMm: 0 }); // explicit zero survives
    expect(Object.keys(snapshot.specifications.groups).sort()).toEqual(["batten", "covering", "rafter", "underlay"]);
    expect(snapshot.specifications.groups.rafter?.sources.sectionHeightMm).toBe("override");
    expect(snapshot.specifications.groups.batten?.issues.sectionHeightMm).toBeDefined();
    const replayed = replayRoofCalculation(JSON.parse(JSON.stringify(snapshot)));
    const live = (() => {
      const geometry = calculateRoofGeometry({ type: "gable", geometry: { inputMode: "angle", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofPitchDegrees: 45, eaveOverhangMm: 200, frontGableOverhangMm: 500, rearGableOverhangMm: 0 } });
      return calculateRoofMaterialTakeoff(geometry, { timber: roofTimberInputFromParameters(timberParametersFromSpecs(layout, rafter, batten)) ?? undefined, underlay: underlayParametersFromSpec(underlay), covering: coveringParametersFromSpec(cover), requested });
    })();
    expect(replayed.parts.map(({ id, status, quantities }) => ({ id, status, quantities }))).toEqual(live.parts.map(({ id, status, quantities }) => ({ id, status, quantities })));
    expect(replayed.status).toBe(live.status);
  });

  it("lists each distinct limitation once", () => {
    const result = calculateRoofMaterialTakeoff(gable(), { timber: { rafter: { maxSpacingMm: 1_000, startInsetMm: 0, endInsetMm: 0 } } });
    const all = result.parts.filter((part) => part.requested && part.id !== "geometry").flatMap((part) => part.limitations);
    expect(all.filter((text) => text.startsWith("Nem beszerzési")).length).toBeGreaterThan(1); // repeated per part in the data...
    const parts = result.parts.filter((part) => part.requested && part.id !== "geometry");
    const groups = limitationGroups(parts);
    const flat = groups.flatMap((group) => group.items);
    expect(new Set(flat).size).toBe(flat.length);
    expect(groups[0].title).toBe("Általános");
    // nothing is lost: every distinct part limitation is still present
    expect(new Set(flat)).toEqual(new Set(all));
  });
});

describe("F9.50.4 timber section validation", () => {
  const manual = (group: "rafter" | "batten", entered: Record<string, number>) => resolveMaterialSpec(group, { mode: "manual", profileId: null, entered }, DEMO_MATERIAL_PROFILES);
  const run = (rafter: Record<string, number>, batten: Record<string, number>) => {
    const r = manual("rafter", rafter), b = manual("batten", batten);
    const timber = roofTimberInputFromParameters(timberParametersFromSpecs({ rafterMaxSpacingMm: 1_000, rafterStartInsetMm: 0, rafterEndInsetMm: 0, battenMaxSpacingMm: 500, battenStartInsetMm: 0, battenEndInsetMm: 0 }, r, b));
    return calculateRoofMaterialTakeoff(gable(), { timber: timber ?? undefined, requested: { timber: true, underlay: false, covering: false }, specSnapshot: createSpecSnapshot([r, b]) });
  };
  const part = (result: ReturnType<typeof run>, id: "rafters" | "battens") => result.parts.find((item) => item.id === id)!;

  it("treats a fully omitted optional section as valid without inventing a volume", () => {
    const result = run({}, {});
    expect(manual("rafter", {}).issues).toEqual({});
    for (const id of ["rafters", "battens"] as const) {
      expect(part(result, id).status).toBe("VALID");
      expect(part(result, id).incompleteQuantities).toEqual([]);
      expect(part(result, id).quantities.some((quantity) => quantity.meaning === "NOMINAL")).toBe(false);
    }
    expect(result.status).toBe("VALID");
  });

  it("width-only and height-only are incomplete (not invalid) and keep lengths", () => {
    for (const entered of [{ sectionWidthMm: 80 }, { sectionHeightMm: 200 }] as Record<string, number>[]) {
      const spec = manual("rafter", entered);
      expect(spec.invalidKeys).toEqual([]);
      expect(Object.keys(spec.issues)).toHaveLength(1);
      const result = run(entered, {});
      expect(part(result, "rafters").status).toBe("VALID");
      expect(part(result, "rafters").incompleteQuantities).toHaveLength(1);
      expect(part(result, "rafters").quantities.find((quantity) => quantity.unit === "db")?.value).toBe(22);
      expect(result.status).toBe("VALID");
    }
  });

  it.each([["rafter", "rafters", "battens"], ["batten", "battens", "rafters"]] as const)("zero and negative %s dimensions are INVALID, keep geometric quantities and show no volume", (group, id, other) => {
    for (const bad of [{ sectionWidthMm: 0, sectionHeightMm: 200 }, { sectionWidthMm: 80, sectionHeightMm: -5 }, { sectionWidthMm: -1, sectionHeightMm: 0 }]) {
      const result = run(group === "rafter" ? bad : {}, group === "batten" ? bad : {});
      const target = part(result, id);
      expect(target.status).toBe("INVALID");
      expect(target.invalidInputs.length).toBeGreaterThan(0);
      expect(target.invalidInputs.every((message) => message.startsWith("Érvénytelen"))).toBe(true);
      expect(target.quantities.some((quantity) => quantity.meaning === "NOMINAL")).toBe(false);
      expect(target.quantities.find((quantity) => quantity.unit === "db")?.value).toBeGreaterThan(0);
      expect(part(result, other).status).toBe("VALID");
      expect(result.status).toBe("INVALID");
      expect(result.reasons.some((reason) => reason.includes("Érvénytelen"))).toBe(true);
    }
  });

  it("zero is invalid even when the other dimension is missing, and fractional values are invalid", () => {
    expect(manual("rafter", { sectionWidthMm: 0 }).invalidKeys).toEqual(["sectionWidthMm"]);
    expect(manual("batten", { sectionWidthMm: 50.5, sectionHeightMm: 30 }).invalidKeys).toEqual(["sectionWidthMm"]);
  });

  it("shows only the critical warnings that apply to the requested parts", () => {
    const covered = calculateRoofMaterialTakeoff(gable(), { requested: { timber: false, underlay: false, covering: true } });
    const coveringWarnings = roofTakeoffCriticalWarnings(covered.parts);
    expect(coveringWarnings).toContain("Hiányzó specifikáció miatt az eredmény nem teljes.");
    expect(coveringWarnings.some((warning) => warning.includes("statikai"))).toBe(false);
    expect(roofTakeoffCriticalWarnings(calculateRoofMaterialTakeoff(gable(), { requested: { timber: false, underlay: false, covering: false } }).parts)).toEqual([]);
    const timber = run({ sectionWidthMm: 0, sectionHeightMm: 10 }, {});
    const warnings = roofTakeoffCriticalWarnings(timber.parts);
    expect(warnings).toEqual(expect.arrayContaining(["A faanyag nem statikai igazolás.", "Érvénytelen adat: az érintett eredmény nem használható."]));
    expect(new Set(warnings).size).toBe(warnings.length);
  });
});

describe("gable front/rear overhang", () => {
  it("extends the roof length by both overhangs (independent derivation)", () => {
    const slope = 3 * Math.SQRT2 * m; // half span 3 m at 45°
    expect(gable().totalAreaMm2).toBeCloseTo(2 * 10 * m * slope, 0);
    expect(gable({ front: 500, rear: 300 }).totalAreaMm2).toBeCloseTo(2 * 10.8 * m * slope, 0);
    expect(gable({ front: 500, rear: 0 }).totalAreaMm2).toBeCloseTo(2 * 10.5 * m * slope, 0);
  });

  it("separates explicit zero from not-provided and rejects invalid values", () => {
    expect(overhangFromField(0)).toEqual({ valueMm: 0, state: "explicit" });
    expect(overhangFromField(null)).toEqual({ valueMm: 0, state: "not-provided" });
    expect(() => gable({ front: -1 })).toThrow();
  });
});

describe("timber cut-list calculator contract", () => {
  const input = { roofShape: "gable", lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 45, eaveOverhangMm: 0 };
  const timberOnly = { timber: { rafter: { maxSpacingMm: 1_000, startInsetMm: 0, endInsetMm: 0 } }, requested: { timber: true, underlay: false, covering: false } } as const;
  it("returns primary result lines from the existing timber engine", () => {
    const lines = takeoffLines(input, timberOnly);
    expect(lines.find((line) => line.label === "Szarufa · Geometriai tengely / vonal")?.value).toBe(22);
    expect(lines.find((line) => line.label === "Szarufa · Geometriai összhossz")?.value).toBeCloseTo(22 * 3 * Math.SQRT2, 3);
    expect(lines.some((line) => line.label.startsWith("Alátét") || line.label.startsWith("Fedő"))).toBe(false);
  });
  it("is empty without a layout rather than inventing quantities", () => {
    expect(takeoffLines(input, { requested: { timber: true, underlay: false, covering: false } })).toEqual([]);
  });
  it("applies the front/rear overhang through the shared mapping", () => {
    const count = takeoffLines({ ...input, frontGableOverhangMm: 1_000, rearGableOverhangMm: 1_000 }, timberOnly).find((line) => line.label === "Szarufa · Geometriai tengely / vonal")?.value;
    expect(count).toBe(26); // 12 m / 1 m spacing + 1 = 13 per plane
  });
});

describe("calculator UI", () => {
  it("keeps material calculator inputs in its lazy definition and renders a loading state on the server", async () => {
    const definition = await loadConstructionCalculatorDefinition("roof.material-takeoff");
    const html = renderToStaticMarkup(<ConstructionCalculatorSuite initialCalculatorId="roof.material-takeoff" />);
    expect(definition?.fields.some((field) => field.key === "frontGableOverhangMm")).toBe(true);
    expect(html).toContain("A kalkulátor betöltése…");
    expect(html).toContain("construction-suite-workspace is-loading");
  });
  it("keeps timber cut-list independent of covering and underlay inputs", async () => {
    const definition = await loadConstructionCalculatorDefinition("roof.timber-cutlist");
    const html = renderToStaticMarkup(<ConstructionCalculatorSuite initialCalculatorId="roof.timber-cutlist" />);
    expect(definition?.fields.some((field) => field.key === "roofShape")).toBe(true);
    expect(html).toContain("A kalkulátor betöltése…");
  });
});
