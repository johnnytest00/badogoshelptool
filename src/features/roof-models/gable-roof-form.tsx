"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import { executeCalculator } from "@/domain/calculations/engine";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { metalSheetLayoutCalculator } from "@/domain/calculations/metal-sheet-layout";
import { resolveSheetLayoutMaterial } from "@/domain/calculations/sheet-layout-material";
import { saveGableRoofAction } from "./roof-model-actions";
import type { RoofModelRecord } from "./roof-model-data";
import { TechnicalDrawing } from "./technical-drawing";
import { GableTrapezoidalCoveringPanel } from "./gable-trapezoidal-covering-panel";
import { GableMetalTileCoveringPreview } from "./gable-metal-tile-covering-preview";
import type { SavedGableCovering } from "./gable-trapezoidal-covering-data";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import { initialMetalSheetLayoutValues, MetalSheetLayoutPanel, type MetalSheetLayoutFormValues } from "./metal-sheet-layout-panel";
import type { SavedSheetLayout, SavedSheetLayoutRevision, SheetLayoutMaterialOption } from "./sheet-layout-data";
import type { SavedMetalTileCovering } from "./gable-metal-tile-covering-data";
import { createSheetLayoutTakeoffAction, saveSheetLayoutAction } from "./sheet-layout-actions";
import { gableSegments, selectedGableLength } from "@/domain/calculations/gable-segments";
import { isMeasurementGuidanceFocusTarget, MeasurementGuidance, measurementGuideFor } from "./measurement-guidance";
import { RoofWorkspace } from "./roof-workspace";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { GlassPageHeader } from "@/components/ui/glass-page-header";

type FormValues = Record<string, string> & { inputMode: "height" | "angle" };
const defaults: FormValues = { inputMode: "height", buildingLengthMm: "", buildingWidthMm: "", roofRiseMm: "", roofPitchDegrees: "", eaveOverhangMm: "", frontGableOverhangMm: "", rearGableOverhangMm: "" };
const numberFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 });
const display = (value: number, unit: string) => `${numberFormat.format(value)} ${unit}`;

function initialValues(model?: RoofModelRecord | null): FormValues {
  const input = model?.currentInput;
  if (!input) return defaults;
  return {
    inputMode: input.inputMode,
    buildingLengthMm: String(input.buildingLengthMm), buildingWidthMm: String(input.buildingWidthMm),
    roofRiseMm: input.inputMode === "height" ? String(input.roofRiseMm) : "",
    roofPitchDegrees: input.inputMode === "angle" ? String(input.roofPitchDegrees) : "",
    eaveOverhangMm: String(input.eaveOverhangMm), frontGableOverhangMm: String(input.frontGableOverhangMm), rearGableOverhangMm: String(input.rearGableOverhangMm),
  };
}

function rawInput(values: FormValues) {
  const parse = (key: string) => { const value = values[key]?.trim(); if (!value) return undefined; const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) ? parsed : undefined; };
  return { inputMode: values.inputMode, buildingLengthMm: parse("buildingLengthMm"), buildingWidthMm: parse("buildingWidthMm"), eaveOverhangMm: parse("eaveOverhangMm"), frontGableOverhangMm: parse("frontGableOverhangMm"), rearGableOverhangMm: parse("rearGableOverhangMm"), roofRiseMm: values.inputMode === "height" ? parse("roofRiseMm") : undefined, roofPitchDegrees: values.inputMode === "angle" ? parse("roofPitchDegrees") : undefined };
}

function toInput(values: FormValues): GableRoofInput | null {
  const parsed = gableRoofInputSchema.safeParse(rawInput(values));
  return parsed.success ? parsed.data : null;
}

function NumericField({ name, label, value, unit, error, onChange, help, onFocus, onBlur }: Readonly<{ name: string; label: string; value: string; unit: string; error?: string; onChange: (value: string) => void; help?: string; onFocus?: () => void; onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void }>) {
  return <label className="roof-field"><span>{label} <small>{unit}</small></span><input id={name} name={name} inputMode="decimal" value={value} onFocus={onFocus} onBlur={onBlur} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={`measurement-help-${name}`} />{help && <em id={`measurement-help-${name}`}>{help}</em>}{error && <b className="roof-field-error">{error}</b>}</label>;
}

function ResultMetric({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="roof-result-metric"><small>{label}</small><strong>{value}</strong></div>; }

function Results({ output }: Readonly<{ output: GableRoofOutput }>) {
  return <section className="roof-results" aria-live="polite" aria-labelledby="roof-results-title"><div className="roof-section-heading"><div><p className="section-eyebrow">Eredmények</p><h2 id="roof-results-title">Geometriai összesítő</h2></div><span className="verified-badge"><Check className="size-4" /> A megadott adatokból számítva</span></div><div className="roof-result-highlight"><span>Teljes tetőfelület</span><strong>{display(output.areas.combinedRoofM2, "m²")}</strong><small>Vízszintes vetület: {display(output.areas.horizontalProjectedM2, "m²")}</small></div><div className="roof-result-grid"><ResultMetric label="Egy tetősík" value={display(output.areas.individualRoofPlaneM2, "m²")} /><ResultMetric label="Tetőhajlásszög" value={display(output.angles.pitchDegrees, "°")} /><ResultMetric label="Tetőemelkedés" value={display(output.heights.roofRiseMm / 1000, "m")} /><ResultMetric label="Ferde hossz túlnyúlással" value={display(output.lengths.slopeLengthIncludingEaveMm / 1000, "m")} /><ResultMetric label="Gerincvonal" value={display(output.lengths.ridgeLineMm / 1000, "m")} /><ResultMetric label="Két ereszél összesen" value={display(output.lengths.totalEaveEdgesMm / 1000, "m")} /><ResultMetric label="Teljes tetőhossz" value={display(output.dimensions.overallRoofLengthMm / 1000, "m")} /><ResultMetric label="Vízszintes tetőszélesség" value={display(output.dimensions.horizontalRoofWidthMm / 1000, "m")} /></div><p className="roof-disclaimer">Geometriai kalkuláció a megadott nyeregtető-feltételezésekkel. Nem helyettesíti a statikai méretezést vagy a gyártói alkalmazási előírásokat.</p></section>;
}

function valuesFromRevision(revision: SavedSheetLayoutRevision | undefined, materials: readonly SheetLayoutMaterialOption[]): MetalSheetLayoutFormValues {
  if (!revision) return initialMetalSheetLayoutValues;
  const material = materials.find((item) => item.variantId === revision.input.material.catalogSnapshot.variantId);
  const manual = (key: keyof typeof revision.input.material.effectiveValues) => revision.input.material.parameterSources[key] === "user_provided" ? String(revision.input.material.effectiveValues[key] ?? "") : "";
  return { productId: material?.productId ?? "", variantId: material?.variantId ?? revision.input.material.catalogSnapshot.variantId, effectiveCoveringWidthMm: manual("effectiveCoveringWidthMm"), nominalSheetWidthMm: manual("nominalSheetWidthMm"), minimumSheetLengthMm: manual("minimumSheetLengthMm"), maximumSheetLengthMm: manual("maximumSheetLengthMm"), endAllowanceMm: manual("endAllowanceMm"), alignment: revision.input.calculatorInput.alignment, takeoffAllowancePercent: "0" };
}

export function GableRoofCalculatorForm({ organizationId, projectId, projectName = "Projekt", model, sheetLayoutMaterials = [], savedSheetLayout = null, savedCoverings = [], coveringTakeoffOptions = [], savedMetalTileCoverings = [], onWorkspaceState }: Readonly<{ organizationId: string; projectId: string; projectName?: string; model?: RoofModelRecord | null; sheetLayoutMaterials?: readonly SheetLayoutMaterialOption[]; savedSheetLayout?: SavedSheetLayout | null; savedCoverings?: readonly SavedGableCovering[]; coveringTakeoffOptions?: readonly GableCoveringTakeoffOption[]; savedMetalTileCoverings?: readonly SavedMetalTileCovering[]; onWorkspaceState?: (state: { dirty: boolean; pending: boolean }) => void }>) {
  const [values, setValues] = useState<FormValues>(() => initialValues(model));
  const [name, setName] = useState(model?.name ?? "Új nyeregtető");
  const [baselineValues, setBaselineValues] = useState<FormValues>(() => initialValues(model));
  const [baselineName, setBaselineName] = useState(model?.name ?? "Új nyeregtető");
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const handleMeasurementBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    if (!isMeasurementGuidanceFocusTarget(event.relatedTarget)) setFocusedField(null);
  };
  const [isPending, startTransition] = useTransition();
  const [operationId, setOperationId] = useState(() => generateSecureUuid());
  const [newRoofModelId] = useState(() => generateSecureUuid());
  const [isSaving, setIsSaving] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(baselineValues) || name !== baselineName;
  const [coveringDirty, setCoveringDirty] = useState(false);
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const currentSavedRevision = savedSheetLayout?.revisions.find((revision) => revision.current);
  const [sheetLayoutValues, setSheetLayoutValues] = useState<MetalSheetLayoutFormValues>(() => valuesFromRevision(currentSavedRevision, sheetLayoutMaterials));
  const [viewedRevision, setViewedRevision] = useState<SavedSheetLayoutRevision | null>(currentSavedRevision ?? null);
  const [layoutMessage, setLayoutMessage] = useState("");
  const [layoutPending, startLayoutTransition] = useTransition();
  const router = useRouter();
  const { requestConfirmation, notify } = useAppInteraction();
  const input = useMemo(() => toInput(values), [values]);
  const inputValidation = useMemo(() => gableRoofInputSchema.safeParse(rawInput(values)), [values]);
  const inputError = (key: string) => fieldErrors[key] ?? (values[key]?.trim() ? (inputValidation.success ? undefined : inputValidation.error.issues.find((issue) => issue.path.includes(key))?.message) : undefined);
  const output = useMemo(() => input ? calculateGableRoof(input) : null, [input]);
  const selectedSegments = output ? gableSegments(output) : [];
  const selectedEaves = selectedSegmentIds.filter((id) => selectedSegments.some((segment) => segment.id === id && segment.kind === "eave"));
  const selectedFlashings = selectedSegmentIds.filter((id) => selectedSegments.some((segment) => segment.id === id && (segment.kind === "rake" || segment.kind === "ridge")));
  const sheetLayoutCalculation = useMemo(() => {
    const selected = sheetLayoutMaterials.find((item) => item.variantId === sheetLayoutValues.variantId);
    if (!output || !selected) return null;
    const parse = (value: string): number | null | undefined => { if (!value.trim()) return null; const parsed = Number(value.trim().replace(",", ".")); return Number.isFinite(parsed) ? parsed : undefined; };
    let material;
    try { material = resolveSheetLayoutMaterial(selected.catalog, { effectiveCoveringWidthMm: parse(sheetLayoutValues.effectiveCoveringWidthMm) ?? undefined, nominalSheetWidthMm: parse(sheetLayoutValues.nominalSheetWidthMm) ?? undefined, minimumSheetLengthMm: parse(sheetLayoutValues.minimumSheetLengthMm) ?? undefined, maximumSheetLengthMm: parse(sheetLayoutValues.maximumSheetLengthMm) ?? undefined, endAllowanceMm: parse(sheetLayoutValues.endAllowanceMm) ?? undefined }); } catch { return null; }
    const vertices = output.planes.flatMap((plane) => plane.vertices);
    return executeCalculator(metalSheetLayoutCalculator, {
      roof: { startXmm: Math.min(...vertices.map((vertex) => vertex.xMm)), endXmm: Math.max(...vertices.map((vertex) => vertex.xMm)), slopeLengthMm: output.lengths.slopeLengthIncludingEaveMm },
      effectiveCoveringWidthMm: material.values.effectiveCoveringWidthMm,
      nominalSheetWidthMm: material.values.nominalSheetWidthMm,
      alignment: sheetLayoutValues.alignment,
      minimumSheetLengthMm: material.values.minimumSheetLengthMm,
      maximumSheetLengthMm: material.values.maximumSheetLengthMm,
      endAllowanceMm: material.values.endAllowanceMm,
    });
  }, [output, sheetLayoutMaterials, sheetLayoutValues]);
  const sheetLayout = viewedRevision?.output ?? (sheetLayoutCalculation?.ok ? sheetLayoutCalculation.output : null);
  useEffect(() => { const latest = savedSheetLayout?.revisions.find((revision) => revision.current); if (latest) { setViewedRevision(latest); setSheetLayoutValues(valuesFromRevision(latest, sheetLayoutMaterials)); } }, [savedSheetLayout?.currentRevisionNumber, sheetLayoutMaterials, savedSheetLayout?.revisions]);
  const setValue = (key: string, value: string) => { setViewedRevision(null); setValues((current) => ({ ...current, [key]: value })); setMessage(""); };
  const switchMode = (mode: "height" | "angle") => { setValues((current) => ({ ...current, inputMode: mode, ...(mode === "height" ? { roofPitchDegrees: "" } : { roofRiseMm: "" }) })); };
  const buildSaveData = useCallback(() => {
    const form = formRef.current;
    if (!form || !output || !input) return null;
    const formData = new FormData(form); formData.set("organizationId", organizationId); formData.set("projectId", projectId); formData.set("roofModelId", model?.id ?? ""); formData.set("newRoofModelId", newRoofModelId); formData.set("operationId", operationId); formData.set("expectedRevisionNumber", String(model?.currentRevisionNumber ?? 0)); formData.set("inputMode", input.inputMode); formData.set("name", name);
    return formData;
  }, [input, model, name, newRoofModelId, operationId, organizationId, output, projectId]);
  const persistGeometry = useCallback(async (formData: FormData) => {
    setMessage(""); setFieldErrors({}); setIsSaving(true);
    try {
      const result = await saveGableRoofAction(formData);
      if (!result.ok) { const error = result.error ?? "A mentés nem sikerült. Próbáld újra."; setMessage(error); setFieldErrors(result.fieldErrors ?? {}); notify({ kind: "error", message: error }); throw new Error(error); }
      setBaselineValues(values); setBaselineName(name); setOperationId(generateSecureUuid());
      notify({ kind: "success", message: "Tetőmodell mentve" });
      return result.roofModelId;
    } finally { setIsSaving(false); }
  }, [name, notify, values]);
  const saveForNavigation = useCallback(async () => {
    const formData = buildSaveData();
    if (!formData) throw new Error("A tetőmodell mentéséhez töltsd ki helyesen a szükséges mezőket.");
    await persistGeometry(formData);
    return true;
  }, [buildSaveData, persistGeometry]);
  useUnsavedChangeGuard({ dirty: dirty || coveringDirty, pending: isPending || isSaving, save: coveringDirty ? undefined : saveForNavigation });
  useEffect(() => { onWorkspaceState?.({ dirty: dirty || coveringDirty, pending: isPending || isSaving }); }, [coveringDirty, dirty, isPending, isSaving, onWorkspaceState]);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (coveringDirty) {
      const accepted = await requestConfirmation({ title: "Fedési módosítások elvetése", message: "A tetőmodell mentése után a nem mentett fedési számítás módosításai elvesznek.", cancelLabel: "Vissza a szerkesztéshez", actions: [{ label: "Tetőmodell mentése és folytatás", tone: "danger", run: () => undefined }] });
      if (!accepted) return;
    }
    const formData = buildSaveData();
    if (!formData) { setMessage("A mentéshez töltsd ki helyesen a szükséges mezőket."); return; }
    startTransition(async () => { try { const roofModelId = await persistGeometry(formData); router.push(`/projektek/${projectId}/tetomodellek/${roofModelId}?organization=${organizationId}`); } catch { /* The inline error and shared notification explain the failure. */ } });
  };
  const changeSheetValue = (key: keyof MetalSheetLayoutFormValues, value: string) => { setViewedRevision(null); setLayoutMessage(""); setSheetLayoutValues((current) => ({ ...current, [key]: value })); };
  const saveLayout = () => { if (!model) return; const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("roofModelId", model.id); data.set("variantId", sheetLayoutValues.variantId); data.set("layoutCalculationId", savedSheetLayout?.calculationId ?? ""); data.set("expectedRevisionNumber", String(savedSheetLayout?.currentRevisionNumber ?? 0)); data.set("displayName", `${model.name} lemezkiosztás`); data.set("alignment", sheetLayoutValues.alignment); for (const key of ["effectiveCoveringWidthMm", "nominalSheetWidthMm", "minimumSheetLengthMm", "maximumSheetLengthMm", "endAllowanceMm"] as const) data.set(key, sheetLayoutValues[key]); startLayoutTransition(async () => { const result = await saveSheetLayoutAction({ ok: false }, data); if (!result.ok) setLayoutMessage(result.error ?? "A mentés nem sikerült."); else { setLayoutMessage(result.revisionCreated ? `A kiosztás ${result.revisionNumber}. revíziója sikeresen mentve.` : "A kiosztás változatlan; nem készült duplikált revízió."); router.refresh(); } }); };
  const createTakeoff = (revision: SavedSheetLayoutRevision) => { if (!savedSheetLayout) return; const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("layoutCalculationId", savedSheetLayout.calculationId); data.set("layoutRevisionId", revision.id); data.set("allowancePercent", sheetLayoutValues.takeoffAllowancePercent); startLayoutTransition(async () => { const result = await createSheetLayoutTakeoffAction({ ok: false }, data); setLayoutMessage(result.ok ? "Az anyagkimutatás-tervezet sikeresen létrejött; jóváhagyás nem történt." : result.error ?? "Az átadás nem sikerült."); if (result.ok) router.refresh(); }); };

  return (
    <>
      <form ref={formRef} className="roof-calculator" onSubmit={submit}>
        <GlassPageHeader title="Nyeregtető" context={model ? `Mentve · V${model.currentRevisionNumber}` : undefined} className="roof-calculator-toolbar" />
        <details className="roof-measurement-details">
          <summary>Mérési alapelv</summary>
          <p>Add meg a tényleges méreteket; túlnyúlás hiányában írj 0-t. A tizedes vessző és pont is elfogadott.</p>
        </details>
        <RoofWorkspace
          className="roof-workspace-project"
          context={<div className="roof-workspace-context"><div className="roof-guidance-slot"><MeasurementGuidance compact guide={measurementGuideFor("gable", focusedField ?? "")} /></div></div>}
          measurements={
            <section className="roof-surface roof-measurement-inputs">
              <div className="roof-form-grid roof-form-grid-compact">
                <NumericField name="buildingLengthMm" label="Épület hossza" unit="mm" value={values.buildingLengthMm} onChange={(value) => setValue("buildingLengthMm", value)} error={inputError("buildingLengthMm")} onFocus={() => setFocusedField("buildingLengthMm")} onBlur={handleMeasurementBlur} />
                <NumericField name="buildingWidthMm" label="Épület szélessége" unit="mm" value={values.buildingWidthMm} onChange={(value) => setValue("buildingWidthMm", value)} error={inputError("buildingWidthMm")} onFocus={() => setFocusedField("buildingWidthMm")} onBlur={handleMeasurementBlur} />
                <div className="roof-mode-field"><span>Meghatározó tetőadat</span><div className="roof-mode-toggle" role="group" aria-label="Tetőadat módja"><button type="button" className={values.inputMode === "height" ? "is-active" : ""} onClick={() => switchMode("height")}>Tetőemelkedés</button><button type="button" className={values.inputMode === "angle" ? "is-active" : ""} onClick={() => switchMode("angle")}>Hajlásszög</button></div></div>
                {values.inputMode === "height" ? <NumericField name="roofRiseMm" label="Tetőemelkedés" unit="mm" value={values.roofRiseMm} onChange={(value) => setValue("roofRiseMm", value)} error={inputError("roofRiseMm")} onFocus={() => setFocusedField("roofRiseMm")} onBlur={handleMeasurementBlur} help="A fal megtámasztási síkjától a gerincig." /> : <NumericField name="roofPitchDegrees" label="Tetőhajlásszög" unit="°" value={values.roofPitchDegrees} onChange={(value) => setValue("roofPitchDegrees", value)} error={inputError("roofPitchDegrees")} onFocus={() => setFocusedField("roofPitchDegrees")} onBlur={handleMeasurementBlur} help="0 és 90° között." />}
                <NumericField name="eaveOverhangMm" label="Eresz túlnyúlás" unit="mm" value={values.eaveOverhangMm} onChange={(value) => setValue("eaveOverhangMm", value)} error={inputError("eaveOverhangMm")} onFocus={() => setFocusedField("eaveOverhangMm")} onBlur={handleMeasurementBlur} help="Vízszintesen a falsíktól." />
                <NumericField name="frontGableOverhangMm" label="Első oromfal túlnyúlás" unit="mm" value={values.frontGableOverhangMm} onChange={(value) => setValue("frontGableOverhangMm", value)} error={inputError("frontGableOverhangMm")} onFocus={() => setFocusedField("frontGableOverhangMm")} onBlur={handleMeasurementBlur} />
                <NumericField name="rearGableOverhangMm" label="Hátsó oromfal túlnyúlás" unit="mm" value={values.rearGableOverhangMm} onChange={(value) => setValue("rearGableOverhangMm", value)} error={inputError("rearGableOverhangMm")} onFocus={() => setFocusedField("rearGableOverhangMm")} onBlur={handleMeasurementBlur} />
              </div>
            </section>
          }
          drawing={output && <TechnicalDrawing output={output} compact isSaved={Boolean(model && !dirty)} activeDimension={focusedField} activeDimensionDescription={measurementGuideFor("gable", focusedField ?? "")?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} sheetLayout={model && !dirty && !viewedRevision?.geometryStale ? sheetLayout : null} sheetLayoutIsSaved={Boolean(viewedRevision)} selectedSegmentIds={selectedSegmentIds} onSegmentToggle={(id) => setSelectedSegmentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} />}
          results={
            <>
              {output ? <Results output={output} /> : <section className="roof-results roof-empty-result"><h2>Az eredmények a teljes geometria megadásakor jelennek meg.</h2><p>A köztesen üres mezők szerkesztés közben megengedettek.</p></section>}
              {model && !dirty && model.currentRevisionId && <div className="roof-segment-actions"><p>Az átadás csak a kijelölt éleket használja, az ellenőrzött mentett V{model.currentRevisionNumber} tetőrevízióból.</p>{selectedEaves.length > 0 && <Link className="primary-button" href={`/projektek/${projectId}/ereszcsatorna?organization=${organizationId}&roof=${model.id}&edges=${selectedEaves.join(",")}`}>Felhasználás ereszcsatornához · {(selectedGableLength(selectedSegments, selectedEaves, "eave") / 1000).toLocaleString("hu-HU")} m</Link>}{selectedFlashings.length > 0 && <Link className="secondary-button" href={`/projektek/${projectId}/szegelyek?organization=${organizationId}&roof=${model.id}&edges=${selectedFlashings.join(",")}`}>Felhasználás szegélyhez · {selectedFlashings.length} él</Link>}</div>}
            </>
          }
          actions={
            <section className="roof-surface roof-measurement-actions">
              <label className="roof-field roof-name-field"><span>Megnevezés</span><input name="displayName" value={name} onChange={(event) => setName(event.target.value)} /></label>
              <div className="roof-workspace-action-bar"><p role="status">{message || (dirty ? "Nem mentett módosítások" : `Mentve · V${model?.currentRevisionNumber ?? 0}`)}</p><button id="roof-model-save-button" className="primary-button" type="submit" disabled={isPending || isSaving || !output}><Save aria-hidden="true" className="size-4" />{isPending || isSaving ? "Mentés…" : "Tetőmodell mentése"}</button></div>
            </section>
          }
        />
        <details className="roof-related-workflows"><summary>Fedések és anyagkiosztás</summary>
          {(model?.currentInput && model.currentOutput) || (output && input) ? <GableTrapezoidalCoveringPanel mode="project" organizationId={organizationId} projectId={projectId} projectName={projectName} roofGeometryDirty={dirty} takeoffOptions={coveringTakeoffOptions} roofModelId={model?.id ?? ""} roofModelRevisionId={model?.currentInput && model.currentCalculationRevisionId ? model.currentRevisionId : null} roofModelRevisionNumber={model?.currentRevisionNumber ?? 0} savedCalculations={savedCoverings} onDirtyChange={setCoveringDirty} name={model?.name ?? name} geometry={model?.currentInput && model.currentOutput ? model.currentOutput : output!} geometryInput={model?.currentInput ?? input!} sourceLabel={model?.currentInput ? `Projekt tetőmodell · ${model.name} · mentett V${model.currentRevisionNumber}` : "Projekt tetőmodell · nem mentett geometria"} /> : null}
          {output && input ? <GableMetalTileCoveringPreview geometry={output} geometryInput={input} organizationId={organizationId} mode="project" projectId={projectId} projectName={projectName} roofModelId={model?.id ?? ""} roofModelRevisionId={model?.currentInput && !dirty && model.currentCalculationRevisionId ? model.currentRevisionId : null} currentSavedRoofRevisionId={model?.currentCalculationRevisionId ? model.currentRevisionId : null} roofModelRevisionNumber={model?.currentRevisionNumber ?? 0} roofGeometryDirty={dirty} saved={savedMetalTileCoverings[0] ?? null} takeoffOptions={coveringTakeoffOptions} onDirtyChange={setCoveringDirty} sourceLabel={model?.currentInput && !dirty ? `Projekt tetőmodell · ${model.name} · mentett V${model.currentRevisionNumber}` : "Projekt tetőmodell · nem mentett geometria"} /> : null}
          {output && <MetalSheetLayoutPanel values={sheetLayoutValues} calculation={sheetLayoutCalculation} materials={sheetLayoutMaterials} savedLayout={savedSheetLayout} viewedRevision={viewedRevision} canSave={Boolean(model && model.currentCalculationRevisionId)} pending={layoutPending} message={layoutMessage} onChange={changeSheetValue} onProductChange={(productId) => { setViewedRevision(null); setSheetLayoutValues({ ...initialMetalSheetLayoutValues, productId }); }} onVariantChange={(variantId) => { const productId = sheetLayoutMaterials.find((item) => item.variantId === variantId)?.productId ?? sheetLayoutValues.productId; setViewedRevision(null); setSheetLayoutValues({ ...initialMetalSheetLayoutValues, productId, variantId }); }} onSave={saveLayout} onOpenRevision={(revision) => { setViewedRevision(revision); setSheetLayoutValues(valuesFromRevision(revision, sheetLayoutMaterials)); setLayoutMessage(""); }} onTakeoff={createTakeoff} />}
        </details>
      </form>
    </>
  );
}
