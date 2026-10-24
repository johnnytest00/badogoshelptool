"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { calculateRoofGeometry, roofGeometryInputSchema, type RoofGeometryType } from "@/domain/calculations/roof-geometry";
import type { RoofModelRecord } from "./roof-model-data";
import { saveMultiRoofAction } from "./multi-roof-actions";
import { saveStandaloneMultiRoofAction } from "./multi-roof-actions";
import { TechnicalDrawing } from "./technical-drawing";
import { roofTypeOptions } from "./roof-type-selector";
import type { StandaloneRoofRecord } from "./standalone-roof-data";
import { MeasurementGuidance, measurementGuideFor } from "./measurement-guidance";
import { RoofWorkspace } from "./roof-workspace";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { labelledValidationMessage, validationMessage as fieldValidationMessage } from "@/lib/validation-message";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { LengthField } from "@/components/ui/length-field";
import { formatQuantity } from "@/lib/quantity-format";

type MultiType = Exclude<RoofGeometryType, "gable">;
type Field = { key: string; label: string; unit: string; help: string };
const names: Record<MultiType, string> = Object.fromEntries(roofTypeOptions.filter((option) => option.type !== "gable").map((option) => [option.type, option.name])) as Record<MultiType, string>;
const num = (text: string) => text.trim() ? Number(text.trim().replace(",", ".")) : undefined;
const display = (value: number, unit: string) => formatQuantity(value, unit);

function fieldsFor(type: MultiType): Field[] {
  if (type === "pyramid") return [{ key: "sideMm", label: "Tető külső oldalhossza", unit: "mm", help: "A négyzet alakú ereszkontúr egyik oldala." }, { key: "pitchDegrees", label: "Tetőhajlás", unit: "°", help: "A vízszintes síkhoz mért szög." }];
  return [
    { key: "lengthMm", label: "Tető külső hossza", unit: "mm", help: "A fő tetőrész hosszmérete a gerinc irányában." },
    { key: "widthMm", label: "Tető külső szélessége", unit: "mm", help: "A fő tetőrész két szemközti eresze közötti vízszintes méret." },
    { key: "pitchDegrees", label: "Tetőhajlás", unit: "°", help: "A tetősík vízszinteshez viszonyított szöge." },
    ...(type === "halfHip" ? [{ key: "hipEaveHeightMm", label: "Félkonty alsó élének magassága az ereszhez képest", unit: "mm", help: "A félkonty alsó élének függőleges szintkülönbsége." }] : []),
    ...(type === "lShape" || type === "tShape" ? [
      { key: "wingWidthMm", label: "Csatlakozó szárny külső szélessége", unit: "mm", help: "A szárny külső mérete a főtető csatlakozó oldalán." },
      { key: "wingProjectionMm", label: "Szárny kinyúlása a főtetőből", unit: "mm", help: "A csatlakozó faltól a szárny külső kontúrjáig mért távolság." },
    ] : []),
  ];
}

export function MultiRoofCalculatorForm({ type, organizationId, projectId, model = null, standalone = null, onChangeRoofType, onWorkspaceState }: Readonly<{ type: MultiType; organizationId?: string; projectId?: string; model?: RoofModelRecord | null; standalone?: StandaloneRoofRecord | null; onChangeRoofType?: () => void; onWorkspaceState?: (state: { dirty: boolean; pending: boolean }) => void }>) {
  const fields = fieldsFor(type);
  const savedInput = model?.currentMultiRoofInput ?? standalone?.input;
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((field) => [field.key, savedInput && field.key in savedInput ? String(savedInput[field.key as keyof typeof savedInput]) : ""])));
  const [name, setName] = useState(model?.name ?? standalone?.name ?? `Új ${names[type].toLowerCase()}`);
  const interactionBaseline = useRef({ values, name });
  const [viewedHistoryId, setViewedHistoryId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [operationId, setOperationId] = useState(() => generateSecureUuid());
  const [roofModelId] = useState(() => model?.id ?? generateSecureUuid());
  const [calculationId] = useState(() => standalone?.id ?? generateSecureUuid());
  const router = useRouter();
  const { notify } = useAppInteraction();
  const parsed = useMemo(() => roofGeometryInputSchema.safeParse({ type, ...Object.fromEntries(fields.map((field) => [field.key, num(values[field.key] ?? "")])) }), [fields, type, values]);
  const issueFor = (key: string) => parsed.success ? undefined : parsed.error.issues.find((issue) => issue.path.includes(key));
  // Kitöltetlen mezőre nem jelzünk hibát (fokozatos validáció); a hiányt a szakasz alatti üzenet mondja ki.
  const fieldError = (key: string) => {
    const raw = values[key];
    if (!raw?.trim()) return undefined;
    const issue = issueFor(key);
    return issue ? fieldValidationMessage(issue, raw) : undefined;
  };
  const validationMessage = useMemo(() => {
    if (parsed.success || !Object.values(values).some(Boolean)) return null;
    const issue = parsed.error.issues[0];
    const field = fields.find((item) => item.key === issue?.path[0]);
    return labelledValidationMessage(field?.label ?? "Tetőméret", issue, field ? values[field.key] ?? "" : undefined);
  }, [fields, parsed, values]);
  const dirty = (!model && !standalone) || JSON.stringify(parsed.success ? parsed.data : values) !== JSON.stringify(savedInput) || name !== (model?.name ?? standalone?.name);
  const interactionDirty = JSON.stringify(values) !== JSON.stringify(interactionBaseline.current.values) || name !== interactionBaseline.current.name;
  useEffect(() => { onWorkspaceState?.({ dirty: interactionDirty, pending }); }, [interactionDirty, onWorkspaceState, pending]);
  useUnsavedChangeGuard({ dirty: interactionDirty, pending, discard: () => { setValues(interactionBaseline.current.values); setName(interactionBaseline.current.name); } });
  const geometry = useMemo(() => parsed.success ? !dirty && (model?.currentMultiRoofOutput || standalone?.output) ? (model?.currentMultiRoofOutput ?? standalone?.output)! : calculateRoofGeometry(parsed.data) : null, [parsed, dirty, model, standalone]);
  const history = model ? model.revisions.flatMap((revision) => revision.input && "type" in revision.input && revision.input.type === type
    ? [{ id: revision.id, revisionNumber: revision.revisionNumber, input: revision.input, createdAt: revision.createdAt }] : []) : standalone?.revisions ?? [];
  const viewedHistory = history.find((revision) => revision.id === viewedHistoryId);
  const historicalGeometry = viewedHistory ? calculateRoofGeometry(viewedHistory.input) : null;
  const geometryAssumption = type === "lShape" || type === "tShape"
    ? "A főtető X irányú, a szárny dél felé nyúlik ki; azonos hajlás és közös ereszszint szükséges. A T szárny középen, az L szárny a bal végen csatlakozik."
    : type === "pyramid"
      ? "A modell négyzetes ereszkontúrt és mind a négy oldalon azonos méretet feltételez."
      : "A megadott méretek a tető külső kontúrját jelölik; a modell eltérő túlnyúlást nem számít hozzá.";
  const update = (key: string, value: string) => { setValues((current) => ({ ...current, [key]: value })); setMessage(""); };
  const save = () => {
    if (!organizationId || !parsed.success) return;
    startTransition(async () => {
      const saved = projectId
        ? await saveMultiRoofAction({ organizationId, projectId, roofModelId, operationId, expectedRevisionNumber: model?.currentRevisionNumber ?? 0, name, input: parsed.data })
        : await saveStandaloneMultiRoofAction({ organizationId, calculationId, operationId, expectedRevisionNumber: standalone?.revisionNumber ?? 0, name, input: parsed.data });
      if (!saved.ok) { const error = saved.error ?? "A mentés nem sikerült."; setMessage(error); notify({ kind: "error", message: error }); return; }
      interactionBaseline.current = { values, name };
      notify({ kind: "success", message: "Tetőgeometria mentve" });
      setOperationId(generateSecureUuid());
      setMessage(`A tetőgeometria mentve · V${saved.revisionNumber}.`);
      router.replace(projectId ? `/projektek/${projectId}/tetomodellek/${roofModelId}?organization=${organizationId}` : `/kalkulatorok/nyeregteto?organization=${organizationId}&calculation=${calculationId}`);
      router.refresh();
    });
  };
  return <div className="roof-calculator">
    <GlassPageHeader title={names[type]} context={model ? `Mentve · V${model.currentRevisionNumber}` : standalone ? `Mentve · V${standalone.revisionNumber}` : undefined} actions={onChangeRoofType && <button className="secondary-button" type="button" onClick={onChangeRoofType}>← Tetőtípus kiválasztása</button>} className="roof-calculator-toolbar" />
    <RoofWorkspace
      context={<div className="roof-workspace-context"><div className="roof-guidance-slot"><MeasurementGuidance compact guide={measurementGuideFor(type, focusedField ?? "")} /></div></div>}
      measurements={<section className="roof-surface roof-measurement-inputs"><p className="roof-technical-note">{geometryAssumption}</p><div className="roof-form-grid roof-form-grid-compact">{fields.map((field) => <label key={field.key} className="roof-field">{field.unit === "mm" ? <><span>{field.label}</span><LengthField id={field.key} label={field.label} value={values[field.key] ?? ""} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} onChange={(value) => update(field.key, value)} error={fieldError(field.key)} /></> : <><span>{field.label} <small>{field.unit}</small></span><input id={field.key} inputMode="decimal" value={values[field.key] ?? ""} onFocus={() => setFocusedField(field.key)} onBlur={() => setFocusedField(null)} onChange={(event) => update(field.key, event.target.value)} aria-invalid={Boolean(fieldError(field.key))} aria-label={`${field.label} (${field.unit})`} />{fieldError(field.key) && <b className="roof-field-error">{fieldError(field.key)}</b>}</>}</label>)}</div>{validationMessage && <p className="missing-data" role="status">{validationMessage}</p>}</section>}
      drawing={geometry && <TechnicalDrawing geometry={geometry} compact isSaved={Boolean((model || standalone) && !dirty)} activeDimension={focusedField} activeDimensionDescription={measurementGuideFor(type, focusedField ?? "")?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />}
      results={geometry && <><section className="roof-results" aria-live="polite"><div className="roof-section-heading"><div><p className="section-eyebrow">Eredmények</p><h2>Geometriai összesítő</h2></div></div><div className="roof-result-highlight"><span>Teljes tetőfelület</span><strong>{display(geometry.totalAreaMm2 / 1e6, "m²")}</strong><small>Vízszintes vetület: {display(geometry.projectedAreaMm2 / 1e6, "m²")}</small></div><div className="roof-result-grid"><div className="roof-result-metric"><small>Tetősík-részek</small><strong>{geometry.planes.length}</strong></div><div className="roof-result-metric"><small>Vápavonalak</small><strong>{geometry.edges.filter((edge) => edge.kind === "valley").length}</strong></div><div className="roof-result-metric"><small>Legmagasabb geometriai pont</small><strong>{display(Math.max(...geometry.planes.flatMap((plane) => plane.vertices.map((point) => point.zMm))) / 1000, "m")}</strong></div></div><p className="roof-disclaimer">A felület és a vetület a kiválasztott geometriai modellből számítva; a magasság a modell referencia-szintjéhez viszonyított geometriai érték.</p>
        <p className="roof-disclaimer">A nem nyeregtetős fedési kiosztás még nem érhető el; ehhez nem készül kitalált lemezmennyiség.</p></section></>}
      actions={<section className="roof-surface roof-measurement-actions"><label className="roof-field roof-name-field"><span>Tetőmodell neve</span><input value={name} maxLength={200} onChange={(event) => { setName(event.target.value); setMessage(""); }} /></label>{organizationId && <div className="roof-toolbar-actions"><button className="primary-button" type="button" disabled={!geometry || !name.trim() || pending || !dirty} onClick={save}>{pending ? "Mentés…" : model || standalone ? "Új tetőrevízió mentése" : "Tetőgeometria mentése"}</button></div>}{!projectId && <p className="roof-help-note">Projekt nélküli, saját számítás. Mentés után ugyanerről az oldalról újranyitható.</p>}{message && <p role="status" className={`form-message ${message.includes("mentve") ? "is-success" : "is-error"}`}>{message}</p>}</section>}
    />
    {history.length > 0 && <details className="roof-surface"><summary>Korábbi tetőrevíziók · {history.length}</summary><p>Az eredeti, változtathatatlan bemenetből újraszámolt rajz. A kapcsolt munkák saját, pontos forrásrevíziójukat őrzik.</p><div className="roof-toolbar-actions">{history.map((revision) => <button key={revision.id} type="button" className="secondary-button" aria-pressed={viewedHistoryId === revision.id} onClick={() => setViewedHistoryId(revision.id)}>V{revision.revisionNumber} · {new Date(revision.createdAt).toLocaleDateString("hu-HU")}</button>)}</div>{viewedHistory && historicalGeometry && <><p>Revízióazonosító: <code>{viewedHistory.id}</code> · felület: {display(historicalGeometry.totalAreaMm2 / 1e6, "m²")}</p><TechnicalDrawing geometry={historicalGeometry} isSaved /></>}</details>}
  </div>;
}
