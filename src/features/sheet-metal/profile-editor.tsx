"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { ProfileDrawing } from "@/features/sheet-metal/profile-drawing";
import { addBend, calculateDraft, createTemplate, editBend, editStraight, removeBend, reverseAngle, selectionMatches, type ProfileDraft, type Selection, type Template } from "@/features/sheet-metal/profile-editor-model";

const format = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value);
const templateLabels: Record<Template, string> = { l: "L-profil", u: "U-profil", custom: "Egyedi nyitott profil" };

export function ProfileEditor() {
  const [draft, setDraft] = useState<ProfileDraft>(() => createTemplate("l"));
  const [selection, setSelection] = useState<Selection>(null);
  const result = useMemo(() => calculateDraft(draft), [draft]);
  function switchTemplate(template: Template) {
    if (template === draft.template && !draft.dirty) return;
    if (draft.dirty && !window.confirm("A jelenlegi szerkesztés nem mentett. Lecseréled a profilt a választott DEMO sablonra?")) return;
    setDraft(createTemplate(template)); setSelection(null);
  }
  function changeDraft(changes: Partial<ProfileDraft>) { setDraft((current) => ({ ...current, ...changes, dirty: true })); }
  const errors = !result.ok ? result.errors.slice(0, 4).map((error) => {
    const path = error.path?.join(".") ?? "";
    const field = path.includes("thickness") ? "Vastagság" : path.includes("tangentLength") ? "Tangenshossz" : path.includes("signedTurn") ? "Hajtásszög" : path.includes("insideRadius") ? "Belső sugár" : path.includes("kFactor") ? "K-tényező" : path.includes("baMm") ? "BA" : path.includes("source") ? "Paraméterforrás" : "Profil";
    return `${field}: ${error.code === "VALIDATION_ERROR" || error.code === "MISSING_REQUIRED_INPUT" ? "hiányzó vagy érvénytelen érték; ellenőrizd a megadott tartományt." : error.message}`;
  }) : [];
  return <div className="profile-workspace">
    <header className="profile-header"><div><p className="section-eyebrow">F9.6.3.2 · projektmunkaterület</p><h1>Lemezprofilok és hajtások</h1><p>Nyitott 2D lemezprofil szerkesztése és paraméteralapú terítékellenőrzés.</p></div><span className="phase-pill">Nem mentett munkavázlat</span></header>
    <div className="profile-grid"><section className="detail-surface profile-controls" aria-label="Profil paraméterei">
      <div className="profile-section-heading"><h2>Profil</h2><span>DEMO sablonméretek</span></div>
      <div className="profile-template-list" role="group" aria-label="Profilsablon">
        {(Object.keys(templateLabels) as Template[]).map((template) => <button type="button" key={template} className={draft.template === template ? "is-active" : ""} aria-pressed={draft.template === template} onClick={() => switchTemplate(template)}>{templateLabels[template]}</button>)}
      </div>
      <p className="profile-help">Minden egyenes hossza a kész profil <strong>tangenciapontok közötti</strong> vagy a szabad vég és tangenciapont közötti szakasz hossza. Külső/belső csúcsméretet ne írj ide.</p>
      <div className="profile-basic-fields"><label>Profil neve<input value={draft.label} maxLength={160} onChange={(event) => changeDraft({ label: event.target.value })} /></label><label>Anyagvastagság (mm)<input inputMode="decimal" value={draft.thickness} onChange={(event) => changeDraft({ thickness: event.target.value })} /></label></div>
      <div className="profile-section-heading"><h2>Elemek sorrendben</h2><span>{draft.straights.length} egyenes · {draft.bends.length} hajtás</span></div>
      <div className="profile-element-list">{draft.straights.map((straight, index) => <div key={straight.id}>
        <div className={`profile-element ${selectionMatches(selection, "straight", straight.id) ? "is-selected" : ""}`} onClick={() => setSelection({ kind: "straight", id: straight.id })}>
          <div className="profile-element-title"><button type="button" className="profile-element-select" aria-pressed={selectionMatches(selection, "straight", straight.id)} onClick={() => setSelection({ kind: "straight", id: straight.id })}>S{index + 1} · Egyenes</button></div>
          <label>Tangenshossz (mm)<input inputMode="decimal" value={straight.length} onChange={(event) => setDraft((current) => editStraight(current, straight.id, event.target.value))} /></label>
        </div>
        {draft.bends[index] && (() => { const bend = draft.bends[index]; return <div className={`profile-element profile-bend-row ${selectionMatches(selection, "bend", bend.id) ? "is-selected" : ""}`} onClick={() => setSelection({ kind: "bend", id: bend.id })}>
          <div className="profile-element-title"><button type="button" className="profile-element-select" aria-pressed={selectionMatches(selection, "bend", bend.id)} onClick={() => setSelection({ kind: "bend", id: bend.id })}>H{index + 1} · Hajtás</button><button type="button" className="profile-remove" aria-label={`H${index + 1} hajtás és következő egyenes törlése`} onClick={() => { setDraft((current) => removeBend(current, index)); setSelection(null); }}><Trash2 size={16} /></button></div>
          <div className="profile-fields-three"><label>Elfordulás (°)<input inputMode="decimal" value={bend.angle} onChange={(event) => setDraft((current) => editBend(current, bend.id, { angle: event.target.value }))} /></label><button type="button" className="secondary-button profile-reverse" onClick={() => setDraft((current) => editBend(current, bend.id, { angle: reverseAngle(bend.angle) }))}>Irány megfordítása</button><label>Belső sugár (mm)<input inputMode="decimal" value={bend.radius} onChange={(event) => setDraft((current) => editBend(current, bend.id, { radius: event.target.value }))} /></label></div>
          <div className="profile-fields-two"><label>Terítékparaméter<select value={bend.mode} onChange={(event) => setDraft((current) => editBend(current, bend.id, { mode: event.target.value as typeof bend.mode }))}><option value="unknown">Ismeretlen</option><option value="explicit_ba">Explicit BA</option><option value="k_factor">K-tényező</option></select></label>{bend.mode !== "unknown" && <label>{bend.mode === "explicit_ba" ? "BA (mm)" : "K (0–1)"}<input inputMode="decimal" value={bend.value} onChange={(event) => setDraft((current) => editBend(current, bend.id, { value: event.target.value }))} /></label>}</div>
          {bend.mode !== "unknown" && <label>Paraméter forrása<input value={bend.source} placeholder="Például saját mérés azonosítója" onChange={(event) => setDraft((current) => editBend(current, bend.id, { source: event.target.value }))} /></label>}
        </div>; })()}
      </div>)}</div>
      <button type="button" className="secondary-button profile-add" disabled={draft.bends.length >= 50} onClick={() => { setDraft(addBend); setSelection(null); }}><Plus size={18} /> Egyenes és hajtás hozzáadása</button>
    </section>
    <section className="detail-surface profile-canvas-panel" aria-label="Műszaki profilrajz"><div className="profile-section-heading"><h2>Keresztmetszet</h2><span>mm · °</span></div>{result.ok ? <ProfileDrawing output={result.output} thicknessMm={result.input.thicknessMm} selection={selection} onSelect={setSelection} /> : <div className="profile-invalid-drawing"><AlertTriangle size={26} /><strong>Érvénytelen geometria vagy bemenet</strong><p>A rajz csak ellenőrzött domainkimenetből készül. Javítsd a jelzett mezőket.</p></div>}</section></div>
    <section className="detail-surface profile-summary" aria-live="polite"><div className="profile-section-heading"><h2>Számítás és ellenőrzés</h2><span>Helyi, nem mentett eredmény</span></div>{result.ok ? <><div className="profile-result-grid"><div><small>Geometria</small><strong>Érvényes, önmetszés nélkül</strong><span>{result.output.geometry.segments.length} egyenes · {result.output.geometry.bends.length} hajtás</span></div><div><small>Terítékszélesség</small><strong>{result.output.flatPattern.widthMm === null ? "Terítékszélesség nem számítható." : `${format(result.output.flatPattern.widthMm)} mm`}</strong><span>{result.output.flatPattern.classification === "INCOMPLETE" ? "Hiányos paraméter" : result.output.flatPattern.classification === "PARAMETER_BASED_ESTIMATE" ? "Paraméteralapú becslés" : "Geometriailag meghatározott"}</span></div></div><div className="profile-allowances">{result.output.bends.map((bend, index) => <p key={bend.id}>H{index + 1}: {bend.allowanceMm === null ? "BA/K hiányzik" : `BA ${format(bend.allowanceMm)} mm`} · {bend.allowanceMode === "explicit_ba" ? "explicit BA" : bend.allowanceMode === "k_factor" ? "K-tényező" : "ismeretlen"} · forrás: {bend.sourceSnapshot?.label ?? "nincs"}</p>)}</div>{result.output.issues.length > 0 && <div className="profile-warnings">{result.output.issues.slice(0, 5).map((issue, index) => <p key={`${issue.code}-${index}`}>{issue.message}</p>)}</div>}</> : <div className="profile-errors" role="alert">{errors.map((error, index) => <p key={index}>{error}</p>)}{result.errors.length > errors.length && <p>További {result.errors.length - errors.length} hiba van. Ellenőrizd a mezőket.</p>}</div>}<p className="profile-summary-note">A DEMO sablonértékek nem gyártói adatok. Gép-, szerszám- és anyagkalibráció, gyárthatóság és mentés ebben a fázisban nem ellenőrzött.</p></section>
  </div>;
}
