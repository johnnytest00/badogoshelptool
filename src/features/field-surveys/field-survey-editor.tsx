"use client";

import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { AnchoredPopover } from "@/components/ui/anchored-popover";
import { GlassToolbar } from "@/components/ui/glass-toolbar";
import { GlassPageHeader } from "@/components/ui/glass-page-header";
import { fieldSurveySemanticTypeLabels, fieldSurveyTemplates, fieldSurveyUnitLabels, fieldSurveyWorkTypeLabels, type FieldSurveyMeasurement, type FieldSurveySemanticType, type FieldSurveyUnit, type FieldSurveyWorkType } from "@/domain/field-surveys/contracts";
import { surveySections, surveySectionsSchema, type SurveySection, type SurveyCalculationLink, type SurveyExecutionPlanLink, type SurveyFollowup } from "@/domain/field-surveys/workspace";
import { readSurveyDraftRecovery, removeSurveyDraftRecovery, serializeSurveyDraftSections, writeSurveyDraftRecovery, type SurveyDraftRecovery, type SurveyMeasurementDraft, type SurveySectionDraft } from "./survey-draft-recovery";
import { saveFieldSurveyAction } from "./field-survey-actions";
import type { FieldSurveyRecord, FieldSurveyRevisionRecord } from "./field-survey-data";
import { FieldSurveyPhotos } from "./field-survey-photos";
import { SurveyExecutionActions } from "./survey-execution-actions";
import { WorkspaceSummary } from "./workspace-summary";
import { SurveyRoofWorkspace } from "./survey-roof-workspace";
import { RoofTypeSelector, roofTypeOptions } from "@/features/roof-models/roof-type-selector";
import { geometryFromSurveyMeasurements, surveyRoofFields } from "@/domain/field-surveys/roof-geometry";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { TechnicalDrawing } from "@/features/roof-models/technical-drawing";
import { RoofGeometryResults } from "@/features/roof-models/roof-geometry-results";
import { MeasurementGuidance, measurementGuideForSurvey } from "@/features/roof-models/measurement-guidance";
import { RoofWorkspace } from "@/features/roof-models/roof-workspace";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { appendSurveyMeasurement, type SurveyMeasurementTemplate } from "./measurement-creation";
import { buildGableSurveyPreview, type GableSurveyPreview } from "./gable-survey-preview";
import type { ExecutionPlanOption } from "@/features/execution/execution-data";

type SectionDraft = SurveySectionDraft;
type MeasurementDraft = SurveyMeasurementDraft;
const emptyMeasurement = (workType: FieldSurveyWorkType, id: string): MeasurementDraft => ({ ...fieldSurveyTemplates[workType][0], value: "", id });
const initialWorkTypeOptions: readonly { type: FieldSurveyWorkType; label: string; hint: string }[] = [
  { type: "roof", label: "Tető", hint: "Tetőforma és méretek" },
  { type: "gutter", label: "Ereszcsatorna", hint: "Eresz- és lefolyóméretek" },
  { type: "flashing", label: "Bádogos szegély", hint: "Szegélyszakaszok" },
  { type: "other", label: "Egyéb munka", hint: "Tetőforma nélkül mérhető munka" },
];
const draftSections = (sections: SurveySection[]): SectionDraft[] => sections.map((section) => ({ ...section, measurements: section.measurements.map((measurement) => ({ ...measurement, value: measurement.value === null ? "" : String(measurement.value), semanticType: measurement.semanticType ?? "custom" })) }));
const initialSections = (survey?: FieldSurveyRecord | null): SectionDraft[] => survey ? draftSections(surveySections(survey)) : [{ id: "00000000-0000-4000-8000-000000000002", name: "Tető", workType: "roof", notes: "", photoIds: [], measurements: [emptyMeasurement("roof", "00000000-0000-4000-8000-000000000001")] }];
const serialize = serializeSurveyDraftSections;
const emptyRelationships: { calculations: SurveyCalculationLink[]; followups: SurveyFollowup[]; executionPlans: [] } = { calculations: [], followups: [], executionPlans: [] };

export function FieldSurveyEditor({ organizationId, userId, projects, executionPlans = [], survey, initialProjectId = null, initialSectionId = null, revisionVersions = [], historicalRevision = null, relationships = emptyRelationships }: Readonly<{
  organizationId: string; userId?: string; projects: readonly { id: string; name: string }[]; survey?: FieldSurveyRecord | null; initialProjectId?: string | null;
  executionPlans?: readonly ExecutionPlanOption[];
  initialSectionId?: string | null;
  revisionVersions?: readonly number[]; historicalRevision?: FieldSurveyRevisionRecord | null;
  relationships?: { calculations: SurveyCalculationLink[]; followups: SurveyFollowup[]; executionPlans: SurveyExecutionPlanLink[] };
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
  const [followupPending, setFollowupPending] = useState(false);
  const [summary, setSummary] = useState(false);
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
  const blocked = saving || photoState.busy || followupPending;
  const active = sections.find((section) => section.id === activeId) ?? sections[0];
  const needsInitialWorkTypeChoice = surveyId === null && !initialWorkTypeChosen;
  const activeGablePreview = active.workType === "roof" && active.roofType === "gable" ? buildGableSurveyPreview(active.measurements) : null;
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
  const missingRoofTemplates = active.workType === "roof" && (active.roofType ?? "gable") === "gable" ? fieldSurveyTemplates.roof.filter((template) => template.semanticType !== "roof_pitch" && !active.measurements.some((measurement) => measurement.semanticType === template.semanticType) && !(template.semanticType === "roof_rise" && active.measurements.some((measurement) => measurement.semanticType === "roof_pitch"))) : [];
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
  const recoveryKey = userId ? `tetopro-survey:${userId}:${organizationId}:${surveyId ?? "new"}` : null;
  const [recovery, setRecovery] = useState<SurveyDraftRecovery | null>(null);
  const canSaveSurvey = !blocked && !recovery && !needsInitialWorkTypeChoice;
  const recoveryChecked = useRef(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [draftStorageAvailable, setDraftStorageAvailable] = useState(true);
  const persistCurrentRef = useRef<() => Promise<{ surveyId: string; version: number } | null>>(async () => null);
  const saveForNavigation = useCallback(async () => {
    if (recovery || photoState.queued) return false;
    if (surveyId && workspacePersisted && !dirty) return true;
    return Boolean(await persistCurrentRef.current());
  }, [dirty, photoState.queued, recovery, surveyId, workspacePersisted]);
  const discardForNavigation = useCallback(() => {
    if (recoveryKey) { try { removeSurveyDraftRecovery(sessionStorage, recoveryKey); } catch { /* Best effort. */ } }
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
  useEffect(() => {
    if (!recoveryKey || historicalRevision || recoveryChecked.current) return;
    recoveryChecked.current = true;
    try {
      const stored = readSurveyDraftRecovery(sessionStorage, recoveryKey);
      if (stored) setRecovery(stored);
      setDraftStorageAvailable(true);
    } catch { setDraftStorageAvailable(false); }
    finally { setRecoveryReady(true); }
  }, [recoveryKey, historicalRevision]);
  useEffect(() => {
    if (!recoveryKey || !recoveryReady || historicalRevision || recovery) return;
    try {
      const persisted = dirty
        ? writeSurveyDraftRecovery(sessionStorage, recoveryKey, { schemaVersion: 1, sections, activeSectionId: activeId, projectId, version, requestSurveyId: createIdRef.current })
        : removeSurveyDraftRecovery(sessionStorage, recoveryKey);
      setDraftStorageAvailable(persisted);
    } catch { setDraftStorageAvailable(false); }
  }, [recoveryKey, recoveryReady, historicalRevision, recovery, dirty, sections, activeId, projectId, version]);
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
  function persistDraftSnapshot(nextSections: SectionDraft[], nextProjectId = projectId, nextVersion = version) {
    if (!recoveryKey || !recoveryReady || historicalRevision) return;
    const nextFingerprint = JSON.stringify({ sections: nextSections, projectId: nextProjectId });
    try {
      const persisted = nextFingerprint === baseline
        ? removeSurveyDraftRecovery(sessionStorage, recoveryKey)
        : writeSurveyDraftRecovery(sessionStorage, recoveryKey, { schemaVersion: 1, sections: nextSections, activeSectionId: activeId, projectId: nextProjectId, version: nextVersion, requestSurveyId: createIdRef.current });
      setDraftStorageAvailable(persisted);
    } catch { setDraftStorageAvailable(false); }
  }
  function patchSection(patch: Partial<SectionDraft>) {
    const next = sections.map((section) => section.id === active.id ? { ...section, ...patch } : section);
    setSections(next);
    persistDraftSnapshot(next);
    setError("");
    setSummary(false);
  }
  function patchMeasurement(id: string, patch: Partial<MeasurementDraft>) { patchSection({ measurements: active.measurements.map((measurement) => measurement.id === id ? { ...measurement, ...patch } : measurement) }); }
  async function selectRoofType(type: RoofGeometryType) {
    if (active.roofType === type) return;
    if (active.measurements.some((measurement) => measurement.value !== "")) {
      const accepted = await requestConfirmation({ title: "Tetőforma módosítása", message: "A jelenlegi mérések megmaradnak a korábbi felmérésváltozatban; ebben a munkaszakaszban az új tetőformához tartozó mezők nyílnak meg.", cancelLabel: "Mégse", actions: [{ label: "Tetőforma módosítása", tone: "primary", run: () => undefined }] });
      if (!accepted) return;
    }
    const templates = type === "gable" ? fieldSurveyTemplates.roof : surveyRoofFields(type);
    patchSection({ roofType: type, measurements: templates.map((template) => ({ id: generateSecureUuid(), label: template.label, unit: template.unit, semanticType: template.semanticType, value: "" })) });
  }
  async function returnToRoofSelection() {
    if (active.measurements.some((measurement) => measurement.value !== "")) {
      const accepted = await requestConfirmation({ title: "Tetőforma törlése", message: "A megadott tetőmérések elvesznek ebből az aktuális piszkozatból. Visszatérsz a tetőformákhoz?", cancelLabel: "Maradok", actions: [{ label: "Vissza a tetőformákhoz", tone: "danger", run: () => undefined }] });
      if (!accepted) return;
    }
    patchSection({ roofType: undefined, measurements: [emptyMeasurement("roof", generateSecureUuid())] });
  }
  function addSection(workType: FieldSurveyWorkType) {
    const id = generateSecureUuid();
    setSections((current) => [...current, { id, name: fieldSurveyWorkTypeLabels[workType], workType, notes: "", photoIds: [], measurements: [emptyMeasurement(workType, generateSecureUuid())] }]); setActiveId(id); setSummary(false);
  }
  function changeType(workType: FieldSurveyWorkType) {
    const empty = active.measurements.length === 1 && active.measurements[0].value === "" && active.measurements[0].label === fieldSurveyTemplates[active.workType][0].label;
    patchSection({ workType, ...(workType === "roof" ? {} : { roofType: undefined }), ...(active.name === fieldSurveyWorkTypeLabels[active.workType] ? { name: fieldSurveyWorkTypeLabels[workType] } : {}), ...(empty ? { measurements: [emptyMeasurement(workType, active.measurements[0].id)] } : {}) });
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
    setSummary(false);
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
          const persisted = writeSurveyDraftRecovery(sessionStorage, recoveryKey, { schemaVersion: 1, sections: nextSections, activeSectionId: activeId, projectId, version, requestSurveyId });
          setDraftStorageAvailable(persisted);
        } catch { setDraftStorageAvailable(false); }
      }
      data.set("projectId", projectId); data.set("workType", parsed.data[0].workType); data.set("notes", parsed.data[0].notes);
      data.set("sections", JSON.stringify(parsed.data)); data.set("measurements", JSON.stringify(parsed.data.flatMap((section) => section.measurements.filter((measurement) => measurement.value !== null)))); data.set("expectedVersion", String(version));
      const result = await saveFieldSurveyAction(data);
      if (!result.ok || !result.surveyId || !result.version) { const message = result.error ?? "Nem sikerült menteni. Próbáld újra."; setError(message); notify({ kind: "error", message }); return null; }
      if (recoveryKey) { try { removeSurveyDraftRecovery(sessionStorage, recoveryKey); } catch { /* Storage is optional; navigation warnings remain active. */ } }
      setWorkspacePersisted(true); setSections(nextSections); setBaseline(JSON.stringify({ sections: nextSections, projectId })); setSurveyId(result.surveyId); setVersion(result.version); setPhotoAssociationPending(false);
      if (!surveyId) { window.history.replaceState(null, "", `/felmeresek/${result.surveyId}?organization=${organizationId}&section=${active.id}`); }
      notify({ kind: "success", message: "Felmérés mentve" });
      return { surveyId: result.surveyId, version: result.version };
    } catch { const message = "A mentés válasza bizonytalan. Azonos adatokkal biztonságosan újrapróbálható."; setError(message); notify({ kind: "error", message }); return null; }
    finally { saveLock.current = false; setSaving(false); }
  }
  useEffect(() => { persistCurrentRef.current = () => persistCurrent(); });
  async function ensureSaved() { if (recovery) { setError("Előbb állítsd vissza vagy vesd el a korábbi piszkozatot."); return null; } return surveyId && workspacePersisted && !dirty ? { surveyId, version } : persistCurrent(); }
  async function showSummary() { const saved = await ensureSaved(); if (saved) setSummary(true); }
  function navigate(href: string) { void requestNavigation(href); }
  const selectedVersion = historicalRevision?.version ?? version;
  const revisionSelector = surveyId && revisionVersions.length > 1 && <label className="field-survey-field"><span>Felmérés változata</span><select value={selectedVersion} disabled={blocked} onChange={(event) => navigate(`/felmeresek/${surveyId}?organization=${organizationId}${Number(event.target.value) === version ? "" : `&version=${event.target.value}`}`)}>{[...new Set([version, ...revisionVersions])].map((item) => <option key={item} value={item}>{item === version ? "Aktuális" : "Korábbi"} · V{item}</option>)}</select></label>;
  if (historicalRevision && surveyId) return <section className="field-survey-card"><GlassPageHeader title="Korábbi felmérés" context={`V${historicalRevision.version}`} />{revisionSelector}<WorkspaceSummary organizationId={organizationId} surveyId={surveyId} version={historicalRevision.version} sections={surveySections(historicalRevision)} calculations={relationships.calculations} initialFollowups={relationships.followups.filter((row) => row.surveyRevisionId === historicalRevision.id)} originalProjectId={historicalRevision.projectId} readOnly /><FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={historicalRevision.version} historical onVersionChange={() => undefined} onEnsureSaved={async () => null} onUploadComplete={() => undefined} /><button type="button" className="secondary-button" onClick={() => navigate(`/felmeresek/${surveyId}?organization=${organizationId}`)}>Aktuális felmérés folytatása</button></section>;
  return <section className={`field-survey-card${active.workType === "roof" && active.roofType ? " field-survey-card-roof" : ""}`}>
    <GlassPageHeader title={surveyId ? "Felmérés szerkesztése" : "Új felmérés"} context={surveyId ? `V${version}` : undefined} actions={<button type="button" className="secondary-button" onClick={() => navigate(`/felmeresek?organization=${organizationId}`)}>Vissza a felmérésekhez</button>} />
    {revisionSelector}
    {recovery && <aside className="survey-handoff-banner"><p>Korábbi nem mentett szerkesztés helyreállítható · alap V{recovery.version}.{recovery.version !== version ? " A mentett felmérés közben változott; a visszaállított piszkozat mentése verzióellenőrzést kap." : ""}</p><button type="button" className="secondary-button" onClick={() => { createIdRef.current = recovery.requestSurveyId; setSections(recovery.sections); setActiveId(recovery.activeSectionId); setProjectId(recovery.projectId); setVersion(recovery.version); setInitialWorkTypeChosen(true); setRecovery(null); }}>Piszkozat visszaállítása</button><button type="button" className="secondary-button" onClick={() => { if (recoveryKey) { try { removeSurveyDraftRecovery(sessionStorage, recoveryKey); } catch { /* Storage is optional; navigation warnings remain active. */ } } setRecovery(null); }}>Korábbi piszkozat elvetése</button></aside>}
    {dirty && !recovery && !draftStorageAvailable && <p className="form-message is-error" role="alert">A böngésző helyi tárhelye nem elérhető. A mentetlen módosítás frissítéskor elveszhet; mentsd el a felmérést.</p>}
    <div className="field-survey-editor-workspace">
    {!needsInitialWorkTypeChoice && <nav className="survey-section-tabs" aria-label="Munkaszakaszok">{sections.map((section) => {
      const measurementCount = section.measurements.filter((measurement) => measurement.value !== "").length;
      return <button className={active.id === section.id ? "primary-button" : "secondary-button"} type="button" key={section.id} aria-pressed={active.id === section.id} disabled={blocked || Boolean(recovery)} onClick={() => setActiveId(section.id)}><span className="survey-section-tab-name">{section.name}</span><span className="survey-section-tab-count" aria-label={`${measurementCount} kitöltött mérés`}>{measurementCount}</span></button>;
    })}</nav>}
    <form id="field-survey-editor-form" className="field-survey-form" noValidate onSubmit={(event) => { event.preventDefault(); if (!blocked) void persistCurrent(); }}>
      <fieldset disabled={blocked || Boolean(recovery)}>
        {needsInitialWorkTypeChoice ? <section className="survey-initial-work-type" aria-labelledby="survey-initial-work-type-title"><div><h2 id="survey-initial-work-type-title">Mit szeretnél felmérni?</h2><p>Válassz munkatípust. A felmérés munkanapló és tetőforma nélkül is folytatható.</p></div><GlassToolbar ariaLabel="Munkatípus kiválasztása" className="survey-section-add survey-work-type-chooser">{initialWorkTypeOptions.map(({ type, label, hint }) => <button type="button" className="secondary-button" key={type} aria-label={`${label}. ${hint}`} onClick={() => { changeType(type); setInitialWorkTypeChosen(true); }}>{label}<small>{hint}</small></button>)}</GlassToolbar></section> : <>
        <GlassToolbar ariaLabel="Új munkaszakasz hozzáadása" className="survey-section-add"><button type="button" className="secondary-button" onClick={() => addSection("roof")}><Plus aria-hidden="true" className="size-4" />Új tetőszakasz</button><button type="button" className="secondary-button" onClick={() => addSection("other")}><Plus aria-hidden="true" className="size-4" />Új egyéb szakasz</button></GlassToolbar>
        <GlassDisclosure className="survey-section-settings" summary="Név, munkatípus és sorrend"><label className="field-survey-field"><span>Munkaszakasz neve</span><input value={active.name} maxLength={120} onChange={(event) => patchSection({ name: event.target.value })} /></label><label className="field-survey-field"><span>Munkatípus</span><select value={active.workType} onChange={(event) => changeType(event.target.value as FieldSurveyWorkType)}>{Object.entries(fieldSurveyWorkTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="survey-section-settings-actions"><button type="button" className="secondary-button" disabled={sections[0].id === active.id} onClick={() => { const index = sections.findIndex((item) => item.id === active.id); const next = [...sections]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setSections(next); }}>Előrébb</button><button type="button" className="secondary-button" disabled={sections.at(-1)?.id === active.id} onClick={() => { const index = sections.findIndex((item) => item.id === active.id); const next = [...sections]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setSections(next); }}>Hátrébb</button><button type="button" className="secondary-button" disabled={sections.length === 1} onClick={() => void removeActiveSection()}>Munkaszakasz eltávolítása</button></div></GlassDisclosure>
        {active.workType === "roof" && !active.roofType && !survey?.sections?.some((section) => section.id === active.id) && <RoofTypeSelector selected={null} onSelect={selectRoofType} label="Felmért tetőforma" />}
        {active.workType === "roof" && active.roofType && !survey?.sections?.some((section) => section.id === active.id) && <div className="survey-roof-type-heading"><p className="section-eyebrow">Kiválasztott tetőforma · {roofTypeOptions.find((option) => option.type === active.roofType)?.name}</p><button className="secondary-button" type="button" onClick={returnToRoofSelection}>← Tetőtípus kiválasztása</button></div>}
        {active.workType === "roof" && !active.roofType && <p className="form-message">A felmérés tetőforma nélkül is menthető. A rajzhoz és a geometriai eredményekhez válassz tetőformát.</p>}
        {active.workType === "roof" && active.roofType && survey?.sections?.some((section) => section.id === active.id) && (survey?.sections?.some((section) => section.id === active.id && section.roofType)
          ? <GlassDisclosure className="survey-section-settings" summary={`Tetőforma: ${roofTypeOptions.find((option) => option.type === active.roofType)?.name ?? "ismeretlen"} · módosítás`}><RoofTypeSelector selected={active.roofType ?? null} onSelect={selectRoofType} label="Tetőforma módosítása" /></GlassDisclosure>
          : <RoofTypeSelector selected={active.roofType ?? null} onSelect={selectRoofType} label="Felmért tetőforma" />)}
        {active.workType !== "roof" || active.roofType ? <section className="field-survey-measurements">{active.workType !== "roof" && <><h2>Mérések</h2><p>Az üres érték hiányzó mérésként menthető. Add meg a helyszínen ellenőrzött értéket és egységet.</p></>}
          {active.workType === "roof" && active.roofType ? <SurveyRoofPreview
            roofType={active.roofType}
            gablePreview={activeGablePreview}
            activeDimension={activeSurveyGuide?.key ?? null}
            activeDimensionDescription={activeSurveyGuide?.meaning}
            activeGuide={activeSurveyGuide}
            measurements={serialize([active])[0].measurements.filter((measurement): measurement is FieldSurveyMeasurement => measurement.value !== null)}
            onDimensionSelect={(key) => {
              const matches = active.measurements.filter((measurement) => measurementGuideForSurvey(active.roofType!, measurement.semanticType)?.key === key);
              if (matches.length === 1) document.getElementById(`survey-measurement-${matches[0].id}`)?.focus();
            }}
            measurementInputs={
              <>
                <div className="roof-survey-measurement-strip">{active.measurements.map((measurement, index) => {
                  const geometryError = activeGablePreview?.issue?.fieldMessages[measurement.id];
                  return <div className={`field-survey-measurement${measurement.id === recentMeasurementId ? " is-recently-added" : ""}${geometryError ? " has-geometry-error" : ""}`} key={measurement.id}>
                  <label className="field-survey-field field-survey-measurement-value"><span>{measurement.label} · {fieldSurveyUnitLabels[measurement.unit]}</span><input id={`survey-measurement-${measurement.id}`} type="text" aria-label={`Mérés ${index + 1} értéke`} aria-invalid={geometryError ? true : undefined} aria-describedby={geometryError ? `survey-measurement-error-${measurement.id}` : undefined} inputMode="decimal" autoComplete="off" value={measurement.value} onFocus={() => setFocusedRoofMeasurement(measurement.semanticType)} onBlur={() => setFocusedRoofMeasurement(null)} onChange={(event) => patchMeasurement(measurement.id, { value: event.target.value })} />{geometryError && <span className="field-survey-inline-error" id={`survey-measurement-error-${measurement.id}`}>{geometryError}</span>}</label>
                  <MeasurementTools measurement={measurement} index={index} disabled={blocked || Boolean(recovery)} onPatch={(patch) => patchMeasurement(measurement.id, patch)} onRemove={() => void removeMeasurement(measurement.id)} />
                </div>;
                })}</div>
              </>
            }
            actions={
              <>
                <div className="roof-survey-edit-actions">
                  {missingRoofTemplates.length > 0 && active.roofType === "gable" && <button type="button" className="secondary-button roof-survey-add-required" onClick={() => patchSection({ measurements: [...active.measurements, ...missingRoofTemplates.map((template) => ({ ...template, id: generateSecureUuid(), value: "" }))] })}>Nyeregtető alapmérései · {missingRoofTemplates.length} mező hozzáadása</button>}
                  <button type="button" className="field-survey-add" disabled={measurementAddPending} onClick={(event) => addMeasurement(undefined, event)}><Plus aria-hidden="true" className="size-4" />Mérés hozzáadása</button><GlassDisclosure className="field-survey-template-details" summary="Másik sablonmérés hozzáadása">{(active.roofType !== "gable" ? surveyRoofFields(active.roofType) : fieldSurveyTemplates[active.workType]).map((template) => <button type="button" key={template.label} disabled={measurementAddPending} onClick={(event) => addMeasurement(template, event)}>{template.label} · {fieldSurveyUnitLabels[template.unit]}</button>)}</GlassDisclosure>
                </div>
              </>
            }
          /> : <>
            {active.measurements.map((measurement, index) => <div className={`field-survey-measurement${measurement.id === recentMeasurementId ? " is-recently-added" : ""}`} key={measurement.id}>
              <label className="field-survey-field field-survey-measurement-value"><span>{measurement.label} · {fieldSurveyUnitLabels[measurement.unit]}</span><input id={`survey-measurement-${measurement.id}`} type="text" aria-label={`Mérés ${index + 1} értéke`} inputMode="decimal" autoComplete="off" value={measurement.value} onChange={(event) => patchMeasurement(measurement.id, { value: event.target.value })} /></label>
              <MeasurementTools measurement={measurement} index={index} disabled={blocked || Boolean(recovery)} onPatch={(patch) => patchMeasurement(measurement.id, patch)} onRemove={() => void removeMeasurement(measurement.id)} />
            </div>)}
            <button type="button" className="field-survey-add" disabled={measurementAddPending} onClick={(event) => addMeasurement(undefined, event)}><Plus aria-hidden="true" className="size-4" />Mérés hozzáadása</button><GlassDisclosure className="field-survey-template-details" summary="Másik sablonmérés hozzáadása">{fieldSurveyTemplates[active.workType].map((template) => <button type="button" key={template.label} disabled={measurementAddPending} onClick={(event) => addMeasurement(template, event)}>{template.label} · {fieldSurveyUnitLabels[template.unit]}</button>)}</GlassDisclosure>
          </>}
        </section> : null}
        <GlassDisclosure className="field-survey-note-details" summary="Megjegyzés · opcionális"><label className="field-survey-field"><span>Helyszíni megjegyzés</span><textarea value={active.notes} rows={3} maxLength={2000} onChange={(event) => patchSection({ notes: event.target.value })} /></label></GlassDisclosure>
        <GlassDisclosure summary={`Fotók ehhez a munkaszakaszhoz · ${active.photoIds.length}`}>{photos.length ? photos.map((photo) => <label className="survey-photo-choice" key={photo.id}><input type="checkbox" checked={active.photoIds.includes(photo.id)} onChange={(event) => patchSection({ photoIds: event.target.checked ? [...active.photoIds, photo.id] : active.photoIds.filter((id) => id !== photo.id) })} />{photo.filename}</label>) : <p>Az alábbi fotópanelben tölthetsz fel képet; az új kép automatikusan ehhez a szakaszhoz kerül a következő mentéskor.</p>}</GlassDisclosure>
        </>}
      </fieldset>
    </form>
    </div>
    {active.workType === "roof" && active.roofType && effectiveProjectId && surveyId && !recovery && <GlassDisclosure className="survey-completion-disclosure" summary="Tetőmodellhez mentés · opcionális"><SurveyRoofWorkspace organizationId={organizationId} surveyId={surveyId} version={version} sectionId={active.id} sectionName={active.name} roofType={active.roofType} links={relationships.calculations} ensureSaved={ensureSaved} onLinked={() => router.refresh()} /></GlassDisclosure>}
    <section className="survey-completion-area" aria-labelledby="survey-completion-title">
      <div className="survey-completion-heading"><div><h2 id="survey-completion-title">Következő lépések</h2></div>{(saving || dirty || surveyId) && <div className="survey-completion-primary"><p role="status">{saving ? "Mentés…" : dirty ? "Nem mentett módosítások" : `Mentve · V${version}`}</p></div>}</div>
      <GlassToolbar ariaLabel="Felmérés folytatása" className="survey-completion-toolbar"><button type="button" className="secondary-button" disabled={!canSaveSurvey || photoState.queued} onClick={() => void showSummary()}>Felmérés összesítése</button></GlassToolbar>
      <SurveyExecutionActions organizationId={organizationId} surveyId={surveyId} version={version} plans={executionPlans} linkedPlans={relationships.executionPlans} canSave={canSaveSurvey} ensureSaved={ensureSaved} onStandaloneSave={() => { if (canSaveSurvey) void persistCurrent(); }} />
      {!needsInitialWorkTypeChoice && !recovery && <GlassDisclosure className="survey-completion-disclosure" summary="Fotók hozzáadása · privát felmérési képek"><FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={version} onVersionChange={setVersion} onEnsureSaved={ensureSaved} onPendingChange={setPhotoState} onPhotosChange={onPhotos} onPhotoUploaded={associateUploadedPhoto} onUploadComplete={() => router.refresh()} /></GlassDisclosure>}
      {effectiveProjectId && <GlassDisclosure className="survey-completion-disclosure" summary={`Korábbi projektkapcsolat · ${projects.find((project) => project.id === effectiveProjectId)?.name ?? "elérhető"}`}>
        <p>Ez a felmérés korábbi projektazonosítót őriz meg kompatibilitásból. Az új felméréseknél nincs szükség projekt létrehozására.</p>
        {projects.some((project) => project.id === effectiveProjectId) && <Link href={`/projektek/${effectiveProjectId}?organization=${organizationId}`}>Kapcsolt régi adatok megnyitása →</Link>}
      </GlassDisclosure>}
      {photoAssociationPending && !needsInitialWorkTypeChoice && <button type="button" className="primary-button survey-photo-save" disabled={!canSaveSurvey} onClick={() => void persistCurrent()}>{saving ? "Kapcsolás mentése…" : `Fénykép kapcsolásának mentése · ${active.name}`}</button>}
    </section>
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {summary && surveyId && !dirty && <WorkspaceSummary key={version} organizationId={organizationId} surveyId={surveyId} version={version} sections={serialize(sections)} calculations={relationships.calculations} initialFollowups={relationships.followups} onPendingChange={setFollowupPending} originalProjectId={projectId || null} />}
  </section>;
}

function SurveyRoofPreview({ roofType, gablePreview, measurements, activeDimension, activeDimensionDescription, activeGuide, measurementInputs, actions, onDimensionSelect }: Readonly<{ roofType: RoofGeometryType; gablePreview: GableSurveyPreview | null; measurements: readonly FieldSurveyMeasurement[]; activeDimension?: string | null; activeDimensionDescription?: string; activeGuide: ReturnType<typeof measurementGuideForSurvey>; measurementInputs: ReactNode; actions: ReactNode; onDimensionSelect: (key: string) => void }>) {
  const gableOutput = gablePreview?.output ?? null;
  const previewIssue = gablePreview?.issue ?? null;
  let geometry: ReturnType<typeof calculateRoofGeometry> | null = roofType === "gable" ? gablePreview?.geometry ?? null : null;
  if (roofType !== "gable") {
    const input = geometryFromSurveyMeasurements(roofType, measurements);
    if (input) geometry = calculateRoofGeometry(input);
  }
  return <RoofWorkspace
    className="roof-workspace-survey"
    label="Felmérés tetőmérési munkaterülete"
    context={<div className="roof-workspace-context"><div className="roof-guidance-slot"><MeasurementGuidance compact guide={activeGuide} /></div></div>}
    measurements={measurementInputs}
    drawing={geometry ? <TechnicalDrawing output={gableOutput ?? undefined} geometry={gableOutput ? undefined : geometry} compact activeDimension={activeDimension} activeDimensionDescription={activeDimensionDescription} onDimensionSelect={onDimensionSelect} isSaved={false} /> : null}
    results={!geometry
      ? <p className="missing-data" role={previewIssue?.kind === "invalid" ? "alert" : "status"}>{previewIssue?.message ?? (measurements.length ? "A rajz a tetőforma minden szükséges, érvényes méretének megadása után jelenik meg." : "A rajz a szükséges méretek megadása után jelenik meg.")}</p>
      : <RoofGeometryResults geometry={geometry} provenanceLabel="A bemenetek felmért értékek; az alábbiakat a közös tetőgeometriai motor számítja." />}
    actions={actions}
  />;
}

function MeasurementTools({ measurement, index, disabled, onPatch, onRemove }: Readonly<{ measurement: MeasurementDraft; index: number; disabled: boolean; onPatch: (patch: Partial<MeasurementDraft>) => void; onRemove: () => void }>) {
  return <div className="field-survey-measurement-settings">
    <AnchoredPopover label={`Beállítások: ${measurement.label}`} heading={`${measurement.label} · beállítások`} icon={Settings2} disabled={disabled} focusFirst>
      <div className="field-survey-measurement-tools">
        <label className="field-survey-field"><span>Mérés neve</span><input aria-label={`Mérés ${index + 1} neve`} value={measurement.label} maxLength={120} disabled={disabled} onChange={(event) => onPatch({ label: event.target.value })} /></label>
        <label className="field-survey-field"><span>Egység</span><select aria-label={`Mérés ${index + 1} egysége`} value={measurement.unit} disabled={disabled} onChange={(event) => onPatch({ unit: event.target.value as FieldSurveyUnit })}>{Object.entries(fieldSurveyUnitLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="field-survey-field"><span>Számítási szerep</span><select aria-label={`Mérés ${index + 1} számítási szerepe`} value={measurement.semanticType} disabled={disabled} onChange={(event) => onPatch({ semanticType: event.target.value as FieldSurveySemanticType })}>{Object.entries(fieldSurveySemanticTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      </div>
    </AnchoredPopover>
    <button type="button" className="field-survey-remove" aria-label={`${measurement.label} törlése`} title="Mérés törlése" disabled={disabled} onClick={onRemove}><Trash2 aria-hidden="true" className="size-4" /></button>
  </div>;
}
