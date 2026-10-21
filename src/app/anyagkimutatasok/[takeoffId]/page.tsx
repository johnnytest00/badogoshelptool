import { notFound } from "next/navigation";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getStandaloneTakeoffs } from "@/features/material-takeoffs/takeoff-data";
import { getTakeoffListLink } from "@/features/material-takeoffs/takeoff-list-link";
import { TakeoffWorkflowPanel } from "@/features/material-takeoffs/takeoff-workflow-panel";
import { materialProvenanceLabels, materialPurchasingUnitLabels, type MaterialProvenance, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export default async function StandaloneTakeoffPage({ params, searchParams }: Readonly<{ params: Promise<{ takeoffId: string }>; searchParams: Promise<{ organization?: string }> }>) {
  const { takeoffId } = await params;
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyagkimutatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  if (!isUuid(takeoffId)) notFound();
  const takeoff = (await getStandaloneTakeoffs(organizationId, { takeoffId }))[0];
  if (!takeoff) notFound();
  const listLink = await getTakeoffListLink(organizationId, takeoff.id);
  const stale = takeoff.sourceRevisionId !== takeoff.sourceCurrentRevisionId;
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/anyagkimutatasok?organization=${organizationId}`} label="Vissza az anyagkimutatásokhoz" />
    <GlassPageHeader title={takeoff.name} context={`${takeoff.status === "approved" ? "Jóváhagyva" : "Piszkozat"} · V${takeoff.version} · önálló, projekt és munkanapló nélkül`} />
    <section className="detail-surface">
      <div className="roof-list-heading"><div><p className="section-eyebrow">Forrás</p><h2>{takeoff.sourceDisplayName}</h2></div>{stale && <span className="coming-soon-pill">A forrásprofil időközben új revíziót kapott</span>}</div>
      <p className="detail-description">A tétel a mentett profilrevízió pillanatnyi állapotát rögzíti; a forrás módosítása nem írja át.</p>
      <Link className="text-action" href={`/kalkulatorok/lemezprofilok?organization=${organizationId}&calculation=${takeoff.sourceCalculationId}`}>Forrásprofil megnyitása</Link>
      <details><summary>Forrásazonosítók</summary><p>Számítás: {takeoff.sourceCalculationId} · revízió: {takeoff.sourceRevisionId}</p></details>
    </section>
    <TakeoffWorkflowPanel organizationId={organizationId} takeoffId={takeoff.id} status={takeoff.status} canApprove={selected.organization.role === "owner" || selected.organization.role === "admin"} stale={stale} listId={listLink?.listId ?? null} />
    <section className="detail-surface"><h2>Anyagtételek</h2>
      <div className="project-fact-grid">{takeoff.items.map((item) => <div className="project-fact" key={item.id}><div>
        <small>{[item.productName, item.variantName, item.sku].filter(Boolean).join(" · ")}</small>
        <strong>{item.quantity.toLocaleString("hu-HU", { maximumFractionDigits: 6 })} {materialPurchasingUnitLabels[item.unit as MaterialPurchasingUnit] ?? item.unit}</strong>
        <small>{materialProvenanceLabels[item.provenance as MaterialProvenance] ?? item.provenance}{item.priceDetails ? ` · ár: ${item.priceDetails}` : " · nincs rögzített ár"}</small>
        {item.technicalDetails && <small>{item.technicalDetails}</small>}
        {item.warning && <small>{item.warning}</small>}
      </div></div>)}</div>
    </section>
  </div></main>;
}
