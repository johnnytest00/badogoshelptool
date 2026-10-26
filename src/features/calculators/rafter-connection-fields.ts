import type { Field } from "./construction-calculator-types";

const connectionKeys = new Set(["birdsmouth", "seatCutHeightMm", "rafterDepthMm", "plateWidthMm", "purlinFaceMm", "purlinTopMm", "ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"]);

export const isRafterConnectionField = (field: Field, calculatorId: string) => connectionKeys.has(field.key)
  && !(calculatorId === "roof.rafter-cut" && field.key === "seatCutHeightMm");

/**
 * M10 Fázis 0: the HAP and ridge-connection fields shared, same key and meaning, by roof.rafter-cut and the
 * roof.material-takeoff/roof.timber-cutlist joint fields (see roof-calculator-definitions.ts birdsmouthFields).
 * rafterDepthMm and plateWidthMm's sibling geometry fields are deliberately excluded: the target calculators
 * don't have a rafterDepthMm field, and the rest (half span, rise, eave projection) are a different geometry
 * model and are not proven to share a reference point (see docs/M10_UNIFIED_WORKFLOW_DESIGN.md §4.2-4.3).
 */
export const RAFTER_JOINT_TRANSFER_FIELD_KEYS = ["seatCutHeightMm", "plateWidthMm", "purlinFaceMm", "purlinTopMm", "ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"] as const;

/** Only the transferable keys that actually have a value in the source; the checkbox that reveals them in the target is added by the caller. */
export function rafterJointTransferValues(sourceFields: Readonly<Record<string, string>>): Record<string, string> {
  return Object.fromEntries(RAFTER_JOINT_TRANSFER_FIELD_KEYS.flatMap((key) => sourceFields[key] ? [[key, sourceFields[key]]] : []));
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
