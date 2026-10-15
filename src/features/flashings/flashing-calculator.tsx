"use client";

import type { SavedSurveyCalculation } from "@/domain/field-surveys/workspace";


import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { materialProvenanceLabels, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import type { FlashingCalculationRecord, FlashingGeometrySuggestion } from "./flashing-data";
import { createFlashingTakeoffDraftAction, saveFlashingCalculationAction } from "./flashing-actions";
import { saveStandaloneCalculationAction } from "@/features/calculations/standalone-actions";
import { StandaloneProjectAssociation } from "@/features/calculations/standalone-project-association";
import { executeCalculator } from "@/domain/calculations/engine";
import { flashingCategories, flashingMaterialCalculator, flashingMaterialInputSchema, type FlashingCategory, type FlashingMaterialInput } from "@/domain/calculations/flashing-material";
import { buildFlashingTakeoffCandidates, checkFlashingMappings, type FlashingCatalogVariant } from "@/domain/calculations/flashing-material-integration";
import { FlashingTechnicalDrawing } from "./flashing-technical-drawing";
import { createIdempotencyKey, generateSecureUuid } from "@/lib/secure-uuid";
import { selectFlashingDrawingPreview } from "./drawing-preview";
import type { FlashingPrefill, SurveyHandoffSource } from "@/domain/field-surveys/calculator-handoff";

type RunDraft = { id: string; category: FlashingCategory; name: string; lengthMm: string; lengthSource: FlashingMaterialInput["runs"][number]["lengthSource"]; roofEdgeReference: FlashingMaterialInput["runs"][number]["roofEdgeReference"]; startExtensionMm: string; endExtensionMm: string; reserveMm: string };
type Draft = { name: string; nominalLengthMm: string; nominalLengthLabel: string; connectionMode: "unknown" | "no_overlap_confirmed" | "explicit_overlap" | "effective_length_supplied"; overlapMm: string; effectiveLengthMm: string; runs: RunDraft[] };

const validationFieldLabels: Record<string, string> = {
  sectionSpec: "Közös szálparaméterek", nominalLengthMm: "Kereskedelmi szálhossz", nominalLengthSource: "Szálhossz adatforrása", connection: "Toldás és hasznos fedés", overlapMm: "Toldásonkénti átfedés", additionalCoveragePerSectionMm: "További szál hasznos fedése",
  runs: "Szegélyszakasz", category: "Szegélykategória", name: "Szakasz neve", lengthMm: "Lefedendő hossz", lengthSource: "Mérési forrás", startExtensionMm: "Kezdő végkiterjesztés", endExtensionMm: "Záró végkiterjesztés", reserveMm: "Tartalék",
};
const validationField = (path: PropertyKey[]) => path.length ? path.map((part) => typeof part === "number" ? `${part + 1}. szakasz` : validationFieldLabels[String(part)] ?? "Bevitt adat").join(" · ") : "Bevitt adat";

const categoryLabels: Record<FlashingCategory, string> = { verge: "Oromszegély", wall: "Falszegély", eaves: "Ereszszegély", ridge: "Gerincszegély", hip: "Kontyszegély", valley: "Vápalemez", custom: "Egyedi szegélyprofil" };
const initialName = "Bádogos szegély becslés";
const createInitialDraft = (): Draft => ({ name: initialName, nominalLengthMm: "", nominalLengthLabel: "Kézi megadás — forrás/gyártói adat nincs rögzítve", connectionMode: "unknown", overlapMm: "", effectiveLengthMm: "", runs: [{ id: generateSecureUuid(), category: "verge", name: "Oromszakasz", lengthMm: "", lengthSource: "user_provided", roofEdgeReference: null, startExtensionMm: "0", endExtensionMm: "0", reserveMm: "0" }] });

function draftFromSurvey(input: FlashingPrefill): Draft {
  const base = createInitialDraft();
  return {
    ...base,
    nominalLengthMm: input.sectionLengthMm === undefined ? "" : String(input.sectionLengthMm),
    nominalLengthLabel: "Felhasználó által megadott adat a felmérésből; nem gyártói igazolás",
    connectionMode: input.overlapMm === undefined ? "unknown" : "explicit_overlap",
    overlapMm: input.overlapMm === undefined ? "" : String(input.overlapMm),
    runs: input.runs.length ? input.runs.map((run) => ({ ...base.runs[0], ...run, category: "custom", lengthMm: String(run.lengthMm), lengthSource: "site_measurement" })) : base.runs,
  };
}

export function isFlashingDraftDirty(currentInputJson: string, baselineInputJson: string, currentName: string, baselineName: string) {
  return currentInputJson !== baselineInputJson || currentName !== baselineName;
}

function draftFromInput(input: FlashingMaterialInput, name: string): Draft {
  const connection = input.sectionSpec.connection;
  return {
    name, nominalLengthMm: String(input.sectionSpec.nominalLengthMm), nominalLengthLabel: input.sectionSpec.nominalLengthSource.label,
    connectionMode: connection.mode,
    overlapMm: connection.mode === "explicit_overlap" ? String(connection.overlapMm) : "",
    effectiveLengthMm: connection.mode === "effective_length_supplied" ? String(connection.additionalCoveragePerSectionMm) : "",
    runs: input.runs.map((run) => ({ ...run, lengthMm: String(run.lengthMm), startExtensionMm: String(run.startExtensionMm), endExtensionMm: String(run.endExtensionMm), reserveMm: String(run.reserveMm) })),
  };
}

function numeric(value: string) { return value.trim() === "" ? Number.NaN : Number(value); }
function toDomainInput(draft: Draft): unknown {
  const source = { kind: "user_provided", label: draft.nominalLengthLabel || "Kézi megadás", manuallyOverridden: false } as const;
  const connection = draft.connectionMode === "unknown" ? { mode: "unknown" }
    : draft.connectionMode === "no_overlap_confirmed" ? { mode: "no_overlap_confirmed", source }
      : draft.connectionMode === "explicit_overlap" ? { mode: "explicit_overlap", overlapMm: numeric(draft.overlapMm), source }
        : { mode: "effective_length_supplied", additionalCoveragePerSectionMm: numeric(draft.effectiveLengthMm), source };
  return { sectionSpec: { nominalLengthMm: numeric(draft.nominalLengthMm), nominalLengthSource: source, connection }, runs: draft.runs.map((run) => ({ ...run, lengthMm: numeric(run.lengthMm), startExtensionMm: numeric(run.startExtensionMm), endExtensionMm: numeric(run.endExtensionMm), reserveMm: numeric(run.reserveMm) })), manualComponents: [] };
}

export function FlashingCalculator({ organizationId, projectId, suggestions, selectedSuggestions = [], saved, catalogVariants, initialHandoff, handoffSource, onSaved, onWorkspaceState }: Readonly<{ organizationId: string; projectId?: string; suggestions: FlashingGeometrySuggestion[]; selectedSuggestions?: FlashingGeometrySuggestion[]; saved: FlashingCalculationRecord | null; catalogVariants: FlashingCatalogVariant[]; initialHandoff?: FlashingPrefill; handoffSource?: SurveyHandoffSource; onSaved?: (saved: SavedSurveyCalculation) => Promise<void>; onWorkspaceState?: (state: { dirty: boolean; pending: boolean }) => void }>) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => {
    if (saved) {
      const existing = draftFromInput(saved.input, saved.displayName);
      return { ...existing, runs: [...existing.runs, ...selectedSuggestions.filter((suggestion) => !existing.runs.some((run) => run.roofEdgeReference?.roofModelId === suggestion.reference.roofModelId && run.roofEdgeReference.edgeId === suggestion.reference.edgeId)).map((suggestion) => ({ id: generateSecureUuid(), category: suggestion.category, name: suggestion.label.split(" · ").slice(1).join(" · "), lengthMm: String(suggestion.lengthMm), lengthSource: "geometry" as const, roofEdgeReference: suggestion.reference, startExtensionMm: "0", endExtensionMm: "0", reserveMm: "0" }))] };
    }
    const base = initialHandoff ? draftFromSurvey(initialHandoff) : createInitialDraft();
    return selectedSuggestions.length ? { ...base, runs: selectedSuggestions.map((suggestion) => ({ id: generateSecureUuid(), category: suggestion.category, name: suggestion.label.split(" · ").slice(1).join(" · "), lengthMm: String(suggestion.lengthMm), lengthSource: "geometry" as const, roofEdgeReference: suggestion.reference, startExtensionMm: "0", endExtensionMm: "0", reserveMm: "0" })) } : base;
  });
  const handoffBaseline = useRef(initialHandoff ? JSON.stringify(draftFromSurvey(initialHandoff)) : "");
  const handoffModified = Boolean(handoffSource && JSON.stringify(draft) !== handoffBaseline.current);
  const [expectedRevision, setExpectedRevision] = useState(saved?.revisionNumber ?? 0);
  const [baseline, setBaseline] = useState(() => saved ? JSON.stringify(saved.input) : "");
  const [baselineName, setBaselineName] = useState(saved?.displayName ?? initialName);
  const [history, setHistory] = useState<FlashingCalculationRecord["revisions"]>(() => saved?.revisions ?? []);
  const [selectedRevisionId, setSelectedRevisionId] = useState(saved?.revisionId ?? "");
  const [variantMappings, setVariantMappings] = useState<Record<string, string>>({});
  const [requestKey] = useState(() => createIdempotencyKey());
  const [flashingOperationId, setFlashingOperationId] = useState(() => generateSecureUuid());
  const [feedback, setFeedback] = useState("");
  const standaloneId = useRef(saved?.calculationId ?? generateSecureUuid());
  const [isPending, startTransition] = useTransition();
  useEffect(() => { if (saved) { setHistory(saved.revisions); setSelectedRevisionId(saved.revisionId); } }, [saved]);

  const parsed = useMemo(() => flashingMaterialInputSchema.safeParse(toDomainInput(draft)), [draft]);
  const calculated = useMemo(() => parsed.success ? executeCalculator(flashingMaterialCalculator, parsed.data) : null, [parsed]);
  const currentJson = parsed.success ? JSON.stringify(parsed.data) : "";
  const dirty = isFlashingDraftDirty(currentJson, baseline, draft.name, baselineName);
  const validationMessages = parsed.success ? [] : parsed.error.issues.map((issue) => `${validationField(issue.path)}: ${issue.message.startsWith("Invalid") ? "Hiányzó vagy érvénytelen érték." : issue.message}`);
  const domainErrors = calculated && !calculated.ok ? calculated.errors.map((issue) => issue.message) : [];
  const selectedRevision = history.find((revision) => revision.revisionId === selectedRevisionId) ?? null;
  const transferCandidates = useMemo(() => selectedRevision ? buildFlashingTakeoffCandidates(selectedRevision.input, selectedRevision.output) : [], [selectedRevision]);
  const selectedMappings = useMemo(() => transferCandidates.flatMap((candidate) => variantMappings[candidate.id] ? [{ candidateId: candidate.id, variantId: variantMappings[candidate.id]! }] : []), [transferCandidates, variantMappings]);
  const mappingChecks = useMemo(() => checkFlashingMappings(transferCandidates, selectedMappings, catalogVariants), [transferCandidates, selectedMappings, catalogVariants]);
  const selectedGroups = selectedMappings.flatMap((mapping) => { const candidate = transferCandidates.find((item) => item.id === mapping.candidateId); return candidate ? [candidate.groupId] : []; });
  const hasDuplicateGroup = new Set(selectedGroups).size !== selectedGroups.length;
  const drawing = selectFlashingDrawingPreview(dirty, selectedRevision, parsed.success ? parsed.data : null, calculated?.ok ? calculated.output : null);
  useEffect(() => { onWorkspaceState?.({ dirty, pending: isPending }); }, [dirty, isPending, onWorkspaceState]);
  const transferReady = Boolean(saved && selectedRevision && selectedRevision.revisionId === saved.revisionId && !selectedRevision.stale && !dirty && selectedMappings.length > 0 && !hasDuplicateGroup && mappingChecks.filter((check) => selectedMappings.some((item) => item.candidateId === check.candidate.id)).every((check) => check.status === "compatible"));

  const update = (change: (current: Draft) => Draft) => setDraft((current) => change(current));
  const updateRun = (id: string, change: (run: RunDraft) => RunDraft) => update((current) => ({ ...current, runs: current.runs.map((run) => run.id === id ? change(run) : run) }));
  const addManualRun = () => update((current) => ({ ...current, runs: [...current.runs, { id: generateSecureUuid(), category: "wall", name: "Új kézi szakasz", lengthMm: "", lengthSource: "site_measurement", roofEdgeReference: null, startExtensionMm: "0", endExtensionMm: "0", reserveMm: "0" }] }));
  const addSuggestion = (suggestion: FlashingGeometrySuggestion) => {
    update((current) => current.runs.some((run) => run.roofEdgeReference?.roofModelId === suggestion.reference.roofModelId && run.roofEdgeReference.edgeId === suggestion.reference.edgeId)
      ? current
      : { ...current, runs: [...current.runs, { id: generateSecureUuid(), category: suggestion.category, name: suggestion.label.split(" · ").slice(1).join(" · "), lengthMm: String(suggestion.lengthMm), lengthSource: "geometry", roofEdgeReference: suggestion.reference, startExtensionMm: "0", endExtensionMm: "0", reserveMm: "0" }] });
  };
  const canRefreshRoofEdges = Boolean(saved?.stale && saved.input.runs.some((run) => run.roofEdgeReference && suggestions.some((suggestion) => suggestion.reference.roofModelId === run.roofEdgeReference?.roofModelId && suggestion.reference.edgeId === run.roofEdgeReference?.edgeId)));
  const refreshRoofEdges = () => update((current) => ({ ...current, runs: current.runs.map((run) => {
    const reference = run.roofEdgeReference;
    if (!reference) return run;
    const suggestion = suggestions.find((item) => item.reference.roofModelId === reference.roofModelId && item.reference.edgeId === reference.edgeId);
    if (!suggestion) return run;
    const lengthMm = reference.lengthOverridden ? numeric(run.lengthMm) : suggestion.lengthMm;
    return { ...run, category: suggestion.category, lengthMm: String(lengthMm), lengthSource: "geometry", roofEdgeReference: { ...suggestion.reference, lengthOverridden: lengthMm !== suggestion.lengthMm } };
  }) }));

  const save = () => {
    if (!parsed.success || !calculated?.ok || !dirty) return;
    if (!projectId) {
      if (isPending) return;
      const data = new FormData(); data.set("organizationId", organizationId); data.set("calculationId", saved?.calculationId ?? standaloneId.current);
      data.set("calculatorType", flashingMaterialCalculator.id); data.set("name", draft.name.trim() || "Bádogos szegély számítás");
      data.set("input", JSON.stringify(parsed.data)); data.set("expectedRevisionNumber", String(expectedRevision)); setFeedback("");
      startTransition(async () => { let response; try { response = await saveStandaloneCalculationAction(data); } catch { setFeedback("A kapcsolat megszakadt. Ellenőrizd a hálózatot, majd próbáld újra."); return; } if (!response.ok) { setFeedback(response.error); return; }
        setExpectedRevision(response.revisionNumber); setBaseline(currentJson); setBaselineName(draft.name); setFeedback(`Mentve · V${response.revisionNumber}`); if (onSaved) { await onSaved(response); return; } router.replace(`/kalkulatorok/szegelyek?organization=${organizationId}&calculation=${response.calculationId}`); router.refresh(); }); return;
    }
    const data = new FormData();
    data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("name", draft.name);
    data.set("input", JSON.stringify(parsed.data)); data.set("expectedRevisionNumber", String(expectedRevision)); data.set("operationId", flashingOperationId);
    setFeedback("");
    startTransition(async () => {
      let result; try { result = await saveFlashingCalculationAction(data); } catch { setFeedback("A kapcsolat megszakadt. Ellenőrizd a hálózatot, majd próbáld újra."); return; }
      if (!result.ok || !result.revisionNumber) { setFeedback(result.error ?? "A mentés nem sikerült."); return; }
      setFlashingOperationId(generateSecureUuid()); setExpectedRevision(result.revisionNumber); setBaseline(currentJson); setBaselineName(draft.name); setFeedback(`Mentve · V${result.revisionNumber}`); if (onSaved && result.calculationId && result.revisionId) await onSaved({ calculationId: result.calculationId, revisionId: result.revisionId, revisionNumber: result.revisionNumber }); else router.refresh();
    });
  };

  const transfer = () => {
    if (!projectId || !transferReady || !saved || !selectedRevision) return;
    const data = new FormData();
    data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("calculationId", saved.calculationId);
    data.set("revisionId", selectedRevision.revisionId); data.set("requestKey", requestKey.current()); data.set("name", `${draft.name} · anyagkimutatás`.slice(0, 200));
    data.set("mappings", JSON.stringify(selectedMappings));
    setFeedback("");
    startTransition(async () => {
      const result = await createFlashingTakeoffDraftAction(data);
      if (!result.ok || !result.takeoffId) { setFeedback(result.error ?? "Az anyagkimutatás-piszkozat létrehozása nem sikerült."); return; }
      requestKey.renew();
      router.push(`/projektek/${projectId}/anyagkimutatas?organization=${organizationId}&takeoff=${result.takeoffId}#takeoff-${result.takeoffId}`);
    });
  };

  return <div className="materials-workspace flashing-workspace">
    <section className="projects-toolbar material-detail-header"><div><p className="section-eyebrow">Előzetes anyagbecslés</p><h1>Bádogos szegélyek kalkulátora</h1><p>Több, egymástól független szakasz előzetes anyaghossz- és darabszámbecslése.</p></div><div className="flashing-save-state" aria-live="polite"><span className="status-pill">{dirty ? `Nem mentett módosítás · következő változat: V${expectedRevision + 1}` : selectedRevision && saved && selectedRevision.revisionId !== saved.revisionId ? `Történeti változat · V${selectedRevision.revisionNumber}` : expectedRevision ? `Mentett aktuális változat · V${expectedRevision}` : "Új, még nem mentett számítás"}</span></div></section>
    {handoffSource && <div className={`survey-handoff-banner ${handoffModified ? "is-modified" : ""}`} role="status"><strong>{handoffModified ? "A kalkuláció módosított adatokat tartalmaz" : "Adatok átvéve a felmérésből"}</strong><small>Felmérés: {handoffSource.surveyId} · V{handoffSource.version} · revízió: {handoffSource.revisionId}. A forrás változatlan marad.</small></div>}
    {saved?.stale && <div className="survey-handoff-banner is-modified" role="status"><strong>Elavult tetőgeometriai forrás</strong><p>A mentett szegélyszámítás változatlan. Az aktuális élhossz külön, új revízió mentésével kerülhet bele.</p>{canRefreshRoofEdges ? <button type="button" className="secondary-button" onClick={refreshRoofEdges}>Kijelölt szegélyélek frissítése</button> : <p>Az érintett élek nem feleltethetők meg az aktuális tetőmodellnek; ellenőrizd a szakaszokat.</p>}</div>}
    {!projectId && saved && selectedRevision?.revisionId === saved.revisionId && <StandaloneProjectAssociation organizationId={organizationId} sourceCalculationId={saved.calculationId} sourceRevisionId={saved.revisionId} sourceRevisionNumber={saved.revisionNumber} sourceName={saved.displayName} calculatorType={flashingMaterialCalculator.id} hasUnsavedChanges={dirty} />}

    {(!onSaved || Boolean(projectId) || suggestions.length > 0) && <section className="detail-surface flashing-section" aria-labelledby="geometry-title"><div className="section-heading"><div><p className="section-eyebrow">OPCIONÁLIS FORRÁSGEOMETRIA</p><h2 id="geometry-title">Tetőélek javaslatai</h2></div></div><p className="detail-description">{projectId ? "A javaslat csak gombnyomásra kerül be. Csak ellenőrzött, aktuális projekt-tetőélek érhetők el. Az orom-, gerinc-, konty- és vápaszélek külön kategóriák; falcsatlakozást nem következtetünk ki." : "Önálló módban nincs projekt tetőgeometria, ezért a javaslatok nem érhetők el. A szakaszok kézzel felvehetők."}</p>{suggestions.length ? <div className="flashing-suggestions">{suggestions.map((suggestion) => { const added = draft.runs.some((run) => run.roofEdgeReference?.roofModelId === suggestion.reference.roofModelId && run.roofEdgeReference.edgeId === suggestion.reference.edgeId); return <article className="flashing-suggestion" key={suggestion.id}><div><strong>{suggestion.label}</strong><small>{suggestion.lengthMm.toLocaleString("hu-HU")} mm · {categoryLabels[suggestion.category]}</small></div><button className="secondary-button" type="button" onClick={() => addSuggestion(suggestion)} disabled={added}>{added ? "Hozzáadva" : "Él hozzáadása"}</button></article>; })}</div> : projectId && <p className="missing-data">Nincs elérhető, ellenőrzött projekt-tetőgeometria.</p>}</section>}

    <section className="detail-surface flashing-section" aria-labelledby="parameters-title"><div className="section-heading"><div><p className="section-eyebrow">KÖZÖS SZÁLPARAMÉTEREK</p><h2 id="parameters-title">Anyagparaméterek</h2></div></div><div className="material-form-grid"><label className="material-field">Kalkuláció neve<input value={draft.name} maxLength={200} onChange={(event) => update((current) => ({ ...current, name: event.target.value }))} /></label><label className="material-field">Kereskedelmi szálhossz <small>mm</small><input inputMode="numeric" value={draft.nominalLengthMm} onChange={(event) => update((current) => ({ ...current, nominalLengthMm: event.target.value }))} aria-invalid={validationMessages.some((message) => message.includes("nominalLengthMm"))} /></label><label className="material-field material-field-wide">A szálhossz adatforrása<input value={draft.nominalLengthLabel} maxLength={200} onChange={(event) => update((current) => ({ ...current, nominalLengthLabel: event.target.value }))} /><small>Írd be a kiválasztott termék vagy saját mérés forrását. A rendszer nem használ gyártói alapértéket.</small></label><label className="material-field material-field-wide">Toldás / hasznos fedés<select value={draft.connectionMode} onChange={(event) => update((current) => ({ ...current, connectionMode: event.target.value as Draft["connectionMode"] }))}><option value="unknown">Ismeretlen — darabszám nem számítható</option><option value="explicit_overlap">Toldásonkénti átfedést adok meg</option><option value="effective_length_supplied">Minden további szál hasznos fedési hosszát adom meg</option><option value="no_overlap_confirmed">Átfedés nélküli kapcsolatot adok meg</option></select><small>Átfedés nélküli kapcsolatot csak akkor adj meg, ha a választott termék szerelési adatai ezt alátámasztják.</small></label>{draft.connectionMode === "explicit_overlap" && <label className="material-field">Átfedés <small>mm</small><input inputMode="numeric" value={draft.overlapMm} onChange={(event) => update((current) => ({ ...current, overlapMm: event.target.value }))} /></label>}{draft.connectionMode === "effective_length_supplied" && <label className="material-field">További szálanként hasznos fedés <small>mm</small><input inputMode="numeric" value={draft.effectiveLengthMm} onChange={(event) => update((current) => ({ ...current, effectiveLengthMm: event.target.value }))} /></label>}</div></section>

    <section className="detail-surface flashing-section" aria-labelledby="runs-title"><div className="section-heading flashing-run-heading"><div><p className="section-eyebrow">FÜGGETLEN SZEGÉLYSZAKASZOK</p><h2 id="runs-title">Szakaszok</h2></div><button className="secondary-button" type="button" onClick={addManualRun}>+ Kézi szakasz</button></div><div className="flashing-run-list">{draft.runs.map((run, index) => <article className="flashing-run" key={run.id}><div className="flashing-run-title"><h3>{index + 1}. szakasz</h3>{run.roofEdgeReference && <span className="provenance-badge">Tetőgeometriából átvett</span>}<button className="text-button" type="button" disabled={draft.runs.length === 1} onClick={() => update((current) => ({ ...current, runs: current.runs.filter((item) => item.id !== run.id) }))}>Eltávolítás</button></div><div className="material-form-grid"><label className="material-field">Szegélykategória<select value={run.category} onChange={(event) => updateRun(run.id, (item) => ({ ...item, category: event.target.value as FlashingCategory }))}>{flashingCategories.map((category) => <option key={category} value={category} disabled={Boolean(run.roofEdgeReference) && category !== run.category}>{categoryLabels[category]}</option>)}</select></label><label className="material-field">Szakasz neve<input maxLength={160} value={run.name} onChange={(event) => updateRun(run.id, (item) => ({ ...item, name: event.target.value }))} /></label><label className="material-field">Lefedendő hossz <small>mm</small><input inputMode="numeric" value={run.lengthMm} onChange={(event) => updateRun(run.id, (item) => ({ ...item, lengthMm: event.target.value, lengthSource: item.roofEdgeReference ? "geometry" : item.lengthSource, roofEdgeReference: item.roofEdgeReference ? { ...item.roofEdgeReference, lengthOverridden: numeric(event.target.value) !== Math.ceil(item.roofEdgeReference.suggestedLengthMm) } : null }))} /></label><label className="material-field">Mérési forrás<select value={run.lengthSource} onChange={(event) => updateRun(run.id, (item) => ({ ...item, lengthSource: event.target.value as RunDraft["lengthSource"] }))} disabled={Boolean(run.roofEdgeReference)}><option value="geometry">Tetőgeometria</option><option value="site_measurement">Helyszíni mérés</option><option value="drawing">Tervrajz</option><option value="user_provided">Kézi adat</option><option value="demo">DEMO tesztadat</option></select>{run.roofEdgeReference?.lengthOverridden && <small>Kézi felülírás · eredeti geometria: {run.roofEdgeReference.suggestedLengthMm.toLocaleString("hu-HU")} mm</small>}</label><label className="material-field">Kezdő végkiterjesztés <small>mm</small><input inputMode="numeric" value={run.startExtensionMm} onChange={(event) => updateRun(run.id, (item) => ({ ...item, startExtensionMm: event.target.value }))} /></label><label className="material-field">Záró végkiterjesztés <small>mm</small><input inputMode="numeric" value={run.endExtensionMm} onChange={(event) => updateRun(run.id, (item) => ({ ...item, endExtensionMm: event.target.value }))} /></label><label className="material-field">Felhasználó által megadott tartalék <small>mm</small><input inputMode="numeric" value={run.reserveMm} onChange={(event) => updateRun(run.id, (item) => ({ ...item, reserveMm: event.target.value }))} /></label></div></article>)}</div></section>

    {(validationMessages.length > 0 || domainErrors.length > 0) && <section className="flashing-errors" role="alert"><strong>Ellenőrizendő adatok</strong>{[...validationMessages, ...domainErrors].map((message, index) => <p key={`${index}-${message}`}>{message}</p>)}</section>}
    <section className="detail-surface flashing-section" aria-labelledby="results-title"><div className="section-heading"><div><p className="section-eyebrow">ELŐZETES BECSLÉS</p><h2 id="results-title">Eredmény és figyelmeztetések</h2></div></div>{calculated?.ok ? <><div className="flashing-results">{calculated.output.runs.map((result) => <article className="flashing-result" key={result.id}><div className="flashing-result-heading"><strong>{result.name}</strong><span className="status-pill">{result.status === "incomplete" ? "HIÁNYOS" : result.lengthSource === "user_provided" ? "FELHASZNÁLÓI ADAT" : "ELŐZETES"}</span></div><p>{categoryLabels[result.category]} · szükséges fedés: {result.requiredCoverageLengthMm.toLocaleString("hu-HU")} mm · tartalékkal: {result.planningTargetLengthMm.toLocaleString("hu-HU")} mm</p>{result.estimatedSectionCount === null ? <strong className="flashing-count-missing">Darabszám nem számítható.</strong> : <strong>Becsült szál: {result.estimatedSectionCount} db · toldás: {result.jointCount} db · névleges készlethossz: {result.totalNominalStockLengthMm?.toLocaleString("hu-HU")} mm</strong>}{result.estimatedSectionCount === null && <small>Hiányzó adat: válassz igazolt átfedés nélküli kapcsolatot, vagy adj meg toldásonkénti átfedést / minden további szál hasznos fedési hosszát. Gyártói alapértéket a kalkulátor nem állít be.</small>}{result.warnings.map((warning) => <small key={warning}>{warning}</small>)}</article>)}</div><p className="detail-description">A darabszám matematikai becslés, nem végleges beszerzési mennyiség, vágásterv vagy szerelési jóváhagyás.</p></> : <p className="missing-data">Adj meg érvényes hosszakat és szálparamétereket az eredményhez. A hibás mezők értéke megmarad a javításhoz.</p>}</section>

    <section className="detail-surface flashing-section" aria-labelledby="drawing-title"><div className="section-heading"><div><p className="section-eyebrow">MÉRETEZETT SÉMA</p><h2 id="drawing-title">Műszaki áttekintés</h2></div></div>{drawing.input && drawing.output ? <FlashingTechnicalDrawing input={drawing.input} output={drawing.output} sourceRevisionId={drawing.sourceRevisionId} /> : <p className="missing-data">Érvényes számított adat szükséges a műszaki áttekintéshez. A hibás szerkesztéshez a korábbi mentett rajz nem jelenik meg.</p>}</section>

    {projectId && <><section className="detail-surface flashing-section" aria-labelledby="mapping-title"><div className="section-heading"><div><p className="section-eyebrow">KATALÓGUSHOZZÁRENDELÉS</p><h2 id="mapping-title">Anyagok hozzárendelése</h2></div></div><p className="detail-description">A darabbecslés és a tartalékot tartalmazó tervezési folyóméter alternatíva: szakaszonként legfeljebb az egyiket válaszd. A kiválasztás csak kategóriát és egységet ellenőriz, gyártói profil- vagy szerelési kompatibilitást nem igazol.</p>{!selectedRevision ? <p className="missing-data">Anyagkimutatás előkészítéséhez ments előbb egy rendszer által ellenőrzött számítási változatot.</p> : selectedRevision.stale ? <p className="flashing-count-missing">A kiválasztott számítás forrásgeometriája megváltozott; új átadás nem indítható.</p> : !transferCandidates.length ? <p className="missing-data">A mentett revízióban nincs átadható anyagtétel.</p> : <div className="flashing-mapping-list">{transferCandidates.map((candidate) => { const check = mappingChecks.find((item) => item.candidate.id === candidate.id)!; const variant = catalogVariants.find((item) => item.id === variantMappings[candidate.id]); return <article className="flashing-mapping-row" key={candidate.id}><div><strong>{candidate.label}</strong><small>{candidate.quantity.toLocaleString("hu-HU", { maximumFractionDigits: 3 })} {candidate.unit === "piece" ? "db" : "fm"} · {candidate.measurementSource}</small><small>{candidate.warning}</small></div><label className="material-field">Katalógusváltozat<select value={variantMappings[candidate.id] ?? ""} onChange={(event) => { setVariantMappings((current) => ({ ...current, [candidate.id]: event.target.value })); requestKey.renew(); }}><option value="">Nincs hozzárendelve</option>{catalogVariants.map((item) => <option key={item.id} value={item.id}>{item.productName} · {item.variantName} · {materialPurchasingUnitLabels[item.purchasingUnit]}{item.sku ? ` · ${item.sku}` : ""}</option>)}</select></label><div><small className={check.status === "incompatible" ? "flashing-count-missing" : ""}>{check.message}</small>{variant && <small>{variant.manufacturerName ?? "Gyártó nincs megadva"} · {variant.productCode ?? "termékkód nincs megadva"} · {materialProvenanceLabels[variant.provenance]}{variant.sourceName ? ` · forrás: ${variant.sourceName}` : ""}</small>}{variant && <small>Paraméterek: {Object.keys(variant.technicalSpecs).length ? Object.entries(variant.technicalSpecs).map(([key, value]) => `${key}: ${value}`).join(" · ") : "nincs rögzítve"}{variant.lengthMm ? ` · hossz ${variant.lengthMm} mm` : ""}{variant.thicknessMm ? ` · vastagság ${variant.thicknessMm} mm` : ""}</small>}{variant && <small>{variant.latestPrice ? `Legutóbbi ár: ${variant.latestPrice.amount.toLocaleString("hu-HU")} ${variant.latestPrice.currency}/${materialPurchasingUnitLabels[variant.latestPrice.purchasingUnit]} · ${variant.latestPrice.sourceName ?? materialProvenanceLabels[variant.latestPrice.provenance]} · ${variant.latestPrice.effectiveDate}` : "Nincs rögzített árverzió."}</small>}</div></article>; })}</div>}
      <div className="flashing-transfer-preview"><h3>Anyagkimutatás előkészítése</h3><p>{selectedRevision ? `Forrás: mentett V${selectedRevision.revisionNumber} változat` : "Nincs kiválasztott mentett revízió."} · {selectedMappings.length} kiválasztott hozzárendelés · az új piszkozat automatikusan megnyílik; jóváhagyott kimutatás nem módosul. A mennyiségek előzetesek, nem beszerzési jóváhagyások.</p>{hasDuplicateGroup && <small className="flashing-count-missing">Egy szakaszhoz csak egy mennyiségi mód választható.</small>}{dirty && <small className="flashing-count-missing">A nem mentett módosításokat előbb mentsd új változatként.</small>}{selectedRevision && saved && selectedRevision.revisionId !== saved.revisionId && <small className="flashing-count-missing">Történeti változatból nem lehet átadni; válaszd az aktuálisat.</small>}{selectedRevision?.stale && <small className="flashing-count-missing">A forrásgeometria elavult; ebből a változatból nem lehet átadni.</small>}{selectedMappings.length === 0 && <small>Válassz kompatibilis katalógusváltozatot az átadáshoz.</small>}{selectedMappings.length > 0 && <ul>{selectedMappings.map((mapping) => { const candidate = transferCandidates.find((item) => item.id === mapping.candidateId)!; const variant = catalogVariants.find((item) => item.id === mapping.variantId); return <li key={mapping.candidateId}>{candidate.label}: {candidate.quantity.toLocaleString("hu-HU", { maximumFractionDigits: 3 })} {candidate.unit === "piece" ? "db" : "fm"} · előzetes → {variant?.productName} / {variant?.variantName} · {mappingChecks.find((check) => check.candidate.id === candidate.id)?.status === "compatible" ? "kompatibilis egység és kategória" : "nem kompatibilis hozzárendelés"} · {variant?.latestPrice ? "ár rögzítve" : "ár nincs rögzítve"}</li>; })}</ul>}<button className="primary-button" type="button" disabled={isPending || !transferReady} onClick={transfer}>{isPending ? "Piszkozat létrehozása…" : "Átadás megerősítése · új piszkozat"}</button></div>
    </section>

    </>}
    {saved && <section className="detail-surface flashing-section" aria-labelledby="history-title"><div className="section-heading"><div><p className="section-eyebrow">Mentett előzmények</p><h2 id="history-title">Mentett revíziók</h2></div></div>{history.map((revision) => <button type="button" className={selectedRevisionId === revision.revisionId ? "primary-button" : "secondary-button"} key={revision.revisionId} onClick={() => { if (dirty && !window.confirm("A nem mentett módosítások elvesznek. Betöltöd ezt a változatot?")) return; setSelectedRevisionId(revision.revisionId); setDraft(draftFromInput(revision.input, revision.displayName)); setBaseline(JSON.stringify(revision.input)); setBaselineName(revision.displayName); setFeedback(`V${revision.revisionNumber} betöltve.`); }}>{`V${revision.revisionNumber}${revision.revisionId === saved.revisionId ? " · aktuális" : " · történeti"} · ${new Date(revision.createdAt).toLocaleString("hu-HU")}`}</button>)}</section>}
    <div className="form-actions"><button className="primary-button" type="button" disabled={isPending || !dirty || !parsed.success || !calculated?.ok} onClick={save}>{isPending ? "Mentés folyamatban…" : projectId ? `Mentés új revízióként · V${expectedRevision + 1}` : saved ? `Új változat mentése · V${expectedRevision + 1}` : "Számítás mentése"}</button>{!projectId && !onSaved && <a className="secondary-button" href={`/kalkulatorok/mentett?organization=${organizationId}`}>Mentett számításaim</a>}{feedback && <p role="status" className={`form-message ${feedback.startsWith("Mentve") ? "is-success" : "is-error"}`}>{feedback}</p>}</div>
  </div>;
}
