import { calculateExistingRoofGeometry } from "./construction/roofs";
import type { RoofGeometryInput, RoofGeometryType } from "./roof-geometry";
import { overhangFromField, coveringParametersFromSpec, createSpecSnapshot, timberParametersFromSpecs, underlayParametersFromSpec, type ResolvedSpec, type RoofMaterialSpecSnapshot } from "./roof-material-spec";
import { calculateRoofMaterialTakeoff, type RoofMaterialTakeoff } from "./roof-material-takeoff";
import { roofTimberInputFromParameters, type RoofTimberParameters } from "./roof-timber-layout";

type Fields = Readonly<Record<string, unknown>>;
const num = (values: Fields, key: string) => Number(values[key]);
const optional = (values: Fields, key: string) => values[key] === undefined || values[key] === null || values[key] === "" ? null : Number(values[key]);

/** Maps calculator fields to the shared geometry input; invalid dimensions surface as the engine's own validation error. */
export function roofGeometryInputFromFields(shape: RoofGeometryType, values: Fields): RoofGeometryInput {
  const pitchDegrees = num(values, "pitchDegrees");
  const lengthMm = num(values, "lengthMm"), widthMm = num(values, "widthMm");
  if (shape === "gable") return { type: "gable", geometry: { inputMode: "angle", buildingLengthMm: lengthMm, buildingWidthMm: widthMm, roofPitchDegrees: pitchDegrees, eaveOverhangMm: num(values, "eaveOverhangMm"), frontGableOverhangMm: overhangFromField(optional(values, "frontGableOverhangMm")).valueMm, rearGableOverhangMm: overhangFromField(optional(values, "rearGableOverhangMm")).valueMm } };
  if (shape === "mansard") return { type: "mansard", lengthMm, widthMm, lowerRunMm: num(values, "lowerRunMm"), lowerRiseMm: num(values, "lowerRiseMm"), upperRiseMm: num(values, "upperRiseMm") };
  if (shape === "pyramid") return { type: "pyramid", sideMm: num(values, "sideMm"), pitchDegrees };
  if (shape === "halfHip") return { type: "halfHip", lengthMm, widthMm, pitchDegrees, hipEaveHeightMm: num(values, "hipEaveHeightMm") };
  if (shape === "lShape" || shape === "tShape") return { type: shape, lengthMm, widthMm, pitchDegrees, wingWidthMm: num(values, "wingWidthMm"), wingProjectionMm: num(values, "wingProjectionMm") };
  if (shape === "shed") return { type: "shed", lengthMm, widthMm, pitchDegrees, eaveOverhangMm: num(values, "eaveOverhangMm") };
  return { type: "hip", lengthMm, widthMm, pitchDegrees };
}

/** Complete, versioned input of one takeoff calculation. In-memory only: nothing here is persisted. */
export type RoofCalculationSnapshot = Readonly<{
  schemaVersion: 1;
  persisted: false;
  calculatorId: string;
  roofShape: RoofGeometryType;
  /** Numeric/text calculator fields exactly as entered (blank fields are absent, zero stays 0). */
  fields: Readonly<Record<string, number | string>>;
  requested: Readonly<{ timber: boolean; underlay: boolean; covering: boolean }>;
  timberLayout: RoofTimberParameters;
  specifications: RoofMaterialSpecSnapshot;
}>;

export function createCalculationSnapshot(input: Readonly<{
  calculatorId: string; roofShape: RoofGeometryType; fields: Fields; requested: RoofCalculationSnapshot["requested"]; timberLayout: RoofTimberParameters; specs: readonly ResolvedSpec[];
}>): RoofCalculationSnapshot {
  const fields = Object.fromEntries(Object.entries(input.fields).filter((entry): entry is [string, number | string] => (typeof entry[1] === "number" && !Number.isNaN(entry[1])) || (typeof entry[1] === "string" && entry[1] !== "")));
  return { schemaVersion: 1, persisted: false, calculatorId: input.calculatorId, roofShape: input.roofShape, fields, requested: input.requested, timberLayout: input.timberLayout, specifications: createSpecSnapshot(input.specs) };
}

/** Rebuilds the takeoff purely from a snapshot (also after a JSON round trip). */
export function replayRoofCalculation(snapshot: RoofCalculationSnapshot): RoofMaterialTakeoff {
  const specs = snapshot.specifications.groups;
  const empty = { values: {} } as const;
  const rafter = specs.rafter ?? empty, batten = specs.batten ?? empty, underlay = specs.underlay ?? empty, covering = specs.covering ?? { values: {}, referenceLabel: null };
  const geometry = calculateExistingRoofGeometry(roofGeometryInputFromFields(snapshot.roofShape, snapshot.fields));
  return calculateRoofMaterialTakeoff(geometry, {
    timber: roofTimberInputFromParameters(timberParametersFromSpecs(snapshot.timberLayout, rafter, batten)) ?? undefined,
    underlay: underlayParametersFromSpec(underlay), covering: coveringParametersFromSpec(covering), requested: snapshot.requested,
    specSnapshot: snapshot.specifications,
  });
}
