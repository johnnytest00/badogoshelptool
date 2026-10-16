import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { redirect } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getMaterialTakeoffs } from "@/features/material-takeoffs/takeoff-data";
import { getMaterialPreparationLists } from "@/features/material-takeoffs/material-preparation-data";
import { MaterialPreparationWorkspace } from "@/features/material-takeoffs/material-preparation-workspace";
import type { MaterialSourceTakeoff, MaterialPriceSnapshot } from "@/domain/material-takeoffs/aggregation";

export default async function MaterialPreparationPage({ params, searchParams }: Readonly<{
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ organization?: string; lista?: string }>;
}>) {
  const { projectId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) redirect(`/bejelentkezes?returnTo=/projektek/${projectId}/beszerzes`);
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a beszerzési listához.</h1></section></main>;

  const organizationId = selected.organization.id;
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1></section></main>;

  const takeoffRows = await getMaterialTakeoffs(organizationId, projectId);
  const takeoffs: MaterialSourceTakeoff[] = takeoffRows.map((takeoff) => ({
    id: takeoff.id, name: takeoff.name, status: takeoff.status, version: takeoff.version,
    sourceCalculationId: takeoff.sourceCalculationId, sourceRevisionId: takeoff.sourceRevisionId,
    sourceCurrentRevisionId: takeoff.sourceCurrentRevisionId,
    items: takeoff.items.map((item) => ({
      id: item.id, variantId: item.variantId, quantity: item.quantityExact, unit: item.quantityUnit,
      productName: item.productName, productCategory: item.productCategory, variantName: item.variantName,
      materialSnapshot: item.materialSnapshot, priceSnapshot: item.priceSnapshot as MaterialPriceSnapshot | null,
    })),
  }));
  const currentSourceRevisions = new Map(takeoffs.map((takeoff) => [takeoff.id, takeoff.sourceCurrentRevisionId]));
  const lists = await getMaterialPreparationLists(organizationId, projectId, currentSourceRevisions);
  const selectedListId = lists.some((list) => list.id === query.lista) ? query.lista ?? null : null;

  return <main className="dashboard-shell"><div className="dashboard-container">
    <Link className="back-link no-print" href={`/projektek/${projectId}?organization=${organizationId}`}>← Vissza a projekthez</Link>
    <MaterialPreparationWorkspace key={`${selectedListId ?? "new"}:${lists.find((list) => list.id === selectedListId)?.currentRevisionId ?? ""}`} organizationId={organizationId} projectId={projectId} projectName={project.name} takeoffs={takeoffs} lists={lists} selectedListId={selectedListId} />
  </div></main>;
}
