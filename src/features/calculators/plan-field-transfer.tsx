"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CircleCheck, Crop, FileUp, FolderOpen, Download, ListChecks, Plus, RotateCw, ScanText, Trash2, TriangleAlert, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { recognizeImage, recognizePdfPage } from "@/infrastructure/drawings/ocr";
import { processPdfDocument } from "@/infrastructure/drawings/pdf-text-extractor";
import { renderPdfPage } from "@/infrastructure/drawings/pdf-preview";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";
import type { LengthUnit } from "@/domain/measurements/length-input";
import type { CalculatorDefinition } from "./construction-calculator-types";
import type { RoofMaterialUiState } from "./material-spec-editor";
import type { MaterialProfile } from "@/domain/calculations/roof-material-spec";
import type { LengthFieldState } from "@/components/ui/length-field";
import { approveDrawingFields, classifyDrawingPlan, drawingAssumptionToken, drawingOverhangLimitation, drawingPlanKindChoices, drawingPlanWarnings, drawingQuickScopeIssue, inactiveDrawingTakeoffScope, isPercentSlopeForPitch, noDrawingAssumptionConfirmations, unconfirmedDrawingAssumptions, missingRequiredDrawingFields, requiresRoofGeometryConfirmation, revokeApprovedDrawingValues, suggestRafterCutField, type DrawingFieldProposal, type DrawingPlanAnswer, type DrawingTakeoffScope, supportsRoofSectionScope } from "./drawing-field-transfer";
import { isUnitlessDrawingMeasurement, singleNumberFrom, suggestDrawingValue } from "./drawing-value-suggestion";
import type { ConstructionComputation } from "./construction-computation";
import { decideQuickTransfer, hasSplitPowerSuffix, numericSourcesAt, quickTransferFields, quickTransferUndoState, type QuickTransferDecision, type QuickTransferRecord } from "./drawing-quick-transfer";
import { drawingSteps, nextDrawingStep, type DrawingStepId } from "./drawing-step-bar";
import { drawingResultStrip } from "./drawing-result-strip";
import { hasPageArea, pagePointFromViewport, rectangleForPoints, viewportPointFromPage } from "./drawing-roof-section";
import { createRoofSection, drawingCoverageLabel, removeRoofSection, restoreRoofSection, updateRoofSection, type DrawingRoofSection } from "./drawing-roof-sections";
import { activeMeasurementLink, CALIBRATION_MIN_SEGMENT_POINTS, calibrationIssueMessages, calibrationStep, calibrationStepHints, canonicalPageSize, distanceInPoints, lengthToMm, measureMm, measurementConflict, settledUnit, unitEvidence } from "./drawing-calibration";
import type { DrawingDocument } from "./use-drawing-document";
import { useRoofWorkSessionStore, type RoofWorkSessionOwner } from "./use-roof-work-session-store";
import type { StoredRoofWorkSession } from "./drawing-session-retention";
import { createRoofWorkSessionJson, parseRoofWorkSessionJson, rebindRoofWorkSessionSource, roofWorkSectionHasInvalidInput, sha256Hex, type RoofWorkSessionInput } from "./drawing-roof-work-session";

type Entry = DrawingFieldProposal & Readonly<{ sourceDocumentId: string; sourceText: string; method: string; pageNumber: number; position: DrawingTextSource["position"]; bounds: DrawingTextSource["bounds"]; sourceUnit?: string; unitOrigin?: "pdf" | "user"; ruleId?: string; suggestedFieldKey?: string; overwrite: boolean; measurementOverride?: boolean; semanticOverride?: boolean }>;
type PendingQuickTransfer = Readonly<{ source: DrawingTextSource; fieldKey: string; previous: string; decision: Extract<QuickTransferDecision, { kind: "confirm" }> }>;
const imageTypes = ["image/jpeg", "image/png", "image/webp"];
export type SectionData = Readonly<{ fields: Record<string, string>; materials: RoofMaterialUiState; lengthDrafts: Record<string, LengthFieldState>; approvedEntries: Entry[]; assumptionConfirmations?: Readonly<Record<string, string>> }>;
type Props = Readonly<{
  definition: CalculatorDefinition;
  current: Record<string, string>;
  calculation: ConstructionComputation;
  wholeRoofConfirmed: boolean;
  materials: RoofMaterialUiState;
  initialMaterials: RoofMaterialUiState;
  profiles: readonly MaterialProfile[];
  lengthDrafts: Record<string, LengthFieldState>;
  onApply: (fields: Record<string, string>) => void;
  onSectionActivate: (data: SectionData) => void;
  onScopeChange: (scope: DrawingTakeoffScope) => void;
  onWholeRoofChange: (confirmed: boolean) => void;
  /**
   * S1 (T7 előfeltétel): a kalkulátor saját mezőrendelője, hogy egy hiányzó értéket a rajz mellett is meg lehessen
   * adni, ne csak a lenti űrlapon. A hívó gondoskodik arról, hogy itt ne keletkezzen a lenti űrlapéval ütköző `id`.
   * Hiányában a panel pontosan úgy viselkedik, mint eddig.
   */
  renderField?: (field: CalculatorDefinition["fields"][number]) => ReactNode;
  /** Melyik mezőt kéri be itt a vezetett bevitel; a szülő dönti el (`guidedDrawingFieldKey`), a panel nem találgat. */
  cededFieldKey?: string;
  /**
   * S4: a dokumentum-, oldal- és szakaszgeometriai állapot, a kalkulátort túlélő szülő tulajdonában. A panelt a hívó
   * továbbra is `key={selectedId}`-vel rendereli, így a kalkulátorspecifikus és átmeneti állapot itt bent nullázódik.
   */
  doc: DrawingDocument<SectionData>;
  /** T10: a „Rajzból indítok" belépési pont nyitja ki a panelt. A P1.5/T2 mintára ez is csak nyit, sosem zár. */
  openPanel?: boolean;
  /**
   * P3.3d: a mentési állapot olvasó propja a lépéssáv „Mentés" lépéséhez. Szándékosan szűk: a sáv csak jelenti,
   * hogy van-e mentett revízió és módosult-e azóta. A mentési kapu, a név és a konfliktuskezelés a mentési panelé.
   */
  save?: Readonly<{ revisionNumber: number; dirty: boolean }>;
  /**
   * A1: kié a helyben megőrzött rajzos munkamenet. Hiányában (bejelentkezés nélkül) a megőrzés egyszerűen
   * nem működik — a rekordok felhasználóhoz és szervezethez kötöttek.
   */
  owner?: RoofWorkSessionOwner | null;
}>;

export function PlanFieldTransfer({ definition, current, calculation, wholeRoofConfirmed, materials, initialMaterials, profiles, lengthDrafts, onApply, onSectionActivate, onScopeChange, onWholeRoofChange, renderField, cededFieldKey = "", doc, openPanel = false, save, owner = null }: Props) {
  const { requestConfirmation } = useAppInteraction();
  /**
   * S3/S4: a dokumentum-, oldal- és szakaszgeometriai állapot tulajdonosa a kalkulátort túlélő szülő. A panel itt
   * ugyanazokkal a nevekkel veszi át, mint amíg saját `useState`-ekben tartotta — a törzs logikája változatlan.
   */
  const {
    file, setFile, bytes, setBytes, pdf, setPdf, imageUrl, setImageUrl, sources, setSources,
    workSessionSource, setWorkSessionSource, importedWorkSession, setImportedWorkSession,
    restoredSourceMatch, setRestoredSourceMatch, calibration, dispatchCalibration,
    linkedMeasurement, setLinkedMeasurement,
    page, setPage, rotation, setRotation, zoom, setZoom, planKinds, setPlanKinds,
    planScopeConfirmed, setPlanScopeConfirmed,
    sections, setSections, activeSectionId, setActiveSectionId, removedSections, setRemovedSections,
    abort,
  } = doc;
  const [selected, setSelected] = useState<DrawingTextSource | null>(null);
  const [fieldKey, setFieldKey] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<LengthUnit | "">("");
  const [value, setValue] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [overwrite, setOverwrite] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [geometryConfirmed, setGeometryConfirmed] = useState(false);
  // P1.4: explicit override when the label's chosen unit actively contradicts the user's own calibrated measurement.
  const [measurementConflictAcknowledged, setMeasurementConflictAcknowledged] = useState(false);
  const [selectingSection, setSelectingSection] = useState(false);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [workSessionError, setWorkSessionError] = useState("");
  // Tap-to-fill (P1.1): armed target field, the drawing's unit, per-section plan confirmation, undo history.
  const [targetFieldKey, setTargetFieldKey] = useState("");
  const [editingPlanKind, setEditingPlanKind] = useState(false);
  const [editingSection, setEditingSection] = useState(false);
  const [quickHistory, setQuickHistory] = useState<QuickTransferRecord<Entry>[]>([]);
  const [quickMessage, setQuickMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [calibrationLength, setCalibrationLength] = useState<{ text: string; unit: LengthUnit }>({ text: "", unit: "m" });
  const [tapCandidates, setTapCandidates] = useState<DrawingTextSource[]>([]);
  const [pendingUnitSource, setPendingUnitSource] = useState<DrawingTextSource | null>(null);
  const [pendingQuickTransfer, setPendingQuickTransfer] = useState<PendingQuickTransfer | null>(null);
  // P1.5: the "Lépték" disclosure opens itself once calibration is actually in play (active, measuring, restored),
  // so the user does not have to hunt for and manually reopen a collapsed panel while the canvas already needs them.
  const [calibrationPanelOpen, setCalibrationPanelOpen] = useState(false);
  // T2: once there is actual work to see (a loaded drawing, an imported session, a section), the panel opens itself
  // instead of making the user reopen a collapsed disclosure on every return. Like P1.5 above, this only ever
  // turns it on, so a deliberate manual close is respected.
  const [panelOpen, setPanelOpen] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const fields = definition.fields;
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? null;
  const sectionName = activeSection?.name ?? "";
  const coverageConfirmed = activeSection?.coverageConfirmed ?? false;
  const coverageStatus = activeSection?.coverage ?? "unclear";
  const sectionPoints = activeSection?.points ?? [];
  const sectionPage = activeSection?.page ?? page;
  const approvedEntries = activeSection?.data.approvedEntries ?? [];
  const assumptionConfirmations = activeSection?.data.assumptionConfirmations ?? noDrawingAssumptionConfirmations;
  const hasUnsavedCalculatorData = fields.some((field) => {
    const value = current[field.key]?.trim();
    return Boolean(value && value !== (field.initial ?? ""));
  }) || JSON.stringify(materials) !== JSON.stringify(initialMaterials) || Object.values(lengthDrafts).some(({ text }) => text.trim());
  const selectedPage = pdf?.pages.find((item) => item.pageNumber === page);
  const pageSources = pdf ? (selectedPage?.textSpans.length ? selectedPage.textSpans : sources) : sources;
  const proposedValues = useMemo(() => Object.fromEntries(entries.map(({ fieldKey: key, value: entryValue }) => [key, entryValue])), [entries]);
  const missing = missingRequiredDrawingFields(definition, current, proposedValues);
  /** A szülő által kijelölt mező, ha az éppen egy hiányzó kötelező mező (az alapértékeket a saját soruk rajzolja). */
  const guidedMissingField = missing.find((field) => field.key === cededFieldKey) ?? null;
  const existingValue = current[fieldKey]?.trim() ?? "";
  const selectedField = fields.find((field) => field.key === fieldKey);
  const fieldSuggestion = selected ? suggestRafterCutField(selected, definition.reference.id) : null;
  const planKind: DrawingPlanAnswer = planKinds[page] ?? "";
  const planKindSuggestion = classifyDrawingPlan(pageSources);
  const takeoffScopeActive = supportsRoofSectionScope(definition.reference.id) && file !== null;
  const unitlessSelection = selected ? isUnitlessDrawingMeasurement(selected.originalText, selected.method) : false;
  const splitPowerSelection = selected ? hasSplitPowerSuffix(selected, pageSources) : false;
  const valueSuggestion = selected && selectedField && !splitPowerSelection ? suggestDrawingValue(selected.originalText, selected.method, selectedField.unit, selectedUnit || undefined) : null;
  const requiresGeometryConfirmation = requiresRoofGeometryConfirmation(definition, planKind, fieldKey);
  const percentUsedAsPitch = isPercentSlopeForPitch(selected, fieldKey);
  const visibleSectionPoints = sectionPage === page ? sectionPoints : [];
  const sectionRectangle = visibleSectionPoints.length === 2 ? rectangleForPoints(visibleSectionPoints[0], visibleSectionPoints[1]) : null;
  const hasSectionSelection = sectionRectangle !== null && hasPageArea(sectionRectangle);
  const polygonFor = (section: DrawingRoofSection<SectionData>) => {
    if (section.page !== page || section.points.length !== 2) return "";
    const rect = rectangleForPoints(section.points[0]!, section.points[1]!);
    if (!hasPageArea(rect)) return "";
    return [{ x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y }, { x: rect.x + rect.width, y: rect.y + rect.height }, { x: rect.x, y: rect.y + rect.height }]
      .map((point) => viewportPointFromPage(point, rotation)).map((point) => `${point.x},${point.y}`).join(" ");
  };
  const documentSha256 = workSessionSource?.sha256 ?? "";
  // P1.1 calibration: marks are stored unrotated, so the page size is the unrotated one and zoom never enters.
  const calibrationPageSize = selectedPage ? canonicalPageSize({ widthPoints: selectedPage.widthPoints, heightPoints: selectedPage.heightPoints }, rotation) : null;
  const acceptedCalibration = calibration.accepted && calibration.accepted.pageNumber === page && calibration.accepted.documentSha256 === documentSha256 ? calibration.accepted : null;
  const calStep = calibrationStep(calibration);
  const markingCalibration = calibration.marking && (calStep === "primary-points" || calStep === "check-points");
  const measuringCalibration = acceptedCalibration !== null && calibration.measuring;
  // P1.6: whether the above-canvas calibration/measure workspace has anything to show right now (marking, measuring,
  // or an already-marked measurement's result/evidence) — used to keep the enlarged canvas height (P1.2) while it
  // is visible, so the result/evidence block does not make the page jump by shrinking the canvas under it.
  const calibrationWorkspaceActive = calibration.marking || measuringCalibration || (acceptedCalibration !== null && calibration.measure.length === 2);
  // A hand-marked ad-hoc measurement shorter than the calibration's own minimum reference carries too little
  // precision to be evidence at all (one mis-tapped pixel already dominates it); it is reported as unreliable,
  // never silently rounded into a confident mm figure.
  const measureSpanPoints = calibrationPageSize && calibration.measure.length === 2
    ? distanceInPoints(calibration.measure[0]!, calibration.measure[1]!, calibrationPageSize) : null;
  const measureTooShort = measureSpanPoints !== null && measureSpanPoints < CALIBRATION_MIN_SEGMENT_POINTS;
  const measuredMm = acceptedCalibration && calibrationPageSize && calibration.measure.length === 2 && !measureTooShort
    ? measureMm(acceptedCalibration, calibration.measure[0]!, calibration.measure[1]!, calibrationPageSize) : null;
  const selectedLabelValue = selected ? singleNumberFrom(selected.originalText, selected.method) : null;
  /**
   * P1.4.1: the pairing the user explicitly confirmed (see `linkMeasurementToSelected`), not merely whatever is
   * currently selected and whatever was last measured. Re-selecting a different label, re-measuring, changing page,
   * or switching document/section each breaks at least one of these identity checks and drops the pairing.
   */
  const activeLinkFor = (source: DrawingTextSource | null) =>
    activeMeasurementLink(linkedMeasurement, { source, documentSha256, pageNumber: page, measure: calibration.measure });
  const selectedLink = activeLinkFor(selected);
  const labelEvidence = selectedLink && selectedLabelValue !== null ? unitEvidence(selectedLabelValue, selectedLink.measuredMm) : [];
  const evidenceUnit = settledUnit(labelEvidence);
  // P1.4: the manual transfer's own chosen interpretation (valueSuggestion.sourceUnit) checked against the same
  // evidence, independent of whether the evidence settles on any single unit at all.
  const transferConflictsWithMeasurement = valueSuggestion ? measurementConflict(labelEvidence, valueSuggestion.sourceUnit) : false;
  const linkMeasurementToSelected = () => {
    if (!selected || measuredMm === null) return;
    setLinkedMeasurement({ source: selected, documentSha256, pageNumber: page, measure: calibration.measure, measuredMm });
  };
  const calibrationPoints = (points: readonly { x: number; y: number }[]) => points.map((point) => viewportPointFromPage(point, rotation)).map((point) => `${point.x},${point.y}`).join(" ");
  const snapshot = (approved = activeSection?.data.approvedEntries ?? approvedEntries): SectionData => ({ fields: current, materials, lengthDrafts, approvedEntries: approved, assumptionConfirmations });
  const updateActiveSection = (update: Partial<Omit<DrawingRoofSection<SectionData>, "id" | "sourceDocumentId">>, data = activeSection?.data) => {
    if (!activeSection || !data) return;
    setSections((items) => updateRoofSection(items, activeSection.id, { ...update, data }));
  };
  const quickFields = quickTransferFields(definition, current);
  const targetField = quickFields.find((field) => field.key === targetFieldKey) ?? null;
  const unconfirmedAssumptions = unconfirmedDrawingAssumptions(definition, current, { ...inactiveDrawingTakeoffScope, active: takeoffScopeActive, assumptionConfirmations });
  const overhangLimitation = takeoffScopeActive ? drawingOverhangLimitation(current) : null;
  const missingQuickFields = quickFields.filter((field) => missing.some((item) => item.key === field.key) || unconfirmedAssumptions.some((item) => item.key === field.key));
  const planScopeKey = activeSectionId || "document";
  const lastQuick = quickHistory.at(-1) ?? null;
  /** The extra "this is not a wall dimension" confirmation, needed only while the page is not a declared roof plan. */
  const needsPlanScope = (key: string) => requiresRoofGeometryConfirmation(definition, planKind, key);
  const quickScopeIssue = (key: string) => drawingQuickScopeIssue({
    definition, fieldKey: key, plan: planKind, pageNumber: page, takeoffScopeActive,
    sectionName, coverageConfirmed, planScopeConfirmed: planScopeConfirmed.includes(planScopeKey),
  });
  /** The one place the quick-transfer target changes; "" means detailed transfer. */
  const chooseTargetField = (key: string) => { setTargetFieldKey(key); setTapCandidates([]); setQuickMessage(null); setPendingUnitSource(null); setPendingQuickTransfer(null); };
  const clearQuickState = () => { setQuickHistory([]); setQuickMessage(null); setTapCandidates([]); setPendingUnitSource(null); setPendingQuickTransfer(null); };
  const unitLabel = (field: { unit: string }) => field.unit || "egység nélkül";

  const activateSection = (next: DrawingRoofSection<SectionData>) => {
    if (activeSection) updateActiveSection({}, snapshot());
    clearQuickState();
    setActiveSectionId(next.id);
    setEntries([]); setSelected(null); setValue(""); setFieldKey(""); setReviewed(false); setApplied(false); setSelectingSection(false);
    onSectionActivate(next.data);
    onWholeRoofChange(false);
  };

  useEffect(() => {
    if (!file) return;
    onScopeChange({ active: takeoffScopeActive, sectionId: activeSectionId, sectionName, coverageConfirmed, wholeRoofConfirmed, assumptionConfirmations });
  }, [file, takeoffScopeActive, activeSectionId, sectionName, coverageConfirmed, wholeRoofConfirmed, assumptionConfirmations, onScopeChange]);

  /**
   * P3.3f: accepting defaults writes their effective value (an empty field becomes the shape's default or 0 mm) and
   * binds each acceptance to it. The whole card is confirmed in ONE atomic update, and only for the keys passed in —
   * a default that appears later carries no token, so it asks again. The tokens are derived from the fully written
   * `nextFields`, because `drawingAssumptionToken` includes the roof shape, which an accepted shape may itself set.
   */
  const confirmAssumptions = (keys: readonly string[]) => {
    const accepted = keys.flatMap((key) => {
      const field = fields.find((item) => item.key === key);
      return field ? [[key, current[key]?.trim() || field.initial || "0"] as const] : [];
    });
    if (accepted.length === 0) return;
    const nextFields = { ...current, ...Object.fromEntries(accepted) };
    const written = Object.fromEntries(accepted.filter(([key, value]) => value !== current[key]));
    if (Object.keys(written).length > 0) onApply(written);
    updateActiveSection({}, { ...snapshot(), fields: nextFields,
      assumptionConfirmations: { ...assumptionConfirmations, ...Object.fromEntries(accepted.map(([key]) => [key, drawingAssumptionToken(nextFields, key)])) } });
  };
  const assumptionShapeLabel = (field: (typeof fields)[number]) => field.options?.find((option) => option.value === (current[field.key]?.trim() || field.initial))?.label ?? field.initial ?? "";

  const selectSource = (source: DrawingTextSource) => {
    const suggestion = suggestRafterCutField(source, definition.reference.id);
    setPendingQuickTransfer(null);
    setSelected(source); setSelectedUnit(""); setFieldKey(suggestion?.fieldKey ?? ""); setValue(suggestion?.value ?? ""); setOverwrite(false); setReviewed(false); setGeometryConfirmed(false); setMeasurementConflictAcknowledged(false); setApplied(false);
  };

  const quickMeasurementIssue = (source: DrawingTextSource, sourceUnit: string) => {
    const link = activeLinkFor(source);
    if (!link) return "";
    const labelValue = singleNumberFrom(source.originalText, source.method);
    const evidence = labelValue !== null ? unitEvidence(labelValue, link.measuredMm) : [];
    return measurementConflict(evidence, sourceUnit)
      ? `„${source.originalText}” ellentmond a hozzá kapcsolt mért hossznak (${Math.round(link.measuredMm)} mm). Ellenőrizd a részletes átvitelben.`
      : "";
  };

  const commitQuickTransfer = (source: DrawingTextSource, fieldKey: string, transfer: Extract<QuickTransferDecision, { kind: "apply" | "confirm" }>) => {
    const field = quickFields.find((item) => item.key === fieldKey);
    if (!field) { setQuickMessage({ tone: "error", text: "A kiválasztott célmező már nem érhető el." }); return; }
    const measurementIssue = quickMeasurementIssue(source, transfer.sourceUnit);
    if (measurementIssue) {
      selectSource(source); setFieldKey(fieldKey); setQuickMessage({ tone: "error", text: measurementIssue }); return;
    }
    const previous = current[field.key] ?? "";
    const approval = approveDrawingFields(definition, current, [{ fieldKey: field.key, value: transfer.value }], new Set(previous.trim() ? [field.key] : []));
    if (!approval.ok) { setQuickMessage({ tone: "error", text: approval.issues.join(" ") }); return; }
    const value = approval.fields[field.key]!;
    const previousEntry = approvedEntries.find((entry) => entry.fieldKey === field.key) ?? null;
    const entry: Entry = { fieldKey: field.key, value, sourceDocumentId: source.sourceDocumentId, sourceText: source.originalText, method: source.method, pageNumber: source.pageNumber, position: source.position, bounds: source.bounds, sourceUnit: transfer.sourceUnit, unitOrigin: transfer.unitOrigin === "pdf" ? "pdf" : "user", overwrite: previous.trim() !== "", semanticOverride: transfer.kind === "confirm" && transfer.semanticMismatch };
    onApply({ [field.key]: value });
    updateActiveSection({}, { ...snapshot(), approvedEntries: [...approvedEntries.filter((item) => item !== previousEntry), entry] });
    setQuickHistory((items) => [...items, { fieldKey: field.key, previous, applied: value, sectionId: activeSectionId, documentSha256, source, unitOrigin: transfer.unitOrigin, entry, previousEntry }]);
    setSelected(null); setPendingQuickTransfer(null);
    const next = missingQuickFields.find((item) => item.key !== field.key);
    setTargetFieldKey(next?.key ?? "");
    const origin = transfer.unitOrigin === "pdf" ? `egység a rajzon: ${transfer.sourceUnit}` : `erre a feliratra választott egység: ${transfer.sourceUnit}`;
    setQuickMessage({ tone: "info", text: `✓ ${field.label}: ${value} ${unitLabel(field)} · „${source.originalText}” (${origin})${previous.trim() ? ` · korábban: ${previous}` : ""}${next ? ` · következő mező: ${next.label}` : ""}` });
  };

  const runQuickTransfer = (source: DrawingTextSource, labelUnit?: LengthUnit) => {
    setTapCandidates([]); setPendingUnitSource(null);
    const decision = decideQuickTransfer({ definition, current, fieldKey: targetFieldKey, source, labelUnit, scopeIssue: quickScopeIssue(targetFieldKey), pageSources });
    if (decision.kind === "review") {
      selectSource(source); setFieldKey(targetFieldKey);
      setQuickMessage({ tone: "info", text: decision.reason }); return;
    }
    if (decision.kind === "needs-unit") { setPendingUnitSource(source); setQuickMessage({ tone: "error", text: decision.reason }); return; }
    if (decision.kind !== "apply" && decision.kind !== "confirm") { setQuickMessage({ tone: "error", text: decision.reason }); return; }
    const measurementIssue = quickMeasurementIssue(source, decision.sourceUnit);
    if (measurementIssue) { selectSource(source); setFieldKey(targetFieldKey); setQuickMessage({ tone: "error", text: measurementIssue }); return; }
    if (decision.kind === "confirm") {
      setPendingQuickTransfer({ source, fieldKey: targetFieldKey, previous: current[targetFieldKey] ?? "", decision });
      setQuickMessage({ tone: "error", text: decision.reason });
      return;
    }
    commitQuickTransfer(source, targetFieldKey, decision);
  };

  const useTappedSource = (source: DrawingTextSource) => {
    if (calibrationWorkspaceActive && !activeLinkFor(source)) {
      setTargetFieldKey(""); selectSource(source);
      setQuickMessage({ tone: "info", text: "A feliratot a mérési összevetéshez jelöltük ki; gyorsátvitel nem történt." });
      return;
    }
    if (!targetFieldKey) { selectSource(source); return; }
    runQuickTransfer(source);
  };

  const tapSource = (source: DrawingTextSource, event?: React.MouseEvent<HTMLElement>) => {
    const box = event?.currentTarget.parentElement?.getBoundingClientRect();
    let tapped = source;
    if (event && box && box.width > 0 && box.height > 0) {
      // P0-3: candidates are collected over the same 44 px sense zone the CSS draws (half of it per axis, in page
      // units at the current render size and zoom). Inside two overlapping zones the browser fires whichever button
      // is painted last, which need not be the nearer label — so the tap coordinate, not the painting order, picks
      // the label, and two labels whose zones both contain the tap stay a question on both transfer paths.
      const reach = { x: 22 / box.width, y: 22 / box.height };
      const candidates = numericSourcesAt(pageSources, { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height }, reach);
      if (candidates.length > 1) { setTapCandidates(candidates); setQuickMessage({ tone: "info", text: "Több felirat esik ide. Válaszd ki, melyiket viszed át." }); return; }
      if (candidates.length === 1) tapped = candidates[0]!;
    }
    useTappedSource(tapped);
  };

  const undoQuickTransfer = () => {
    const record = quickHistory.at(-1);
    if (!record) return;
    setQuickHistory((items) => items.slice(0, -1));
    const state = quickTransferUndoState(record, { activeSectionId, documentSha256, current });
    if (state !== "undoable") {
      setQuickMessage({ tone: "error", text: state === "edited" ? "A mező az átvitel óta módosult, ezért a visszavonás nem írja felül." : "Ez az átvitel másik szakaszhoz vagy rajzhoz tartozott, ezért nem írjuk vissza." });
      return;
    }
    onApply({ [record.fieldKey]: record.previous });
    updateActiveSection({}, { ...snapshot(), approvedEntries: [...approvedEntries.filter((item) => item !== record.entry), ...(record.previousEntry ? [record.previousEntry] : [])] });
    setTargetFieldKey(record.fieldKey);
    const label = fields.find((field) => field.key === record.fieldKey)?.label ?? record.fieldKey;
    setQuickMessage({ tone: "info", text: record.previous.trim() ? `Visszavonva: ${label} ismét ${record.previous}.` : `Visszavonva: ${label} ismét üres.` });
  };

  const reapplyLabelUnit = (unit: LengthUnit) => {
    const record = quickHistory.at(-1);
    if (!record || quickTransferUndoState(record, { activeSectionId, documentSha256, current }) !== "undoable") return;
    const decision = decideQuickTransfer({ definition, current: { ...current, [record.fieldKey]: record.previous }, fieldKey: record.fieldKey, source: record.source, labelUnit: unit, scopeIssue: "", pageSources });
    if (decision.kind !== "apply") { setQuickMessage({ tone: "error", text: decision.reason }); return; }
    const entry: Entry = { ...record.entry, value: decision.value, sourceUnit: decision.sourceUnit, unitOrigin: "user" };
    onApply({ [record.fieldKey]: decision.value });
    updateActiveSection({}, { ...snapshot(), approvedEntries: [...approvedEntries.filter((item) => item !== record.entry), entry] });
    setQuickHistory((items) => [...items.slice(0, -1), { ...record, applied: decision.value, unitOrigin: "label", entry }]);
    const field = fields.find((item) => item.key === record.fieldKey);
    setQuickMessage({ tone: "info", text: `${field?.label}: ${decision.value} ${field ? unitLabel(field) : ""} · „${record.source.originalText}” (erre a feliratra választott egység: ${unit})` });
  };

  const commitCalibrationLength = () => {
    const lengthMm = lengthToMm(calibrationLength.text, calibrationLength.unit);
    if (calStep === "primary-length") dispatchCalibration({ type: "set-primary-length", lengthMm });
    else if (calStep === "check-length" && calibrationPageSize && documentSha256) dispatchCalibration({ type: "set-check-length", lengthMm, size: calibrationPageSize, documentSha256, pageNumber: page });
    if (lengthMm !== null) setCalibrationLength({ text: "", unit: calibrationLength.unit });
  };

  /** Answers the unit question for the pending label only; it is never remembered for another label (P0-1). */
  const chooseLabelUnit = (unit: LengthUnit) => {
    if (pendingUnitSource) runQuickTransfer(pendingUnitSource, unit);
  };

  useEffect(() => {
    if (!bytes || !pdf || !canvas.current) return;
    const controller = new AbortController();
    void renderPdfPage(bytes, canvas.current, { pageNumber: page, zoom, rotationOffset: rotation, signal: controller.signal }).catch(() => {
      if (!controller.signal.aborted) setError("Az oldal előnézete nem tölthető be.");
    });
    return () => controller.abort();
  }, [bytes, pdf, page, zoom, rotation]);

  // A new or cleared measurement must be re-acknowledged; the override never survives the evidence that justified it.
  useEffect(() => { setMeasurementConflictAcknowledged(false); }, [measuredMm]);

  // P1.5: open "Lépték" as soon as calibration becomes relevant (started, measuring, or already accepted/restored),
  // without fighting a manual close afterwards — this only ever turns it on, never off.
  useEffect(() => { if (markingCalibration || measuringCalibration || acceptedCalibration) setCalibrationPanelOpen(true); }, [markingCalibration, measuringCalibration, acceptedCalibration]);

  useEffect(() => { if (file || importedWorkSession || sections.length > 0) setPanelOpen(true); }, [file, importedWorkSession, sections.length]);
  useEffect(() => { if (openPanel) setPanelOpen(true); }, [openPanel]);

  const releaseSource = () => {
    abort.current?.abort();
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setFile(null); setBytes(null); setPdf(null); setImageUrl(null); setSources([]); setSelected(null);
  };

  const reset = () => {
    releaseSource();
    setEntries([]); setSelectedUnit(""); setFieldKey(""); setValue(""); setReviewed(false); setGeometryConfirmed(false); setApplied(false); setError(""); setRotation(0); setZoom(1); setPage(1);
    setSections([]); setActiveSectionId(""); setSelectingSection(false); setRemovedSections([]); onWholeRoofChange(false);
    clearQuickState(); setTargetFieldKey(""); setPlanKinds({}); setEditingPlanKind(false); setPlanScopeConfirmed([]);
    dispatchCalibration({ type: "reset" }); setCalibrationLength({ text: "", unit: "m" }); setLinkedMeasurement(null);
    onScopeChange(inactiveDrawingTakeoffScope);
    setWorkSessionSource(null); setImportedWorkSession(false); setRestoredSourceMatch(null); setWorkSessionError("");
  };

  const chooseFile = async (next: File | undefined) => {
    if (!next) return;
    const resuming = importedWorkSession && !file && sections.length > 0;
    if (resuming) {
      const oldSource = workSessionSource;
      const kind = next.type === "application/pdf" ? "pdf" : imageTypes.includes(next.type) ? "image" : null;
      if (!kind) { setError("PDF, JPG, PNG vagy WebP választható."); return; }
      setBusy(true); setError("");
      try {
        const data = new Uint8Array(await next.arrayBuffer());
        const sha256 = await sha256Hex(data);
        if (oldSource && (sha256 !== oldSource.sha256 || kind !== oldSource.kind) && !await requestConfirmation({ title: "Eltérő rajzforrás", message: "A kiválasztott rajz eltér a mentett munka forrásától. Elveszik: a rajzi kijelölések és a korábbi forrásjóváhagyások. Megmarad: a szakaszok neve, kézi geometriája és anyagadata.", cancelLabel: "Mégsem", actions: [{ label: "Leválasztás és folytatás", tone: "danger", run: () => undefined }] })) return;
        const parsed = kind === "pdf" ? await processPdfDocument(data) : null;
        const source = { kind, documentId: parsed?.sourceDocumentId ?? crypto.randomUUID(), sha256, pageCount: parsed?.pageCount ?? 1 } as const;
        const rebound = oldSource ? rebindRoofWorkSessionSource({ source: oldSource, activeSectionId: activeSectionId || sections[0]!.id, sections }, source) : null;
        if (rebound && oldSource && sha256 === oldSource.sha256 && kind === oldSource.kind && !rebound.matchesSavedSource
          && !await requestConfirmation({ title: "Eltérő oldalszám", message: "A rajz azonosítója egyezik, de az oldalszám eltér a mentett munkától. Elveszik: a korábbi rajzi kijelölések. Megmarad: a szakaszok neve, kézi geometriája és anyagadata.", cancelLabel: "Mégsem", actions: [{ label: "Kijelölések leválasztása", tone: "danger", run: () => undefined }] })) return;
        const nextSections = rebound?.session.sections ?? sections.map((section) => ({ ...section, sourceDocumentId: source.documentId, page: 1, points: [], coverageConfirmed: false, data: { ...section.data, approvedEntries: [] } }));
        const active = nextSections.find((section) => section.id === activeSectionId) ?? nextSections[0]!;
        clearQuickState(); setPlanKinds({}); setEditingPlanKind(false); setPlanScopeConfirmed([]);
        // A matching re-attach keeps a restored calibration (it stays inert until its own document/page line up again); only a genuinely different source drops it.
        if (!rebound?.matchesSavedSource) dispatchCalibration({ type: "reset" });
        setLinkedMeasurement(null);
        setSections(nextSections); setRemovedSections([]); setActiveSectionId(active.id); setFile(next); setBytes(parsed ? data : null); setPdf(parsed); setImageUrl(parsed ? null : URL.createObjectURL(next)); setSources([]); setPage(1);
        setWorkSessionSource(source);
        setRestoredSourceMatch(rebound?.matchesSavedSource ? "matched" : "different");
        onSectionActivate(active.data); onWholeRoofChange(false); onScopeChange({ active: true, sectionId: active.id, sectionName: active.name, coverageConfirmed: false, wholeRoofConfirmed: false, assumptionConfirmations: active.data.assumptionConfirmations ?? noDrawingAssumptionConfirmations });
      } catch { setError("A rajz nem dolgozható fel. A betöltött munkaszakaszok megmaradtak."); }
      finally { setBusy(false); }
      return;
    }
    if ((file || sections.length > 0 || hasUnsavedCalculatorData) && !await requestConfirmation({ title: "Új rajz megnyitása", message: "Elveszik: a jelenlegi rajzi kijelölések, a rajzi jóváhagyások, valamennyi szakasz geometriája és anyagadata; az aktív kalkulátordraft is törlődhet. Ezek az adatok nincsenek tartósan mentve.", cancelLabel: "Mégsem", actions: [{ label: "Új rajz megnyitása", tone: "danger", run: () => undefined }] })) return;
    reset();
    const sourceId = crypto.randomUUID();
    // A3: az első szakasz ott jön létre, ahol a szakasz-hatókör értelmes — ugyanaz a szerződés, mint a kapuknál.
    if (supportsRoofSectionScope(definition.reference.id)) {
      const data: SectionData = { fields: Object.fromEntries(fields.map((field) => [field.key, field.initial ?? ""])), materials: initialMaterials, lengthDrafts: {}, approvedEntries: [] };
      const first = createRoofSection(sourceId, data, crypto.randomUUID(), 0);
      setSections([first]); setActiveSectionId(first.id);
      onSectionActivate(data);
      onScopeChange({ active: true, sectionId: first.id, sectionName: first.name, coverageConfirmed: false, wholeRoofConfirmed: false, assumptionConfirmations: noDrawingAssumptionConfirmations });
    }
    const controller = new AbortController(); abort.current = controller;
    setBusy(true); setError(""); setFile(next);
    try {
      if (next.type === "application/pdf") {
        const data = new Uint8Array(await next.arrayBuffer());
        if (controller.signal.aborted) return;
        const sha256 = await sha256Hex(data);
        if (controller.signal.aborted) return;
        setBytes(data);
        const parsed = await processPdfDocument(data, { signal: controller.signal });
        setPdf(parsed);
        setWorkSessionSource({ kind: "pdf", documentId: parsed.sourceDocumentId, sha256, pageCount: parsed.pageCount }); setRestoredSourceMatch(null);
        setSections((items) => items.map((section) => ({ ...section, sourceDocumentId: parsed.sourceDocumentId })));
        if (controller.signal.aborted) return;
      } else if (imageTypes.includes(next.type)) {
        setImageUrl(URL.createObjectURL(next));
        const sha256 = await sha256Hex(new Uint8Array(await next.arrayBuffer()));
        if (controller.signal.aborted) return;
        setWorkSessionSource({ kind: "image", documentId: sourceId, sha256, pageCount: 1 }); setRestoredSourceMatch(null);
      } else setError("PDF, JPG, PNG vagy WebP választható.");
    } catch { if (!controller.signal.aborted) setError("A fájl nem dolgozható fel. Ellenőrizd a formátumot és a méretet."); }
    finally { setBusy(false); }
  };

  /** Egy helyen áll össze a v3 payload: a kézi export és a helyi megőrzés pontosan ugyanazt írja. */
  const buildWorkSessionJson = () => {
    if (!workSessionSource) throw new Error("Nincs betöltött forrás.");
    const currentSections = sections.map((section) => section.id === activeSectionId ? { ...section, data: snapshot() } : section);
    return createRoofWorkSessionJson({ calculatorId: definition.reference.id as "roof.material-takeoff" | "roof.timber-cutlist", source: workSessionSource, activeSectionId, sections: currentSections, calibration: calibration.accepted } satisfies RoofWorkSessionInput, profiles);
  };
  const exportWorkSession = () => {
    if (!workSessionSource || sections.length === 0) return;
    try {
      const json = buildWorkSessionJson();
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const link = document.createElement("a"); link.href = url; link.download = "tetopro-tetomunka-v1.json"; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0); setWorkSessionError("");
    } catch (reason) { setWorkSessionError(reason instanceof Error ? reason.message : "A munkamenet nem menthető."); }
  };

  /**
   * A1: a helyi megőrzés jelzése. A JSON csak a késleltetés lejártakor épül fel; ez a sztring olcsó, és minden
   * mentendő változásra más — a szakaszok metaadata, a lépték és az aktív szakasz saját adata.
   */
  const storeSignature = `${sections.map((section) => `${section.id}:${section.name}:${section.page}:${section.coverage}:${section.coverageConfirmed}:${section.points.length}`).join("|")}#${activeSectionId}#${calibration.accepted?.mmPerPoint ?? ""}#${JSON.stringify(snapshot())}`;
  const sessionStore = useRoofWorkSessionStore({
    owner, source: workSessionSource, sourceName: file?.name ?? "", calculatorId: definition.reference.id as "roof.material-takeoff" | "roof.timber-cutlist", sectionCount: sections.length,
    signature: storeSignature, buildJson: buildWorkSessionJson,
  });

  /**
   * A1: a fájlból importált és a helyi tárból visszaállított munka UGYANEZEN az úton jön be — egyetlen
   * jóváhagyási kapu van, nem kettő. A visszaállítás `pending` forrásállapotban indul: amíg a felhasználó
   * nem választja ki újra a rajzot és a SHA-256 nem egyezik, forráshoz kötött bizonyíték nem aktiválódik.
   */
  const applyWorkSession = async (json: string) => {
    const restored = parseRoofWorkSessionJson(json);
    if (restored.calculatorId !== definition.reference.id) throw new Error("Ez a munkafájl másik tetőkalkulátorhoz tartozik.");
    if ((file || sections.length > 0 || hasUnsavedCalculatorData) && !await requestConfirmation({ title: "Mentett munka betöltése", message: "Elveszik: a jelenlegi rajz, a rajzi kijelölések és a szakaszok mentetlen adatai.", cancelLabel: "Mégsem", actions: [{ label: "Munka betöltése", tone: "danger", run: () => undefined }] })) return false;
    reset();
    const restoredSections: DrawingRoofSection<SectionData>[] = restored.sections.map((section) => ({ ...section, data: { ...section.data, approvedEntries: [] } }));
    const active = restoredSections.find((section) => section.id === restored.activeSectionId)!;
    setSections(restoredSections); setActiveSectionId(active.id); setWorkSessionSource(restored.source); setImportedWorkSession(true); setRestoredSourceMatch("pending"); setPage(1); setRotation(0); setZoom(1);
    dispatchCalibration({ type: "restore", accepted: restored.calibration ?? null });
    setEntries([]); setSelected(null); setValue(""); setFieldKey(""); setReviewed(false); setGeometryConfirmed(false); setApplied(false);
    onSectionActivate(active.data); onWholeRoofChange(false); onScopeChange({ active: true, sectionId: active.id, sectionName: active.name, coverageConfirmed: false, wholeRoofConfirmed: false, assumptionConfirmations: active.data.assumptionConfirmations ?? noDrawingAssumptionConfirmations });
    setWorkSessionError("");
    return true;
  };
  const importWorkSession = async (selectedFile: File | undefined) => {
    if (!selectedFile) return;
    try {
      if (selectedFile.size > 1_000_000) throw new Error("A munkamenetfájl nagyobb az 1 MB-os korlátnál.");
      await applyWorkSession(await selectedFile.text());
    } catch (reason) { setWorkSessionError(reason instanceof Error ? reason.message : "A munkamenetfájl nem tölthető be."); }
  };

  const runOcr = async () => {
    if (!file) return;
    const controller = new AbortController(); abort.current = controller; setBusy(true); setError("");
    try {
      const result = file.type === "application/pdf" && bytes
        ? await recognizePdfPage(bytes, page, { signal: controller.signal, rotationDegrees: rotation })
        : await recognizeImage(file, { signal: controller.signal });
      setSources(result); setSelected(null);
      if (!result.length) setError("Nem találtam OCR-szöveget ezen az oldalon.");
    } catch { if (!controller.signal.aborted) setError("Az OCR nem futott le. A felismert számot mindig ellenőrizd a rajzképen."); }
    finally { setBusy(false); }
  };

  const addEntry = () => {
    if (!selected || !fieldKey || !value.trim()) return;
    if ((requiresGeometryConfirmation && (!geometryConfirmed || (takeoffScopeActive && (!sectionName.trim() || !coverageConfirmed)))) || percentUsedAsPitch || splitPowerSelection) return;
    if (transferConflictsWithMeasurement && !measurementConflictAcknowledged) return;
    if (unitlessSelection && (!selectedUnit || selectedField?.unit !== "mm" || !valueSuggestion)) return;
    if (entries.some((entry) => entry.fieldKey === fieldKey)) { setError("Ehhez a mezőhöz már tartozik javaslat."); return; }
    if (existingValue && !overwrite) { setError("A meglévő mezőérték felülírásához jelöld be a felülírást."); return; }
    setEntries((items) => [...items, { fieldKey, value: value.trim(), sourceDocumentId: selected.sourceDocumentId, sourceText: selected.originalText, method: selected.method, pageNumber: page, position: selected.position, bounds: selected.bounds, sourceUnit: valueSuggestion?.sourceUnit, unitOrigin: valueSuggestion?.unitOrigin, ruleId: fieldSuggestion?.ruleId, suggestedFieldKey: fieldSuggestion?.fieldKey, overwrite, measurementOverride: transferConflictsWithMeasurement }]);
    setSelected(null); setValue(""); setReviewed(false); setApplied(false); setError("");
  };

  const approve = () => {
    const result = approveDrawingFields(definition, current, entries, new Set(entries.filter((entry) => entry.overwrite && current[entry.fieldKey]?.trim()).map((entry) => entry.fieldKey)));
    if (!result.ok || !reviewed) { setError(result.ok ? "Erősítsd meg az ellenőrzést." : result.issues.join(" ")); return; }
    onApply(result.fields); const nextApproved = [...approvedEntries, ...entries]; updateActiveSection({}, { ...snapshot(), approvedEntries: nextApproved }); setEntries([]); setSelected(null); setValue(""); setReviewed(false); setApplied(true);
  };

  const rotatePreview = () => {
    if (!bytes) return;
    const nextRotation = ((rotation + 90) % 360) as 0 | 90 | 180 | 270;
    const controller = new AbortController();
    abort.current?.abort();
    abort.current = controller;
    setRotation(nextRotation); setSelected(null); setPdf(null); setBusy(true); setError("");
    void processPdfDocument(bytes, { signal: controller.signal, rotationOffset: nextRotation }).then(setPdf).catch(() => {
      if (!controller.signal.aborted) setError("Az oldal szövegpozíciói nem tölthetők be.");
    }).finally(() => {
      if (abort.current === controller) { abort.current = null; setBusy(false); }
    });
  };

  const invalidSectionNames = supportsRoofSectionScope(definition.reference.id)
    ? sections.filter((section) => roofWorkSectionHasInvalidInput(section.id === activeSectionId ? snapshot() : section.data, profiles)).map((section) => section.name)
    : [];
  const isTakeoff = supportsRoofSectionScope(definition.reference.id);
  const sectionRect = sectionPoints.length === 2 ? rectangleForPoints(sectionPoints[0]!, sectionPoints[1]!) : null;
  const sectionSelected = sectionRect !== null && hasPageArea(sectionRect);
  const sectionReady = sectionName.trim() !== "" && sectionSelected && coverageStatus === "covered" && coverageConfirmed;
  const showSectionStep = takeoffScopeActive && (!sectionReady || editingSection || selectingSection);
  // T4: one compact strip reporting the phases the panel already tracks. It points at the next task; the warnings
  // themselves stay in "Teendők és figyelmeztetések", the assumption list and the save gate.
  /**
   * P3.3d: a kalkulátor saját anyagállítása, változtatás nélkül. A lépés akkor létezik, ha ennek a kalkulátornak
   * egyáltalán van anyagbemenete (`takeoffInputs`); a kért csoportok halmaza a kalkulátor saját feloldott
   * `requested` értéke (a csak-faanyag kalkulátor kényszerével együtt), a „geometry" rész nem anyagcsoport. Amíg a
   * geometria hiányos, a kalkulátor nem állít anyagstátuszt — ilyenkor a sáv sem állít, csak jelzi, hogy még nyitott.
   */
  const requestedMaterials = calculation.takeoffInputs?.requested;
  const materialParts = calculation.materialTakeoff?.parts.filter((part) => part.id !== "geometry" && part.requested) ?? [];
  const materialStepInput = calculation.takeoffInputs
    ? {
      status: calculation.materialTakeoff?.status ?? null,
      requested: Boolean(requestedMaterials && (requestedMaterials.timber || requestedMaterials.underlay || requestedMaterials.covering)),
      openLabels: materialParts.filter((part) => part.status !== null && part.status !== "VALID").map((part) => part.label),
    }
    : null;
  // P3.3d.1: csak megjelenítési kapcsoló; a lépések állapotát nem befolyásolja.
  const [stepStatesOpen, setStepStatesOpen] = useState(false);
  const steps = drawingSteps({
    planKindLabel: planKind ? drawingPlanKindChoices.find((choice) => choice.kind === planKind)!.label : "",
    pageNumber: page, multiPage: Boolean(pdf && pdf.pageCount > 1),
    sectionActive: takeoffScopeActive, sectionName, sectionReady,
    calibrationAccepted: acceptedCalibration !== null,
    missingFieldCount: missing.length, unconfirmedAssumptionCount: unconfirmedAssumptions.length,
    material: materialStepInput, save: save ?? null,
  });
  const nextStep = nextDrawingStep(steps);
  // P3.3a: a kulcsszámok a vászon mellett, hogy egy téves átvitel a rajz elhagyása nélkül látsszon. Csak jelent.
  const resultStrip = drawingResultStrip({
    geometry: calculation.geometry, takeoff: calculation.materialTakeoff, completenessStatus: calculation.completeness.status,
    scopeActive: takeoffScopeActive, coverageConfirmed, wholeRoofConfirmed,
  });
  const goToStep = (id: DrawingStepId) => {
    if (id === "plan") { setEditingPlanKind(true); return; }
    if (id === "section") { setEditingSection(true); return; }
    if (id === "calibration") { setCalibrationPanelOpen(true); scrollTo("plan-calibration-panel"); return; }
    if (id === "material") { scrollTo("construction-material-inputs"); return; }
    if (id === "save") { scrollTo("construction-save-panel"); return; }
    scrollTo(missing.length === 0 && unconfirmedAssumptions.length > 0 ? "plan-todo" : "plan-quick-bar");
  };
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  const addSection = () => {
    if (activeSection) updateActiveSection({}, snapshot());
    const data: SectionData = { fields: Object.fromEntries(fields.map((field) => [field.key, field.initial ?? ""])), materials: initialMaterials, lengthDrafts: {}, approvedEntries: [] };
    const next = createRoofSection(activeSection?.sourceDocumentId ?? crypto.randomUUID(), data, crypto.randomUUID(), sections.length);
    clearQuickState();
    setSections((items) => [...items, next]); setActiveSectionId(next.id); setEntries([]); setSelected(null); setSelectingSection(false); setEditingSection(false); onSectionActivate(data); onWholeRoofChange(false);
  };
  const deleteActiveSection = () => {
    if (!activeSection) return;
    setRemovedSections((items) => [...items, { section: { ...activeSection, data: snapshot() }, index: sections.findIndex((section) => section.id === activeSection.id) }]);
    clearQuickState();
    const remaining = removeRoofSection(sections, activeSection.id); const next = remaining[0]!; setSections(remaining); setActiveSectionId(next.id); setEntries([]); setSelected(null); setValue(""); setReviewed(false); setApplied(false); setSelectingSection(false); setEditingSection(false); onSectionActivate(next.data); onWholeRoofChange(false);
  };
  const changeCoverage = (status: "covered" | "uncovered" | "unclear") => {
    let data = snapshot();
    if (status !== "covered") {
      const revoked = revokeApprovedDrawingValues(current, data.approvedEntries);
      const invalidated = new Set(revoked.invalidatedFieldKeys);
      data = { ...data, fields: revoked.fields, lengthDrafts: Object.fromEntries(Object.entries(lengthDrafts).filter(([key]) => !invalidated.has(key))), approvedEntries: [] };
      setEntries([]); setSelected(null); setValue(""); setReviewed(false); setApplied(false); onSectionActivate(data);
    }
    // P3.5.1: a fedettség kiválasztása CÍMKE, a megerősítés ÁLLÍTÁS — „a teraszokat külön vizsgáltam". A választó
    // korábban maga pipálta be a megerősítést, és mivel ezzel a szakasz „kész" lett, a lépés azonnal be is zárult:
    // a felhasználó jellemzően meg sem látta azt a checkboxot, amelynek az állítása mentési kapu
    // (canSaveDrawingTakeoff). Ezért a választó soha nem igazol; az igazolás a felhasználó kifejezett pipája marad,
    // ugyanúgy, ahogy a „teljes tető" megerősítésnél már eddig is.
    updateActiveSection({ coverage: status, coverageConfirmed: false }, data);
    if (status !== "covered") onWholeRoofChange(false);
  };
  // P0-1: a value whose unit the user chose (not printed on the drawing) stays listed with that unit, not only in a message.
  const chosenUnitEntries = approvedEntries.filter((entry) => entry.unitOrigin === "user" && entry.sourceUnit);
  /** A tárolt munka a fájlimporttal AZONOS kapun megy be; siker után a fül átveszi a rekord sorszámát. */
  const restoreStoredSession = async (record: StoredRoofWorkSession) => {
    try {
      if (await applyWorkSession(record.json)) sessionStore.adoptRestored(record);
    } catch (reason) { setWorkSessionError(reason instanceof Error ? reason.message : "A tárolt munka nem tölthető be."); }
  };
  const atTime = (value: number) => new Date(value).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const storeActive = isTakeoff && owner !== null;
  /** A helyi mentés állapota sosem néma: a hiba a meglévő hibasort kapja, a kiút a kézi munkaállapot-mentés. */
  const storeStatus = !storeActive || !sessionStore.enabled ? null
    : sessionStore.status === "blocked" ? <p role="alert" className="plan-alert-line is-error">Ezen az eszközön nem tárolható a munka (privát ablak vagy letiltott tárhely). Használd a „Munkaállapot mentése” gombot.</p>
    : sessionStore.status === "quota" ? <p role="alert" className="plan-alert-line is-error">Megtelt a helyi tárhely, ez a munka nem tárolódik. Mentsd le a munkaállapotot, vagy törölj régi helyi munkákat. <button type="button" className="text-button" onClick={() => void sessionStore.clearDevice()}>Helyi munkák törlése</button></p>
    : sessionStore.status === "conflict" ? <p role="alert" className="plan-alert-line is-error">Ezt a munkát egy másik lapon frissebben mentették, ezért itt nem írunk felül. Mentsd le a munkaállapotot, vagy folytasd a másik lapon.</p>
    : sessionStore.status === "saving" ? <p role="status" className="plan-hint">Helyi mentés…</p>
    : sessionStore.status === "saved" && sessionStore.savedAt !== null ? <p role="status" className="plan-hint">Folytatható ezen az eszközön · {atTime(sessionStore.savedAt)}</p>
    : null;
  /**
   * A felajánlás MEGJELENÉSE önmagában nem ment: forrás és szakasz nélkül a tároló nem ír, ezért a tárolt
   * munkát nem írhatja felül egy üres állapot.
   */
  const storeOffers = !storeActive || file ? null : <div className="plan-session-store">
    {!sessionStore.enabled
      ? <label className="plan-check"><input type="checkbox" checked={false} onChange={() => void sessionStore.setEnabled(true)} /> Folytathatóvá teszem a rajzos munkát ezen az eszközön. A tervrajz nem tárolódik, csak a munkamenet; 7 nap után magától törlődik.</label>
      : <>
        {sessionStore.offers.map((offer) => <p key={offer.id} role="status" className="plan-alert-line">
          <strong>Folytatható munka:</strong> {offer.sourceName || "tervrajz"} · {offer.sectionCount} szakasz · {atTime(offer.updatedAt)}. A tervrajzot újra ki kell választanod; a szakaszok és a lépték csak egyező rajznál állnak vissza, a fedettséget pedig újra igazolnod kell.
          {" "}<button type="button" className="text-button" onClick={() => void restoreStoredSession(offer)}>Folytatom</button>
          {" "}<button type="button" className="text-button" onClick={() => void sessionStore.discard(offer.id)}>Eldobom</button>
        </p>)}
        <p className="plan-hint">A rajzos munka folytatása bekapcsolva ezen az eszközön. <button type="button" className="text-button" onClick={() => void sessionStore.setEnabled(false)}>Kikapcsolom és törlöm a helyi munkákat</button></p>
      </>}
  </div>;
  const sessionInput = <input type="file" accept="application/json,.json" onChange={(event) => { const input = event.currentTarget; const selectedFile = input.files?.[0]; input.value = ""; void importWorkSession(selectedFile); }} />;
  const drawingInput = <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => { const input = event.currentTarget; const next = input.files?.[0]; input.value = ""; void chooseFile(next); }} />;

  return <details className="plan-field-transfer" open={panelOpen} onToggle={(event) => setPanelOpen(event.currentTarget.open)}>
    <summary><FileUp aria-hidden="true" className="size-4" /> Kitöltés tervrajzból{file && <span className="plan-file-name">{file.name}</span>}</summary>
    <div className="plan-field-transfer-body">
      {busy && <p role="status" className="plan-hint">Feldolgozás…</p>}
      {error && <p role="alert" className="plan-alert-line is-error">{error}</p>}
      {workSessionError && <p role="alert" className="plan-alert-line is-error">{workSessionError}</p>}
      {storeStatus}
      {importedWorkSession && <p role="status" className="plan-alert-line">Betöltött munka: a mezőértékek ellenőrizendők, a fedettséget és a rajzi jóváhagyásokat újra meg kell adni.{restoredSourceMatch === "pending" ? " Válaszd ki az eredeti rajzot a kijelölésekhez." : restoredSourceMatch === "matched" ? " A rajz egyezik (SHA-256); a kijelölések újra láthatók." : restoredSourceMatch === "different" ? " A rajz eltér; a régi kijelölések leválasztva." : ""}</p>}
      {importedWorkSession && !file && sections.length > 0 && <div className="plan-section-strip" aria-label="Folytatható tetőszakaszok">{sections.map((section) => <button type="button" className="plan-chip-button" key={section.id} aria-pressed={section.id === activeSectionId} onClick={() => activateSection(section)}>{section.name} · újraellenőrzendő</button>)}</div>}

      {storeOffers}
      {!file && <div className="plan-empty">
        <label className="primary-button plan-file-button"><FileUp aria-hidden="true" className="size-4" /> PDF vagy kép kiválasztása{drawingInput}</label>
        {isTakeoff && <label className="secondary-button plan-file-button"><FolderOpen aria-hidden="true" className="size-4" /> Korábbi munka folytatása{sessionInput}</label>}
        {isTakeoff && workSessionSource && sections.length > 0 && <button type="button" className="secondary-button" onClick={exportWorkSession}><Download aria-hidden="true" className="size-4" /> Munkaállapot mentése</button>}
        <p className="plan-hint">A terv csak ezen az eszközön, a böngészőben marad. A feliratokból te választod ki, mi kerül a kalkulátorba.</p>
      </div>}

      {file && <>
        {takeoffScopeActive && <div className="plan-section-strip" aria-label="Tetőszakaszok">
          {sections.map((section) => <button type="button" className="plan-chip-button" key={section.id} aria-pressed={section.id === activeSectionId} onClick={() => { if (section.id !== activeSectionId) { setEditingSection(false); activateSection(section); } }}>
            {section.coverage === "covered" && section.coverageConfirmed ? <CircleCheck aria-hidden="true" className="size-4 plan-ok" /> : <TriangleAlert aria-hidden="true" className="size-4 plan-warn" />}{section.name} · {drawingCoverageLabel(section)}
          </button>)}
          <button type="button" className="plan-chip-button" disabled={sections.length >= 30} onClick={addSection}><Plus aria-hidden="true" className="size-4" /> Új tetőszakasz</button>
        </div>}
        {removedSections.length > 0 && <p role="status" className="plan-alert-line">„{removedSections.at(-1)!.section.name}” törölve. <button type="button" className="text-button" disabled={sections.length >= 30} onClick={() => {
          const removed = removedSections.at(-1)!;
          setRemovedSections((items) => items.slice(0, -1));
          setSections((items) => restoreRoofSection(items, removed.section, removed.index));
          activateSection(removed.section);
        }}><Undo2 aria-hidden="true" className="size-4" /> Visszavonás{removedSections.length > 1 ? ` (${removedSections.length})` : ""}</button></p>}

        {(!planKind || editingPlanKind)
          && <section className="plan-step" aria-label="A lap tartalma">
            <h3 className="plan-step-title">Mit mutat ez a lap{pdf && pdf.pageCount > 1 ? ` (${page}. oldal)` : ""}?</h3>
            <div className="plan-quick-chips" role="group" aria-label="A lap típusa">
              {drawingPlanKindChoices.map((choice) => <button key={choice.kind} type="button" aria-pressed={planKind === choice.kind} onClick={() => { setPlanKinds((kinds) => ({ ...kinds, [page]: choice.kind })); setEditingPlanKind(false); setQuickMessage(null); }}>{choice.label}</button>)}
            </div>
            <p className="plan-hint">{planKindSuggestion === "floor-plan"
              ? "A lap felirata szerint földszinti alaprajz, de ezt neked kell megerősítened."
              : "A rajz felirata ezt nem mondja meg. Tetőtervnél a tetőméretek közvetlenül átvehetők; minden más lapon minden tetőméretet külön meg kell erősítened."}</p>
          </section>}

        {showSectionStep && <section className="plan-step" aria-label="Fedett tetőrész">
          <h3 className="plan-step-title">Jelöld ki a fedett tetőrészt</h3>
          <div className="plan-step-actions">
            <button type="button" className={selectingSection ? "primary-button" : "secondary-button"} onClick={() => { updateActiveSection({ points: [], page, coverageConfirmed: false }); setSelectingSection(true); onWholeRoofChange(false); }}><Crop aria-hidden="true" className="size-4" /> Szakasz kijelölése a rajzon</button>
            {(sectionPoints.length > 0 || selectingSection) && <button type="button" className="secondary-button" onClick={() => { updateActiveSection({ points: [], coverageConfirmed: false }); setSelectingSection(false); onWholeRoofChange(false); }}>Kijelölés törlése</button>}
          </div>
          {selectingSection ? <p role="status" className="plan-hint">Koppints a rajzon a terület két szemközti sarkára.</p>
            : sectionPoints.length === 2 && !sectionSelected ? <p role="alert" className="plan-alert-line is-error">A kijelölés nem fog körül területet; válassz két különböző sarkot.</p>
              : sectionSelected ? <p role="status" className="plan-hint"><CircleCheck aria-hidden="true" className="size-4 plan-ok" /> Kijelölve · {sectionPage}. oldal (csak vizuális hivatkozás, nem mér)</p> : null}
          {/* T5: on the drawing the part comes first and the name second — the step now asks in that order. The
              name stays required for saving (canSaveDrawingTakeoff), it is just no longer the first thing asked. */}
          <label>Szakasz neve<input value={sectionName} onChange={(event) => { updateActiveSection({ name: event.target.value }); onWholeRoofChange(false); }} placeholder="Például: főépület, A szárny" /></label>
          <label>Fedettség<select value={coverageStatus} onChange={(event) => changeCoverage(event.target.value as "covered" | "uncovered" | "unclear")}><option value="covered">Tetővel fedett</option><option value="uncovered">Fedetlen</option><option value="unclear">Még tisztázandó</option></select></label>
          {coverageStatus === "covered" && <label className="plan-check"><input type="checkbox" checked={coverageConfirmed} disabled={!hasSectionSelection} onChange={(event) => { updateActiveSection({ coverageConfirmed: event.target.checked }); if (!event.target.checked) onWholeRoofChange(false); }} /> A rajzon ellenőriztem, hogy ez a szakasz tetővel fedett; a teraszokat külön vizsgáltam.</label>}
          <div className="plan-step-actions">
            {sectionReady && <button type="button" className="primary-button" onClick={() => { setEditingSection(false); setSelectingSection(false); }}>Kész</button>}
            {sections.length > 1 && <button type="button" className="secondary-button plan-danger" onClick={deleteActiveSection}><Trash2 aria-hidden="true" className="size-4" /> Aktív szakasz törlése</button>}
          </div>
        </section>}
        {takeoffScopeActive && !showSectionStep && sections.length === 1 && <div className="plan-section-summary">
          <label className="plan-check"><input type="checkbox" checked={wholeRoofConfirmed} disabled={!coverageConfirmed || !sectionName.trim() || calculation.completeness.status !== "complete"} onChange={(event) => onWholeRoofChange(event.target.checked)} /> Ez az egyetlen szakasz a teljes épület tetejét lefedi.</label>
        </div>}

        {/*
          * P3.3d.1: keskeny és fekvő nézetben a chipek alapból csak a lépés nevét és az ikonját mutatják, mert a
          * teendő állapota amúgy is kiírva áll a sáv alatti „Következő" sorban. Így a hat lépés két sorba fér a
          * vászon előtt. Egyik lépés sem tűnik el, az `aria-label` minden chipen viszi az állapotot is, és az
          * „Állapotok" kapcsoló egy koppintással kiírja mindet. Széles nézetben a sáv változatlan (a kapcsoló ott
          * nem is látszik), a lépéslogika, a figyelmeztetések és a mentési kapuk pedig érintetlenek.
          */}
        <nav className={`plan-step-bar${stepStatesOpen ? " is-detailed" : ""}`} aria-label="A rajzos kitöltés állapota">
          <ol>
            {steps.map((step) => <li key={step.id}>
              <button type="button" className={`plan-step-chip${nextStep?.id === step.id ? " is-current" : ""}`}
                aria-label={`${step.label}: ${step.state}`}
                aria-current={nextStep?.id === step.id ? "step" : undefined} onClick={() => goToStep(step.id)}>
                {step.done
                  ? <CircleCheck aria-hidden="true" className="size-4 plan-ok" />
                  : step.optional ? null : <TriangleAlert aria-hidden="true" className="size-4 plan-warn" />}
                <span className="plan-step-chip-label">{step.label}</span>
                <span className="plan-step-chip-state">{step.state}</span>
              </button>
            </li>)}
          </ol>
          <p className="plan-hint">
            {nextStep ? `Következő: ${nextStep.label} — ${nextStep.state}.` : "Minden kötelező lépés kész. A részleteket lent ellenőrizd."}
            <button type="button" className="text-button plan-step-states-toggle" aria-expanded={stepStatesOpen} onClick={() => setStepStatesOpen((open) => !open)}>
              {stepStatesOpen ? "Állapotok elrejtése" : "Minden állapot"}
            </button>
          </p>
        </nav>

        {resultStrip && <section className={`plan-result-strip is-${resultStrip.tone}`} aria-label="Számított eredmény előnézete" aria-live="polite">
          {/* A 44 px-es ugrógomb a számok sorában áll, hogy ne tegyen hozzá egy teljes sort a vászon elé. */}
          <div className="plan-result-strip-row">
            <ul>{resultStrip.items.map((item) => <li key={item.label}>
              <span>{item.label}</span>
              <strong className={item.proven ? undefined : "plan-result-open"}>{item.text}</strong>
            </li>)}</ul>
            {/* Egyetlen navigációs lehetőség a teljes eredményhez; a többi pointert a lépéssáv és a teendőblokk adja. */}
            <button type="button" className="text-button" onClick={() => scrollTo("construction-results")}>Teljes eredmény</button>
          </div>
          <p className="plan-hint">{resultStrip.state} · geometriai és kiosztási érték, nem beszerzési mennyiség.</p>
        </section>}

        <div className="plan-workspace">
          <div className="plan-canvas-column">
            {pdf && <div className="plan-toolbar" role="toolbar" aria-label="Rajz nézete">
              {pdf.pageCount > 1 && <label className="plan-page-select">Oldal <select value={page} onChange={(event) => { setPage(Number(event.target.value)); setTapCandidates([]); setSources([]); setSelected(null); setSelectedUnit(""); setFieldKey(""); setValue(""); setEntries([]); setReviewed(false); setEditingPlanKind(false); dispatchCalibration({ type: "clear-measure" }); }}>{/* T9: a multi-page set is answered page by page, so the picker says which pages already have an answer. */}
                {pdf.pages.map((item) => <option key={item.pageNumber} value={item.pageNumber}>{item.pageNumber}. · {planKinds[item.pageNumber] ? drawingPlanKindChoices.find((choice) => choice.kind === planKinds[item.pageNumber])!.label : "nincs megadva"}</option>)}</select></label>}
              <button type="button" className="icon-button" aria-label="Kicsinyítés" onClick={() => setZoom((currentZoom) => Math.max(.5, currentZoom - .25))}><ZoomOut aria-hidden="true" className="size-4" /></button>
              <span className="plan-zoom-value">{Math.round(zoom * 100)}%</span>
              <button type="button" className="icon-button" aria-label="Nagyítás" onClick={() => setZoom((currentZoom) => Math.min(4, currentZoom + .25))}><ZoomIn aria-hidden="true" className="size-4" /></button>
              <button type="button" className="icon-button" aria-label="Forgatás 90°" onClick={rotatePreview}><RotateCw aria-hidden="true" className="size-4" /></button>
              <span className="plan-hint plan-toolbar-meta">{selectedPage?.textSpans.length ?? 0} felirat{pdf.pageCount > 1 ? ` · ${pdf.pageCount} oldal` : ""}</span>
            </div>}
            {/* P1.6: a teljes aktív kalibráció/mérés munkaterület (pont-koppintás, hosszbeírás, mért eredmény,
                összevetés) a vászon felett jelenik meg, nem a lap alján — így kalibráció/mérés közben nem kell
                oda-vissza görgetni a vászon és egy távoli, lent lévő panel között. */}
            {calibration.marking && <div id="plan-calibration-workspace" className="plan-step-actions plan-calibration-tap-bar" role="status">
              <p className="plan-hint">{calibrationStepHints[calStep]} ({calibration.points.length}/4 pont)</p>
              {(calStep === "primary-length" || calStep === "check-length") && <div className="plan-quick-bar-row">
                <input inputMode="decimal" aria-label="Ismert hossz" value={calibrationLength.text} onChange={(event) => setCalibrationLength((current) => ({ ...current, text: event.target.value }))} />
                <span className="length-field-units" role="group" aria-label="Ismert hossz egysége">{(["mm", "cm", "m"] as const).map((unit) => <button key={unit} type="button" aria-pressed={calibrationLength.unit === unit} onClick={() => setCalibrationLength((current) => ({ ...current, unit }))}>{unit}</button>)}</span>
                <button type="button" className="primary-button" disabled={lengthToMm(calibrationLength.text, calibrationLength.unit) === null} onClick={commitCalibrationLength}>Kész</button>
              </div>}
              {calibration.issue && <p role="alert" className="plan-alert-line is-error">{calibrationIssueMessages[calibration.issue]}</p>}
              <button type="button" className="secondary-button" disabled={calibration.points.length === 0} onClick={() => dispatchCalibration({ type: "undo-point" })}><Undo2 aria-hidden="true" className="size-4" /> Pont vissza</button>
              <button type="button" className="secondary-button" onClick={() => dispatchCalibration({ type: "cancel" })}>Mégse</button>
            </div>}
            {measuringCalibration && <div id="plan-calibration-workspace" className="plan-step-actions plan-calibration-tap-bar" role="status">
              <p className="plan-hint">Koppints a mérendő méret két végpontjára. ({calibration.measure.length}/2)</p>
              <button type="button" className="secondary-button" onClick={() => dispatchCalibration({ type: "clear-measure" })}>Mégse</button>
            </div>}
            {!measuringCalibration && acceptedCalibration && calibration.measure.length === 2 && <div id="plan-calibration-workspace" className="plan-step-actions plan-calibration-tap-bar" role="status">
              {measureTooShort && <p role="alert" className="plan-alert-line is-error">A kijelölt mérés túl rövid a megbízható összevetéshez. Nagyíts rá, és jelöld ki újra a két végpontot.</p>}
              {measuredMm !== null && <p role="status" className="plan-alert-line"><strong>Mért hossz: {Math.round(measuredMm)} mm</strong>{calibrationPageSize ? ` · ${distanceInPoints(calibration.measure[0]!, calibration.measure[1]!, calibrationPageSize).toFixed(1)} pt a lapon` : ""}</p>}
              {measuredMm !== null && (!selected
                ? <p className="plan-hint">Jelölj ki egy feliratot a rajzon, ha ezzel a méréssel szeretnéd összevetni.</p>
                : selectedLabelValue === null
                  ? <p className="plan-hint">A kijelölt felirat nem egyetlen, egyértelmű szám, ezért nem vethető össze a méréssel.</p>
                  : selectedLink
                    ? <div className="plan-calibration-evidence">
                      <p>A kijelölt „{selected.originalText}” felirat a mért hosszhoz képest:</p>
                      <ul>{labelEvidence.map((item) => <li key={item.unit}>{item.consistent ? "✓" : "✕"} {item.unit}: {Math.round(item.valueMm)} mm · eltérés {(item.deviationRatio * 100).toFixed(0)}%</li>)}</ul>
                      <p role="status">{evidenceUnit
                        ? `A mérés a(z) ${evidenceUnit} olvasatot támasztja alá. Az átvitelhez továbbra is te választod ki a mezőt és az egységet; ez a jelzés nem tölt ki semmit.`
                        : "A mérés egyetlen olvasatot sem támaszt alá egyértelműen, ezért az érték ellenőrizendő marad."}</p>
                    </div>
                    : <div className="plan-step-actions">
                      <p className="plan-hint">A „{selected.originalText}” felirat még nincs összekapcsolva ezzel a méréssel.</p>
                      <button type="button" className="secondary-button" onClick={linkMeasurementToSelected}>Összekapcsolás a kijelölt felirattal</button>
                      <button type="button" className="text-button" onClick={() => scrollTo("plan-field-transfer-editor")}>Ugrás a kijelölt felirathoz</button>
                    </div>)}
              <button type="button" className="secondary-button" onClick={() => dispatchCalibration({ type: "clear-measure" })}>Mérés törlése</button>
            </div>}
            <div className={`plan-field-transfer-preview${calibrationWorkspaceActive ? " is-calibrating" : ""}`}>
              <div className={`plan-field-transfer-page${selectingSection || markingCalibration || measuringCalibration ? " is-selecting-section" : ""}`} style={pdf ? { width: `${zoom * 100}%` } : undefined} role="group" tabIndex={selectingSection ? 0 : -1} aria-label={markingCalibration ? "Léptékpont kijelölése" : measuringCalibration ? "Mérési pont kijelölése" : selectingSection ? sectionPoints.length ? "A tetőszakasz kijelölésének második sarka" : "A tetőszakasz kijelölésének első sarka" : "PDF előnézet"} onClick={(event) => {
                if (!selectingSection && !markingCalibration && !measuringCalibration) return;
                const bounds = event.currentTarget.getBoundingClientRect();
                const point = pagePointFromViewport({ x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height }, rotation);
                if (markingCalibration) { dispatchCalibration({ type: "add-point", point }); return; }
                if (measuringCalibration) { dispatchCalibration({ type: "measure-point", point }); return; }
                if (sectionPoints.length === 0 || sectionPage !== page) updateActiveSection({ page, points: [point], coverageConfirmed: false });
                else { updateActiveSection({ points: [...sectionPoints.slice(0, 1), point], coverageConfirmed: false }); setSelectingSection(false); }
              }} onKeyDown={(event) => {
                if (!selectingSection || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                const point = pagePointFromViewport({ x: 0.5, y: 0.5 }, rotation);
                if (sectionPoints.length === 0 || sectionPage !== page) updateActiveSection({ page, points: [point], coverageConfirmed: false });
                else { updateActiveSection({ points: [...sectionPoints.slice(0, 1), point], coverageConfirmed: false }); setSelectingSection(false); }
              }}>
                {pdf ? <canvas ref={canvas} aria-label={`PDF előnézet, ${page}. oldal`} /> : imageUrl && <img src={imageUrl} alt="Helyi tervrajz előnézete" />}
                {sections.map((section) => { const points = polygonFor(section); return points && <svg key={section.id} className={`plan-field-transfer-section-overlay${section.id === activeSectionId ? " is-active" : ""}`} viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true"><polygon points={points} /></svg>; })}
                {(calibration.points.length > 0 || calibration.measure.length > 0) && <svg className="plan-calibration-overlay" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
                  {[calibration.points.slice(0, 2), calibration.points.slice(2, 4), calibration.measure].map((segment, index) => segment.length === 2
                    && <polyline key={index} className={index === 2 ? "is-measure" : undefined} points={calibrationPoints(segment)} />)}
                  {[...calibration.points, ...calibration.measure].map((point, index) => { const spot = viewportPointFromPage(point, rotation); return <circle key={index} cx={spot.x} cy={spot.y} r={.008} />; })}
                </svg>}
                {/* While a point is being placed the label buttons would swallow the tap, and a dimension line's end
                    is often right under a label — so they step aside, as they already do for a section selection. */}
                {!selectingSection && !markingCalibration && !measuringCalibration && pageSources.map((source, index) => source.bounds && <button key={`${source.sourceDocumentId}-${index}`} type="button" className={`plan-field-transfer-hit${selected === source ? " is-selected" : ""}`} /* Centred on the label, not anchored to its top-left corner: the button grows to its 20 px minimum and the 44 px
   sense zone grows around it, so both stay concentric with the text the user is aiming at. Anchoring the corner
   pushed a small label's box about 8 px down and right, into the next dimension row's zone. */
style={{ left: `${(source.bounds.x + source.bounds.width / 2) * 100}%`, top: `${(source.bounds.y + source.bounds.height / 2) * 100}%`, width: `${Math.max(source.bounds.width * 100, 2)}%`, height: `${Math.max(source.bounds.height * 100, 2)}%`, transform: "translate(-50%, -50%)" }} aria-label={`Forrásszöveg: ${source.originalText}`} onClick={(event) => { event.stopPropagation(); tapSource(source, event); }} />)}
              </div>
            </div>
          </div>

          <section id="plan-quick-bar" className="plan-quick-bar" aria-label="Gyors kitöltés a rajzról">
            <div className="plan-quick-bar-row">
              {/* T3: the full field list stays a native select. A non-wrapping chip strip cannot hold these labels at
                  phone width — measured at 375 px: 954 px of chips in a 300 px strip, 2 of 7 visible, and
                  `.plan-quick-chips` hides its scrollbar, so the rest is undiscoverable. The separate
                  missing-field chip row that used to duplicate this control is gone; `runQuickTransfer` already
                  arms the next missing field by itself. */}
              <label className="plan-quick-target"><span className="plan-visually-hidden">Kitöltendő mező</span><select value={targetField ? targetFieldKey : ""} onChange={(event) => chooseTargetField(event.target.value)}>
                <option value="">Nincs · részletes átvitel</option>
                {quickFields.map((field) => <option key={field.key} value={field.key}>{field.label} ({unitLabel(field)}){missingQuickFields.some((item) => item.key === field.key) ? " · még szükséges" : ""}</option>)}
              </select></label>
            </div>
            {quickMessage
              ? <p role={quickMessage.tone === "error" ? "alert" : "status"} className={`plan-quick-message is-${quickMessage.tone}`}>{quickMessage.text}</p>
              : <p role="status" className="plan-quick-note">{targetField ? `Koppints a rajzon a méretre: ${targetField.label} (${unitLabel(targetField)}).` : "Válassz mezőt, majd koppints a méretre a rajzon."}</p>}
            {pendingUnitSource && <span className="length-field-units plan-quick-ask" role="group" aria-label="Felirat egysége">{(["mm", "cm", "m"] as const).map((unit) => <button key={unit} type="button" onClick={() => chooseLabelUnit(unit)}>{unit}</button>)}</span>}
            {tapCandidates.length > 0 && <div className="plan-quick-chips" role="group" aria-label="Egymást átfedő feliratok">{tapCandidates.map((source, index) => <button key={`${source.sourceDocumentId}-${index}`} type="button" onClick={() => { setTapCandidates([]); useTappedSource(source); }}>{source.originalText}</button>)}</div>}
            {pendingQuickTransfer && <div className="plan-alert is-warning" role="group" aria-label="Kockázatos rajzi átvitel jóváhagyása"><TriangleAlert aria-hidden="true" className="size-4" /><div>
              <p><strong>{pendingQuickTransfer.decision.reason}</strong></p>
              <p>Forrás: „{pendingQuickTransfer.source.originalText}” · cél: {fields.find((field) => field.key === pendingQuickTransfer.fieldKey)?.label} · egység: {pendingQuickTransfer.decision.sourceUnit} · {pendingQuickTransfer.previous.trim() || "üres"} → {pendingQuickTransfer.decision.value} {fields.find((field) => field.key === pendingQuickTransfer.fieldKey)?.unit}</p>
              <div className="plan-step-actions"><button type="button" className="primary-button" onClick={() => {
                if ((current[pendingQuickTransfer.fieldKey] ?? "") !== pendingQuickTransfer.previous) { setPendingQuickTransfer(null); setQuickMessage({ tone: "error", text: "A célmező időközben megváltozott. Válaszd ki újra a feliratot." }); return; }
                commitQuickTransfer(pendingQuickTransfer.source, pendingQuickTransfer.fieldKey, pendingQuickTransfer.decision);
              }}>Jóváhagyás és átvitel</button><button type="button" className="secondary-button" onClick={() => { setPendingQuickTransfer(null); setQuickMessage({ tone: "info", text: "Az átvitel megszakítva; a kalkulátorérték nem változott." }); }}>Mégse</button></div>
            </div></div>}
            {lastQuick && <div className="plan-quick-bar-row plan-quick-inline">
              <button type="button" className="secondary-button plan-undo" aria-label="Visszavonás" onClick={undoQuickTransfer}><Undo2 aria-hidden="true" className="size-4" /> Vissza</button>
              {lastQuick.unitOrigin !== "pdf" && <span className="length-field-units" role="group" aria-label="Ennek a feliratnak az egysége" title="Más egység erre a feliratra">{(["mm", "cm", "m"] as const).map((unit) => <button key={unit} type="button" aria-pressed={lastQuick.entry.sourceUnit === unit} onClick={() => reapplyLabelUnit(unit)}>{unit}</button>)}</span>}
            </div>}
            {chosenUnitEntries.length > 0 && <ul className="plan-quick-chosen" aria-label="Általad választott egységű értékek">{chosenUnitEntries.map((entry) => <li key={entry.fieldKey}><TriangleAlert aria-hidden="true" className="size-4 plan-warn" /><span>{fields.find((field) => field.key === entry.fieldKey)?.label}: <strong>{entry.value} {fields.find((field) => field.key === entry.fieldKey)?.unit}</strong> · „{entry.sourceText}” = {entry.sourceUnit}, általad választva</span></li>)}</ul>}
            {targetField && planKind && needsPlanScope(targetField.key) && !(takeoffScopeActive && (!sectionName.trim() || !coverageConfirmed)) && !planScopeConfirmed.includes(planScopeKey) && <label className="plan-check"><input type="checkbox" checked={false} onChange={() => setPlanScopeConfirmed((keys) => [...keys, planScopeKey])} /> A rajzi méreteket {takeoffScopeActive ? "ennél a szakasznál" : "ennél a rajznál"} a fedett tetőrészhez rendelem; alaprajzi külső méretet nem veszek át ellenőrzés nélkül.</label>}
          </section>
        </div>

        {(!pdf || selectedPage?.textSpans.length === 0) && <button type="button" className="secondary-button" disabled={busy} onClick={() => void runOcr()}><ScanText aria-hidden="true" className="size-4" /> OCR-javaslatok keresése</button>}

        {/* P1.6: kalibráció/mérés pont-koppintása közben ez a blokk elrejtve marad, hogy a vászon maradjon a fő
            tartalom és ne kelljen egyszerre annyi információt átlátni — a figyelmeztetések a tapintás végén,
            automatikusan újra megjelennek, semmi nem vész el. */}
        {!calibration.marking && !measuringCalibration && <section id="plan-todo" className="plan-todo" aria-label="Teendők és figyelmeztetések">
          {planKind && planKind !== "roof-plan" && <div className="plan-alert is-warning"><TriangleAlert aria-hidden="true" className="size-4" /><div><p><strong>{drawingPlanWarnings[planKind]}</strong></p>
            <details className="plan-why"><summary>Miért?</summary><p>A rajzi méret önmagában nem bizonyít tetőgeometriát: a külső és belső méretek, teraszok, területek és százalékos lejtések a falakra, a födémre vagy a vágási síkra vonatkozhatnak. Ezért nincs automatikus tetőmező-javaslat, és minden tetőméretnél külön meg kell erősítened, hogy a ténylegesen fedett tetőrészhez tartozik.</p></details></div></div>}
          {missing.length > 0 && <div className="plan-alert"><ListChecks aria-hidden="true" className="size-4" /><div>
            <p><strong>Még szükséges:</strong> {missing.map((field) => field.label).join(", ")}</p>
            {/* T7: a sorban következő hiányzó kötelező mező itt, a rajz mellett adható meg — nem új blokk, a
                meglévő figyelmeztetésen belül. A kalkulátorűrlapon a helyén odamutató sor marad. */}
            {guidedMissingField && renderField && <div className="plan-assumption-field">
              <p className="plan-hint">Következő adat: <strong>{guidedMissingField.label}</strong>{guidedMissingField.unit ? ` (${guidedMissingField.unit})` : ""}</p>
              {renderField(guidedMissingField)}
            </div>}
          </div></div>}
          {/*
            * P3.3f: egy kártya, soronként kiírt értékkel és EGY jóváhagyással, a korábbi négy külön gomb helyett.
            * A tömeges elfogadás pontosan azokra a kulcsokra vonatkozik, amelyek itt ki vannak írva; egy később
            * megjelenő alapérték újra kér jóváhagyást. A soronkénti „valós érték megadása" út változatlan: a
            * `cededFieldKey`-hez tartozó mező továbbra is itt renderel, egyszerre egyet kérdezve.
            */}
          {unconfirmedAssumptions.length > 0 && <div className="plan-alert is-warning plan-assumptions" role="group" aria-label="Megerősítendő alapértékek"><TriangleAlert aria-hidden="true" className="size-4" /><div>
            <p role="status"><strong>Alapérték, a rajz nem igazolja.</strong> Az előnézet ezzel számol; mentés előtt fogadd el, vagy add meg a valós értéket.</p>
            <ul>{unconfirmedAssumptions.map((field) => <li key={field.key}>
              {field.key === "roofShape"
                ? <span>Tetőforma: <strong>{assumptionShapeLabel(field)}</strong></span>
                : <span>{field.label}: <strong>{current[field.key]?.trim() ? `${current[field.key]!.trim()} mm` : "nincs megadva → 0 mm"}</strong></span>}
              {/* Egy kérdés egyszerre: csak az éppen bekért alapértékhez jelenik meg a mező. Mind a négyet
                  kirajzolva a blokk 375 px-en 436 px-ről 724 px-re nőne, és elnyomná a vásznat. */}
              {renderField && field.key === cededFieldKey && <div className="plan-assumption-field">{renderField(field)}</div>}</li>)}</ul>
            <button type="button" className="secondary-button" onClick={() => confirmAssumptions(unconfirmedAssumptions.map((field) => field.key))}>
              Mind a kiírt alapérték elfogadása ({unconfirmedAssumptions.length})
            </button>
          </div></div>}
          {overhangLimitation && <p role="note" className="plan-alert-line">Számítási korlát · {overhangLimitation}</p>}
          {sections.length > 1 && <p className="plan-alert-line">{sections.length} szakasz, mindegyik külön kalkuláció. Közös elemeket és teljes tető-összeget nem számolunk.</p>}
          {invalidSectionNames.length > 0 && <p role="status" className="plan-alert-line is-error">Hibás vagy ellentmondó adat: {invalidSectionNames.join(", ")}. A munka menthető, de kalkulációt csak javítva lehet menteni.</p>}
          {takeoffScopeActive && <div className="plan-step-actions">
            <button type="button" className="secondary-button" onClick={() => scrollTo("construction-geometry-inputs")}>Tetőforma és méretek megadása</button>
            <button type="button" className="secondary-button" onClick={() => scrollTo("construction-material-inputs")}>Anyagadatok megadása</button>
          </div>}
        </section>}

        {selected && <section id="plan-field-transfer-editor" className="plan-field-transfer-editor plan-step" aria-label="Felirat hozzárendelése">
          <p>Kijelölt felirat: <strong>{selected.originalText}</strong> · {selected.method === "ocr" ? `OCR, ${selected.confidence ?? "?"}% confidence (nem pontossági igazolás)` : "PDF.js szöveg"}</p>
          {fieldSuggestion && <p>Lehetséges mező: <strong>{fields.find((field) => field.key === fieldSuggestion.fieldKey)?.label}</strong> · <strong>{fieldSuggestion.value} mm</strong> ({fieldSuggestion.ruleId}). Külön kell jóváhagynod.</p>}
          {unitlessSelection && <label>Felirat egysége (kötelező)<select value={selectedUnit} onChange={(event) => { const nextUnit = event.target.value as LengthUnit | ""; setSelectedUnit(nextUnit); setValue(selected && selectedField ? suggestDrawingValue(selected.originalText, selected.method, selectedField.unit, nextUnit || undefined)?.value ?? "" : ""); setReviewed(false); setGeometryConfirmed(false); setMeasurementConflictAcknowledged(false); setOverwrite(false); }}><option value="">Válassz egységet…</option><option value="mm">mm</option><option value="cm">cm</option><option value="m">m</option></select><small>A rajzon nincs egység; a lépték nem határozza meg. Csak erre a feliratra érvényes.</small></label>}
          <label>Kalkulátormező<select value={fieldKey} onChange={(event) => { const nextKey = event.target.value; const nextField = fields.find((field) => field.key === nextKey); setFieldKey(nextKey); setValue(selected && nextField ? suggestDrawingValue(selected.originalText, selected.method, nextField.unit, selectedUnit || undefined)?.value ?? "" : ""); setOverwrite(false); setReviewed(false); setGeometryConfirmed(false); setMeasurementConflictAcknowledged(false); }}><option value="">Válassz mezőt…</option>{fields.map((field) => <option key={field.key} value={field.key}>{field.label} ({field.unit || "egység nélkül"})</option>)}</select></label>
          {fieldKey && <>{valueSuggestion
            ? <p>Javaslat: <strong>{valueSuggestion.sourceUnit} → {valueSuggestion.value} {valueSuggestion.targetUnit}</strong> ({valueSuggestion.unitOrigin === "user" ? "általad választott egység" : "a rajzon szereplő egység"}).</p>
            : <p className="plan-hint">Ehhez a felirat–mező pároshoz nincs biztonságos értékjavaslat; az értéket kézzel adhatod meg.</p>}
            <label>Ellenőrzött érték ({selectedField?.unit || "nincs megadott egység"})<input inputMode="decimal" value={value} onChange={(event) => { setValue(event.target.value); setReviewed(false); setGeometryConfirmed(false); }} /></label>
            {requiresGeometryConfirmation && <label className="plan-check"><input type="checkbox" checked={geometryConfirmed} onChange={(event) => setGeometryConfirmed(event.target.checked)} /> Ellenőriztem, hogy ez a méret a fedett tetőszakaszhoz tartozik, nem a teljes alaprajzi külső méret.</label>}
            {splitPowerSelection && <p role="alert">A felirat mögött felső index (²/³) áll a rajzon: ez terület vagy térfogat, nem hosszméret, ezért nem vihető át.</p>}
            {percentUsedAsPitch && <p role="alert">A százalékos lejtés nem fokérték; hajlásszögként nem vihető át.</p>}
            {transferConflictsWithMeasurement && <div className="plan-alert is-warning"><TriangleAlert aria-hidden="true" className="size-4" /><div>
              <p><strong>Az érték nem egyezik a mért hosszal.</strong> Ellenőrizd az egységet és a méretvonal végpontjait a rajz feletti mérési összevetésben. <button type="button" className="text-button" onClick={() => scrollTo("plan-calibration-workspace")}>Ugrás a méréshez</button></p>
              {/* A checkbox nem minősíti "méréssel igazolttá": a mérés ettől továbbra is ellentmond, csak a felhasználó tudatosan felülírja. Az átvitt érték ezt a konfliktust megőrzi a forráslistában. */}
              <label className="plan-check"><input type="checkbox" checked={measurementConflictAcknowledged} onChange={(event) => setMeasurementConflictAcknowledged(event.target.checked)} /> Tudom, hogy ellentmond a mért hossznak; kézi döntésként mégis hozzáadom (ettől nem lesz méréssel igazolt).</label>
            </div></div>}
            {existingValue && <label className="plan-check"><input type="checkbox" checked={overwrite} onChange={(event) => setOverwrite(event.target.checked)} /> Meglévő érték felülírása ({existingValue})</label>}</>}
          {takeoffScopeActive && requiresGeometryConfirmation && (!sectionName.trim() || !coverageConfirmed) && <p role="status" className="plan-alert-line">Előbb nevezd meg a szakaszt és igazold, hogy fedett.</p>}
          <button type="button" className="primary-button" disabled={!fieldKey || !value.trim() || (unitlessSelection && (!selectedUnit || selectedField?.unit !== "mm" || !valueSuggestion)) || (requiresGeometryConfirmation && (!geometryConfirmed || (takeoffScopeActive && (!sectionName.trim() || !coverageConfirmed)))) || Boolean(percentUsedAsPitch) || splitPowerSelection || (transferConflictsWithMeasurement && !measurementConflictAcknowledged)} onClick={addEntry}>Javaslat hozzáadása</button>
        </section>}
          {entries.length > 0 && <section className="plan-step" aria-label="Átvezetés előnézete"><h3 className="plan-step-title">Átvezetés áttekintése</h3><ul>{entries.map((entry) => <li key={entry.fieldKey}><strong>{fields.find((field) => field.key === entry.fieldKey)?.label}</strong>: {entry.value} {fields.find((field) => field.key === entry.fieldKey)?.unit} · „{entry.sourceText}” ({entry.pageNumber}. oldal, {entry.method}{entry.sourceUnit ? `, ${entry.sourceUnit}${entry.unitOrigin === "user" ? " · általad választva" : " · a rajzon"}` : ""}){entry.overwrite && " · felülírás"}{entry.semanticOverride && " · szakmai címkeellentmondás kézi jóváhagyása"}{entry.measurementOverride && " · mért hossznak ellentmondó, kézi felülbírálás"}<button type="button" className="text-button" onClick={() => { setEntries((items) => items.filter((item) => item.fieldKey !== entry.fieldKey)); setReviewed(false); }}>Eltávolítás</button></li>)}</ul>
          {!applied && <><label className="plan-check"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /> Ellenőriztem a terven a feliratokat, értékeket és egységeket.</label><button type="button" className="primary-button" disabled={!reviewed} onClick={approve}>Jóváhagyás és átvitel a kalkulátorba</button></>}
        </section>}
        {applied && <p role="status" className="plan-alert-line"><CircleCheck aria-hidden="true" className="size-4 plan-ok" /> Átvive a mentetlen kalkulátorba. Nincs automatikus mentés.</p>}

        {pdf && <details id="plan-calibration-panel" className="plan-disclosure plan-calibration" open={calibrationPanelOpen} onToggle={(event) => setCalibrationPanelOpen(event.currentTarget.open)}><summary>Lépték · kísérleti{acceptedCalibration ? " · igazolva" : ""}</summary>
          <div className="plan-calibration-body" role="group" aria-label="Lépték">
            {!calibration.marking && !calibration.accepted && <>
              <p className="plan-hint">Két ismert méretből léptéket számol, a másodikkal ellenőrzi. Nem tölt ki kalkulátormezőt, és nem mond semmit a tetőformáról vagy a fedettségről.</p>
              <button type="button" className="secondary-button" onClick={() => { chooseTargetField(""); dispatchCalibration({ type: "start" }); }}>Lépték megadása</button>
            </>}
            {/* P1.6: amíg kalibrálsz, a lépések, a hosszbeírás és a mérési eredmény/összevetés a vászon felett
                látható (lásd "plan-calibration-workspace"), itt csak egy rövid utaló jelenik meg — nincs duplikált
                tartalom két helyen. */}
            {calibration.marking && <p role="status" className="plan-hint">A kalibráció lépései a rajz felett jelennek meg.</p>}
            {calibration.accepted && <>
              <p role="status" className="plan-alert-line"><CircleCheck aria-hidden="true" className="size-4 plan-ok" /> Lépték igazolva a(z) {calibration.accepted.pageNumber}. oldalon · a két referencia eltérése {(calibration.accepted.deviationRatio * 100).toFixed(2)}%</p>
              {!acceptedCalibration && <p role="status" className="plan-alert-line">Ez a lépték a(z) {calibration.accepted.pageNumber}. oldalra érvényes; ezen az oldalon nem használható.</p>}
              <p className="plan-hint">Csak egységes léptékű rajzterületre érvényes. Torzult, fényképezett vagy több léptéket tartalmazó lapon a mért érték nem megbízható. A lépték nem bizonyítja a tetőformát, a fedettséget, sem azt, hogy a falméret tetőméret.</p>
              {acceptedCalibration && <div className="plan-step-actions">
                <button type="button" className={measuringCalibration ? "primary-button" : "secondary-button"} onClick={() => { chooseTargetField(""); dispatchCalibration({ type: "start-measure" }); }}>Méret mérése a rajzon</button>
              </div>}
              {acceptedCalibration && (measuringCalibration || calibration.measure.length === 2) && <p role="status" className="plan-hint">A mérés és az összevetés a rajz felett látható.</p>}
              <button type="button" className="secondary-button" onClick={() => { dispatchCalibration({ type: "reset" }); setLinkedMeasurement(null); }}>Újrakalibrálás</button>
            </>}
          </div>
        </details>}

        {pageSources.length > 0 && <details className="plan-disclosure"><summary>Összes felirat ({pageSources.length})</summary>
          <div className="plan-field-transfer-sources" aria-label="Kiválasztható rajzfeliratok">{pageSources.map((source, index) => <button type="button" key={`${source.sourceDocumentId}-${index}`} aria-pressed={selected === source} onClick={() => tapSource(source)}>{source.originalText} <small>{source.method === "ocr" ? `OCR · ${source.confidence ?? "?"}% · ellenőrizendő` : "PDF szöveg · ellenőrizendő"}</small></button>)}</div>
        </details>}
      </>}

      {approvedEntries.length > 0 && <details className="plan-disclosure"><summary>Átvitt értékek forrása ({approvedEntries.length})</summary><section aria-label="Jóváhagyott források"><ul>{approvedEntries.map((entry, index) => <li key={`${entry.sourceDocumentId}-${entry.pageNumber}-${index}`}><strong>{fields.find((field) => field.key === entry.fieldKey)?.label}</strong>: {entry.value} {fields.find((field) => field.key === entry.fieldKey)?.unit} · „{entry.sourceText}” · forrás {entry.sourceDocumentId}, {entry.method}, {entry.pageNumber}. oldal, pozíció {entry.position ? `${entry.position.x.toFixed(3)}, ${entry.position.y.toFixed(3)}` : "nincs"}, keret {entry.bounds ? `${entry.bounds.x.toFixed(3)}, ${entry.bounds.y.toFixed(3)}, ${entry.bounds.width.toFixed(3)}×${entry.bounds.height.toFixed(3)}` : "nincs"}{entry.sourceUnit ? ` · ${entry.sourceUnit}${entry.unitOrigin === "user" ? " (felhasználói egység)" : " (PDF-egység)"}` : ""}{entry.ruleId ? ` · szabály ${entry.ruleId}${entry.suggestedFieldKey !== entry.fieldKey ? ` · javasolt mező ${fields.find((field) => field.key === entry.suggestedFieldKey)?.label}` : ""}` : " · kézi mezőválasztás"}{entry.semanticOverride && " · szakmai címkeellentmondás kézi jóváhagyása"}{entry.measurementOverride && " · mért hossznak ellentmondó, kézi felülbírálás"}</li>)}</ul></section></details>}

      {file && <details className="plan-disclosure plan-more"><summary>További műveletek</summary><div className="plan-more-actions">
        {isTakeoff && <button type="button" className="secondary-button" disabled={!workSessionSource || sections.length === 0} onClick={exportWorkSession}><Download aria-hidden="true" className="size-4" /> Munkaállapot mentése</button>}
        {isTakeoff && <label className="secondary-button plan-file-button"><FolderOpen aria-hidden="true" className="size-4" /> Korábbi munka folytatása{sessionInput}</label>}
        <label className="secondary-button plan-file-button"><FileUp aria-hidden="true" className="size-4" /> Másik PDF vagy kép kiválasztása{drawingInput}</label>
        <button type="button" className="secondary-button plan-danger" onClick={() => { void (async () => { if (await requestConfirmation({ title: "Fájl és javaslatok elvetése", message: "Elveszik: az összes rajzi kijelölés, jóváhagyás és a szakaszokhoz tartozó mentetlen geometria, anyagadat. A PDF csak a böngésző memóriájában van, újra ki kell választanod.", cancelLabel: "Mégsem", actions: [{ label: "Elvetés", tone: "danger", run: () => undefined }] })) reset(); })(); }}><Trash2 aria-hidden="true" className="size-4" /> Fájl és javaslatok elvetése</button>
        {isTakeoff && <p className="plan-hint">A munkafájl (JSON) bizalmas méreteket és szakaszneveket tartalmazhat; csak kérésre készül, nem felhőmentés. Az eredeti rajzot külön őrizd meg. A PDF nem kerül a kalkulációba, csak a jóváhagyott mezők és az eredmény.</p>}
      </div></details>}
    </div>
  </details>;
}
