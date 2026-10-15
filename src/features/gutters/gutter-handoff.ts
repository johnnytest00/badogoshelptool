import type { GutterMaterialInput } from "@/domain/calculations/gutter-material";
import type { GutterGeometrySuggestion } from "./gutter-data";

export function gutterInputFromSelectedEaves(suggestions: readonly GutterGeometrySuggestion[]): GutterMaterialInput {
  const seen = new Set<string>();
  return {
    gutterStockLengthMm: 0,
    runs: suggestions.flatMap((suggestion) => {
      const key = `${suggestion.roofModelId}:${suggestion.id}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
        id: `run-${key}`, name: suggestion.label, lengthMm: suggestion.lengthMm,
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
