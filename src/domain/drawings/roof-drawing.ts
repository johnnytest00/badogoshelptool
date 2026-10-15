import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { formatDrawingMeasurement, type GableDrawingModel, type DrawingPoint } from "./gable-drawing";

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
  return {
    view: "top", title: "Felülnézeti műszaki rajz",
    bounds: { minX, maxX, minY: -maxY, maxY: -minY },
    polygons: geometry.planes.map((plane, index) => ({ id: plane.id, points: plane.vertices.map(xy), label: `Tetősík ${index + 1}` })),
    segments: geometry.edges.map((edge, index) => ({ id: edge.id, start: xy(edge.start), end: xy(edge.end), label: `${edgeNames[edge.kind]} ${index + 1}` })),
    dimensions: [
      { kind: "horizontal", start: { x: minX, y: -maxY }, end: { x: maxX, y: -maxY }, offset: yMargin, label: formatDrawingMeasurement(maxX - minX), sourceMm: maxX - minX },
      { kind: "vertical", start: { x: minX, y: -maxY }, end: { x: minX, y: -minY }, offset: -xMargin, label: formatDrawingMeasurement(maxY - minY), sourceMm: maxY - minY },
    ],
    angles: [], guides: [], sheetStrips: [],
  };
}
