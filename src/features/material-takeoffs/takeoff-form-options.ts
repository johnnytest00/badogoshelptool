import type { MaterialPurchasingUnit } from "@/domain/materials/contracts";
import type { TakeoffMethod } from "@/domain/material-takeoffs/contracts";

export const areaSources = [
  { value: "combinedRoofM2", label: "Teljes tetőfelület (m²)" },
  { value: "individualRoofPlaneM2", label: "Egy tetősík felülete (m²)" },
  { value: "horizontalProjectedM2", label: "Vízszintes vetület (m²)" },
] as const;
export const linearSources = [
  { value: "ridgeLineMm", label: "Gerinc hossza (folyóméter)" },
  { value: "totalEaveEdgesMm", label: "Ereszélek összes hossza (folyóméter)" },
  { value: "totalSlopingGableEdgesMm", label: "Ferde oromélek összes hossza (folyóméter)" },
] as const;

export function methodForUnit(unit?: MaterialPurchasingUnit): TakeoffMethod {
  return unit === "square_meter" ? "area" : unit === "linear_meter" ? "linear" : "manual";
}

export function methodOptionsForUnit(unit?: MaterialPurchasingUnit): ReadonlyArray<{ value: TakeoffMethod; label: string }> {
  return [
    ...(unit === "square_meter" ? [{ value: "area" as const, label: "Tetőfelületből" }] : []),
    ...(unit === "linear_meter" ? [{ value: "linear" as const, label: "Tetőél hosszából" }] : []),
    { value: "manual", label: "Kézi mennyiség" },
  ];
}
