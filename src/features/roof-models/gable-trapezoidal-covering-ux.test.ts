import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { calculateGableRoof, type GableRoofInput } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering, type GableTrapezoidalCoveringInput } from "@/domain/calculations/gable-trapezoidal-covering";
import { coveringRevisionView, sameOrNewCoveringOperation } from "./gable-trapezoidal-covering-ux";
import type { SavedGableCovering, SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";

vi.mock("./gable-trapezoidal-covering-actions", () => ({ saveGableTrapezoidalCovering: vi.fn(), readGableTrapezoidalCovering: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
import { GableTrapezoidalCoveringPanel } from "./gable-trapezoidal-covering-panel";

const geometryInput: GableRoofInput = { inputMode: "height", buildingLengthMm: 10000, buildingWidthMm: 6000, roofRiseMm: 4000, eaveOverhangMm: 0, frontGableOverhangMm: 0, rearGableOverhangMm: 0 };
const geometry = calculateGableRoof(geometryInput);
const covering = (width: number): GableTrapezoidalCoveringInput => ({ nominalSheetWidthMm: 1100, effectiveCoveringWidthMm: width, selectedSheetLengthMm: 5000, minimumSheetLengthMm: null, maximumSheetLengthMm: null, endAllowanceMm: null, longitudinalOverlapMm: null, lapCompatibilityConfirmed: false, maximumSheetCount: 100000 });
function revision(number: number, width: number): SavedGableCoveringRevision {
  const input = covering(width);
  return { revisionId: `revision-${number}`, revisionNumber: number, scope: "standalone", input: { scope: "standalone", source: { geometryInput, geometrySource: "manual_user_input" }, coveringInput: input }, output: { geometry, covering: calculateGableTrapezoidalCovering(geometry, input) }, provenance: { geometry: "manual_user_provided" }, validationStatus: "estimated", createdAt: `2026-10-14T0${number}:00:00Z` };
}
const v1 = revision(1, 1000);
const v2 = revision(2, 500);
const saved: SavedGableCovering = { calculationId: "calculation-1", organizationId: "org", projectId: null, roofModelId: null, displayName: "DEMO fedés", currentRevisionId: v2.revisionId, currentRevisionNumber: 2, revisions: [v2, v1] };

describe("trapézlemez mentési felület", () => {
  it("a mentett V2 bemenetét, mennyiségét és revízióválasztóit mutatja", () => {
    const html = renderToStaticMarkup(createElement(GableTrapezoidalCoveringPanel, { mode: "standalone", organizationId: "org", geometryInput, geometry, sourceLabel: "DEMO kézi méret", saved, onLoadGeometry: vi.fn(), onRevisionModeChange: vi.fn(), onSavePendingChange: vi.fn(), onSaveComplete: vi.fn() }));
    expect(html).toContain("DEMO fedés");
    expect(html).toContain('value="500"');
    expect(html).toContain("40 db");
    expect(html).toContain("Korábbi változatok");
    expect(html).toContain("Legfrissebb változat");
    expect(html).toContain("V1");
    expect(html).toContain("Sematikus fedési kiosztás");
  });
  it("a kiválasztott történeti V1 inputot és eredményt együtt adja vissza", () => {
    const view = coveringRevisionView(v1);
    expect(view.coveringInput.effectiveCoveringWidthMm).toBe(1000);
    expect(view.covering.totalSheetCount).toBe(20);
    expect(view.geometryInput).toEqual(geometryInput);
  });
  it("projektben pontos mentett tetőforrást és elavult forrás jelzést ad", () => {
    const projectRevision: SavedGableCoveringRevision = { ...v1, scope: "project", input: { scope: "project", source: { geometryInput, roofModelRevisionId: "old-roof-revision" }, coveringInput: covering(1000) } };
    const projectSaved: SavedGableCovering = { ...saved, projectId: "project", roofModelId: "model", currentRevisionId: projectRevision.revisionId, currentRevisionNumber: 1, revisions: [projectRevision] };
    const html = renderToStaticMarkup(createElement(GableTrapezoidalCoveringPanel, { mode: "project", organizationId: "org", projectId: "project", roofModelId: "model", roofModelRevisionId: "new-roof-revision", roofModelRevisionNumber: 2, savedCalculations: [projectSaved], name: "DEMO tető", geometryInput, geometry, sourceLabel: "DEMO modell" }));
    expect(html).toContain("old-roof-revision");
    expect(html).toContain("eltér a tetőmodell legfrissebb revíziójától");
    expect(html).toContain("Újraszámítás a legfrissebb mentett tetőrevízióból");
  });
  it("azonos kéréshez ugyanazt a biztonságos műveletazonosítót tartja meg, módosult kéréshez újat kér", () => {
    let n = 0;
    const create = () => `secure-${++n}`;
    const first = sameOrNewCoveringOperation(null, "V1", null, create);
    expect(sameOrNewCoveringOperation(first, "V1", null, create)).toBe(first);
    expect(sameOrNewCoveringOperation(first, "V2", first.calculationId, create)).toEqual({ signature: "V2", calculationId: first.calculationId, operationId: "secure-3" });
  });
});
