import Link from "next/link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { getStandaloneDocumentSourcesAction, getStandaloneQuotationHeaderAction, listStandaloneQuotationRevisionsAction, readStandaloneQuotationAction } from "@/features/quotations/standalone-quotation-actions";
import { StandaloneQuotationEditor } from "@/features/quotations/standalone-quotation-editor";

export default async function StandaloneQuotationPage({ params, searchParams }: Readonly<{ params: Promise<{ quotationId: string }>; searchParams: Promise<{ organization?: string; revision?: string }> }>) {
  const { quotationId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlathoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [header, history] = await Promise.all([
    getStandaloneQuotationHeaderAction(organizationId, quotationId),
    listStandaloneQuotationRevisionsAction(organizationId, quotationId),
  ]);
  if (!header.ok || !history.ok) {
    const error = header.ok ? (!history.ok ? history.error : "") : header.error;
    return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/ajanlatok?organization=${organizationId}`}>← Vissza az ajánlatokhoz</Link><section className="empty-state" role="alert"><div><h1>Az ajánlat nem nyitható meg</h1><p>{error}</p><Link className="secondary-button" href={`/ajanlatok?organization=${organizationId}`}>Vissza az ajánlatlistához</Link></div></section></div></main>;
  }
  const revisions = history.data;
  const requestedRevisionId = query.revision ?? header.data.currentRevisionId ?? undefined;
  const revisionResponse = requestedRevisionId ? await readStandaloneQuotationAction(organizationId, quotationId, requestedRevisionId) : null;
  const activeRevision = revisionResponse?.ok ? revisionResponse.data[0] : undefined;
  if (requestedRevisionId && !activeRevision) return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/ajanlatok/${quotationId}?organization=${organizationId}`}>← Legfrissebb ajánlat</Link><p className="form-message is-error" role="alert">A kért revízió nem tölthető be. A mentett ajánlati adat nem változott.</p></div></main>;
  if (header.data.status !== "draft") return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/ajanlatok?organization=${organizationId}`}>← Vissza az ajánlatokhoz</Link><section className="detail-surface"><p className="section-eyebrow">Önálló ajánlat</p><h1>{header.data.name}</h1><p>Állapot: {header.data.status}. Ehhez az állapothoz nincs standalone művelet támogatva.</p></section></div></main>;
  const [products, documentSources] = await Promise.all([getMaterialProductsForOrganization(organizationId), getStandaloneDocumentSourcesAction(organizationId)]);
  if (!documentSources.ok) return <main className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">{documentSources.error}</p></div></main>;
  return <main className="dashboard-shell"><div className="dashboard-container"><StandaloneQuotationEditor userId={selected.auth.userId} organizationId={organizationId} quotationId={quotationId} name={header.data.name} version={header.data.version} currentRevisionId={header.data.currentRevisionId} currentRevision={activeRevision} revisions={revisions} selectedRevisionId={requestedRevisionId} products={products} documentSources={documentSources.data} /></div></main>;
}
