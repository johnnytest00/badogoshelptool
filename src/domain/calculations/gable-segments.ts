import type { GableRoofOutput } from "./gable-roof";

export type GableSegment = Readonly<{
  id: string;
  kind: "plane" | "eave" | "ridge" | "rake";
  label: string;
  lengthMm: number | null;
  areaMm2: number | null;
  unit: "mm" | "mm2";
}>;

// Stable IDs describe positions in the roof model; the roof revision identifies the exact geometry.
export function gableSegments(output: GableRoofOutput): GableSegment[] {
  return [
    { id: "left-plane", kind: "plane", label: "Bal tetősík", lengthMm: null, areaMm2: output.planes.find((plane) => plane.side === "left")?.areaMm2 ?? null, unit: "mm2" },
    { id: "right-plane", kind: "plane", label: "Jobb tetősík", lengthMm: null, areaMm2: output.planes.find((plane) => plane.side === "right")?.areaMm2 ?? null, unit: "mm2" },
    { id: "left-eave", kind: "eave", label: "Bal ereszél", lengthMm: output.lengths.eachEaveEdgeMm, areaMm2: null, unit: "mm" },
    { id: "right-eave", kind: "eave", label: "Jobb ereszél", lengthMm: output.lengths.eachEaveEdgeMm, areaMm2: null, unit: "mm" },
    { id: "ridge", kind: "ridge", label: "Gerincél", lengthMm: output.lengths.ridgeLineMm, areaMm2: null, unit: "mm" },
    { id: "left-front-gable", kind: "rake", label: "Bal első ferde oromél", lengthMm: output.lengths.eachSlopingGableEdgeMm, areaMm2: null, unit: "mm" },
    { id: "left-rear-gable", kind: "rake", label: "Bal hátsó ferde oromél", lengthMm: output.lengths.eachSlopingGableEdgeMm, areaMm2: null, unit: "mm" },
    { id: "right-front-gable", kind: "rake", label: "Jobb első ferde oromél", lengthMm: output.lengths.eachSlopingGableEdgeMm, areaMm2: null, unit: "mm" },
    { id: "right-rear-gable", kind: "rake", label: "Jobb hátsó ferde oromél", lengthMm: output.lengths.eachSlopingGableEdgeMm, areaMm2: null, unit: "mm" },
  ];
}
