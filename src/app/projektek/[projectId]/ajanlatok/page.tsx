import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { redirect } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getQuotationWorkspace } from "@/features/quotations/quotation-data";
import { QuotationEditor } from "@/features/quotations/quotation-editor";
import { QuotationDocumentActions } from "@/features/quotations/quotation-document-actions";
import { QuotationManagement } from "@/features/quotations/quotation-management";
import { getMaterialTakeoffs } from "@/features/material-takeoffs/takeoff-data";
import { aggregateMaterialRequirements, prepareQuotationMaterialLines, type MaterialSourceTakeoff } from "@/domain/material-takeoffs/aggregation";
import type { PreparedQuotationMaterialLine } from "@/domain/material-takeoffs/aggregation";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

export default async function QuotationsPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; edit?: string; new?: string; takeoffItems?: string; operationId?: string }> }>) {
  const { projectId } = await params; const query = await searchParams; const selected = await getProjectOrganization(query.organization);
  if (!selected) redirect(`/bejelentkezes?returnTo=/projektek/${projectId}/ajanlatok`);
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlatokhoz.</h1></section></main>;
  const organizationId = selected.organization.id; const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1></section></main>;
  const workspace = await getQuotationWorkspace(organizationId, projectId); const selectedQuote = query.edit ? workspace.quotations.find((quote) => quote.id === query.edit) : undefined;
  const requestedItemIds = query.takeoffItems ? query.takeoffItems.split(",").filter(Boolean) : [];
  let preparedLines: PreparedQuotationMaterialLine[] = [];
  let transferError = "";
  let alreadyIncludedCount = 0;
  if (query.takeoffItems !== undefined) {
    if (requestedItemIds.length === 0 || requestedItemIds.length > 100 || new Set(requestedItemIds).size !== requestedItemIds.length || requestedItemIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
      transferError = "Az anyagforrás-lista érvénytelen vagy túl hosszú. Menj vissza az anyagáttekintőhöz és válassz újra.";
    } else if (query.operationId !== undefined && !/^[0-9a-f-]{36}$/i.test(query.operationId)) {
      transferError = "Az átvétel műveletazonosítója érvénytelen. Menj vissza az anyagáttekintőhöz és próbáld újra.";
    } else if (query.edit && selectedQuote?.status !== "draft") {
      transferError = "Csak meglévő piszkozatba lehet anyagokat átvenni. Válassz másik piszkozatot vagy újat.";
    } else {
      const takeoffs = await getMaterialTakeoffs(organizationId, projectId);
      const requested = new Set(requestedItemIds);
      const materialSources: MaterialSourceTakeoff[] = takeoffs.map((takeoff) => ({
        id: takeoff.id, name: takeoff.name, status: takeoff.status, version: takeoff.version,
        sourceCalculationId: takeoff.sourceCalculationId, sourceRevisionId: takeoff.sourceRevisionId,
        sourceCurrentRevisionId: takeoff.sourceCurrentRevisionId,
        items: takeoff.items.filter((item) => requested.has(item.id)).map((item) => ({ id: item.id, variantId: item.variantId, quantity: item.quantityExact, unit: item.quantityUnit, productName: item.productName, productCategory: item.productCategory, variantName: item.variantName, materialSnapshot: item.materialSnapshot, priceSnapshot: item.priceSnapshot as import("@/domain/material-takeoffs/aggregation").MaterialPriceSnapshot | null })),
      })).filter((takeoff) => takeoff.items.length > 0);
      const foundIds = new Set(materialSources.flatMap((takeoff) => takeoff.items.map((item) => item.id)));
      if (foundIds.size !== requested.size || materialSources.some((takeoff) => takeoff.status !== "approved")) {
        transferError = "Egy vagy több forrás nem létezik, nem ehhez a projekthez tartozik, vagy nincs jóváhagyva.";
      } else if (query.operationId === undefined) {
        transferError = "A biztonságos átvétel műveletazonosítója hiányzik. Menj vissza az anyagáttekintőhöz és próbáld újra.";
      } else {
        const existingSourceIds = new Set((selectedQuote?.lines ?? []).flatMap((line) => [
          ...(typeof line.takeoffItemId === "string" && line.takeoffItemId ? [line.takeoffItemId] : []),
          ...(Array.isArray(line.takeoffSourceItemIds) ? line.takeoffSourceItemIds.filter((id): id is string => typeof id === "string") : []),
        ]));
        alreadyIncludedCount = requestedItemIds.filter((id) => existingSourceIds.has(id)).length;
        const freshSources = materialSources.map((takeoff) => ({ ...takeoff, items: takeoff.items.filter((item) => !existingSourceIds.has(item.id)) })).filter((takeoff) => takeoff.items.length > 0);
        const requirements = aggregateMaterialRequirements(freshSources, freshSources.map((takeoff) => takeoff.id));
        preparedLines = prepareQuotationMaterialLines(requirements);
      }
    }
  }
  const showEditor = selectedQuote?.status === "draft" || query.new === "1" || workspace.quotations.length === 0 || query.takeoffItems !== undefined;
  const statusLabels = { draft: "Piszkozat", finalized: "Véglegesített", sent: "Elküldött", accepted: "Elfogadott", rejected: "Elutasított" } as const;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">{!showEditor && <BackNavigation href={`/projektek/${projectId}?organization=${organizationId}`} label="Vissza a projekthez" />}<GlassPageHeader title={project.name} context="Árajánlatok · az ajánlatok állapota, revíziói és változatlanul megőrzött pillanatképei." actions={!showEditor && !selectedQuote ? <Link className="primary-button" href={`/projektek/${projectId}/ajanlatok?organization=${organizationId}&new=1`}>+ Új piszkozat</Link> : undefined} />{showEditor && <QuotationEditor userId={selected.auth.userId} organizationId={organizationId} projectId={projectId} clients={workspace.clients} variants={workspace.variants} takeoffItems={workspace.takeoffItems} quote={selectedQuote?.status === "draft" ? selectedQuote : undefined} preparedLines={preparedLines} transferError={transferError} operationId={query.operationId ?? ""} alreadyIncludedCount={alreadyIncludedCount} />}{selectedQuote && selectedQuote.status !== "draft" && <section className="detail-surface quotation-finalized-detail"><div className="section-heading"><div><p className="section-eyebrow">Ajánlat részletei</p><h2>{selectedQuote.name}</h2></div><span className={"status-pill status-" + selectedQuote.status}>{statusLabels[selectedQuote.status]}</span></div><p>{selectedQuote.clientName ?? "Ügyfél nincs megadva"} · v{selectedQuote.version} · {selectedQuote.lines.length} tétel · {selectedQuote.subtotal ? Number(selectedQuote.subtotal).toLocaleString("hu-HU", { minimumFractionDigits: 2 }) + " HUF" : "nincs összesítés"}</p><p className="missing-data">A véglegesített ajánlat mentett pénzügyi adatai nem módosíthatók. Az elfogadás vagy elutasítás felhasználó által rögzített üzleti állapot, nem elektronikus aláírás.</p><QuotationDocumentActions pdfUrl={"/api/projektek/" + projectId + "/ajanlatok/" + selectedQuote.id + "/pdf"} /><div className="quotation-timeline"><h3>Státusztörténet</h3>{selectedQuote.statusEvents.length === 0 ? <p className="missing-data">Ehhez az ajánlathoz még nincs rögzített státuszesemény.</p> : <ol>{selectedQuote.statusEvents.map((event) => <li key={event.id}><strong>{statusLabels[event.toStatus]}</strong><span>{new Date(event.eventAt).toLocaleString("hu-HU")} · {event.actedBy ? "Felhasználó (" + event.actedBy.slice(0, 8) + "…)" : "Ismeretlen felhasználó"}</span>{event.note && <small>{event.note}</small>}</li>)}</ol>}</div></section>}{!showEditor && <QuotationManagement organizationId={organizationId} projectId={projectId} quotations={workspace.quotations} />}</div></main>;
}
