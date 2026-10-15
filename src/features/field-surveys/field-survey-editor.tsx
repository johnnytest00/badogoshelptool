"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fieldSurveySemanticTypeLabels, fieldSurveyTemplates, fieldSurveyUnitLabels, fieldSurveyWorkTypeLabels, type FieldSurveySemanticType, type FieldSurveyUnit, type FieldSurveyWorkType } from "@/domain/field-surveys/contracts";
import { surveySections, surveySectionsSchema, type SurveySection, type SurveyCalculationLink, type SurveyFollowup } from "@/domain/field-surveys/workspace";
import { saveFieldSurveyAction } from "./field-survey-actions";
import type { FieldSurveyRecord, FieldSurveyRevisionRecord } from "./field-survey-data";
import { FieldSurveyPhotos } from "./field-survey-photos";
import { WorkspaceSummary } from "./workspace-summary";
import { WorkspaceCalculator } from "./workspace-calculator";
import { createSurveyFollowups, loadSurveyCalculator } from "./workspace-actions";
import { SurveyRoofWorkspace } from "./survey-roof-workspace";
import type { VerifiedSurveyRoof, VerifiedSurveyMultiRoof } from "./survey-roof-actions";
import { RoofTypeSelector, roofTypeOptions } from "@/features/roof-models/roof-type-selector";
import { surveyRoofFields } from "@/domain/field-surveys/roof-geometry";
import type { RoofGeometryType } from "@/domain/calculations/roof-geometry";

type MeasurementDraft = { id: string; label: string; value: string; unit: FieldSurveyUnit; semanticType: FieldSurveySemanticType };
type SectionDraft = Omit<SurveySection, "measurements"> & { measurements: MeasurementDraft[] };
const emptyMeasurement = (workType: FieldSurveyWorkType, id: string): MeasurementDraft => ({ ...fieldSurveyTemplates[workType][0], value: "", id });
const draftSections = (sections: SurveySection[]): SectionDraft[] => sections.map((section) => ({ ...section, measurements: section.measurements.map((measurement) => ({ ...measurement, value: measurement.value === null ? "" : String(measurement.value), semanticType: measurement.semanticType ?? "custom" })) }));
const initialSections = (survey?: FieldSurveyRecord | null): SectionDraft[] => survey ? draftSections(surveySections(survey)) : [{ id: "00000000-0000-4000-8000-000000000002", name: "Tető", workType: "roof", notes: "", photoIds: [], measurements: [emptyMeasurement("roof", "00000000-0000-4000-8000-000000000001")] }];
const serialize = (sections: SectionDraft[]): SurveySection[] => sections.map((section) => ({ ...section, measurements: section.measurements.map((measurement) => ({ ...measurement, value: measurement.value.trim() === "" ? null : Number(measurement.value.trim().replace(",", ".")) })) }));
const emptyRelationships: { calculations: SurveyCalculationLink[]; followups: SurveyFollowup[] } = { calculations: [], followups: [] };

export function FieldSurveyEditor({ organizationId, userId, projects, survey, initialProjectId = null, initialSectionId = null, revisionVersions = [], historicalRevision = null, relationships = emptyRelationships }: Readonly<{
  organizationId: string; userId?: string; projects: readonly { id: string; name: string }[]; survey?: FieldSurveyRecord | null; initialProjectId?: string | null;
  initialSectionId?: string | null;
  revisionVersions?: readonly number[]; historicalRevision?: FieldSurveyRevisionRecord | null;
  relationships?: { calculations: SurveyCalculationLink[]; followups: SurveyFollowup[] };
}>) {
  const router = useRouter();
  const [sections, setSections] = useState(() => initialSections(survey));
  const [activeId, setActiveId] = useState(() => initialSections(survey).find((section) => section.id === initialSectionId)?.id ?? initialSections(survey)[0].id);
  const [projectId, setProjectId] = useState(survey?.projectId ?? initialProjectId ?? "");
  const [version, setVersion] = useState(survey?.version ?? 0);
  const [surveyId, setSurveyId] = useState<string | null>(survey?.id ?? null);
  const fingerprint = useMemo(() => JSON.stringify({ sections, projectId }), [sections, projectId]);
  const [baseline, setBaseline] = useState(fingerprint);
  const [workspacePersisted, setWorkspacePersisted] = useState(Boolean(survey?.sections));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [followupPending, setFollowupPending] = useState(false);
  const [newProjectName, setNewProjectName] = useState("Tetőfelújítás");
  const [summary, setSummary] = useState(false);
  const [photoState, setPhotoState] = useState({ busy: false, queued: false });
  const [photos, setPhotos] = useState<{ id: string; filename: string }[]>([]);
  const [photoAssociationPending, setPhotoAssociationPending] = useState(false);
  const [calculatorState, setCalculatorState] = useState({ dirty: false, pending: false });
  const [calculator, setCalculator] = useState<{ sectionId: string; version: number; context: Awaited<ReturnType<typeof loadSurveyCalculator>> } | null>(null);
  const saveLock = useRef(false);
  const createIdRef = useRef<string | null>(null);
  const dirty = baseline !== fingerprint;
  const blocked = saving || photoState.busy || calculatorState.pending || followupPending;
  const active = sections.find((section) => section.id === activeId) ?? sections[0];
  const effectiveProjectId = projectId || relationships.followups.find((followup) => followup.kind === "project")?.projectId || "";
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
  const [recovery, setRecovery] = useState<{ sections: SectionDraft[]; projectId: string; version: number } | null>(null);
  const recoveryChecked = useRef(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  useEffect(() => {
    if (!recoveryKey || historicalRevision || recoveryChecked.current) return;
    recoveryChecked.current = true;
    try {
      const raw = sessionStorage.getItem(recoveryKey);
      if (!raw) return;
      const stored = JSON.parse(raw);
      if (Array.isArray(stored.sections) && surveySectionsSchema.safeParse(serialize(stored.sections)).success && Number.isSafeInteger(stored.version) && stored.version >= 0 && typeof stored.projectId === "string") setRecovery(stored);
    } catch { /* Storage may be disabled; the navigation guard remains active. */ }
    finally { setRecoveryReady(true); }
  }, [recoveryKey, historicalRevision]);
  useEffect(() => {
    if (!recoveryKey || !recoveryReady || historicalRevision || recovery) return;
    try { if (dirty) sessionStorage.setItem(recoveryKey, JSON.stringify({ sections, projectId, version })); else sessionStorage.removeItem(recoveryKey); } catch { /* The user still receives an unload warning. */ }
  }, [recoveryKey, recoveryReady, historicalRevision, recovery, dirty, sections, projectId, version]);
  useEffect(() => {
    if (!dirty && !blocked && !photoState.queued && !calculatorState.dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest("a[href]");
      if (!anchor || event.defaultPrevented) return;
      if (blocked || !window.confirm("Nem mentett módosítás vagy várakozó művelet van. Elhagyod a felmérést?")) { event.preventDefault(); event.stopPropagation(); }
    };
    const currentHref = window.location.href;
    const currentHistoryState: unknown = window.history.state;
    const traverse = (event: PopStateEvent) => {
      if (blocked || !window.confirm("Nem mentett módosítás vagy várakozó művelet van. Elhagyod a felmérést?")) {
        event.stopImmediatePropagation();
        window.history.pushState(currentHistoryState, "", currentHref);
      }
    };
    window.addEventListener("beforeunload", warn); document.addEventListener("click", navigate, true); window.addEventListener("popstate", traverse, true);
    return () => { window.removeEventListener("beforeunload", warn); document.removeEventListener("click", navigate, true); window.removeEventListener("popstate", traverse, true); };
  }, [dirty, blocked, photoState.queued, calculatorState.dirty]);
  function patchSection(patch: Partial<SectionDraft>) { setSections((current) => current.map((section) => section.id === active.id ? { ...section, ...patch } : section)); setError(""); setSummary(false); }
  function patchMeasurement(id: string, patch: Partial<MeasurementDraft>) { patchSection({ measurements: active.measurements.map((measurement) => measurement.id === id ? { ...measurement, ...patch } : measurement) }); }
  function selectRoofType(type: RoofGeometryType) {
    if (active.roofType === type) return;
    if (active.measurements.some((measurement) => measurement.value !== "") && !window.confirm("A jelenlegi tetőmérések megmaradnak a korábbi felmérésváltozatban, de ebben a munkaszakaszban új mezők nyílnak. Folytatod?")) return;
    const templates = type === "gable" ? fieldSurveyTemplates.roof : surveyRoofFields(type);
    patchSection({ roofType: type, measurements: templates.map((template) => ({ id: crypto.randomUUID(), label: template.label, unit: template.unit, semanticType: template.semanticType, value: "" })) });
  }
  function addSection(workType: FieldSurveyWorkType) {
    const id = crypto.randomUUID();
    setSections((current) => [...current, { id, name: fieldSurveyWorkTypeLabels[workType], workType, notes: "", photoIds: [], measurements: [emptyMeasurement(workType, crypto.randomUUID())] }]); setActiveId(id); setSummary(false);
  }
  function changeType(workType: FieldSurveyWorkType) {
    const empty = active.measurements.length === 1 && active.measurements[0].value === "" && active.measurements[0].label === fieldSurveyTemplates[active.workType][0].label;
    patchSection({ workType, ...(workType === "roof" ? {} : { roofType: undefined }), ...(active.name === fieldSurveyWorkTypeLabels[active.workType] ? { name: fieldSurveyWorkTypeLabels[workType] } : {}), ...(empty ? { measurements: [emptyMeasurement(workType, active.measurements[0].id)] } : {}) });
  }
  function addMeasurement(template = (active.workType === "roof" && active.roofType && active.roofType !== "gable" ? surveyRoofFields(active.roofType) : fieldSurveyTemplates[active.workType]).find((candidate) => !active.measurements.some((measurement) => measurement.semanticType === candidate.semanticType)) ?? { label: "Egyedi mérés", unit: "mm" as const, semanticType: "custom" as const }) {
    patchSection({ measurements: [...active.measurements, { ...template, id: crypto.randomUUID(), value: "" }] });
  }
  function associateUploadedPhoto(photoId: string) {
    setSections((current) => current.map((section) => section.id === activeId && !section.photoIds.includes(photoId) ? { ...section, photoIds: [...section.photoIds, photoId] } : section));
    setPhotoAssociationPending(true);
    setSummary(false);
  }
  async function persistCurrent(nextSections: SectionDraft[] = sections) {
    if (saveLock.current) return null;
    saveLock.current = true; setSaving(true); setError("");
    try {
      if (nextSections.some((section) => section.workType === "roof" && !section.roofType && !survey?.sections?.some((original) => original.id === section.id))) { setError("Válassz tetőformát a tetőmunkaszakasz mentése előtt."); return null; }
      const parsed = surveySectionsSchema.safeParse(serialize(nextSections));
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? "Ellenőrizd a munkaszakaszokat."); return null; }
      const data = new FormData();
      data.set("organizationId", organizationId); data.set("surveyId", surveyId ?? (createIdRef.current ??= crypto.randomUUID()));
      data.set("projectId", projectId); data.set("workType", parsed.data[0].workType); data.set("notes", parsed.data[0].notes);
      data.set("sections", JSON.stringify(parsed.data)); data.set("measurements", JSON.stringify(parsed.data.flatMap((section) => section.measurements.filter((measurement) => measurement.value !== null)))); data.set("expectedVersion", String(version));
      const result = await saveFieldSurveyAction(data);
      if (!result.ok || !result.surveyId || !result.version) { setError(result.error ?? "A mentés nem sikerült."); return null; }
      if (recoveryKey) { try { sessionStorage.removeItem(recoveryKey); } catch { /* Storage is optional; navigation warnings remain active. */ } }
      setWorkspacePersisted(true); setSections(nextSections); setBaseline(JSON.stringify({ sections: nextSections, projectId })); setSurveyId(result.surveyId); setVersion(result.version); setPhotoAssociationPending(false);
      if (!surveyId) { window.history.replaceState(null, "", `/felmeresek/${result.surveyId}?organization=${organizationId}&section=${active.id}`); }
      return { surveyId: result.surveyId, version: result.version };
    } catch { setError("A mentés válasza bizonytalan. Azonos adatokkal biztonságosan újrapróbálható."); return null; }
    finally { saveLock.current = false; setSaving(false); }
  }
  async function ensureSaved() { if (recovery) { setError("Előbb állítsd vissza vagy vesd el a korábbi piszkozatot."); return null; } return surveyId && workspacePersisted && !dirty ? { surveyId, version } : persistCurrent(); }
  async function showSummary() { const saved = await ensureSaved(); if (saved) { setSummary(true); router.refresh(); } }
  async function openCalculator() {
    if (calculator || blocked || photoState.queued) return;
    const saved = await ensureSaved(); if (!saved) return;
    setSaving(true); setError("");
    try { const context = await loadSurveyCalculator({ organizationId, surveyId: saved.surveyId, version: saved.version, sectionId: active.id }); setCalculator({ sectionId: active.id, version: saved.version, context }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "A kalkulátor nem tölthető be."); }
    finally { setSaving(false); }
  }
  async function openGeometryWork(kind: "gutter" | "flashing", source: VerifiedSurveyRoof | VerifiedSurveyMultiRoof, edgeIds: string[]) {
    if (calculator || blocked || photoState.queued || !effectiveProjectId || !edgeIds.length) return;
    const existing = sections.find((section) => section.workType === kind);
    const target = existing ?? { id: crypto.randomUUID(), name: fieldSurveyWorkTypeLabels[kind], workType: kind, notes: "", photoIds: [], measurements: [emptyMeasurement(kind, crypto.randomUUID())] };
    const nextSections = existing ? sections : [...sections, target];
    setSaving(true); setError("");
    try {
      setActiveId(target.id);
      const saved = existing ? await ensureSaved() : await persistCurrent(nextSections);
      if (!saved) return;
      const context = await loadSurveyCalculator({ organizationId, surveyId: saved.surveyId, version: saved.version, sectionId: target.id, selectedRoof: { roofModelId: source.roofModelId, roofModelRevisionId: source.roofModelRevisionId, edgeIds } });
      setCalculator({ sectionId: target.id, version: saved.version, context });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "A geometriai átadás nem sikerült."); }
    finally { setSaving(false); }
  }
  async function createGeometryProject() {
    if (blocked || !newProjectName.trim()) return;
    const saved = await ensureSaved(); if (!saved) return;
    setFollowupPending(true); setError("");
    try {
      const result = await createSurveyFollowups({ organizationId, surveyId: saved.surveyId, version: saved.version, project: true, quotation: false, projectId: null, name: newProjectName.trim() });
      if (!result.ok) { setError(result.error ?? "A projekt nem jött létre."); return; }
      router.refresh();
    } catch { setError("A projekt létrehozásának válasza bizonytalan. Frissítsd a felmérést, mielőtt újrapróbálod."); }
    finally { setFollowupPending(false); }
  }
  function navigate(href: string) {
    if (blocked) return;
    if ((dirty || photoState.queued || calculatorState.dirty) && !window.confirm("A nem mentett módosítások vagy várakozó képek elvesznek. Biztosan kilépsz?")) return;
    router.push(href);
  }
  const selectedVersion = historicalRevision?.version ?? version;
  const revisionSelector = surveyId && revisionVersions.length > 1 && <label className="field-survey-field"><span>Felmérés változata</span><select value={selectedVersion} disabled={blocked} onChange={(event) => navigate(`/felmeresek/${surveyId}?organization=${organizationId}${Number(event.target.value) === version ? "" : `&version=${event.target.value}`}`)}>{[...new Set([version, ...revisionVersions])].map((item) => <option key={item} value={item}>{item === version ? "Aktuális" : "Korábbi"} · V{item}</option>)}</select></label>;
  if (historicalRevision && surveyId) return <section className="field-survey-card"><h1>Korábbi felmérésváltozat · V{historicalRevision.version}</h1>{revisionSelector}<WorkspaceSummary organizationId={organizationId} surveyId={surveyId} version={historicalRevision.version} sections={surveySections(historicalRevision)} calculations={relationships.calculations} initialFollowups={relationships.followups.filter((row) => row.surveyRevisionId === historicalRevision.id)} projects={projects} originalProjectId={historicalRevision.projectId} readOnly /><FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={historicalRevision.version} historical onVersionChange={() => undefined} onEnsureSaved={async () => null} onUploadComplete={() => undefined} /><button type="button" className="secondary-button" onClick={() => navigate(`/felmeresek/${surveyId}?organization=${organizationId}`)}>Aktuális felmérés folytatása</button>{surveySections(historicalRevision).filter((section) => section.workType !== "other").map((section) => <Link key={section.id} className="secondary-button" href={`/felmeresek/${surveyId}/kalkulator/${section.workType}?organization=${organizationId}&version=${historicalRevision.version}&section=${section.id}`}>{section.name} · V{historicalRevision.version} adatai a kalkulátorban</Link>)}</section>;
  return <section className="field-survey-card">
    <div className="field-survey-heading"><div><p className="section-eyebrow">Helyszíni munka · {surveyId ? `V${version}` : "új felmérés"}</p><h1>{surveyId ? "Felmérés szerkesztése" : "Új felmérés"}</h1><p>Mérj, fotózz, számolj. Ügyfél és projekt nélkül is bármikor menthetsz.</p></div><button type="button" className="secondary-button" onClick={() => navigate(`/felmeresek?organization=${organizationId}`)}>Vissza a felmérésekhez</button></div>
    {revisionSelector}
    {recovery && <aside className="survey-handoff-banner"><p>Korábbi nem mentett szerkesztés helyreállítható · alap V{recovery.version}.{recovery.version !== version ? " A mentett felmérés közben változott; a visszaállított piszkozat mentése verzióellenőrzést kap." : ""}</p><button type="button" className="secondary-button" onClick={() => { setSections(recovery.sections); setActiveId(recovery.sections[0].id); setProjectId(recovery.projectId); setVersion(recovery.version); setRecovery(null); }}>Piszkozat visszaállítása</button><button type="button" className="secondary-button" onClick={() => { if (recoveryKey) { try { sessionStorage.removeItem(recoveryKey); } catch { /* Storage is optional; navigation warnings remain active. */ } } setRecovery(null); }}>Korábbi piszkozat elvetése</button></aside>}
    <nav className="survey-section-tabs" aria-label="Munkaszakaszok">{sections.map((section) => <button className={active.id === section.id ? "primary-button" : "secondary-button"} type="button" key={section.id} aria-pressed={active.id === section.id} disabled={Boolean(calculator) || blocked || Boolean(recovery)} onClick={() => setActiveId(section.id)}>{section.name} · {section.measurements.filter((measurement) => measurement.value !== "").length} mérés</button>)}</nav>
    <form className="field-survey-form" noValidate onSubmit={(event) => { event.preventDefault(); if (!blocked) void persistCurrent(); }}>
      <fieldset disabled={blocked || Boolean(calculator) || Boolean(recovery)}>
        <div className="field-survey-section-heading"><h2>Munkaszakasz: {active.name}</h2></div>
        <div className="survey-section-add" aria-label="Munkaszakasz hozzáadása">{(["roof", "gutter", "flashing"] as const).map((type) => <button type="button" className="secondary-button" key={type} onClick={() => addSection(type)}><Plus aria-hidden="true" className="size-4" />{fieldSurveyWorkTypeLabels[type]}</button>)}<details><summary>Egyéb szakasz</summary><button type="button" className="secondary-button" onClick={() => addSection("other")}>Egyéb hozzáadása</button></details></div>
        <details className="survey-section-settings"><summary>Név, munkatípus és sorrend</summary><label className="field-survey-field"><span>Munkaszakasz neve</span><input value={active.name} maxLength={120} onChange={(event) => patchSection({ name: event.target.value })} /></label><label className="field-survey-field"><span>Munkatípus</span><select value={active.workType} onChange={(event) => changeType(event.target.value as FieldSurveyWorkType)}>{Object.entries(fieldSurveyWorkTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="survey-section-settings-actions"><button type="button" className="secondary-button" disabled={sections[0].id === active.id} onClick={() => { const index = sections.findIndex((item) => item.id === active.id); const next = [...sections]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; setSections(next); }}>Előrébb</button><button type="button" className="secondary-button" disabled={sections.at(-1)?.id === active.id} onClick={() => { const index = sections.findIndex((item) => item.id === active.id); const next = [...sections]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; setSections(next); }}>Hátrébb</button><button type="button" className="secondary-button" disabled={sections.length === 1} onClick={() => { if (!window.confirm("Eltávolítod ezt a munkaszakaszt? A mentett történeti változatok, fotók és számításkapcsolatok megmaradnak.")) return; const next = sections.filter((section) => section.id !== active.id); setSections(next); setActiveId(next[0].id); }}>Munkaszakasz eltávolítása</button></div></details>
        {!surveyId && <details><summary>Projekt · opcionális</summary><label className="field-survey-field"><span>Projekt</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)}><option value="">Önálló felmérés</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label></details>}
        {projectId && <p>Kapcsolt projekt: {projects.find((project) => project.id === projectId)?.name ?? projectId}</p>}
        {active.workType === "roof" && (active.roofType || !survey?.sections?.some((section) => section.id === active.id)) && (survey?.sections?.some((section) => section.id === active.id && section.roofType)
          ? <details className="survey-section-settings"><summary>Tetőforma: {roofTypeOptions.find((option) => option.type === active.roofType)?.name ?? "ismeretlen"} · módosítás</summary><RoofTypeSelector selected={active.roofType ?? null} onSelect={selectRoofType} label="Tetőforma módosítása" /></details>
          : <RoofTypeSelector selected={active.roofType ?? null} onSelect={selectRoofType} label="Felmért tetőforma" />)}
        <section className="field-survey-measurements"><h2>Mérések</h2><p>Az üres érték hiányzó mérésként menthető. A kalkulátorhoz csak kitöltött, megfelelő egységű adat kerül. A túlnyúlásnál 0 csak ténylegesen ellenőrzött hiányt jelent.</p>{missingRoofTemplates.length > 0 && active.roofType === "gable" && <button type="button" className="secondary-button" onClick={() => patchSection({ measurements: [...active.measurements, ...missingRoofTemplates.map((template) => ({ ...template, id: crypto.randomUUID(), value: "" }))] })}>Nyeregtető alapmérései · {missingRoofTemplates.length} mező hozzáadása</button>}
          {active.measurements.map((measurement, index) => <div className="field-survey-measurement" key={measurement.id}>
            <label className="field-survey-field field-survey-measurement-value"><span>{measurement.label} · {fieldSurveyUnitLabels[measurement.unit]}</span><input type="text" aria-label={`Mérés ${index + 1} értéke`} inputMode="decimal" autoComplete="off" value={measurement.value} onChange={(event) => patchMeasurement(measurement.id, { value: event.target.value })} /></label>
            <details className="field-survey-measurement-settings"><summary>Mérés beállításai</summary><label className="field-survey-field"><span>Mérés neve</span><input aria-label={`Mérés ${index + 1} neve`} value={measurement.label} maxLength={120} onChange={(event) => patchMeasurement(measurement.id, { label: event.target.value })} /></label><label className="field-survey-field"><span>Egység</span><select aria-label={`Mérés ${index + 1} egysége`} value={measurement.unit} onChange={(event) => patchMeasurement(measurement.id, { unit: event.target.value as FieldSurveyUnit })}>{Object.entries(fieldSurveyUnitLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="field-survey-field"><span>Számítási szerep</span><select aria-label={`Mérés ${index + 1} számítási szerepe`} value={measurement.semanticType} onChange={(event) => patchMeasurement(measurement.id, { semanticType: event.target.value as FieldSurveySemanticType })}>{Object.entries(fieldSurveySemanticTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></details>
            <button type="button" className="field-survey-remove" aria-label={`${measurement.label} törlése`} onClick={() => patchSection({ measurements: active.measurements.filter((item) => item.id !== measurement.id) })}><Trash2 aria-hidden="true" className="size-4" /></button>
          </div>)}
          <button type="button" className="field-survey-add" onClick={() => addMeasurement()}><Plus aria-hidden="true" className="size-4" />Mérés hozzáadása</button><details className="field-survey-template-details"><summary>Másik sablonmérés hozzáadása</summary>{(active.workType === "roof" && active.roofType && active.roofType !== "gable" ? surveyRoofFields(active.roofType) : fieldSurveyTemplates[active.workType]).map((template) => <button type="button" key={template.label} onClick={() => addMeasurement(template)}>{template.label} · {fieldSurveyUnitLabels[template.unit]}</button>)}</details>
        </section>
        <details className="field-survey-note-details"><summary>Megjegyzés · opcionális</summary><label className="field-survey-field"><span>Helyszíni megjegyzés</span><textarea value={active.notes} rows={3} maxLength={2000} onChange={(event) => patchSection({ notes: event.target.value })} /></label></details>
        <details><summary>Fotók ehhez a munkaszakaszhoz · {active.photoIds.length}</summary>{photos.length ? photos.map((photo) => <label className="survey-photo-choice" key={photo.id}><input type="checkbox" checked={active.photoIds.includes(photo.id)} onChange={(event) => patchSection({ photoIds: event.target.checked ? [...active.photoIds, photo.id] : active.photoIds.filter((id) => id !== photo.id) })} />{photo.filename}</label>) : <p>Az alábbi fotópanelben tölthetsz fel képet; az új kép automatikusan ehhez a szakaszhoz kerül a következő mentéskor.</p>}</details>
        <div className="field-survey-save-row"><p role="status">{saving ? "Mentés…" : dirty ? "Nem mentett módosítások" : surveyId ? `Mentve · V${version}` : "Új felmérés"}</p><button type="submit" className="primary-button field-survey-save">{saving ? "Mentés…" : "Felmérés mentése"}</button></div>
      </fieldset>
    </form>
    {active.workType === "roof" && effectiveProjectId && surveyId && !calculator && !recovery && <SurveyRoofWorkspace organizationId={organizationId} surveyId={surveyId} version={version} sectionId={active.id} sectionName={active.name} projectId={effectiveProjectId} roofType={active.roofType ?? "gable"} links={relationships.calculations} ensureSaved={ensureSaved} onWork={openGeometryWork} onLinked={() => router.refresh()} />}
    {active.workType === "roof" && !effectiveProjectId && !calculator && <div className="detail-surface survey-roof-project"><p>Mentett, más munkához átadható tetőmodellhez projekt kell. Az önálló felmérés és a kézi kalkulátorok továbbra is használhatók.</p><label className="field-survey-field"><span>Új projekt neve</span><input value={newProjectName} maxLength={200} onChange={(event) => setNewProjectName(event.target.value)} /></label><button type="button" className="secondary-button" disabled={blocked || !newProjectName.trim()} onClick={() => void createGeometryProject()}>{followupPending ? "Projekt létrehozása…" : "Projekt létrehozása a tetőmodellhez"}</button></div>}
    <div className="survey-workspace-actions"><button type="button" className="secondary-button" disabled={blocked || Boolean(recovery) || Boolean(calculator) || photoState.queued || active.workType === "other"} onClick={() => void openCalculator()}>Számítás hozzáadása · {active.name}</button><button type="button" className="secondary-button" disabled={blocked || Boolean(recovery) || Boolean(calculator) || photoState.queued} onClick={() => void showSummary()}>Felmérés összesítése</button></div>
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {calculator && surveyId && <WorkspaceCalculator key={`${calculator.sectionId}:${calculator.version}`} organizationId={organizationId} surveyId={surveyId} sectionId={calculator.sectionId} version={calculator.version} context={calculator.context} onClose={() => setCalculator(null)} onLinked={() => router.refresh()} onState={setCalculatorState} />}
    {!calculator && !recovery && <FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={version} onVersionChange={setVersion} onEnsureSaved={ensureSaved} onPendingChange={setPhotoState} onPhotosChange={onPhotos} onPhotoUploaded={associateUploadedPhoto} onUploadComplete={() => router.refresh()} />}
    {photoAssociationPending && !calculator && <button type="button" className="primary-button survey-photo-save" disabled={blocked || Boolean(recovery)} onClick={() => void persistCurrent()}>{saving ? "Kapcsolás mentése…" : `Fénykép kapcsolásának mentése · ${active.name}`}</button>}
    {summary && surveyId && !dirty && <WorkspaceSummary key={version} organizationId={organizationId} surveyId={surveyId} version={version} sections={serialize(sections)} calculations={relationships.calculations} initialFollowups={relationships.followups} onPendingChange={setFollowupPending} projects={projects} originalProjectId={projectId || null} />}
  </section>;
}
