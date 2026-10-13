"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Save, Scaling } from "lucide-react";
import { executeCalculator } from "@/domain/calculations/engine";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { metalSheetLayoutCalculator } from "@/domain/calculations/metal-sheet-layout";
import { resolveSheetLayoutMaterial } from "@/domain/calculations/sheet-layout-material";
import { saveGableRoofAction } from "./roof-model-actions";
import type { RoofModelRecord } from "./roof-model-data";
import { ScalingBubble } from "@/components/accessibility/scaling-bubble";
import { TechnicalDrawing } from "./technical-drawing";
import { initialMetalSheetLayoutValues, MetalSheetLayoutPanel, type MetalSheetLayoutFormValues } from "./metal-sheet-layout-panel";
import type { SavedSheetLayout, SavedSheetLayoutRevision, SheetLayoutMaterialOption } from "./sheet-layout-data";
import { createSheetLayoutTakeoffAction, saveSheetLayoutAction } from "./sheet-layout-actions";

type FormValues = Record<string, string> & { inputMode: "height" | "angle" };
const defaults: FormValues = { inputMode: "height", buildingLengthMm: "12000", buildingWidthMm: "8000", roofRiseMm: "3000", roofPitchDegrees: "", eaveOverhangMm: "500", frontGableOverhangMm: "250", rearGableOverhangMm: "250" };
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

function toInput(values: FormValues): GableRoofInput | null {
  const parse = (key: string) => { const value = values[key]?.trim(); if (!value) return undefined; const parsed = Number(value.replace(",", ".")); return Number.isFinite(parsed) ? parsed : undefined; };
  const raw = { inputMode: values.inputMode, buildingLengthMm: parse("buildingLengthMm"), buildingWidthMm: parse("buildingWidthMm"), eaveOverhangMm: parse("eaveOverhangMm"), frontGableOverhangMm: parse("frontGableOverhangMm"), rearGableOverhangMm: parse("rearGableOverhangMm"), roofRiseMm: values.inputMode === "height" ? parse("roofRiseMm") : undefined, roofPitchDegrees: values.inputMode === "angle" ? parse("roofPitchDegrees") : undefined };
  const parsed = gableRoofInputSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function NumericField({ name, label, value, unit, error, onChange, help }: Readonly<{ name: string; label: string; value: string; unit: string; error?: string; onChange: (value: string) => void; help?: string }>) {
  return <label className="roof-field"><span>{label} <small>{unit}</small></span><input name={name} inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} />{help && <em>{help}</em>}{error && <b className="roof-field-error">{error}</b>}</label>;
}

function ResultMetric({ label, value }: Readonly<{ label: string; value: string }>) { return <div className="roof-result-metric"><small>{label}</small><strong>{value}</strong></div>; }

function Results({ output }: Readonly<{ output: GableRoofOutput }>) {
  return <section className="roof-results" aria-live="polite" aria-labelledby="roof-results-title"><div className="roof-section-heading"><div><p className="section-eyebrow">Eredmények</p><h2 id="roof-results-title">Geometriai összesítő</h2></div><span className="verified-badge"><Check className="size-4" /> Geometriailag ellenőrzött</span></div><div className="roof-result-highlight"><span>Teljes tetőfelület</span><strong>{display(output.areas.combinedRoofM2, "m²")}</strong><small>Vízszintes vetület: {display(output.areas.horizontalProjectedM2, "m²")}</small></div><div className="roof-result-grid"><ResultMetric label="Egy tetősík" value={display(output.areas.individualRoofPlaneM2, "m²")} /><ResultMetric label="Tetőhajlásszög" value={display(output.angles.pitchDegrees, "°")} /><ResultMetric label="Tetőemelkedés" value={display(output.heights.roofRiseMm / 1000, "m")} /><ResultMetric label="Ferde hossz túlnyúlással" value={display(output.lengths.slopeLengthIncludingEaveMm / 1000, "m")} /><ResultMetric label="Gerincvonal" value={display(output.lengths.ridgeLineMm / 1000, "m")} /><ResultMetric label="Két ereszél összesen" value={display(output.lengths.totalEaveEdgesMm / 1000, "m")} /><ResultMetric label="Teljes tetőhossz" value={display(output.dimensions.overallRoofLengthMm / 1000, "m")} /><ResultMetric label="Vízszintes tetőszélesség" value={display(output.dimensions.horizontalRoofWidthMm / 1000, "m")} /></div><p className="roof-disclaimer">Geometriai kalkuláció a megadott nyeregtető-feltételezésekkel. Nem helyettesíti a statikai méretezést vagy a gyártói alkalmazási előírásokat.</p></section>;
}

function valuesFromRevision(revision: SavedSheetLayoutRevision | undefined, materials: readonly SheetLayoutMaterialOption[]): MetalSheetLayoutFormValues {
  if (!revision) return initialMetalSheetLayoutValues;
  const material = materials.find((item) => item.variantId === revision.input.material.catalogSnapshot.variantId);
  const manual = (key: keyof typeof revision.input.material.effectiveValues) => revision.input.material.parameterSources[key] === "user_provided" ? String(revision.input.material.effectiveValues[key] ?? "") : "";
  return { productId: material?.productId ?? "", variantId: material?.variantId ?? revision.input.material.catalogSnapshot.variantId, effectiveCoveringWidthMm: manual("effectiveCoveringWidthMm"), nominalSheetWidthMm: manual("nominalSheetWidthMm"), minimumSheetLengthMm: manual("minimumSheetLengthMm"), maximumSheetLengthMm: manual("maximumSheetLengthMm"), endAllowanceMm: manual("endAllowanceMm"), alignment: revision.input.calculatorInput.alignment, takeoffAllowancePercent: "0" };
}

export function GableRoofCalculatorForm({ organizationId, projectId, model, sheetLayoutMaterials = [], savedSheetLayout = null }: Readonly<{ organizationId: string; projectId: string; model?: RoofModelRecord | null; sheetLayoutMaterials?: readonly SheetLayoutMaterialOption[]; savedSheetLayout?: SavedSheetLayout | null }>) {
  const [values, setValues] = useState<FormValues>(() => initialValues(model));
  const [name, setName] = useState(model?.name ?? "Új nyeregtető");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const currentSavedRevision = savedSheetLayout?.revisions.find((revision) => revision.current);
  const [sheetLayoutValues, setSheetLayoutValues] = useState<MetalSheetLayoutFormValues>(() => valuesFromRevision(currentSavedRevision, sheetLayoutMaterials));
  const [viewedRevision, setViewedRevision] = useState<SavedSheetLayoutRevision | null>(currentSavedRevision ?? null);
  const [layoutMessage, setLayoutMessage] = useState("");
  const [layoutPending, startLayoutTransition] = useTransition();
  const router = useRouter();
  const input = useMemo(() => toInput(values), [values]);
  const output = useMemo(() => input ? calculateGableRoof(input) : null, [input]);
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
  const drawingOutput = viewedRevision?.geometryOutput ?? output;
  useEffect(() => { const latest = savedSheetLayout?.revisions.find((revision) => revision.current); if (latest) { setViewedRevision(latest); setSheetLayoutValues(valuesFromRevision(latest, sheetLayoutMaterials)); } }, [savedSheetLayout?.currentRevisionNumber, sheetLayoutMaterials, savedSheetLayout?.revisions]);
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [dirty]);
  const setValue = (key: string, value: string) => { setDirty(true); setViewedRevision(null); setValues((current) => ({ ...current, [key]: value })); setMessage(""); };
  const switchMode = (mode: "height" | "angle") => { setDirty(true); setValues((current) => ({ ...current, inputMode: mode, ...(mode === "height" ? { roofPitchDegrees: "" } : { roofRiseMm: "" }) })); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); setMessage(""); setFieldErrors({}); if (!output || !input) { setMessage("A mentéshez töltsd ki helyesen a szükséges mezőket."); return; } const formData = new FormData(event.currentTarget); formData.set("organizationId", organizationId); formData.set("projectId", projectId); formData.set("roofModelId", model?.id ?? ""); formData.set("expectedRevisionNumber", String(model?.currentRevisionNumber ?? 0)); formData.set("inputMode", input.inputMode); formData.set("name", name); startTransition(async () => { const result = await saveGableRoofAction(formData); if (!result.ok) { setMessage(result.error ?? "A mentés nem sikerült."); setFieldErrors(result.fieldErrors ?? {}); } else { setDirty(false); router.push(`/projektek/${projectId}/tetomodellek/${result.roofModelId}?organization=${organizationId}`); } }); };
  const changeSheetValue = (key: keyof MetalSheetLayoutFormValues, value: string) => { setViewedRevision(null); setLayoutMessage(""); setSheetLayoutValues((current) => ({ ...current, [key]: value })); };
  const saveLayout = () => { if (!model) return; const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("roofModelId", model.id); data.set("variantId", sheetLayoutValues.variantId); data.set("layoutCalculationId", savedSheetLayout?.calculationId ?? ""); data.set("expectedRevisionNumber", String(savedSheetLayout?.currentRevisionNumber ?? 0)); data.set("displayName", `${model.name} lemezkiosztás`); data.set("alignment", sheetLayoutValues.alignment); for (const key of ["effectiveCoveringWidthMm", "nominalSheetWidthMm", "minimumSheetLengthMm", "maximumSheetLengthMm", "endAllowanceMm"] as const) data.set(key, sheetLayoutValues[key]); startLayoutTransition(async () => { const result = await saveSheetLayoutAction({ ok: false }, data); if (!result.ok) setLayoutMessage(result.error ?? "A mentés nem sikerült."); else { setLayoutMessage(result.revisionCreated ? `A kiosztás ${result.revisionNumber}. revíziója sikeresen mentve.` : "A kiosztás változatlan; nem készült duplikált revízió."); router.refresh(); } }); };
  const createTakeoff = (revision: SavedSheetLayoutRevision) => { if (!savedSheetLayout) return; const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId); data.set("layoutCalculationId", savedSheetLayout.calculationId); data.set("layoutRevisionId", revision.id); data.set("allowancePercent", sheetLayoutValues.takeoffAllowancePercent); startLayoutTransition(async () => { const result = await createSheetLayoutTakeoffAction({ ok: false }, data); setLayoutMessage(result.ok ? "Az anyagkimutatás-tervezet sikeresen létrejött; jóváhagyás nem történt." : result.error ?? "Az átadás nem sikerült."); if (result.ok) router.refresh(); }); };
  return <><form className="roof-calculator" onSubmit={submit}><div className="roof-calculator-toolbar"><div><p className="section-eyebrow">{model ? `Mentett nyeregtető · revízió ${model.currentRevisionNumber}` : "Új tetőmodell"}</p><h1>{model ? "Nyeregtető szerkesztése" : "Nyeregtető kalkulátor"}</h1></div><div className="roof-toolbar-actions"><Link className="secondary-button" href={`/projektek/${projectId}?organization=${organizationId}`}>Vissza</Link><button className="primary-button" type="submit" disabled={isPending || !output}><Save className="size-4" />{isPending ? "Mentés…" : "Mentés"}</button></div></div><section className="roof-surface"><div className="roof-section-heading"><div><p className="section-eyebrow">Adatok</p><h2>Épület és tetőgeometria</h2></div><span className="unit-note">Minden méret mm-ben</span></div><label className="roof-field roof-name-field"><span>Megnevezés</span><input name="displayName" value={name} onChange={(event) => { setName(event.target.value); setDirty(true); }} /></label><div className="roof-form-grid"><NumericField name="buildingLengthMm" label="Épület hossza" unit="mm" value={values.buildingLengthMm} onChange={(value) => setValue("buildingLengthMm", value)} error={fieldErrors.buildingLengthMm} /><NumericField name="buildingWidthMm" label="Épület szélessége" unit="mm" value={values.buildingWidthMm} onChange={(value) => setValue("buildingWidthMm", value)} error={fieldErrors.buildingWidthMm} /><div className="roof-mode-field"><span>Meghatározó tetőadat</span><div className="roof-mode-toggle" role="group" aria-label="Tetőadat módja"><button type="button" className={values.inputMode === "height" ? "is-active" : ""} onClick={() => switchMode("height")}>Tetőemelkedés</button><button type="button" className={values.inputMode === "angle" ? "is-active" : ""} onClick={() => switchMode("angle")}>Hajlásszög</button></div></div>{values.inputMode === "height" ? <NumericField name="roofRiseMm" label="Tetőemelkedés" unit="mm" value={values.roofRiseMm} onChange={(value) => setValue("roofRiseMm", value)} error={fieldErrors.roofRiseMm} help="A fal megtámasztási síkjától a gerincig." /> : <NumericField name="roofPitchDegrees" label="Tetőhajlásszög" unit="°" value={values.roofPitchDegrees} onChange={(value) => setValue("roofPitchDegrees", value)} error={fieldErrors.roofPitchDegrees} help="0 és 90° között." />}<NumericField name="eaveOverhangMm" label="Eresz túlnyúlás" unit="mm" value={values.eaveOverhangMm} onChange={(value) => setValue("eaveOverhangMm", value)} error={fieldErrors.eaveOverhangMm} help="Vízszintesen a falsíktól." /><NumericField name="frontGableOverhangMm" label="Első oromfal túlnyúlás" unit="mm" value={values.frontGableOverhangMm} onChange={(value) => setValue("frontGableOverhangMm", value)} error={fieldErrors.frontGableOverhangMm} /><NumericField name="rearGableOverhangMm" label="Hátsó oromfal túlnyúlás" unit="mm" value={values.rearGableOverhangMm} onChange={(value) => setValue("rearGableOverhangMm", value)} error={fieldErrors.rearGableOverhangMm} /></div><p className="roof-help-note"><Scaling className="size-4" /> A számítás azonnal frissül. A tizedes vessző és pont is elfogadott.</p></section>{output ? <><MetalSheetLayoutPanel values={sheetLayoutValues} calculation={sheetLayoutCalculation} materials={sheetLayoutMaterials} savedLayout={savedSheetLayout} viewedRevision={viewedRevision} canSave={Boolean(model && model.currentCalculationRevisionId)} pending={layoutPending} message={layoutMessage} onChange={changeSheetValue} onProductChange={(productId) => { setViewedRevision(null); setSheetLayoutValues({ ...initialMetalSheetLayoutValues, productId }); }} onVariantChange={(variantId) => { const productId = sheetLayoutMaterials.find((item) => item.variantId === variantId)?.productId ?? sheetLayoutValues.productId; setViewedRevision(null); setSheetLayoutValues({ ...initialMetalSheetLayoutValues, productId, variantId }); }} onSave={saveLayout} onOpenRevision={(revision) => { setViewedRevision(revision); setSheetLayoutValues(valuesFromRevision(revision, sheetLayoutMaterials)); setLayoutMessage(""); }} onTakeoff={createTakeoff} /><TechnicalDrawing output={drawingOutput ?? output} isSaved={Boolean(viewedRevision || (model && !dirty))} sheetLayout={sheetLayout} sheetLayoutIsSaved={Boolean(viewedRevision)} /><Results output={output} /></> : <section className="roof-results roof-empty-result"><h2>Az eredmények a teljes geometria megadásakor jelennek meg.</h2><p>A köztesen üres mezők szerkesztés közben megengedettek.</p></section>}{message && <p className={`form-message ${message.includes("mentve") ? "is-success" : "is-error"}`} role="status">{message}</p>}</form><ScalingBubble /></>;
}
