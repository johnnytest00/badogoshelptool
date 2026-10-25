import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { MaterialPreparationList } from "@/features/material-takeoffs/material-preparation-data";
import type { ExecutionWorkspaceSection } from "./execution-workspace-read";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/feedback/app-interaction-provider", () => ({ useAppInteraction: () => ({ requestConfirmation: vi.fn(), notify: vi.fn() }) }));
vi.mock("./execution-document-link-actions", () => ({ linkExecutionPlanDocumentAction: vi.fn(), unlinkExecutionPlanDocumentAction: vi.fn() }));

import { ExecutionPlanDocumentLinks } from "./execution-plan-document-links";
import { ExecutionPlanMaterialLists } from "./execution-plan-material-lists";

const loaded = <T,>(data: T): ExecutionWorkspaceSection<T> => ({ status: "loaded", data });
const list = (currentRevision: MaterialPreparationList["currentRevision"]): MaterialPreparationList => ({
  id: "list", projectId: null, executionPlanId: "plan", name: "DEMO lista", version: 1, updatedAt: "2026-10-23",
  currentRevisionId: "revision", currentRevision, history: [],
});

describe("execution optional material/document sections", () => {
  it("does not render an unavailable material-list read as an empty list", () => {
    const html = renderToStaticMarkup(<ExecutionPlanMaterialLists organizationId="org" planId="plan" result={{ status: "unavailable" }} />);

    expect(html).toContain("Az anyaglisták átmenetileg nem tölthetők be.");
    expect(html).not.toContain("Ehhez a munkanaplóhoz nem található látható anyaglista.");
  });

  it("does not show a missing exact list revision as zero items or offer it as a quote source", () => {
    const html = renderToStaticMarkup(<ExecutionPlanMaterialLists organizationId="org" planId="plan" result={loaded([list(null)])} />);

    expect(html).toContain("a pontos revízió nem érhető el");
    expect(html).not.toContain("0 tétel");
    expect(html).not.toContain("Árajánlat ebből");
  });

  it("keeps linked-document failure distinct from an empty relationship and disables linking", () => {
    const html = renderToStaticMarkup(<ExecutionPlanDocumentLinks organizationId="org" planId="plan"
      documents={{ status: "unavailable" }} materialListCandidates={loaded([])}
      quotationCandidates={loaded([{ kind: "quotation", documentId: "q", name: "Ajánlat", detail: "Ajánlat · piszkozat" }])} />);

    expect(html).toContain("A kapcsolt dokumentumok átmenetileg nem tölthetők be.");
    expect(html).not.toContain("nem található látható utólagos anyaglista- vagy ajánlatkapcsolat");
    expect(html).toContain("disabled=\"\"");
  });

  it("keeps loaded linked documents visible when quotation candidates fail", () => {
    const html = renderToStaticMarkup(<ExecutionPlanDocumentLinks organizationId="org" planId="plan"
      documents={{ status: "loaded", materialLists: loaded([{ kind: "material_list", documentId: "list", name: "DEMO lista", detail: "Anyaglista · V1", linkId: "link", origin: "link" }]), quotations: { status: "loaded", data: [] } }}
      materialListCandidates={loaded([])} quotationCandidates={{ status: "access_denied" }} />);

    expect(html).toContain("DEMO lista");
    expect(html).toContain("Ajánlatjelöltek: nincs hozzáférés");
    expect(html).not.toContain("nem található látható utólagos anyaglista- vagy ajánlatkapcsolat");
  });

  it("uses the empty linked-document state only after all relevant reads succeeded", () => {
    const html = renderToStaticMarkup(<ExecutionPlanDocumentLinks organizationId="org" planId="plan"
      documents={{ status: "loaded", materialLists: loaded([]), quotations: loaded([]) }} materialListCandidates={loaded([])} quotationCandidates={loaded([])} />);

    expect(html).toContain("nem található látható utólagos anyaglista- vagy ajánlatkapcsolat");
    expect(html).not.toContain("nem tölthetők be");
  });

  it("preserves linked quotations when linked material-list lookup fails", () => {
    const html = renderToStaticMarkup(<ExecutionPlanDocumentLinks organizationId="org" planId="plan"
      documents={{ status: "loaded", materialLists: { status: "unavailable" }, quotations: loaded([{ kind: "quotation", documentId: "q", name: "DEMO ajánlat", detail: "Ajánlat · elfogadott", linkId: "quote-link", origin: "link" }]) }}
      materialListCandidates={loaded([])} quotationCandidates={loaded([])} />);

    expect(html).toContain("DEMO ajánlat");
    expect(html).toContain("A kapcsolt anyaglisták: nem tölthetők be");
    expect(html).not.toContain("nem található látható utólagos anyaglista- vagy ajánlatkapcsolat");
  });
});
