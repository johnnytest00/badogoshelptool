import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { FlashingCalculator } from "@/features/flashings/flashing-calculator";
import { getProjectOrganization } from "@/features/projects/organization";
import { getStandaloneCalculation } from "@/features/calculations/standalone-data";
import type { FlashingCalculationRecord } from "@/features/flashings/flashing-data";
import { flashingMaterialCalculator } from "@/domain/calculations/flashing-material";
import { redirect } from "next/navigation";

export default async function StandaloneFlashingPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; calculation?: string }> }>) {
  const params = await searchParams;
  const selected = await getProjectOrganization(params.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kalkulátorhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  if (!params.calculation) redirect(`/kalkulatorok?organization=${selected.organization.id}`);
  const candidate = await getStandaloneCalculation(selected.organization.id, params.calculation);
  const record = candidate?.calculatorType === flashingMaterialCalculator.id ? candidate : null;
  const current = record?.revisions.find((revision) => revision.revisionId === record.currentRevisionId);
  const saved = record && current ? { calculationId: record.calculationId, revisionId: current.revisionId, revisionNumber: current.revisionNumber, displayName: record.displayName, input: current.input, output: current.output, createdAt: current.createdAt, stale: false, revisions: record.revisions.map((revision) => ({ ...revision, displayName: record.displayName, stale: false })) } as unknown as FlashingCalculationRecord : null;
  if (!saved) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A mentett számítás nem található.</h1><BackNavigation href={`/kalkulatorok/mentett?organization=${selected.organization.id}`} label="Vissza a mentett számításokhoz" /></section></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kalkulatorok/mentett?organization=${selected.organization.id}`} label="Vissza a mentett számításokhoz" /><FlashingCalculator organizationId={selected.organization.id} suggestions={[]} saved={saved} catalogVariants={[]} readOnly /></div></main>;
}
