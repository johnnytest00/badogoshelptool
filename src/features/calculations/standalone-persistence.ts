import { executeCalculator } from "@/domain/calculations/engine";
import { sheetMetalProfileCalculator, type SheetMetalProfileInput } from "@/domain/calculations/sheet-metal-profile";

export const standaloneCalculatorTypes = [
  sheetMetalProfileCalculator.id,
] as const;
export type StandaloneCalculatorType = (typeof standaloneCalculatorTypes)[number];

export type PreparedStandaloneRevision = Readonly<{
  calculatorType: StandaloneCalculatorType;
  input: SheetMetalProfileInput;
  output: unknown;
  inputSchemaVersion: string;
  implementationVersion: string;
  warnings: readonly unknown[];
}>;

export type PreparationResult = { ok: true; value: PreparedStandaloneRevision } | { ok: false; error: string };

function executeStandalone(type: string, input: unknown) {
  if (type === sheetMetalProfileCalculator.id) return executeCalculator(sheetMetalProfileCalculator, input);
  return null;
}

export function recalculateStandaloneRevision(type: string, calculationId: string, input: unknown): unknown | null {
  if (!standaloneCalculatorTypes.includes(type as StandaloneCalculatorType)) return null;
  if (type === sheetMetalProfileCalculator.id && input && typeof input === "object" && !Array.isArray(input)) {
    input = { ...input, profileId: calculationId };
  }
  const result = executeStandalone(type, input);
  return result?.ok ? result.output : null;
}

export function prepareStandaloneRevision(type: string, rawInput: unknown, calculationId: string, displayName: string): PreparationResult {
  if (!standaloneCalculatorTypes.includes(type as StandaloneCalculatorType)) return { ok: false, error: "Ez a kalkulátortípus nem támogat standalone mentést." };
  if (type === sheetMetalProfileCalculator.id && rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)
    && "profileId" in rawInput && (rawInput as { profileId?: unknown }).profileId !== undefined
    && (rawInput as { profileId?: unknown }).profileId !== calculationId) {
    return { ok: false, error: "A profilazonosító nem egyezik a mentési azonosítóval." };
  }
  const normalized = type === sheetMetalProfileCalculator.id && rawInput && typeof rawInput === "object" && !Array.isArray(rawInput)
    ? { ...rawInput, profileId: calculationId }
    : rawInput;
  const result = executeStandalone(type, normalized);
  if (!result) return { ok: false, error: "Ez a kalkulátortípus nem támogat standalone mentést." };
  if (!result.ok) return { ok: false, error: result.errors[0]?.message ?? "A bemenet nem számítható ki." };

  if (type === sheetMetalProfileCalculator.id) {
    const input = result.input as SheetMetalProfileInput;
    if (input.label !== displayName) return { ok: false, error: "A profil megnevezése egyezzen a bemenetben rögzített névvel." };
  }

  return { ok: true, value: {
    calculatorType: type as StandaloneCalculatorType,
    input: result.input as PreparedStandaloneRevision["input"],
    output: result.output,
    inputSchemaVersion: result.metadata.inputSchemaVersion,
    implementationVersion: result.metadata.calculatorVersion,
    warnings: result.warnings,
  } };
}
