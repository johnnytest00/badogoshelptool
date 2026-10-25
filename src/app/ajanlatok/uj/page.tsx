import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getMaterialCategories, getMaterialProductPage } from "@/features/materials/material-data";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneQuotationEditor, type QuotationMaterialSource } from "@/features/quotations/standalone-quotation-editor";
import { getStandaloneDocumentSourcesAction } from "@/features/quotations/standalone-quotation-actions";
import { getLaborContext } from "@/features/quotations/labor-rate-data";
import { quotationLinesFromMaterialList } from "@/features/quotations/material-list-quotation-import";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getCalculationQuotationSource } from "@/features/quotations/calculation-quotation-data";

export default async function NewStandaloneQuotationPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; plan?: string; materialList?: string; materialRevision?: string; calculation?: string; calculationRevision?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlathoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [productPage, categories, documentSources, lists] = await Promise.all([getMaterialProductPage(organizationId), getMaterialCategories(organizationId, false), getStandaloneDocumentSourcesAction(organizationId), getWorkflowMaterialLists(organizationId)]);
  const products = productPage.products;
  if (!documentSources.ok) return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">{documentSources.error}</p></div></main>;
  const list = query.materialList ? lists.find((candidate) => candidate.id === query.materialList) : undefined;
  const selectedRevision = list?.history.find((revision) => revision.id === query.materialRevision);
  const hasSourceQuery = Boolean(query.materialList || query.materialRevision);
  if (hasSourceQuery && (!list || !selectedRevision || !selectedRevision.items.length)) {
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><div><h1>Az anyaglista-forrás nem érhető el</h1><p>Az ajánlat pontos lista-revízióból készülne. Ellenőrizd a hozzáférést, majd indítsd újra a műveletet az anyaglistáról.</p><Link className="secondary-button" href={`/anyaglistak?organization=${organizationId}`}>Anyaglisták megnyitása</Link></div></section></div></main>;
  }
  if (query.plan && !list) {
    const planLists = lists.filter((candidate) => candidate.executionPlanId === query.plan && candidate.currentRevisionId);
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kivitelezes/${query.plan}?organization=${organizationId}`} label="Vissza a munkanaplóhoz" /><GlassPageHeader title="Új árajánlat" context="Válassz egy mentett anyaglista-revíziót vagy kezdj üres piszkozatot." />{planLists.length ? <div className="workflow-material-list-cards">{planLists.map((candidate) => <Link key={candidate.id} className="workflow-material-list-card glass-bubble" href={`/ajanlatok/uj?organization=${organizationId}&plan=${query.plan}&materialList=${candidate.id}&materialRevision=${candidate.currentRevisionId}`}><span><strong>{candidate.name}</strong><small>V{candidate.currentRevision?.revisionNumber ?? candidate.version} · {candidate.currentRevision?.items.length ?? 0} tétel</small></span><span aria-hidden="true">↗</span></Link>)}</div> : <section className="glass-bubble workflow-material-meta"><p>Ehhez a munkanaplóhoz még nincs mentett anyaglista.</p><Link className="secondary-button" href={`/anyaglistak/uj?organization=${organizationId}&plan=${query.plan}`}>Anyaglista létrehozása</Link></section>}<Link className="text-action" href={`/ajanlatok/uj?organization=${organizationId}`}>Üres árajánlat-piszkozat indítása</Link></div></main>;
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
  const calculationSource = query.calculation && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.calculation) && (!query.calculationRevision || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query.calculationRevision))
    ? await getCalculationQuotationSource(organizationId, query.calculation, query.calculationRevision) : null;
  if (query.calculation && !calculationSource) {
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><div><h1>A kalkulációs forrás nem érhető el</h1><p>Az ajánlat a saját, mentett kalkulációd pontos revíziójából készülhet. Nyisd meg újra a kalkulációt, és onnan indítsd az ajánlatot.</p><Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim</Link></div></section></div></main>;
  }
  if (calculationSource && materialSource) return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">Egy ajánlat egyszerre csak egy forrásból (anyaglista vagy kalkuláció) indulhat.</p></div></main>;
  if (calculationSource) initialName = `${calculationSource.calculationName} – ajánlata`.slice(0, 200);
  const labor = await getLaborContext(organizationId, materialSource);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><StandaloneQuotationEditor userId={selected.auth.userId} organizationId={organizationId} quotationId={null} name={initialName} version={0} currentRevisionId={null} revisions={[]} products={products} categories={categories} documentSources={documentSources.data} materialSource={materialSource} calculationSource={calculationSource} laborRates={labor.rates} laborBases={labor.bases} initialLines={initialLines} /></div></main>;
}
