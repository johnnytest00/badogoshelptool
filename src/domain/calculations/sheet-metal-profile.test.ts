import { describe, expect, it } from "vitest";
import { executeCalculator } from "@/domain/calculations/engine";
import { createProductionCalculatorRegistry } from "@/domain/calculations/registry";
import {
  calculateSheetMetalProfile, SHEET_METAL_PROFILE_CALCULATOR_ID, sheetMetalProfileCalculator,
  sheetMetalProfileOutputSchema,
  type SheetMetalProfileInput,
} from "@/domain/calculations/sheet-metal-profile";

const demoSource = { kind: "demo" as const, label: "DEMO matematikai tesztadat" };

function demoProfile(lengths: number[], turns: number[], options: { thickness?: number; radius?: number; k?: number; ba?: number; unknown?: boolean } = {}): SheetMetalProfileInput {
  const allowance = options.unknown ? { mode: "unknown" as const }
    : options.ba !== undefined ? { mode: "explicit_ba" as const, baMm: options.ba, source: demoSource }
      : { mode: "k_factor" as const, kFactor: options.k ?? 0.4, source: demoSource };
  return {
    schemaVersion: "1.0.0", label: "DEMO profil", coordinateConvention: "x-right-y-up", dimensionConvention: "finished_tangent",
    thicknessMm: options.thickness ?? 1,
    straights: lengths.map((tangentLengthMm, index) => ({ id: `s${index}`, tangentLengthMm, dimensionSource: demoSource })),
    bends: turns.map((signedTurnDeg, index) => ({ id: `b${index}`, signedTurnDeg, insideRadiusMm: options.radius ?? 1, allowance })),
  };
}

function succeed(raw: unknown) {
  const result = executeCalculator(sheetMetalProfileCalculator, raw);
  expect(result.ok, result.ok ? "" : JSON.stringify(result.errors)).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.output;
}

function fail(raw: unknown, code: string) {
  const result = executeCalculator(sheetMetalProfileCalculator, raw);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected calculation failure.");
  expect(result.errors.map((issue) => issue.code)).toContain(code);
  return result.errors;
}

describe("sheet_metal.profiles.flat-pattern — independent DEMO references", () => {
  it("1. computes an L profile with one 90° K-factor bend and analytic contours", () => {
    const result = succeed(demoProfile([30, 40], [90]));
    expect(result.bends[0].allowanceMm).toBeCloseTo(0.7 * Math.PI, 12);
    expect(result.flatPattern.widthMm).toBeCloseTo(72.199114857513, 9);
    expect(result.flatPattern.classification).toBe("PARAMETER_BASED_ESTIMATE");
    expect(result.geometry.segments[0].end).toEqual({ xMm: 30, yMm: 0 });
    expect(result.geometry.bends[0].center.xMm).toBeCloseTo(30, 12);
    expect(result.geometry.bends[0].center.yMm).toBeCloseTo(1.5, 12);
    expect(result.geometry.bends[0].innerArc.radiusMm).toBe(1);
    expect(result.geometry.bends[0].outerArc.radiusMm).toBe(2);
    const leftEnd = result.geometry.leftContour[0].end;
    const leftArcStart = result.geometry.leftContour[1].start;
    expect(Math.hypot(leftEnd.xMm - leftArcStart.xMm, leftEnd.yMm - leftArcStart.yMm)).toBeLessThan(1e-9);
    expect(result.geometry.segments[1].end.xMm).toBeCloseTo(31.5, 12);
    expect(result.geometry.segments[1].end.yMm).toBeCloseTo(41.5, 12);
    expect(result.flatPattern.bendLineOffsetsMm?.[0]).toBeCloseTo(30 + 0.35 * Math.PI, 12);
  });

  it("2. computes two same-direction bends as a U-like open chain", () => {
    const result = succeed(demoProfile([20, 30, 40], [90, 90]));
    expect(result.flatPattern.widthMm).toBeCloseTo(94.398229715026, 9);
    expect(result.geometry.segments[2].end.xMm).toBeCloseTo(-20, 12);
    expect(result.geometry.segments[2].end.yMm).toBeCloseTo(33, 12);
    expect(result.geometry.selfIntersectionStatus).toBe("clear");
  });

  it("3. handles opposite bend directions without subtracting allowance", () => {
    const result = succeed(demoProfile([20, 30, 40], [90, -90]));
    expect(result.flatPattern.widthMm).toBeCloseTo(94.398229715026, 9);
    expect(result.geometry.segments[2].directionRad).toBeCloseTo(0, 12);
    expect(result.geometry.segments[2].end.xMm).toBeCloseTo(63, 12);
    expect(result.geometry.segments[2].end.yMm).toBeCloseTo(33, 12);
    expect(result.geometry.bends[1].innerArc.radiusMm).toBe(1);
    expect(result.geometry.bends[1].outerArc.radiusMm).toBe(2);
  });

  it("4. changes the mathematical allowance with explicit thickness", () => {
    const result = succeed(demoProfile([30, 40], [90], { thickness: 2 }));
    expect(result.bends[0].allowanceMm).toBeCloseTo(0.9 * Math.PI, 12);
    expect(result.flatPattern.widthMm).toBeCloseTo(72.827433388231, 9);
  });

  it("5. uses explicit BA once without requiring a K-factor", () => {
    const result = succeed(demoProfile([30, 40], [90], { ba: 3 }));
    expect(result.flatPattern).toMatchObject({ widthMm: 73, method: "explicit_ba" });
    expect(result.bends[0].neutralRadiusMm).toBeNull();
    expect(result.parameterSnapshot[0]).toMatchObject({ mode: "explicit_ba", value: 3, source: demoSource });
  });

  it("6. preserves geometry and returns null width when bend data is missing", () => {
    const result = succeed(demoProfile([30, 40], [90], { unknown: true }));
    expect(result.geometry.segments).toHaveLength(2);
    expect(result.flatPattern).toMatchObject({ widthMm: null, bendLineOffsetsMm: null, method: null, classification: "INCOMPLETE" });
    expect(result.issues[0]).toMatchObject({ code: "MISSING_BEND_PARAMETER", path: ["bends", "0", "allowance"] });
  });

  it("7. keeps outside virtual-sharp dimensions distinct from tangent inputs", () => {
    const converted = succeed(demoProfile([38, 48], [90]));
    // Independent outside-dimension reference: A_out+B_out-(2*OSSB-BA), OSSB=(R+t)*tan(45°)=2.
    expect(converted.flatPattern.widthMm).toBeCloseTo(88.199114857513, 9);
    expect(converted.bends[0].bendDeductionMm).toBeCloseTo(1.800885142487, 9);
    const error = fail({ ...demoProfile([40, 50], [90]), dimensionConvention: "outside_virtual_sharp" }, "UNSUPPORTED_OPERATION");
    expect(error[0].message).toContain("tangensméret");
  });

  it("8. rejects the negative tangent created by impossible outside dimensions", () => {
    fail(demoProfile([20, -3, 20], [90, 90]), "VALIDATION_ERROR");
  });

  it("9. preserves the small-angle result and rejects a zero turn", () => {
    const result = succeed(demoProfile([30, 40], [0.001]));
    expect(result.bends[0].allowanceMm).toBeCloseTo(0.000024434610, 12);
    expect(result.flatPattern.widthMm).toBeCloseTo(70.000024434610, 9);
    fail(demoProfile([30, 40], [0]), "VALIDATION_ERROR");
  });
});

describe("profile domain validation and registry", () => {
  it("rejects self-intersecting material contours", () => {
    fail(demoProfile([20, 20, 18, 30], [90, 90, 90]), "INVALID_GEOMETRY");
  });

  it("distinguishes 60° deflection from a 120° included angle", () => {
    const result = succeed(demoProfile([30, 40], [60]));
    expect(result.bends[0].includedAngleDeg).toBe(120);
    expect(result.bends[0].thetaRad).toBeCloseTo(Math.PI / 3, 12);
    expect(result.flatPattern.widthMm).toBeCloseTo(70 + 1.4 * Math.PI / 3, 12);
    expect(result.geometry.segments[1].directionRad).toBeCloseTo(Math.PI / 3, 12);
  });

  it("rejects 180° hems, out-of-range K, conflicting bend inputs and unsupported shapes", () => {
    fail(demoProfile([30, 40], [180]), "VALIDATION_ERROR");
    fail(demoProfile([30, 40], [90], { k: 1.1 }), "VALIDATION_ERROR");
    const base = demoProfile([30, 40], [90]);
    fail({ ...base, bends: [{ ...base.bends[0], allowance: { mode: "k_factor", kFactor: 0.4, baMm: 3, source: demoSource } }] }, "VALIDATION_ERROR");
    fail({ ...base, hem: true }, "VALIDATION_ERROR");
  });

  it("rejects non-finite, unsafe, duplicate and structurally invalid inputs", () => {
    const base = demoProfile([30, 40], [90]);
    for (const thicknessMm of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER]) {
      fail({ ...base, thicknessMm }, "VALIDATION_ERROR");
    }
    fail({ ...base, straights: [{ ...base.straights[0], tangentLengthMm: Number.MAX_SAFE_INTEGER }, base.straights[1]] }, "VALIDATION_ERROR");
    fail({ ...base, bends: [{ ...base.bends[0], insideRadiusMm: -1 }] }, "VALIDATION_ERROR");
    fail({ ...base, straights: [base.straights[0]] }, "VALIDATION_ERROR");
    fail({ ...base, bends: [{ ...base.bends[0], id: "s0" }] }, "VALIDATION_ERROR");
  });

  it("rejects coordinate extent overflow without rounding", () => {
    fail(demoProfile([600_000, 600_000], [90]), "NUMERIC_OVERFLOW");
  });

  it("keeps a straight strip geometrically determined and a mixed-mode result parameter based", () => {
    const strip = succeed(demoProfile([70], []));
    expect(strip.flatPattern).toMatchObject({ widthMm: 70, method: "no_bends", classification: "GEOMETRICALLY_DETERMINED" });
    const mixed = demoProfile([20, 30, 40], [90, -90]);
    mixed.bends[1] = { ...mixed.bends[1], allowance: { mode: "explicit_ba", baMm: 3, source: demoSource } };
    const output = succeed(mixed);
    expect(output.flatPattern).toMatchObject({ method: "mixed", classification: "PARAMETER_BASED_ESTIMATE" });
    expect(output.flatPattern.widthMm).toBeCloseTo(90 + 0.7 * Math.PI + 3, 12);
  });

  it("does not promote an unverified machine source to a calibrated result", () => {
    const base = demoProfile([30, 40], [90]);
    const output = succeed({ ...base, bends: [{ ...base.bends[0], allowance: { mode: "k_factor", kFactor: 0.4,
      source: { kind: "machine_calibration", label: "DEMO hivatkozás", machineId: "DEMO gép", toolingId: "DEMO szerszám", calibrationId: "DEMO próba" } } }] });
    expect(output.flatPattern.classification).toBe("PARAMETER_BASED_ESTIMATE");
    expect(output.issues.map((issue) => issue.code)).toContain("CALIBRATION_UNVERIFIED");
  });

  it("flags an explicit BA outside the ideal neutral-axis range without changing it", () => {
    const output = succeed(demoProfile([30, 40], [90], { ba: 5 }));
    expect(output.flatPattern.widthMm).toBe(75);
    expect(output.issues.map((issue) => issue.code)).toContain("BA_OUTSIDE_IDEAL_NEUTRAL_RANGE");
  });

  it("rejects numerically collapsed arcs before reporting a misleading flat width", () => {
    fail(demoProfile([30, 40], [0.000001], { radius: 0.000001, thickness: 0.000001 }), "INVALID_GEOMETRY");
  });

  it("returns byte-for-byte deterministic outputs and resolves through the production registry", () => {
    const input = demoProfile([20, 30, 40], [90, -90]);
    expect(JSON.stringify(calculateSheetMetalProfile(input))).toBe(JSON.stringify(calculateSheetMetalProfile(input)));
    const registry = createProductionCalculatorRegistry();
    const result = registry.execute(SHEET_METAL_PROFILE_CALCULATOR_ID, input);
    expect(result.ok).toBe(true);
    if (result.ok) expect(sheetMetalProfileOutputSchema.parse(result.output).flatPattern.widthMm).toBeCloseTo(94.398229715026, 9);
  });
});
