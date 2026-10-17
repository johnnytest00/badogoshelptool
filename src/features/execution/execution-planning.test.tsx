import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./execution-actions", () => ({
  createExecutionJournalEntryAction: vi.fn(),
  createExecutionPhotoAction: vi.fn(),
  createExecutionPlanAction: vi.fn(),
  saveExecutionTaskAction: vi.fn(),
  setExecutionPhotoCategoryAction: vi.fn(),
}));

import { ExecutionPlanning } from "./execution-planning";
import type { ExecutionPlanRecord, ExecutionTimelineItem } from "./execution-data";

const emptyPlan: ExecutionPlanRecord = {
  id: "plan-1",
  projectId: null,
  title: "DEMO munkanapló",
  description: null,
  version: 1,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: "2026-10-01T00:00:00Z",
  sourceQuotationId: null,
  sourceRevisionId: null,
  sourceRevisionNumber: null,
  sourceQuotationName: null,
  sourceQuotationStatus: null,
  sourceSubtotal: null,
  tasks: [],
  photos: [],
};

function renderWorkspace(plan = emptyPlan, timeline: ExecutionTimelineItem[] = []) {
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
  />);
}

describe("execution planning workspace", () => {
  it("opens the create form on the standalone new-work-log route even when another plan exists", () => {
    const html = renderToStaticMarkup(<ExecutionPlanning
      organizationId="org-1" projectId={null} projectName="" clientName={null} location={null}
      plans={[emptyPlan]} acceptedQuotations={[]} timelineByPlan={new Map([[emptyPlan.id, []]])}
      initialCreate showHeading={false} showDescription={false} showPlanTabs={false}
    />);
    expect(html).toContain("execution-create-form");
    expect(html).toContain("Elfogadott ajánlat forrásként");
  });

  it("prioritizes daily entries and shows one concise empty state with task actions", () => {
    const html = renderWorkspace();

    expect(html).toContain("Napi bejegyzések");
    expect(html).toContain("+ Új bejegyzés");
    expect(html).toContain("Rögzítsd röviden, mit végeztél el.");
    expect(html).not.toContain("Mit végeztél?");
    expect(html).toContain("Feladatok");
    expect(html).not.toContain("Még nincs feladat.");
    expect(html).not.toContain('class="execution-task-count"');
    expect(html).toContain('aria-label="Új feladat neve"');
    expect(html).toContain("Dokumentáció");
    expect(html).not.toContain("Munkanapló áttekintése");
    expect(html).not.toContain('role="tab"');
    expect(html).not.toContain("Összes feladat");
  });

  it("shows only nonzero task statistics and retains existing task editing", () => {
    const plan: ExecutionPlanRecord = {
      ...emptyPlan,
      tasks: [{
        id: "task-1",
        title: "DEMO javítás",
        description: null,
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
    const stats = html.match(/<div class="execution-overview-stats"[^>]*>([\s\S]*?)<\/div><\/div>/)?.[1] ?? "";

    expect(stats).toContain("Folyamatban");
    expect(stats).not.toContain("Teendő");
    expect(stats).not.toContain("Kész");
    expect(html).toContain("Korábbi bejegyzések és feladatesemények");
    expect(html).toContain('aria-label="Státusz"');
    expect(html).toContain("DEMO javítás");
  });
});
