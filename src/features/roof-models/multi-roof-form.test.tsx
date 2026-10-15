import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateRoofGeometry, type RoofGeometryInput } from "@/domain/calculations/roof-geometry";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./multi-roof-actions", () => ({ saveMultiRoofAction: vi.fn(), saveStandaloneMultiRoofAction: vi.fn() }));

import { MultiRoofCalculatorForm } from "./multi-roof-form";

const inputs: readonly Exclude<RoofGeometryInput, { type: "gable" }>[] = [
  { type: "shed", lengthMm: 10000, widthMm: 6000, pitchDegrees: 25 },
  { type: "hip", lengthMm: 10000, widthMm: 6000, pitchDegrees: 30 },
  { type: "pyramid", sideMm: 8000, pitchDegrees: 35 },
  { type: "halfHip", lengthMm: 10000, widthMm: 6000, pitchDegrees: 30, hipEaveHeightMm: 1500 },
  { type: "lShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 30, wingWidthMm: 4000, wingProjectionMm: 5000 },
  { type: "tShape", lengthMm: 10000, widthMm: 6000, pitchDegrees: 30, wingWidthMm: 4000, wingProjectionMm: 5000 },
];

describe("compact multi-roof measurement layout", () => {
  it.each(inputs)("places %s inputs before the existing interactive drawing and results", (input) => {
    const output = calculateRoofGeometry(input);
    const html = renderToStaticMarkup(<MultiRoofCalculatorForm
      type={input.type}
      standalone={{ id: "123e4567-e89b-42d3-a456-426614174010", name: "DEMO tető", input, output, revisionId: "123e4567-e89b-42d3-a456-426614174011", revisionNumber: 1, revisions: [{ id: "123e4567-e89b-42d3-a456-426614174011", revisionNumber: 1, input, createdAt: "2026-10-15T00:00:00.000Z" }] }}
    />);
    const inputPosition = html.indexOf("roof-form-grid-compact");
    const drawingPosition = html.indexOf("technical-drawing is-compact");
    const resultsPosition = html.indexOf("roof-results");
    expect(inputPosition).toBeGreaterThanOrEqual(0);
    expect(inputPosition).toBeLessThan(drawingPosition);
    expect(drawingPosition).toBeLessThan(resultsPosition);
    expect(html).toContain(`aria-label="${input.type === "pyramid" ? "Tető külső oldalhossza" : "Tető külső hossza"} (mm)"`);
    if (input.type === "lShape" || input.type === "tShape") expect(html.indexOf("Geometriai feltételezés")).toBeGreaterThan(resultsPosition);
  });
});
