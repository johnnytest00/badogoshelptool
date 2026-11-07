// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./execution-actions", () => ({
  createExecutionJournalEntryAction: vi.fn(),
  createExecutionPhotoAction: vi.fn(),
  createExecutionPlanAction: vi.fn(),
  saveExecutionTaskAction: vi.fn(),
  setExecutionPhotoCategoryAction: vi.fn(),
  updateExecutionProjectAction: vi.fn(),
}));

import { ExecutionPlanning } from "./execution-planning";
import { saveExecutionTaskAction } from "./execution-actions";
import type { ExecutionPlanRecord, ExecutionTimelineItem } from "./execution-data";

const emptyPlan: ExecutionPlanRecord = {
  id: "plan-1",
  projectId: null,
  title: "DEMO munkanapló",
  description: null,
  version: 1,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  status: null,
  clientName: null,
  location: null,
  plannedStartDate: null,
  plannedEndDate: null,
  sourceQuotationId: null,
  sourceRevisionId: null,
  sourceRevisionNumber: null,
  sourceQuotationName: null,
  sourceQuotationStatus: null,
  sourceSubtotal: null,
  tasks: [],
  photos: [],
};

function renderWorkspace(plan = emptyPlan, timeline: ExecutionTimelineItem[] = [], workspaceTitle?: string, projectManagement = false) {
  return renderToStaticMarkup(<ExecutionPlanning
    organizationId="org-1"
    projectId={null}
    projectName=""
    clientName={null}
    location={null}
    plans={[plan]}
    acceptedQuotations={[]}
    timelineByPlan={new Map([[plan.id, timeline]])}
    showHeading={false}
    showDescription={false}
    showPlanTabs={false}
    projectManagement={projectManagement}
    workspaceTitle={workspaceTitle}
  />);
}

describe("execution planning workspace", () => {
  it("keeps task events outside the journal as collapsed modification history", () => {
    const event: ExecutionTimelineItem = { id: "event-1", type: "task_event", date: "2026-11-07", recordedAt: "2026-11-07T08:00:00Z", authorAvailable: true, taskTitle: "Állapotpróba", fromStatus: "todo", toStatus: "done" };
    const html = renderWorkspace(emptyPlan, [event]);
    const document = new DOMParser().parseFromString(html, "text/html");
    expect(document.querySelector("#execution-journal")?.textContent).toContain("Még nincs bejegyzés");
    expect(document.querySelector("#execution-journal")?.textContent).not.toContain("Állapotpróba");
    expect(document.querySelector(".execution-task-events")?.textContent).toContain("Állapotpróba: Teendő → Kész");
    expect(document.querySelector(".execution-task-events > summary")?.textContent).toBe("Módosítási előzmények");
    expect(document.querySelector(".execution-task-events > summary svg[aria-hidden='true']")).not.toBeNull();
    expect(document.querySelector(".execution-task-events")?.hasAttribute("open")).toBe(false);
    expect(document.querySelector(".execution-entry-count")).toBeNull();
  });

  it("renders a photo-only journal entry without an empty text paragraph", () => {
    const photo = { id: "photo-1", taskId: null, taskTitle: null, journalEntryId: "entry-1", journalDate: "2026-11-07", journalContent: "", objectKey: "private/photo.jpg", displayFilename: "photo.jpg", mimeType: "image/jpeg", fileSize: 12, caption: null, category: "uncategorized" as const, uploadedAt: "2026-11-07T08:00:00Z", uploaderName: null, signedUrl: "/photo.jpg" };
    const plan = { ...emptyPlan, photos: [photo] };
    const entry: ExecutionTimelineItem = { id: "entry-1", type: "journal", date: "2026-11-07", recordedAt: "2026-11-07T08:00:00Z", authorAvailable: true, taskTitle: null, content: "" };
    const html = renderWorkspace(plan, [entry]);
    const document = new DOMParser().parseFromString(html, "text/html");
    const row = document.querySelector("#journal-entry-1");
    expect(row?.querySelector("img")?.getAttribute("src")).toBe("/photo.jpg");
    expect(row?.querySelector("p")).toBeNull();
  });

  it("places the project title and real overview in one accessible top line", () => {
    const html = renderWorkspace(emptyPlan, [], "Demo projekt");
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(html).toContain('class="execution-workspace-topline"');
    expect(html).toContain('<h1 id="execution-workspace-title">Demo projekt</h1>');
    expect(document.querySelector(".execution-overview-summary > .execution-project-heading h1")?.textContent).toBe("Demo projekt");
    expect(document.querySelector(".execution-project-heading .execution-project-status")).toBeNull();
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain("Feladatok");
    expect(html).toContain("0 / 0 kész");
    expect(html).not.toContain('<progress');
    expect(html).not.toContain("execution-project-cover");
    expect(html).not.toContain("execution-project-location");
    expect(renderWorkspace(emptyPlan, [], "Hosszú projektcím a fejléc rugalmas tördelésének ellenőrzéséhez")).toContain('class="execution-project-heading-copy"');
  });

  it("places project status at the right of task progress without a separate status row", () => {
    const plan = { ...emptyPlan, status: null };
    const html = renderWorkspace(plan, [], "Demo projekt", true);
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.querySelector(".execution-project-heading .execution-project-status")).toBeNull();
    expect(document.querySelector(".execution-overview-tasks .execution-project-status")?.textContent).toBe("Állapot nincs megadva");
    expect(document.querySelectorAll(".execution-overview-summary > .execution-overview-item")).toHaveLength(2);
  });

  it("opens the create form on the standalone new-work-log route even when another plan exists", () => {
    const html = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId={null} projectName="" clientName={null} location={null}
      plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])}
      initialCreate showHeading={false} showDescription={false} showPlanTabs={false}
    />);
    expect(html).toContain("execution-create-form");
    expect(html).toContain("Elfogadott ajánlat forrásként");
    expect(html).toContain("Mentett kalkulációk (opcionális)");
    expect(html).toContain("Kalkulátorok megnyitása");
  });

  it("renders saved calculation options with calculator type, revision and a search field", () => {
    const html = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId={null} projectName="" clientName={null} location={null}
      plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])}
      savedCalculations={[{ revisionId: "revision-1", calculationId: "calculation-1", calculatorId: "roof.material-takeoff", name: "DEMO tető", revisionNumber: 2, savedAt: "2026-10-20T00:00:00Z" }]}
      initialCreate showHeading={false} showDescription={false} showPlanTabs={false}
    />);

    expect(html).toContain("Mentett kalkulációk keresése");
    expect(html).toContain("DEMO tető");
    expect(html).toContain("Tetőanyag-kimutatás");
    expect(html).toContain("V2");
    expect(html).toContain('name="calculationRevisionIds"');
  });

  it("places one orange create action in each task and journal surface", () => {
    const html = renderWorkspace(emptyPlan, [], "Demo munkatér");
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(html).toContain("Naplóbejegyzések");
    expect(html).toContain("Új feladat");
    expect(html).toContain("Új bejegyzés");
    expect(document.querySelector(".execution-quick-actions")).toBeNull();
    expect(document.querySelectorAll("#execution-tasks .glass-section-header-actions .primary-button")).toHaveLength(1);
    expect(document.querySelectorAll("#execution-journal .glass-section-header-actions .primary-button")).toHaveLength(1);
    expect(html).not.toContain("Fénykép hozzáadása");
    expect(document.querySelector("#execution-tasks .glass-section-header-actions .primary-button")?.textContent).toContain("Új feladat");
    expect(document.querySelector("#execution-journal .glass-section-header-actions .primary-button")?.textContent).toContain("Új bejegyzés");
    expect(html).not.toContain("További műveletek");
    expect(html).not.toContain("Ugrás a szekcióhoz");
    expect(html).not.toContain('<nav aria-label="Szekciók">');
    expect(html).toContain('class="glass-disclosure execution-workspace-disclosure execution-documentation"');
    expect(html).toContain("Írd fel röviden, mi történt a munkán.");
    expect(html).not.toContain("Mit végeztél?");
    expect(html).toContain("Feladatok");
    expect(html).toContain("0 / 0 kész");
    expect(html).not.toContain('aria-label="Új feladat neve"');
    expect(html).toContain("Dokumentáció");
    expect(html).not.toContain("Munkanapló áttekintése");
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("Teendő</span>");
  });

  it("shows optional project details only in the standalone project workspace", () => {
    const projectPlan: ExecutionPlanRecord = {
      ...emptyPlan,
      status: "active",
      clientName: "Kovács Kft.",
      location: "Győr",
      plannedStartDate: "2026-11-10",
      plannedEndDate: "2026-11-20",
    };
    const html = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId={null} projectName="" clientName={null} location={null}
      plans={[projectPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[projectPlan.id, []]])}
      projectManagement showHeading={false} showDescription={false} showPlanTabs={false}
    />);

    expect(html).toContain("Aktív");
    expect(html).toContain("Projekt adatai");
    expect(html).toContain('name="plannedStartDate"');
    expect(html).toContain('name="plannedEndDate"');
    expect(renderWorkspace(projectPlan)).not.toContain("Projekt adatai");
  });

  it("renders a clearly structured location compactly without inventing address data", () => {
    const plan = { ...emptyPlan, location: "1234 Budapest 12." };
    const html = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId={null} projectName="" clientName={null} location={null}
      plans={[plan]} acceptedQuotations={[]} timelineByPlan={new Map([[plan.id, []]])}
      projectManagement showHeading={false} showDescription={false} showPlanTabs={false} workspaceTitle="lajos"
    />);

    expect(html).toContain('aria-label="Helyszín: 1234 Budapest 12."');
    expect(html).toContain(">1234 Budapest</span>");
    expect(html).toContain(">12.</span>");

    const fallbackHtml = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId="project-1" projectName="" clientName={null} location="9022 Győr 4."
      plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])}
      showHeading={false} showDescription={false} showPlanTabs={false} workspaceTitle="lajos"
    />);
    expect(fallbackHtml).toContain('aria-label="Helyszín: 9022 Győr 4."');
  });

  it("uses the shared disclosure surface for documentation and project data", () => {
    const html = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId={null} projectName="" clientName={null} location={null}
      plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])}
      projectManagement showHeading={false} showDescription={false} showPlanTabs={false}
    />);

    expect(html).toContain('class="glass-disclosure execution-workspace-disclosure execution-documentation"');
    expect(html).toContain('class="glass-disclosure execution-workspace-disclosure execution-project-disclosure"');
    expect(html).toContain("Még nincs bejegyzés");
  });

  it("opens one focused task composer from the quick action", () => {
    render(<ExecutionPlanning organizationId="org-1" projectId={null} projectName="" clientName={null} location={null} plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])} showHeading={false} showDescription={false} showPlanTabs={false} />);

    expect(screen.queryByRole("textbox", { name: "Új feladat neve" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Új feladat" }));

    const taskTitle = screen.getByRole("textbox", { name: "Új feladat neve" });
    expect(document.activeElement).toBe(taskTitle);
    expect(screen.getAllByRole("textbox", { name: "Új feladat neve" })).toHaveLength(1);
  });

  it("adds photos to journal entries and keeps the documentation gallery upload-free", () => {
    render(<ExecutionPlanning organizationId="org-1" projectId={null} projectName="" clientName={null} location={null} plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])} showHeading={false} showDescription={false} showPlanTabs={false} />);

    fireEvent.click(document.querySelector("#execution-journal .glass-section-header-actions .primary-button")!);

    const entryForm = document.querySelector("#execution-journal-entry-form-plan-1");
    expect(entryForm).not.toBeNull();
    expect(entryForm?.querySelector('textarea[name="content"]')?.hasAttribute("required")).toBe(false);
    expect(entryForm?.querySelector('input[name="photos"]')?.hasAttribute("multiple")).toBe(true);
    expect(entryForm?.querySelectorAll('input[name="photos"]')).toHaveLength(3);
    expect(entryForm?.textContent).toContain("Fájl kiválasztása");
    expect(entryForm?.textContent).toContain("Fotó kiválasztása");
    expect(entryForm?.textContent).toContain("Fotó készítése");
    expect(entryForm?.querySelector(".execution-journal-advanced")).not.toBeNull();
    expect(entryForm?.querySelector(".execution-journal-long-field")).not.toBeNull();
    expect(document.querySelector("#execution-documentation-plan-1 input[type=file]")).toBeNull();
  });

  it("shows only nonzero task statistics and retains existing task editing", () => {
    const plan: ExecutionPlanRecord = {
      ...emptyPlan,
      tasks: [{
        id: "task-1",
        title: "DEMO javítás",
        description: "Szerkezet és rögzítések ellenőrzése",
        status: "in_progress",
        priority: "normal",
        dueDate: null,
        sortOrder: 0,
        version: 1,
      }],
    };
    const timeline: ExecutionTimelineItem[] = [{
      id: "entry-1",
      type: "journal",
      date: "2026-10-15",
      recordedAt: "2026-10-15T12:00:00Z",
      authorAvailable: true,
      taskTitle: null,
      category: "general",
      content: "DEMO bejegyzés",
    }];
    const html = renderWorkspace(plan, timeline);
    expect(html).toContain("0 / 1 kész");
    expect(html).toContain("Legutóbbi bejegyzések és események");
    expect(html).toContain('class="execution-task-title">DEMO javítás</span>');
    expect(html).toContain('aria-label="Feladat nevének szerkesztése: DEMO javítás"');
    expect(html).toContain('aria-label="Feladat szerkesztése: DEMO javítás"');
    expect(html).toContain('class="execution-task-state">Folyamatban</small>');
    expect(html).not.toContain("execution-task-status");
    expect(html).toContain('<option value="in_progress" selected="">Folyamatban</option>');
    expect(html).toContain('<option value="done">Kész</option>');
    expect(html).toContain("DEMO javítás");
    expect(html).toContain('<small class="execution-task-description">Szerkezet és rögzítések ellenőrzése</small>');
    expect(html).toContain('aria-label="Készre jelölés: DEMO javítás"');
    expect(html).toContain('aria-pressed="false"');
  });

  it("keeps a longer mixed task list readable inside the task workspace", () => {
    const tasks = ["Eresz ellenőrzése", "Anyagok előkészítése", "Állványzat felállítása", "Hosszú feladatnév a homlokzati csatorna teljes cseréjének előkészítéséhez", "Munkaterület átadása"].map((title, index) => ({
      id: `task-${index + 1}`,
      title,
      description: null,
      status: (["todo", "in_progress", "todo", "done", "todo"] as const)[index],
      priority: "normal" as const,
      dueDate: null,
      sortOrder: index,
      version: 1,
    }));
    const html = renderWorkspace({ ...emptyPlan, tasks });
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.querySelector("#task-task-1 .execution-task-state")?.textContent).toBe("Folyamatban");
    expect(html).toContain('class="execution-primary-workspaces"');
    expect(html).toContain('class="execution-tasks execution-workspace-surface"');
    expect(html).toContain("5 feladat");
    expect(html).not.toContain("4 nyitott");
    expect(html).toContain("Folyamatban");
    expect(html).toContain('aria-label="Folyamatban: Hosszú feladatnév a homlokzati csatorna teljes cseréjének előkészítéséhez"');
    expect(html).toContain("Hosszú feladatnév a homlokzati csatorna teljes cseréjének előkészítéséhez");
    expect(html).toContain("További projektinformációk");
  });

  it("creates new tasks as in progress", () => {
    render(<ExecutionPlanning organizationId="org-1" projectId={null} projectName="" clientName={null} location={null} plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])} showHeading={false} showDescription={false} showPlanTabs={false} />);

    const addButton = document.querySelector("#execution-tasks .execution-section-create");
    expect(addButton).not.toBeNull();
    fireEvent.click(addButton!);
    expect(document.querySelector('#execution-task-entry-form-plan-1 input[name="status"]')?.getAttribute("value")).toBe("in_progress");
  });

  it("completes and restores tasks through the existing versioned save action", async () => {
    vi.mocked(saveExecutionTaskAction).mockResolvedValue({ ok: true, taskId: "task-1" });
    const task = { id: "task-1", title: "DEMO javítás", description: null, status: "in_progress" as const, priority: "normal" as const, dueDate: null, sortOrder: 0, version: 4 };
    const plan = { ...emptyPlan, tasks: [task] };
    const workspace = (currentPlan: ExecutionPlanRecord) => <ExecutionPlanning organizationId="org-1" projectId={null} projectName="" clientName={null} location={null} plans={[currentPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[currentPlan.id, []]])} showHeading={false} showDescription={false} showPlanTabs={false} />;
    const view = render(workspace(plan));

    fireEvent.click(screen.getByRole("button", { name: "Készre jelölés: DEMO javítás" }));
    await waitFor(() => expect(vi.mocked(saveExecutionTaskAction)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveExecutionTaskAction).mock.calls[0][0].get("status")).toBe("done");
    expect(vi.mocked(saveExecutionTaskAction).mock.calls[0][0].get("version")).toBe("4");

    view.rerender(workspace({ ...plan, tasks: [{ ...task, status: "done", version: 5 }] }));
    expect(screen.getByRole("button", { name: "Folyamatban: DEMO javítás" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Folyamatban: DEMO javítás" }));
    await waitFor(() => expect(vi.mocked(saveExecutionTaskAction)).toHaveBeenCalledTimes(2));
    expect(vi.mocked(saveExecutionTaskAction).mock.calls[1][0].get("status")).toBe("in_progress");
    expect(vi.mocked(saveExecutionTaskAction).mock.calls[1][0].get("version")).toBe("5");
  });

  it("completes a todo task through the task toggle", async () => {
    vi.mocked(saveExecutionTaskAction).mockResolvedValue({ ok: true, taskId: "task-1" });
    const task = { id: "task-1", title: "Anyagok átvétele", description: null, status: "todo" as const, priority: "normal" as const, dueDate: null, sortOrder: 0, version: 2 };
    render(<ExecutionPlanning organizationId="org-1" projectId={null} projectName="" clientName={null} location={null} plans={[{ ...emptyPlan, tasks: [task] }]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])} showHeading={false} showDescription={false} showPlanTabs={false} />);

    const toggle = screen.getByRole("button", { name: "Készre jelölés: Anyagok átvétele" });
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(toggle);
    await waitFor(() => expect(vi.mocked(saveExecutionTaskAction)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(saveExecutionTaskAction).mock.calls[0][0].get("status")).toBe("done");
    expect(vi.mocked(saveExecutionTaskAction).mock.calls[0][0].get("version")).toBe("2");
  });

  it("prevents repeated completion submissions while the save is pending", async () => {
    vi.mocked(saveExecutionTaskAction).mockImplementation(() => new Promise(() => {}));
    const task = { id: "task-1", title: "Ellenőrzés", description: null, status: "todo" as const, priority: "normal" as const, dueDate: null, sortOrder: 0, version: 1 };
    render(<ExecutionPlanning organizationId="org-1" projectId={null} projectName="" clientName={null} location={null} plans={[{ ...emptyPlan, tasks: [task] }]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])} showHeading={false} showDescription={false} showPlanTabs={false} />);

    const toggle = screen.getByRole("button", { name: "Készre jelölés: Ellenőrzés" });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle.hasAttribute("disabled")).toBe(true));
    fireEvent.click(toggle);
    expect(vi.mocked(saveExecutionTaskAction)).toHaveBeenCalledTimes(1);
  });
});
