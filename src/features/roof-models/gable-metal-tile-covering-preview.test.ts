import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./gable-metal-tile-covering-actions", () => ({ saveGableMetalTileCovering: vi.fn() }));
vi.mock("./gable-metal-tile-takeoff-actions", () => ({ createGableMetalTileTakeoffAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({ useAppInteraction: () => ({ notify: vi.fn(), requestConfirmation: vi.fn() }), useUnsavedChangeGuard: vi.fn() }));
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering } from "@/domain/calculations/gable-metal-tile-covering";
import { GableMetalTileCoveringPreview, MetalTileDrawing, StandaloneGableMetalTilePreview } from "./gable-metal-tile-covering-preview";
import { sameOrNewCoveringOperation } from "./gable-trapezoidal-covering-ux";

const geometry = calculateGableRoof({ inputMode: "height", buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 });

describe("cserepeslemez-fedés preview", () => {
  it("shows project geometry provenance and incomplete product state without a save action", () => {
    const html = renderToStaticMarkup(createElement(GableMetalTileCoveringPreview, { geometry, sourceLabel: "Projekt tetőmodell · DEMO modell · mentett V2" }));
    expect(html).toContain("Projekt tetőmodell · DEMO modell · mentett V2");
    expect(html).toContain("Névleges lemezszélesség");
    expect(html).toContain("További termékadat szükséges");
    expect(html).not.toContain("Sematikus fedési rajz");
    expect(html).not.toContain(">Számítás mentése<");
  });

  it("offers standalone manual geometry without requiring a project", () => {
    const html = renderToStaticMarkup(createElement(StandaloneGableMetalTilePreview));
    expect(html).toContain("Projekt nélküli kézi geometria");
    expect(html).toContain("Épület hossza");
    expect(html).toContain("Add meg az összes érvényes tetőméretet");
  });

  it("reuses valid survey geometry and keeps revision identifiers behind a disclosure", () => {
    const handoff = { inputMode: "height" as const, buildingLengthMm: "10000", buildingWidthMm: "6000", roofRiseMm: "4000", roofPitchDegrees: "", eaveOverhangMm: "0", frontGableOverhangMm: "0", rearGableOverhangMm: "0" };
    const html = renderToStaticMarkup(createElement(StandaloneGableMetalTilePreview, {
      organizationId: "organization",
      embedded: true,
      initialHandoff: handoff,
      handoffSource: { surveyId: "survey-uuid", revisionId: "revision-uuid", version: 3 },
    }));

    expect(html).toContain("Méretek átvéve a felmérésből · V3");
    expect(html).toContain("Tetőméretek szerkesztése");
    expect(html).toContain("Átvett tetőméretek");
    expect(html).toContain("További termékadat szükséges");
    expect(html).not.toContain('aria-label="Épület hossza, cm"');
    expect(html.indexOf("revision-uuid")).toBeGreaterThan(html.indexOf("Forrás adatai"));
    expect(html).not.toContain("Projekt nélküli kézi geometria");
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

  it("shows the selected historical snapshot with its own geometry and product values", () => {
    const geometryInputV1 = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
    const geometryInputV2 = { ...geometryInputV1, buildingLengthMm: 20_000 };
    const productInput = { nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000, minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0, lengthCompatibilityConfirmed: true, lengthDataSource: "Kézi V1 adatforrás", isModular: false, moduleBaseLengthMm: null, modulePitchMm: null, moduleCount: null };
    const productInputV2 = { ...productInput, effectiveCoveringWidthMm: 900 };
    const revision = (revisionNumber: number, roofInput: typeof geometryInputV1, product = productInput) => ({ revisionId: `revision-${revisionNumber}`, revisionNumber, scope: "standalone" as const, input: { calculatorType: "roof.gable.metal-tile-covering", scope: "standalone", source: { mode: "standalone", geometrySource: "manual_user_input", geometryInput: roofInput }, productInput: product }, output: {}, provenance: {}, validationStatus: "estimated", createdAt: `2026-10-15T0${revisionNumber}:00:00Z` });
    const saved = { calculationId: "calculation", organizationId: "organization", projectId: null, roofModelId: null, displayName: "Cserepeslemez-fedés", currentRevisionId: "revision-2", currentRevisionNumber: 2, revisions: [revision(2, geometryInputV2, productInputV2), revision(1, geometryInputV1)] };
    const html = renderToStaticMarkup(createElement(GableMetalTileCoveringPreview, { geometry: calculateGableRoof(geometryInputV2), geometryInput: geometryInputV1, sourceLabel: "Kézi geometria", organizationId: "organization", mode: "standalone", saved, initialRevisionNumber: 1 }));
    const expectedV1 = calculateGableMetalTileCovering(calculateGableRoof(geometryInputV1), productInput);
    expect(html).toContain("Korábbi változat V1");
    expect(html).toContain("Kézi V1 adatforrás");
    expect(html).toContain(`data-total-sheet-count="${expectedV1.totalSheetCount}"`);
    expect(html).toContain('aria-label="Fizikai lemezhossz, cm" value="510"');
    expect(html).toContain("<strong>100 m²</strong>");
    expect(html).not.toContain("<strong>200 m²</strong>");
    expect(html).not.toContain("Nem mentett módosítások");
    const currentHtml = renderToStaticMarkup(createElement(GableMetalTileCoveringPreview, { geometry: calculateGableRoof(geometryInputV2), geometryInput: geometryInputV2, sourceLabel: "Kézi geometria", organizationId: "organization", mode: "standalone", saved, initialRevisionNumber: 2 }));
    expect(currentHtml).toContain("Mentve V2");
    const expectedV2 = calculateGableMetalTileCovering(calculateGableRoof(geometryInputV2), productInputV2);
    expect(currentHtml).toContain(`data-total-sheet-count="${expectedV2.totalSheetCount}"`);
    expect(currentHtml).toContain('aria-label="Hasznos fedési szélesség, cm" value="90"');
    expect(currentHtml).not.toContain("Nem mentett módosítások");
  });

  it("keeps the operation ID for an unchanged retry and changes it for an edited payload", () => {
    const ids = ["calculation-id", "retry-id", "changed-payload-id"];
    const createId = () => ids.shift()!;
    const first = sameOrNewCoveringOperation(null, "same-payload", null, createId);
    const retry = sameOrNewCoveringOperation(first, "same-payload", first.calculationId, createId);
    const changed = sameOrNewCoveringOperation(retry, "changed-payload", retry.calculationId, createId);
    expect(retry).toEqual(first);
    expect(changed.calculationId).toBe(first.calculationId);
    expect(changed.operationId).not.toBe(first.operationId);
  });
});
