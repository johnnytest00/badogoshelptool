import Link from "next/link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { FlashingCalculator } from "@/features/flashings/flashing-calculator";
import { getFlashingCalculation, getFlashingCatalogVariants, getFlashingGeometrySuggestions } from "@/features/flashings/flashing-data";

export default async function FlashingCalculatorPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; calculation?: string; revision?: string; roof?: string; edges?: string }> }>) {
  const { projectId } = await params;
  const pageQuery = await searchParams;
  const selected = await getProjectOrganization(pageQuery.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a szegélykalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1><Link className="login-secondary-link" href={`/projektek?organization=${organizationId}`}>Vissza a projektekhez</Link></section></main>;
  const [suggestions, saved, catalogVariants] = await Promise.all([getFlashingGeometrySuggestions(organizationId, projectId), getFlashingCalculation(organizationId, projectId), getFlashingCatalogVariants(organizationId)]);
  if ((pageQuery.calculation && saved?.calculationId !== pageQuery.calculation) || (pageQuery.revision && saved?.revisionId !== pageQuery.revision)) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projektkalkuláció nem található.</h1><Link className="login-secondary-link" href={`/projektek/${projectId}/szegelyek?organization=${organizationId}`}>Projektkalkuláció megnyitása</Link></section></main>;
  const selectedSuggestions = pageQuery.roof && pageQuery.edges ? [...new Set(pageQuery.edges.split(","))].flatMap((edge) => suggestions.find((suggestion) => suggestion.reference.roofModelId === pageQuery.roof && suggestion.reference.edgeId === edge) ? [suggestions.find((suggestion) => suggestion.reference.roofModelId === pageQuery.roof && suggestion.reference.edgeId === edge)!] : []) : [];
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/projektek/${projectId}?organization=${organizationId}`} label="Vissza a projekthez" /><FlashingCalculator organizationId={organizationId} projectId={projectId} suggestions={suggestions} selectedSuggestions={selectedSuggestions} saved={saved} catalogVariants={catalogVariants} /></div></main>;
}
