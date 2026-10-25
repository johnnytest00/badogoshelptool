import { z } from "zod";
import { calculateExistingRoofGeometry } from "@/domain/calculations/construction/roofs";
import { calculateRafterJoints, rafterJointInputFromFields, type RafterJoints } from "@/domain/calculations/construction/rafter-joints";
import { calculateRoofMaterialTakeoff, type RoofMaterialTakeoff, type RoofMaterialTakeoffInputs } from "@/domain/calculations/roof-material-takeoff";
import type { RoofGeometry, RoofGeometryInput, RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { roofTimberInputFromParameters, roofTimberParametersSchema, type RoofTimberLayout, type RoofTimberParameters } from "@/domain/calculations/roof-timber-layout";
import type { RoofUnderlayLayout } from "@/domain/calculations/roof-underlay";
import { coveringParametersFromSpec, createSpecSnapshot, resolveMaterialSpec, timberParametersFromSpecs, underlayParametersFromSpec, type MaterialGroup, type MaterialProfile, type RoofMaterialSpecSnapshot, type SpecState } from "@/domain/calculations/roof-material-spec";
import { createCalculationSnapshot, roofGeometryInputFromFields } from "@/domain/calculations/roof-calculation-snapshot";
import { validationMessage } from "@/lib/validation-message";
import type { RoofMaterialUiState } from "./material-spec-editor";
import type { CalculatorDefinition, Field, ResultLine } from "./construction-calculator-types";

const ROOF_SHAPES = ["gable", "shed", "hip", "pyramid", "halfHip", "lShape", "tShape", "mansard"] as const;
export const roofShapeOf = (values: Record<string, unknown>): RoofGeometryType => {
  const shape = String(values.roofShape ?? "gable");
  return ((ROOF_SHAPES as readonly string[]).includes(shape) ? shape : "gable") as RoofGeometryType;
};
const roofGeometryInputFor = (values: Record<string, unknown>): RoofGeometryInput => roofGeometryInputFromFields(roofShapeOf(values), values);

export function inputRecord(fields: readonly Field[], values: Record<string, string>): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => {
    const value = values[field.key]?.trim() ?? "";
    if (field.kind === "checkbox") return [field.key, value === "true"];
    if (field.kind === "text" || field.kind === "select") return [field.key, value];
    return [field.key, value === "" ? undefined : Number(value.replace(",", "."))];
  }));
}

const usesRoofShape = (definition: CalculatorDefinition) => definition.fields.some((field) => field.key === "roofShape");
export function roofGeometryTypeForDefinition(definition: CalculatorDefinition, values: Record<string, string>): RoofGeometryType | null {
  return usesRoofShape(definition) ? roofShapeOf(values) : null;
}
export const isFieldVisible = (field: Field, values: Record<string, string>) => (!field.shapes || field.shapes.includes(roofShapeOf(values)))
  && (!field.visibleWhen || field.visibleWhen.values.includes(values[field.visibleWhen.key] ?? ""));

function reusableRoofGeometry(definition: CalculatorDefinition, values: Record<string, string>): RoofGeometry | null {
  if (!usesRoofShape(definition)) return null;
  try {
    return calculateExistingRoofGeometry(roofGeometryInputFor(values));
  } catch {
    return null;
  }
}

/** Equal nominal lengths become one cut-list row, longest first. */
export function cutListRows(segments: readonly { lengthMm: number }[]): readonly { lengthMm: number; count: number }[] {
  const grouped = new Map<number, number>();
  for (const segment of segments) {
    const lengthMm = Math.round(segment.lengthMm);
    grouped.set(lengthMm, (grouped.get(lengthMm) ?? 0) + 1);
  }
  return [...grouped].map(([lengthMm, count]) => ({ lengthMm, count })).sort((a, b) => b.lengthMm - a.lengthMm);
}

/** M6 (12/1 "A"): the suite always lays out with a 0 mm edge strip, so legacy inset keys are dropped from new input. */
export const withoutEdgeStrips = (layout: RoofTimberParameters): RoofTimberParameters =>
  Object.fromEntries(Object.entries(layout).filter(([key]) => !key.endsWith("InsetMm")));

export const usesMaterialInputs = (calculatorId: string) => calculatorId === "roof.material-takeoff" || calculatorId === "roof.timber-cutlist";

export type ConstructionComputation = Readonly<{
  inputsReady: boolean;
  rows: readonly ResultLine[];
  error: string | null;
  geometry: RoofGeometry | null;
  takeoffInputs: RoofMaterialTakeoffInputs | undefined;
  materialTakeoff: RoofMaterialTakeoff | null;
  timberLayout: RoofTimberLayout | null;
  underlayLayout: RoofUnderlayLayout | null;
  cutList: Readonly<{ rafters: readonly { lengthMm: number; count: number }[]; battens: readonly { lengthMm: number; count: number }[] }> | null;
  rafterJoints: RafterJoints | null;
  completeness: Readonly<{ status: "complete" | "incomplete" | "invalid" | "unsupported"; reasons: readonly string[] }>;
}>;

/** One calculation path for the browser preview and the server-side recomputation before saving. */
export function computeConstruction(definition: CalculatorDefinition, values: Record<string, string>, material: RoofMaterialUiState | null, profiles: readonly MaterialProfile[]): ConstructionComputation {
  const calculatorId = definition.reference.id;
  const raw = inputRecord(definition.fields, values);
  const requiredFields = definition.fields.filter((field) => !field.advanced && field.initial === undefined && field.kind !== "checkbox" && isFieldVisible(field, values));
  const inputsReady = requiredFields.every((field) => (values[field.key] ?? "").trim() !== "");
  const timberOnly = calculatorId === "roof.timber-cutlist";
  const timberRequested = Boolean(material && (timberOnly || material.requested.timber));
  const layoutValidation = timberRequested && material ? roofTimberParametersSchema.safeParse(withoutEdgeStrips(material.layout)) : null;
  let takeoffInputs: RoofMaterialTakeoffInputs | undefined;
  if (usesMaterialInputs(calculatorId) && material) {
    const specs = {
      covering: resolveMaterialSpec("covering", material.specs.covering, profiles), underlay: resolveMaterialSpec("underlay", material.specs.underlay, profiles),
      rafter: resolveMaterialSpec("rafter", material.specs.rafter, profiles), batten: resolveMaterialSpec("batten", material.specs.batten, profiles),
    };
    const requested = timberOnly ? { timber: true, underlay: false, covering: false } : material.requested;
    const layout = withoutEdgeStrips(material.layout);
    const timberInput = roofTimberInputFromParameters(timberParametersFromSpecs(layout, specs.rafter, specs.batten));
    takeoffInputs = {
      timber: timberInput ?? undefined, underlay: underlayParametersFromSpec(specs.underlay), covering: coveringParametersFromSpec(specs.covering), requested,
      specSnapshot: createSpecSnapshot([...(requested.timber ? [specs.rafter, specs.batten] : []), ...(requested.underlay ? [specs.underlay] : []), ...(requested.covering ? [specs.covering] : [])]),
      calculationSnapshot: createCalculationSnapshot({ calculatorId, roofShape: roofShapeOf(values), fields: raw, requested, timberLayout: layout, specs: [specs.rafter, specs.batten, specs.underlay, specs.covering] }),
    };
  }
  let rows: readonly ResultLine[] = [];
  let error: string | null = null;
  let geometry: RoofGeometry | null = null;
  if (inputsReady) {
    try {
      geometry = roofGeometryTypeForDefinition(definition, values) ? reusableRoofGeometry(definition, values) : null;
      rows = definition.calculate(raw, takeoffInputs);
    } catch (caught) {
      error = caught instanceof z.ZodError ? [...new Set(caught.issues.map((issue) => validationMessage(issue)))].join(" ") : "A megadott méretekkel a számítás nem végezhető el.";
      geometry = null;
    }
  }
  const materialTakeoff = takeoffInputs && geometry ? calculateRoofMaterialTakeoff(geometry, takeoffInputs) : null;
  const timberLayout = materialTakeoff?.timber.status === "available" ? materialTakeoff.timber : null;
  const underlayLayout = materialTakeoff && takeoffInputs?.requested?.underlay ? materialTakeoff.underlay : null;
  const cutList = timberOnly && timberLayout ? { rafters: cutListRows(timberLayout.rafters?.segments ?? []), battens: cutListRows(timberLayout.battens?.segments ?? []) } : null;
  const rafterJoints = calculatorId === "roof.rafter-cut" && rows.length > 0 && error === null ? calculateRafterJoints(rafterJointInputFromFields(raw)) : null;
  const activeParts = materialTakeoff?.parts.filter((part) => part.requested && part.id !== "geometry") ?? [];
  const reasons = [...new Set([
    ...requiredFields.filter((field) => (values[field.key] ?? "").trim() === "").map((field) => field.label),
    ...(timberRequested && material && material.layout.rafterMaxSpacingMm === undefined && material.layout.battenMaxSpacingMm === undefined
      ? ["Szarufa · legnagyobb tengelytávolság vagy Léc · legnagyobb sortávolság"] : []),
    ...(materialTakeoff?.reasons ?? []),
    ...activeParts.flatMap((part) => part.incompleteQuantities.map((quantity) => `${part.label} · ${quantity.reason}`)),
    ...activeParts.flatMap((part) => part.invalidInputs.map((issue) => `${part.label} · ${issue}`)),
  ])];
  const completeness = error !== null || (layoutValidation && !layoutValidation.success) || materialTakeoff?.status === "INVALID"
    ? { status: "invalid" as const, reasons: [...new Set([error, ...(layoutValidation && !layoutValidation.success ? layoutValidation.error.issues.map((issue) => validationMessage(issue)) : []), ...reasons].filter((reason): reason is string => Boolean(reason)))] }
    : materialTakeoff?.status === "UNSUPPORTED"
      ? { status: "unsupported" as const, reasons }
      : !inputsReady || (materialTakeoff !== null && (activeParts.length === 0 || materialTakeoff.status === "INCOMPLETE" || activeParts.some((part) => part.incompleteQuantities.length > 0)))
        ? { status: "incomplete" as const, reasons: activeParts.length === 0 && materialTakeoff ? ["Válassz legalább egy számítandó anyagcsoportot.", ...reasons] : reasons }
        : rows.length > 0 || geometry !== null
          ? { status: "complete" as const, reasons: [] }
          : { status: "invalid" as const, reasons: ["A megadott adatokból nem keletkezett eredmény."] };
  return { inputsReady, rows, error, geometry, takeoffInputs, materialTakeoff, timberLayout, underlayLayout, cutList, rafterJoints, completeness };
}

export const CONSTRUCTION_INPUT_SCHEMA = "construction-suite.input.v1";
export const CONSTRUCTION_OUTPUT_SCHEMA = "construction-suite.output.v1";
/** Approved first M2 scope: the four roof calculators. */
export const SAVEABLE_CONSTRUCTION_CALCULATORS = ["roof.rafter-cut", "roof.material-takeoff", "roof.timber-cutlist", "roof.truss-members"] as const;
export const constructionCalculatorType = (calculatorId: string) => `construction.${calculatorId}`;
export const isSaveableConstructionCalculator = (calculatorId: string): calculatorId is (typeof SAVEABLE_CONSTRUCTION_CALCULATORS)[number] =>
  (SAVEABLE_CONSTRUCTION_CALCULATORS as readonly string[]).includes(calculatorId);

const specStateSchema = z.object({ mode: z.enum(["product", "manual"]), profileId: z.string().max(200).nullable(), entered: z.record(z.string().max(80), z.union([z.number().finite(), z.string().max(500)])) }).strict();
export const constructionInputSnapshotSchema = z.object({
  schemaVersion: z.literal(CONSTRUCTION_INPUT_SCHEMA),
  calculatorId: z.string().min(1).max(80),
  fields: z.record(z.string().max(80), z.string().max(200)),
  material: z.object({
    requested: z.object({ timber: z.boolean(), underlay: z.boolean(), covering: z.boolean() }).strict(),
    layout: roofTimberParametersSchema,
    specs: z.object({ covering: specStateSchema, underlay: specStateSchema, rafter: specStateSchema, batten: specStateSchema }).strict(),
  }).strict().nullable(),
}).strict();
export type ConstructionInputSnapshot = z.infer<typeof constructionInputSnapshotSchema>;

/** Comparison-only projection. Never persist this over the source revision. */
export function comparableConstructionInput(definition: CalculatorDefinition, saved: ConstructionInputSnapshot): ConstructionInputSnapshot | null {
  if (saved.calculatorId !== definition.reference.id) return null;
  const fields = new Map(definition.fields.map((field) => [field.key, field]));
  if (Object.keys(saved.fields).some((key) => !fields.has(key))) return null;
  if (definition.fields.some((field) => !field.advanced && field.initial === undefined && field.kind !== "checkbox" && saved.fields[field.key] === undefined)) return null;
  return { ...saved, fields: Object.fromEntries(definition.fields.map((field) => [field.key, saved.fields[field.key] ?? field.initial ?? ""])) };
}

export type ConstructionOutputSnapshot = Readonly<{
  schemaVersion: typeof CONSTRUCTION_OUTPUT_SCHEMA;
  calculatorId: string;
  lines: readonly ResultLine[];
  takeoff: Readonly<{ status: string; parts: readonly Readonly<{ id: string; label: string; status: string | null; quantities: readonly Readonly<{ label: string; value: number; unit: string; meaning: string }>[] }>[] }> | null;
  cutList: ConstructionComputation["cutList"];
  specifications: RoofMaterialSpecSnapshot | null;
}>;

/** Only defined field keys are kept; the material block exists only for calculators that use it. */
export function constructionInputSnapshot(definition: CalculatorDefinition, values: Record<string, string>, material: RoofMaterialUiState | null): ConstructionInputSnapshot {
  const fields = Object.fromEntries(definition.fields.flatMap((field) => values[field.key] === undefined ? [] : [[field.key, values[field.key]]]));
  const specs = material && Object.fromEntries((["covering", "underlay", "rafter", "batten"] as const satisfies readonly MaterialGroup[]).map((group) => [group, material.specs[group]])) as Record<MaterialGroup, SpecState>;
  return {
    schemaVersion: CONSTRUCTION_INPUT_SCHEMA, calculatorId: definition.reference.id, fields,
    material: usesMaterialInputs(definition.reference.id) && material && specs ? { requested: { ...material.requested }, layout: withoutEdgeStrips(material.layout), specs } : null,
  };
}

export function constructionOutputSnapshot(calculatorId: string, computation: ConstructionComputation): ConstructionOutputSnapshot {
  const takeoff = computation.materialTakeoff;
  return {
    schemaVersion: CONSTRUCTION_OUTPUT_SCHEMA, calculatorId,
    lines: computation.rows.map((line) => ({ label: line.label, value: line.value, unit: line.unit })),
    takeoff: takeoff ? { status: takeoff.status, parts: takeoff.parts.filter((part) => part.requested).map((part) => ({ id: part.id, label: part.label, status: part.status ?? null, quantities: part.quantities.map((quantity) => ({ label: quantity.label, value: quantity.value, unit: quantity.unit, meaning: quantity.meaning })) })) } : null,
    cutList: computation.cutList,
    specifications: computation.takeoffInputs?.specSnapshot ?? null,
  };
}

/** A computation that may be saved: every requested result is complete. Professional/statical approval is a separate concern. */
export const isSaveableComputation = (computation: ConstructionComputation) => computation.completeness.status === "complete";

const outputRecord = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

/** Historical and downstream guard: only a complete immutable output may be reused as a calculation source. */
export function isCompleteConstructionOutput(value: unknown): boolean {
  const output = outputRecord(value);
  if (output?.schemaVersion !== CONSTRUCTION_OUTPUT_SCHEMA || typeof output.calculatorId !== "string" || !Array.isArray(output.lines)) return false;
  if (!usesMaterialInputs(output.calculatorId)) return output.lines.length > 0;
  const takeoff = outputRecord(output.takeoff);
  if (takeoff?.status !== "VALID") return false;
  const groups = outputRecord(outputRecord(output.specifications)?.groups);
  if (!groups || Object.keys(groups).length === 0) return false;
  return Object.values(groups).every((rawGroup) => {
    const group = outputRecord(rawGroup);
    const issues = outputRecord(group?.issues);
    return group !== null && issues !== null && Object.keys(issues).length === 0
      && Array.isArray(group.invalidKeys) && group.invalidKeys.length === 0;
  });
}

/** A saved input as the current editor builds it (M6: legacy edge-strip keys dropped), so an unchanged revision does not read as modified. */
export const normalizedConstructionInput = (snapshot: ConstructionInputSnapshot): ConstructionInputSnapshot =>
  snapshot.material ? { ...snapshot, material: { ...snapshot.material, layout: withoutEdgeStrips(snapshot.material.layout) } } : snapshot;

/** Rebuild editor state from a saved input snapshot. */
export function materialStateFromSnapshot(snapshot: ConstructionInputSnapshot): RoofMaterialUiState | null {
  return snapshot.material ? { requested: snapshot.material.requested, layout: withoutEdgeStrips(snapshot.material.layout), specs: snapshot.material.specs } : null;
}

export const constructionCalculatorLabels: Readonly<Record<(typeof SAVEABLE_CONSTRUCTION_CALCULATORS)[number], string>> = {
  "roof.rafter-cut": "Szarufa kiszabása", "roof.material-takeoff": "Tetőanyag-kimutatás", "roof.timber-cutlist": "Faanyag és vágáslista", "roof.truss-members": "Rácsos tartó elemei",
};
