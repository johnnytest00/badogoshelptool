import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectsForOrganization } from "@/features/projects/project-data";
import { projectFilterSchema } from "@/domain/projects/contracts";
import { ProjectList } from "@/features/projects/project-list";

export default async function ProjectsPage({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const params = await searchParams;
  const selected = await getProjectOrganization(typeof params.organization === "string" ? params.organization : undefined);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <OrganizationChoice organizations={selected.auth.organizations} />;
  const filters = projectFilterSchema.parse({ search: typeof params.search === "string" ? params.search : undefined, status: typeof params.status === "string" ? params.status : undefined, projectType: typeof params.projectType === "string" ? params.projectType : undefined, includeArchived: params.archived === "1", sort: params.sort === "oldest" ? "oldest" : "newest" });
  const projects = await getProjectsForOrganization(selected.organization.id, filters);
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/?organization=${selected.organization.id}`}><ArrowLeft className="size-4" /> Vissza a műhelyhez</Link><ProjectList organizationId={selected.organization.id} projects={projects} filters={filters} /></div></main>;
}

function OrganizationChoice({ organizations }: Readonly<{ organizations: readonly { id: string; name: string }[] }>) {
  return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a projektekhez.</h1><p>A lekérdezések mindig a kiválasztott szervezetre szűkülnek.</p><OrganizationSelector organizations={organizations} /></section></main>;
}
