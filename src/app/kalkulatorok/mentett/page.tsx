import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { listStandaloneCalculations } from "@/features/calculations/standalone-data";
import { gutterMaterialCalculator } from "@/domain/calculations/gutter-material";
import { flashingMaterialCalculator } from "@/domain/calculations/flashing-material";
import { sheetMetalProfileCalculator } from "@/domain/calculations/sheet-metal-profile";
import { StandaloneProjectAssociation } from "@/features/calculations/standalone-project-association";
import { GABLE_TRAPEZOIDAL_COVERING_ID } from "@/features/roof-models/gable-trapezoidal-covering-persistence";
import { GABLE_METAL_TILE_COVERING_ID } from "@/features/roof-models/gable-metal-tile-covering-persistence";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
const types = [{ id: "all", label: "Minden típus" }, { id: GABLE_TRAPEZOIDAL_COVERING_ID, label: "Trapézlemez-fedés", route: "nyeregteto" }, { id: GABLE_METAL_TILE_COVERING_ID, label: "Cserepeslemez-fedés", route: "cserepeslemez" }, { id: gutterMaterialCalculator.id, label: "Ereszcsatorna", route: "ereszcsatorna" }, { id: flashingMaterialCalculator.id, label: "Bádogos szegélyek", route: "szegelyek" }, { id: sheetMetalProfileCalculator.id, label: "Lemezprofilok és hajtások", route: "lemezprofilok" }];
export default async function SavedCalculationsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; type?: string }> }>) {
 const params = await searchParams; const selected = await getProjectOrganization(params.organization);
 if (!selected) return null; if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
 if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
 const organizationId = selected.organization.id; const filter = types.some((item) => item.id === params.type) ? params.type : "all";
 const rows = await listStandaloneCalculations(organizationId, filter === "all" ? undefined : filter); const labels = new Map(types.map((item) => [item.id, item]));
 return <main className="dashboard-shell"><div className="dashboard-container"><Link className="back-link" href={`/kalkulatorok?organization=${organizationId}`}>← Kalkulátorok</Link><GlassPageHeader title="Mentett számításaim" />
 <nav className="project-module-links saved-calculation-filters" aria-label="Szűrés kalkulátortípus szerint">{types.map((item) => <Link aria-current={filter === item.id ? "page" : undefined} key={item.id} href={`/kalkulatorok/mentett?organization=${organizationId}${item.id === "all" ? "" : `&type=${encodeURIComponent(item.id)}`}`}>{item.label}</Link>)}</nav>
 {rows.length ? <div className="project-module-list saved-calculation-list">{rows.map((row) => { const type = labels.get(row.calculatorType); if (!type?.route) return null; return <article className="detail-surface project-module-card saved-calculation-card" key={row.calculationId}><div><p className="section-eyebrow">{type.label}</p><h2>{row.displayName}</h2><p>V{row.currentRevisionNumber} · módosítva {new Date(row.updatedAt).toLocaleDateString("hu-HU")}</p></div><div className="project-module-actions"><Link className="primary-button" href={`/kalkulatorok/${type.route}?organization=${organizationId}&calculation=${row.calculationId}`}>Mentett számítás megnyitása</Link>{row.currentRevisionId && row.calculatorType !== GABLE_TRAPEZOIDAL_COVERING_ID && <StandaloneProjectAssociation organizationId={organizationId} sourceCalculationId={row.calculationId} sourceRevisionId={row.currentRevisionId} sourceRevisionNumber={row.currentRevisionNumber} sourceName={row.displayName} calculatorType={row.calculatorType} />}</div></article>; })}</div> : <section className="empty-state"><div><h2>Még nincs mentett számítás</h2><p>Kezdj egy önálló kalkulációt, majd válaszd a mentést.</p><div className="project-module-links">{types.slice(1).map((item) => <Link key={item.id} href={`/kalkulatorok/${item.route}?organization=${organizationId}`}>Új {item.label.toLocaleLowerCase("hu-HU")}</Link>)}</div></div></section>}{rows.length === 100 && <p className="detail-description">A lista az utolsó 100 számítást mutatja.</p>}</div></main>;
}
