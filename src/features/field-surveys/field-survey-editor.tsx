"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { CircleAlert, CircleCheck, CircleDot, Info, Loader2, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { AnchoredPopover } from "@/components/ui/anchored-popover";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { detailedGableTemplates, detailedVergeTemplates, fieldSurveySemanticTypeLabels, fieldSurveyTemplates, quickGableTemplates, quickShedTemplates, fieldSurveyUnitLabels, fieldSurveyWorkTypeLabels, type FieldSurveyMeasurement, type FieldSurveySemanticType, type FieldSurveyUnit, type FieldSurveyWorkType } from "@/domain/field-surveys/contracts";
import { surveySections, surveySectionsSchema, type SurveySection, type SurveyCalculationLink, type SurveyExecutionPlanLink, type SurveyFollowup } from "@/domain/field-surveys/workspace";
import { moveDraftAside, newSurveyTarget, resolveRecovery, removeSurveyDraftRecovery, roofDetailDraft, serializeSurveyDraftSections, surveyDraftKey, writeSurveyDraftRecovery, type SurveyDraftRecovery, type SurveyMeasurementDraft, type SurveySectionDraft } from "./survey-draft-recovery";
import { SurveyRoofDetails } from "./survey-roof-details";
import { saveFieldSurveyAction } from "./field-survey-actions";
import type { FieldSurveyRecord, FieldSurveyRevisionRecord } from "./field-survey-data";
import { FieldSurveyPhotos } from "./field-survey-photos";
import { SurveyExecutionActions } from "./survey-execution-actions";
import { WorkspaceSummary } from "./workspace-summary";
import { SurveyMaterialListPanel } from "./survey-material-list-panel";
import type { SurveyMaterialSource } from "@/features/material-takeoffs/survey-material-source";
import type { SurveyLinkedMaterialList } from "@/features/material-takeoffs/material-list-links";
import { SurveyRoofWorkspace } from "./survey-roof-workspace";
import { RoofTypeSelector, roofTypeOptions } from "@/features/roof-models/roof-type-selector";
import { geometryFromSurveyMeasurements, surveyRoofFieldGroups, surveyRoofFieldMessages, surveyRoofFields } from "@/domain/field-surveys/roof-geometry";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, roofTimberInputFromParameters, type RoofTimberParameters } from "@/domain/calculations/roof-timber-layout";
import { TechnicalDrawing } from "@/features/roof-models/technical-drawing";
import { RoofGeometryResults } from "@/features/roof-models/roof-geometry-results";
import { RoofTimberQuantityPanel } from "@/features/roof-models/roof-timber-quantity-panel";
import { RoofUnderlayQuantityPanel } from "@/features/roof-models/roof-underlay-quantity-panel";
import type { RoofUnderlayParameters } from "@/domain/calculations/roof-underlay";
import { calculateRoofUnderlayLayout } from "@/domain/calculations/roof-underlay";
import { measurementGuideForSurvey } from "@/features/roof-models/measurement-guidance";
import { RoofWorkspace } from "@/features/roof-models/roof-workspace";
import { RoofModeSelector, QuickGableWorkspace, QuickShedWorkspace, DetailedGableWorkspace, type RoofMeasurementMode } from "./quick-gable-workspace";
import { calculateDetailedGable } from "@/domain/field-surveys/detailed-gable";
import { quickLengthMm } from "@/domain/field-surveys/quick-gable";
import { calculateQuickGable } from "@/domain/field-surveys/quick-gable";
import { calculateQuickShed, shedBuildingFieldMessages } from "@/domain/field-surveys/quick-shed";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { ensureTabId, liveTabIds } from "./draft-liveness";
import { addMissingMeasurements, appendSurveyMeasurement, type SurveyMeasurementTemplate } from "./measurement-creation";
import { buildGableSurveyPreview, type GableSurveyPreview } from "./gable-survey-preview";
import type { ExecutionPlanOption } from "@/features/execution/execution-data";

type SectionDraft = SurveySectionDraft;
type MeasurementDraft = SurveyMeasurementDraft;
const fieldHints: Partial<Record<FieldSurveySemanticType, string>> = {
  roof_eave_run: "Az eresz vonalával párhuzamosan mérve.",
  roof_plane_slope_a: "Eresztől a gerincig, a lejtő mentén.", roof_plane_slope_b: "Eresztől a gerincig, a lejtő mentén.",
  roof_ridge_length: "A gerinc teljes hossza.", roof_eave_a: "Az eresz hossza ezen a síkon.", roof_eave_b: "Az eresz hossza ezen a síkon.",
  roof_verge_a_left: "Nem kötelező — csak az oromszél hosszához kell.", roof_verge_a_right: "Nem kötelező — csak az oromszél hosszához kell.",
  roof_verge_b_left: "Nem kötelező — csak az oromszél hosszához kell.", roof_verge_b_right: "Nem kötelező — csak az oromszél hosszához kell.",
  roof_pitch: "Nem kötelező — a felülethez nem kell.",
  roof_building_length: "Az épület külső hossza, az eresz irányában.", roof_building_width: "Az épület külső szélessége.",
  roof_rise: "A gerinc magassága a fal tetejétől. Ha ezt nem tudod, add meg a hajlásszöget.",
  roof_eave_overhang: "Mennyivel nyúlik túl az eresz a falon. Ha nincs, írj 0-t.",
  roof_front_gable_overhang: "Az első oromfal túlnyúlása. Ha nincs, írj 0-t.", roof_rear_gable_overhang: "A hátsó oromfal túlnyúlása. Ha nincs, írj 0-t.",
};
const shedHints: Partial<Record<FieldSurveySemanticType, string>> = {
  roof_eave_run: "Az eresz vonalával párhuzamosan mérve.", roof_plane_slope_a: "Az ereszről a felső élig, a lejtő mentén.",
  roof_outer_length: "A tető külső hossza az eresz mentén.", roof_outer_width: "Vízszintesen mérve az eresztől a felső élig, nem a lejtő mentén.",
  roof_pitch: "Kötelező ebben a módban: a tető hajlásszöge fokban.",
};
const emptyMeasurement = (workType: FieldSurveyWorkType, id: string): MeasurementDraft => ({ ...fieldSurveyTemplates[workType][0], value: "", id });
const initialWorkTypeOptions: readonly { type: FieldSurveyWorkType; label: string; hint: string }[] = [
  { type: "roof", label: "Tető", hint: "Tetőforma és méretek" },
  { type: "other", label: "Egyéb munka", hint: "Tetőforma nélkül mérhető munka" },
];
const draftSections = (sections: SurveySection[]): SectionDraft[] => sections.map((section) => ({ ...section, roofDetails: section.roofDetails?.map(roofDetailDraft), measurements: section.measurements.map((measurement) => ({ ...measurement, value: measurement.value === null ? "" : String(measurement.value).replace(".", ","), semanticType: measurement.semanticType ?? "custom" })) }));
const initialSections = (survey?: FieldSurveyRecord | null): SectionDraft[] => survey ? draftSections(surveySections(survey)) : [{ id: "00000000-0000-4000-8000-000000000002", name: "Tető", workType: "roof", notes: "", photoIds: [], measurements: [emptyMeasurement("roof", "00000000-0000-4000-8000-000000000001")] }];
const serialize = serializeSurveyDraftSections;
const emptyRelationships: { calculations: SurveyCalculationLink[]; followups: SurveyFollowup[]; executionPlans: [] } = { calculations: [], followups: [], executionPlans: [] };

export function FieldSurveyEditor({ organizationId, userId, projects, executionPlans = [], survey, initialProjectId = null, initialSectionId = null, revisionVersions = [], historicalRevision = null, relationships = emptyRelationships, materialListSource = null, linkedMaterialLists = [], initialMaterialPanelOpen = false }: Readonly<{
  organizationId: string; userId?: string; projects: readonly { id: string; name: string }[]; survey?: FieldSurveyRecord | null; initialProjectId?: string | null;
  executionPlans?: readonly ExecutionPlanOption[];
  initialSectionId?: string | null;
  revisionVersions?: readonly number[]; historicalRevision?: FieldSurveyRevisionRecord | null;
  relationships?: { calculations: SurveyCalculationLink[]; followups: SurveyFollowup[]; executionPlans: SurveyExecutionPlanLink[] };
  materialListSource?: SurveyMaterialSource | null; linkedMaterialLists?: readonly SurveyLinkedMaterialList[]; initialMaterialPanelOpen?: boolean;
}>) {
  const router = useRouter();
  const { requestConfirmation, requestNavigation, notify } = useAppInteraction();
  const [sections, setSections] = useState(() => initialSections(survey));
  const [activeId, setActiveId] = useState(() => initialSections(survey).find((section) => section.id === initialSectionId)?.id ?? initialSections(survey)[0].id);
  const [projectId, setProjectId] = useState(survey?.projectId ?? initialProjectId ?? "");
  const [version, setVersion] = useState(survey?.version ?? 0);
  const [surveyId, setSurveyId] = useState<string | null>(survey?.id ?? null);
  const [initialWorkTypeChosen, setInitialWorkTypeChosen] = useState(Boolean(survey));
  const fingerprint = useMemo(() => JSON.stringify({ sections, projectId }), [sections, projectId]);
  const [baseline, setBaseline] = useState(fingerprint);
  const [workspacePersisted, setWorkspacePersisted] = useState(Boolean(survey?.sections));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [materialPanelOpen, setMaterialPanelOpen] = useState(initialMaterialPanelOpen);
  const [materialPanelPreparing, setMaterialPanelPreparing] = useState(false);
  const materialPanelRef = useRef<HTMLElement>(null);
  const [photoState, setPhotoState] = useState({ busy: false, queued: false });
  const [photos, setPhotos] = useState<{ id: string; filename: string }[]>([]);
  const [photoAssociationPending, setPhotoAssociationPending] = useState(false);
  const [focusedRoofMeasurement, setFocusedRoofMeasurement] = useState<FieldSurveySemanticType | null>(null);
  const [recentMeasurementId, setRecentMeasurementId] = useState<string | null>(null);
  const [measurementAddPending, setMeasurementAddPending] = useState(false);
  const saveLock = useRef(false);
  const createIdRef = useRef<string | null>(null);
  const measurementAddLock = useRef(false);
  const measurementAddTimer = useRef<number | null>(null);
  const measurementHighlightTimer = useRef<number | null>(null);
  const pendingMeasurementFocus = useRef<{ id: string; sectionId: string; keyboard: boolean } | null>(null);
  const dirty = baseline !== fingerprint;
  const blocked = saving || photoState.busy;
  const mainSections = sections.filter((section) => !section.elementKind);
  const active = mainSections.find((section) => section.id === activeId) ?? mainSections[0] ?? sections[0];
  const needsInitialWorkTypeChoice = surveyId === null && !initialWorkTypeChosen;
  const quickMode = active.workType === "roof" && active.roofType === "gable" && active.roofMeasurementMode === "quick";
  const quickResult = quickMode ? calculateQuickGable(active.measurements, active.quickPlanesMatch) : null;
  const detailedMode = active.workType === "roof" && active.roofType === "gable" && active.roofMeasurementMode === "detailed";
  const detailedResult = detailedMode ? calculateDetailedGable(active.measurements, active.quickPlanesMatch) : null;
  const hintFor = (semantic: FieldSurveySemanticType) => active.roofType === "shed" ? shedHints[semantic] : active.roofType && active.roofType !== "gable" ? (({ meaning, convention }) => `${meaning} ${convention}`)(measurementGuideForSurvey(active.roofType, semantic) ?? { meaning: "", convention: "" }).trim() || undefined : semantic === "roof_pitch" && !detailedMode ? "Ha nem tudod a tetőemelkedést, a hajlásszöget add meg." : fieldHints[semantic];
  const guideFor = (semantic: FieldSurveySemanticType | null) => {
    const hint = semantic ? hintFor(semantic) : undefined;
    return semantic && hint ? `${fieldSurveySemanticTypeLabels[semantic].replace(/^Nyeregtető · /, "")}: ${hint}` : "";
  };
  const shedQuickMode = active.workType === "roof" && active.roofType === "shed" && active.roofMeasurementMode === "quick";
  const shedResult = shedQuickMode ? calculateQuickShed(active.measurements) : null;
  const compactFieldMessages = quickResult?.fieldMessages ?? detailedResult?.fieldMessages ?? shedResult?.fieldMessages ?? {};
  const mmOf = (type: FieldSurveySemanticType) => quickLengthMm(active.measurements.find((measurement) => measurement.semanticType === type)).mm;
  const has = (type: FieldSurveySemanticType) => active.measurements.some((measurement) => measurement.semanticType === type && measurement.value.trim() !== "");
  const shedBuildingMessages = active.roofType === "shed" && !shedQuickMode ? shedBuildingFieldMessages(active.measurements) : {};
  const shedBuildingMissing = active.roofType === "shed" && !shedQuickMode ? surveyRoofFields("shed").filter((field) => !has(field.semanticType)).map((field) => field.label.toLowerCase()) : [];
  // Hip, pyramid, half-hip, L and T: one validated method (building dimensions); extras and duplicate roles live in an optional block.
  const multiShape = active.workType === "roof" && active.roofType && active.roofType !== "gable" && active.roofType !== "shed" ? active.roofType : null;
  const shapeFields = multiShape ? surveyRoofFields(multiShape) : [];
  const shapeMessages = multiShape ? surveyRoofFieldMessages(multiShape, active.measurements) : {};
  const shapePrimary = new Map<FieldSurveySemanticType, MeasurementDraft>();
  if (multiShape) for (const measurement of active.measurements) if (shapeFields.some((field) => field.semanticType === measurement.semanticType) && !shapePrimary.has(measurement.semanticType)) shapePrimary.set(measurement.semanticType, measurement);
  const shapeExtras = multiShape ? active.measurements.filter((measurement) => shapePrimary.get(measurement.semanticType) !== measurement) : [];
  const shapeMissing = multiShape && shapeFields.some((field) => has(field.semanticType)) ? shapeFields.filter((field) => !has(field.semanticType)).map((field) => field.label.toLowerCase()) : [];
  /** Only the fields the current task needs; hidden ones keep their saved values. */
  const compactVisible = (type: FieldSurveySemanticType): boolean => {
    const separate = active.quickPlanesMatch === false;
    if (shedQuickMode) return type === "roof_eave_run" || type === "roof_plane_slope_a";
    if (quickMode) return type === "roof_eave_run" || type === "roof_plane_slope_a" || (type === "roof_plane_slope_b" && (separate || has(type)));
    const ridge = mmOf("roof_ridge_length"); const verge = (plane: "a" | "b") => { const eave = mmOf(plane === "a" ? "roof_eave_a" : "roof_eave_b"); return Boolean(ridge && eave && eave !== ridge); };
    switch (type) {
      case "roof_ridge_length": case "roof_eave_a": case "roof_plane_slope_a": case "roof_pitch": return true;
      case "roof_eave_b": case "roof_plane_slope_b": return separate || has(type);
      case "roof_verge_a_left": case "roof_verge_a_right": return verge("a") || has(type);
      case "roof_verge_b_left": case "roof_verge_b_right": return (separate && verge("b")) || has(type);
      default: return false;
    }
  };
  const compactMeasurementOrder: readonly FieldSurveySemanticType[] = ["roof_eave_run", "roof_ridge_length", "roof_eave_a", "roof_plane_slope_a", "roof_verge_a_left", "roof_verge_a_right", "roof_eave_b", "roof_plane_slope_b", "roof_verge_b_left", "roof_verge_b_right", "roof_pitch"];
  const compactOptional: readonly FieldSurveySemanticType[] = ["roof_verge_a_left", "roof_verge_a_right", "roof_verge_b_left", "roof_verge_b_right", "roof_pitch"];
  const renderCompactFields = (optional: boolean) => compactMeasurementOrder.filter((type) => compactOptional.includes(type) === optional).flatMap((type) => active.measurements.map((measurement, index) => ({ measurement, index })).filter(({ measurement }) => measurement.semanticType === type && compactVisible(type))).map(({ measurement, index }) => <MeasurementField
    key={measurement.id}
    measurement={measurement}
    index={index}
    hint={hintFor(measurement.semanticType)}
    compact
    recent={measurement.id === recentMeasurementId}
    geometryError={compactFieldMessages[measurement.id]}
    disabled={blocked || Boolean(recovery)}
    onFocus={() => setFocusedRoofMeasurement(measurement.semanticType)}
    onBlur={() => setFocusedRoofMeasurement(null)}
    onPatch={(patch) => patchMeasurement(measurement.id, patch)}
    onRemove={() => void removeMeasurement(measurement.id)}
  />);
  const activeGablePreview = active.workType === "roof" && active.roofType === "gable" && !quickMode && !detailedMode ? buildGableSurveyPreview(active.measurements) : null;
  const activeSurveyGuide = active.roofType ? measurementGuideForSurvey(active.roofType, focusedRoofMeasurement ?? "custom", active.measurements.find((measurement) => measurement.semanticType === focusedRoofMeasurement)?.unit) : null;
  const effectiveProjectId = projectId || relationships.followups.find((followup) => followup.kind === "project")?.projectId || "";
  useLayoutEffect(() => {
    const pending = pendingMeasurementFocus.current;
    if (!pending) return;
    if (pending.sectionId !== activeId) {
      pendingMeasurementFocus.current = null;
      return;
    }
    const input = document.getElementById(`survey-measurement-${pending.id}`);
    if (!(input instanceof HTMLInputElement)) return;
    const rect = input.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const visibleTop = visualViewport?.offsetTop ?? 0;
    const visibleBottom = visibleTop + (visualViewport?.height ?? window.innerHeight);
    if (rect.top < visibleTop || rect.bottom > visibleBottom) input.scrollIntoView({ block: "nearest", behavior: "smooth" });
    if (pending.keyboard) input.focus({ preventScroll: true });
    pendingMeasurementFocus.current = null;
  }, [activeId, sections]);
  useEffect(() => () => {
    if (measurementAddTimer.current !== null) window.clearTimeout(measurementAddTimer.current);
    if (measurementHighlightTimer.current !== null) window.clearTimeout(measurementHighlightTimer.current);
  }, []);
  const onPhotos = useCallback((next: { id: string; filename: string }[]) => {
    setPhotos(next);
    setBaseline((current) => {
      const stored = JSON.parse(current) as { sections: SectionDraft[]; projectId: string };
      return JSON.stringify({ ...stored, sections: stored.sections.map((section) => ({ ...section, photoIds: section.photoIds.filter((id) => next.some((photo) => photo.id === id)) })) });
    });
    setSections((current) => {
      const cleaned = current.map((section) => ({ ...section, photoIds: section.photoIds.filter((id) => next.some((photo) => photo.id === id)) }));
      return JSON.stringify(cleaned) === JSON.stringify(current) ? current : cleaned;
    });
  }, []);
  // Draft identity: an editor instance (this mount) owns one record per survey; a new survey has its own stable draft id (kept in the URL).
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [otherDrafts, setOtherDrafts] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const draftTarget = surveyId ?? (draftId ? newSurveyTarget(draftId) : null);
  const recoveryKey = userId && draftTarget && instanceId ? surveyDraftKey(userId, organizationId, draftTarget, instanceId) : null;
  const [recovery, setRecovery] = useState<(SurveyDraftRecovery & { sourceKey: string }) | null>(null);
  const canSaveSurvey = !blocked && !recovery && !needsInitialWorkTypeChoice;
  const unsaved = dirty || photoAssociationPending;
  const saveBarState: "saving" | "error" | "recovery" | "unsaved" | "saved" | "new" = saving ? "saving" : error ? "error" : recovery ? "recovery" : unsaved ? "unsaved" : surveyId && workspacePersisted ? "saved" : "new";
  const saveIdle = !unsaved && Boolean(surveyId) && workspacePersisted;
  // aria-disabled (not disabled) keeps the buttons focusable, so keyboard and touch users can read why an action is unavailable.
  const blockedReason = recovery ? "Előbb állítsd vissza vagy vesd el a piszkozatot." : needsInitialWorkTypeChoice ? "Előbb válassz munkatípust." : blocked ? "Folyamatban van egy művelet." : "";
  const saveReason = blockedReason || (saveIdle ? "Nincs mentetlen módosítás." : "");
  const listReason = blockedReason || (!saveIdle ? "Előbb mentsd a felmérést." : photoState.queued ? "Várd meg a fotók feltöltését." : "");
  const saveBarLabels = { saving: "Mentés…", error: "A mentés nem sikerült", recovery: "Helyreállítható piszkozat", unsaved: "Nem mentett módosítások", saved: `Mentve · V${version}`, new: surveyId ? `Mentés szükséges · V${version}` : "Új felmérés · még nincs mentve" } as const;
  const SaveBarIcon = { saving: Loader2, error: CircleAlert, recovery: CircleDot, unsaved: CircleDot, saved: CircleCheck, new: CircleDot }[saveBarState];
  const recoveryChecked = useRef(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [draftStorageAvailable, setDraftStorageAvailable] = useState(true);
  const persistCurrentRef = useRef<() => Promise<{ surveyId: string; version: number } | null>>(async () => null);
  const saveForNavigation = useCallback(async () => {
    if (recovery || photoState.queued) return false;
    if (surveyId && workspacePersisted && !dirty && !photoAssociationPending) return true;
    return Boolean(await persistCurrentRef.current());
  }, [dirty, photoAssociationPending, photoState.queued, recovery, surveyId, workspacePersisted]);
  const discardForNavigation = useCallback(() => {
    if (recoveryKey) { try { removeSurveyDraftRecovery(localStorage, recoveryKey); } catch { /* Best effort. */ } }
    setRecovery(null); setError("");
    try {
      const saved = JSON.parse(baseline) as { sections: SectionDraft[]; projectId: string };
      setSections(saved.sections); setProjectId(saved.projectId);
    } catch { /* Keep the current editor state if the saved baseline is malformed. */ }
    setPhotoAssociationPending(false);
  }, [baseline, recoveryKey]);
  useUnsavedChangeGuard({
    dirty: !historicalRevision && (dirty || photoState.queued || photoAssociationPending),
    pending: blocked,
    save: !blocked && !photoState.queued ? saveForNavigation : undefined,
    discard: discardForNavigation,
  });
  /** Own draft is moved to a fresh key first: otherwise this tab's autosave (same key) would overwrite the very draft the user postponed. */
  function keepDraftForLater(sourceKey: string) {
    if (sourceKey === recoveryKey && userId && draftTarget) { try { moveDraftAside(localStorage, sourceKey, surveyDraftKey(userId, organizationId, draftTarget, generateSecureUuid())); } catch { setDraftStorageAvailable(false); } }
    setRecovery(null);
  }
  async function discardRecovery(sourceKey: string) {
    const accepted = await requestConfirmation({ title: "Piszkozat elvetése", message: "A mentetlen piszkozat véglegesen törlődik erről az eszközről. A már mentett felmérésváltozatokat ez nem érinti.", cancelLabel: "Mégse", actions: [{ label: "Piszkozat elvetése", tone: "danger", run: () => undefined }] });
    if (!accepted) return;
    try { removeSurveyDraftRecovery(localStorage, sourceKey); } catch { /* Storage is optional. */ }
    setRecovery(null);
  }
  useEffect(() => { if (userId) void ensureTabId().then(setInstanceId); }, [userId]);
  useEffect(() => {
    if (surveyId || historicalRevision) return;
    const params = new URLSearchParams(window.location.search);
    let id = params.get("draft");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      id = generateSecureUuid(); params.set("draft", id);
      window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
    }
    setDraftId(id);
  }, [surveyId, historicalRevision]);
  useEffect(() => {
    if (!userId || !draftTarget || !instanceId || historicalRevision || recoveryChecked.current) return;
    recoveryChecked.current = true;
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const wanted = params.get("recover");
        const { candidate, others } = resolveRecovery(localStorage, userId, organizationId, draftTarget, instanceId, wanted, await liveTabIds());
        if (wanted) { params.delete("recover"); window.history.replaceState(null, "", `${window.location.pathname}?${params}`); }
        setOtherDrafts(others);
        // Only this tab's own draft, or the one the dashboard named, is ever restored; one built on an older saved version is never applied silently.
        if (candidate) {
          if (candidate.draft.version === version) restoreDraftRef.current({ ...candidate.draft, sourceKey: candidate.key });
          else setRecovery({ ...candidate.draft, sourceKey: candidate.key });
        }
        setDraftStorageAvailable(true);
      } catch { setDraftStorageAvailable(false); }
      finally { setRecoveryReady(true); }
    })();
  }, [userId, draftTarget, instanceId, historicalRevision, organizationId, version]);
  // Invisible autosave: debounced, written only while there are unsaved changes, flushed when the page is hidden or left.
  const restoreDraftRef = useRef<(draft: SurveyDraftRecovery & { sourceKey: string }, rebase?: boolean) => void>(() => undefined);
  useEffect(() => {
    restoreDraftRef.current = ({ sourceKey, ...draft }, rebase = false) => {
      // Our own record is written before the source record is removed, so closing the tab at any moment loses nothing.
      if (recoveryKey && userId && draftTarget) {
        try {
          // An explicit restore never overwrites this tab's own, different draft: that one is kept aside under a fresh key first.
          if (sourceKey !== recoveryKey) moveDraftAside(localStorage, recoveryKey, surveyDraftKey(userId, organizationId, draftTarget, generateSecureUuid()));
          writeSurveyDraftRecovery(localStorage, recoveryKey, rebase ? { ...draft, version } : draft);
          if (sourceKey !== recoveryKey) removeSurveyDraftRecovery(localStorage, sourceKey);
        } catch { setDraftStorageAvailable(false); }
      }
      createIdRef.current = draft.requestSurveyId; setSections(draft.sections); setActiveId(draft.activeSectionId); setProjectId(draft.projectId); if (!rebase) setVersion(draft.version); setInitialWorkTypeChosen(true); setRecovery(null);
    };
  });
  const writeDraftRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    writeDraftRef.current = () => {
      if (!recoveryKey || !recoveryReady || historicalRevision || recovery) return;
      try {
        setDraftStorageAvailable(dirty
          ? writeSurveyDraftRecovery(localStorage, recoveryKey, { schemaVersion: 1, sections, activeSectionId: activeId, projectId, version, requestSurveyId: createIdRef.current, writer: instanceId ?? undefined })
          : removeSurveyDraftRecovery(localStorage, recoveryKey));
      } catch { setDraftStorageAvailable(false); }
    };
  });
  useEffect(() => {
    const timer = window.setTimeout(() => writeDraftRef.current(), dirty ? 500 : 0);
    return () => window.clearTimeout(timer);
  }, [recoveryKey, recoveryReady, historicalRevision, recovery, dirty, sections, activeId, projectId, version]);
  useEffect(() => {
    const flush = () => writeDraftRef.current();
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => { window.removeEventListener("pagehide", flush); document.removeEventListener("visibilitychange", onHide); flush(); };
  }, []);
  async function removeActiveSection() {
    if (sections.length === 1) return;
    const accepted = await requestConfirmation({
      title: "Munkaszakasz eltávolítása",
      message: "A szakasz kikerül az aktuális piszkozatból. A már mentett korábbi felmérésváltozatok, fotók és számításkapcsolatok megmaradnak.",
      cancelLabel: "Mégse",
      actions: [{ label: "Szakasz eltávolítása", tone: "danger", run: () => {
        const next = sections.filter((section) => section.id !== active.id);
        setSections(next); setActiveId(next[0].id);
      } }],
    });
    if (accepted) notify({ kind: "info", message: "A munkaszakasz az aktuális piszkozatból eltávolítva." });
  }
  async function removeMeasurement(id: string) {
    const measurement = active.measurements.find((item) => item.id === id);
    if (!measurement) return;
    const accepted = await requestConfirmation({
      title: "Mérés törlése",
      message: `A(z) „${measurement.label}” mérés kikerül az aktuális felmérés piszkozatából. A már mentett korábbi változatok változatlanok maradnak.`,
      cancelLabel: "Mégse",
      actions: [{ label: "Mérés törlése", tone: "danger", run: () => {
        patchSection({ measurements: active.measurements.filter((item) => item.id !== id) });
      } }],
    });
    if (accepted) notify({ kind: "info", message: "A mérés az aktuális piszkozatból eltávolítva." });
  }
  function commitSections(next: SectionDraft[]) { setSections(next); setError(""); }
  function patchSectionById(id: string, patch: Partial<SectionDraft>) { commitSections(sections.map((section) => section.id === id ? { ...section, ...patch } : section)); }
  function patchSection(patch: Partial<SectionDraft>) { patchSectionById(active.id, patch); }
  function patchMeasurement(id: string, patch: Partial<MeasurementDraft>) { patchSection({ measurements: active.measurements.map((measurement) => measurement.id === id ? { ...measurement, ...patch } : measurement) }); }
  async function selectRoofType(type: RoofGeometryType) {
    if (active.roofType === type) return;
    if (active.measurements.some((measurement) => measurement.value !== "")) {
      const accepted = await requestConfirmation({ title: "Tetőforma módosítása", message: "A jelenlegi mérések megmaradnak a korábbi felmérésváltozatban; ebben a munkaszakaszban az új tetőformához tartozó mezők nyílnak meg.", cancelLabel: "Mégse", actions: [{ label: "Tetőforma módosítása", tone: "primary", run: () => undefined }] });
      if (!accepted) return;
    }
    const templates = type === "gable" ? quickGableTemplates : type === "shed" ? quickShedTemplates : surveyRoofFields(type);
    patchSection({ roofType: type, roofMeasurementMode: type === "gable" || type === "shed" ? "quick" : undefined, quickPlanesMatch: undefined, measurements: templates.map((template) => ({ id: generateSecureUuid(), label: template.label, unit: template.unit, semanticType: template.semanticType, value: "" })) });
  }
  /** Keeps every entered value; only adds the target mode's missing fields. Known lengths are offered once (blank fields only), never overwritten. */
  function switchRoofMode(mode: RoofMeasurementMode) {
    const shed = active.roofType === "shed";
    const wanted = mode === "quick" ? (shed ? quickShedTemplates : quickGableTemplates) : shed ? surveyRoofFields("shed") : mode === "detailed" ? [...detailedGableTemplates, ...Object.values(detailedVergeTemplates)] : fieldSurveyTemplates.roof.filter((template) => template.semanticType !== "roof_pitch");
    const eaveRun = active.measurements.find((measurement) => measurement.semanticType === "roof_eave_run")?.value ?? "";
    const ridge = active.measurements.find((measurement) => measurement.semanticType === "roof_ridge_length")?.value ?? "";
    const seed = (semantic: FieldSurveySemanticType) => mode === "detailed" && (semantic === "roof_ridge_length" || semantic === "roof_eave_a" || (semantic === "roof_eave_b" && active.quickPlanesMatch === false)) ? eaveRun
      : mode === "quick" && semantic === "roof_eave_run" && ridge && quickLengthMm({ id: "r", semanticType: "roof_ridge_length", unit: "m", value: ridge }).mm === quickLengthMm(active.measurements.find((measurement) => measurement.semanticType === "roof_eave_a")).mm ? ridge : "";
    const all = addMissingMeasurements(active.measurements, wanted, generateSecureUuid).map((measurement) => measurement.value.trim() === "" && seed(measurement.semanticType) ? { ...measurement, value: seed(measurement.semanticType) } : measurement);
    patchSection({ roofMeasurementMode: mode, measurements: all });
  }
  async function returnToRoofSelection() {
    if (active.measurements.some((measurement) => measurement.value !== "")) {
      const accepted = await requestConfirmation({ title: "Tetőforma törlése", message: "A megadott tetőmérések elvesznek ebből az aktuális piszkozatból. Visszatérsz a tetőformákhoz?", cancelLabel: "Maradok", actions: [{ label: "Vissza a tetőformákhoz", tone: "danger", run: () => undefined }] });
      if (!accepted) return;
    }
    patchSection({ roofType: undefined, roofMeasurementMode: undefined, quickPlanesMatch: undefined, measurements: [emptyMeasurement("roof", generateSecureUuid())] });
  }
  function addSection(workType: FieldSurveyWorkType) {
    const id = generateSecureUuid();
    setSections((current) => [...current, { id, name: fieldSurveyWorkTypeLabels[workType], workType, notes: "", photoIds: [], measurements: [emptyMeasurement(workType, generateSecureUuid())] }]); setActiveId(id);
  }
  function changeType(workType: FieldSurveyWorkType) {
    const empty = active.measurements.length === 1 && active.measurements[0].value === "" && active.measurements[0].label === fieldSurveyTemplates[active.workType][0].label;
    patchSection({ workType, ...(workType === "roof" ? {} : { roofType: undefined, roofTimberParameters: undefined, roofMeasurementMode: undefined, quickPlanesMatch: undefined }), ...(active.name === fieldSurveyWorkTypeLabels[active.workType] ? { name: fieldSurveyWorkTypeLabels[workType] } : {}), ...(empty ? { measurements: [emptyMeasurement(workType, active.measurements[0].id)] } : {}) });
  }
  function addMeasurement(
    template = (active.workType === "roof" && active.roofType && active.roofType !== "gable" ? surveyRoofFields(active.roofType) : fieldSurveyTemplates[active.workType]).find((candidate) => !active.measurements.some((measurement) => measurement.semanticType === candidate.semanticType)) ?? { label: "Egyedi mérés", unit: "mm" as const, semanticType: "custom" as const },
    event?: MouseEvent<HTMLButtonElement>,
  ) {
    if (measurementAddLock.current) return;
    measurementAddLock.current = true;
    setMeasurementAddPending(true);
    try {
      const measurements = appendSurveyMeasurement(active.measurements, template as SurveyMeasurementTemplate, generateSecureUuid);
      const created = measurements[measurements.length - 1];
      pendingMeasurementFocus.current = { id: created.id, sectionId: active.id, keyboard: event?.detail === 0 };
      setRecentMeasurementId(created.id);
      if (measurementHighlightTimer.current !== null) window.clearTimeout(measurementHighlightTimer.current);
      measurementHighlightTimer.current = window.setTimeout(() => setRecentMeasurementId((current) => current === created.id ? null : current), 2200);
      patchSection({ measurements });
      notify({ kind: "success", message: `Mérés hozzáadva: ${created.label}.` });
      measurementAddTimer.current = window.setTimeout(() => {
        measurementAddLock.current = false;
        setMeasurementAddPending(false);
        measurementAddTimer.current = null;
      }, 350);
    } catch {
      measurementAddLock.current = false;
      setMeasurementAddPending(false);
      const message = "A mérés biztonságos, egyedi azonosítóját most nem sikerült létrehozni. Próbáld újra.";
      setError(message);
      notify({ kind: "error", message });
    }
  }
  function associateUploadedPhoto(photoId: string) {
    setSections((current) => current.map((section) => section.id === activeId && !section.photoIds.includes(photoId) ? { ...section, photoIds: [...section.photoIds, photoId] } : section));
    setPhotoAssociationPending(true);
  }
  async function persistCurrent(nextSections: SectionDraft[] = sections) {
    if (surveyId && workspacePersisted && !dirty && !photoAssociationPending) return { surveyId, version };
    if (saveLock.current) return null;
    saveLock.current = true; setSaving(true); setError("");
    try {
      const parsed = surveySectionsSchema.safeParse(serialize(nextSections));
      if (!parsed.success) { const message = parsed.error.issues[0]?.message ?? "Ellenőrizd a munkaszakaszokat."; setError(message); notify({ kind: "error", message }); return null; }
      const data = new FormData();
      const requestSurveyId = surveyId ?? (createIdRef.current ??= generateSecureUuid());
      data.set("organizationId", organizationId); data.set("surveyId", requestSurveyId);
      if (!surveyId && recoveryKey) {
        try {
          const persisted = writeSurveyDraftRecovery(localStorage, recoveryKey, { schemaVersion: 1, sections: nextSections, activeSectionId: activeId, projectId, version, requestSurveyId });
          setDraftStorageAvailable(persisted);
        } catch { setDraftStorageAvailable(false); }
      }
      data.set("projectId", projectId); data.set("workType", parsed.data[0].workType); data.set("notes", parsed.data[0].notes);
      data.set("sections", JSON.stringify(parsed.data)); data.set("measurements", JSON.stringify(parsed.data.flatMap((section) => section.measurements.filter((measurement) => measurement.value !== null)))); data.set("expectedVersion", String(version));
      const result = await saveFieldSurveyAction(data);
      if (!result.ok || !result.surveyId || !result.version) { const message = result.error ?? "Nem sikerült menteni. Próbáld újra."; setError(message); notify({ kind: "error", message }); return null; }
      if (recoveryKey) { try { removeSurveyDraftRecovery(localStorage, recoveryKey); } catch { /* Storage is optional; navigation warnings remain active. */ } }
      setWorkspacePersisted(true); setSections(nextSections); setBaseline(JSON.stringify({ sections: nextSections, projectId })); setSurveyId(result.surveyId); setVersion(result.version); setPhotoAssociationPending(false);
      if (!surveyId) { window.history.replaceState(null, "", `/felmeresek/${result.surveyId}?organization=${organizationId}&section=${active.id}`); }
      notify({ kind: "success", message: "Felmérés mentve" });
      return { surveyId: result.surveyId, version: result.version };
    } catch { const message = "A mentés válasza bizonytalan. Azonos adatokkal biztonságosan újrapróbálható."; setError(message); notify({ kind: "error", message }); return null; }
    finally { saveLock.current = false; setSaving(false); }
  }
  useEffect(() => { persistCurrentRef.current = () => persistCurrent(); });
  const materialPanelReady = materialPanelOpen && !materialPanelPreparing && !saving && Boolean(surveyId && materialListSource && materialListSource.surveyVersion === version);
  useEffect(() => {
    if (!materialPanelOpen) return;
    // Deferred so the framework's own scroll handling after hydration/navigation cannot undo the move.
    const timer = window.setTimeout(() => {
      const panel = materialPanelRef.current;
      if (!panel) return;
      const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.scrollIntoView({ behavior: reduceMotion || !document.hasFocus() ? "auto" : "smooth", block: "start" });
      panel.focus({ preventScroll: true });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [materialPanelOpen, materialPanelReady]);
  async function ensureSaved() { if (recovery) { setError("Előbb állítsd vissza vagy vesd el a korábbi piszkozatot."); return null; } return surveyId && workspacePersisted && !dirty && !photoAssociationPending ? { surveyId, version } : persistCurrent(); }
  async function openMaterialPanel() {
    setMaterialPanelOpen(true); setMaterialPanelPreparing(true);
    const saved = await ensureSaved();
    if (!saved) { setMaterialPanelOpen(false); setMaterialPanelPreparing(false); return; }
    setMaterialPanelPreparing(false);
    if (!materialListSource) router.replace(`/felmeresek/${saved.surveyId}?organization=${organizationId}&anyaglista=1`);
    else if (materialListSource.surveyVersion !== saved.version) router.refresh();
  }
  function navigate(href: string) { void requestNavigation(href); }
  const selectedVersion = historicalRevision?.version ?? version;
  const revisionSelector = surveyId && revisionVersions.length > 1 && <label className="field-survey-field"><span>Felmérés változata</span><select value={selectedVersion} disabled={blocked} onChange={(event) => navigate(`/felmeresek/${surveyId}?organization=${organizationId}${Number(event.target.value) === version ? "" : `&version=${event.target.value}`}`)}>{[...new Set([version, ...revisionVersions])].map((item) => <option key={item} value={item}>{item === version ? "Aktuális" : "Korábbi"} · V{item}</option>)}</select></label>;
  if (historicalRevision && surveyId) return <section className="field-survey-card"><GlassPageHeader title="Korábbi felmérés" context={`V${historicalRevision.version}`} />{revisionSelector}<WorkspaceSummary organizationId={organizationId} surveyId={surveyId} version={historicalRevision.version} sections={surveySections(historicalRevision)} calculations={relationships.calculations} initialFollowups={relationships.followups.filter((row) => row.surveyRevisionId === historicalRevision.id)} originalProjectId={historicalRevision.projectId} readOnly /><FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={historicalRevision.version} historical onVersionChange={() => undefined} onEnsureSaved={async () => null} onUploadComplete={() => undefined} /><button type="button" className="secondary-button" onClick={() => navigate(`/felmeresek/${surveyId}?organization=${organizationId}`)}>Aktuális felmérés folytatása</button></section>;
  return <section className={`field-survey-card${active.workType === "roof" && active.roofType ? " field-survey-card-roof" : ""}`}>
    <BackNavigation href={`/felmeresek?organization=${organizationId}`} label="Vissza a felmérésekhez" />
    <GlassPageHeader title={surveyId ? "Felmérés szerkesztése" : "Új felmérés"} context={surveyId ? `V${version}` : undefined} />
    {!needsInitialWorkTypeChoice && <div className={`survey-savebar is-${saveBarState}`}>
      <p className="survey-savebar-status" role="status" aria-live="polite"><SaveBarIcon aria-hidden="true" className={`size-4${saveBarState === "saving" ? " animate-spin" : ""}`} /><span>{saveBarLabels[saveBarState]}</span></p>
      <button type="submit" form="field-survey-editor-form" className={`${saveIdle ? "secondary-button is-idle" : "primary-button"} survey-savebar-save`} aria-disabled={saveReason ? true : undefined} aria-describedby={saveReason ? "survey-save-reason" : undefined} title={saveReason || undefined} onClick={(event) => { if (saveReason) { event.preventDefault(); notify({ kind: "info", message: saveReason }); } }}>{saving ? "Mentés…" : "Mentés"}</button>
      <button type="button" className={`${saveIdle ? "primary-button" : "secondary-button"} survey-savebar-list`} aria-expanded={materialPanelOpen} aria-controls="survey-material-list-panel" aria-disabled={listReason ? true : undefined} aria-describedby={listReason ? "survey-list-reason" : undefined} title={listReason || undefined} onClick={() => { if (listReason) notify({ kind: "info", message: listReason }); else void openMaterialPanel(); }}>Anyaglista készítése</button>
      {saveReason && <span id="survey-save-reason" className="sr-only">{saveReason}</span>}
      {listReason && <span id="survey-list-reason" className="sr-only">{listReason}</span>}
    </div>}
    {error && <p role="alert" className="form-message is-error survey-save-error">{error}</p>}
    {revisionSelector}
    {recovery && <aside className="survey-handoff-banner" role={recovery.version !== version ? "alert" : undefined}>
      {recovery.version !== version
        ? <p><strong>Ennek a felmérésnek közben új változata készült (V{version}).</strong> Az alábbi mezőkben a legújabb mentett változat (V{version}) látható. A mentetlen piszkozatod a régebbi V{recovery.version} változatra épül, és érintetlenül megmaradt. Nem vonjuk össze automatikusan, és semmit nem írunk felül csendben: ha visszaállítod, az új változatként (V{version + 1}) menthető, a V{version} megmarad a korábbi változatok között.</p>
        : <p>Korábbi nem mentett szerkesztés helyreállítható · alap V{recovery.version}.</p>}
      <div className="survey-draft-banner-actions">
        <button type="button" className="primary-button" onClick={() => restoreDraftRef.current(recovery, recovery.version !== version)}>{recovery.version !== version ? "Visszaállítom, és új változatként mentem" : "Piszkozat visszaállítása"}</button>
        <button type="button" className="secondary-button" onClick={() => keepDraftForLater(recovery.sourceKey)}>Most nem döntök (a piszkozat megmarad)</button>
        <button type="button" className="secondary-button" onClick={() => void discardRecovery(recovery.sourceKey)}>Piszkozat elvetése</button>
      </div>
    </aside>}
    {!recovery && otherDrafts > 0 && <p className="form-message" role="status">Ehhez a felméréshez más szerkesztésből származó, mentetlen piszkozat is tartozik. <button type="button" className="secondary-button" onClick={() => navigate(`/?organization=${organizationId}`)}>Megnézem a főoldalon</button></p>}
    {dirty && !recovery && !draftStorageAvailable && <p className="form-message is-error" role="alert">A böngésző helyi tárhelye nem elérhető. A mentetlen módosítás frissítéskor elveszhet; mentsd el a felmérést.</p>}
    <div className="field-survey-editor-workspace">
    {!needsInitialWorkTypeChoice && mainSections.length > 1 && <nav className="survey-section-tabs" aria-label="Munkaszakaszok">{mainSections.map((section) => {
      const measurementCount = section.measurements.filter((measurement) => measurement.value !== "").length;
      return <button className={active.id === section.id ? "primary-button" : "secondary-button"} type="button" key={section.id} aria-pressed={active.id === section.id} disabled={blocked || Boolean(recovery)} onClick={() => setActiveId(section.id)}><span className="survey-section-tab-name">{section.name}</span><span className="survey-section-tab-count" aria-label={`${measurementCount} kitöltött mérés`}>{measurementCount}</span></button>;
    })}</nav>}
    <form id="field-survey-editor-form" className="field-survey-form" noValidate onSubmit={(event) => { event.preventDefault(); if (!blocked) void persistCurrent(); }}>
      <fieldset disabled={blocked || Boolean(recovery)}>
        {needsInitialWorkTypeChoice ? <section className="survey-initial-work-type" aria-labelledby="survey-initial-work-type-title"><div><h2 id="survey-initial-work-type-title">Mit szeretnél felmérni?</h2><p>Válassz munkatípust. A felmérés munkanapló és tetőforma nélkül is folytatható.</p></div><GlassToolbar ariaLabel="Munkatípus kiválasztása" className="survey-section-add survey-work-type-chooser">{initialWorkTypeOptions.map(({ type, label, hint }) => <button type="button" className="secondary-button" key={type} aria-label={`${label}. ${hint}`} onClick={() => { changeType(type); setInitialWorkTypeChosen(true); }}>{label}<small>{hint}</small></button>)}</GlassToolbar></section> : <>
        {active.workType === "roof" && !active.roofType && !survey?.sections?.some((section) => section.id === active.id) && <RoofTypeSelector selected={null} onSelect={selectRoofType} label="Felmért tetőforma" />}
        {active.workType === "roof" && active.roofType && !survey?.sections?.some((section) => section.id === active.id) && <div className="survey-roof-type-heading"><p className="section-eyebrow">Kiválasztott tetőforma · {roofTypeOptions.find((option) => option.type === active.roofType)?.name}</p><button className="secondary-button" type="button" onClick={returnToRoofSelection}>← Tetőtípus kiválasztása</button></div>}
        {active.workType === "roof" && !active.roofType && <p className="form-message">A felmérés tetőforma nélkül is menthető. A rajzhoz és a geometriai eredményekhez válassz tetőformát.</p>}
        {active.workType === "roof" && active.roofType && survey?.sections?.some((section) => section.id === active.id) && (survey?.sections?.some((section) => section.id === active.id && section.roofType)
          ? <GlassDisclosure className="survey-section-settings" summary={`Tetőforma: ${roofTypeOptions.find((option) => option.type === active.roofType)?.name ?? "ismeretlen"} · módosítás`}><RoofTypeSelector selected={active.roofType ?? null} onSelect={selectRoofType} label="Tetőforma módosítása" /></GlassDisclosure>
          : <RoofTypeSelector selected={active.roofType ?? null} onSelect={selectRoofType} label="Felmért tetőforma" />)}
        {active.workType !== "roof" || active.roofType ? <section className="field-survey-measurements">{active.workType !== "roof" && <><h2>Mérések</h2><p>Az üres érték hiányzó mérésként menthető. Add meg a helyszínen ellenőrzött értéket és egységet.</p></>}
          {active.workType === "roof" && active.roofType === "gable" && <RoofModeSelector mode={quickMode ? "quick" : detailedMode ? "detailed" : "building"} onChange={switchRoofMode} disabled={blocked || Boolean(recovery)} />}
          {active.workType === "roof" && active.roofType === "shed" && <RoofModeSelector shape="shed" mode={shedQuickMode ? "quick" : "building"} onChange={switchRoofMode} disabled={blocked || Boolean(recovery)} />}
          {shedResult ? <QuickShedWorkspace result={shedResult} drafts={active.measurements} focused={focusedRoofMeasurement} guide={guideFor(focusedRoofMeasurement)} disabled={blocked || Boolean(recovery)} inputs={<div className="roof-survey-measurement-strip">{renderCompactFields(false)}</div>} />
          : (quickResult || detailedResult) ? (() => {
            const shared = {
              drafts: active.measurements, planesMatch: active.quickPlanesMatch, onPlanesMatch: (match: boolean) => patchSection({ quickPlanesMatch: match }), focused: focusedRoofMeasurement,
              guide: guideFor(focusedRoofMeasurement), disabled: blocked || Boolean(recovery),
              inputs: <>
                <div className="roof-survey-measurement-strip">{renderCompactFields(false)}</div>
                {renderCompactFields(true).length > 0 && <GlassDisclosure className="quick-gable-optional" defaultOpen={compactOptional.some((type) => has(type)) || Object.keys(compactFieldMessages).length > 0 && detailedResult?.status === "invalid"} summary={<>Nem kötelező mérések<span className="survey-optional-badge">Opcionális</span></>}><div className="roof-survey-measurement-strip">{renderCompactFields(true)}</div></GlassDisclosure>}
              </>,
            };
            return quickResult ? <QuickGableWorkspace result={quickResult} {...shared} /> : <DetailedGableWorkspace result={detailedResult!} {...shared} />;
          })() : active.workType === "roof" && active.roofType ? <>
            <SurveyRoofPreview
            roofType={active.roofType}
            roofTimberParameters={active.roofTimberParameters}
            onRoofTimberParametersChange={(roofTimberParameters) => patchSection({ roofTimberParameters })}
            roofUnderlayParameters={active.roofUnderlayParameters}
            onRoofUnderlayParametersChange={(roofUnderlayParameters) => patchSection({ roofUnderlayParameters })}
            gablePreview={activeGablePreview}
            saved={saveIdle}
            activeDimension={activeSurveyGuide?.key ?? null}
            activeDimensionDescription={activeSurveyGuide?.meaning}
            measurements={serialize([active])[0].measurements.filter((measurement): measurement is FieldSurveyMeasurement => measurement.value !== null)}
            onDimensionSelect={(key) => {
              const matches = active.measurements.filter((measurement) => measurementGuideForSurvey(active.roofType!, measurement.semanticType)?.key === key);
              if (matches.length === 1) document.getElementById(`survey-measurement-${matches[0].id}`)?.focus();
            }}
            measurementInputs={
              <>
                {multiShape ? <>{surveyRoofFieldGroups(multiShape).map((group) => <div className="roof-survey-group" key={group.title ?? "all"} role="group" aria-label={group.title ?? undefined}>{group.title && <h3 className="roof-survey-group-title">{group.title}</h3>}<div className="roof-survey-measurement-strip">{group.types.map((type) => shapePrimary.get(type)).filter((measurement): measurement is MeasurementDraft => Boolean(measurement)).map((measurement) => <MeasurementField key={measurement.id} measurement={measurement} index={active.measurements.indexOf(measurement)} hint={hintFor(measurement.semanticType)} compact recent={measurement.id === recentMeasurementId} geometryError={shapeMessages[measurement.id]} disabled={blocked || Boolean(recovery)} onFocus={() => setFocusedRoofMeasurement(measurement.semanticType)} onBlur={() => setFocusedRoofMeasurement(null)} onPatch={(patch) => patchMeasurement(measurement.id, patch)} onRemove={() => void removeMeasurement(measurement.id)} />)}</div></div>)}</> : <div className="roof-survey-measurement-strip">{active.measurements.map((measurement, index) => active.roofType === "shed" && quickShedTemplates.some((template) => template.semanticType === measurement.semanticType) ? null : active.roofType === "gable" && (measurement.semanticType === "roof_pitch" ? measurement.value === "" : [...quickGableTemplates, ...detailedGableTemplates, ...Object.values(detailedVergeTemplates)].some((template) => template.semanticType === measurement.semanticType)) ? null : <MeasurementField
                  key={measurement.id}
                  measurement={measurement}
                  index={index}
                  hint={active.roofType === "gable" || active.roofType === "shed" ? hintFor(measurement.semanticType) : undefined}
                  compact={active.roofType === "gable" || active.roofType === "shed"}
                  recent={measurement.id === recentMeasurementId}
                  geometryError={active.roofType === "shed" ? shedBuildingMessages[measurement.id] : activeGablePreview?.issue && (activeGablePreview.issue.kind === "invalid" || active.measurements.some((item) => item.value.trim() !== "" && fieldSurveyTemplates.roof.some((template) => template.semanticType === item.semanticType))) ? activeGablePreview.issue.fieldMessages[measurement.id] : undefined}
                  disabled={blocked || Boolean(recovery)}
                  onFocus={() => setFocusedRoofMeasurement(measurement.semanticType)}
                  onBlur={() => setFocusedRoofMeasurement(null)}
                  onPatch={(patch) => patchMeasurement(measurement.id, patch)}
                  onRemove={() => void removeMeasurement(measurement.id)}
                />)}</div>}
                {multiShape && shapeMissing.length > 0 && <p className="quick-gable-provenance" role="status">Még hiányzik: {shapeMissing.join(", ")}.</p>}
                {active.roofType === "shed" && shedBuildingMissing.length > 0 && <p className="quick-gable-provenance" role="status">Még hiányzik: {shedBuildingMissing.join(", ")}.</p>}
              </>
            }
            actions={
              <>
                {multiShape && <GlassDisclosure className="field-survey-template-details" summary={<>További mérések<span className="survey-optional-badge">Opcionális</span></>}>
                  {shapeExtras.length > 0 && <div className="roof-survey-measurement-strip">{shapeExtras.map((measurement) => <MeasurementField key={measurement.id} measurement={measurement} index={active.measurements.indexOf(measurement)} hint={hintFor(measurement.semanticType)} recent={measurement.id === recentMeasurementId} disabled={blocked || Boolean(recovery)} onPatch={(patch) => patchMeasurement(measurement.id, patch)} onRemove={() => void removeMeasurement(measurement.id)} />)}</div>}
                  {shapeExtras.some((measurement) => shapePrimary.has(measurement.semanticType)) && <p className="quick-gable-provenance" role="status">Ugyanahhoz a szerephez több mérés tartozik, ezért a rajz nem készül. Töröld a felesleget vagy módosítsd a szerepét.</p>}
                  <div className="roof-survey-edit-actions"><button type="button" className="field-survey-add" disabled={measurementAddPending} onClick={(event) => addMeasurement(undefined, event)}><Plus aria-hidden="true" className="size-4" />Mérés hozzáadása</button></div>
                </GlassDisclosure>}
              </>
            }
          /></> : <>
            <div className="field-survey-measurement-list">{active.measurements.map((measurement, index) => <MeasurementField
              key={measurement.id}
              measurement={measurement}
              index={index}
              recent={measurement.id === recentMeasurementId}
              disabled={blocked || Boolean(recovery)}
              onPatch={(patch) => patchMeasurement(measurement.id, patch)}
              onRemove={() => void removeMeasurement(measurement.id)}
            />)}</div>
            <button type="button" className="field-survey-add" disabled={measurementAddPending} onClick={(event) => addMeasurement(undefined, event)}><Plus aria-hidden="true" className="size-4" />Mérés hozzáadása</button><GlassDisclosure className="field-survey-template-details" summary="Másik sablonmérés hozzáadása">{fieldSurveyTemplates[active.workType].map((template) => <button type="button" key={template.label} disabled={measurementAddPending} onClick={(event) => addMeasurement(template, event)}>{template.label} · {fieldSurveyUnitLabels[template.unit]}</button>)}</GlassDisclosure>
          </>}
        </section> : null}
        {active.workType === "roof" && <SurveyRoofDetails details={active.roofDetails ?? []} disabled={blocked || Boolean(recovery)} newId={generateSecureUuid} onChange={(roofDetails) => patchSection({ roofDetails })} />}
        <GlassDisclosure className="survey-section-more" summary={<>Másik munkaszakasz hozzáadása<span className="survey-optional-badge">Opcionális</span></>}><div className="survey-section-settings-actions"><button type="button" className="secondary-button" onClick={() => addSection("roof")}><Plus aria-hidden="true" className="size-4" />Új tetőszakasz</button><button type="button" className="secondary-button" onClick={() => addSection("other")}><Plus aria-hidden="true" className="size-4" />Új egyéb szakasz</button></div></GlassDisclosure>

        <GlassDisclosure className="survey-section-more" summary={<>További szakaszbeállítások<span className="survey-optional-badge">Opcionális</span></>}>
          <div className="survey-section-more-block"><h3>Név, munkatípus és sorrend</h3><label className="field-survey-field"><span>Munkaszakasz neve</span><input value={active.name} maxLength={120} onChange={(event) => patchSection({ name: event.target.value })} /></label><label className="field-survey-field"><span>Munkatípus</span><select value={active.workType} onChange={(event) => changeType(event.target.value as FieldSurveyWorkType)}>{Object.entries(fieldSurveyWorkTypeLabels).filter(([key]) => key === "roof" || key === "other" || key === active.workType).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="survey-section-settings-actions"><button type="button" className="secondary-button" disabled={sections[0].id === active.id} onClick={() => { const index = sections.findIndex((item) => item.id === active.id); const next = [...sections]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setSections(next); }}>Előrébb</button><button type="button" className="secondary-button" disabled={sections.at(-1)?.id === active.id} onClick={() => { const index = sections.findIndex((item) => item.id === active.id); const next = [...sections]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setSections(next); }}>Hátrébb</button><button type="button" className="secondary-button" disabled={sections.length === 1} onClick={() => void removeActiveSection()}>Munkaszakasz eltávolítása</button></div></div>
          <div className="survey-section-more-block"><h3>Megjegyzés</h3><label className="field-survey-field"><span>Helyszíni megjegyzés</span><textarea value={active.notes} rows={3} maxLength={2000} onChange={(event) => patchSection({ notes: event.target.value })} /></label></div>
          <div className="survey-section-more-block"><h3>{`Fotók ehhez a munkaszakaszhoz · ${active.photoIds.length}`}</h3>{photos.length ? photos.map((photo) => <label className="survey-photo-choice" key={photo.id}><input type="checkbox" checked={active.photoIds.includes(photo.id)} onChange={(event) => patchSection({ photoIds: event.target.checked ? [...active.photoIds, photo.id] : active.photoIds.filter((id) => id !== photo.id) })} />{photo.filename}</label>) : <p>Az alábbi fotópanelben tölthetsz fel képet; az új kép automatikusan ehhez a szakaszhoz kerül a következő mentéskor.</p>}</div>
        </GlassDisclosure>
        </>}
      </fieldset>
    </form>
    </div>

    <section className="survey-completion-area" aria-labelledby="survey-completion-title">
      <div className="survey-completion-heading"><div><h2 id="survey-completion-title">Következő lépések</h2></div></div>
      <SurveyExecutionActions organizationId={organizationId} surveyId={surveyId} version={version} plans={executionPlans} linkedPlans={relationships.executionPlans} canSave={canSaveSurvey} ensureSaved={ensureSaved} />
      {!needsInitialWorkTypeChoice && !recovery && <GlassDisclosure className="survey-completion-disclosure" summary="Fotók hozzáadása · privát felmérési képek"><FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={version} onVersionChange={setVersion} onEnsureSaved={ensureSaved} onPendingChange={setPhotoState} onPhotosChange={onPhotos} onPhotoUploaded={associateUploadedPhoto} onUploadComplete={() => router.refresh()} /></GlassDisclosure>}
      {effectiveProjectId && <GlassDisclosure className="survey-completion-disclosure survey-section-more" summary={<>További műveletek<span className="survey-optional-badge">Opcionális</span></>}>
        {active.workType === "roof" && active.roofType && effectiveProjectId && surveyId && !recovery && <GlassDisclosure className="survey-section-roof-model" summary="Tetőmodell-revízió mentése · a tetőfelület anyaglistába vételéhez"><p>A felmérés rajza és eredménye a mérésekből automatikusan frissül. Ellenőrzött tetőfelületet az anyaglista csak a felmérésváltozathoz kapcsolt, mentett tetőmodell-revízióból vehet át.</p><SurveyRoofWorkspace organizationId={organizationId} surveyId={surveyId} version={version} sectionId={active.id} sectionName={active.name} roofType={active.roofType} links={relationships.calculations} ensureSaved={ensureSaved} onLinked={() => router.refresh()} /></GlassDisclosure>}
        {effectiveProjectId && <div className="survey-section-more-block"><h3>{`Korábbi projektkapcsolat · ${projects.find((project) => project.id === effectiveProjectId)?.name ?? "elérhető"}`}</h3>
        <p>Ez a felmérés korábbi projektazonosítót őriz meg kompatibilitásból. Az új felméréseknél nincs szükség projekt létrehozására.</p>
        {projects.some((project) => project.id === effectiveProjectId) && <Link href={`/projektek/${effectiveProjectId}?organization=${organizationId}`}>Kapcsolt régi adatok megnyitása →</Link>}
      </div>}
      </GlassDisclosure>}
    </section>
    {materialPanelOpen && <SurveyMaterialListPanel key={version} ref={materialPanelRef} organizationId={organizationId} savedVersion={version} source={surveyId ? materialListSource : null} linkedLists={linkedMaterialLists} unsaved={unsaved} preparing={materialPanelPreparing || saving} onClose={() => setMaterialPanelOpen(false)} />}
  </section>;
}

function SurveyRoofPreview({ roofType, roofTimberParameters, onRoofTimberParametersChange, roofUnderlayParameters, onRoofUnderlayParametersChange, gablePreview, measurements, saved, activeDimension, activeDimensionDescription, measurementInputs, actions, onDimensionSelect }: Readonly<{ roofType: RoofGeometryType; roofTimberParameters?: RoofTimberParameters; onRoofTimberParametersChange: (parameters: RoofTimberParameters) => void; roofUnderlayParameters?: RoofUnderlayParameters; onRoofUnderlayParametersChange: (parameters: RoofUnderlayParameters) => void; gablePreview: GableSurveyPreview | null; measurements: readonly FieldSurveyMeasurement[]; saved: boolean; activeDimension?: string | null; activeDimensionDescription?: string; measurementInputs: ReactNode; actions: ReactNode; onDimensionSelect: (key: string) => void }>) {
  const gableOutput = gablePreview?.output ?? null;
  const previewIssue = gablePreview?.issue ?? null;
  let geometry: ReturnType<typeof calculateRoofGeometry> | null = roofType === "gable" ? gablePreview?.geometry ?? null : null;
  if (roofType !== "gable") {
    const input = geometryFromSurveyMeasurements(roofType, measurements);
    if (input) geometry = calculateRoofGeometry(input);
  }
  const timberInput = roofTimberParameters ? roofTimberInputFromParameters(roofTimberParameters) : null;
  const timberLayout = geometry && timberInput ? calculateRoofTimberLayout(geometry, timberInput) : null;
  const underlayLayout = geometry && roofUnderlayParameters ? calculateRoofUnderlayLayout(geometry, roofUnderlayParameters) : null;
  return <RoofWorkspace
    className="roof-workspace-survey"
    label="Felmérés tetőmérési munkaterülete"
    measurements={measurementInputs}
    drawing={geometry
      ? <TechnicalDrawing output={gableOutput ?? undefined} geometry={gableOutput ? undefined : geometry} timberLayout={timberLayout?.status === "available" ? timberLayout : null} underlayLayout={underlayLayout} compact activeDimension={activeDimension} activeDimensionDescription={activeDimensionDescription} onDimensionSelect={onDimensionSelect} isSaved={saved} />
      // A rajz helye hiányos geometriánál is megmarad, hogy a mezők ne nyúljanak szét és a rajz ne ugorjon be később.
      // Néma dísz: nem ígér rajzot és nem rajzol geometriát — a hiányzó adatokat továbbra is a „Még hiányzik” üzenet mondja ki.
      : <div className="technical-drawing survey-drawing-placeholder" aria-hidden="true" />}
    results={!geometry
      ? previewIssue && <p className="missing-data" role={previewIssue.kind === "invalid" ? "alert" : "status"}>{previewIssue.message}</p>
      : <><RoofGeometryResults geometry={geometry} compact /><RoofTimberQuantityPanel geometry={geometry} value={roofTimberParameters} onChange={onRoofTimberParametersChange} /><RoofUnderlayQuantityPanel geometry={geometry} value={roofUnderlayParameters} onChange={onRoofUnderlayParametersChange} /></>}
    actions={actions}
  />;
}

function MeasurementField({ measurement, index, hint, compact, recent, geometryError, disabled, onFocus, onBlur, onPatch, onRemove }: Readonly<{ measurement: MeasurementDraft; index: number; hint?: string; compact?: boolean; recent: boolean; geometryError?: string; disabled: boolean; onFocus?: () => void; onBlur?: () => void; onPatch: (patch: Partial<MeasurementDraft>) => void; onRemove: () => void }>) {
  const inputId = `survey-measurement-${measurement.id}`;
  const errorId = `survey-measurement-error-${measurement.id}`;
  return <div className={`field-survey-measurement${recent ? " is-recently-added" : ""}${geometryError ? " has-geometry-error" : ""}`}>
    <div className="field-survey-measurement-head">
      <label className="field-survey-measurement-name" htmlFor={inputId}>{measurement.label}</label>
      {compact && hint && <AnchoredPopover label={`Súgó: ${measurement.label}`} heading={measurement.label} icon={Info} triggerClassName="field-survey-measurement-menu"><p className="field-survey-info-text">{hint}</p></AnchoredPopover>}
      {!compact && <AnchoredPopover label={`Beállítások: ${measurement.label}`} heading={`${measurement.label} · beállítások`} icon={MoreHorizontal} triggerClassName="field-survey-measurement-menu" disabled={disabled} focusFirst>
        <div className="field-survey-measurement-tools">
          <label className="field-survey-field"><span>Mérés neve</span><input aria-label={`Mérés ${index + 1} neve`} value={measurement.label} maxLength={120} disabled={disabled} onChange={(event) => onPatch({ label: event.target.value })} /></label>
          <label className="field-survey-field"><span>Egység</span><select aria-label={`Mérés ${index + 1} egysége`} value={measurement.unit} disabled={disabled} onChange={(event) => onPatch({ unit: event.target.value as FieldSurveyUnit })}>{Object.entries(fieldSurveyUnitLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="field-survey-field"><span>Számítási szerep</span><select aria-label={`Mérés ${index + 1} számítási szerepe`} value={measurement.semanticType} disabled={disabled} onChange={(event) => onPatch({ semanticType: event.target.value as FieldSurveySemanticType })}>{Object.entries(fieldSurveySemanticTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <button type="button" className="field-survey-remove" aria-label={`${measurement.label} törlése`} disabled={disabled} onClick={onRemove}><Trash2 aria-hidden="true" className="size-4" />Mérés törlése</button>
        </div>
      </AnchoredPopover>}
    </div>
    {hint && !compact && <span className="field-survey-hint">{hint}</span>}
    <div className="field-survey-measurement-control">
      <input id={inputId} type="text" aria-label={`Mérés ${index + 1} értéke: ${measurement.label}`} aria-invalid={geometryError ? true : undefined} aria-describedby={geometryError ? errorId : undefined} inputMode="decimal" autoComplete="off" value={measurement.value} onFocus={onFocus} onBlur={onBlur} onChange={(event) => onPatch({ value: event.target.value })} />
      {compact && (measurement.unit === "m" || measurement.unit === "mm") ? <select className="field-survey-measurement-unit-badge" aria-label={`${measurement.label}: egység`} value={measurement.unit} disabled={disabled} onChange={(event) => onPatch({ unit: event.target.value as FieldSurveyUnit })}><option value="m">m</option><option value="mm">mm</option></select> : <span className="field-survey-measurement-unit-badge" aria-hidden="true">{fieldSurveyUnitLabels[measurement.unit]}</span>}
    </div>
    {geometryError && <span className={`field-survey-inline-error${measurement.value === "" ? " is-missing" : ""}`} id={errorId} title={geometryError}>{measurement.value === "" ? "Kötelező a rajzhoz" : geometryError}</span>}
  </div>;
}
