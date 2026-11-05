export const ROOF_SHAPE_OPTIONS = [
  { value: "gable", label: "Nyeregtető" }, { value: "shed", label: "Félnyeregtető" }, { value: "hip", label: "Kontytető" }, { value: "pyramid", label: "Sátortető" },
  { value: "halfHip", label: "Félkontytető" }, { value: "lShape", label: "L alaprajzú tető" }, { value: "tShape", label: "T alaprajzú tető" }, { value: "mansard", label: "Manzárdtető" },
] as const;

export type RoofShapeValue = typeof ROOF_SHAPE_OPTIONS[number]["value"];

export const ROOF_SHAPE_SUPPORT: Record<RoofShapeValue, { underlay: "teljes" | "korlátozott" }> = {
  gable: { underlay: "teljes" }, shed: { underlay: "teljes" }, hip: { underlay: "teljes" }, mansard: { underlay: "teljes" },
  halfHip: { underlay: "korlátozott" }, pyramid: { underlay: "korlátozott" }, lShape: { underlay: "korlátozott" }, tShape: { underlay: "korlátozott" },
};
