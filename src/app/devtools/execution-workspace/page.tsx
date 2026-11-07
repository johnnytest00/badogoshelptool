import { notFound } from "next/navigation";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { ExecutionPlanning } from "@/features/execution/execution-planning";
import type { ExecutionPlanRecord, ExecutionTimelineItem } from "@/features/execution/execution-data";
import { Link2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ExecutionWorkspacePreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const plan: ExecutionPlanRecord = {
    id: "visual-preview", projectId: null, title: "Tetőfelújítás", description: null,
    status: "active", clientName: null, location: null, version: 1,
    createdAt: "2026-11-06T08:00:00Z", updatedAt: "2026-11-06T08:00:00Z",
    plannedStartDate: null, plannedEndDate: null, sourceQuotationId: null,
    sourceRevisionId: null, sourceRevisionNumber: null, sourceQuotationName: null,
    sourceQuotationStatus: null, sourceSubtotal: null, photos: [],
    tasks: [
      { id: "preview-1", title: "Tetőszerkezet ellenőrzése", description: "Szerkezet, rögzítések, fogadósík", status: "todo", dueDate: "2026-11-08", priority: "normal", sortOrder: 0, version: 1 },
      { id: "preview-2", title: "Alátétfólia és lécezés", description: "Fólia felhelyezése, ellenlécezés", status: "in_progress", dueDate: "2026-11-09", priority: "normal", sortOrder: 1, version: 1 },
      { id: "preview-3", title: "Anyagok helyszínre szállítása", description: "Lemezek, rögzítőelemek, kiegészítők", status: "done", dueDate: "2026-11-06", priority: "normal", sortOrder: 2, version: 1 },
    ],
  };
  const timeline: ExecutionTimelineItem[] = [
    { id: "preview-note-1", type: "journal", date: "2026-11-06", recordedAt: "2026-11-06T09:24:00Z", authorAvailable: true, taskTitle: null, category: "work_done", content: "Megérkeztek az anyagok, a kivitelezés előkészítése megtörtént." },
    { id: "preview-note-2", type: "journal", date: "2026-11-05", recordedAt: "2026-11-05T15:40:00Z", authorAvailable: true, taskTitle: null, category: "general", content: "Helyszíni egyeztetés a megrendelővel, a kivitelezés menetrendje véglegesítve." },
  ];
  return <main className="dashboard-shell"><div className="dashboard-container execution-workspace-container">
    <p className="missing-data">DEMO · Izolált, csak olvasható vizuális ellenőrzés. Az adatok nem kerülnek adatbázisba.</p>
    <nav className="execution-breadcrumb" aria-label="Morzsanavigáció">Projektek › Tetőfelújítás</nav>
    <section className="execution-workspace-shell" inert>
      <div className="execution-workspace-body"><ExecutionPlanning organizationId="visual-preview" projectId={null} projectName="" clientName={null} location={null} plans={[plan]} acceptedQuotations={[]} timelineByPlan={new Map([[plan.id, timeline]])} showHeading={false} showDescription={false} showPlanTabs={false} projectManagement workspaceTitle={plan.title} supportingContent={<GlassDisclosure className="execution-workspace-disclosure" summary={<><Link2 aria-hidden="true" /><span>Kapcsolatok és dokumentumok<small>Kapcsolt anyaglisták és ajánlatok</small></span></>}>Nincs kapcsolt dokumentum.</GlassDisclosure>} /></div>
    </section>
  </div></main>;
}
