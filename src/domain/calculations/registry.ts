import { CalculatorRegistry } from "@/domain/calculations/engine";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";
import { metalSheetLayoutCalculator } from "@/domain/calculations/metal-sheet-layout";
import { sheetMetalProfileCalculator } from "@/domain/calculations/sheet-metal-profile";
import { gableMetalTileCoveringCalculator } from "@/domain/calculations/gable-metal-tile-covering";

/** Explicit production registry containing only implemented calculators. */
export function createProductionCalculatorRegistry(): CalculatorRegistry {
  return new CalculatorRegistry().register(gableRoofCalculator).register(metalSheetLayoutCalculator).register(sheetMetalProfileCalculator).register(gableMetalTileCoveringCalculator);
}
