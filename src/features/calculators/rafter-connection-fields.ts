import type { Field } from "./construction-calculator-types";

const connectionKeys = new Set(["birdsmouth", "seatCutHeightMm", "rafterDepthMm", "plateWidthMm", "purlinFaceMm", "purlinTopMm", "ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"]);

export const isRafterConnectionField = (field: Field, calculatorId: string) => connectionKeys.has(field.key)
  && !(calculatorId === "roof.rafter-cut" && field.key === "seatCutHeightMm");
