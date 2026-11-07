import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StandaloneDocumentSources } from "./standalone-quotation-actions";
import type { QuotationMaterialSource } from "./standalone-quotation-editor";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/components/navigation/guarded-link", () => ({ GuardedLink: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => createElement("a", { href, ...props }, children) }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({ useAppInteraction: () => ({ requestConfirmation: vi.fn() }), useUnsavedChangeGuard: vi.fn() }));
vi.mock("@/lib/secure-uuid", () => ({ generateSecureUuid: () => "operation", createIdempotencyKey: () => ({ current: () => "operation", renew: vi.fn() }) }));
vi.mock("@/features/materials/material-actions", () => ({ searchMaterialProductsAction: vi.fn() }));
vi.mock("@/features/execution/execution-document-link-actions", () => ({ linkExecutionPlanDocumentAction: vi.fn(), unlinkExecutionPlanDocumentAction: vi.fn(), createExecutionPlanAndLinkDocumentAction: vi.fn() }));
vi.mock("./standalone-quotation-actions", () => ({ resolveStandaloneQuotationCatalogItemAction: vi.fn(), saveStandaloneQuotationDraftAction: vi.fn(), updateStandaloneIssuerProfileAction: vi.fn(), validateStandaloneQuotationDocumentAction: vi.fn() }));

import { StandaloneQuotationEditor } from "./standalone-quotation-editor";

const organizationId = "00000000-0000-4000-8000-000000000010";
const documentSources: StandaloneDocumentSources = {
  issuer: { organizationName: "TetőPro DEMO", businessName: null, businessAddress: null, contactEmail: null, contactPhone: null, taxIdentifier: null },
  canEditIssuer: false,
};
const materialSource: QuotationMaterialSource = {
  materialListId: "list", materialRevisionId: "revision", listName: "DEMO anyaglista", revisionNumber: 2,
  currentRevisionId: "revision", currentVersion: 2, executionPlanId: null, sourceLineMap: [],
};
const baseProps = {
  userId: "user", organizationId, quotationId: "quote", name: "DEMO ajánlat", version: 2,
  currentRevisionId: "revision", currentRevision: { id: "revision", revision_number: 2, input_snapshot: { document: {} }, line_items_snapshot: [], subtotal: "0.00", currency: "HUF", price_class: "net" as const },
  revisions: [{ id: "revision-1", revisionNumber: 1, createdAt: "", subtotal: "0.00" }, { id: "revision", revisionNumber: 2, createdAt: "", subtotal: "0.00" }], selectedRevisionId: "revision",
  products: [], categories: [], documentSources, initialLines: [], materialSource, planLinks: [], plans: [],
} as unknown as Parameters<typeof StandaloneQuotationEditor>[0];

function renderEditor(overrides: Partial<Parameters<typeof StandaloneQuotationEditor>[0]> = {}) {
  return renderToStaticMarkup(createElement(StandaloneQuotationEditor, { ...baseProps, ...overrides }));
}

describe("standalone quotation editor layout", () => {
  it("puts PDF actions in the header and previous revisions beside the saved status", () => {
    const html = renderEditor();
    const name = html.indexOf('id="standalone-name"');
    expect(html).toContain("<h2>Árajánlat</h2>");
    expect(html).not.toContain("Önálló ajánlat · HUF");
    expect(html).not.toContain("Piszkozat</span>");
    expect(html).not.toContain("A véglegesítés és az ÁFA-kezelés");
    expect(name).toBeGreaterThan(-1);
    expect(html.indexOf("PDF-előnézet")).toBeLessThan(name);
    expect(html).toContain('aria-label="Korábbi ajánlati verziók"');
    expect(html).toContain(">v1</a>");
    expect(html).not.toContain("v2 · aktuális");
    expect(html).toContain("Munkadíj felmérésből");
    expect(html).toContain('aria-labelledby="labor-rate-title"');
    expect(html).toContain('aria-label="Ajánlati tételek hozzáadása"');
    expect(html).toContain("quotation-add-button is-primary");
    expect(html).toContain("lucide-plus");
    expect(html).toContain('aria-label="PDF nyomtatása"');
    expect(html).toContain("Teljes végösszeg");
    expect(html).not.toContain("quotation-total-basis");
    expect(html).not.toContain("Jelenlegi piszkozat becslése");
    expect(html).not.toContain("A szerver mentéskor újraszámítja");
    expect(html).not.toContain("v2 · 0,00 Ft");
  });

  it("defaults a new quotation's validity date to thirty days from today", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 12));
    try {
      const html = renderEditor({ quotationId: null, currentRevisionId: null, currentRevision: undefined, name: undefined, version: 1, revisions: [], selectedRevisionId: undefined });
      expect(html).toContain('id="document-valid-until" type="date" value="2026-12-05"');
    } finally { vi.useRealTimers(); }
  });

  it("fills an empty validity date on an editable saved draft but leaves history unchanged", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 5, 12));
    try {
      const editable = renderEditor();
      expect(editable).toContain('id="document-valid-until" type="date" value="2026-12-05"');
      const historical = renderEditor({ selectedRevisionId: "revision-1" });
      expect(historical).toContain('id="document-valid-until" type="date" value=""');
    } finally { vi.useRealTimers(); }
  });

  it("formats trailing quantity zeros for display without losing stored precision", () => {
    const html = renderEditor({ currentRevision: { id: "revision", revision_number: 2, input_snapshot: { document: {} }, line_items_snapshot: undefined, subtotal: "0.00", currency: "HUF", price_class: "net" }, initialLines: [{
      type: "MATERIAL", description: "DEMO tetőfedő anyag", quantity: "120.000000", unit: "m²", unitPrice: "", priceClass: "net",
      variantId: "", categoryId: "", priceId: "", takeoffItemId: "", sourceMaterialItemId: "", priceProvenance: "missing", notes: "",
    }] as unknown as Parameters<typeof StandaloneQuotationEditor>[0]["initialLines"] });
    expect(html).toContain('value="120"');
    expect(html).toContain("Hiányzó egységár");
    expect(html).toContain('aria-label="DEMO tetőfedő anyag törlése"');
    expect(html).toContain("lucide-trash2");
    expect(html).not.toContain("Kézi tételnél az egység szerkeszthető.");
  });

  it("keeps only the requested optional document fields visible", () => {
    const html = renderEditor();
    expect(html).toContain(">Megjegyzés<textarea");
    expect(html).not.toContain("Belső hivatkozás");
    expect(html).not.toContain("Feltételek<textarea");
    expect(html).not.toContain("Ajánlati megjegyzés");
  });

  it("groups source disclosures and keeps the worklog action beside saving", () => {
    const html = renderEditor();
    expect(html).toContain("Felhasznált források");
    expect(html).toContain("Anyaglista-forrás · DEMO anyaglista · V2 · 0 tétel");
    expect(html).not.toContain("<strong>Munkanapló</strong>");
    expect(html.indexOf("Munkanaplóhoz csatolás")).toBeLessThan(html.indexOf(">Mentés</button>"));
    expect(html).not.toContain('class="survey-optional-badge">Opcionális</span>');
    expect(html).not.toMatch(/class="quotation-savebar[^"]*sticky/);
  });
});
