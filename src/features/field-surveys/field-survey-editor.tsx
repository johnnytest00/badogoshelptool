"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { fieldSurveyInputSchema, fieldSurveySemanticTypeLabels, fieldSurveyTemplates, fieldSurveyUnitLabels, fieldSurveyWorkTypeLabels, type FieldSurveyMeasurement, type FieldSurveySemanticType, type FieldSurveyUnit, type FieldSurveyWorkType } from "@/domain/field-surveys/contracts";
import { saveFieldSurveyAction } from "@/features/field-surveys/field-survey-actions";
import type { FieldSurveyRecord } from "@/features/field-surveys/field-survey-data";
import { FieldSurveyPhotos } from "@/features/field-surveys/field-survey-photos";

type ProjectOption = { id: string; name: string };
type MeasurementDraft = { id: string; label: string; value: string; unit: FieldSurveyUnit; semanticType: FieldSurveySemanticType };
const initialMeasurementId = "00000000-0000-4000-8000-000000000001";
const emptyMeasurement = (type: FieldSurveyWorkType): MeasurementDraft => ({
  id: initialMeasurementId, label: fieldSurveyTemplates[type][0].label, value: "", unit: fieldSurveyTemplates[type][0].unit, semanticType: fieldSurveyTemplates[type][0].semanticType,
});
const fromMeasurements = (measurements: readonly FieldSurveyMeasurement[]): MeasurementDraft[] => measurements.map((measurement) => ({ ...measurement, semanticType: measurement.semanticType ?? "custom", value: String(measurement.value) }));

export function FieldSurveyEditor({ organizationId, projects, survey, initialProjectId = null }: Readonly<{
  organizationId: string; projects: readonly ProjectOption[]; survey?: FieldSurveyRecord | null; initialProjectId?: string | null;
}>) {
  const router = useRouter();
  const [workType, setWorkType] = useState<FieldSurveyWorkType>(survey?.workType ?? "roof");
  const [projectId, setProjectId] = useState(survey?.projectId ?? initialProjectId ?? "");
  const [measurements, setMeasurements] = useState<MeasurementDraft[]>(() => survey ? fromMeasurements(survey.measurements) : [emptyMeasurement("roof")]);
  const [notes, setNotes] = useState(survey?.notes ?? "");
  const [version, setVersion] = useState(survey?.version ?? 0);
  const [surveyId, setSurveyId] = useState<string | null>(survey?.id ?? null);
  const [baseline, setBaseline] = useState(() => JSON.stringify({
    workType: survey?.workType ?? "roof", projectId: survey?.projectId ?? initialProjectId ?? "",
    measurements: survey ? fromMeasurements(survey.measurements) : [emptyMeasurement("roof")], notes: survey?.notes ?? "",
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(Boolean(survey));
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const saveLock = useRef(false);

  const fingerprint = useMemo(() => JSON.stringify({ workType, projectId, measurements, notes }), [workType, projectId, measurements, notes]);
  const dirty = fingerprint !== baseline;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function changeWorkType(nextType: FieldSurveyWorkType) {
    setWorkType(nextType); setSaved(false); setError("");
    if (measurements.length === 1 && !measurements[0].value && measurements[0].label === fieldSurveyTemplates[workType][0].label) {
      setMeasurements([emptyMeasurement(nextType)]);
    }
  }

  function addMeasurement() {
    const templates = fieldSurveyTemplates[workType];
    const unused = templates.find((template) => !measurements.some((measurement) => measurement.label === template.label));
    setMeasurements((current) => [...current, { id: crypto.randomUUID(), label: unused?.label ?? "Egyedi mérés", value: "", unit: unused?.unit ?? "mm", semanticType: unused?.semanticType ?? "custom" }]);
    setSaved(false);
  }

  function updateMeasurement(id: string, field: keyof Omit<MeasurementDraft, "id">, value: string) {
    setMeasurements((current) => current.map((measurement) => measurement.id === id ? { ...measurement, [field]: value } : measurement));
    setSaved(false); setError("");
  }

  async function persistCurrent() {
    if (saveLock.current) return null;
    saveLock.current = true; setSaving(true); setError(""); setFieldErrors({});
    const parsedMeasurements = measurements.map((measurement) => ({ ...measurement, value: measurement.value.trim() === "" ? Number.NaN : Number(measurement.value) }));
    const parsed = fieldSurveyInputSchema.safeParse({ organizationId, projectId: projectId || null, workType, measurements: parsedMeasurements, notes: notes.trim() || null });
    if (!parsed.success) {
      const errors = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join(".") || "measurements", issue.message]));
      setFieldErrors(errors); setError("Ellenőrizd a méréseket."); setSaving(false); saveLock.current = false; return null;
    }
    const data = new FormData();
      data.set("organizationId", organizationId); data.set("surveyId", surveyId ?? "");
    data.set("projectId", projectId); data.set("workType", workType);
    data.set("measurements", JSON.stringify(parsed.data.measurements)); data.set("notes", notes);
    data.set("expectedVersion", String(version));
    try {
      const result = await saveFieldSurveyAction(data);
      if (!result.ok || !result.surveyId || result.version === undefined) {
        setError(result.error ?? "A felmérés mentése nem sikerült."); setFieldErrors(result.fieldErrors ?? {}); return null;
      }
      setBaseline(fingerprint);
      setVersion(result.version); setSurveyId(result.surveyId); setSaved(true);
      return { surveyId: result.surveyId, version: result.version };
    } catch {
      setError("A mentés nem érte el a szervert. Ellenőrizd a kapcsolatot, majd próbáld újra.");
      return null;
    } finally {
      setSaving(false); saveLock.current = false;
    }
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const wasNew = surveyId === null;
    const result = await persistCurrent();
    if (!result) return;
    if (wasNew) router.push(`/felmeresek/${result.surveyId}?organization=${encodeURIComponent(organizationId)}`);
    else router.refresh();
  }

  async function ensureSavedForPhoto() {
    if (surveyId && !dirty) return { surveyId, version };
    return persistCurrent();
  }

  function goBack() {
    if (dirty && !window.confirm("A módosítások még nincsenek mentve. Biztosan kilépsz?")) return;
    router.push(`/felmeresek?organization=${encodeURIComponent(organizationId)}`);
  }

  const calculatorTarget = workType === "roof" ? "roof" : workType === "gutter" ? "gutter" : workType === "flashing" ? "flashing" : null;

  return (
    <section className="field-survey-card">
      <div className="field-survey-heading">
        <div><p className="section-eyebrow">Helyszíni munka · {survey ? `V${version}` : "új felmérés"}</p><h1>{survey ? "Felmérés szerkesztése" : "Új felmérés"}</h1><p>Gyors mérési jegyzet. A megadott értékek saját mérések, nem ellenőrzött kalkulátoradatok.</p></div>
        <button className="secondary-button" type="button" onClick={goBack}>Vissza a felmérésekhez</button>
      </div>
      <form className="field-survey-form" onSubmit={handleSave} noValidate>
        <label className="field-survey-field"><span>Munkatípus</span><select value={workType} onChange={(event) => changeWorkType(event.target.value as FieldSurveyWorkType)}>{Object.entries(fieldSurveyWorkTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        {!surveyId && <label className="field-survey-field"><span>Projekt <small>· opcionális</small></span><select value={projectId} onChange={(event) => { setProjectId(event.target.value); setSaved(false); }}><option value="">Önálló felmérés</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>}
        {survey?.projectId && <p className="field-survey-project">Kapcsolt projekt: {projects.find((project) => project.id === survey.projectId)?.name ?? "Projekt"}</p>}

        <section className="field-survey-measurements" aria-labelledby="field-survey-measurements-title">
          <div className="field-survey-section-heading"><div><h2 id="field-survey-measurements-title">Mérések</h2><p>A sablonértékeket szabadon átírhatod; minden sornál válassz mértékegységet.</p></div></div>
          {measurements.map((measurement, index) => <div className="field-survey-measurement" key={measurement.id}>
            <label className="field-survey-field field-survey-measurement-name"><span>Mérés neve</span><input value={measurement.label} maxLength={120} onChange={(event) => updateMeasurement(measurement.id, "label", event.target.value)} aria-label={`Mérés ${index + 1} neve`} /></label>
            <label className="field-survey-field field-survey-measurement-value"><span>Érték</span><input type="number" inputMode="decimal" min="0" max="1000000000" step="any" required value={measurement.value} onChange={(event) => updateMeasurement(measurement.id, "value", event.target.value)} aria-label={`Mérés ${index + 1} értéke`} />{fieldErrors[`measurements.${index}.value`] && <small className="field-survey-inline-error">{fieldErrors[`measurements.${index}.value`]}</small>}</label>
            <label className="field-survey-field field-survey-measurement-unit"><span>Egység</span><select value={measurement.unit} onChange={(event) => updateMeasurement(measurement.id, "unit", event.target.value as FieldSurveyUnit)} aria-label={`Mérés ${index + 1} egysége`}>{Object.entries(fieldSurveyUnitLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <details className="field-survey-semantic-details"><summary>Kalkulátor-megfeleltetés</summary><label className="field-survey-field"><span>Mérési szerep</span><select value={measurement.semanticType} onChange={(event) => updateMeasurement(measurement.id, "semanticType", event.target.value as FieldSurveySemanticType)} aria-label={`Mérés ${index + 1} számítási szerepe`}>{Object.entries(fieldSurveySemanticTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></details>
            <button className="field-survey-remove" type="button" aria-label={`${measurement.label || `Mérés ${index + 1}`} törlése`} disabled={measurements.length === 1} onClick={() => { setMeasurements((current) => current.filter((item) => item.id !== measurement.id)); setSaved(false); }}><Trash2 aria-hidden="true" className="size-4" /></button>
            {fieldErrors[`measurements.${index}.label`] && <small className="field-survey-inline-error field-survey-label-error">{fieldErrors[`measurements.${index}.label`]}</small>}
          </div>)}
          <button className="field-survey-add" type="button" onClick={addMeasurement}><Plus aria-hidden="true" className="size-4" /> Mérés hozzáadása</button>
          <details className="field-survey-template-details"><summary>Másik sablonmérés hozzáadása</summary><div>{fieldSurveyTemplates[workType].map((template) => <button type="button" key={template.label} onClick={() => { setMeasurements((current) => [...current, { id: crypto.randomUUID(), label: template.label, value: "", unit: template.unit, semanticType: template.semanticType }]); setSaved(false); }}>{template.label} · {fieldSurveyUnitLabels[template.unit]}</button>)}</div></details>
        </section>

        <label className="field-survey-field"><span>Megjegyzés <small>· opcionális</small></span><textarea rows={3} maxLength={2000} value={notes} onChange={(event) => { setNotes(event.target.value); setSaved(false); }} placeholder="Például hozzáférés, helyszíni megjegyzés…" /></label>
        {surveyId && <details className="field-survey-calculator-details"><summary>Felhasználás kalkulátorban</summary>{calculatorTarget && !dirty ? <div className="field-survey-handoff-options"><Link className="primary-button" href={`/felmeresek/${surveyId}/kalkulator/${calculatorTarget}?organization=${encodeURIComponent(organizationId)}&version=${version}`}>{calculatorTarget === "roof" ? "Nyeregtető geometria megnyitása" : calculatorTarget === "gutter" ? "Ereszcsatorna-kalkulátor megnyitása" : "Szegélykalkulátor megnyitása"}</Link></div> : calculatorTarget ? <p>Mentsd a módosításokat, mielőtt kalkulátorba viszed a felmérés adatait.</p> : <p>Az Egyéb munkatípushoz nincs automatikus megfeleltetés.</p>}</details>}
        <FieldSurveyPhotos organizationId={organizationId} surveyId={surveyId} version={version} onVersionChange={setVersion} onEnsureSaved={ensureSavedForPhoto} onUploadComplete={(id) => router.replace(`/felmeresek/${id}?organization=${encodeURIComponent(organizationId)}`)} />
        <div className="field-survey-save-row"><p role="status" aria-live="polite">{saving ? "Mentés…" : dirty ? "Nem mentett módosítások" : saved ? `Mentve · V${version}` : "Új felmérés"}</p><button className="primary-button field-survey-save" type="submit" disabled={saving}>{saving ? "Mentés…" : "Felmérés mentése"}</button></div>
        {error && <p role="alert" className="form-message is-error">{error}</p>}
        <p className="field-survey-boundary">A felmérés mérései helyszíni adatok. A kalkulátormegfeleltetés csak a kiválasztott, mentett változatot adja át; az eredeti felmérés változatlan marad.</p>
      </form>
    </section>
  );
}
