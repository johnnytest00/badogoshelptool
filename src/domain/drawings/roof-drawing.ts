import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { roofPlaneGroupId, summarizeRoofGeometry } from "@/domain/calculations/roof-geometry-results";
import { formatDrawingMeasurement, type DrawingDimension, type GableDrawingModel, type DrawingPoint } from "./gable-drawing";

const xy = (point: { xMm: number; yMm: number }): DrawingPoint => ({ x: point.xMm, y: -point.yMm });
const edgeNames = { eave: "Eresz", upper: "Felső él", ridge: "Gerinc", rake: "Oromél", hip: "Kontyél", valley: "Vápavonal" } as const;

export function createRoofDrawingModel(geometry: RoofGeometry): GableDrawingModel {
  const vertices = geometry.planes.flatMap((plane) => plane.vertices);
  const minX = Math.min(...vertices.map((point) => point.xMm));
  const maxX = Math.max(...vertices.map((point) => point.xMm));
  const minY = Math.min(...vertices.map((point) => point.yMm));
  const maxY = Math.max(...vertices.map((point) => point.yMm));
  const xMargin = Math.max(500, (maxX - minX) * .08);
  const yMargin = Math.max(500, (maxY - minY) * .08);
  const planeGroups = summarizeRoofGeometry(geometry).planes;
  const planeNumber = new Map(planeGroups.map((plane, index) => [plane.id, index + 1] as const));
  const planeDetailNumber = new Map<string, number>();
  planeGroups.forEach((group) => group.sourcePlaneIds.forEach((id, index) => planeDetailNumber.set(id, index + 1)));
  const lengthKey = geometry.type === "pyramid" ? "sideMm" : "lengthMm";
  const widthKey = geometry.type === "pyramid" ? "sideMm" : "widthMm";
  const dimensions: DrawingDimension[] = [
    { kind: "horizontal", start: { x: minX, y: -maxY }, end: { x: maxX, y: -maxY }, offset: yMargin, label: formatDrawingMeasurement(maxX - minX), sourceMm: maxX - minX, sourceKey: lengthKey, description: "Vízszintes vetületi külső hossz a fő tetőrész kontúrján." },
    { kind: "vertical", start: { x: minX, y: -maxY }, end: { x: minX, y: -minY }, offset: -xMargin, label: formatDrawingMeasurement(maxY - minY), sourceMm: maxY - minY, sourceKey: widthKey, description: "Vízszintes vetületi külső szélesség a fő tetőrész kontúrján." },
  ];
  if (geometry.type === "lShape" || geometry.type === "tShape") {
    const wing = vertices.filter((point) => point.yMm < -1e-6);
    if (wing.length > 0) {
      const wingMinX = Math.min(...wing.map((point) => point.xMm));
      const wingMaxX = Math.max(...wing.map((point) => point.xMm));
      dimensions.push({ kind: "horizontal", start: { x: wingMinX, y: -Math.min(...wing.map((point) => point.yMm)) }, end: { x: wingMaxX, y: -Math.min(...wing.map((point) => point.yMm)) }, offset: yMargin * 1.55, label: formatDrawingMeasurement(wingMaxX - wingMinX), sourceMm: wingMaxX - wingMinX, sourceKey: "wingWidthMm", description: "A csatlakozó szárny vízszintes külső szélessége." });
      dimensions.push({ kind: "vertical", start: { x: wingMinX, y: 0 }, end: { x: wingMinX, y: -Math.min(...wing.map((point) => point.yMm)) }, offset: -xMargin * 1.55, label: formatDrawingMeasurement(Math.abs(Math.min(...wing.map((point) => point.yMm)))), sourceMm: Math.abs(Math.min(...wing.map((point) => point.yMm))), sourceKey: "wingProjectionMm", description: "A főtető külső vonalától a szárny külső kontúrjáig mért kinyúlás." });
    }
  }
  return {
    view: "top", title: "Felülnézeti műszaki rajz",
    bounds: { minX, maxX, minY: -maxY, maxY: -minY },
    polygons: geometry.planes.map((plane) => {
      const groupId = roofPlaneGroupId(plane.id);
      const groupNumber = planeNumber.get(groupId) ?? 0;
      const detailCount = planeGroups.find((group) => group.id === groupId)?.sourcePlaneIds.length ?? 1;
      const detailLabel = detailCount > 1 ? ` · geometriai részlet ${planeDetailNumber.get(plane.id) ?? 1}` : "";
      return { id: plane.id, points: plane.vertices.map(xy), label: `Tetősík ${groupNumber}${detailLabel}`, outline: false };
    }),
    segments: geometry.edges.map((edge, index) => ({ id: edge.id, start: xy(edge.start), end: xy(edge.end), label: `${edgeNames[edge.kind]} ${index + 1}` })),
    dimensions,
    angles: [], guides: [], sheetStrips: [],
  };
}
