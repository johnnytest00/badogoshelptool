import Link from "next/link";
import { ArrowLeft, CalendarDays, FileText, FolderOpen, Layers3, MapPin, PackageOpen, UserRound } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { projectStatusLabels, projectTypeLabels } from "@/domain/projects/contracts";
import { getProjectOrganization } from "@/features/projects/organization";
import { getClientsForOrganization, getProjectForOrganization } from "@/features/projects/project-data";
import { ProjectEditForm } from "@/features/projects/project-forms";
import { ProjectLifecycleActions } from "@/features/projects/project-lifecycle";

export default async function ProjectDetailPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { projectId } = await params;
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a projekthez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const project = await getProjectForOrganization(selected.organization.id, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Projekt</p><h1>A projekt nem található.</h1><p>Azonosító alapján nincs elérhető projekt ebben a műhelyben.</p><Link className="login-secondary-link" href={`/projektek?organization=${selected.organization.id}`}>Vissza a projektekhez</Link></section></main>;
  const clients = await getClientsForOrganization(selected.organization.id);
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/projektek?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza a projektekhez</Link><section className="project-detail-header"><div><p className="section-eyebrow">Projekt áttekintése · v{project.version}</p><h1>{project.name}</h1><p>{projectTypeLabels[project.projectType]} · {projectStatusLabels[project.status]}</p></div><ProjectLifecycleActions organizationId={selected.organization.id} project={project} /></section><div className="project-detail-grid"><section className="detail-surface"><h2>Alapadatok</h2><div className="project-fact-grid"><Fact icon={<UserRound className="size-4" />} label="Ügyfél" value={project.clientName ?? "Ügyfél nélkül"} /><Fact icon={<MapPin className="size-4" />} label="Helyszín" value={project.location ?? "Nincs megadva"} /><Fact icon={<CalendarDays className="size-4" />} label="Létrehozva" value={new Date(project.createdAt).toLocaleDateString("hu-HU")} /><Fact icon={<CalendarDays className="size-4" />} label="Módosítva" value={new Date(project.updatedAt).toLocaleDateString("hu-HU")} /></div><p className="detail-description">{project.description || "Ehhez a projekthez még nincs leírás."}</p></section><section className="detail-surface"><p className="section-eyebrow">Szerkesztés</p><h2>Projektadatok</h2><ProjectEditForm organizationId={selected.organization.id} project={project} clients={clients.map((client) => ({ id: client.id, name: client.name }))} /></section></div><div className="future-module-grid"><FutureModule icon={<Layers3 className="size-5" />} title="Tetőmodellek" /><FutureModule icon={<FileText className="size-5" />} title="Kalkulációk" /><FutureModule icon={<PackageOpen className="size-5" />} title="Anyagkimutatás" /><FutureModule icon={<FolderOpen className="size-5" />} title="Árajánlatok és dokumentumok" /></div></div></main>;
}

function Fact({ icon, label, value }: Readonly<{ icon: React.ReactNode; label: string; value: string }>) { return <div className="project-fact"><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></div>; }
function FutureModule({ icon, title }: Readonly<{ icon: React.ReactNode; title: string }>) { return <section className="future-module"><span className="future-module-icon">{icon}</span><div><h2>{title}</h2><p>Hamarosan elérhető a későbbi kalkulációs fázisban.</p></div><span className="coming-soon-badge">Hamarosan</span></section>; }
