import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getMaterialCategories, getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { getStandaloneDocumentSourcesAction, getStandaloneQuotationHeaderAction, getStandaloneQuotationMaterialSourceAction, listStandaloneQuotationRevisionsAction, readStandaloneQuotationAction } from "@/features/quotations/standalone-quotation-actions";
import { StandaloneQuotationEditor } from "@/features/quotations/standalone-quotation-editor";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getLaborContext } from "@/features/quotations/labor-rate-data";
import { ExecutionPlanLinkControl } from "@/features/execution/execution-plan-link-control";
import { getPlanLinksForDocument } from "@/features/execution/execution-document-links";
import { getExecutionPlanOptionsForOrganization } from "@/features/execution/execution-data";

export default async function StandaloneQuotationPage({ params, searchParams }: Readonly<{ params: Promise<{ quotationId: string }>; searchParams: Promise<{ organization?: string; revision?: string }> }>) {
  const { quotationId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlathoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [header, history] = await Promise.all([
    getStandaloneQuotationHeaderAction(organizationId, quotationId),
    listStandaloneQuotationRevisionsAction(organizationId, quotationId),
  ]);
  if (!header.ok || !history.ok) {
    const error = header.ok ? (!history.ok ? history.error : "") : header.error;
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/ajanlatok?organization=${organizationId}`} label="Vissza az ajánlatokhoz" /><section className="empty-state" role="alert"><div><h1>Az ajánlat nem nyitható meg</h1><p>{error}</p><Link className="secondary-button" href={`/ajanlatok?organization=${organizationId}`}>Vissza az ajánlatlistához</Link></div></section></div></main>;
  }
  const revisions = history.data;
  const requestedRevisionId = query.revision ?? header.data.currentRevisionId ?? undefined;
  const revisionResponse = requestedRevisionId ? await readStandaloneQuotationAction(organizationId, quotationId, requestedRevisionId) : null;
  const activeRevision = revisionResponse?.ok ? revisionResponse.data[0] : undefined;
  if (requestedRevisionId && !activeRevision) return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/ajanlatok/${quotationId}?organization=${organizationId}`} label="Legfrissebb ajánlat" /><p className="form-message is-error" role="alert">A kért revízió nem tölthető be. A mentett ajánlati adat nem változott.</p></div></main>;
  if (header.data.status !== "draft") return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/ajanlatok?organization=${organizationId}`} label="Vissza az ajánlatokhoz" /><section className="detail-surface"><p className="section-eyebrow">Önálló ajánlat</p><h1>{header.data.name}</h1><p>Állapot: {header.data.status}. Ehhez az állapothoz nincs standalone művelet támogatva.</p></section></div></main>;
  const [planLinks, plans] = await Promise.all([getPlanLinksForDocument(organizationId, "quotation", quotationId), getExecutionPlanOptionsForOrganization(organizationId)]);
  const planLinkControl = <section className="glass-bubble material-quotation-card quotation-plan-links"><ExecutionPlanLinkControl organizationId={organizationId} kind="quotation" documentId={quotationId} links={planLinks} plans={plans} /></section>;
  const [products, categories, documentSources, materialSourceResponse] = await Promise.all([
    getMaterialProductsForOrganization(organizationId), getMaterialCategories(organizationId, false), getStandaloneDocumentSourcesAction(organizationId),
    requestedRevisionId ? getStandaloneQuotationMaterialSourceAction(organizationId, quotationId, requestedRevisionId) : Promise.resolve({ ok: true as const, data: null }),
  ]);
  if (!documentSources.ok) return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">{documentSources.error}</p></div></main>;
  if (!materialSourceResponse.ok) return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">{materialSourceResponse.error}</p></div></main>;
  const labor = await getLaborContext(organizationId, materialSourceResponse.data);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><StandaloneQuotationEditor key={`${quotationId}:${activeRevision?.id ?? "empty"}`} userId={selected.auth.userId} organizationId={organizationId} quotationId={quotationId} name={header.data.name} version={header.data.version} currentRevisionId={header.data.currentRevisionId} currentRevision={activeRevision} revisions={revisions} selectedRevisionId={requestedRevisionId} products={products} categories={categories} documentSources={documentSources.data} materialSource={materialSourceResponse.data} laborRates={labor.rates} laborBases={labor.bases} />{planLinkControl}</div></main>;
}
