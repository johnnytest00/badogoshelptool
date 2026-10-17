import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";
import { RoofGeometryResults } from "./roof-geometry-results";

const inputs: readonly RoofGeometryInput[] = [
  { type: "gable", geometry: { inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 3_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 } },
  { type: "shed", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 35 },
  { type: "hip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 35 },
  { type: "pyramid", sideMm: 6_000, pitchDegrees: 35 },
  { type: "halfHip", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 35, hipEaveHeightMm: 1_000 },
  { type: "lShape", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 35, wingWidthMm: 4_000, wingProjectionMm: 5_000 },
  { type: "tShape", lengthMm: 10_000, widthMm: 6_000, pitchDegrees: 35, wingWidthMm: 4_000, wingProjectionMm: 5_000 },
];

describe("shared roof geometry results view", () => {
  it.each(inputs)("renders calculated measurements for $type", (input) => {
    const html = renderToStaticMarkup(<RoofGeometryResults geometry={calculateRoofGeometry(input)} provenanceLabel="Felmért bemenetek · számított eredmények." />);
    expect(html).toContain("Felmért bemenetek · számított eredmények.");
    expect(html).toContain("Teljes tetősík geometriai felülete");
    expect(html).toContain("Vízszintes vetületi terület");
    expect(html).toContain("Élszakaszok bontása");
    expect(html).toContain("Tetősíkok részletes mérései");
    expect(html).toContain("Faanyag, lécezés és fedés");
    expect(html).not.toMatch(/<strong>0(?:,0+)? m<\/strong>/);
  });
});
