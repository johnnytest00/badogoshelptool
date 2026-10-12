import { CalculatorRegistry } from "@/domain/calculations/engine";
import { gableRoofCalculator } from "@/domain/calculations/gable-roof";

/** Explicit production registry. No fictional future calculator is registered. */
export function createProductionCalculatorRegistry(): CalculatorRegistry {
  return new CalculatorRegistry().register(gableRoofCalculator);
}
