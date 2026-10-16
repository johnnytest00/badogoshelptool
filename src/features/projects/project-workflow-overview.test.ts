import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProjectWorkflowOverview, projectWorkflowRows } from "./project-workflow-overview";

const base = { projectId: "p1", organizationId: "org1", roofCount: 0, calculations: [], takeoffs: [], quotations: [], planCount: 0, journalCount: 0, photoCount: 0 };

describe("projektfolyamat összefoglaló", () => {
  it("a projekthez és szervezethez kötött modulútvonalakat készít, üres adatnál sem találgat", () => {
    const rows = projectWorkflowRows(base);
    expect(rows.find((row) => row.label === "Ereszcsatorna")?.href).toBe("/projektek/p1/ereszcsatorna?organization=org1");
    expect(rows.find((row) => row.label === "Anyagkimutatások")?.detail).toBe("Nincs anyagkimutatás");
    expect(rows.find((row) => row.label === "Dokumentáció és bejegyzések")?.detail).toContain("0 belső bejegyzés");
    expect(rows.map((row) => row.detail).join(" ")).not.toMatch(/100%|kész|teljesítve/i);
  });

  it("a mentett üzleti státuszt és legutóbbi verziót közli magyarul", () => {
    const rows = projectWorkflowRows({ ...base, calculations: [{ calculator_type: "gutters.material-estimate", status: "stale", current_revision_id: "r1" }], quotations: [{ status: "accepted", version: 3 }] });
    expect(rows.find((row) => row.label === "Ereszcsatorna")?.detail).toContain("1 mentett · 0 aktuális");
    expect(rows.find((row) => row.label === "Árajánlatok")?.detail).toBe("Legutóbbi: V3 · 1 elfogadott");
    expect(rows.find((row) => row.label === "Árajánlatok")?.detail).not.toContain("szerződés");
  });

  it("összesít státuszokat és csak a legújabb anyagkimutatás-verziót emeli ki", () => {
    const rows = projectWorkflowRows({ ...base, takeoffs: [{ status: "draft", version: 1 }, { status: "approved", version: 4 }, { status: "draft", version: 2 }] });
    expect(rows.find((row) => row.label === "Anyagkimutatások")?.detail).toBe("Legutóbbi: V4 · 2 piszkozat · 1 jóváhagyott");
  });

  it("folytonos, szemantikus navigációként rendereli az összefoglalót", () => {
    const html = renderToStaticMarkup(createElement(ProjectWorkflowOverview, { rows: projectWorkflowRows(base) }));
    expect(html).toContain("<h2 id=\"project-workflow-title\">Munka áttekintése</h2>");
    expect(html).not.toContain("Projektfolyamat");
    expect(html).toContain("A kalkulációk előzetes eredményei nem jelentenek szakmai jóváhagyást");
    expect(html).toContain("az elfogadott ajánlat nem aláírt szerződés");
    expect(html).toContain("a napló belső nyilvántartás");
    expect(html).toContain('<nav class="project-workflow-grid" aria-label="Projektmunkák">');
    expect(html).toContain('<a class="project-workflow-link" href="#tetomodellek">');
    expect(html).toContain("<strong>Tetőmodellek</strong>");
    expect(html).toContain('href="/projektek/p1/ereszcsatorna?organization=org1"');
    expect(html).toContain('href="#kivitelezes">');
    expect(html).toContain('class="project-workflow-icon"');
    expect(html).toContain('class="project-workflow-copy"');
    expect(html).toMatch(/class="[^"]*project-workflow-open/);
    expect((html.match(/class="project-workflow-link"/g) ?? []).length).toBe(8);
    expect(html).not.toContain("<article class=\"project-workflow-card\"");
  });
});
