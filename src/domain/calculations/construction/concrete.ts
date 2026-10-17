import { z } from "zod";
import { assertFiniteResult, constructionCount, constructionLengthMm, mm2ToM2, mm3ToM3, mmToM } from "./numeric";

const dim = constructionLengthMm;
const count = constructionCount;

export const stripFoundationInputSchema = z.object({ totalCenterlineLengthMm: dim, widthMm: dim, depthMm: dim });
export function calculateStripFoundation(rawInput: z.infer<typeof stripFoundationInputSchema>) {
  const input = stripFoundationInputSchema.parse(rawInput);
  const volumeM3 = mm3ToM3(input.totalCenterlineLengthMm * input.widthMm * input.depthMm);
  const twoSideFormworkM2 = mm2ToM2(2 * input.totalCenterlineLengthMm * input.depthMm);
  assertFiniteResult([volumeM3, twoSideFormworkM2]);
  return { volumeM3, twoSideFormworkM2 };
}

export const cylindricalPileInputSchema = z.object({ count: count, diameterMm: dim, lengthMm: dim });
export function calculateCylindricalPiles(rawInput: z.infer<typeof cylindricalPileInputSchema>) {
  const input = cylindricalPileInputSchema.parse(rawInput);
  const onePileM3 = Math.PI * (mmToM(input.diameterMm) / 2) ** 2 * mmToM(input.lengthMm);
  const totalVolumeM3 = onePileM3 * input.count;
  assertFiniteResult([onePileM3, totalVolumeM3]);
  return { onePileM3, totalVolumeM3, count: input.count };
}

export const foundationSlabInputSchema = z.object({ lengthMm: dim, widthMm: dim, thicknessMm: dim });
export function calculateFoundationSlab(rawInput: z.infer<typeof foundationSlabInputSchema>) {
  const input = foundationSlabInputSchema.parse(rawInput);
  const volumeM3 = mm3ToM3(input.lengthMm * input.widthMm * input.thicknessMm);
  const edgeFormworkM2 = mm2ToM2(2 * (input.lengthMm + input.widthMm) * input.thicknessMm);
  assertFiniteResult([volumeM3, edgeFormworkM2]);
  return { volumeM3, edgeFormworkM2, planAreaM2: mm2ToM2(input.lengthMm * input.widthMm) };
}

export const concreteRingInputSchema = z.object({ outerDiameterMm: dim, wallThicknessMm: dim, heightMm: dim })
  .refine((value) => value.outerDiameterMm > 2 * value.wallThicknessMm, { path: ["wallThicknessMm"], message: "A falvastagság mellett maradjon pozitív belső átmérő." });
export function calculateConcreteRing(rawInput: z.infer<typeof concreteRingInputSchema>) {
  const input = concreteRingInputSchema.parse(rawInput);
  const innerDiameterMm = input.outerDiameterMm - 2 * input.wallThicknessMm;
  const heightM = mmToM(input.heightMm);
  const outerRadiusM = mmToM(input.outerDiameterMm) / 2;
  const innerRadiusM = mmToM(innerDiameterMm) / 2;
  const concreteVolumeM3 = Math.PI * (outerRadiusM ** 2 - innerRadiusM ** 2) * heightM;
  const internalVolumeM3 = Math.PI * innerRadiusM ** 2 * heightM;
  const outsideLateralAreaM2 = Math.PI * mmToM(input.outerDiameterMm) * heightM;
  assertFiniteResult([concreteVolumeM3, internalVolumeM3, outsideLateralAreaM2]);
  return { innerDiameterMm, concreteVolumeM3, internalVolumeM3, outsideLateralAreaM2 };
}

export const pavingInputSchema = z.object({ lengthMm: dim, widthMm: dim, tileLengthMm: dim, tileWidthMm: dim });
export function calculatePavingMaterials(rawInput: z.infer<typeof pavingInputSchema>) {
  const input = pavingInputSchema.parse(rawInput);
  const areaM2 = mm2ToM2(input.lengthMm * input.widthMm);
  const tileAreaM2 = mm2ToM2(input.tileLengthMm * input.tileWidthMm);
  const tilesByArea = Math.ceil(areaM2 / tileAreaM2);
  assertFiniteResult([areaM2, tileAreaM2, tilesByArea]);
  return { areaM2, tileAreaM2, tilesByArea };
}

export const rectangularBlindAreaInputSchema = z.object({ buildingLengthMm: dim, buildingWidthMm: dim, apronWidthMm: dim, concreteThicknessMm: dim.optional(), gravelThicknessMm: dim.optional() });
export function calculateRectangularBlindArea(rawInput: z.infer<typeof rectangularBlindAreaInputSchema>) {
  const input = rectangularBlindAreaInputSchema.parse(rawInput);
  const outerAreaM2 = mm2ToM2((input.buildingLengthMm + 2 * input.apronWidthMm) * (input.buildingWidthMm + 2 * input.apronWidthMm));
  const innerAreaM2 = mm2ToM2(input.buildingLengthMm * input.buildingWidthMm);
  const apronAreaM2 = outerAreaM2 - innerAreaM2;
  const concreteVolumeM3 = input.concreteThicknessMm === undefined ? null : apronAreaM2 * mmToM(input.concreteThicknessMm);
  const gravelVolumeM3 = input.gravelThicknessMm === undefined ? null : apronAreaM2 * mmToM(input.gravelThicknessMm);
  assertFiniteResult([outerAreaM2, innerAreaM2, apronAreaM2, ...(concreteVolumeM3 === null ? [] : [concreteVolumeM3]), ...(gravelVolumeM3 === null ? [] : [gravelVolumeM3])]);
  return { apronAreaM2, outerAreaM2, concreteVolumeM3, gravelVolumeM3 };
}

export const concreteMixInputSchema = z.object({
  concreteVolumeM3: z.number().finite().positive().max(100_000),
  cementKgPerM3: z.number().finite().positive().max(100_000),
  cementRatio: z.number().finite().positive().max(1_000),
  sandRatio: z.number().finite().nonnegative().max(1_000),
  aggregateRatio: z.number().finite().nonnegative().max(1_000),
  bagWeightKg: z.number().finite().positive().max(1_000).optional(),
}).refine((value) => value.sandRatio + value.aggregateRatio > 0, { path: ["sandRatio"], message: "Legalább egy adalékanyag-arány legyen pozitív." });
export function calculateConcreteMix(rawInput: z.infer<typeof concreteMixInputSchema>) {
  const input = concreteMixInputSchema.parse(rawInput);
  const cementKg = input.concreteVolumeM3 * input.cementKgPerM3;
  const sandKg = cementKg * input.sandRatio / input.cementRatio;
  const aggregateKg = cementKg * input.aggregateRatio / input.cementRatio;
  const bagCount = input.bagWeightKg === undefined ? null : Math.ceil(cementKg / input.bagWeightKg);
  assertFiniteResult([cementKg, sandKg, aggregateKg, ...(bagCount === null ? [] : [bagCount])]);
  return { cementKg, sandKg, aggregateKg, bagCount };
}

export const reinforcementBarsInputSchema = z.object({
  barDiameterMm: dim,
  cutLengthMm: dim,
  pieceCount: count,
  steelDensityKgPerM3: z.number().finite().positive().max(30_000).default(7_850),
});
export function calculateReinforcementBars(rawInput: z.infer<typeof reinforcementBarsInputSchema>) {
  const input = reinforcementBarsInputSchema.parse(rawInput);
  const totalLengthM = mmToM(input.cutLengthMm) * input.pieceCount;
  const crossSectionM2 = Math.PI * (mmToM(input.barDiameterMm) / 2) ** 2;
  const totalMassKg = crossSectionM2 * totalLengthM * input.steelDensityKgPerM3;
  assertFiniteResult([totalLengthM, crossSectionM2, totalMassKg]);
  return { totalLengthM, crossSectionM2, totalMassKg, pieceCount: input.pieceCount };
}

export const reinforcementMeshInputSchema = z.object({
  lengthMm: dim,
  widthMm: dim,
  coverMm: z.number().finite().nonnegative().max(100_000),
  spacingMm: dim,
  barDiameterMm: dim,
  steelDensityKgPerM3: z.number().finite().positive().max(30_000).default(7_850),
}).refine((value) => value.lengthMm > 2 * value.coverMm && value.widthMm > 2 * value.coverMm, { message: "A fedés mellett maradjon pozitív hálóméret." });
export function calculateReinforcementMesh(rawInput: z.infer<typeof reinforcementMeshInputSchema>) {
  const input = reinforcementMeshInputSchema.parse(rawInput);
  const clearLengthMm = input.lengthMm - 2 * input.coverMm;
  const clearWidthMm = input.widthMm - 2 * input.coverMm;
  const lengthwiseIntervals = Math.ceil(clearWidthMm / input.spacingMm);
  const widthwiseIntervals = Math.ceil(clearLengthMm / input.spacingMm);
  const lengthwiseBarCount = lengthwiseIntervals + 1;
  const widthwiseBarCount = widthwiseIntervals + 1;
  const totalBarLengthM = lengthwiseBarCount * mmToM(clearLengthMm) + widthwiseBarCount * mmToM(clearWidthMm);
  const crossSectionM2 = Math.PI * (mmToM(input.barDiameterMm) / 2) ** 2;
  const totalMassKg = totalBarLengthM * crossSectionM2 * input.steelDensityKgPerM3;
  const actualSpacingAlongLengthMm = clearLengthMm / widthwiseIntervals;
  const actualSpacingAlongWidthMm = clearWidthMm / lengthwiseIntervals;
  assertFiniteResult([lengthwiseBarCount, widthwiseBarCount, totalBarLengthM, totalMassKg, actualSpacingAlongLengthMm, actualSpacingAlongWidthMm]);
  return { lengthwiseBarCount, widthwiseBarCount, totalBarLengthM, totalMassKg, actualSpacingAlongLengthMm, actualSpacingAlongWidthMm };
}

export const diagonalInputSchema = z.object({ lengthMm: dim, widthMm: dim });
export function calculateRightAngleDiagonal(rawInput: z.infer<typeof diagonalInputSchema>) {
  const input = diagonalInputSchema.parse(rawInput);
  const diagonalMm = Math.hypot(input.lengthMm, input.widthMm);
  const angleDegrees = Math.atan2(input.widthMm, input.lengthMm) * 180 / Math.PI;
  assertFiniteResult([diagonalMm, angleDegrees]);
  return { diagonalMm, angleDegrees };
}

