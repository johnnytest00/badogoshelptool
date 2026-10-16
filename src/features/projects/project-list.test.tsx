import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createProjectFilterDraft, ProjectList, resetProjectFilterDraft } from "./project-list";
import type { ProjectRecord } from "./project-data";

const applied = { search: "Kossuth", status: "in_progress" as const, projectType: "roof_renovation" as const, includeArchived: true, sort: "oldest" as const };
const project: ProjectRecord = {
  id: "project-demo", organizationId: "org-demo", clientId: null, clientName: null,
  name: "DEMO · Kossuth utcai tetőfelújítás", description: null, location: "DEMO Budapest",
  projectType: "roof_renovation", status: "in_progress", previousStatus: null, version: 2,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-02-01T00:00:00.000Z",
};

describe("projektlista és mobil szűrőállapot", () => {
  it("kezdő piszkozatként másolja az alkalmazott szűrőket, a visszaállítás pedig csak alapértéket ad", () => {
    const draft = createProjectFilterDraft(applied);
    expect(draft).toEqual(applied);
    expect(draft).not.toBe(applied);
    expect(resetProjectFilterDraft()).toEqual({ status: undefined, projectType: undefined, includeArchived: false, sort: "newest" });
    expect(applied).toEqual({ search: "Kossuth", status: "in_progress", projectType: "roof_renovation", includeArchived: true, sort: "oldest" });
  });

  it("a külön mobil kereső az alkalmazott szűrőkkel és szervezeti kontextussal együtt küldi a lekérdezést", () => {
    const html = renderToStaticMarkup(createElement(ProjectList, { organizationId: "org-demo", projects: [project], filters: applied }));
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("<h1>Projektek</h1>");
    expect(html).not.toContain("Műhelymunka");
    expect(html).not.toContain("Az aktív munkáid és ügyfeleid egy helyen.");
    expect(html).toContain("Új projekt");
    expect(html).toContain("Ügyfelek");
    expect(html).toContain('class="project-filter-form project-filter-desktop"');
    expect(html).toContain('class="project-filter-mobile"');
    expect(html).toContain('aria-label="Szűrők"');
    expect(html).toContain('name="organization" value="org-demo"');
    expect(html).toContain('name="search" value="Kossuth"');
    expect(html).toContain('name="status" value="in_progress"');
    expect(html).toContain('name="projectType" value="roof_renovation"');
    expect(html).toContain('name="archived" value="1"');
    expect(html).toContain('name="sort" value="oldest"');
    expect(html).toContain("Szűrők alkalmazása");
    expect(html).toContain("Visszaállítás");
    expect(html).toContain('aria-label="Szűrőpanel bezárása"');
    expect(html).toContain('href="/projektek/project-demo?organization=org-demo"');
  });
});
