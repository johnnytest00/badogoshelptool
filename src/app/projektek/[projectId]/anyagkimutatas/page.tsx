import { redirect } from "next/navigation";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getMaterialTakeoffs, getSavedGableCalculations, getTakeoffVariants } from "@/features/material-takeoffs/takeoff-data";
import { createMaterialTakeoffFormAction } from "@/features/material-takeoffs/takeoff-actions";
import { TakeoffItemForm, ApproveTakeoffForm } from "@/features/material-takeoffs/takeoff-forms";
import { MaterialPreparationWorkspace } from "@/features/material-takeoffs/material-preparation-workspace";
import { getQuotationWorkspace } from "@/features/quotations/quotation-data";
import { getMaterialPreparationLists } from "@/features/material-takeoffs/material-preparation-data";
import type { MaterialSourceTakeoff, MaterialPriceSnapshot } from "@/domain/material-takeoffs/aggregation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { materialCategoryLabels, materialProvenanceLabels, materialPurchasingUnitLabels, type MaterialCategory, type MaterialProvenance, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

const sourceLabels: Record<string, string> = {
  "areas.combinedRoofM2": "Teljes tetőfelület", "areas.individualRoofPlaneM2": "Egy tetősík felülete", "areas.horizontalProjectedM2": "Vízszintes vetület",
  "lengths.ridgeLineMm": "Gerinc hossza", "lengths.totalEaveEdgesMm": "Ereszélek összes hossza", "lengths.totalSlopingGableEdgesMm": "Ferde oromélek összes hossza", "roof.covering.totalSheetCount": "Mentett fedési darabszám", manual: "Kézi mennyiség",
};

export default async function MaterialTakeoffPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; takeoff?: string }> }>) {
  const { projectId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) redirect(`/bejelentkezes?returnTo=/projektek/${projectId}/anyagkimutatas`);
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kimutatáshoz.</h1></section></main>;
  const organizationId = selected.organization.id;
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1></section></main>;
  const [calculations, takeoffs, variants, quotationWorkspace] = await Promise.all([getSavedGableCalculations(organizationId, projectId), getMaterialTakeoffs(organizationId, projectId), getTakeoffVariants(organizationId), getQuotationWorkspace(organizationId, projectId)]);
  const preparationSources: MaterialSourceTakeoff[] = takeoffs.map((takeoff) => ({
    id: takeoff.id, name: takeoff.name, status: takeoff.status, version: takeoff.version,
    sourceCalculationId: takeoff.sourceCalculationId, sourceRevisionId: takeoff.sourceRevisionId,
    sourceCurrentRevisionId: takeoff.sourceCurrentRevisionId,
    items: takeoff.items.map((item) => ({ id: item.id, variantId: item.variantId, quantity: item.quantityExact, unit: item.quantityUnit, productName: item.productName, productCategory: item.productCategory, variantName: item.variantName, materialSnapshot: item.materialSnapshot, priceSnapshot: item.priceSnapshot as MaterialPriceSnapshot | null })),
  }));
  const currentSourceRevisions = new Map(preparationSources.map((takeoff) => [takeoff.id, takeoff.sourceCurrentRevisionId]));
  const preparationLists = await getMaterialPreparationLists(organizationId, projectId, currentSourceRevisions);
  const draftQuotations = quotationWorkspace.quotations.filter((quote) => quote.status === "draft").map(({ id, name, version }) => ({ id, name, version }));
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/projektek/${projectId}?organization=${organizationId}`} label="Vissza a projekthez" />
    <GlassPageHeader title={project.name} context="Anyagkimutatás · mentett, a rendszer által ellenőrzött számítás alapján; a mennyiségek szakmai jóváhagyása külön feladat." />
    <MaterialPreparationWorkspace organizationId={organizationId} projectId={projectId} projectName={project.name} takeoffs={preparationSources} lists={preparationLists} selectedListId={null} draftQuotations={draftQuotations} />
    <section className="detail-surface"><h2>Új anyagkimutatás</h2><form action={createMaterialTakeoffFormAction} className="stack-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="projectId" value={projectId} /><label>Megnevezés<input name="name" defaultValue="Anyagkimutatás" required /></label><label>Forráskalkuláció<select name="calculationSource" required><option value="">Válassz mentett kalkulációt…</option>{calculations.map((calculation) => <option key={`${calculation.id}-${calculation.revisionId}`} value={`${calculation.id}|${calculation.revisionId}`}>{calculation.displayName} · változat {calculation.revisionNumber}</option>)}</select></label><p className="detail-description">A kiválasztott revízió a szerveren újra ellenőrzésre kerül. Módosítatlan forrás nélkül jóváhagyás nem lehetséges.</p><button className="primary-button" type="submit">Piszkozat létrehozása</button></form></section>
    {takeoffs.map((takeoff) => <section className="detail-surface" key={takeoff.id} id={`takeoff-${takeoff.id}`} data-selected={query.takeoff === takeoff.id ? "true" : undefined}>
      <div className="roof-list-heading"><div><p className="section-eyebrow">{takeoff.status === "approved" ? "Jóváhagyva" : "Piszkozat"}</p><h2>{takeoff.name}</h2></div>{takeoff.sourceRevisionId !== takeoff.sourceCurrentRevisionId && <span className="coming-soon-badge">Elavult számítási alap</span>}{takeoff.staleRoofSource && <span className="coming-soon-badge">Elavult tetőforrás</span>}</div>
      <p className="detail-description">Forrásszámítás: {takeoff.sourceDisplayName}</p><details><summary>Forrásazonosítók</summary><p>Számítás: {takeoff.sourceCalculationId} · változat: {takeoff.sourceRevisionId}{takeoff.sourceRoofModelId ? ` · tetőmodell: ${takeoff.sourceRoofModelId} · tetőrevízió: ${takeoff.sourceRoofRevisionId}` : ""}</p></details>
      <div className="project-fact-grid">{takeoff.items.map((item) => <div className="project-fact" key={item.id}><div><small>{item.productName ? `${item.productName} · ` : ""}{item.variantName}{item.sku ? ` · ${item.sku}` : ""}{item.productCategory ? ` · ${materialCategoryLabels[item.productCategory as MaterialCategory] ?? item.productCategory}` : ""}</small><strong>{item.quantity.toLocaleString("hu-HU", { maximumFractionDigits: 4 })} {materialPurchasingUnitLabels[item.unit as MaterialPurchasingUnit] ?? item.unit}</strong><small>{sourceLabels[item.source] ?? "Átadott számítási adat"} · adat eredete: {materialProvenanceLabels[item.provenance as MaterialProvenance] ?? "Nincs besorolva"}{item.warning ? ` · ${item.warning}` : ""}</small>{item.technicalDetails && <details><summary>Mentett műszaki adatok</summary><small>{item.technicalDetails}</small></details>}<small>{item.priceDetails ? `Mentett árforrás: ${item.priceDetails}` : "Mentett árforrás: nincs rögzítve"}</small></div></div>)}</div>
      {takeoff.status === "draft" && <><h3>Anyagok és mennyiségek</h3><TakeoffItemForm organizationId={organizationId} projectId={projectId} takeoffId={takeoff.id} variants={variants} /><div className="takeoff-approval-actions"><ApproveTakeoffForm organizationId={organizationId} projectId={projectId} takeoffId={takeoff.id} /></div></>}
    </section>)}
  </div></main>;
}
