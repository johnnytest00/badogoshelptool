import { createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./survey-geometry-source-actions", () => ({ ensureSurveyRoofGeometryAction: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/material-takeoffs/workflow-material-list-actions", () => ({ saveWorkflowMaterialListAction: vi.fn() }));
vi.mock("@/features/quotations/material-list-quotation-actions", () => ({ createQuotationDraftFromMaterialListAction: vi.fn() }));

import { SurveyMaterialListPanel } from "./survey-material-list-panel";
import type { SurveyMaterialSource } from "@/features/material-takeoffs/survey-material-source";

const org = "00000000-0000-4000-8000-000000000010";
const source: SurveyMaterialSource = {
  surveyId: "00000000-0000-4000-8000-000000000301", surveyRevisionId: "00000000-0000-4000-8000-000000000302", surveyName: "DEMO eresz",
  surveyVersion: 2, currentSurveyVersion: 2, stale: false,
  suggestions: [{ key: "k", sectionId: "s", description: "DEMO eresz · mért hossza", quantity: "12.5", unit: "linear_meter", materialCategory: "gutter", sourceLabel: "Ereszszakasz · V2 · mért adat", quantityKind: "measured", sourceRef: { type: "measurement", sectionId: "s", measurementId: "m" } }],
  geometryPending: false, suspectedDuplicates: {}, unavailable: ["DEMO tető: nincs ellenőrzött nyeregtető-geometriai számítás."],
};
const render = (overrides: Partial<Parameters<typeof SurveyMaterialListPanel>[0]> = {}) => renderToStaticMarkup(
  <SurveyMaterialListPanel ref={createRef()} organizationId={org} savedVersion={2} source={source} linkedLists={[]} unsaved={false} preparing={false} onClose={() => undefined} {...overrides} />,
);

describe("SurveyMaterialListPanel", () => {
  it("shows the exact source revision, the derivable quantity and an explicit create action", () => {
    const html = render();
    expect(html).toContain("Anyaglista készítése");
    expect(html).toContain("DEMO eresz · V2");
    expect(html).toContain("12,5 m");
    expect(html).toContain("mért adat");
    expect(html).toContain("Anyaglista létrehozása");
    expect(html).toContain("Nem átvehető mérések (1)");
    expect(html).toContain("nem becsült");
  });

  it("waits for the saved revision instead of offering stale quantities", () => {
    expect(render({ savedVersion: 3 })).toContain("aria-busy=\"true\"");
    expect(render({ source: null })).not.toContain("Anyaglista létrehozása");
    expect(render({ preparing: true })).not.toContain("Anyaglista létrehozása");
  });

  it("blocks creation while the survey has unsaved edits", () => {
    const html = render({ unsaved: true });
    expect(html).toContain("Mentetlen módosításaid vannak");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Anyaglista létrehozása<\/button>/);
  });

  it("shows an existing list for this revision and withholds duplicate creation until asked", () => {
    const html = render({ linkedLists: [{ listId: "00000000-0000-4000-8000-000000000303", name: "DEMO lista", version: 1, updatedAt: "", itemCount: 1, surveyVersion: 2, quotations: [] }] });
    expect(html).toContain("már készült anyaglista");
    expect(html).toContain("Új, külön anyaglista készítése");
    expect(html).not.toContain("Anyaglista létrehozása</button>");
  });

  it("offers manual continuation when nothing is derivable", () => {
    const html = render({ source: { ...source, suggestions: [] } });
    expect(html).toContain("nincs biztonságosan átvehető mennyiség");
    expect(html).toContain("Kézi tételekkel folytatom");
  });
});
