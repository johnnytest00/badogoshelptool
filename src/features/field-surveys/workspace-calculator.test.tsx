import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/glass-disclosure", () => ({ GlassDisclosure: () => null }));
vi.mock("@/features/gutters/gutter-calculator", () => ({ GutterCalculator: () => null }));
vi.mock("@/features/flashings/flashing-calculator", () => ({ FlashingCalculator: () => null }));
vi.mock("@/features/roof-models/standalone-gable-preview", () => ({
  StandaloneGablePreview: ({ handoffSource }: { handoffSource: { version: number } }) =>
    createElement("div", { role: "status" }, `Méretek átvéve a felmérésből · V${handoffSource.version}`),
}));
vi.mock("@/features/roof-models/gable-metal-tile-covering-preview", () => ({ StandaloneGableMetalTilePreview: () => null }));
vi.mock("./workspace-actions", () => ({ linkSurveyCalculation: vi.fn(), loadSurveyCalculator: vi.fn() }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({ requestConfirmation: vi.fn(), notify: vi.fn() }),
}));

import { WorkspaceCalculator } from "./workspace-calculator";

describe("survey workspace calculator", () => {
  it("shows the source handoff once in the calculator that owns the imported values", () => {
    const context = {
      handoff: {
        calculator: "roof",
        input: { inputMode: "height", buildingLengthMm: "10000", buildingWidthMm: "6000", roofRiseMm: "3000" },
        source: { surveyId: "survey", revisionId: "revision", version: 2 },
        missing: [],
      },
      projectId: null,
      savedGutter: null,
      selectedGutter: [],
      availableGutter: [],
      gutterCatalog: [],
      savedFlashing: null,
      selectedFlashing: [],
      availableFlashing: [],
      flashingCatalog: [],
    } as unknown as Parameters<typeof WorkspaceCalculator>[0]["context"];
    const html = renderToStaticMarkup(createElement(WorkspaceCalculator, {
      organizationId: "org",
      surveyId: "survey",
      sectionId: "section",
      version: 2,
      context,
      onClose: vi.fn(),
      onShowSummary: vi.fn(),
      onLinked: vi.fn(),
      onState: vi.fn(),
    }));

    expect(html).toContain("Méretek átvéve a felmérésből · V2");
    expect(html.match(/Méretek átvéve a felmérésből · V2/g)).toHaveLength(1);
    expect(html).not.toContain("A felmérés tetőméretei már be vannak töltve.");
  });
});
