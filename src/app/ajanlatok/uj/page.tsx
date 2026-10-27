import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { NoOrganizationAccess } from "@/features/auth/access-state";
import { OrganizationSelector } from "@/features/auth/auth-controls";
import { getMaterialCategories, getMaterialProductPage } from "@/features/materials/material-data";
import { getWorkflowMaterialLists } from "@/features/material-takeoffs/material-preparation-data";
import { getProjectOrganization } from "@/features/projects/organization";
import { StandaloneQuotationEditor, type QuotationMaterialSource } from "@/features/quotations/standalone-quotation-editor";
import { getStandaloneDocumentSourcesAction } from "@/features/quotations/standalone-quotation-actions";
import { getLaborContext } from "@/features/quotations/labor-rate-data";
import { quotationLinesFromMaterialList } from "@/features/quotations/material-list-quotation-import";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { getCalculationQuotationSource } from "@/features/quotations/calculation-quotation-data";
import { listStandaloneCalculations } from "@/features/calculations/standalone-data";
import { constructionCalculatorLabels } from "@/features/calculators/construction-computation";
import { QuotationSourceSelector } from "@/features/quotations/quotation-source-selector";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sourceChoice = (value?: string) => {
  const parts = value?.split("|");
  return parts?.length === 2 && UUID.test(parts[0]) && UUID.test(parts[1]) ? parts as [string, string] : null;
};

export default async function NewStandaloneQuotationPage({ searchParams }: Readonly<{ searchParams: Promise<{ organization?: string; plan?: string; materialList?: string; materialRevision?: string; calculation?: string; calculationRevision?: string; materialSource?: string; calculationSource?: string }> }>) {
  const query = await searchParams;
  const selected = await getProjectOrganization(query.organization);
  if (!selected) return null;
  if (!selected.organization && !selected.needsSelection) return <NoOrganizationAccess />;
  if (!selected.organization) return <main id="main-content" tabIndex={-1} className="auth-state-shell"><section className="auth-state-card"><h1>Válassz műhelyt az ajánlathoz.</h1><OrganizationSelector organizations={selected.auth.organizations} /></section></main>;
  const organizationId = selected.organization.id;
  const [productPage, categories, documentSources, lists, calculations] = await Promise.all([getMaterialProductPage(organizationId), getMaterialCategories(organizationId, false), getStandaloneDocumentSourcesAction(organizationId), getWorkflowMaterialLists(organizationId), listStandaloneCalculations(organizationId)]);
  const products = productPage.products;
  if (!documentSources.ok) return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><p className="form-message is-error" role="alert">{documentSources.error}</p></div></main>;
  const selectedMaterial = sourceChoice(query.materialSource);
  const selectedCalculation = sourceChoice(query.calculationSource);
  const materialListId = selectedMaterial?.[0] ?? query.materialList;
  const materialRevisionId = selectedMaterial?.[1] ?? query.materialRevision;
  const calculationId = selectedCalculation?.[0] ?? query.calculation;
  const calculationRevisionId = selectedCalculation?.[1] ?? query.calculationRevision;
  const list = materialListId ? lists.find((candidate) => candidate.id === materialListId) : undefined;
  const selectedRevision = list?.history.find((revision) => revision.id === materialRevisionId);
  const hasSourceQuery = Boolean(query.materialSource || query.calculationSource || query.materialList || query.materialRevision);
  const invalidSourceChoice = (query.materialSource && !selectedMaterial) || (query.calculationSource && !selectedCalculation);
  if ((query.materialSource && invalidSourceChoice) || (hasSourceQuery && (query.materialList || query.materialRevision || query.materialSource) && (!list || !selectedRevision || !selectedRevision.items.length))) {
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><div><h1>Az anyaglista-forrás nem érhető el</h1><p>Az ajánlat pontos lista-revízióból készülne. Ellenőrizd a hozzáférést, majd indítsd újra a műveletet az anyaglistáról.</p><Link className="secondary-button" href={`/anyaglistak?organization=${organizationId}`}>Anyaglisták megnyitása</Link></div></section></div></main>;
  }
  if (query.plan && !list) {
    const planLists = lists.filter((candidate) => candidate.executionPlanId === query.plan && candidate.currentRevisionId);
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><BackNavigation href={`/kivitelezes/${query.plan}?organization=${organizationId}`} label="Vissza a munkanaplóhoz" /><GlassPageHeader title="Új árajánlat" context="Válassz egy mentett anyaglista-revíziót vagy kezdj üres piszkozatot." />{planLists.length ? <div className="workflow-material-list-cards">{planLists.map((candidate) => <Link key={candidate.id} className="workflow-material-list-card glass-bubble" href={`/ajanlatok/uj?organization=${organizationId}&plan=${query.plan}&materialList=${candidate.id}&materialRevision=${candidate.currentRevisionId}`}><span><strong>{candidate.name}</strong><small>V{candidate.currentRevision?.revisionNumber ?? candidate.version} · {candidate.currentRevision?.items.length ?? 0} tétel</small></span><span aria-hidden="true">↗</span></Link>)}</div> : <section className="glass-bubble workflow-material-meta"><p>Ehhez a munkanaplóhoz még nincs mentett anyaglista.</p><Link className="secondary-button" href={`/anyaglistak/uj?organization=${organizationId}&plan=${query.plan}`}>Anyaglista létrehozása</Link></section>}<Link className="text-action" href={`/ajanlatok/uj?organization=${organizationId}`}>Üres árajánlat-piszkozat indítása</Link></div></main>;
  }
  let materialSource: QuotationMaterialSource | null = null;
  let initialLines: ReturnType<typeof quotationLinesFromMaterialList> = [];
  let initialName: string | undefined;
  if (list && selectedRevision) {
    const sourceLineMap = selectedRevision.items.map((item, quotationLineIndex) => ({ materialItemId: item.id, quotationLineIndex }));
    materialSource = { materialListId: list.id, materialRevisionId: selectedRevision.id, listName: list.name, revisionNumber: selectedRevision.revisionNumber, currentRevisionId: list.currentRevisionId, currentVersion: list.version, executionPlanId: list.executionPlanId, sourceLineMap };
    initialLines = quotationLinesFromMaterialList(selectedRevision, products);
    initialName = `${list.name} – ajánlata`.slice(0, 200);
  }
  const calculationSource = calculationId && UUID.test(calculationId) && (!calculationRevisionId || UUID.test(calculationRevisionId))
    ? await getCalculationQuotationSource(organizationId, calculationId, calculationRevisionId) : null;
  if ((query.calculation || query.calculationSource) && !calculationSource) {
    return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><section className="empty-state" role="alert"><div><h1>A kalkulációs forrás nem érhető el</h1><p>Az ajánlat a saját, mentett kalkulációd pontos revíziójából készülhet. Nyisd meg újra a kalkulációt, és onnan indítsd az ajánlatot.</p><Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim</Link></div></section></div></main>;
  }
  if (calculationSource && !materialSource) initialName = `${calculationSource.calculationName} – ajánlata`.slice(0, 200);
  const labor = await getLaborContext(organizationId, materialSource);
  const materialRevisions = lists.flatMap((candidate) => candidate.history.filter((revision) => revision.items.length).map((revision) => ({ value: `${candidate.id}|${revision.id}`, label: `${candidate.name} · V${revision.revisionNumber}` })));
  const calculationRevisions = calculations.filter((candidate) => candidate.calculatorType.startsWith("construction.") && candidate.currentRevisionId).map((candidate) => {
    const calculatorId = candidate.calculatorType.slice("construction.".length) as keyof typeof constructionCalculatorLabels;
    return { value: `${candidate.calculationId}|${candidate.currentRevisionId}`, label: `${candidate.displayName} · ${constructionCalculatorLabels[calculatorId] ?? calculatorId} · V${candidate.currentRevisionNumber}` };
  });
  const selectedMaterialValue = selectedMaterial ? `${selectedMaterial[0]}|${selectedMaterial[1]}` : materialSource ? `${materialSource.materialListId}|${materialSource.materialRevisionId}` : "";
  const selectedCalculationValue = selectedCalculation ? `${selectedCalculation[0]}|${selectedCalculation[1]}` : calculationSource ? `${calculationSource.calculationId}|${calculationSource.calculationRevisionId}` : "";
  if (selectedCalculationValue && !calculationRevisions.some((option) => option.value === selectedCalculationValue) && calculationSource) calculationRevisions.push({ value: selectedCalculationValue, label: `${calculationSource.calculationName} · V${calculationSource.revisionNumber}` });
  return <main id="main-content" tabIndex={-1} className="dashboard-shell"><div className="dashboard-container"><QuotationSourceSelector organizationId={organizationId} materialRevisions={materialRevisions} calculationRevisions={calculationRevisions} selectedMaterial={selectedMaterialValue} selectedCalculation={selectedCalculationValue} /><StandaloneQuotationEditor userId={selected.auth.userId} organizationId={organizationId} quotationId={null} name={initialName} version={0} currentRevisionId={null} revisions={[]} products={products} categories={categories} documentSources={documentSources.data} materialSource={materialSource} calculationSource={calculationSource} laborRates={labor.rates} laborBases={labor.bases} initialLines={initialLines} /></div></main>;
}
