import Link from "next/link";
import { redirect } from "next/navigation";
import { getProjectOrganization } from "@/features/projects/organization";
import { getProjectForOrganization } from "@/features/projects/project-data";
import { getMaterialTakeoffs, getSavedGableCalculations, getTakeoffVariants } from "@/features/material-takeoffs/takeoff-data";
import { createMaterialTakeoffFormAction } from "@/features/material-takeoffs/takeoff-actions";
import { TakeoffItemForm, ApproveTakeoffForm } from "@/features/material-takeoffs/takeoff-forms";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { materialCategoryLabels, materialProvenanceLabels, materialPurchasingUnitLabels, type MaterialCategory, type MaterialProvenance, type MaterialPurchasingUnit } from "@/domain/materials/contracts";

const sourceLabels: Record<string, string> = {
  "areas.combinedRoofM2": "Teljes tetőfelület", "areas.individualRoofPlaneM2": "Egy tetősík felülete", "areas.horizontalProjectedM2": "Vízszintes vetület",
  "lengths.ridgeLineMm": "Gerinc hossza", "lengths.totalEaveEdgesMm": "Ereszélek összes hossza", "lengths.totalSlopingGableEdgesMm": "Ferde oromélek összes hossza", manual: "Kézi mennyiség",
};

export default async function MaterialTakeoffPage({ params, searchParams }: Readonly<{ params: Promise<{ projectId: string }>; searchParams: Promise<{ organization?: string; takeoff?: string }> }>) {
  const { projectId } = await params;
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) redirect(`/bejelentkezes?returnTo=/projektek/${projectId}/anyagkimutatas`);
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a kimutatáshoz.</h1></section></main>;
  const organizationId = selected.organization.id;
  const project = await getProjectForOrganization(organizationId, projectId);
  if (!project) return <main className="auth-state-shell"><section className="auth-state-card"><h1>A projekt nem található.</h1></section></main>;
  const [calculations, takeoffs, variants] = await Promise.all([getSavedGableCalculations(organizationId, projectId), getMaterialTakeoffs(organizationId, projectId), getTakeoffVariants(organizationId)]);
  return <main className="dashboard-shell"><div className="dashboard-container">
    <Link className="back-link" href={`/projektek/${projectId}?organization=${organizationId}`}>← Vissza a projekthez</Link>
    <section className="project-detail-header"><div><p className="section-eyebrow">Anyagkimutatás</p><h1>{project.name}</h1><p>Mentett, a rendszer által ellenőrzött számítás alapján; a mennyiségek szakmai jóváhagyása külön feladat.</p></div></section>
    <section className="detail-surface"><h2>Új anyagkimutatás</h2><form action={createMaterialTakeoffFormAction} className="stack-form"><input type="hidden" name="organizationId" value={organizationId} /><input type="hidden" name="projectId" value={projectId} /><label>Megnevezés<input name="name" defaultValue="Anyagkimutatás" required /></label><label>Forráskalkuláció<select name="calculationSource" required><option value="">Válassz mentett kalkulációt…</option>{calculations.map((calculation) => <option key={`${calculation.id}-${calculation.revisionId}`} value={`${calculation.id}|${calculation.revisionId}`}>{calculation.displayName} · változat {calculation.revisionNumber}</option>)}</select></label><p className="detail-description">A kiválasztott revízió a szerveren újra ellenőrzésre kerül. Módosítatlan forrás nélkül jóváhagyás nem lehetséges.</p><button className="primary-button" type="submit">Piszkozat létrehozása</button></form></section>
    {takeoffs.map((takeoff) => <section className="detail-surface" key={takeoff.id} id={`takeoff-${takeoff.id}`} data-selected={query.takeoff === takeoff.id ? "true" : undefined}>
      <div className="roof-list-heading"><div><p className="section-eyebrow">{takeoff.status === "approved" ? "Jóváhagyva" : "Piszkozat"}</p><h2>{takeoff.name}</h2></div>{takeoff.sourceRevisionId !== takeoff.sourceCurrentRevisionId && <span className="coming-soon-badge">Elavult számítási alap</span>}</div>
      <p className="detail-description">Forrásszámítás: {takeoff.sourceDisplayName}</p><details><summary>Forrásazonosítók</summary><p>Számítás: {takeoff.sourceCalculationId} · változat: {takeoff.sourceRevisionId}</p></details>
      <div className="project-fact-grid">{takeoff.items.map((item) => <div className="project-fact" key={item.id}><div><small>{item.productName ? `${item.productName} · ` : ""}{item.variantName}{item.sku ? ` · ${item.sku}` : ""}{item.productCategory ? ` · ${materialCategoryLabels[item.productCategory as MaterialCategory] ?? item.productCategory}` : ""}</small><strong>{item.quantity.toLocaleString("hu-HU", { maximumFractionDigits: 4 })} {materialPurchasingUnitLabels[item.unit as MaterialPurchasingUnit] ?? item.unit}</strong><small>{sourceLabels[item.source] ?? "Átadott számítási adat"} · adat eredete: {materialProvenanceLabels[item.provenance as MaterialProvenance] ?? "Nincs besorolva"}{item.warning ? ` · ${item.warning}` : ""}</small>{item.technicalDetails && <details><summary>Mentett műszaki adatok</summary><small>{item.technicalDetails}</small></details>}<small>{item.priceDetails ? `Mentett árforrás: ${item.priceDetails}` : "Mentett árforrás: nincs rögzítve"}</small></div></div>)}</div>
      {takeoff.status === "draft" && <><h3>Anyagok és mennyiségek</h3><TakeoffItemForm organizationId={organizationId} projectId={projectId} takeoffId={takeoff.id} variants={variants} /><div className="takeoff-approval-actions"><ApproveTakeoffForm organizationId={organizationId} projectId={projectId} takeoffId={takeoff.id} /></div></>}
    </section>)}
  </div></main>;
}
