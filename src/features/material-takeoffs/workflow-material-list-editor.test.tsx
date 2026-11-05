// @vitest-environment jsdom
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render } from "@testing-library/react";
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

import { calculateMaterialLineTotal, listProductOptions, WorkflowMaterialListEditor } from "./workflow-material-list-editor";

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

describe("supplier-aware material options", () => {
  it("shows distinct supplier offers for one variant without duplicating its product identity", () => {
    const product = {
      id: "product", organizationId: "org", manufacturerId: null, manufacturerName: "Gyártó", category: "timber" as const, categoryId: "category", categoryName: "Faanyag", categoryActive: true,
      name: "Szarufa", description: null, productCode: null, status: "active" as const, provenance: "user_provided" as const, sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null, createdAt: "", updatedAt: "",
      variants: [{
        id: "variant", productId: "product", name: "75×200×5000 mm", sku: null, purchasingUnit: "strand" as const, nominalWidthMm: 75, effectiveWidthMm: null, thicknessMm: null, lengthMm: 5000, packagingQuantity: null, technicalSpecs: {}, provenance: "user_provided" as const, sourceName: null, sourceUrl: null, sourceDate: null, sourceNotes: null,
        prices: ["price-a", "price-b"].map((id, index) => ({ id, optionId: `option-${index}`, amount: 3500 + index, currency: "HUF", purchasingUnit: "strand" as const, priceKind: "net" as const, priceSource: null, effectiveDate: "2026-11-04", recordedAt: "2026-11-04T00:00:00Z", provenance: "user_provided" as const, sourceName: index ? "Kocsis Tüzép" : "Silver tüzép", sourceUrl: null, sourceDate: null, sourceNotes: null })),
        priceOptions: ["Silver tüzép", "Kocsis Tüzép"].map((label, index) => ({ id: `option-${index}`, label, status: "active" as const, prices: [], current: { id: `price-${index ? "b" : "a"}`, optionId: `option-${index}`, amount: 3500 + index, currency: "HUF", purchasingUnit: "strand" as const, priceKind: "net" as const, priceSource: null, effectiveDate: "2026-11-04", recordedAt: "2026-11-04T00:00:00Z", provenance: "user_provided" as const, sourceName: label, sourceUrl: null, sourceDate: null, sourceNotes: null } })), latestPrice: null,
      }],
    };
    const offers = listProductOptions([product], "category", false);
    expect(offers).toHaveLength(2);
    expect(new Set(offers.map((offer) => offer.id)).size).toBe(2);
    expect(offers.map(({ name }) => name)).toEqual(["Szarufa · 75×200×5000 mm", "Szarufa · 75×200×5000 mm"]);
    expect(offers.map(({ detail }) => detail)).toEqual(["Silver tüzép · szál", "Kocsis Tüzép · szál"]);
  });
});

describe("material list editor layout", () => {
  it("moves the editable manual price basis to the subtotal and defaults unspecified prices to gross", () => {
    const list = {
      id: "00000000-0000-4000-8000-000000000025", projectId: null, executionPlanId: null,
      name: "DEMO lista", version: 1, updatedAt: "2026-11-05T00:00:00Z", currentRevisionId: "revision",
      currentRevision: { id: "revision", revisionNumber: 1, state: "preliminary", sourceTakeoffs: [], createdAt: "", staleTakeoffIds: [], items: [
        { id: "net-item", kind: "manual", description: "Nettó tétel", quantity: "2", unit: "piece", materialCategory: "timber", manualPriceAmount: "150", manualPriceKind: "net" },
        { id: "default-item", kind: "manual", description: "Alapértelmezett tétel", quantity: "2", unit: "piece", materialCategory: "timber", manualPriceAmount: "100" },
      ] },
      history: [],
    } as unknown as MaterialPreparationList;
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000009", products: [], plans: [], categories: [], list,
    }));
    expect(html).toMatch(/Részösszeg[\s\S]*aria-label="Nettó tétel részösszegének ár típusa"[\s\S]*<option value="net" selected="">Nettó<\/option>/);
    expect(html).toMatch(/Részösszeg[\s\S]*aria-label="Alapértelmezett tétel részösszegének ár típusa"[\s\S]*<option value="gross" selected="">Bruttó<\/option>/);
    expect(html).not.toContain("árának alapja");
  });

  it("saves the chosen net or gross basis with the editable item", () => {
    const list = {
      id: "00000000-0000-4000-8000-000000000025", projectId: null, executionPlanId: null,
      name: "DEMO lista", version: 1, updatedAt: "2026-11-05T00:00:00Z", currentRevisionId: "revision",
      currentRevision: { id: "revision", revisionNumber: 1, state: "preliminary", sourceTakeoffs: [], createdAt: "", staleTakeoffIds: [], items: [
        { id: "item", kind: "manual", description: "Szarufa", quantity: "2", unit: "piece", materialCategory: "timber", manualPriceAmount: "150" },
      ] },
      history: [],
    } as unknown as MaterialPreparationList;
    const { container, getByLabelText } = render(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000009", products: [], plans: [], categories: [], list,
    }));
    const kind = getByLabelText("Szarufa részösszegének ár típusa") as HTMLSelectElement;
    expect(kind.value).toBe("gross");
    fireEvent.change(kind, { target: { value: "net" } });
    const items = JSON.parse(container.querySelector<HTMLInputElement>('input[name="items"]')!.value) as Array<{ manualPriceKind?: string }>;
    expect(items[0]?.manualPriceKind).toBe("net");
  });

  it("keeps the editor name, item rows, and add form inside one work surface", () => {
    const list = {
      id: "00000000-0000-4000-8000-000000000025", projectId: null, executionPlanId: null,
      name: "DEMO lista", version: 1, updatedAt: "2026-11-05T00:00:00Z", currentRevisionId: "revision",
      currentRevision: { id: "revision", revisionNumber: 1, state: "preliminary", sourceTakeoffs: [], createdAt: "", staleTakeoffIds: [], items: [{ id: "item", kind: "manual", description: "Szarufa", quantity: "2", unit: "piece", materialCategory: "timber" }] },
      history: [],
    } as unknown as MaterialPreparationList;
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000009", products: [], plans: [], categories: [], list,
    }));
    expect(html).toContain('<section class="workflow-material-work-surface">');
    expect(html).toMatch(/<h1[^>]*>Anyaglista<\/h1>/);
    expect(html).toContain('value="DEMO lista"');
    expect(html).toMatch(/class="workflow-material-work-surface">[\s\S]*class="workflow-material-meta"[\s\S]*class="workflow-material-add-panel"[\s\S]*class="workflow-material-lines"/);
    expect(html.indexOf('class="workflow-material-add-panel"')).toBeGreaterThan(html.indexOf('class="workflow-material-meta"'));
    expect(html.indexOf('class="workflow-material-add-panel"')).toBeLessThan(html.indexOf('class="workflow-material-lines"'));
    expect(html).toContain('aria-label="Szarufa megnevezése"');
    expect(html).toContain('aria-label="Szarufa mennyisége"');
    expect(html).toContain('aria-label="Szarufa eltávolítása"');
    expect(html).not.toContain('class="glass-bubble workflow-material-meta"');
    expect(html).not.toContain('class="glass-bubble workflow-material-lines"');
    expect(html).not.toContain('class="glass-bubble workflow-material-add-panel"');
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
    expect(html).toContain("Keress a teljes katalógusban. A mért mennyiséget nem alakítjuk át darabra.");
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
      planLinks: [{ linkId: "00000000-0000-4000-8000-000000000019", planId: "00000000-0000-4000-8000-000000000020", planTitle: "DEMO munkanapló", origin: "link" }],
    }));
    // M5: the retired survey page is no longer linked; the exact source identity stays visible.
    expect(html).not.toContain("/felmeresek/");
    expect(html).toContain(`Felmérés: ${surveySource.surveyId}`);
    expect(html).not.toContain("/ajanlatok/00000000-0000-4000-8000-000000000018");
    expect(html).not.toContain("Újabb piszkozat ugyanebből");
    expect(html).toContain("Árajánlat létrehozása");
    expect(html).not.toContain("Önálló lista · a munkanapló-kapcsolat opcionális");
    expect(html).not.toContain("Nincs munkanaplóhoz kapcsolva");
    expect(html).not.toContain("<strong>Munkanapló</strong>");
    expect(html).toMatch(/class="secondary-button plan-link-open is-compact"[^>]*><svg[^>]*aria-hidden="true"/);
    expect(html).toContain('<span class="survey-optional-badge">Opcionális</span>');
    expect(html).not.toContain("Anyagkimutatás");
    expect(html).not.toContain("Új tétel</p>");
    expect(html).toMatch(/class="secondary-button workflow-material-quotation-button"[^>]*><svg[^>]*aria-hidden="true"/);
    expect(html).toContain("/kivitelezes/00000000-0000-4000-8000-000000000020");
    expect(html).toContain("Leválasztás");
    expect(html).toContain("Munkanaplóhoz csatolás");
  });

  it("keeps quote drafts and work log controls below the material list instead of above it", () => {
    const list = {
      id: "00000000-0000-4000-8000-000000000025", projectId: null, executionPlanId: null,
      name: "DEMO lista", version: 1, updatedAt: "2026-11-05T00:00:00Z", currentRevisionId: "revision",
      currentRevision: { id: "revision", revisionNumber: 1, state: "preliminary", sourceTakeoffs: [], createdAt: "", staleTakeoffIds: [], items: [{ id: "item", kind: "manual", description: "Szarufa", quantity: "2", unit: "piece", materialCategory: "timber" }] },
      history: [],
    } as unknown as MaterialPreparationList;
    const html = renderToStaticMarkup(createElement(WorkflowMaterialListEditor, {
      organizationId: "00000000-0000-4000-8000-000000000009", products: [], plans: [], categories: [], list,
      planLinks: [],
    }));
    const listSummary = html.indexOf('aria-label="Anyaglista árösszesítés"');
    expect(listSummary).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Munkanapló kapcsolat"')).toBeGreaterThan(listSummary);
    expect(html.indexOf("Árajánlat létrehozása")).toBeGreaterThan(listSummary);
    expect(html).not.toContain("Újabb piszkozat ugyanebből");
    expect(html).not.toContain("Ajánlat-piszkozat ebből a listaváltozatból");
  });
});
