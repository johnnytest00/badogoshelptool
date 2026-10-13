import { CalculatorRegistry } from "@/domain/calculations/engine";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { metalSheetLayoutCalculator } from "@/domain/calculations/metal-sheet-layout";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";
import { flashingMaterialCalculator } from "@/domain/calculations/flashing-material";
import { sheetMetalProfileCalculator } from "@/domain/calculations/sheet-metal-profile";

/** Explicit production registry containing only implemented calculators. */
export function createProductionCalculatorRegistry(): CalculatorRegistry {
  return new CalculatorRegistry().register(gableRoofCalculator).register(metalSheetLayoutCalculator).register(gutterMaterialCalculator).register(flashingMaterialCalculator).register(sheetMetalProfileCalculator);
}
