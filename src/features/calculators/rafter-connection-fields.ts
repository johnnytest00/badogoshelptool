import { convertGableGeometryFromRafterCut, convertRafterCutGeometryFromGable } from "@/domain/calculations/construction/roofs";
import type { RafterCutTransferSource } from "@/features/calculations/construction-data";
import type { Field } from "./construction-calculator-types";

const connectionKeys = new Set(["birdsmouth", "seatCutHeightMm", "rafterDepthMm", "plateWidthMm", "purlinFaceMm", "purlinTopMm", "ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"]);

export const isRafterConnectionField = (field: Field, calculatorId: string) => connectionKeys.has(field.key)
  && !(calculatorId === "roof.rafter-cut" && field.key === "seatCutHeightMm");

/**
 * M10 Fázis 0: the HAP and ridge-connection fields shared, same key and meaning, by roof.rafter-cut and the
 * roof.material-takeoff/roof.timber-cutlist joint fields (see roof-calculator-definitions.ts birdsmouthFields).
 * rafterDepthMm and plateWidthMm's sibling geometry fields are deliberately excluded: the target calculators
 * don't have a rafterDepthMm field.
 *
 * M10 Fázis 1: `eaveProjectionMm` (rafter-cut) added, mapped onto the target's `eaveOverhangMm` key. Proven
 * equivalent, not just by label text but by the domain formulas themselves: rafter-cut's
 * `horizontalRunMm = horizontalHalfSpanMm + eaveProjectionMm` (src/domain/calculations/construction/roofs.ts)
 * and the gable-roof engine's `horizontalSlopeRunMm = halfSpanMm + eaveOverhangMm`, where
 * `halfSpanMm = buildingWidthMm / 2` (src/domain/calculations/gable-roof.ts) — both add the value onto the
 * half-span from the same wall-plate reference point, horizontally, to the eave edge. `eaveOverhangMm` is only
 * a field on the "gable"/"shed" roof shapes (see roofShapeFields in roof-calculator-definitions.ts); on other
 * shapes the written draft value is simply unused, same as any other shape-gated field.
 *
 * Still deliberately excluded: `horizontalHalfSpanMm`/`riseMm` ↔ the target's `widthMm`/`pitchDegrees`. The
 * half-span-to-width relationship (`halfSpanMm = buildingWidthMm / 2`) only holds for the symmetric
 * gable/shed roof model; it has not been verified for the hip/pyramid/half-hip/L/T/mansard shapes the target
 * calculators also support, and converting (not copying) a value is exactly the automatic-recalculation case
 * docs/M10_UNIFIED_WORKFLOW_DESIGN.md §4.3/§9 says must not be offered without that per-shape proof.
 */
const RAFTER_JOINT_TRANSFER_FIELD_MAP: Readonly<Record<string, string>> = {
  seatCutHeightMm: "seatCutHeightMm", plateWidthMm: "plateWidthMm", purlinFaceMm: "purlinFaceMm", purlinTopMm: "purlinTopMm",
  ridgeJoint: "ridgeJoint", ridgeBoardThicknessMm: "ridgeBoardThicknessMm", ridgePurlinWidthMm: "ridgePurlinWidthMm", ridgePurlinTopMm: "ridgePurlinTopMm",
  eaveProjectionMm: "eaveOverhangMm",
};
export const RAFTER_JOINT_TRANSFER_FIELD_KEYS = Object.keys(RAFTER_JOINT_TRANSFER_FIELD_MAP);

/** Only the transferable keys that actually have a value in the source, keyed by the TARGET field; the checkbox that reveals them in the target is added by the caller. */
export function rafterJointTransferValues(sourceFields: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(RAFTER_JOINT_TRANSFER_FIELD_MAP).flatMap(([sourceKey, targetKey]) => sourceFields[sourceKey] ? [[targetKey, sourceFields[sourceKey]]] : []));
}

/**
 * M10 Fázis 1: a confirmed transfer's full field set — the joint/eave fields always, plus widthMm/pitchDegrees
 * only for a gable target with explicit, caller-confirmed symmetry acceptance and a successfully converted
 * source geometry. Pure and independently testable (no Supabase/server import), used by both the preview and
 * the confirm step so they can never disagree (see construction-field-transfer-control.tsx).
 */
export function rafterCutTransferFields(source: RafterCutTransferSource, roofShape: string, symmetryConfirmed: boolean): Readonly<Record<string, string>> {
  const conversion = roofShape === "gable" && symmetryConfirmed ? convertGableGeometryFromRafterCut(source.geometry) : null;
  const gableFields: Readonly<Record<string, string>> = conversion?.ok ? { widthMm: String(conversion.widthMm), pitchDegrees: String(conversion.pitchDegrees) } : {};
  return { ...source.fields, ...gableFields, birdsmouth: "true" };
}

/**
 * M10.2: the exact inverse of RAFTER_JOINT_TRANSFER_FIELD_MAP, for a roof.material-takeoff/roof.timber-cutlist
 * source transferring its Karmi/gerinc/eresz fields into roof.rafter-cut (same keys, same meaning — only the
 * direction is new). Derived, not duplicated, so the two directions can never drift apart.
 */
const ROOF_SHAPE_TO_RAFTER_CUT_FIELD_MAP: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(RAFTER_JOINT_TRANSFER_FIELD_MAP).map(([rafterCutKey, roofShapeKey]) => [roofShapeKey, rafterCutKey]));

/** Only the transferable keys with a value in the source, keyed by the rafter-cut TARGET field. */
export function roofShapeToRafterCutTransferValues(sourceFields: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(Object.entries(ROOF_SHAPE_TO_RAFTER_CUT_FIELD_MAP).flatMap(([sourceKey, targetKey]) => sourceFields[sourceKey] ? [[targetKey, sourceFields[sourceKey]]] : []));
}

/**
 * M10.2: a confirmed transfer from a saved roof.material-takeoff/roof.timber-cutlist source into roof.rafter-cut
 * — the joint/eave fields always, plus horizontalHalfSpanMm/riseMm/eaveProjectionMm only when the source itself
 * is a symmetric gable roof and the caller has explicitly confirmed that symmetry. Mirrors rafterCutTransferFields.
 */
export function rafterCutTargetTransferFields(source: Readonly<{ fields: Readonly<Record<string, string>>; geometry: Readonly<{ widthMm?: string; pitchDegrees?: string; eaveOverhangMm?: string; seatCutHeightMm?: string }> }>, sourceRoofShape: string, symmetryConfirmed: boolean): Readonly<Record<string, string>> {
  const conversion = sourceRoofShape === "gable" && symmetryConfirmed ? convertRafterCutGeometryFromGable(source.geometry) : null;
  const geometryFields: Readonly<Record<string, string>> = conversion?.ok
    ? { horizontalHalfSpanMm: String(conversion.horizontalHalfSpanMm), riseMm: String(conversion.riseMm), eaveProjectionMm: String(conversion.eaveProjectionMm) }
    : {};
  return { ...roofShapeToRafterCutTransferValues(source.fields), ...geometryFields };
}

export type AppliedTransfer = Readonly<{ newFields: Readonly<Record<string, string>>; snapshot: Readonly<Record<string, string>> }>;
export type GeometryInvalidation = Readonly<{ resetFields: Readonly<Record<string, string>>; nextApplied: AppliedTransfer | null }>;
const GABLE_GEOMETRY_KEYS = ["widthMm", "pitchDegrees"] as const;

/**
 * M10.1.2 P1 (docs/M10_PHASE1_INDEPENDENT_QA.md §6), M10.1.3 per-field fix
 * (docs/M10_PHASE1_FINAL_INDEPENDENT_QA.md §16.4): the pure transition behind the owning component's
 * roof-shape-change handling. widthMm/pitchDegrees are only valid as a symmetric-gable transfer; leaving
 * "gable" must not let them silently keep driving another shape's calculation. Each of the two keys is
 * checked, and reset, independently: a manual edit to one must not block the other (still untouched since
 * confirm) from being invalidated. Never touches the non-geometry (Karmi/eave) transferred fields.
 */
export function invalidateGableGeometryOnShapeChange(previousRoofShape: string, roofShape: string, applied: AppliedTransfer | null, currentFields: Readonly<Record<string, string>>): GeometryInvalidation | null {
  if (previousRoofShape !== "gable" || roofShape === "gable" || !applied) return null;
  const geometryKeys = GABLE_GEOMETRY_KEYS.filter((key) => applied.newFields[key] !== undefined);
  if (geometryKeys.length === 0) return null;
  const untouchedKeys = geometryKeys.filter((key) => (currentFields[key] ?? "") === applied.newFields[key]);
  if (untouchedKeys.length === 0) return null;
  const resetFields = Object.fromEntries(untouchedKeys.map((key) => [key, applied.snapshot[key] ?? ""]));
  const remainingKeys = Object.keys(applied.newFields).filter((key) => !(untouchedKeys as readonly string[]).includes(key));
  const nextApplied: AppliedTransfer | null = remainingKeys.length === 0 ? null : {
    newFields: Object.fromEntries(remainingKeys.map((key) => [key, applied.newFields[key]])),
    snapshot: Object.fromEntries(remainingKeys.map((key) => [key, applied.snapshot[key]])),
  };
  return { resetFields, nextApplied };
}

export type JointGroupState = Readonly<{ tone: "empty" | "ok" | "limited" | "invalid" | "unsupported"; label: string }>;

/** M9.15.1 section state from the joint statuses of one group (presentation only; the completeness check stays in computeConstruction). */
export function jointGroupState(statuses: readonly string[], optional: boolean): JointGroupState {
  if (statuses.includes("invalid")) return { tone: "invalid", label: "Hibás vagy ellentmondásos geometria" };
  const computed = statuses.filter((status) => status === "computed").length;
  const blocked = statuses.filter((status) => status === "unsupported" || status === "not-applicable").length;
  if (computed > 0) return computed + blocked === statuses.length && blocked === 0 ? { tone: "ok", label: "Számítható" } : { tone: "limited", label: "Dokumentált korláttal számítható" };
  if (blocked > 0 && blocked === statuses.length) return { tone: "unsupported", label: "Nem támogatott" };
  return { tone: "empty", label: statuses.length === 0 && optional ? "Nincs megadva · opcionális" : "Nincs még elég adat" };
}

/** M9.15.3: the Karmi line of the separate feature status; independent of the material takeoff's completeness. */
export function karmiStatusText(seat: readonly { status: string; missing?: readonly string[]; reason?: string }[], planesAvailable: boolean): JointGroupState {
  if (!planesAvailable) return { tone: "unsupported", label: "Ennél a tetőformánál a bevágás csak szarufakiosztással számolható: kapcsold be a Faanyag csempét, és add meg a szarufák tengelytávolságát." };
  const invalid = seat.find((item) => item.status === "invalid");
  if (invalid) return { tone: "invalid", label: `A bevágás nem számítható: ${invalid.reason ?? "hibás vagy ellentmondásos geometria"}.` };
  if (seat.some((item) => item.status === "computed")) return { tone: seat.every((item) => item.status === "computed") ? "ok" : "limited", label: "A megadott geometria alapján a bevágási előnézet elkészült." };
  const missing = [...new Set(seat.flatMap((item) => item.missing ?? []))];
  return missing.length > 0 ? { tone: "empty", label: `A bevágáshoz még hiányzik: ${missing.join(", ")}.` } : { tone: "unsupported", label: seat[0]?.reason ?? "A bevágás ezen a tetőoldalon nem értelmezett." };
}
