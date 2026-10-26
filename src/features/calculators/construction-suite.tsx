"use client";

import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { LengthField, canonicalLength, type LengthFieldState } from "@/components/ui/length-field";
import { RoofWorkspace } from "@/features/roof-models/roof-workspace";
import { MeasurementGuidance, measurementGuideFor } from "@/features/roof-models/measurement-guidance";
import { constructionCalculatorCatalog, type ConstructionCalculatorCategory, type ConstructionReference } from "@/domain/calculations/construction/catalog";
import { mmToM } from "@/domain/calculations/construction/numeric";
import { roofTakeoffCriticalWarnings, type RoofMaterialTakeoff, type RoofMaterialTakeoffStatus } from "@/domain/calculations/roof-material-takeoff";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import type { RoofTimberLayout } from "@/domain/calculations/roof-timber-layout";
import type { RoofUnderlayLayout } from "@/domain/calculations/roof-underlay";
import { DEMO_MATERIAL_PROFILES, type MaterialProfile, overhangFromField } from "@/domain/calculations/roof-material-spec";
import { RafterMaterialSpecInput, RoofMaterialInputs, initialMaterialState, type RoofMaterialUiState } from "./material-spec-editor";
import { RoofGeometryResults } from "@/features/roof-models/roof-geometry-results";
import { ConstructionCalculatorThumbnail } from "./construction-thumbnails";
import { RafterJointDrawing, RoofJointDrawing } from "./rafter-joint-drawing";
import { HapMeasuringHelp } from "./hap-figure";
import { PurlinMeasuringHelp } from "./purlin-figure";
import { FeatureToggle } from "./feature-toggle";
import { RafterCutFlow, RafterJointsInvitation, RoofDrawingViews, type RoofDrawingView } from "./rafter-result-flow";
import { RafterLayoutDrawing } from "./rafter-layout-drawing";
import { RafterJointsPanel } from "./rafter-joints-panel";
import { initialConstructionCalculatorId, loadConstructionCalculatorDefinition } from "./construction-calculator-loading";
import type { CalculatorDefinition, Field } from "./construction-calculator-types";
import { isRafterConnectionField, jointGroupState, karmiStatusText } from "./rafter-connection-fields";
import { planeJointStatuses } from "@/domain/calculations/construction/plane-birdsmouth";
import { computeConstruction, previewPlaneBirdsmouths, constructionInputSnapshot, constructionOutputSnapshot, inputRecord, isFieldVisible, isSaveableComputation, isSaveableConstructionCalculator, materialStateFromSnapshot, roofGeometryTypeForDefinition, roofShapeOf } from "./construction-computation";
import { ConstructionSavePanel, newConstructionSession, savedInputComparison, type ConstructionPlanLinks, type ConstructionSaveSession } from "./construction-save-panel";
import { ConstructionFieldTransferControl } from "./construction-field-transfer-control";
import type { SavedConstructionCalculation, SavedConstructionRevision } from "@/features/calculations/construction-data";
import { stableJsonStringify } from "@/features/roof-models/stable-json";
import { initializeCalculatorDraft, mergeCalculatorDraft, replaceCalculatorDraft, updateCalculatorDraft, type CalculatorDrafts } from "./construction-drafts";
import { forgetWorkspace, rememberWorkspace, rememberedWorkspace, workspaceKey } from "./construction-workspace-memory";

const TechnicalDrawing = dynamic(() => import("@/features/roof-models/technical-drawing").then((module) => module.TechnicalDrawing), {
  ssr: false,
  loading: () => <div className="construction-calculator-drawing" role="status">Tetőrajz betöltése…</div>,
});

const RafterDetailDrawing = dynamic(() => import("./rafter-detail-drawing").then((module) => module.RafterDetailDrawing), {
  ssr: false,
  loading: () => <div className="construction-calculator-drawing" role="status">Szarufa-részlet betöltése…</div>,
});

const ConstructionStairDrawing = dynamic(() => import("./construction-visuals").then((module) => module.ConstructionStairDrawing), {
  loading: () => <div className="construction-calculator-drawing" role="status">Lépcsőrajz betöltése…</div>,
});
const ConstructionMaterialDrawing = dynamic(() => import("./construction-visuals").then((module) => module.ConstructionMaterialDrawing), {
  loading: () => <div className="construction-calculator-drawing" role="status">Geometriai rajz betöltése…</div>,
});

const nullableMm = (value: Record<string, unknown>, key: string) => value[key] === undefined || value[key] === null || value[key] === "" ? null : Number(value[key]);
const formatHuNumber = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);

const categoryOrder: readonly { id: ConstructionCalculatorCategory; label: string }[] = [
  { id: "roof", label: "Tetők és faszerkezetek" },
  { id: "stair", label: "Lépcsők" },
  { id: "concrete", label: "Betonozás és alapozás" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value);
}

function takeoffStatusLabel(status: RoofMaterialTakeoffStatus): string {
  if (status === "VALID") return "Megadott adatokkal számítható";
  if (status === "INCOMPLETE") return "További paraméter szükséges";
  if (status === "INVALID") return "Érvénytelen bemenet";
  return "A kiválasztott rész nem támogatott";
}

const SOURCE_LABEL = { product: "termék", override: "felülírva", manual: "kézi" } as const;
const MEANING_LABEL = { GEOMETRIC: "geometriai", LAYOUT: "kiosztási", NOMINAL: "névleges", PROCUREMENT: "beszerzési" } as const;

/** Every distinct limitation once; a message shared by all parts is listed under "Általános". */
export function limitationGroups(parts: readonly RoofMaterialTakeoff["parts"][number][]): { title: string; items: string[] }[] {
  const shared = parts[0].limitations.filter((item) => parts.every((part) => part.limitations.includes(item)));
  const groups = parts.map((part) => ({ title: part.label, items: [...new Set(part.limitations.filter((item) => !shared.includes(item)))] })).filter((group) => group.items.length > 0);
  return [...(shared.length > 0 ? [{ title: "Általános", items: shared }] : []), ...groups];
}

function CriticalWarnings({ parts }: Readonly<{ parts: RoofMaterialTakeoff["parts"] }>) {
  const warnings = roofTakeoffCriticalWarnings(parts);
  return warnings.length === 0 ? null : <ul className="material-takeoff-warnings" role="note" aria-label="Fontos korlátok">{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>;
}

function RoofMaterialTakeoffSummary({ takeoff }: Readonly<{ takeoff: RoofMaterialTakeoff }>) {
  const parts = takeoff.parts.filter((part) => part.requested && part.id !== "geometry");
  if (parts.length === 0) return null;
  const remainingReasons = takeoff.reasons.filter((reason) => !parts.some((part) => part.invalidInputs.some((message) => reason.endsWith(message))));
  return <section className="construction-suite-results construction-suite-material-summary" aria-live="polite">
    <h3>Összesített anyagkimutatás</h3>
    <p className="construction-suite-advisory">{takeoffStatusLabel(takeoff.status)}</p>
    <CriticalWarnings parts={takeoff.parts} />
    {parts.map((part) => {
      const spec = part.specification;
      const overridden = spec?.overriddenKeys.length ?? 0;
      return <div className="material-takeoff-part" key={part.id} data-status={part.status}>
        <h4>{part.label}{part.status !== "VALID" && part.status && <small>{takeoffStatusLabel(part.status)}</small>}</h4>
        {part.invalidInputs.map((reason) => <p className="material-takeoff-incomplete is-invalid" key={reason} role="alert">{reason}</p>)}
        {part.incompleteQuantities.map((item) => <p className="material-takeoff-incomplete" key={item.label} role="status"><strong>{item.label}: hiányos</strong> · {item.reason}</p>)}
        {part.quantities.length > 0 && <dl>{part.quantities.map((quantity) => <div key={quantity.label}><dt>{quantity.label} <small>{MEANING_LABEL[quantity.meaning]}</small></dt><dd>{formatNumber(quantity.value)} <span>{quantity.unit}</span></dd></div>)}</dl>}
        {spec && (spec.profile || Object.keys(spec.values).length > 0) && <p className="construction-suite-limit">{spec.profile ? `${spec.profile.label}${spec.profile.verification === "demo" ? " (DEMO)" : ""}${overridden > 0 ? ` · ${overridden} érték felülírva` : ""}` : "Kézi adat – nem gyártói ellenőrzött"}{" · "}{Object.entries(spec.sources).filter(([key]) => key !== "manufacturerConstraintReference").map(([, source]) => SOURCE_LABEL[source]).filter((label, index, all) => all.indexOf(label) === index).join(", ")}</p>}
      </div>;
    })}
    {takeoff.status !== "VALID" && remainingReasons.length > 0 && <ul className="construction-suite-limit">{remainingReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
    <details className="material-takeoff-limits"><summary>Korlátok és feltételezések</summary>
      {limitationGroups(parts).map((group) => <div key={group.title}><h5>{group.title}</h5><ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}
    </details>
  </section>;
}

function ConstructionDrawing({ definition, values, roofGeometry, timberLayout, underlayLayout, focusedDimension, activeDimensionDescription, onDimensionSelect }: { definition: CalculatorDefinition; values: Record<string, string>; roofGeometry: RoofGeometry | null; timberLayout?: RoofTimberLayout | null; underlayLayout?: RoofUnderlayLayout | null; focusedDimension?: string | null; activeDimensionDescription?: string; onDimensionSelect?: (key: string) => void }) {
  const dims = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, Number(value.replace(",", ".")) || 0]));
  const title = `${definition.reference.title} sematikus rajza`;
  if (roofGeometry) return <TechnicalDrawing geometry={roofGeometry} timberLayout={timberLayout} underlayLayout={underlayLayout} isSaved={false} compact heading={title} headingId="construction-roof-drawing-heading" activeDimension={focusedDimension} activeDimensionDescription={activeDimensionDescription} onDimensionSelect={onDimensionSelect} />;
  const lines = (points: string, key = "main") => <polyline key={key} points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />;
  let geometry;
  if (definition.reference.id === "roof.mansard") {
    geometry = <>{lines("55,175 120,113 250,72 380,113 445,175")}<line x1="55" y1="175" x2="445" y2="175" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" /><line x1="120" y1="113" x2="120" y2="175" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /><line x1="380" y1="113" x2="380" y2="175" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /></>;
  } else if (definition.reference.id === "roof.shed") {
    geometry = <>{lines("65,155 435,55")}<line x1="65" y1="155" x2="435" y2="155" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" /><line x1="435" y1="55" x2="435" y2="155" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" /></>;
  } else if (definition.reference.id === "roof.hip") {
    geometry = <><path d="M75 72 L330 72 L425 115 L170 115 Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M75 72 L170 115 L250 48 L330 72 M425 115 L330 72" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><line x1="170" y1="115" x2="330" y2="72" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" /></>;
  } else if (definition.draw === "rafter" || definition.draw === "diagonal") {
    geometry = <><path d="M85 165 L415 165 L415 60 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" /><path d="M395 165 L395 145 L415 145" fill="none" stroke="currentColor" strokeWidth="1.5" /><text x="250" y="184" textAnchor="middle" fill="currentColor" fontSize="12">a</text><text x="428" y="114" fill="currentColor" fontSize="12">b</text><text x="242" y="100" fill="currentColor" fontSize="12">{definition.draw === "rafter" ? "L" : "d"}</text></>;
  } else if (definition.draw === "roof" || definition.draw === "truss") {
    geometry = <>{lines("40,175 250,42 460,175")}<line x1="40" y1="175" x2="460" y2="175" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />{definition.draw === "truss" && <><line x1="145" y1="109" x2="355" y2="109" stroke="currentColor" strokeWidth="2" /><line x1="145" y1="109" x2="250" y2="42" stroke="currentColor" strokeWidth="2" /><line x1="355" y1="109" x2="250" y2="42" stroke="currentColor" strokeWidth="2" /></>}</>;
  } else if (definition.draw === "stairs" || definition.draw === "bevel") {
    geometry = lines("40,175 40,150 105,150 105,125 170,125 170,100 235,100 235,75 300,75 300,50 365,50 365,28 445,28");
  } else if (definition.draw === "spiral") {
    geometry = <><circle cx="250" cy="105" r="80" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="250" cy="105" r="24" fill="none" stroke="currentColor" strokeWidth="2" />{Array.from({ length: 9 }, (_, i) => <line key={i} x1="250" y1="105" x2={250 + 80 * Math.cos(i * Math.PI / 4)} y2={105 + 80 * Math.sin(i * Math.PI / 4)} stroke="currentColor" strokeWidth="1.5" />)}</>;
  } else if (definition.draw === "ring") {
    geometry = <><circle cx="250" cy="105" r="80" fill="none" stroke="currentColor" strokeWidth="3" /><circle cx="250" cy="105" r="52" fill="none" stroke="currentColor" strokeWidth="3" /></>;
  } else if (definition.draw === "mesh") {
    geometry = <><rect x="70" y="35" width="360" height="140" fill="none" stroke="currentColor" strokeWidth="2" />{Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={70 + i * 60} y1="35" x2={70 + i * 60} y2="175" stroke="currentColor" strokeWidth="1.5" />)}{Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1="70" y1={35 + i * 46} x2="430" y2={35 + i * 46} stroke="currentColor" strokeWidth="1.5" />)}</>;
  } else {
    geometry = <><rect x="90" y="60" width="320" height="110" fill="none" stroke="currentColor" strokeWidth="3" /><rect x="130" y="35" width="240" height="135" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 4" /></>;
  }
  const dimensionText = definition.draw === "rectangle" && dims.lengthMm > 0 ? `${formatNumber(mmToM(dims.lengthMm))} m` : definition.draw === "rafter" ? "Hosszak a szarufa felső éle mentén" : definition.draw === "diagonal" ? "d = √(a² + b²)" : definition.draw === "ring" ? "V = πh(R² − r²)" : definition.draw === "roof" ? "Tetőgeometria · keresztmetszet" : "Geometriai vázlat";
  return <figure className="construction-calculator-drawing"><svg viewBox="0 0 500 210" role="img" aria-label={title} className="construction-drawing-svg"><title>{title}</title>{geometry}<text x="250" y="202" textAnchor="middle" fill="currentColor" fontSize="14">{dimensionText}</text></svg><figcaption>{title}</figcaption></figure>;
}

const fieldValuesFrom = (definition: CalculatorDefinition, fields: Readonly<Record<string, string>> = {}) =>
  Object.fromEntries(definition.fields.map((field) => [field.key, fields[field.key] ?? field.initial ?? ""]));

function sessionFromSaved(saved: SavedConstructionCalculation): ConstructionSaveSession {
  const current = saved.revisions.find((revision) => revision.revisionNumber === saved.currentRevisionNumber)!;
  return { calculationId: saved.calculationId, name: saved.displayName, revisionNumber: saved.currentRevisionNumber, baselineInput: stableJsonStringify(current.input), savedName: saved.displayName, viewedRevisionNumber: saved.currentRevisionNumber, revisions: saved.revisions, hasOlderRevisions: saved.hasOlderRevisions, nextBeforeRevisionNumber: saved.nextBeforeRevisionNumber };
}

export function ConstructionCalculatorSuite({ initialCalculatorId = "roof.rafter-cut", catalogProfiles = [], catalogError = false, organizationId, userId, saved = null, planLinks = null }: Readonly<{ initialCalculatorId?: string; catalogProfiles?: readonly MaterialProfile[]; catalogError?: boolean; organizationId?: string; userId?: string; saved?: SavedConstructionCalculation | null; planLinks?: ConstructionPlanLinks | null }>) {
  const router = useRouter();
  const { requestConfirmation } = useAppInteraction();
  const profiles = useMemo(() => [...catalogProfiles, ...DEMO_MATERIAL_PROFILES], [catalogProfiles]);
  const initialId = initialConstructionCalculatorId(initialCalculatorId);
  const initialReference = constructionCalculatorCatalog.find((item) => item.id === initialId)!;
  const memoryKey = userId && organizationId ? workspaceKey(userId, organizationId, saved?.calculationId ?? null) : null;
  const recalled = memoryKey ? rememberedWorkspace(memoryKey) : null;
  const [category, setCategory] = useState<ConstructionCalculatorCategory>(() => recalled?.category ?? (initialReference.category === "auxiliary" ? "concrete" : initialReference.category));
  const [selectedId, setSelectedId] = useState(recalled?.selectedId ?? initialId);
  const [search, setSearch] = useState("");
  const [mobileSelectionOpen, setMobileSelectionOpen] = useState(false);
  const [drafts, setDrafts] = useState<CalculatorDrafts>(recalled?.drafts ?? {});
  const [lengthDrafts, setLengthDrafts] = useState<Record<string, Record<string, LengthFieldState>>>(recalled?.lengthDrafts ?? {});
  const [draftEpoch, setDraftEpoch] = useState(recalled?.draftEpoch ?? 0);
  const [dirtyDrafts, setDirtyDrafts] = useState<Record<string, boolean>>(recalled?.dirtyDrafts ?? {});
  const [savePending, setSavePending] = useState(false);
  const [focusedDimension, setFocusedDimension] = useState<string | null>(null);
  const [materialByCalculator, setMaterialByCalculator] = useState<Record<string, RoofMaterialUiState>>(recalled?.materialByCalculator ?? {});
  const [loadedDefinition, setLoadedDefinition] = useState<{ id: string; definition: CalculatorDefinition } | null>(null);
  const [loadErrorId, setLoadErrorId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [sessions, setSessions] = useState<Record<string, ConstructionSaveSession>>(() => recalled?.sessions ?? (saved ? { [saved.calculatorId]: sessionFromSaved(saved) } : {}));
  // M10 Fázis 0: "Adatok átvétele" forrás, csak a kalkulátorig, ameddig átvettük; nem memóriázott, munkamenet-szintű.
  const [transferSource, setTransferSource] = useState<{ calculatorId: string; revisionId: string } | null>(null);
  // The saved revision is applied once, when its calculator definition first loads; later prop updates only refresh the revision list.
  const pendingSavedInput = useRef(recalled ? null : saved?.revisions.find((revision) => revision.revisionNumber === saved.currentRevisionNumber) ?? null);
  const loadedCalculationId = useRef(saved?.calculationId ?? null);
  const locallySavedCalculationId = useRef<string | null>(null);
  const routeCalculatorId = useRef(initialCalculatorId);
  const loadGeneration = useRef(0);
  const persistedKey = useRef(memoryKey);
  const suppressedMemoryKey = useRef<string | null>(null);
  useEffect(() => {
    const nextId = saved?.calculationId ?? null;
    if (loadedCalculationId.current === nextId) return;
    const justSavedHere = loadedCalculationId.current === null && saved && locallySavedCalculationId.current === nextId;
    loadedCalculationId.current = nextId;
    routeCalculatorId.current = initialCalculatorId;
    locallySavedCalculationId.current = null;
    suppressedMemoryKey.current = null;
    if (justSavedHere) {
      if (memoryKey) {
        const previous = workspaceKey(userId!, organizationId!, null);
        const workspace = rememberedWorkspace(previous);
        if (workspace) rememberWorkspace(memoryKey, workspace);
      }
      return;
    }
    loadGeneration.current += 1;
    const remembered = memoryKey ? rememberedWorkspace(memoryKey) : null;
    const nextCalculatorId = remembered?.selectedId ?? initialConstructionCalculatorId(saved?.calculatorId ?? initialCalculatorId);
    const nextCategory = constructionCalculatorCatalog.find((item) => item.id === nextCalculatorId)!.category;
    setSelectedId(nextCalculatorId);
    setCategory(remembered?.category ?? (nextCategory === "auxiliary" ? "concrete" : nextCategory));
    setDrafts(remembered?.drafts ?? {});
    setLengthDrafts(remembered?.lengthDrafts ?? {});
    setDraftEpoch(remembered?.draftEpoch ?? 0);
    setDirtyDrafts(remembered?.dirtyDrafts ?? {});
    setMaterialByCalculator(remembered?.materialByCalculator ?? {});
    setSessions(remembered?.sessions ?? (saved ? { [saved.calculatorId]: sessionFromSaved(saved) } : {}));
    pendingSavedInput.current = remembered ? null : saved?.revisions.find((revision) => revision.revisionNumber === saved.currentRevisionNumber) ?? null;
    setLoadedDefinition(null);
    setLoadAttempt((attempt) => attempt + 1);
  }, [saved?.calculationId, initialCalculatorId, saved, memoryKey, userId, organizationId]);
  useLayoutEffect(() => {
    if (!memoryKey) return;
    if (persistedKey.current !== memoryKey) { persistedKey.current = memoryKey; return; }
    if (suppressedMemoryKey.current === memoryKey) return;
    rememberWorkspace(memoryKey, { selectedId, category, drafts, lengthDrafts, dirtyDrafts, materialByCalculator, sessions, draftEpoch });
  }, [memoryKey, selectedId, category, drafts, lengthDrafts, dirtyDrafts, materialByCalculator, sessions, draftEpoch]);
  useEffect(() => {
    if (routeCalculatorId.current === initialCalculatorId) return;
    routeCalculatorId.current = initialCalculatorId;
    if (saved) return;
    const nextId = initialConstructionCalculatorId(initialCalculatorId);
    setSelectedId(nextId);
    const nextCategory = constructionCalculatorCatalog.find((item) => item.id === nextId)!.category;
    setCategory(nextCategory === "auxiliary" ? "concrete" : nextCategory);
  }, [initialCalculatorId, saved]);
  const selectedReference = constructionCalculatorCatalog.find((item) => item.id === selectedId)!;
  const values = drafts[selectedId] ?? {};
  const definitionLoaded = loadedDefinition?.id === selectedId;
  const definition: CalculatorDefinition = definitionLoaded ? loadedDefinition.definition : {
    reference: selectedReference, fields: [], draw: "roof", note: "", calculate: () => [],
  };
  useEffect(() => {
    let current = true;
    const generation = loadGeneration.current;
    setLoadErrorId(null);
    void loadConstructionCalculatorDefinition(selectedId).then((next) => {
      if (!current || generation !== loadGeneration.current) return;
      if (!next) throw new Error(`No calculator definition for ${selectedId}`);
      setLoadedDefinition({ id: selectedId, definition: next });
      const savedRevision = pendingSavedInput.current?.input.calculatorId === selectedId ? pendingSavedInput.current : null;
      if (savedRevision) pendingSavedInput.current = null;
      setDrafts((current) => initializeCalculatorDraft(current, selectedId, fieldValuesFrom(next, savedRevision?.input.fields)));
      const savedMaterial = savedRevision && materialStateFromSnapshot(savedRevision.input);
      if (savedMaterial) setMaterialByCalculator((current) => ({ ...current, [selectedId]: savedMaterial }));
    }).catch(() => {
      if (current && generation === loadGeneration.current) setLoadErrorId(selectedId);
    });
    return () => { current = false; };
  }, [selectedId, loadAttempt]);
  const roofGeometryType = roofGeometryTypeForDefinition(definition, values);
  const activeGuide = roofGeometryType ? measurementGuideFor(roofGeometryType, focusedDimension ?? "") : null;
  const candidates = constructionCalculatorCatalog.filter((item) => item.category === category || (category === "concrete" && item.category === "auxiliary"));
  const filtered = candidates.filter((item) => item.title.toLocaleLowerCase("hu-HU").includes(search.trim().toLocaleLowerCase("hu-HU")));
  const isTakeoff = definition.reference.id === "roof.material-takeoff";
  const timberOnly = definition.reference.id === "roof.timber-cutlist";
  const usesMaterials = isTakeoff || timberOnly;
  const defaultMaterialState = useMemo(() => initialMaterialState(profiles, timberOnly), [profiles, timberOnly]);
  const materialState = materialByCalculator[selectedId] ?? defaultMaterialState;
  const calculation = useMemo(() => computeConstruction(definition, values, usesMaterials ? materialState : null, profiles), [definition, values, usesMaterials, materialState, profiles]);
  const { inputsReady, materialTakeoff, timberLayout, underlayLayout } = calculation;
  // M9.15.1: the Karmi detail without the rafter layout; display only, never saved or part of the completeness.
  const previewJoints = useMemo(() => calculation.birdsmouths ? null : previewPlaneBirdsmouths(definition, values, usesMaterials ? materialState : null, profiles, calculation.geometry), [calculation.birdsmouths, calculation.geometry, definition, values, usesMaterials, materialState, profiles]);
  const raw = useMemo(() => inputRecord(definition.fields, values), [definition.fields, values]);
  const overhangNotice = roofShapeOf(values) === "gable" && usesMaterials && [nullableMm(raw, "frontGableOverhangMm"), nullableMm(raw, "rearGableOverhangMm")].some((value) => overhangFromField(value).state === "not-provided");
  const selectCalculator = (item: ConstructionReference) => {
    if (item.status !== "verified" || savePending) return;
    if (item.id === selectedId) { setMobileSelectionOpen(false); return; }
    setSelectedId(item.id);
    setFocusedDimension(null);
    setMobileSelectionOpen(false);
  };
  const markDirty = () => setDirtyDrafts((current) => ({ ...current, [selectedId]: true }));
  const updateValue = (key: string, value: string) => {
    setDrafts((current) => updateCalculatorDraft(current, selectedId, key, value));
    markDirty();
  };
  // Turning the joint fields on from the drawing: the HAP field only exists after the re-render, so the jump waits for it.
  const [jumpToHap, setJumpToHap] = useState(false);
  const startRafterJoints = () => { updateValue("birdsmouth", "true"); setJumpToHap(true); };
  useEffect(() => {
    if (!jumpToHap) return;
    const field = document.getElementById("seatCutHeightMm");
    if (!field) return;
    setJumpToHap(false);
    field.closest("details")?.setAttribute("open", "");
    field.scrollIntoView({ block: "center", behavior: "smooth" });
    field.focus({ preventScroll: true });
  }, [jumpToHap, values]);
  const basicFields = definition.fields.filter((field) => !field.advanced && isFieldVisible(field, values));
  const connectionFields = definition.fields.filter((field) => isRafterConnectionField(field, selectedId) && (selectedId === "roof.rafter-cut" ? field.advanced : true) && isFieldVisible(field, values));
  const advancedFields = definition.fields.filter((field) => field.advanced && !isRafterConnectionField(field, selectedId) && isFieldVisible(field, values));
  const renderField = (field: Field) => {
    const isRequired = !field.advanced && field.initial === undefined && field.kind !== "checkbox";
    const isLength = !field.kind && field.unit === "mm";
    const helpId = field.help ? `${field.key}-help` : undefined;
    return <Fragment key={field.key}><label className={`construction-suite-field${field.kind === "checkbox" ? " is-checkbox" : ""}`}>
      <span>{field.label}{field.unit && !isLength && <small>{field.unit}</small>}</span>
      {isLength ? <LengthField key={`${selectedId}:${draftEpoch}:${field.key}`} id={field.key} label={field.label} describedBy={helpId} value={values[field.key] ?? ""} draftState={lengthDrafts[selectedId]?.[field.key]} onDraftStateChange={(state) => { setLengthDrafts((current) => ({ ...current, [selectedId]: { ...current[selectedId], [field.key]: state } })); if (state.text.trim() && !canonicalLength(state, { mmDecimals: field.integer ? 0 : 1 })) markDirty(); }} onChange={(value) => updateValue(field.key, value)} mmDecimals={field.integer ? 0 : 1} required={isRequired} placeholder={field.placeholder} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} /> : field.kind === "select" ? <select id={field.key} required={isRequired} value={values[field.key] ?? field.initial ?? ""} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} onChange={(event) => updateValue(field.key, event.target.value)} aria-label={field.label}>{field.initial === undefined && <option value="">Válasszon…</option>}{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : <input id={field.key} placeholder={field.placeholder} type={field.kind === "checkbox" ? "checkbox" : field.kind === "text" ? "text" : "number"} inputMode={field.kind === "text" ? "text" : field.kind === "checkbox" ? undefined : "decimal"} min={!field.kind ? "0" : undefined} step={field.integer ? "1" : "any"} required={isRequired} checked={field.kind === "checkbox" ? values[field.key] === "true" : undefined} value={field.kind === "checkbox" ? undefined : values[field.key] ?? ""} onFocus={() => setFocusedDimension(field.key)} onBlur={() => setFocusedDimension(null)} onChange={(event) => updateValue(field.key, field.kind === "checkbox" ? String(event.target.checked) : event.target.value)} aria-label={`${field.label}${field.unit ? `, ${field.unit}` : ""}`} />}
      {field.help && <small className="construction-suite-field-help" id={helpId}>{field.help}</small>}
    </label>{field.figure === "hap" && <HapMeasuringHelp />}{field.figure === "purlin" && <PurlinMeasuringHelp />}</Fragment>;
  };
  const headingContent = <header className="construction-suite-title"><div><p className="section-eyebrow">ELLENŐRZÖTT GEOMETRIAI SZÁMÍTÁS</p><h2>{definition.reference.title}</h2></div></header>;
  const noteContent = <><p className="construction-suite-note">{definition.note}</p>{activeGuide && <MeasurementGuidance compact guide={activeGuide} />}</>;
  const connectionGroups = [
    { title: "1. Talpszelemen és szarufa (Karmi)", joint: "seat", optional: false, keys: ["seatCutHeightMm", "rafterDepthMm", "plateWidthMm"] },
    { title: "2. Derékszelemen · opcionális", joint: "purlin", optional: true, keys: ["purlinFaceMm", "purlinTopMm"] },
    { title: "3. Gerinckapcsolat", joint: "ridge", optional: false, keys: ["ridgeJoint", "ridgeBoardThicknessMm", "ridgePurlinWidthMm", "ridgePurlinTopMm"] },
  ];
  // M9.15.1: per-section state from the joints that are already calculated (display only).
  const jointStatuses: readonly { joint: string; status: string }[] = calculation.rafterJoints ? calculation.rafterJoints.joints.map((joint) => ({ joint: joint.id, status: joint.status })) : planeJointStatuses(calculation.birdsmouths ?? previewJoints ?? []);
  const renderConnectionGroups = () => connectionGroups.map((group) => {
    const fields = connectionFields.filter((field) => group.keys.includes(field.key));
    if (!fields.length) return null;
    const state = jointGroupState(jointStatuses.filter((item) => item.joint === group.joint).map((item) => item.status), group.optional && !group.keys.some((key) => (values[key] ?? "").trim() !== ""));
    const body = <div className="construction-suite-form-grid">{fields.map(renderField)}</div>;
    const status = <p className={`construction-suite-joint-state is-${state.tone}`} role="status">{state.label}</p>;
    return group.optional
      ? <div className="construction-suite-connection-step" key={group.title}><GlassDisclosure summary={group.title} defaultOpen={group.keys.some((key) => (values[key] ?? "").trim() !== "")}>{status}{body}</GlassDisclosure></div>
      : <div className="construction-suite-connection-step" key={group.title}><h4>{group.title}</h4>{status}{body}</div>;
  });
  const connectionFieldsContent = usesMaterials && connectionFields.length > 0 && <section className="construction-suite-connections is-flat" aria-labelledby="rafter-connections-heading">
    <h3 id="rafter-connections-heading">Szarufák és bevágások</h3>
    <FeatureToggle id="birdsmouth" title="Karmi és csatlakozások" hint="Szarufabevágások, szelemen- és gerinckapcsolatok méretezése." checked={values.birdsmouth === "true"} onChange={(checked) => updateValue("birdsmouth", String(checked))} />
    <>{values.birdsmouth === "true" && <><RafterMaterialSpecInput profiles={profiles} catalogError={catalogError} state={materialState.specs.rafter} jointsOn onChange={(next) => { setMaterialByCalculator((current) => ({ ...current, [selectedId]: { ...materialState, specs: { ...materialState.specs, rafter: next } } })); markDirty(); }} /><p className="construction-suite-field-help">A bevágási rajz a „Szarufa vágásai” nézetben jelenik meg; a szarufaosztás külön, az Anyagszükséglet alatt kérhető.</p></>}{values.birdsmouth === "true" && renderConnectionGroups()}</>
  </section>;
  const fieldsContent = <>
    {selectedId === "roof.rafter-cut" ? <section className="construction-suite-connections" aria-labelledby="rafter-connections-heading"><h3 id="rafter-connections-heading">Szarufák és bevágások</h3><p className="construction-suite-field-help">A tetőgeometria és a HAP megadása a szarufa alapméreteinek része; a keresztmetszet és a további csatlakozási méretek opcionálisak.</p><div className="construction-suite-form-grid">{basicFields.map(renderField)}</div>{renderConnectionGroups()}</section> : <div className="construction-suite-form-grid">{basicFields.map(renderField)}</div>}
    {usesMaterials && connectionFieldsContent}
    {usesMaterials && <RoofMaterialInputs timberOnly={timberOnly} profiles={profiles} catalogError={catalogError} state={materialState} jointsOn={values.birdsmouth === "true"} rafterSpecInConnections={values.birdsmouth === "true"} onChange={(next) => { setMaterialByCalculator((current) => ({ ...current, [selectedId]: next })); markDirty(); }} />}
    {advancedFields.length > 0 && <GlassDisclosure className="construction-suite-advanced" summary="Részletes számítás · opcionális">{definition.advancedHelp && <p className="construction-suite-note">{definition.advancedHelp}</p>}{!definition.advancedHelp && <p className="construction-suite-note">Ezek az adatok további mennyiségi eredményt vagy ellenőrzést kapcsolnak be. Az alapgeometriai számításhoz nem szükségesek.</p>}<div className="construction-suite-form-grid">{advancedFields.map(renderField)}</div></GlassDisclosure>}
  </>;
  // Joint values are saved with the result lines but shown in their own section.
  const jointLabels = new Set(calculation.rafterJoints?.joints.flatMap((joint) => joint.values.map((item) => `${joint.title} · ${item.label}`)) ?? []);
  const resultRows = calculation.rows.filter((line) => !jointLabels.has(line.label));
  const primaryRows = resultRows.slice(0, 6);
  const detailRows = resultRows.slice(6);
  const stepRuleLine = calculation.rows.find((line) => line.label.startsWith("2 × fellépő"));
  const stepRuleValue = typeof stepRuleLine?.value === "number" ? stepRuleLine.value : null;
  const echoedInputs = definition.fields.filter((field) => isFieldVisible(field, values) && (values[field.key] ?? "").trim() !== "" && field.kind !== "checkbox");
  const cutList = calculation.cutList;
  const limitations = calculation.completeness.limitations;
  const completenessTitle = calculation.completeness.status === "complete" ? limitations.length ? "Teljes eredmény a támogatott csatlakozásokra · dokumentált korláttal" : "Teljes kalkulációs eredmény"
    : calculation.completeness.status === "incomplete" ? "Hiányos kalkuláció" : "Nem számítható";
  const completenessCopy = calculation.completeness.status === "complete"
    ? "A kért kalkulátoreredmény elkészült. Ez nem statikai, gyártói vagy kivitelezési jóváhagyás."
    : calculation.completeness.status === "incomplete"
      ? "A már számítható részértékek előnézetek; teljes eredményként nem menthetők és nem adhatók tovább."
      : "Az érintett eredmény és rajz nem használható. Javítsd a hibás vagy nem támogatott adatot.";
  const cutListSection = (title: string, rows: readonly { lengthMm: number; count: number }[]) => rows.length === 0 ? null
    : <div key={title}><h4>{title}</h4><ol className="construction-suite-cut-list">{rows.map((row, index) => <li key={row.lengthMm}><span>{index + 1}.</span><strong>{formatNumber(row.lengthMm)} mm</strong><span>{row.count} db</span></li>)}</ol></div>;
  // M9.15.3: the Karmi preview and the material takeoff are two functions with their own state (display only).
  const karmiOn = usesMaterials && values.birdsmouth === "true";
  const karmiState = karmiOn ? karmiStatusText(jointStatuses.filter((item) => item.joint === "seat") as readonly { status: string; missing?: readonly string[]; reason?: string }[], Boolean(calculation.birdsmouths ?? previewJoints)) : null;
  const materialRequested = timberOnly || Object.values(materialState.requested).some(Boolean);
  const materialText = !usesMaterials ? null : !materialRequested ? "Anyagmennyiségi számításhoz válassz anyagcsoportot."
    : calculation.completeness.status === "complete" ? "Az anyagkimutatás elkészült." : "Az anyagkimutatás még nem teljes: lásd az alábbi állapotot.";
  const featureStatus = usesMaterials && (karmiState || materialText) ? <section className="construction-suite-feature-status" aria-label="Funkciók állapota">
    {karmiState && <p className={`construction-suite-joint-state is-${karmiState.tone}`}><strong>Karmi és csatlakozások</strong> {karmiState.label}</p>}
    {materialText && <p className="construction-suite-joint-state"><strong>Anyagszükséglet</strong> {materialText}</p>}
  </section> : null;
  const statusContent = <>
    {featureStatus}
    <section className={`form-message${calculation.completeness.status === "invalid" || calculation.completeness.status === "unsupported" ? " is-error" : ""}`} role={calculation.completeness.status === "invalid" || calculation.completeness.status === "unsupported" ? "alert" : "status"}>
      <strong>{completenessTitle}</strong> · {completenessCopy}
      {calculation.completeness.status !== "complete" && calculation.completeness.reasons.length > 0 && <ul>{calculation.completeness.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      {limitations.length > 0 && <GlassDisclosure summary={`Nem alkalmazható vagy nem támogatott csatlakozás · ${limitations.length} tétel`}><p className="construction-suite-limit">A mentett eredményben is rögzítve:</p><ul>{limitations.map((item) => <li key={item}>{item}</li>)}</ul></GlassDisclosure>}
    </section>
    {inputsReady && calculation.error && <p className="form-message is-error" role="alert">{calculation.error}</p>}
  </>;
  const echoContent = <>
    {inputsReady && echoedInputs.length > 0 && <section className="construction-suite-echo"><h3>Kiindulási adatok</h3><dl>{echoedInputs.map((field) => <div key={field.key}><dt>{field.label}{field.help && <small className="construction-suite-field-help">{field.help}</small>}</dt><dd>{field.kind === "select" ? field.options?.find((option) => option.value === values[field.key])?.label ?? values[field.key] : values[field.key]} {field.unit && <span>{field.unit}</span>}</dd></div>)}</dl></section>}
  </>;
  const primaryContent = <>
    {primaryRows.length > 0 && !isTakeoff && <section className="construction-suite-results" aria-live="polite"><h3>Fő eredmények</h3><dl>{primaryRows.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? formatNumber(line.value) : line.value} {line.unit && <span>{line.unit}</span>}</dd></div>)}</dl>{stepRuleValue !== null && <p className="construction-suite-advisory">A számított 2R+G érték {formatHuNumber(stepRuleValue)} mm, {stepRuleValue < 600 || stepRuleValue > 660 ? "a közölt 600–660 mm-es referencia-tartományon kívül esik" : "a közölt 600–660 mm-es referencia-tartományon belül van"}. Ez csak számtani összevetés; nem ergonómiai minősítés és nem szabványi megfelelőség.</p>}<p className="construction-suite-limit">{definition.reference.limitation}</p></section>}
  </>;
  const detailRowList = detailRows.length > 0 ? <dl>{detailRows.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? formatNumber(line.value) : line.value} {line.unit && <span>{line.unit}</span>}</dd></div>)}</dl> : null;
  const resultsContent = <>
    {statusContent}
    {echoContent}
    {calculation.geometry && <><RoofGeometryResults geometry={calculation.geometry} heading="Geometriai eredmények" provenanceLabel="Kézi bemenetek · számított geometriai eredmények." />{overhangNotice && <p className="construction-suite-limit">Homlokzati kiülés nincs megadva · 0 mm-rel számolva. Add meg a „Részletes számítás” alatt, ha a tető túlnyúlik a homlokzaton.</p>}{isTakeoff && materialTakeoff && <RoofMaterialTakeoffSummary takeoff={materialTakeoff} />}</>}
    {timberOnly && materialTakeoff && <CriticalWarnings parts={materialTakeoff.parts} />}
    {timberOnly && materialTakeoff?.parts.map((part) => part.invalidInputs.map((reason) => <p className="form-message is-error" role="alert" key={`${part.id}${reason}`}>{part.label}: {reason}</p>))}
    {primaryContent}
    {calculation.rafterJoints && <RafterJointsPanel joints={calculation.rafterJoints} />}
    {cutList && (cutList.rafters.length > 0 || cutList.battens.length > 0) && <section className="construction-suite-results construction-suite-cut-lists"><h3>Vágáslista</h3>{cutListSection("Szarufák", cutList.rafters)}{cutListSection("Lécek", cutList.battens)}<p className="construction-suite-limit">Névleges geometriai hosszak, vágási ráhagyás és toldás nélkül.</p></section>}
    {primaryRows.length === 0 && !isTakeoff && calculation.geometry !== null && <p className="construction-suite-limit">{definition.reference.limitation}</p>}
    {detailRowList && <GlassDisclosure className="construction-suite-result-details" summary={`Részletes eredmények · ${detailRows.length}`}>{detailRowList}</GlassDisclosure>}
  </>;
  // Material takeoff: only when rafters are requested; the timber cut list always lays out rafters.
  const rafterInput = calculation.takeoffInputs?.timber?.rafter;
  const sectionWidthMm = rafterInput?.sectionWidthMm, sectionHeightMm = rafterInput?.sectionHeightMm;
  const rafterSection = useMemo(() => sectionWidthMm && sectionHeightMm ? { widthMm: sectionWidthMm, heightMm: sectionHeightMm } : null, [sectionWidthMm, sectionHeightMm]);
  const showsRafters = (timberOnly || (isTakeoff && materialState.requested.timber)) && calculation.geometry !== null;
  const rafterSpatial = !showsRafters || !calculation.geometry ? null : timberLayout?.rafters ? <RafterDetailDrawing geometry={calculation.geometry} timberLayout={timberLayout} section={rafterSection} />
    : <section className="technical-drawing is-compact rafter-detail" role="status"><div className="technical-drawing-header"><h2>Szarufatengelyek · térbeli közeli nézet</h2></div><p className="construction-suite-limit">{materialTakeoff?.timber.status === "unavailable" && rafterInput ? `A szarufa-részlet nem rajzolható: ${materialTakeoff.timber.reason}` : "A szarufa-részlethez adj meg érvényes legnagyobb szarufa-tengelytávolságot."}</p></section>;
  const drawingContent = calculation.geometry !== null || calculation.rows.length > 0
    ? definition.reference.category === "stair"
      ? <ConstructionStairDrawing referenceId={definition.reference.id} values={values} focusedDimension={focusedDimension} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
      : definition.reference.category === "concrete" || definition.reference.category === "auxiliary"
        ? <ConstructionMaterialDrawing referenceId={definition.reference.id} values={values} focusedDimension={focusedDimension} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
      : calculation.rafterJoints ? <RafterJointDrawing joints={calculation.rafterJoints} />
      : <ConstructionDrawing definition={definition} values={values} roofGeometry={calculation.geometry} timberLayout={timberLayout} underlayLayout={underlayLayout} focusedDimension={focusedDimension} activeDimensionDescription={activeGuide?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />
    : undefined;
  // M9.8: the roof calculators' drawings are one switchable panel, so every view is one tap away on any screen.
  const laidOutRafters = showsRafters && Boolean(timberLayout?.rafters) && calculation.geometry !== null;
  const roofViews: RoofDrawingView[] = [];
  if (laidOutRafters && timberLayout && calculation.geometry) roofViews.push({
    id: "cuts", label: "Szarufa vágásai",
    hint: "A szarufa függőleges keresztmetszete a talpszelemennel, a szelemenekkel és a gerinccel: hol van a jelölés, mekkora a függővágás és az ülék. Válassz csatlakozást a részletrajzhoz.",
    content: calculation.birdsmouths
      ? <RoofJointDrawing planes={calculation.birdsmouths} physicalReason={timberLayout.physicalLayout.status === "unsupported" ? timberLayout.physicalLayout.reason : null} hipOrValley={calculation.geometry.edges.some((edge) => edge.kind === "hip" || edge.kind === "valley")} />
      : <RafterJointsInvitation onEnable={startRafterJoints} />,
  });
  else if (previewJoints && calculation.geometry) roofViews.push({
    id: "cuts", label: "Szarufa vágásai",
    hint: "A szarufa függőleges keresztmetszete a talpszelemennel és a gerinccel, a szarufaosztás nélkül: a bevágás mérete a tetősík hajlásából és a megadott adatokból adódik. Válassz csatlakozást a részletrajzhoz.",
    content: <RoofJointDrawing planes={previewJoints} physicalReason={null} hipOrValley={calculation.geometry.edges.some((edge) => edge.kind === "hip" || edge.kind === "valley")} />,
  });
  if (laidOutRafters && timberLayout && calculation.geometry) roofViews.push({
    id: "layout", label: "Szarufaosztás",
    hint: "A tetősík valódi méretű kiterítése a geometriai szarufavonalakkal: sorszám, osztás, hossz és a két vég vágása. Tetősíkot a rajz fejlécében válthatsz.",
    content: <RafterLayoutDrawing geometry={calculation.geometry} timberLayout={timberLayout} birdsmouths={calculation.birdsmouths} />,
  });
  if (rafterSpatial) roofViews.push({
    id: "spatial", label: "Térbeli részlet",
    hint: "A szarufatengelyek térbeli közeli nézete a megadott keresztmetszettel. Tájékozódásra, nem méretezésre.",
    content: rafterSpatial,
  });
  if (drawingContent !== undefined) roofViews.push({
    id: "shape", label: "Tetőforma",
    hint: "A teljes tető geometriai rajza a megadott méretekkel. A rajz alatt nézetet és rétegeket is válthatsz.",
    content: <ConstructionDrawing definition={definition} values={values} roofGeometry={calculation.geometry} timberLayout={timberLayout} underlayLayout={underlayLayout} focusedDimension={focusedDimension} activeDimensionDescription={activeGuide?.meaning} onDimensionSelect={(key) => document.getElementById(key)?.focus()} />,
  });
  const roofDrawings = drawingContent === undefined ? null : <RoofDrawingViews views={roofViews} />;
  const rafterCutFlow = calculation.rafterJoints ? <RafterCutFlow status={statusContent} drawing={drawingContent} main={primaryContent} limits={<RafterJointsPanel joints={calculation.rafterJoints} />}
    details={echoedInputs.length > 0 || detailRowList ? <>{echoContent}{detailRowList}</> : null} /> : null;
  const canSave = Boolean(organizationId) && definitionLoaded && isSaveableConstructionCalculator(selectedId);
  const storedSession = sessions[selectedId];
  const fallbackSession = useMemo(() => newConstructionSession(selectedReference.title), [selectedReference.title]);
  const baseSession = storedSession ?? fallbackSession;
  const session = saved && saved.calculationId === baseSession.calculationId ? (() => {
    const byId = new Map(saved.revisions.map((revision) => [revision.revisionId, revision]));
    baseSession.revisions.forEach((revision) => byId.set(revision.revisionId, revision));
    const paginatedSession = baseSession.nextBeforeRevisionNumber === undefined ? { hasOlderRevisions: saved.hasOlderRevisions, nextBeforeRevisionNumber: saved.nextBeforeRevisionNumber } : { hasOlderRevisions: baseSession.hasOlderRevisions, nextBeforeRevisionNumber: baseSession.nextBeforeRevisionNumber };
    return { ...baseSession, revisions: [...byId.values()].sort((a, b) => b.revisionNumber - a.revisionNumber), ...paginatedSession };
  })() : baseSession;
  const snapshotInput = useMemo(() => constructionInputSnapshot(definition, values, usesMaterials ? materialState : null), [definition, values, usesMaterials, materialState]);
  const liveOutput = useMemo(() => constructionOutputSnapshot(selectedId, calculation), [selectedId, calculation]);
  const baseline = savedInputComparison(definition, session);
  const activeDirty = session.revisionNumber > 0 && (baseline.incompatible || stableJsonStringify(snapshotInput) !== baseline.baseline || session.name.trim() !== session.savedName);
  const anyDraftDirty = Object.values(dirtyDrafts).some(Boolean);
  const discardMemory = useCallback(() => { if (memoryKey) forgetWorkspace(memoryKey); }, [memoryKey]);
  useUnsavedChangeGuard({ dirty: anyDraftDirty, discard: discardMemory });
  const loadRevision = async (revision: SavedConstructionRevision) => {
    if (savePending) return;
    if ((dirtyDrafts[selectedId] || activeDirty) && !await requestConfirmation({ title: "Mentetlen módosítások", message: "A kiválasztott mentett revízió betöltése felülírja ennek a kalkulátornak a jelenlegi, nem mentett adatait.", cancelLabel: "Maradok", actions: [{ label: "Revízió betöltése", tone: "danger", run: () => undefined }] })) return;
    setDrafts((current) => replaceCalculatorDraft(current, selectedId, fieldValuesFrom(definition, revision.input.fields)));
    setLengthDrafts((current) => ({ ...current, [selectedId]: {} }));
    setDraftEpoch((epoch) => epoch + 1);
    const revisionMaterial = materialStateFromSnapshot(revision.input);
    setMaterialByCalculator((current) => ({ ...current, [selectedId]: revisionMaterial ?? initialMaterialState(profiles, timberOnly) }));
    setDirtyDrafts((current) => ({ ...current, [selectedId]: false }));
    setSessions((current) => ({ ...current, [selectedId]: { ...session, viewedRevisionNumber: revision.revisionNumber } }));
  };
  const startNewCalculation = async () => {
    if (savePending) return;
    if ((anyDraftDirty || activeDirty) && !await requestConfirmation({ title: "Új kalkuláció", message: "Az új kalkuláció indítása elveti a munkamenet összes mentetlen kalkulátoradatát.", cancelLabel: "Maradok", actions: [{ label: "Új kalkuláció indítása", tone: "danger", run: () => undefined }] })) return;
    suppressedMemoryKey.current = saved ? memoryKey : null;
    discardMemory();
    if (userId && organizationId) forgetWorkspace(workspaceKey(userId, organizationId, null));
    setDrafts(definitionLoaded ? { [selectedId]: fieldValuesFrom(definition) } : {});
    setLengthDrafts({});
    setDraftEpoch((epoch) => epoch + 1);
    setMaterialByCalculator({});
    setDirtyDrafts({});
    setSessions({});
    pendingSavedInput.current = null;
    if (saved && organizationId) router.replace(`/kalkulatorok?organization=${encodeURIComponent(organizationId)}&calculator=${encodeURIComponent(selectedId)}`, { scroll: false });
  };
  const canTransferFields = (selectedId === "roof.material-takeoff" || selectedId === "roof.timber-cutlist");
  const independentContent = canSave && organizationId
    ? <>
      {canTransferFields && <ConstructionFieldTransferControl organizationId={organizationId} fields={definition.fields} currentFields={drafts[selectedId] ?? {}}
        onApply={(fields, revisionId) => { setDrafts((current) => mergeCalculatorDraft(current, selectedId, revisionId ? { ...fields, birdsmouth: "true" } : fields)); setDraftEpoch((epoch) => epoch + 1); setDirtyDrafts((current) => ({ ...current, [selectedId]: true })); setTransferSource(revisionId ? { calculatorId: selectedId, revisionId } : null); }} />}
      <ConstructionSavePanel organizationId={organizationId} calculatorId={selectedId} definition={definition} session={session} input={snapshotInput} liveOutput={liveOutput} saveable={isSaveableComputation(calculation)} onDiscard={discardMemory}
        onSessionChange={(next) => { if (next.revisionNumber > session.revisionNumber) locallySavedCalculationId.current = next.calculationId; setSessions((current) => ({ ...current, [selectedId]: next })); setDirtyDrafts((current) => ({ ...current, [selectedId]: next.revisionNumber > session.revisionNumber ? false : next.name.trim() !== session.savedName || Boolean(current[selectedId]) })); }} onLoadRevision={loadRevision} onPendingChange={setSavePending}
        planLinks={saved && saved.calculationId === session.calculationId ? planLinks : null} planLinksUnavailable={Boolean(saved && saved.calculationId === session.calculationId && planLinks === null)}
        sourceCalculationRevisionId={transferSource?.calculatorId === selectedId ? transferSource.revisionId : null} onSourceConsumed={() => setTransferSource(null)} />
    </>
    : <p className="construction-suite-independent">Az eredmény helyi előnézet. Nem mentődik ügyfélhez, projekthez, felméréshez, anyaglistához, munkanaplóhoz vagy ajánlathoz.</p>;
  const workspace = !definitionLoaded
    ? <div className="construction-suite-workspace is-loading" role={loadErrorId === selectedId ? "alert" : "status"} aria-live="polite">
      {loadErrorId === selectedId
        ? <><p>A kalkulátor nem tölthető be.</p><button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>Újrapróbálás</button></>
        : <p>A kalkulátor betöltése…</p>}
    </div>
    : roofGeometryType
    ? <RoofWorkspace className="construction-suite-workspace" label="Tetőgeometriai kalkulátor munkaterület" context={<>{headingContent}{noteContent}</>} measurements={fieldsContent} results={<>{resultsContent}{roofDrawings}</>} actions={independentContent} />
    : rafterCutFlow ? <div className="construction-suite-workspace">{headingContent}{noteContent}{fieldsContent}{rafterCutFlow}{independentContent}</div>
    : <div className="construction-suite-workspace">{headingContent}{noteContent}{fieldsContent}{definition.reference.category === "stair" && drawingContent}{resultsContent}{definition.reference.category !== "stair" && drawingContent}{independentContent}</div>;

  const renderCalculatorOption = (item: ConstructionReference) => {
    const available = item.status === "verified";
    return <button key={item.id} type="button" disabled={!available || savePending} aria-pressed={available ? selectedId === item.id : undefined} aria-label={available ? item.title : `${item.title}. Jelenleg nem érhető el számítás.`} title={available ? item.title : "A számításhoz még nincs függetlenül ellenőrzött geometriai motor."} className={`${selectedId === item.id ? "is-active" : ""}${available ? "" : " is-unavailable"}`} onClick={() => selectCalculator(item)}>
      <ConstructionCalculatorThumbnail id={item.id} />
      <span className="construction-suite-option-copy"><span>{item.title}</span>{!available && <small>Nincs ellenőrzött számítás</small>}</span>
    </button>;
  };
  const searchField = <label className="construction-suite-search"><Search aria-hidden="true" /><span className="sr-only">Kalkulátor keresése</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Kalkulátor keresése" type="search" /></label>;
  const optionList = <div className="construction-suite-options">{filtered.map(renderCalculatorOption)}{filtered.length === 0 && <p className="construction-suite-empty">Nincs ilyen kalkulátor.</p>}</div>;

  return <section className="construction-suite" aria-label="Önálló építési kalkulátorok">
    <button type="button" className="secondary-button" disabled={savePending} onClick={() => void startNewCalculation()}>Új kalkuláció</button>
    <div className="construction-suite-category-tabs" role="tablist" aria-label="Kalkulátorkategória">
      {categoryOrder.map((item) => <button key={item.id} type="button" role="tab" disabled={savePending} aria-selected={category === item.id} className={category === item.id ? "is-active" : ""} onClick={() => { setCategory(item.id); setSearch(""); const first = constructionCalculatorCatalog.find((reference) => (reference.category === item.id || (item.id === "concrete" && reference.category === "auxiliary")) && reference.status === "verified"); if (first) selectCalculator(first); }}>{item.label}</button>)}
    </div>
    <div className="construction-suite-layout">
      <aside className="construction-suite-list" aria-label="Kalkulátor kiválasztása">
        <p className="construction-suite-list-label">Kalkulátorok</p>
        {searchField}
        {optionList}
      </aside>
      <div className="construction-suite-mobile-picker">
        <button type="button" className="construction-suite-mobile-trigger" aria-expanded={mobileSelectionOpen} onClick={() => setMobileSelectionOpen((open) => !open)}>
          <ConstructionCalculatorThumbnail id={selectedId} /><span><strong>Kalkulátor váltása</strong></span><ChevronDown aria-hidden="true" className={mobileSelectionOpen ? "is-open" : ""} />
        </button>
        {mobileSelectionOpen && <div className="construction-suite-mobile-options" aria-label="Kalkulátor kiválasztása">{searchField}{optionList}</div>}
      </div>
      {workspace}
    </div>
  </section>;
}
