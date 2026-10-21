import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { ClipboardCheck, Plus } from "lucide-react";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getProjectOrganization } from "@/features/projects/organization";
import { getFieldSurveys } from "@/features/field-surveys/field-survey-data";
import { fieldSurveyUnitLabels, fieldSurveyWorkTypeLabels } from "@/domain/field-surveys/contracts";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

export default async function FieldSurveysPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string }> }>) {
  const selected = await getProjectOrganization((await searchParams).organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><p className="eyebrow">Több szervezet</p><h1>Válassz műhelyt a felmérésekhez.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const surveys = await getFieldSurveys(organizationId);
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container">
    <BackNavigation href={`/?organization=${organizationId}`} label="Vissza a műhelyhez" />
    <GlassPageHeader title="Felmérések" actions={<Link className="primary-button" href={`/felmeresek/uj?organization=${organizationId}`}><Plus aria-hidden="true" className="size-4" /> Új felmérés</Link>} />
    {surveys.length ? <div className="field-survey-list">{surveys.map((survey) => {
      // The records carry no name, so the first line of the note is the only field that tells two surveys apart.
      const kind = `${fieldSurveyWorkTypeLabels[survey.workType]} felmérés${survey.projectId ? " · projekt" : " · önálló"}`;
      const noteTitle = survey.notes?.split("\n")[0].trim();
      return <Link className="field-survey-list-card" key={survey.id} href={`/felmeresek/${survey.id}?organization=${organizationId}`}>
      <span className="field-survey-list-icon"><ClipboardCheck aria-hidden="true" className="size-5" /></span><span className="field-survey-list-copy"><strong>{noteTitle || kind}</strong><span>{noteTitle ? `${kind} · ` : ""}{survey.measurements.length} mérés · V{survey.version}</span><small>{survey.measurements.slice(0, 2).map((measurement) => `${measurement.label}: ${measurement.value} ${fieldSurveyUnitLabels[measurement.unit]}`).join(" · ")}</small></span><time dateTime={survey.updatedAt}>{new Date(survey.updatedAt).toLocaleDateString("hu-HU")}</time>
    </Link>;
    })}</div> : <section className="field-survey-empty"><ClipboardCheck aria-hidden="true" className="size-7" /><h2>Még nincs mentett felmérés</h2><p>Kezdj egy méréssel, és folytasd később ugyanitt.</p><Link className="primary-button" href={`/felmeresek/uj?organization=${organizationId}`}>Első felmérés indítása</Link></section>}
  </div></main>;
}
