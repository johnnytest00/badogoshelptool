import type { RoofGeometryEdge, RoofGeometryInput } from "./roof-geometry";

export const ENGINEERING_LENGTH_TOLERANCE_MM = 1e-6;
export const ENGINEERING_AREA_TOLERANCE_MM2 = 1e-3;
export const ENGINEERING_RELATIVE_TOLERANCE = 1e-10;

export type RoofEngineeringReference = Readonly<{
  name: string;
  input: RoofGeometryInput;
  expectedProjectedAreaMm2: number;
  expectedSurfaceAreaMm2: number;
  expectedPitchDegrees: number;
  expectedEdgeLengthMm: Readonly<Record<RoofGeometryEdge["kind"], number>>;
  derivation: string;
}>;

const m = 1_000;
const sqrt2 = Math.SQRT2;
const sqrt3 = Math.sqrt(3);
const common = { lengthMm: 10 * m, widthMm: 6 * m, pitchDegrees: 45 } as const;

/**
 * Hand-derived DEMO references. Expected values are deliberately stored without
 * calling a production calculator so the fixtures remain an independent oracle.
 */
export const ROOF_ENGINEERING_REFERENCES: readonly RoofEngineeringReference[] = [
  {
    name: "DEMO félnyeregtető 10 × 6 m, 45°",
    input: { type: "shed", ...common },
    expectedProjectedAreaMm2: 60e6,
    expectedSurfaceAreaMm2: 60e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 10 * m, upper: 10 * m, ridge: 0, rake: 12 * m * sqrt2, hip: 0, valley: 0 },
    derivation: "A = 10·6/cos45°; one 10 m eave, one 10 m upper edge and two 6·√2 m rakes.",
  },
  {
    name: "DEMO nyeregtető 10 × 6 m, 3 m emelkedés",
    input: { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10 * m, buildingWidthMm: 6 * m, roofRiseMm: 3 * m, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } },
    expectedProjectedAreaMm2: 60e6,
    expectedSurfaceAreaMm2: 60e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 20 * m, upper: 0, ridge: 10 * m, rake: 12 * m * sqrt2, hip: 0, valley: 0 },
    derivation: "Two 10 × 3√2 m planes; two 10 m eaves, one 10 m ridge and four 3√2 m rakes.",
  },
  {
    name: "DEMO kontytető 10 × 6 m, 45°",
    input: { type: "hip", ...common },
    expectedProjectedAreaMm2: 60e6,
    expectedSurfaceAreaMm2: 60e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 32 * m, upper: 0, ridge: 4 * m, rake: 0, hip: 12 * m * sqrt3, valley: 0 },
    derivation: "10 × 6 m footprint; ridge 10−6 = 4 m; four hips have vector (3,3,3) m.",
  },
  {
    name: "DEMO sátortető 6 × 6 m, 45°",
    input: { type: "pyramid", sideMm: 6 * m, pitchDegrees: 45 },
    expectedProjectedAreaMm2: 36e6,
    expectedSurfaceAreaMm2: 36e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 24 * m, upper: 0, ridge: 0, rake: 0, hip: 12 * m * sqrt3, valley: 0 },
    derivation: "Four projected 9 m² triangles; four hips have vector (3,3,3) m.",
  },
  {
    name: "DEMO félkontyos tető 10 × 6 m, 45°, 1 m félkonty ereszmagasság",
    input: { type: "halfHip", ...common, hipEaveHeightMm: 1 * m },
    expectedProjectedAreaMm2: 60e6,
    expectedSurfaceAreaMm2: 60e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 28 * m, upper: 0, ridge: 6 * m, rake: 4 * m * sqrt2, hip: 8 * m * sqrt3, valley: 0 },
    derivation: "Each end cuts a 2 m ridge run; four hips have vector (2,2,2) m and four lower rake remnants have vector (0,1,1) m.",
  },
  {
    name: "DEMO L alakú tető 10 × 6 m + 4 × 5 m szárny, 45°",
    input: { type: "lShape", ...common, wingWidthMm: 4 * m, wingProjectionMm: 5 * m },
    expectedProjectedAreaMm2: 80e6,
    expectedSurfaceAreaMm2: 80e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 26 * m, upper: 0, ridge: 17 * m, rake: 16 * m * sqrt2, hip: 0, valley: 4 * m * sqrt3 },
    derivation: "Union footprint 10·6 + 4·5 m²; ridges 10+7 m; two valleys have vector (2,2,2) m.",
  },
  {
    name: "DEMO T alakú tető 10 × 6 m + 4 × 5 m szárny, 45°",
    input: { type: "tShape", ...common, wingWidthMm: 4 * m, wingProjectionMm: 5 * m },
    expectedProjectedAreaMm2: 80e6,
    expectedSurfaceAreaMm2: 80e6 * sqrt2,
    expectedPitchDegrees: 45,
    expectedEdgeLengthMm: { eave: 26 * m, upper: 0, ridge: 17 * m, rake: 16 * m * sqrt2, hip: 0, valley: 4 * m * sqrt3 },
    derivation: "Centred union footprint 10·6 + 4·5 m²; ridges 10+7 m; two valleys have vector (2,2,2) m.",
  },
] as const;
