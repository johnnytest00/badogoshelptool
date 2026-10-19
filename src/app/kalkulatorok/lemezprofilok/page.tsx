import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getProfileCatalogCandidates } from "@/features/sheet-metal/profile-data";
import { ProfileEditor } from "@/features/sheet-metal/profile-editor";
import { getProjectOrganization } from "@/features/projects/organization";
import { getStandaloneTakeoffs } from "@/features/material-takeoffs/takeoff-data";
import { getStandaloneCalculation } from "@/features/calculations/standalone-data";
import type { SavedProfile } from "@/features/sheet-metal/profile-data";
import { sheetMetalProfileCalculator } from "@/domain/calculations/sheet-metal-profile";

export default async function StandaloneProfilePage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculation?: string }> }>) {
  const params = await searchParams;
  const selected = await getProjectOrganization(params.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const catalogCandidates = await getProfileCatalogCandidates(selected.organization.id);
  const candidate = params.calculation ? await getStandaloneCalculation(selected.organization.id, params.calculation) : null;
  const record = candidate?.calculatorType === sheetMetalProfileCalculator.id ? candidate : null;
  const takeoffs = record ? (await getStandaloneTakeoffs(selected.organization.id, { calculationId: record.calculationId })).map(({ id, name, status }) => ({ id, name, status })) : [];
  const profiles = record ? [{ calculationId: record.calculationId, displayName: record.displayName, currentRevisionNumber: record.currentRevisionNumber, revisions: record.revisions.map((revision) => ({ revisionId: revision.revisionId, revisionNumber: revision.revisionNumber, createdAt: revision.createdAt, input: revision.input, output: revision.output })) }] as unknown as SavedProfile[] : [];
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kalkulatorok?organization=${selected.organization.id}`} label="Vissza a kalkulátorokhoz" /><ProfileEditor organizationId={selected.organization.id} profiles={profiles} catalogCandidates={catalogCandidates} takeoffs={takeoffs} /></div></main>;
}
