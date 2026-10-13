import Link from "next/link";
import { redirect } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getQuotationWorkspace } from "@/features/quotations/quotation-data";
import { QuotationEditor } from "@/features/quotations/quotation-editor";
import { QuotationDocumentActions } from "@/features/quotations/quotation-document-actions";
import { QuotationManagement } from "@/features/quotations/quotation-management";

export default async function QuotationsPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; edit?: string; new?: string }> }>) {
  const { projectId } = await params; const query = await searchParams; const selected = await getProjectOrganization(query.organization);
  if (!selected) redirect(`/bejelentkezes?returnTo=/projektek/${projectId}/ajanlatok`);
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlatokhoz.</h1></section></main>;
  const organizationId = selected.organization.id; const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1></section></main>;
  const workspace = await getQuotationWorkspace(organizationId, projectId); const selectedQuote = query.edit ? workspace.quotations.find((quote) => quote.id === query.edit) : undefined;
  return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/projektek/${projectId}?organization=${organizationId}`}>← Vissza a projekthez</Link><section className="project-detail-header"><div><p className="section-eyebrow">F8.3.1 · Ajánlatkezelés</p><h1>{project.name}</h1><p>Az ajánlatok állapota, revíziói, véglegesítése és immutable PDF-je egy helyen.</p></div>{!selectedQuote && <Link className="primary-button" href={`/projektek/${projectId}/ajanlatok?organization=${organizationId}&new=1`}>+ Új piszkozat</Link>}</section>{(selectedQuote?.status === "draft" || query.new === "1" || workspace.quotations.length === 0) && <QuotationEditor organizationId={organizationId} projectId={projectId} clients={workspace.clients} variants={workspace.variants} takeoffItems={workspace.takeoffItems} quote={selectedQuote?.status === "draft" ? selectedQuote : undefined} />}{selectedQuote?.status === "finalized" && <section className="detail-surface quotation-finalized-detail"><div className="section-heading"><div><p className="section-eyebrow">Véglegesített ajánlat</p><h2>{selectedQuote.name}</h2></div><span className="status-pill status-finalized">Zárolva</span></div><p>{selectedQuote.clientName ?? "Ügyfél nincs megadva"} · v{selectedQuote.version} · {selectedQuote.lines.length} tétel · {selectedQuote.subtotal ? `${Number(selectedQuote.subtotal).toLocaleString("hu-HU", { minimumFractionDigits: 2 })} HUF` : "nincs összesítés"}</p><p className="missing-data">A történeti értékek rögzítve vannak; módosítás helyett az ajánlat duplikálható új piszkozatként.</p><QuotationDocumentActions pdfUrl={`/api/projektek/${projectId}/ajanlatok/${selectedQuote.id}/pdf`} /></section>}{<QuotationManagement organizationId={organizationId} projectId={projectId} quotations={workspace.quotations} />}</div></main>;
}
