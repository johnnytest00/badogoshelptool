import { z } from "zod";

export const constructionLengthMm = z.number().finite().positive().max(1_000_000);
export const constructionNonNegativeMm = z.number().finite().nonnegative().max(1_000_000);
export const constructionCount = z.number().int().positive().max(100_000);

export function assertFiniteResult(values: readonly number[]): void {
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError("A számítás eredménye nem véges vagy negatív.");
  }
}

export const mmToM = (valueMm: number) => valueMm / 1_000;
export const mm2ToM2 = (valueMm2: number) => valueMm2 / 1_000_000;
export const mm3ToM3 = (valueMm3: number) => valueMm3 / 1_000_000_000;
