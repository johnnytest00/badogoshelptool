import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./project-actions", () => ({ archiveProjectAction: vi.fn(), duplicateProjectAction: vi.fn(), restoreProjectAction: vi.fn() }));

import { ProjectActionsMenu } from "./project-lifecycle";
import { closeMenuOnEscape } from "./project-menu-keyboard";
import type { ProjectRecord } from "./project-data";

const project: ProjectRecord = {
  id: "project-1", organizationId: "shop-2", clientId: null, clientName: null, name: "DEMO tető",
  description: null, location: null, projectType: "roof_renovation", status: "draft", previousStatus: null,
  version: 3, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z",
};

describe("project lifecycle controls", () => {
  it("closes the open project menu on Escape and leaves closed menus alone", () => {
    const close = vi.fn();
    const event = { key: "Escape", preventDefault: vi.fn(), stopPropagation: vi.fn() };
    expect(closeMenuOnEscape(event, true, close)).toBe(true);
    expect(close).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.stopPropagation).toHaveBeenCalledOnce();
    expect(closeMenuOnEscape(event, false, close)).toBe(false);
  });

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

  it("keeps existing duplication and restoration actions in the single project menu", () => {
    const html = renderToStaticMarkup(<ProjectActionsMenu organizationId="shop-2" project={{ ...project, status: "archived", previousStatus: "in_progress" }} />);
    expect(html).toContain('aria-label="Projektműveletek"');
    expect(html).toContain("Másolat készítése");
    expect(html).toContain("Visszaállítás");
    expect(html).not.toContain("További projektműveletek");
    expect(html).toContain('aria-disabled="true" aria-describedby=');
  });
});
