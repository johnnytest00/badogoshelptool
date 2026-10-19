import { PackageOpen } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { getStandaloneTakeoffs } from "@/features/material-takeoffs/takeoff-data";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";

export default async function StandaloneTakeoffsPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az anyagkimutatásokhoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const takeoffs = await getStandaloneTakeoffs(organizationId);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container workflow-material-lists-index">
    <BackNavigation href={`/kalkulatorok?organization=${organizationId}`} label="Vissza a kalkulátorokhoz" />
    <GlassPageHeader title="Önálló anyagkimutatások" context="Mentett számításból készült piszkozatok · projekt vagy munkanapló nélkül" />
    {takeoffs.length ? <div className="workflow-material-list-cards">{takeoffs.map((takeoff) => <Link className="workflow-material-list-card glass-bubble" key={takeoff.id} href={`/anyagkimutatasok/${takeoff.id}?organization=${organizationId}`}>
      <span className="future-module-icon"><PackageOpen aria-hidden="true" /></span>
      <span className="workflow-material-list-copy"><strong>{takeoff.name}</strong><small>{takeoff.status === "approved" ? "Jóváhagyva" : "Piszkozat"} · {takeoff.sourceDisplayName}</small></span>
      <span className="workflow-material-list-count"><strong>{takeoff.items.length}</strong> tétel</span>
      <span className="workflow-material-list-arrow" aria-hidden="true">↗</span>
    </Link>)}</div> : <section className="empty-state workflow-material-list-empty"><PackageOpen aria-hidden="true" /><div><h2>Még nincs önálló anyagkimutatásod</h2><p>Mentett lemezprofilból hozhatsz létre piszkozatot.</p><Link className="primary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számítások</Link></div></section>}
  </div></main>;
}
