import { z } from "zod";
import { calculationError } from "@/domain/calculations/errors";
import { CalculatorDefinition } from "@/domain/calculations/engine";

export const GABLE_CALCULATOR_ID = "roof.gable" as const;
export const GABLE_CALCULATOR_VERSION = "1.0.0" as const;
export const GABLE_INPUT_SCHEMA_VERSION = "1.0.0" as const;
export const GABLE_RESULT_SCHEMA_VERSION = "1.0.0" as const;

const finiteNonNegativeInteger = z.number().finite().int().nonnegative();
const positiveInteger = z.number().finite().int().positive();
const overhangSchema = finiteNonNegativeInteger;

const sharedInput = {
  buildingLengthMm: positiveInteger,
  buildingWidthMm: positiveInteger,
  eaveOverhangMm: overhangSchema,
  frontGableOverhangMm: overhangSchema,
  rearGableOverhangMm: overhangSchema,
} as const;

export const gableRoofInputSchema = z.discriminatedUnion("inputMode", [
  z.object({ ...sharedInput, inputMode: z.literal("height"), roofRiseMm: positiveInteger }),
  z.object({ ...sharedInput, inputMode: z.literal("angle"), roofPitchDegrees: z.number().finite().positive().lt(90) }),
]);

export type GableRoofInput = z.infer<typeof gableRoofInputSchema>;
export type RoofVertex = Readonly<{ xMm: number; yMm: number; zMm: number }>;
export type RoofPlane = Readonly<{ side: "left" | "right"; areaMm2: number; vertices: readonly RoofVertex[] }>;

export type GableRoofOutput = Readonly<{
  dimensions: Readonly<{
    buildingLengthMm: number;
    buildingWidthMm: number;
    overallRoofLengthMm: number;
    horizontalRoofWidthMm: number;
    horizontalSlopeRunMm: number;
  }>;
  angles: Readonly<{ pitchDegrees: number; pitchRadians: number }>;
  heights: Readonly<{ roofRiseMm: number; eaveLevelMm: number }>;
  lengths: Readonly<{
    halfSpanMm: number;
    slopeLengthToWallMm: number;
    slopeLengthIncludingEaveMm: number;
    ridgeLineMm: number;
    eachEaveEdgeMm: number;
    totalEaveEdgesMm: number;
    eachSlopingGableEdgeMm: number;
    totalSlopingGableEdgesMm: number;
  }>;
  areas: Readonly<{
    individualRoofPlaneMm2: number;
    combinedRoofMm2: number;
    horizontalProjectedMm2: number;
    individualRoofPlaneM2: number;
    combinedRoofM2: number;
    horizontalProjectedM2: number;
  }>;
  planes: readonly RoofPlane[];
  geometryNotes: readonly string[];
}>;

function finiteResult(value: number, label: string): number {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw calculationError("NUMERIC_OVERFLOW", `${label} nem ábrázolható biztonságosan.`);
  }
  return value;
}

function squareMeters(areaMm2: number): number {
  return areaMm2 / 1_000_000;
}

function calculateGableRoof(input: GableRoofInput): GableRoofOutput {
  const halfSpanMm = input.buildingWidthMm / 2;
  if (halfSpanMm <= 0) throw calculationError("INVALID_DIMENSION", "Az épület szélessége nem lehet nulla.");

  const pitchRadians = input.inputMode === "height"
    ? Math.atan2(input.roofRiseMm, halfSpanMm)
    : (input.roofPitchDegrees * Math.PI) / 180;
  const roofRiseMm = input.inputMode === "height"
    ? input.roofRiseMm
    : halfSpanMm * Math.tan(pitchRadians);
  const pitchDegrees = (pitchRadians * 180) / Math.PI;
  const horizontalSlopeRunMm = halfSpanMm + input.eaveOverhangMm;
  const slopeFactor = Math.hypot(1, Math.tan(pitchRadians));
  const slopeLengthToWallMm = Math.hypot(halfSpanMm, roofRiseMm);
  const slopeLengthIncludingEaveMm = horizontalSlopeRunMm * slopeFactor;
  const overallRoofLengthMm = input.buildingLengthMm + input.frontGableOverhangMm + input.rearGableOverhangMm;
  const individualRoofPlaneMm2 = overallRoofLengthMm * slopeLengthIncludingEaveMm;
  const combinedRoofMm2 = individualRoofPlaneMm2 * 2;
  const horizontalRoofWidthMm = input.buildingWidthMm + input.eaveOverhangMm * 2;
  const horizontalProjectedMm2 = overallRoofLengthMm * horizontalRoofWidthMm;
  const eaveLevelMm = -input.eaveOverhangMm * Math.tan(pitchRadians);
  const startX = -input.frontGableOverhangMm;
  const endX = input.buildingLengthMm + input.rearGableOverhangMm;
  const leftEaveY = -horizontalSlopeRunMm;
  const rightEaveY = horizontalSlopeRunMm;
  const ridge = (xMm: number): RoofVertex => ({ xMm, yMm: 0, zMm: roofRiseMm });
  const leftEave = (xMm: number): RoofVertex => ({ xMm, yMm: leftEaveY, zMm: eaveLevelMm });
  const rightEave = (xMm: number): RoofVertex => ({ xMm, yMm: rightEaveY, zMm: eaveLevelMm });
  const leftPlaneVertices = [leftEave(startX), leftEave(endX), ridge(endX), ridge(startX)] as const;
  const rightPlaneVertices = [ridge(startX), ridge(endX), rightEave(endX), rightEave(startX)] as const;

  const result = {
    dimensions: {
      buildingLengthMm: input.buildingLengthMm,
      buildingWidthMm: input.buildingWidthMm,
      overallRoofLengthMm,
      horizontalRoofWidthMm,
      horizontalSlopeRunMm,
    },
    angles: { pitchDegrees, pitchRadians },
    heights: { roofRiseMm, eaveLevelMm },
    lengths: {
      halfSpanMm,
      slopeLengthToWallMm,
      slopeLengthIncludingEaveMm,
      ridgeLineMm: overallRoofLengthMm,
      eachEaveEdgeMm: overallRoofLengthMm,
      totalEaveEdgesMm: overallRoofLengthMm * 2,
      eachSlopingGableEdgeMm: slopeLengthIncludingEaveMm,
      totalSlopingGableEdgesMm: slopeLengthIncludingEaveMm * 4,
    },
    areas: {
      individualRoofPlaneMm2,
      combinedRoofMm2,
      horizontalProjectedMm2,
      individualRoofPlaneM2: squareMeters(individualRoofPlaneMm2),
      combinedRoofM2: squareMeters(combinedRoofMm2),
      horizontalProjectedM2: squareMeters(horizontalProjectedMm2),
    },
    planes: [
      { side: "left" as const, areaMm2: individualRoofPlaneMm2, vertices: leftPlaneVertices },
      { side: "right" as const, areaMm2: individualRoofPlaneMm2, vertices: rightPlaneVertices },
    ],
    geometryNotes: [
      "Az X tengely a hosszanti, az Y a keresztirányú, a Z a függőleges irány.",
      "A fal megtámasztási síkja Z = 0; az eresz túlnyúlásának Z értéke ezért negatív lehet.",
      "A ferde hossz geometriai érték, nem igazolt szerkezeti szarufavágási hossz.",
    ],
  } as const;

  return JSON.parse(JSON.stringify(result, (_key, value: unknown) => typeof value === "number" ? finiteResult(value, "A számított eredmény") : value)) as GableRoofOutput;
}

export const gableRoofCalculator: CalculatorDefinition<GableRoofInput, GableRoofOutput> = {
  id: GABLE_CALCULATOR_ID,
  implementationVersion: GABLE_CALCULATOR_VERSION,
  inputSchemaVersion: GABLE_INPUT_SCHEMA_VERSION,
  resultSchemaVersion: GABLE_RESULT_SCHEMA_VERSION,
  inputSchema: gableRoofInputSchema,
  outputSchema: z.object({
    dimensions: z.object({ buildingLengthMm: z.number(), buildingWidthMm: z.number(), overallRoofLengthMm: z.number(), horizontalRoofWidthMm: z.number(), horizontalSlopeRunMm: z.number() }),
    angles: z.object({ pitchDegrees: z.number(), pitchRadians: z.number() }),
    heights: z.object({ roofRiseMm: z.number(), eaveLevelMm: z.number() }),
    lengths: z.object({ halfSpanMm: z.number(), slopeLengthToWallMm: z.number(), slopeLengthIncludingEaveMm: z.number(), ridgeLineMm: z.number(), eachEaveEdgeMm: z.number(), totalEaveEdgesMm: z.number(), eachSlopingGableEdgeMm: z.number(), totalSlopingGableEdgesMm: z.number() }),
    areas: z.object({ individualRoofPlaneMm2: z.number(), combinedRoofMm2: z.number(), horizontalProjectedMm2: z.number(), individualRoofPlaneM2: z.number(), combinedRoofM2: z.number(), horizontalProjectedM2: z.number() }),
    planes: z.array(z.object({ side: z.enum(["left", "right"]), areaMm2: z.number(), vertices: z.array(z.object({ xMm: z.number(), yMm: z.number(), zMm: z.number() })) })),
    geometryNotes: z.array(z.string()),
  }) as z.ZodType<GableRoofOutput>,
  calculate: calculateGableRoof,
};

export { calculateGableRoof };
