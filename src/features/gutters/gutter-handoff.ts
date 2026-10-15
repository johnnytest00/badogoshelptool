import type { GutterMaterialInput } from "@/domain/calculations/gutter-material";
import type { GutterGeometrySuggestion } from "./gutter-data";

function stableRunId(key: string) {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < key.length; index += 1) {
    const code = key.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `run-${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0).toString(16).padStart(8, "0")}`;
}

export function gutterInputFromSelectedEaves(suggestions: readonly GutterGeometrySuggestion[]): GutterMaterialInput {
  const seen = new Set<string>();
  return {
    gutterStockLengthMm: 0,
    runs: suggestions.flatMap((suggestion) => {
      const key = `${suggestion.roofModelId}:${suggestion.id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        id: stableRunId(key), name: suggestion.label, lengthMm: suggestion.lengthMm,
        description: "Tetőgeometriából számított", measurementSource: "drawing" as const,
        roofEdge: { revisionId: suggestion.roofModelRevisionId, edgeId: suggestion.id, roofModelId: suggestion.roofModelId, calculationId: suggestion.calculationId, calculationRevisionId: suggestion.calculationRevisionId, suggestedLengthMm: suggestion.lengthMm, lengthOverridden: false },
        bracketSpacingMm: null,
      }];
    }),
    downpipes: [], manualComponents: [],
  };
}

export function mergeSelectedEaves(input: GutterMaterialInput, suggestions: readonly GutterGeometrySuggestion[]): GutterMaterialInput {
  const additions = gutterInputFromSelectedEaves(suggestions).runs.filter((run) =>
    !input.runs.some((existing) => existing.roofEdge?.roofModelId === run.roofEdge?.roofModelId && existing.roofEdge?.edgeId === run.roofEdge?.edgeId));
  if (!additions.length) return input;
  const placeholder = input.runs.length === 1 && input.runs[0].lengthMm === 0 && !input.runs[0].roofEdge;
  return { ...input, runs: [...(placeholder ? [] : input.runs), ...additions] };
}
