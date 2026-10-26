import { invalidateGableGeometryOnShapeChange, type AppliedTransfer } from "./rafter-connection-fields";

export type CalculatorDrafts = Record<string, Record<string, string>>;

export function initializeCalculatorDraft(drafts: CalculatorDrafts, id: string, fields: Record<string, string>): CalculatorDrafts {
  return Object.hasOwn(drafts, id) ? drafts : { ...drafts, [id]: fields };
}

export function updateCalculatorDraft(drafts: CalculatorDrafts, id: string, key: string, value: string): CalculatorDrafts {
  return { ...drafts, [id]: { ...drafts[id], [key]: value } };
}

export function replaceCalculatorDraft(drafts: CalculatorDrafts, id: string, fields: Record<string, string>): CalculatorDrafts {
  return { ...drafts, [id]: fields };
}

/** Sets several field values at once, keeping every other field of the draft (M10: "Adatok átvétele"). */
export function mergeCalculatorDraft(drafts: CalculatorDrafts, id: string, fields: Record<string, string>): CalculatorDrafts {
  return { ...drafts, [id]: { ...drafts[id], ...fields } };
}

export type FieldChangeResult<TApplied extends AppliedTransfer> = Readonly<{ drafts: CalculatorDrafts; nextApplied: TApplied | null }>;

/**
 * M10.1.3 (docs/M10_PHASE1_FINAL_INDEPENDENT_QA.md §16.4 kritikus architekturális követelmény): the single
 * atomic transition ConstructionCalculatorSuite's updateValue performs for any field change. For "roofShape",
 * the shape change and the per-field invalidation of the still-untouched, gable-only transferred geometry
 * (invalidateGableGeometryOnShapeChange) land in the same draft update — never a separate, later correction —
 * so no intermediate render or save can see the new shape together with stale gable geometry.
 */
export function applyFieldChange<TApplied extends AppliedTransfer>(drafts: CalculatorDrafts, id: string, key: string, value: string, applied: TApplied | null): FieldChangeResult<TApplied> {
  if (key !== "roofShape") return { drafts: mergeCalculatorDraft(drafts, id, { [key]: value }), nextApplied: applied };
  const transition = invalidateGableGeometryOnShapeChange(String((drafts[id] ?? {}).roofShape ?? "gable"), value, applied, drafts[id] ?? {});
  const nextApplied = transition ? (transition.nextApplied && applied ? { ...applied, ...transition.nextApplied } : null) : applied;
  return { drafts: mergeCalculatorDraft(drafts, id, { [key]: value, ...(transition?.resetFields ?? {}) }), nextApplied };
}
