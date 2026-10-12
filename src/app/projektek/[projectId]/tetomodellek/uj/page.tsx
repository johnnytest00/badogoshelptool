import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { GableRoofCalculatorForm } from "@/features/roof-models/gable-roof-form";

export default async function NewRoofModelPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { projectId } = await params;
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a tetőmodellhez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const project = await getProjectForOrganization(selected.organization.id, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1><Link className="login-secondary-link" href={`/projektek?organization=${selected.organization.id}`}>Vissza a projektekhez</Link></section></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/projektek/${projectId}?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza a projekthez</Link><GableRoofCalculatorForm organizationId={selected.organization.id} projectId={projectId} /></div></main>;
}
