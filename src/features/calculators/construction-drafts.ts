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
