"use client";

import type { SavedSurveyCalculation } from "@/domain/field-surveys/workspace";


import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput } from "@/domain/calculations/gable-roof";
import { TechnicalDrawing } from "./technical-drawing";
import { isMeasurementGuidanceFocusTarget, MeasurementGuidance, measurementGuideFor } from "./measurement-guidance";
import { RoofWorkspace } from "./roof-workspace";
import { GableTrapezoidalCoveringPanel } from "./gable-trapezoidal-covering-panel";
import type { SavedGableCovering } from "./gable-trapezoidal-covering-data";
import type { RoofPrefill, SurveyHandoffSource } from "@/domain/field-surveys/calculator-handoff";
import { useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { formatQuantity } from "@/lib/quantity-format";

type Draft = Record<string, string> & { inputMode: "height" | "angle" };
const emptyDraft: Draft = {
  inputMode: "height", buildingLengthMm: "", buildingWidthMm: "", roofRiseMm: "", roofPitchDegrees: "",
  eaveOverhangMm: "", frontGableOverhangMm: "", rearGableOverhangMm: "",
};
const parse = (value: string) => value.trim() ? Number(value.trim().replace(",", ".")) : undefined;
const format = (value: number, unit: string) => formatQuantity(value, unit);
function draftFromInput(input: GableRoofInput): Draft { return { inputMode: input.inputMode, buildingLengthMm: String(input.buildingLengthMm), buildingWidthMm: String(input.buildingWidthMm), roofRiseMm: input.inputMode === "height" ? String(input.roofRiseMm) : "", roofPitchDegrees: input.inputMode === "angle" ? String(input.roofPitchDegrees) : "", eaveOverhangMm: String(input.eaveOverhangMm), frontGableOverhangMm: String(input.frontGableOverhangMm), rearGableOverhangMm: String(input.rearGableOverhangMm) }; }
function draftFromPrefill(input: RoofPrefill): Draft { return { ...input }; }

function toInput(draft: Draft): GableRoofInput | null {
  const parsed = gableRoofInputSchema.safeParse({
    inputMode: draft.inputMode,
    buildingLengthMm: parse(draft.buildingLengthMm), buildingWidthMm: parse(draft.buildingWidthMm),
    eaveOverhangMm: parse(draft.eaveOverhangMm), frontGableOverhangMm: parse(draft.frontGableOverhangMm), rearGableOverhangMm: parse(draft.rearGableOverhangMm),
    roofRiseMm: draft.inputMode === "height" ? parse(draft.roofRiseMm) : undefined,
    roofPitchDegrees: draft.inputMode === "angle" ? parse(draft.roofPitchDegrees) : undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function StandaloneGablePreview({ organizationId, saved = null, initialHandoff, handoffSource, missingHandoffFields = [], onSaved, onWorkspaceState, embedded = false, showBackNavigation = !embedded, onChangeRoofType }: Readonly<{ organizationId: string; saved?: SavedGableCovering | null; initialHandoff?: RoofPrefill; handoffSource?: SurveyHandoffSource; missingHandoffFields?: readonly string[]; onSaved?: (saved: SavedSurveyCalculation) => Promise<void>; onWorkspaceState?: (state: { dirty: boolean; pending: boolean }) => void; embedded?: boolean; showBackNavigation?: boolean; onChangeRoofType?: () => void }>) {
  const current = saved?.revisions.find((revision) => revision.revisionId === saved.currentRevisionId);
  const source = (current?.input as { source?: { geometryInput?: GableRoofInput } } | undefined)?.source?.geometryInput;
  const [draft, setDraft] = useState(() => source ? draftFromInput(source) : initialHandoff ? draftFromPrefill(initialHandoff) : emptyDraft);
  const handoffBaseline = useRef(initialHandoff ? JSON.stringify(draftFromPrefill(initialHandoff)) : "");
  const handoffModified = Boolean(handoffSource && JSON.stringify(draft) !== handoffBaseline.current);
  const [savedGeometry, setSavedGeometry] = useState<GableRoofInput | null>(source ?? null);
  const [historical, setHistorical] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [geometryEditing, setGeometryEditing] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [coveringDirty, setCoveringDirty] = useState(false);
  const geometryDirty = !historical && (handoffSource ? handoffModified : JSON.stringify(draft) !== JSON.stringify(savedGeometry ? draftFromInput(savedGeometry) : emptyDraft));
  useUnsavedChangeGuard({ dirty: !embedded && (geometryDirty || coveringDirty), pending: savePending });
  useEffect(() => { onWorkspaceState?.({ dirty: geometryDirty || coveringDirty, pending: savePending }); }, [geometryDirty, coveringDirty, savePending, onWorkspaceState]);
  const input = useMemo(() => toInput(draft), [draft]);
  const result = useMemo(() => input ? calculateGableRoof(input) : null, [input]);
  const reuseSurveyGeometry = Boolean(embedded && handoffSource && initialHandoff && input && missingHandoffFields.length === 0);
  const lastValid = useRef<{ input: GableRoofInput; result: NonNullable<typeof result> } | null>(null);
  if (input && result) lastValid.current = { input, result };
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const handleMeasurementBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!isMeasurementGuidanceFocusTarget(event.relatedTarget)) setFocusedField(null);
  };
  const fields: { key: keyof Draft; label: string; unit: string }[] = [
    { key: "buildingLengthMm", label: "Épület hossza", unit: "mm" },
    { key: "buildingWidthMm", label: "Épület szélessége", unit: "mm" },
    ...(draft.inputMode === "height" ? [{ key: "roofRiseMm" as const, label: "Tetőemelkedés", unit: "mm" }] : [{ key: "roofPitchDegrees" as const, label: "Tetőhajlás", unit: "°" }]),
    { key: "eaveOverhangMm", label: "Eresztúlnyúlás", unit: "mm" },
    { key: "frontGableOverhangMm", label: "Első oromtúlnyúlás", unit: "mm" },
    { key: "rearGableOverhangMm", label: "Hátsó oromtúlnyúlás", unit: "mm" },
  ];
  const geometryForm = <form className="roof-form roof-measurement-inputs roof-form-grid-compact" onSubmit={(event) => event.preventDefault()}>
    <label className="roof-field"><span>Bemenet módja</span><select value={draft.inputMode} disabled={historical || savePending} onChange={(event) => { const inputMode = event.target.value as Draft["inputMode"]; setDraft((current) => ({ ...current, inputMode, roofRiseMm: "", roofPitchDegrees: "" })); }}><option value="height">Tetőemelkedés</option><option value="angle">Tetőhajlás</option></select></label>
    {fields.map((field) => <label className="roof-field" key={field.key}><span>{field.label} <small>{field.unit}</small></span><input id={String(field.key)} inputMode="decimal" value={draft[field.key]} disabled={historical || savePending} onFocus={() => setFocusedField(field.key)} onBlur={handleMeasurementBlur} onChange={(event) => set(field.key, event.target.value)} aria-label={`${field.label} (${field.unit})`} /></label>)}
  </form>;
  const measurements = reuseSurveyGeometry ? <div className="survey-imported-geometry">
    <GlassDisclosure summary="Átvett tetőméretek"><dl className="survey-geometry-summary">{fields.map((field) => <Fragment key={field.key}><dt>{field.label}</dt><dd>{parse(draft[field.key]) === undefined ? "—" : format(parse(draft[field.key])!, field.unit)}</dd></Fragment>)}</dl></GlassDisclosure>
    <button type="button" className="secondary-button" aria-expanded={geometryEditing} onClick={() => setGeometryEditing((editing) => !editing)}>{geometryEditing ? "Méretek szerkesztésének bezárása" : "Tetőméretek szerkesztése"}</button>
    {geometryEditing && geometryForm}
  </div> : geometryForm;
  return (
    <>
      {showBackNavigation && <Link className="back-navigation glass-navigation" href={`/kalkulatorok?organization=${organizationId}`}><span aria-hidden="true">←</span><span>Vissza a kalkulátorokhoz</span></Link>}
      <section className="standalone-roof-page" aria-label={embedded ? "Tetőgeometria és fedés számítása" : undefined} aria-labelledby={embedded ? undefined : "standalone-gable-title"}>
        {!embedded && <GlassPageHeader titleId="standalone-gable-title" title="Nyeregtető" context="Önálló tetőgeometria" actions={onChangeRoofType && <button className="secondary-button" type="button" onClick={onChangeRoofType}>← Tetőtípus kiválasztása</button>} />}
        {!embedded && <p className="roof-disclaimer">A meglévő roof.gable motor számítja az eredményeket. A fedési eredmény külön menthető; anyagkimutatás és statikai méretezés nem készül.</p>}
        {embedded && <GlassDisclosure summary="A számítás határai"><p>A tetőgeometria a felmért méretekből számít. A trapézlemez-fedés külön, megadott termékadatokkal menthető. Ez a számítás nem készít automatikusan anyaglistát, és nem statikai méretezés.</p></GlassDisclosure>}
        {handoffSource && <div className={`survey-handoff-banner ${handoffModified ? "is-modified" : ""}`} role="status"><strong>{handoffModified ? "A méretek módosultak" : `Méretek átvéve a felmérésből · V${handoffSource.version}`}</strong>{handoffModified && <small>A számítás az itt látható módosított adatokat használja; a felmérés forrása változatlan.</small>}{missingHandoffFields.length > 0 && <span>Még szükséges: {missingHandoffFields.join(", ")}.</span>}<GlassDisclosure summary="Forrás adatai"><small>Felmérés: {handoffSource.surveyId} · felmérésrevízió: {handoffSource.revisionId} · V{handoffSource.version}</small></GlassDisclosure></div>}
        <RoofWorkspace
          className="roof-workspace-standalone"
          context={<div className="roof-workspace-context"><div className="roof-guidance-slot"><MeasurementGuidance compact guide={measurementGuideFor("gable", focusedField ?? "")} /></div></div>}
          measurements={
            measurements
          }
          drawing={result && <TechnicalDrawing output={result} compact activeDimension={focusedField} activeDimensionDescription={measurementGuideFor("gable", focusedField ?? "")?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} isSaved={false} />}
          results={result ? <section className="roof-results" aria-live="polite"><div className="roof-result-highlight"><span>Teljes tetőfelület</span><strong>{format(result.areas.combinedRoofM2, "m²")}</strong><small>Vízszintes vetület: {format(result.areas.horizontalProjectedM2, "m²")}</small></div><div className="roof-result-grid">
            <div className="roof-result-metric"><small>Egy tetősík felülete</small><strong>{format(result.areas.individualRoofPlaneM2, "m²")}</strong></div>
            <div className="roof-result-metric"><small>Tetőhajlásszög</small><strong>{format(result.angles.pitchDegrees, "°")}</strong></div>
            <div className="roof-result-metric"><small>Ferde hossz a falig</small><strong>{format(result.lengths.slopeLengthToWallMm / 1000, "m")}</strong></div>
            <div className="roof-result-metric"><small>Ferde hossz túlnyúlással</small><strong>{format(result.lengths.slopeLengthIncludingEaveMm / 1000, "m")}</strong></div>
            <div className="roof-result-metric"><small>Gerincvonal</small><strong>{format(result.lengths.ridgeLineMm / 1000, "m")}</strong></div>
            <div className="roof-result-metric"><small>Két ereszél összesen</small><strong>{format(result.lengths.totalEaveEdgesMm / 1000, "m")}</strong></div>
            <div className="roof-result-metric"><small>Ferde oromélek összesen</small><strong>{format(result.lengths.totalSlopingGableEdgesMm / 1000, "m")}</strong></div>
          </div></section> : <p className="missing-data">Add meg az összes méretet egész milliméterben, vagy válassz érvényes tetőhajlást a geometriai előnézethez.</p>}
        />
        {lastValid.current && <details className="roof-related-workflows" hidden={!result}><summary>Fedési számítás és mentés</summary><GableTrapezoidalCoveringPanel onSaved={onSaved} mode="standalone" organizationId={organizationId} saved={saved} geometryInput={result && input ? input : lastValid.current.input} onLoadGeometry={(value) => setDraft(draftFromInput(value))} onRevisionModeChange={setHistorical} onSavePendingChange={setSavePending} onSaveComplete={setSavedGeometry} onDirtyChange={setCoveringDirty} geometry={result ?? lastValid.current.result} sourceLabel="Kézi tetőméretek · projekt nélküli előnézet" /></details>}
        {embedded ? <GlassDisclosure summary="Eredmények értelmezése"><p>A ferde hossz geometriai érték, nem igazolt szarufavágási méret. A tetőfelület és hosszak önmagukban nem adnak megvásárolható fedőanyag-, léc-, fólia- vagy szerkezeti mennyiséget.</p></GlassDisclosure> : <p className="roof-disclaimer">A ferde hossz geometriai érték; nem igazolt szarufavágási méret. A felület és hosszak nem jelentenek fedőanyag-, léc-, fólia- vagy szerkezeti mennyiséget.</p>}
      </section>
    </>
  );
}
