import { surveySections, completeSectionMeasurements } from "@/domain/field-surveys/workspace";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { getFieldSurveyRevision } from "@/features/field-surveys/field-survey-data";
import { FieldSurveyHandoffNotice } from "@/features/field-surveys/field-survey-handoff-notice";
import { GutterCalculator } from "@/features/gutters/gutter-calculator";
import { getMaterialProductsForOrganization } from "@/features/materials/material-data";
import { FlashingCalculator } from "@/features/flashings/flashing-calculator";
import { getFlashingCatalogVariants } from "@/features/flashings/flashing-data";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneGablePreview } from "@/features/roof-models/standalone-gable-preview";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function FieldSurveyCalculatorHandoffPage({ params, searchParams }: Readonly<{
  params: Promise<{ surveyId: string; calculator: string }>;
  searchParams: Promise<{ organization?: string; version?: string; section?: string }>;
}>) {
  const { surveyId, calculator } = await params;
  const query = await searchParams;
  const version = Number(query.version);
  if (!uuidPattern.test(surveyId) || !["roof", "gutter", "flashing"].includes(calculator) || !Number.isSafeInteger(version) || version < 1) return <Unavailable message="A felmérésrevízió vagy kalkulátortípus érvénytelen." />;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt a folytatáshoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const revision = await getFieldSurveyRevision(organizationId, surveyId, version);
  if (!revision) return <Unavailable message="A felmérés kiválasztott változata nem érhető el." />;
  const section = query.section ? surveySections(revision).find((item) => item.id === query.section) : surveySections(revision)[0];
  if (!section) return <Unavailable message="A munkaszakasz nem szerepel a kiválasztott revízióban." />;
  const handoff = mapFieldSurveyToCalculator({ surveyId, revisionId: revision.id, version: revision.version, workType: section.workType, measurements: completeSectionMeasurements(section) });
  if (!handoff.ok) return <Unavailable message={handoff.error} />;
  if (handoff.calculator !== calculator) return <Unavailable message="A kiválasztott kalkulátor nem illik a felmérés munkatípusához." />;
  const backHref = `/felmeresek/${surveyId}?organization=${encodeURIComponent(organizationId)}`;
  const source = { surveyId, version: revision.version, revisionId: revision.id };

  if (handoff.calculator === "roof") return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={backHref} label="Vissza a felméréshez" /><FieldSurveyHandoffNotice missing={handoff.missing} /><StandaloneGablePreview organizationId={organizationId} initialHandoff={handoff.input} handoffSource={source} missingHandoffFields={handoff.missing} showBackNavigation={false} /></div></main>;

  if (handoff.calculator === "gutter") {
    const products = await getMaterialProductsForOrganization(organizationId, { includeArchived: false });
    const catalogVariants = products.flatMap((product) => product.variants.map((variant) => ({ id: variant.id, productId: product.id, productName: product.name, category: product.category, variantName: variant.name, sku: variant.sku, purchasingUnit: variant.purchasingUnit, lengthMm: variant.lengthMm, nominalWidthMm: variant.nominalWidthMm, effectiveWidthMm: variant.effectiveWidthMm, technicalSpecs: variant.technicalSpecs, provenance: variant.provenance })));
    return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={backHref} label="Vissza a felméréshez" /><FieldSurveyHandoffNotice missing={handoff.missing} /><GutterCalculator organizationId={organizationId} suggestions={[]} saved={null} catalogVariants={catalogVariants} initialInput={handoff.input} handoffSource={source} /></div></main>;
  }

  const catalogVariants = await getFlashingCatalogVariants(organizationId);
  return <main className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={backHref} label="Vissza a felméréshez" /><FieldSurveyHandoffNotice missing={handoff.missing} /><FlashingCalculator organizationId={organizationId} suggestions={[]} saved={null} catalogVariants={catalogVariants} initialHandoff={handoff.input} handoffSource={source} /></div></main>;
}

function Unavailable({ message }: Readonly<{ message: string }>) {
  return <main className="dashboard-shell"><div className="dashboard-container"><section className="field-survey-empty"><h1>A kalkulátorátadás nem indítható</h1><p>{message}</p><Link className="primary-button" href="/felmeresek">Vissza a felmérésekhez</Link></section></div></main>;
}
