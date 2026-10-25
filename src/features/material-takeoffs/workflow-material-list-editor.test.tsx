import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowMaterialListSurveyContext } from "./workflow-material-list-editor";
import type { MaterialPreparationList } from "./material-preparation-data";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/secure-uuid", () => ({
  generateSecureUuid: () => "00000000-0000-4000-8000-000000000099",
  createIdempotencyKey: () => ({ current: () => "00000000-0000-4000-8000-000000000098", renew: () => "00000000-0000-4000-8000-000000000098" }),
}));
vi.mock("@/features/quotations/material-list-quotation-actions", () => ({ createQuotationDraftFromMaterialListAction: vi.fn() }));
vi.mock("@/features/execution/execution-document-link-actions", () => ({ linkExecutionPlanDocumentAction: vi.fn(), unlinkExecutionPlanDocumentAction: vi.fn(), createExecutionPlanAndLinkDocumentAction: vi.fn() }));
vi.mock("./workflow-material-list-actions", () => ({ saveWorkflowMaterialListAction: async () => ({ ok: false }) }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({
  useAppInteraction: () => ({
    notify: vi.fn(), requestConfirmation: vi.fn(), hasUnsavedChanges: false, hasPendingChanges: false,
    requestNavigation: vi.fn(),
  }),
  useUnsavedChangeGuard: vi.fn(),
}));

import { calculateMaterialLineTotal, WorkflowMaterialListEditor } from "./workflow-material-list-editor";

const surveySource: WorkflowMaterialListSurveyContext = {
  surveyId: "00000000-0000-4000-8000-000000000001",
  surveyRevisionId: "00000000-0000-4000-8000-000000000002",
  surveyName: "DEMO ereszcsatorna",
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

describe("material line totals", () => {
  it("calculates a valid quantity and leaves invalid quantities without totals", () => {
    expect(calculateMaterialLineTotal("2,5", 120.4)).toBe(301);
    expect(calculateMaterialLineTotal("0", 120.4)).toBeNull();
    expect(calculateMaterialLineTotal("1.1234567", 120.4)).toBeNull();
    expect(calculateMaterialLineTotal("2", -1)).toBeNull();
    expect(calculateMaterialLineTotal("2", 0)).toBe(0);
  });
});

describe("survey material list editor", () => {
  it("keeps an empty standalone draft savable and gives a direct add-material prompt", () => {
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000005", products: [], plans: [], categories: [], list: null,
      defaultName: "DEMO üres lista",
    }));
    expect(html).toContain("Még nincs anyag a listában");
    expect(html).toContain("Anyag hozzáadása");
    expect(html).toContain("Az árösszesítés az első tétel után jelenik meg.");
    expect(html).toContain('class="workflow-material-field workflow-material-product-field" role="group" aria-label="Termék keresése"');
    expect(html).not.toContain('<label class="workflow-material-field workflow-material-product-field"');
    expect(html).not.toContain('disabled="">Anyaglista mentése');
  });

  it("shows the exact source, editable measured quantity, missing price, and explicit stale confirmation", () => {
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000005", products: [], plans: [], categories: [], list: null,
      surveySource, defaultName: "DEMO tető anyaglista",
    }));
    expect(html).toContain("DEMO tető anyaglista");
    expect(html).toContain("DEMO ereszcsatorna · V1");
    expect(html).toContain("Elavult forrás · jelenlegi verzió V2");
    expect(html).not.toContain("checked=");
    expect(html).toContain("disabled=\"\">Mennyiségek megerősítése és mentése");
    expect(html).toContain("DEMO ereszszakasz · V1 · mért adat");
    expect(html).toContain('aria-label="DEMO eresz · ereszcsatorna-szakasz mért hossza mennyisége"');
    expect(html).toContain('value="8.25"');
    expect(html).toContain("<strong>m</strong>");
    expect(html).toContain("Ár nincs megadva");
    expect(html).toContain("DEMO tető: hiányzik az ellenőrzött geometriai számítás.");
    expect(html).toContain("Nincs ilyen egységű katalógustermék. A mért mennyiséget nem alakítjuk át darabra.");
  });

  it("reopens immutable source provenance, shows quantity edits, and marks unsourced manual items accurately", () => {
    const sourceItemId = "00000000-0000-4000-8000-000000000006";
    const list = {
      id: "00000000-0000-4000-8000-000000000005", projectId: null, executionPlanId: null,
      name: "DEMO ereszcsatorna anyaglista", version: 2, updatedAt: "2026-10-17T00:00:00Z",
      currentRevisionId: "00000000-0000-4000-8000-000000000007",
      currentRevision: {
        id: "00000000-0000-4000-8000-000000000007", revisionNumber: 2, state: "preliminary",
        sourceTakeoffs: [], createdAt: "2026-10-17T00:00:00Z", staleTakeoffIds: [],
        items: [
          { id: sourceItemId, kind: "manual", description: "DEMO eresz", quantity: "9.25", unit: "linear_meter", materialCategory: "gutter" },
          { id: "00000000-0000-4000-8000-000000000008", kind: "manual", description: "DEMO kézi tétel", quantity: "2.500000", unit: "piece", materialCategory: "other", manualPriceAmount: "150.00", manualPriceKind: "gross", priceSnapshot: { amount: "150.00", currency: "HUF", purchasingUnit: "piece", priceKind: "gross", manual: true, provenance: "user_provided" } },
        ],
        surveySource: {
          surveyId: surveySource.surveyId, surveyRevisionId: surveySource.surveyRevisionId,
          surveyVersion: 1, surveyName: "DEMO ereszcsatorna", currentSurveyVersion: 1, stale: false,
          items: [{ itemId: sourceItemId, sectionId: "00000000-0000-4000-8000-000000000003", sourceKind: "measurement",
            sourceRef: { type: "measurement", sectionId: "00000000-0000-4000-8000-000000000003", measurementId: "00000000-0000-4000-8000-000000000004" },
            sourceLabel: "Ereszszakasz hossza", sourceValue: "8.5", sourceUnit: "m", quantityKind: "measured" }],
        },
      },
      history: [],
    } as unknown as MaterialPreparationList;
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000009", products: [], plans: [], categories: [], list,
    }));

    expect(html).toContain("DEMO ereszcsatorna · V1");
    expect(html).toContain("00000000-0000-4000-8000-000000000001");
    expect(html).toContain("00000000-0000-4000-8000-000000000002");
    expect(html).toContain("Ereszszakasz hossza · forrás 8,5 m · mért adat · felmérés V1");
    expect(html).toContain("A mennyiség módosult");
    expect(html).toContain('value="9.25"');
    expect(html).toContain('value="2.5"');
    expect(html).toContain('value="150.00"');
    expect(html).toContain("375 Ft");
    expect(html).toContain("Ehhez a tételhez nincs rögzített felmérési forrás.");
  });

  it("links a saved list to its source survey, its quotation drafts and its work logs", () => {
    const itemId = "00000000-0000-4000-8000-000000000016";
    const list = {
      id: "00000000-0000-4000-8000-000000000015", projectId: null, executionPlanId: null, name: "DEMO lista", version: 2, updatedAt: "2026-10-17T00:00:00Z",
      currentRevisionId: "00000000-0000-4000-8000-000000000017",
      currentRevision: { id: "00000000-0000-4000-8000-000000000017", revisionNumber: 2, state: "preliminary", sourceTakeoffs: [], createdAt: "2026-10-17T00:00:00Z", staleTakeoffIds: [],
        items: [{ id: itemId, kind: "manual", description: "DEMO eresz", quantity: "9.25", unit: "linear_meter", materialCategory: "gutter" }],
        surveySource: { surveyId: surveySource.surveyId, surveyRevisionId: surveySource.surveyRevisionId, surveyVersion: 1, surveyName: "DEMO ereszcsatorna", currentSurveyVersion: 1, stale: false, items: [] } },
      history: [],
    } as unknown as MaterialPreparationList;
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000009", products: [], plans: [], categories: [], list,
      quotations: [{ quotationId: "00000000-0000-4000-8000-000000000018", name: "DEMO ajánlat", status: "draft", sourceListVersion: 2, currentListVersion: 2, createdAt: "" }],
      planLinks: [{ linkId: "00000000-0000-4000-8000-000000000019", planId: "00000000-0000-4000-8000-000000000020", planTitle: "DEMO munkanapló", origin: "link" }],
    }));
    // M5: the retired survey page is no longer linked; the exact source identity stays visible.
    expect(html).not.toContain("/felmeresek/");
    expect(html).toContain(`Felmérés: ${surveySource.surveyId}`);
    expect(html).toContain("/ajanlatok/00000000-0000-4000-8000-000000000018");
    expect(html).toContain("Újabb piszkozat ugyanebből");
    expect(html).not.toContain("Árajánlat-piszkozat készítése");
    expect(html).toContain("/kivitelezes/00000000-0000-4000-8000-000000000020");
    expect(html).toContain("Leválasztás");
    expect(html).toContain("Munkanaplóhoz csatolás");
  });
});
