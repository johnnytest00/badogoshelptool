import type { RoofGeometry } from "./roof-geometry";
import { calculateRoofCoveringLayout, type RoofCoveringLayout } from "./roof-covering-layout";
import type { RoofCoveringProductParameters } from "./roof-covering-parameters";
import { calculateRoofTimberLayout, type RoofTimberInput, type RoofTimberLayout, type RoofTimberUnavailable } from "./roof-timber-layout";
import { calculateRoofUnderlayLayout, type RoofUnderlayLayout, type RoofUnderlayParameters } from "./roof-underlay";

export type RoofMaterialTakeoffStatus = "VALID" | "INCOMPLETE" | "INVALID" | "UNSUPPORTED";

export type RoofMaterialTakeoff = Readonly<{
  status: RoofMaterialTakeoffStatus;
  geometry: RoofGeometry;
  timber: RoofTimberLayout | RoofTimberUnavailable;
  underlay: RoofUnderlayLayout;
  covering: RoofCoveringLayout;
  reasons: readonly string[];
}>;

export type RoofMaterialTakeoffInputs = Readonly<{
  timber?: RoofTimberInput;
  underlay?: RoofUnderlayParameters;
  covering?: RoofCoveringProductParameters;
}>;

function timberStatus(input: RoofTimberInput | undefined, geometry: RoofGeometry): RoofTimberLayout | RoofTimberUnavailable {
  if (!input) return { status: "unavailable", reason: "A szarufa- és léckiosztás adatai hiányoznak." };
  return calculateRoofTimberLayout(geometry, input);
}

function aggregateStatus(timber: RoofTimberLayout | RoofTimberUnavailable, underlay: RoofUnderlayLayout, covering: RoofCoveringLayout): RoofMaterialTakeoffStatus {
  const statuses = [
    timber.status === "unavailable" ? "INCOMPLETE" : "VALID",
    underlay.status,
    covering.status,
  ] as const;
  if (statuses.includes("INVALID")) return "INVALID";
  if (statuses.includes("UNSUPPORTED")) return "UNSUPPORTED";
  if (statuses.includes("INCOMPLETE") || statuses.includes("PARTIAL")) return "INCOMPLETE";
  return "VALID";
}

/**
 * Runs the material-takeoff stages from one validated roof geometry.
 * Missing product/layout data remains explicitly incomplete; no defaults are inferred.
 */
export function calculateRoofMaterialTakeoff(geometry: RoofGeometry, inputs: RoofMaterialTakeoffInputs = {}): RoofMaterialTakeoff {
  const timber = timberStatus(inputs.timber, geometry);
  const underlay = calculateRoofUnderlayLayout(geometry, inputs.underlay ?? {});
  const covering = calculateRoofCoveringLayout(geometry, inputs.covering ?? { form: "sheet" });
  const reasons = [
    ...(timber.status === "unavailable" ? [timber.reason] : []),
    ...underlay.reasons,
    ...covering.reasons,
  ];
  return { status: aggregateStatus(timber, underlay, covering), geometry, timber, underlay, covering, reasons };
}
