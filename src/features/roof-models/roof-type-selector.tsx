"use client";

import { calculateRoofGeometry, type RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { GlassSectionHeader } from "@/components/ui/glass-section-header";
import { Check } from "lucide-react";

export const roofTypeOptions: readonly { type: RoofGeometryType; name: string; description: string }[] = [
  { type: "shed", name: "Félnyeregtető", description: "Egy lejtő tetősík, alsó eresszel." },
  { type: "gable", name: "Nyeregtető", description: "Két sík, középen végigfutó gerinccel." },
  { type: "hip", name: "Kontytető", description: "Négy sík, két végén kontyélekkel." },
  { type: "pyramid", name: "Sátortető", description: "Négy sík, egyetlen csúcsponttal." },
  { type: "halfHip", name: "Félkontyos tető", description: "Rövid konty a két orom felső részén." },
  { type: "lShape", name: "L alakú tető", description: "Derékszögben csatlakozó szárnyak." },
  { type: "tShape", name: "T alakú tető", description: "Középen csatlakozó keresztirányú szárny." },
];

const sample = {
  shed: { type: "shed", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35 },
  gable: { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 3000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } },
  hip: { type: "hip", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35 },
  pyramid: { type: "pyramid", sideMm: 6000, pitchDegrees: 35 },
  halfHip: { type: "halfHip", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35, hipEaveHeightMm: 1000 },
  lShape: { type: "lShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35, wingWidthMm: 4000, wingProjectionMm: 5000 },
  tShape: { type: "tShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 35, wingWidthMm: 4000, wingProjectionMm: 5000 },
} as const;

function RoofTypeIllustration({ type }: { type: RoofGeometryType }) {
  const roof = calculateRoofGeometry(sample[type]);
  const points = roof.planes.flatMap((plane) => plane.vertices);
  const minX = Math.min(...points.map((p) => p.xMm)), maxX = Math.max(...points.map((p) => p.xMm));
  const minY = Math.min(...points.map((p) => p.yMm)), maxY = Math.max(...points.map((p) => p.yMm));
  const scale = Math.min(144 / (maxX - minX), 76 / (maxY - minY));
  const xy = (p: { xMm: number; yMm: number }) => ({ x: 18 + (p.xMm - minX) * scale + (144 - (maxX - minX) * scale) / 2, y: 10 + (p.yMm - minY) * scale + (76 - (maxY - minY) * scale) / 2 });
  return <svg viewBox="0 0 180 96" className="roof-type-illustration" aria-hidden="true" focusable="false">
    {roof.planes.map((plane, index) => <polygon key={plane.id} points={plane.vertices.map((p) => { const v = xy(p); return `${v.x},${v.y}`; }).join(" ")} fill={index % 2 ? "#c5d8da" : "#e0e9e7"} stroke="#527174" strokeWidth="1.2" />)}
    {roof.edges.map((edge) => { const a = xy(edge.start), b = xy(edge.end); return <line key={edge.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={edge.kind === "valley" ? "#b45309" : edge.kind === "ridge" ? "#0d6c7a" : "#527174"} strokeWidth={edge.kind === "valley" || edge.kind === "ridge" ? 2.4 : 1.4} strokeDasharray={edge.kind === "rake" ? "3 2" : undefined} />; })}
  </svg>;
}

export function RoofTypeSelector({ selected, onSelect, label = "Válaszd ki a tető típusát" }: Readonly<{ selected: RoofGeometryType | null; onSelect: (type: RoofGeometryType) => void; label?: string }>) {
  return <section className="roof-type-selector" aria-label={label}><GlassSectionHeader title={label} className="roof-type-selector-heading" /><div className="roof-type-grid">
    {roofTypeOptions.map((option) => {
      const isSelected = selected === option.type;
      return <button type="button" key={option.type} className={`roof-type-card ${isSelected ? "is-selected" : ""}`} aria-pressed={isSelected} onClick={() => onSelect(option.type)}>
        <span className="roof-type-card-illustration"><RoofTypeIllustration type={option.type} /></span>
        <span className="roof-type-card-copy"><strong>{option.name}</strong><span>{option.description}</span></span>
        {isSelected && <span className="roof-type-selected"><Check aria-hidden="true" className="size-3.5" /> Kiválasztva</span>}
      </button>;
    })}
  </div></section>;
}
