import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./project-actions", () => ({ archiveProjectAction: vi.fn(), duplicateProjectAction: vi.fn(), restoreProjectAction: vi.fn() }));

import { ProjectActionsMenu, ProjectSecondaryActions } from "./project-lifecycle";
import type { ProjectRecord } from "./project-data";

const project: ProjectRecord = {
  id: "project-1", organizationId: "shop-2", clientId: null, clientName: null, name: "DEMO tető",
  description: null, location: null, projectType: "roof_renovation", status: "draft", previousStatus: null,
  version: 3, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z",
};

describe("project lifecycle controls", () => {
  it("links the survey to the current authorized organization and leaves deletion unavailable", () => {
    const html = renderToStaticMarkup(<ProjectActionsMenu organizationId="shop-2" project={project} />);
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain('role="menu"');
    expect(html).toContain('/felmeresek/uj?organization=shop-2&amp;project=project-1');
    expect(html).toContain('role="menuitem"');
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("végleges törlés nincs engedélyezve");
    expect(html).toContain("Archiválás");
  });

  it("keeps duplication and archived-project restoration in secondary project actions", () => {
    const html = renderToStaticMarkup(<ProjectSecondaryActions organizationId="shop-2" project={{ ...project, status: "archived", previousStatus: "in_progress" }} />);
    expect(html).toContain("További projektműveletek");
    expect(html).toContain("Másolat készítése");
    expect(html).toContain("Visszaállítás");
  });
});
