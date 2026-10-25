export type StraightStairDrawingGeometry = Readonly<{
  totalRiseMm: number;
  totalRunMm: number;
  widthMm: number | null;
  riserCount: number;
  treadCount: number;
  riserHeightMm: number;
  goingMm: number;
  pitchDegrees: number;
  pitchLineLengthMm: number;
  treads: readonly Readonly<{ xStartMm: number; xEndMm: number; levelMm: number }>[];
}>;

export function createStraightStairDrawingGeometry(
  calculation: Omit<StraightStairDrawingGeometry, "widthMm" | "treads">,
  widthMm: number | null,
): StraightStairDrawingGeometry {
  const treads = Array.from({ length: calculation.treadCount }, (_, index) => ({
    xStartMm: index * calculation.goingMm,
    xEndMm: (index + 1) * calculation.goingMm,
    levelMm: (index + 1) * calculation.riserHeightMm,
  }));
  return { ...calculation, widthMm, treads };
}

export type SpiralStairDrawingGeometry = Readonly<{
  totalRiseMm: number;
  outerDiameterMm: number;
  innerDiameterMm: number;
  turnDegrees: number;
  riserCount: number;
  treadCount: number;
  riserHeightMm: number;
  walkingRadiusMm: number;
  walkingLineLengthMm: number;
  walkingGoingMm: number;
  stepAngleDegrees: number;
}>;

export type BeveledRiserDrawingGeometry = Readonly<{
  goingMm: number;
  nosingProjectionMm: number;
  horizontalMm: number;
  riserHeightMm: number;
  diagonalMm: number;
  slopeDegrees: number;
  bevelAngleDegrees: number;
  riserBlankLengthMm: number;
}>;
