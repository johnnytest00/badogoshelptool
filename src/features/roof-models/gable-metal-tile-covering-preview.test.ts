import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering } from "@/domain/calculations/gable-metal-tile-covering";
import { GableMetalTileCoveringPreview, MetalTileDrawing, StandaloneGableMetalTilePreview } from "./gable-metal-tile-covering-preview";

const geometry = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });

describe("cserepeslemez-fedés preview", () => {
  it("shows project geometry provenance and incomplete product state without a save action", () => {
    const html = renderToStaticMarkup(createElement(GableMetalTileCoveringPreview, { geometry, sourceLabel: "Projekt tetőmodell · DEMO modell · mentett V2" }));
    expect(html).toContain("Projekt tetőmodell · DEMO modell · mentett V2");
    expect(html).toContain("Névleges lemezszélesség");
    expect(html).toContain("További termékadat szükséges");
    expect(html).not.toContain("Sematikus fedési rajz");
    expect(html).not.toContain(">Mentés<");
  });

  it("offers standalone manual geometry without requiring a project", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGableMetalTilePreview));
    expect(html).toContain("Projekt nélküli kézi geometria");
    expect(html).toContain("Épület hossza");
    expect(html).toContain("Add meg az összes érvényes tetőméretet");
  });

  it("draws the same two-plane column and modular counts as the valid calculation", () => {
    const output = calculateGableMetalTileCovering(geometry, {
      nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000,
      minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0,
      lengthCompatibilityConfirmed: true, lengthDataSource: "DEMO tesztadat", isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 4,
    });
    const html = renderToStaticMarkup(createElement(MetalTileDrawing, { output }));
    expect(output.status).toBe("VALID");
    expect(html).toContain('data-columns-per-plane="10"');
    expect(html).toContain('data-total-sheet-count="20"');
    expect(html).toContain('data-module-divisions="4"');
    expect(html).toContain("összesen 20 cserepeslemez-tábla");
  });
});
