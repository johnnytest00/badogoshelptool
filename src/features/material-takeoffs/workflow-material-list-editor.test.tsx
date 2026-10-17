import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowMaterialListSurveyContext } from "./workflow-material-list-editor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/secure-uuid", () => ({ generateSecureUuid: () => "00000000-0000-4000-8000-000000000099" }));
vi.mock("./workflow-material-list-actions", () => ({ saveWorkflowMaterialListAction: async () => ({ ok: false }) }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({
    notify: vi.fn(), requestConfirmation: vi.fn(), hasUnsavedChanges: false, hasPendingChanges: false,
    requestNavigation: vi.fn(),
  }),
  useUnsavedChangeGuard: vi.fn(),
}));

import { WorkflowMaterialListEditor } from "./workflow-material-list-editor";

const surveySource: WorkflowMaterialListSurveyContext = {
  surveyId: "00000000-0000-4000-8000-000000000001",
  surveyRevisionId: "00000000-0000-4000-8000-000000000002",
  surveyVersion: 1,
  currentSurveyVersion: 2,
  stale: true,
  suggestions: [{
    key: "section-1:measurement-1", sectionId: "00000000-0000-4000-8000-000000000003",
    description: "DEMO eresz · ereszcsatorna-szakasz mért hossza", quantity: "8.25", unit: "linear_meter",
    materialCategory: "gutter", sourceLabel: "DEMO ereszszakasz · V1 · mért adat", quantityKind: "measured",
    sourceRef: { type: "measurement", sectionId: "00000000-0000-4000-8000-000000000003", measurementId: "00000000-0000-4000-8000-000000000004" },
  }],
  unavailable: ["DEMO tető: hiányzik az ellenőrzött geometriai számítás."],
};

describe("survey material list editor", () => {
  it("shows the exact source, editable measured quantity, missing price, and explicit stale confirmation", () => {
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000005", products: [], plans: [], categories: [], list: null,
      surveySource, defaultName: "DEMO tető anyaglista",
    }));
    expect(html).toContain("DEMO tető anyaglista");
    expect(html).toContain("Forrásfelmérés · V1");
    expect(html).toContain("aktuális felmérés V2");
    expect(html).not.toContain("checked=");
    expect(html).toContain("disabled=\"\">Mennyiségek megerősítése és mentése");
    expect(html).toContain("DEMO ereszszakasz · V1 · mért adat");
    expect(html).toContain('aria-label="DEMO eresz · ereszcsatorna-szakasz mért hossza mennyisége"');
    expect(html).toContain('value="8.25"');
    expect(html).toContain("Forrásegység: m");
    expect(html).toContain("Ár nincs megadva");
    expect(html).toContain("DEMO tető: hiányzik az ellenőrzött geometriai számítás.");
    expect(html).toContain("Nincs ilyen egységű katalógustermék. A mért mennyiséget nem alakítjuk át darabra.");
  });
});
