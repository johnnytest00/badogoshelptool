import type { Field } from "./construction-calculator-types";

const connectionKeys = new Set(["birdsmouth", "seatCutHeightMm", "rafterDepthMm", "plateWidthMm", "purlinFaceMm", "purlinTopMm", "ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"]);

export const isRafterConnectionField = (field: Field, calculatorId: string) => connectionKeys.has(field.key)
  && !(calculatorId === "roof.rafter-cut" && field.key === "seatCutHeightMm");

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
