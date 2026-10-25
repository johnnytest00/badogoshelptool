import type { ConstructionReference } from "@/domain/calculations/construction/catalog";
import type { RoofMaterialTakeoffInputs } from "@/domain/calculations/roof-material-takeoff";

type FieldCondition = Readonly<{ key: string; values: readonly string[] }>;
/** help: measuring definition shown at the input and in the saved input echo; figure: a reference sketch next to it; positive: 0 is not a valid entry. */
export type Field = { key: string; label: string; unit: string; initial?: string; integer?: boolean; advanced?: boolean; placeholder?: string; kind?: "text" | "checkbox" | "select"; options?: readonly { value: string; label: string }[]; shapes?: readonly string[]; visibleWhen?: FieldCondition | readonly FieldCondition[]; help?: string; figure?: "hap"; positive?: boolean };
export type ResultLine = { label: string; value: number | string; unit: string };
export type CalculatorDefinition = { reference: ConstructionReference; fields: readonly Field[]; draw: "roof" | "rafter" | "truss" | "stairs" | "spiral" | "bevel" | "rectangle" | "ring" | "mesh" | "diagonal"; note: string; advancedHelp?: string; calculate: (input: Record<string, unknown>, context?: RoofMaterialTakeoffInputs) => ResultLine[] };
