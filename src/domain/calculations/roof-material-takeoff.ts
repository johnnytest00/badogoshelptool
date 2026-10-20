import type { RoofGeometry } from "./roof-geometry";
import { calculateRoofCoveringLayout, type RoofCoveringLayout } from "./roof-covering-layout";
import type { RoofCoveringProductParameters } from "./roof-covering-parameters";
import { calculateRoofTimberLayout, type RoofTimberInput, type RoofTimberLayout, type RoofTimberUnavailable } from "./roof-timber-layout";
import { calculateRoofUnderlayLayout, type RoofUnderlayLayout, type RoofUnderlayParameters } from "./roof-underlay";
import type { RoofCalculationSnapshot } from "./roof-calculation-snapshot";
import type { MaterialGroup, ResolvedSpec, RoofMaterialSpecSnapshot } from "./roof-material-spec";

export type RoofMaterialTakeoffStatus = "VALID" | "INCOMPLETE" | "INVALID" | "UNSUPPORTED";

/** What a quantity means. PROCUREMENT is reserved: nothing here is promoted to a purchasing quantity. */
export type QuantityMeaning = "GEOMETRIC" | "LAYOUT" | "NOMINAL" | "PROCUREMENT";
export type RoofTakeoffPartId = "geometry" | "rafters" | "battens" | "underlay" | "covering";
export type RoofTakeoffQuantity = Readonly<{ label: string; value: number; unit: string; meaning: QuantityMeaning }>;
export type RoofTakeoffPart = Readonly<{
  /** Quantities that cannot be given yet, with the reason (e.g. volume without a complete cross-section). */
  incompleteQuantities: readonly Readonly<{ label: string; reason: string }>[];
  /** Wrong (not merely missing) input values; the part is INVALID but independent quantities stay available. */
  invalidInputs: readonly string[];
  id: RoofTakeoffPartId;
  label: string;
  requested: boolean;
  /** null when the part was not requested. */
  status: RoofMaterialTakeoffStatus | null;
  quantities: readonly RoofTakeoffQuantity[];
  /** Specification used for this part (value sources, selected profile); null for pure geometry. */
  specification: ResolvedSpec | null;
  limitations: readonly string[];
}>;

export type RoofMaterialTakeoff = Readonly<{
  status: RoofMaterialTakeoffStatus;
  parts: readonly RoofTakeoffPart[];
  specSnapshot: RoofMaterialSpecSnapshot | null;
  calculationSnapshot: RoofCalculationSnapshot | null;
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
  /** Which material groups were asked for; omitted means all (historical behaviour). Unrequested groups never affect the status. */
  requested?: Readonly<{ timber?: boolean; underlay?: boolean; covering?: boolean }>;
  specSnapshot?: RoofMaterialSpecSnapshot;
  /** Complete in-memory input snapshot, carried through to the result for reproduction. */
  calculationSnapshot?: RoofCalculationSnapshot;
}>;

function timberStatus(input: RoofTimberInput | undefined, geometry: RoofGeometry): RoofTimberLayout | RoofTimberUnavailable {
  if (!input) return { status: "unavailable", reason: "A szarufa- és léckiosztás adatai hiányoznak." };
  return calculateRoofTimberLayout(geometry, input);
}

function aggregateStatus(statuses: readonly (RoofMaterialTakeoffStatus | "PARTIAL")[]): RoofMaterialTakeoffStatus {
  if (statuses.includes("INVALID")) return "INVALID";
  if (statuses.includes("UNSUPPORTED")) return "UNSUPPORTED";
  if (statuses.includes("INCOMPLETE") || statuses.includes("PARTIAL")) return "INCOMPLETE";
  return "VALID";
}

/** Short, always-visible warnings; only those relevant to the requested parts. */
export function roofTakeoffCriticalWarnings(parts: readonly RoofTakeoffPart[]): string[] {
  const active = parts.filter((part) => part.requested && part.id !== "geometry");
  if (active.length === 0) return [];
  const warnings = ["Geometriai/kiosztási mennyiség, nem igazolt beszerzési mennyiség."];
  if (active.some((part) => part.id === "rafters" || part.id === "battens")) warnings.push("A faanyag nem statikai igazolás.");
  if (active.some((part) => part.status === "INVALID")) warnings.push("Érvénytelen adat: az érintett eredmény nem használható.");
  else if (active.some((part) => part.status === "INCOMPLETE" || part.incompleteQuantities.length > 0)) warnings.push("Hiányzó specifikáció miatt az eredmény nem teljes.");
  return warnings;
}

const specOf = (snapshot: RoofMaterialSpecSnapshot | undefined, group: MaterialGroup) => snapshot?.groups[group] ?? null;
const SHARED_LIMIT = "Nem beszerzési mennyiség: gyártói alkalmasságot, veszteséget és kivitelezési tervet nem tartalmaz.";

function timberParts(timber: RoofTimberLayout | RoofTimberUnavailable, timberRequested: boolean, snapshot?: RoofMaterialSpecSnapshot): RoofTakeoffPart[] {
  const family = (id: "rafters" | "battens", label: string, group: MaterialGroup): RoofTakeoffPart => {
    let requested = timberRequested;
    const result = timber.status === "available" ? timber[id] : null;
    const quantities: RoofTakeoffQuantity[] = result ? [
      { label: "Geometriai tengely / vonal", value: result.count, unit: "db", meaning: "LAYOUT" },
      { label: "Geometriai összhossz", value: result.totalLengthM, unit: "m", meaning: "LAYOUT" },
      ...(result.nominalVolumeM3 === null || result.nominalVolumeM3 === undefined ? [] : [{ label: "Névleges keresztmetszeti térfogat", value: result.nominalVolumeM3, unit: "m³", meaning: "NOMINAL" as const }]),
    ] : [];
    // A family the user did not configure (while the other one is) is simply not part of this takeoff.
    requested = requested && (timber.status === "unavailable" || result !== null);
    const spec = specOf(snapshot, group);
    const invalidInputs = requested && spec ? spec.invalidKeys.map((key) => spec.issues[key]) : [];
    const incompleteQuantities = requested && result && invalidInputs.length === 0 && spec && Object.keys(spec.issues).length > 0 ? [{ label: "Névleges keresztmetszeti térfogat", reason: Object.values(spec.issues)[0] }] : [];
    const status = !requested ? null : invalidInputs.length > 0 ? "INVALID" : timber.status === "unavailable" || !result ? "INCOMPLETE" : "VALID";
    return { id, label, requested, status, quantities, incompleteQuantities, invalidInputs, specification: specOf(snapshot, group), limitations: ["Névleges geometriai hossz vágási ráhagyás, toldás és statika nélkül.", SHARED_LIMIT] };
  };
  return [family("rafters", "Szarufa", "rafter"), family("battens", "Léc", "batten")];
}

/**
 * Runs the material-takeoff stages from one validated roof geometry.
 * Missing product/layout data remains explicitly incomplete; no defaults are inferred.
 */
export function calculateRoofMaterialTakeoff(geometry: RoofGeometry, inputs: RoofMaterialTakeoffInputs = {}): RoofMaterialTakeoff {
  const want = { timber: inputs.requested?.timber ?? true, underlay: inputs.requested?.underlay ?? true, covering: inputs.requested?.covering ?? true };
  const timber = timberStatus(inputs.timber, geometry);
  const underlay = calculateRoofUnderlayLayout(geometry, inputs.underlay ?? {});
  const covering = calculateRoofCoveringLayout(geometry, inputs.covering ?? { form: "sheet" });
  const reasons = [
    ...(want.timber && timber.status === "unavailable" ? [timber.reason] : []),
    ...(want.underlay ? underlay.reasons : []),
    ...(want.covering ? covering.reasons : []),
  ];
  const requestedStatuses = [
    ...(want.timber ? [timber.status === "unavailable" ? "INCOMPLETE" as const : "VALID" as const] : []),
    ...(want.underlay ? [underlay.status] : []),
    ...(want.covering ? [covering.status] : []),
  ];
  const snapshot = inputs.specSnapshot;
  const parts: RoofTakeoffPart[] = [
    { id: "geometry", label: "Tetőgeometria", requested: true, status: "VALID", specification: null, incompleteQuantities: [], invalidInputs: [], limitations: ["A síkterületek a megadott vízszintes méretekből és hajlásból számítottak."],
      quantities: [{ label: "Tetőfelület", value: geometry.totalAreaMm2 / 1_000_000, unit: "m²", meaning: "GEOMETRIC" }] },
    ...timberParts(timber, want.timber, snapshot),
    { id: "underlay", label: "Alátétfólia", requested: want.underlay, incompleteQuantities: [], invalidInputs: [], status: want.underlay ? underlay.status === "PARTIAL" ? "INCOMPLETE" : underlay.status : null, specification: specOf(snapshot, "underlay"),
      limitations: ["Vágási minimum teljes szélességű csíkokkal; felhajtás, áttörés és szélességi maradék nincs modellezve.", SHARED_LIMIT],
      quantities: underlay.courseCount === null ? [] : [
        { label: "Csíkok száma", value: underlay.courseCount, unit: "db", meaning: "LAYOUT" },
        { label: "Csíkok vágott hossza", value: (underlay.calculatedStripLengthMm ?? 0) / 1000, unit: "m", meaning: "LAYOUT" },
        ...(underlay.grossRequiredUnderlayAreaMm2 === null ? [] : [{ label: "Bruttó vágott fóliafelület", value: underlay.grossRequiredUnderlayAreaMm2 / 1_000_000, unit: "m²", meaning: "LAYOUT" as const }]),
        ...(underlay.rollCount === null ? [] : [{ label: "Tekercs · pontos vágási minimum", value: underlay.rollCount, unit: "db", meaning: "LAYOUT" as const }]),
      ] },
    { id: "covering", label: "Fedőtáblák", requested: want.covering, incompleteQuantities: [], invalidInputs: [], status: want.covering ? covering.status : null, specification: specOf(snapshot, "covering"),
      limitations: ["Teljes szélességű oszlopos kiosztás; szabásmaradékot nem használ újra, szegélyt, vápát és hulladékot nem modellez.", SHARED_LIMIT],
      quantities: covering.totalSheetCount === null ? [] : [
        { label: "Fedőtábla darabszám", value: covering.totalSheetCount, unit: "db", meaning: "LAYOUT" },
        { label: "Táblaoszlopok száma", value: covering.columnCount ?? 0, unit: "db", meaning: "LAYOUT" },
        { label: "Névleges táblafelület", value: (covering.totalNominalSheetAreaMm2 ?? 0) / 1_000_000, unit: "m²", meaning: "LAYOUT" },
      ] },
  ];
  const timberInvalid = parts.filter((part) => part.status === "INVALID" && (part.id === "rafters" || part.id === "battens"));
  const allReasons = [...reasons, ...timberInvalid.flatMap((part) => part.invalidInputs.map((reason) => `${part.label}: ${reason}`))];
  return { status: aggregateStatus([...requestedStatuses, ...(timberInvalid.length > 0 ? ["INVALID" as const] : [])]), parts, specSnapshot: snapshot ?? null, calculationSnapshot: inputs.calculationSnapshot ?? null, geometry, timber, underlay, covering, reasons: allReasons };
}
