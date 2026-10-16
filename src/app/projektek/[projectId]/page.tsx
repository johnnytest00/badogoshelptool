import Link from "next/link";
import { ArrowUpRight, CalendarDays, ClipboardList, FolderOpen, MapPin, PackageOpen, PencilLine, UserRound } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { projectStatusLabels, projectTypeLabels } from "@/domain/projects/contracts";
import { getProjectOrganization } from "@/features/projects/organization";
import { getClientsForOrganization, getProjectForOrganization } from "@/features/projects/project-data";
import { ProjectEditForm } from "@/features/projects/project-forms";
import { ProjectActionsMenu } from "@/features/projects/project-lifecycle";
import { getRoofModelsForProject } from "@/features/roof-models/roof-model-data";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getExecutionPlanningWorkspace } from "@/features/execution/execution-data";
import { ExecutionPlanning } from "@/features/execution/execution-planning";
import { ExecutionSection } from "@/features/execution/execution-section";
import { ProjectCalculatorLinks } from "@/features/projects/project-calculator-links";
import { getProjectWorkflowRecords, projectWorkflowRows, ProjectWorkflowOverview } from "@/features/projects/project-workflow-overview";
import { ProjectRoofDrawings } from "@/features/roof-models/project-roof-drawings";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";

export default async function ProjectDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; sourceQuotation?: string; execution?: string }> }>) {
  const { projectId } = await params;
  const pageQuery = await searchParams;
  const selected = await getProjectOrganization(pageQuery.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a projekthez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const project = await getProjectForOrganization(selected.organization.id, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Projekt</p><h1>A projekt nem található.</h1><p>Azonosító alapján nincs elérhető projekt ebben a műhelyben.</p><Link className="login-secondary-link" href={`/projektek?organization=${selected.organization.id}`}>Vissza a projektekhez</Link></section></main>;
  const clients = await getClientsForOrganization(selected.organization.id);
  const roofModels = await getRoofModelsForProject(selected.organization.id, projectId);
  const execution = await getExecutionPlanningWorkspace(selected.organization.id, projectId);
  const workflow = await getProjectWorkflowRecords(selected.organization.id, projectId);
  const workflowRows = projectWorkflowRows({ projectId, organizationId: selected.organization.id, roofCount: roofModels.length, ...workflow, planCount: execution.plans.length, journalCount: execution.plans.reduce((n: number, plan: { id: string; photos: unknown[] }) => n + (execution.timelineByPlan.get(plan.id)?.filter((item) => item.type === "journal").length ?? 0), 0), photoCount: execution.plans.reduce((n: number, plan: { id: string; photos: unknown[] }) => n + plan.photos.length, 0) });
  const organizationId = selected.organization.id;
  return <main className="dashboard-shell"><div className="dashboard-container project-workspace">
    <BackNavigation href={`/projektek?organization=${organizationId}`} label="Vissza a projektekhez" />
    <section className="project-detail-header">
      <div className="project-identity">
        <p className="section-eyebrow">Projektmunkaterület</p>
        <h1>{project.name}</h1>
        <div className="project-identity-meta">
          <span className="project-type-label">{projectTypeLabels[project.projectType]}</span>
          <span className={`status-pill status-${project.status}`}>{projectStatusLabels[project.status]}</span>
          <span className="project-version-label">v{project.version}</span>
        </div>
      </div>
      <ProjectActionsMenu organizationId={organizationId} project={project} />
    </section>
    <ProjectWorkflowOverview rows={workflowRows} />
    <div className="project-detail-grid project-detail-grid-single">
      <section className="project-facts-section">
        <h2>Alapadatok</h2>
        <div className="project-fact-grid">
          <Fact icon={<UserRound className="size-4" />} label="Ügyfél" value={project.clientName ?? "Ügyfél nélkül"} />
          <Fact icon={<MapPin className="size-4" />} label="Helyszín" value={project.location ?? "Nincs megadva"} />
          <Fact icon={<CalendarDays className="size-4" />} label="Létrehozva" value={new Date(project.createdAt).toLocaleDateString("hu-HU")} />
          <Fact icon={<CalendarDays className="size-4" />} label="Módosítva" value={new Date(project.updatedAt).toLocaleDateString("hu-HU")} />
        </div>
        {project.description && <p className="detail-description">{project.description}</p>}
        <GlassDisclosure className="project-edit-disclosure" summary={<><span><PencilLine aria-hidden="true" className="size-4" /><span><strong>Projektadatok szerkesztése</strong><small>Név, ügyfél, helyszín és leírás</small></span></span><span className="project-edit-disclosure-action">Megnyitás</span></>}>
          <div className="project-edit-content"><ProjectEditForm organizationId={organizationId} project={project} clients={clients.map((client) => ({ id: client.id, name: client.name }))} /></div>
        </GlassDisclosure>
      </section>
    </div>
    <ExecutionSection defaultOpen={pageQuery.execution === "1"}><ExecutionPlanning organizationId={organizationId} projectId={projectId} projectName={project.name} clientName={project.clientName} location={project.location} plans={execution.plans} acceptedQuotations={execution.acceptedQuotations} timelineByPlan={execution.timelineByPlan} preselectedQuotationId={pageQuery.sourceQuotation} /></ExecutionSection>
    <section id="tetomodellek" className="detail-surface roof-model-list" aria-labelledby="project-roof-models-title">
      <div className="roof-list-heading"><h2 id="project-roof-models-title">Tetőmodellek</h2><Link className="primary-button" href={`/projektek/${projectId}/tetomodellek/uj?organization=${organizationId}`}>+ Új tetőmodell</Link></div>
      {roofModels.length > 0 && <div className="roof-model-cards">{roofModels.map((model) => {
        const roofArea = model.currentOutput?.areas.combinedRoofM2 ?? (model.currentMultiRoofOutput ? model.currentMultiRoofOutput.totalAreaMm2 / 1_000_000 : null);
        const roofType = ({ gable: "Nyeregtető", shed: "Félnyeregtető", hip: "Kontytető", pyramid: "Sátortető", halfHip: "Félkontyos tető", lShape: "L alakú tető", tShape: "T alakú tető", other: "Egyéb tető" } as const)[model.roofType];
        return <Link className="roof-model-card" key={model.id} href={`/projektek/${projectId}/tetomodellek/${model.id}?organization=${organizationId}`}>
          <span className="roof-model-type">{roofType}</span><strong>{model.name}</strong>
          <small>{model.currentRevisionNumber ? <>Revízió {model.currentRevisionNumber}<span aria-hidden="true"> · </span>{roofArea?.toLocaleString("hu-HU", { maximumFractionDigits: 3 }) ?? "Eredmény betöltése…"}{roofArea !== null && " m²"}</> : "Még nincs mentett revízió"}</small>
          <ArrowUpRight aria-hidden="true" className="roof-model-open" />
        </Link>;
      })}</div>}
    </section>
    <ProjectRoofDrawings models={roofModels} projectId={projectId} organizationId={organizationId} />
    <ProjectCalculatorLinks projectId={projectId} organizationId={organizationId} />
    <div className="future-module-grid project-workspace-links"><Link className="future-module" href={`/projektek/${projectId}/anyagkimutatas?organization=${organizationId}`}><span className="future-module-icon"><PackageOpen className="size-5" /></span><div><h2>Anyagkimutatás</h2><p>Mentett kalkulációból készíthető anyaglista.</p></div><span className="project-calculator-open">Megnyitás</span></Link><Link className="future-module" href={`/projektek/${projectId}/beszerzes?organization=${organizationId}`}><span className="future-module-icon"><ClipboardList className="size-5" /></span><div><h2>Beszerzés és gyártás</h2><p>Jóváhagyott anyagmennyiségek és műhelyfeladatok.</p></div><span className="project-calculator-open">Megnyitás</span></Link><Link className="future-module" href={`/projektek/${projectId}/ajanlatok?organization=${organizationId}`}><span className="future-module-icon"><FolderOpen className="size-5" /></span><div><h2>Árajánlatok</h2><p>Verziózott belső ajánlati piszkozatok.</p></div><span className="project-calculator-open">Megnyitás</span></Link></div>
  </div></main>;
}

function Fact({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) { return <div className="project-fact"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
