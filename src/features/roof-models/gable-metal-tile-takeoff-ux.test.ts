import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./gable-metal-tile-takeoff-actions", () => ({ createGableMetalTileTakeoffAction: vi.fn() }));
import { calculateGableRoof } from "@/domain/calculations/gable-roof";
import { calculateGableMetalTileCovering, type GableMetalTileCoveringInput } from "@/domain/calculations/gable-metal-tile-covering";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import type { SavedMetalTileCovering, SavedMetalTileCoveringRevision } from "./gable-metal-tile-covering-data";
import { GableMetalTileTakeoffCreation } from "./gable-metal-tile-takeoff-creation";
import { compatibleGableMetalTileTakeoffOptions, sameOrNewGableMetalTileTakeoffOperation, supportedMetalTileTakeoffRevision } from "./gable-metal-tile-takeoff-ux";

const projectId = "00000000-0000-4000-8000-000000000001";
const roofModelId = "00000000-0000-4000-8000-000000000002";
const roofRevisionId = "00000000-0000-4000-8000-000000000003";
const geometryInput = { inputMode: "height" as const, buildingLengthMm: 10_000, buildingWidthMm: 6_000, roofRiseMm: 4_000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const productInput: GableMetalTileCoveringInput = {
  nominalSheetWidthMm: 1_200, effectiveCoveringWidthMm: 1_000, physicalSheetLengthMm: 5_100, effectiveCoveringLengthMm: 5_000,
  minimumPhysicalLengthMm: null, maximumPhysicalLengthMm: null, eaveEndAllowanceMm: 0, ridgeEndAllowanceMm: 0, longitudinalOverlapMm: 0,
  lengthCompatibilityConfirmed: true, lengthDataSource: "Kézi termékadatlap", isModular: true, moduleBaseLengthMm: 1_000, modulePitchMm: 1_000, moduleCount: 4,
};
const geometry = calculateGableRoof(geometryInput);
const output = { geometry, covering: calculateGableMetalTileCovering(geometry, productInput) };
const revision: SavedMetalTileCoveringRevision = {
  revisionId: "00000000-0000-4000-8000-000000000004", revisionNumber: 2, scope: "project",
  input: { calculatorType: "roof.gable.metal-tile-covering", scope: "project", source: { mode: "project", projectId, roofModelId, roofModelRevisionId: roofRevisionId, geometryCalculationId: "00000000-0000-4000-8000-000000000005", geometryCalculationRevisionId: "00000000-0000-4000-8000-000000000006", geometryInput }, productInput },
  output, provenance: { geometry: "saved_verified_roof_model_revision", productInput: "user_provided" }, validationStatus: "estimated", createdAt: "2026-10-15T00:00:00Z",
};
const saved: SavedMetalTileCovering = { calculationId: "00000000-0000-4000-8000-000000000007", organizationId: "00000000-0000-4000-8000-000000000008", projectId, roofModelId, displayName: "Fedés", currentRevisionId: revision.revisionId, currentRevisionNumber: 2, revisions: [revision] };
const option = (id: string, technicalSpecs: Record<string, string> = {}): GableCoveringTakeoffOption => ({
  id, productId: "00000000-0000-4000-8000-000000000009", productName: "Lemez", productCode: null, productCategory: "roof_covering", variantName: id,
  purchasingUnit: "piece", nominalWidthMm: 1_200, effectiveWidthMm: 1_000, lengthMm: 5_100, technicalSpecs,
  provenance: "user_provided", sourceName: "Kézi adat", latestPrice: null,
});

describe("cserepeslemez anyagkimutatás UX szerződés", () => {
  it("uses the exact eligible saved project revision and quantity", () => {
    const result = supportedMetalTileTakeoffRevision(saved, revision, projectId, roofModelId);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.transfer.source?.roofModelRevisionId).toBe(roofRevisionId);
      expect(result.transfer.inputSnapshot).toBe(revision.input);
      expect(result.transfer.quantity).toBe(output.covering.totalSheetCount);
    }
    expect(supportedMetalTileTakeoffRevision(saved, revision, projectId, "00000000-0000-4000-8000-000000000010").ok).toBe(false);
    expect(supportedMetalTileTakeoffRevision({ ...saved, projectId: null }, revision, projectId, roofModelId).ok).toBe(false);
  });

  it("keeps V1 quantities when V2 is the current calculation", () => {
    const v1GeometryInput = { ...geometryInput, buildingLengthMm: 10_001 };
    const v1Output = { geometry: calculateGableRoof(v1GeometryInput), covering: calculateGableMetalTileCovering(calculateGableRoof(v1GeometryInput), productInput) };
    const v1: SavedMetalTileCoveringRevision = { ...revision, revisionId: "00000000-0000-4000-8000-000000000011", revisionNumber: 1,
      input: { ...(revision.input as Record<string, unknown>), source: { ...(revision.input as { source: Record<string, unknown> }).source, geometryInput: v1GeometryInput } }, output: v1Output };
    const v2: SavedMetalTileCoveringRevision = { ...revision, revisionNumber: 2 };
    const current = { ...saved, currentRevisionId: v2.revisionId, currentRevisionNumber: 2, revisions: [v2, v1] };
    const result = supportedMetalTileTakeoffRevision(current, v1, projectId, roofModelId);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.transfer.quantity).toBe(22);
    expect(output.covering.totalSheetCount).toBe(20);
  });

  it("matches physical sheet dimensions and known modular catalog values", () => {
    const result = supportedMetalTileTakeoffRevision(saved, revision, projectId, roofModelId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const matching = option("match", { moduleBaseLengthMm: "1000", modulePitchMm: "1000", moduleCount: "4" });
    const missingModuleMetadata = option("manual", {});
    const differentModule = option("wrong-module", { moduleBaseLengthMm: "1000", modulePitchMm: "900", moduleCount: "4" });
    const differentLength = { ...matching, id: "wrong-length", lengthMm: 5_000 };
    expect(compatibleGableMetalTileTakeoffOptions([matching, missingModuleMetadata, differentModule, differentLength], result.transfer).map((item) => item.id)).toEqual(["match", "manual"]);
  });

  it("reuses an id for a retry and allocates a new id when payload changes", () => {
    const createId = (() => { let count = 0; return () => `operation-${++count}`; })();
    const first = sameOrNewGableMetalTileTakeoffOperation(null, "payload-a", createId);
    expect(sameOrNewGableMetalTileTakeoffOperation(first, "payload-a", createId)).toBe(first);
    const edited = sameOrNewGableMetalTileTakeoffOperation(first, "payload-b", createId);
    expect(edited.operationId).not.toBe(first.operationId);
  });

  it("renders exact revision, quantity, dimensions, stale source and unsaved confirmation", () => {
    const html = renderToStaticMarkup(createElement(GableMetalTileTakeoffCreation, {
      organizationId: saved.organizationId, projectId, projectName: "DEMO tetőprojekt", roofModelId,
      currentRoofRevisionId: "00000000-0000-4000-8000-000000000012", currentRoofRevisionNumber: 3,
      saved, revision, dirty: true, unsavedRoofGeometry: false,
      options: [option("catalog", { moduleBaseLengthMm: "1000", modulePitchMm: "1000", moduleCount: "4" })],
    }));
    expect(html).toContain("Anyagkimutatás készítése");
    expect(html).toContain(revision.revisionId);
    expect(html).toContain(roofRevisionId);
    expect(html).toContain("20 db");
    expect(html).toContain("Fizikai");
    expect(html).toContain("Névleges / hasznos szélesség");
    expect(html).toContain("Nem mentett szerkesztés van folyamatban");
    expect(html).toContain("A pontos mentett revízió használatát választom.");
    expect(html).toContain("korábbi tetőrevízióból készült");
    expect(html).toContain("Nem hagy jóvá kimutatást");
  });
});
