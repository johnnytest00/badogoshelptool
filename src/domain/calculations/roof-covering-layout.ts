import { roofGeometryOutputSchema, type RoofGeometry } from "@/domain/calculations/roof-geometry";
import { roofCoveringProductParametersSchema, type RoofCoveringProductParameters } from "@/domain/calculations/roof-covering-parameters";
import { clippedBand, frameForPlane, isConvex, range, signedArea, toPlane, PLANE_EPSILON_MM } from "@/domain/calculations/roof-plane-geometry";

const MAX_COLUMNS_PER_ROOF = 2_000;

export type RoofCoveringStatus = "INCOMPLETE" | "INVALID" | "UNSUPPORTED" | "VALID";

export type RoofCoveringColumn = Readonly<{
  id: string;
  planeId: string;
  indexFromStart: number;
  startOffsetMm: number;
  endOffsetMm: number;
  /** Slope-direction extent of the roof plane inside this column. */
  requiredCoveringLengthMm: number;
  sheetCount: number;
  isPartialWidth: boolean;
}>;

export type RoofCoveringLayout = Readonly<{
  status: RoofCoveringStatus;
  reasons: readonly string[];
  quantityClassification: "geometric-layout-quantity";
  netRoofAreaMm2: number | null;
  columns: readonly RoofCoveringColumn[];
  columnCount: number | null;
  totalSheetCount: number | null;
  totalNominalSheetAreaMm2: number | null;
}>;

const empty = (status: RoofCoveringStatus, reasons: readonly string[], netRoofAreaMm2: number | null = null): RoofCoveringLayout => ({
  status, reasons, quantityClassification: "geometric-layout-quantity", netRoofAreaMm2,
  columns: [], columnCount: null, totalSheetCount: null, totalNominalSheetAreaMm2: null,
});

/**
 * Lays covering sheets as full-width columns running up the slope of every roof plane.
 * Each column is measured against the plane polygon, so trapezoidal and triangular planes
 * (hip, pyramid, half-hip, L and T wings) get their own cut length instead of an area estimate.
 * No manufacturer suitability, flashing, penetration or waste planning is modelled.
 */
export function calculateRoofCoveringLayout(geometry: RoofGeometry, rawProduct: RoofCoveringProductParameters): RoofCoveringLayout {
  const checkedGeometry = roofGeometryOutputSchema.safeParse(geometry);
  if (!checkedGeometry.success) return empty("UNSUPPORTED", ["A tetőgeometria érvénytelen vagy hiányos."]);
  const roof = checkedGeometry.data;
  const netRoofAreaMm2 = roof.planes.reduce((sum, plane) => sum + plane.areaMm2, 0);

  const parsed = roofCoveringProductParametersSchema.safeParse(rawProduct);
  if (!parsed.success) return empty("INVALID", parsed.error.issues.map((issue) => issue.message), netRoofAreaMm2);
  const product = parsed.data;
  if (product.form !== "sheet") return empty("INVALID", ["A fedéskiosztás táblás terméket vár."], netRoofAreaMm2);

  const width = product.effectiveCoveringWidthMm;
  const length = product.usableCoveringLengthMm;
  const missing = [
    width === undefined ? "a hasznos fedési szélesség" : null,
    length === undefined ? "a használható fedési hossz" : null,
    product.manufacturerConstraintReference === undefined ? "a gyártói termékadat forrása" : null,
  ].filter((item): item is string => item !== null);
  if (missing.length) return empty("INCOMPLETE", [`Hiányzó termékadat: ${missing.join(", ")}. Ezekből a rendszer nem következtet.`], netRoofAreaMm2);

  const columns: RoofCoveringColumn[] = [];
  const failures: string[] = [];
  for (const plane of roof.planes) {
    const frame = frameForPlane(plane.vertices);
    if (!frame) { failures.push(`A(z) ${plane.id} sík lejtésiránya nem rekonstruálható.`); continue; }
    const polygon = plane.vertices.map((point) => toPlane(point, frame));
    if (!isConvex(polygon) || Math.abs(signedArea(polygon)) <= PLANE_EPSILON_MM) { failures.push(`A(z) ${plane.id} sík polygonja nem konvex vagy degenerált.`); continue; }
    const [minimumOffset, maximumOffset] = range(polygon, "u");
    const span = maximumOffset - minimumOffset;
    if (!Number.isFinite(span) || span <= 0) { failures.push(`A(z) ${plane.id} sík eresz menti szélessége érvénytelen.`); continue; }

    const count = Math.ceil(span / width! - PLANE_EPSILON_MM);
    if (columns.length + count > MAX_COLUMNS_PER_ROOF) return empty("UNSUPPORTED", [`A kiosztás több mint ${MAX_COLUMNS_PER_ROOF} táblaoszlopot igényel.`], netRoofAreaMm2);
    for (let index = 0; index < count; index++) {
      const startOffsetMm = minimumOffset + index * width!;
      const endOffsetMm = Math.min(startOffsetMm + width!, maximumOffset);
      const band = clippedBand(polygon, "u", startOffsetMm, endOffsetMm);
      if (band.length < 3) continue;
      const [minimumSlope, maximumSlope] = range(band, "v");
      const requiredCoveringLengthMm = maximumSlope - minimumSlope;
      if (!Number.isFinite(requiredCoveringLengthMm) || requiredCoveringLengthMm <= PLANE_EPSILON_MM) continue;
      columns.push({
        id: `${plane.id}:column-${index}`, planeId: plane.id, indexFromStart: index,
        startOffsetMm, endOffsetMm, requiredCoveringLengthMm,
        sheetCount: Math.ceil(requiredCoveringLengthMm / length! - PLANE_EPSILON_MM),
        isPartialWidth: endOffsetMm - startOffsetMm < width! - PLANE_EPSILON_MM,
      });
    }
  }
  if (failures.length) return empty("UNSUPPORTED", failures, netRoofAreaMm2);
  if (!columns.length) return empty("UNSUPPORTED", ["A tetősíkokon nem helyezhető el fedési oszlop."], netRoofAreaMm2);

  const totalSheetCount = columns.reduce((sum, column) => sum + column.sheetCount, 0);
  const nominalWidth = product.nominalWidthMm ?? width!;
  const physicalLength = product.physicalLengthMm ?? length!;
  const totalNominalSheetAreaMm2 = totalSheetCount * nominalWidth * physicalLength;
  if (![totalSheetCount, totalNominalSheetAreaMm2].every((value) => Number.isFinite(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER)) {
    return empty("UNSUPPORTED", ["A fedésmennyiség meghaladja a biztonságos numerikus tartományt."], netRoofAreaMm2);
  }
  return {
    status: "VALID",
    reasons: ["A darabszám teljes szélességű, a tetősík mért lejtőhosszára vágott táblaoszlopokból adódik; szabásmaradék újrahasználata és gyártói alkalmasság nincs modellezve."],
    quantityClassification: "geometric-layout-quantity",
    netRoofAreaMm2, columns, columnCount: columns.length, totalSheetCount, totalNominalSheetAreaMm2,
  };
}
