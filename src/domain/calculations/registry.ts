import { CalculatorRegistry } from "@/domain/calculations/engine";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { metalSheetLayoutCalculator } from "@/domain/calculations/metal-sheet-layout";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";

/** Explicit production registry containing only implemented calculators. */
export function createProductionCalculatorRegistry(): CalculatorRegistry {
  return new CalculatorRegistry().register(gableRoofCalculator).register(metalSheetLayoutCalculator).register(gutterMaterialCalculator);
}
