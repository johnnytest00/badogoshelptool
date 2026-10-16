import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneQuotationEditor, type QuotationMaterialSource } from "@/features/quotations/standalone-quotation-editor";
import { getStandaloneDocumentSourcesAction } from "@/features/quotations/standalone-quotation-actions";
import { quotationLinesFromMaterialList } from "@/features/quotations/material-list-quotation-import";

export default async function NewStandaloneQuotationPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; plan?: string; materialList?: string; materialRevision?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlathoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [products, documentSources, lists] = await Promise.all([getMaterialProductsForOrganization(organizationId), getStandaloneDocumentSourcesAction(organizationId), getWorkflowMaterialLists(organizationId)]);
  if (!documentSources.ok) return <main className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">{documentSources.error}</p></div></main>;
  const list = query.materialList ? lists.find((candidate) => candidate.id === query.materialList) : undefined;
  const selectedRevision = list?.history.find((revision) => revision.id === query.materialRevision);
  const hasSourceQuery = Boolean(query.materialList || query.materialRevision);
  if (hasSourceQuery && (!list || !selectedRevision || !selectedRevision.items.length)) {
    return <main className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><div><h1>Az anyaglista-forrás nem érhető el</h1><p>Az ajánlat pontos lista-revízióból készülne. Ellenőrizd a hozzáférést, majd indítsd újra a műveletet az anyaglistáról.</p><Link className="secondary-button" href={`/anyaglistak?organization=${organizationId}`}>Anyaglisták megnyitása</Link></div></section></div></main>;
  }
  if (query.plan && !list) {
    const planLists = lists.filter((candidate) => candidate.executionPlanId === query.plan && candidate.currentRevisionId);
    return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/kivitelezes/${query.plan}?organization=${organizationId}`}>← Munkanapló</Link><GlassPageHeader title="Új árajánlat" context="Válassz egy mentett anyaglista-revíziót vagy kezdj üres piszkozatot." />{planLists.length ? <div className="workflow-material-list-cards">{planLists.map((candidate) => <Link key={candidate.id} className="workflow-material-list-card glass-bubble" href={`/ajanlatok/uj?organization=${organizationId}&plan=${query.plan}&materialList=${candidate.id}&materialRevision=${candidate.currentRevisionId}`}><span><strong>{candidate.name}</strong><small>V{candidate.currentRevision?.revisionNumber ?? candidate.version} · {candidate.currentRevision?.items.length ?? 0} tétel</small></span><span aria-hidden="true">↗</span></Link>)}</div> : <section className="glass-bubble workflow-material-meta"><p>Ehhez a munkanaplóhoz még nincs mentett anyaglista.</p><Link className="secondary-button" href={`/anyaglistak/uj?organization=${organizationId}&plan=${query.plan}`}>Anyaglista létrehozása</Link></section>}<Link className="text-action" href={`/ajanlatok/uj?organization=${organizationId}`}>Üres árajánlat-piszkozat indítása</Link></div></main>;
  }
  let materialSource: QuotationMaterialSource | null = null;
  let initialLines: ReturnType<typeof quotationLinesFromMaterialList> = [];
  let initialName: string | undefined;
  if (list && selectedRevision) {
    const sourceLineMap = selectedRevision.items.map((item, quotationLineIndex) => ({ materialItemId: item.id, quotationLineIndex }));
    materialSource = { materialListId: list.id, materialRevisionId: selectedRevision.id, listName: list.name, revisionNumber: selectedRevision.revisionNumber, currentRevisionId: list.currentRevisionId, currentVersion: list.version, executionPlanId: list.executionPlanId, sourceLineMap };
    initialLines = quotationLinesFromMaterialList(selectedRevision, products);
    initialName = `${list.name} – ajánlata`.slice(0, 200);
  }
  return <main className="dashboard-shell"><div className="dashboard-container"><StandaloneQuotationEditor userId={selected.auth.userId} organizationId={organizationId} quotationId={null} name={initialName} version={0} currentRevisionId={null} revisions={[]} products={products} documentSources={documentSources.data} materialSource={materialSource} initialLines={initialLines} /></div></main>;
}
