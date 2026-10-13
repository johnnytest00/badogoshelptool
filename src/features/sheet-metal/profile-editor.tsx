"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, FilePlus2, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { ProfileDrawing } from "@/features/sheet-metal/profile-drawing";
import { addBend, calculateDraft, createTemplate, editBend, editStraight, fromDomainInput, removeBend, reverseAngle, selectionMatches, toDomainInput, type ProfileDraft, type Selection, type Template } from "@/features/sheet-metal/profile-editor-model";
import { createProfileTakeoffDraftAction, saveSheetMetalProfileAction } from "@/features/sheet-metal/profile-actions";
import type { ProfileCatalogPreviewCandidate, SavedProfile } from "@/features/sheet-metal/profile-data";
import { matchProfileMaterial } from "@/domain/calculations/profile-material-compatibility";

const format = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value);
const templateLabels: Record<Template, string> = { l: "L-profil", u: "U-profil", custom: "Egyedi nyitott profil" };

export function ProfileEditor({ organizationId, projectId, profiles, catalogCandidates }: Readonly<{ organizationId: string; projectId: string; profiles: SavedProfile[]; catalogCandidates: ProfileCatalogPreviewCandidate[] }>) {
  const router = useRouter();
  const firstProfile = profiles[0];
  const firstRevision = firstProfile?.revisions[0];
  const [draft, setDraft] = useState<ProfileDraft>(() => firstRevision ? fromDomainInput(firstRevision.input) : createTemplate("l"));
  const [activeCalculationId, setActiveCalculationId] = useState<string | null>(firstProfile?.calculationId ?? null);
  const [expectedRevision, setExpectedRevision] = useState(firstProfile?.currentRevisionNumber ?? 0);
  const [selectedRevisionId, setSelectedRevisionId] = useState(firstRevision?.revisionId ?? "");
  const [feedback, setFeedback] = useState("");
  const [transferPreviewOpen, setTransferPreviewOpen] = useState(false);
  const [transferRequestKey, setTransferRequestKey] = useState(() => crypto.randomUUID());
  const [takeoffName, setTakeoffName] = useState("Profil nettó blankterület · előzetes");
  const [transferFeedback, setTransferFeedback] = useState("");
  const [createdTakeoffId, setCreatedTakeoffId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selection, setSelection] = useState<Selection>(null);
  const result = useMemo(() => calculateDraft(draft), [draft]);
  const savedRequirement = !draft.dirty ? profiles.find((profile) => profile.calculationId === activeCalculationId)
    ?.revisions.find((revision) => revision.revisionId === selectedRevisionId)?.output.materialRequirement : undefined;
  const displayedRequirement = savedRequirement ?? (result.ok ? result.output.materialRequirement : null);
  const selectedCandidate = catalogCandidates.find((candidate) => candidate.variantId === draft.catalogVariantId) ?? null;
  const catalogMatch = draft.catalogVariantId ? matchProfileMaterial(selectedCandidate, draft.materialSpec, Number(draft.thickness.replace(",", "."))) : null;
  const activeProfile = profiles.find((profile) => profile.calculationId === activeCalculationId);
  const selectedSavedRevision = activeProfile?.revisions.find((revision) => revision.revisionId === selectedRevisionId);
  const transferEligible = !!selectedSavedRevision && !draft.dirty &&
    selectedSavedRevision.revisionNumber === activeProfile?.currentRevisionNumber &&
    selectedSavedRevision.output.flatPattern.widthMm !== null &&
    selectedSavedRevision.output.materialRequirement.totalNetBlankAreaSqM !== null &&
    selectedSavedRevision.output.materialRequirement.lengthPerPieceMm !== null &&
    selectedSavedRevision.output.materialRequirement.pieceCount !== null &&
    selectedSavedRevision.input.material?.catalogVariantId === draft.catalogVariantId &&
    catalogMatch === "TECHNICALLY_MATCHED_PARAMETERS";
  function transferProfile() {
    if (!transferEligible || !activeCalculationId || !selectedSavedRevision || isPending || !takeoffName.trim()) return;
    const data = new FormData();
    data.set("organizationId", organizationId); data.set("projectId", projectId);
    data.set("calculationId", activeCalculationId); data.set("revisionId", selectedSavedRevision.revisionId);
    data.set("variantId", draft.catalogVariantId); data.set("requestKey", transferRequestKey);
    data.set("name", takeoffName.trim()); setTransferFeedback("");
    startTransition(async () => {
      const response = await createProfileTakeoffDraftAction(data);
      if (!response.ok || !response.takeoffId) { setTransferFeedback(response.error ?? "Az átadás nem sikerült."); return; }
      setCreatedTakeoffId(response.takeoffId); setTransferPreviewOpen(false);
      setTransferRequestKey(crypto.randomUUID()); setTransferFeedback("Új anyagkimutatás-piszkozat létrejött.");
      router.refresh();
    });
  }
  function switchTemplate(template: Template) {
    if (template === draft.template && !draft.dirty) return;
    if (draft.dirty && !window.confirm("A jelenlegi szerkesztés nem mentett. Lecseréled a profilt a választott DEMO sablonra?")) return;
    setDraft(createTemplate(template)); setActiveCalculationId(null); setExpectedRevision(0); setSelectedRevisionId(""); setFeedback(""); setSelection(null);
  }
  function switchProfile(calculationId: string) {
    if (!calculationId) return;
    if (draft.dirty && !window.confirm("A jelenlegi profil módosításai nincsenek mentve. Betöltöd a másik profilt?")) return;
    const profile = profiles.find((item) => item.calculationId === calculationId);
    const revision = profile?.revisions[0];
    if (!profile || !revision) return;
    setDraft(fromDomainInput(revision.input)); setActiveCalculationId(profile.calculationId); setExpectedRevision(profile.currentRevisionNumber);
    setSelectedRevisionId(revision.revisionId); setFeedback(`Aktuális V${revision.revisionNumber} betöltve.`); setSelection(null);
  }
  function switchRevision(revisionId: string) {
    if (!revisionId) return;
    if (draft.dirty && !window.confirm("A jelenlegi módosítások nincsenek mentve. Betöltöd a kiválasztott revíziót?")) return;
    const profile = profiles.find((item) => item.calculationId === activeCalculationId);
    const revision = profile?.revisions.find((item) => item.revisionId === revisionId);
    if (!profile || !revision) return;
    setDraft(fromDomainInput(revision.input)); setExpectedRevision(profile.currentRevisionNumber); setSelectedRevisionId(revisionId);
    setFeedback(`V${revision.revisionNumber} betöltve${revision.revisionNumber < profile.currentRevisionNumber ? ` · mentés új V${profile.currentRevisionNumber + 1} revízióként történik` : ""}.`); setSelection(null);
  }
  function newProfile() {
    if (draft.dirty && !window.confirm("A jelenlegi profil módosításai nincsenek mentve. Új profilt kezdesz?")) return;
    setDraft(createTemplate("l")); setActiveCalculationId(null); setExpectedRevision(0); setSelectedRevisionId(""); setFeedback("Új profil munkavázlat."); setSelection(null);
  }
  function saveProfile() {
    if (!result.ok || isPending || (draft.catalogVariantId && catalogMatch !== "TECHNICALLY_MATCHED_PARAMETERS")) return;
    const calculationId = activeCalculationId ?? crypto.randomUUID();
    const input = { ...toDomainInput(draft), profileId: calculationId };
    const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", projectId);
    data.set("calculationId", calculationId); data.set("expectedRevisionNumber", String(expectedRevision)); data.set("input", JSON.stringify(input));
    setFeedback("");
    startTransition(async () => {
      const saved = await saveSheetMetalProfileAction(data);
      if (!saved.ok) { setFeedback(saved.error ?? "A profil mentése nem sikerült."); return; }
      setActiveCalculationId(saved.calculationId ?? calculationId); setExpectedRevision(saved.revisionNumber ?? expectedRevision + 1);
      setSelectedRevisionId(saved.revisionId ?? "");
      setDraft((current) => ({ ...current, profileId: saved.calculationId ?? calculationId, dirty: false }));
      setFeedback(`Mentve: V${saved.revisionNumber}.`); router.refresh();
    });
  }
  function changeDraft(changes: Partial<ProfileDraft>) { setDraft((current) => ({ ...current, ...changes, dirty: true })); }
  const errors = !result.ok ? result.errors.slice(0, 4).map((error) => {
    const path = error.path?.join(".") ?? "";
    const field = path.includes("pieceCount") ? "Darabszám" : path.includes("formedRunLength") ? "Darabhossz" : path.includes("thickness") ? "Vastagság" : path.includes("tangentLength") ? "Tangenshossz" : path.includes("signedTurn") ? "Hajtásszög" : path.includes("insideRadius") ? "Belső sugár" : path.includes("kFactor") ? "K-tényező" : path.includes("baMm") ? "BA" : path.includes("source") ? "Paraméterforrás" : "Profil";
    return `${field}: ${error.code === "VALIDATION_ERROR" || error.code === "MISSING_REQUIRED_INPUT" ? "hiányzó vagy érvénytelen érték; ellenőrizd a megadott tartományt." : error.message}`;
  }) : [];
  return <div className="profile-workspace">
    <header className="profile-header"><div><p className="section-eyebrow">F9.6.3.4.1 · projektmunkaterület</p><h1>Lemezprofilok és hajtások</h1><p>Nyitott 2D lemezprofil szerkesztése és paraméteralapú terítékellenőrzés.</p></div><span className="phase-pill">{draft.dirty ? "Nem mentett módosítás" : activeCalculationId ? `Mentett profil · V${expectedRevision}` : "Új profil munkavázlat"}</span></header>
    <section className="detail-surface profile-persistence" aria-label="Profil mentése és betöltése"><div className="profile-section-heading"><h2>Mentett profilok</h2><span>{profiles.length} profil · {activeCalculationId ? `aktuális revízió V${expectedRevision}` : "még nincs mentve"}</span></div><div className="profile-persistence-controls"><label>Profil<select value={activeCalculationId ?? ""} onChange={(event) => switchProfile(event.target.value)}><option value="">Új / nem mentett profil</option>{profiles.map((profile) => <option key={profile.calculationId} value={profile.calculationId}>{profile.displayName} · V{profile.currentRevisionNumber}</option>)}</select></label><label>Revízió<select value={selectedRevisionId} disabled={!activeCalculationId} onChange={(event) => switchRevision(event.target.value)}><option value="">Válassz revíziót</option>{profiles.find((item) => item.calculationId === activeCalculationId)?.revisions.map((revision) => <option key={revision.revisionId} value={revision.revisionId}>V{revision.revisionNumber} · {new Date(revision.createdAt).toLocaleString("hu-HU")}</option>)}</select></label><button type="button" className="secondary-button" onClick={newProfile}><FilePlus2 size={17} /> Új profil</button><button type="button" className="primary-button" disabled={isPending || !draft.dirty || !result.ok || !!draft.catalogVariantId && catalogMatch !== "TECHNICALLY_MATCHED_PARAMETERS"} onClick={saveProfile}>{isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Save size={17} />} {isPending ? "Mentés…" : `Mentés új revízióként${expectedRevision ? ` · V${expectedRevision + 1}` : " · V1"}`}</button></div>{feedback && <p className={`form-message ${feedback.startsWith("Mentve") || feedback.includes("betöltve") ? "is-success" : "is-error"}`} role="status">{feedback}</p>}</section>
    <div className="profile-grid"><section className="detail-surface profile-controls" aria-label="Profil paraméterei">
      <div className="profile-section-heading"><h2>Profil</h2><span>{draft.straights.some((straight) => straight.dimensionSource.kind === "demo") ? "DEMO sablonméretek" : "Saját méretek"}</span></div>
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
    <section className="detail-surface profile-summary" aria-label="Anyagszükséglet"><div className="profile-section-heading"><h2>Anyagszükséglet</h2><span>Előzetes nettó blankterület</span></div>
      <div className="profile-basic-fields"><label>Profilhossz darabonként (mm)<input inputMode="decimal" value={draft.lengthPerPiece} onChange={(event) => changeDraft({ lengthPerPiece: event.target.value })} placeholder="Nincs megadva" /></label><label>Azonos darabok száma (db)<input inputMode="numeric" value={draft.pieceCount} onChange={(event) => changeDraft({ pieceCount: event.target.value })} placeholder="Nincs megadva" /></label></div>
      <div className="profile-basic-fields"><label>Anyag specifikációja<input value={draft.materialSpec} maxLength={200} onChange={(event) => changeDraft({ materialSpec: event.target.value, material: undefined })} placeholder="Explicit anyagazonosító" /></label><label>Katalógusvariáns<select value={draft.catalogVariantId} onChange={(event) => { const candidate = catalogCandidates.find((item) => item.variantId === event.target.value); changeDraft({ catalogVariantId: event.target.value, materialSpec: candidate?.materialSpec ?? draft.materialSpec, material: undefined }); }}><option value="">Nincs hozzárendelve</option>{catalogCandidates.map((candidate) => <option key={candidate.variantId} value={candidate.variantId}>{candidate.productName} / {candidate.variantName}</option>)}</select></label></div>
      {draft.catalogVariantId && <p className="profile-help">{catalogMatch === "TECHNICALLY_MATCHED_PARAMETERS" ? "Műszaki paraméterek egyeznek: anyagazonosító, vastagság és m² egység. Ez nem gyártói igazolás és nem gyártási jóváhagyás." : catalogMatch === "UNRESOLVED" ? "Katalóguskapcsolat feloldatlan: hiányzik az explicit anyagazonosító, vastagság vagy forrásnév." : "Katalóguskapcsolat inkompatibilis: az anyagazonosító, vastagság, kategória vagy egység eltér."}</p>}
      <div className="profile-result-grid"><div><small>Terítékszélesség</small><strong>{result.ok && result.output.flatPattern.widthMm !== null ? `${format(result.output.flatPattern.widthMm)} mm` : "Nem számítható"}</strong></div><div><small>Nettó blankterület / db</small><strong>{displayedRequirement?.netBlankAreaPerPieceSqM !== null && displayedRequirement?.netBlankAreaPerPieceSqM !== undefined ? `${format(displayedRequirement.netBlankAreaPerPieceSqM)} m²` : "Nem számítható"}</strong></div><div><small>Összes nettó blankterület</small><strong>{displayedRequirement?.totalNetBlankAreaSqM !== null && displayedRequirement?.totalNetBlankAreaSqM !== undefined ? `${format(displayedRequirement.totalNetBlankAreaSqM)} m²` : "Nem számítható"}</strong></div></div>
      <p className="profile-summary-note">W × darabhossz ÷ 1 000 000; összesen × darabszám. Hiányzó BA/K esetén nincs terület. A nettó téglalapfelület nem beszerzési mennyiség, táblaszám, tekercsfogyás, vágásterv vagy gyárthatósági igazolás.</p>
    </section>
    <section className="detail-surface profile-summary" aria-label="Anyagkimutatás előkészítése">
      <div className="profile-section-heading"><h2>Anyagkimutatás előkészítése</h2><span>Új piszkozat · m²</span></div>
      <p className="profile-summary-note">Csak az aktuális, mentett profilrevízió előzetes nettó blankterülete adható át. A paraméteregyezés nem gépkalibráció vagy gyártói igazolás.</p>
      <div className="profile-result-grid">
        <div><small>Mentett revízió</small><strong>{selectedSavedRevision ? `V${selectedSavedRevision.revisionNumber}` : "Nincs mentett revízió"}</strong></div>
        <div><small>Profilhossz és darabszám</small><strong>{selectedSavedRevision?.output.materialRequirement.lengthPerPieceMm ?? "–"} mm · {selectedSavedRevision?.output.materialRequirement.pieceCount ?? "–"} db</strong></div>
        <div><small>Terítékszélesség</small><strong>{selectedSavedRevision?.output.flatPattern.widthMm == null ? "Nem számítható" : `${format(selectedSavedRevision.output.flatPattern.widthMm)} mm`}</strong></div>
        <div><small>Nettó blankterület</small><strong>{selectedSavedRevision?.output.materialRequirement.totalNetBlankAreaSqM == null ? "Nem számítható" : `${format(selectedSavedRevision.output.materialRequirement.totalNetBlankAreaSqM)} m²`}</strong></div>
      </div>
      <p className="profile-help">Anyag: {selectedSavedRevision?.input.material?.materialSpec || "nincs megadva"} · vastagság: {selectedSavedRevision?.input.thicknessMm ?? "–"} mm · variáns: {selectedCandidate ? `${selectedCandidate.productName} / ${selectedCandidate.variantName}` : "nincs"}.</p>
      <p className="profile-help">BA/K és számítás: {selectedSavedRevision?.input.bends.map((bend) => `${bend.id}: ${bend.allowance.mode}${bend.allowance.mode === "unknown" ? "" : ` (${bend.allowance.source.label})`}`).join("; ") || "nincs hajtás"} · {selectedSavedRevision?.output.flatPattern.classification ?? "nem ellenőrzött"}. Katalógus: {catalogMatch ?? "nincs kapcsolat"}; paraméterforrás: {selectedCandidate?.sourceName ?? "nincs"} ({selectedCandidate?.provenance ?? "–"}).</p>
      <p className="profile-help">Ár: {selectedCandidate?.price ? `${format(selectedCandidate.price.amount)} ${selectedCandidate.price.currency}/m² · ${selectedCandidate.price.sourceName ?? "forrás nincs megadva"}` : "nincs m² árverzió; hiányzó árként kerül át"}.</p>
      {!transferEligible && <p className="form-message is-error">{draft.dirty ? "A nem mentett módosításokat előbb mentsd új revízióként." : !selectedSavedRevision ? "Előbb mentsd a profilt." : selectedSavedRevision.revisionNumber !== activeProfile?.currentRevisionNumber ? "Történeti revízióból nem lehet átadni; nyisd meg az aktuálisat." : selectedSavedRevision.output.flatPattern.widthMm === null ? "Hiányzó BA/K miatt a terítékszélesség nem számítható." : selectedSavedRevision.output.materialRequirement.totalNetBlankAreaSqM === null ? "A nettó blankterülethez darabhossz és darabszám kell." : "Mentett, kompatibilis m² katalógusvariáns szükséges."}</p>}
      <button type="button" className="secondary-button" disabled={!transferEligible || isPending} onClick={() => setTransferPreviewOpen(true)}>Átadási előnézet</button>
      {transferPreviewOpen && <div className="profile-allowances"><h3>Átadás megerősítése</h3><p>V{selectedSavedRevision?.revisionNumber} · {selectedCandidate?.productName} / {selectedCandidate?.variantName} · {selectedSavedRevision?.output.materialRequirement.totalNetBlankAreaSqM == null ? "–" : format(selectedSavedRevision.output.materialRequirement.totalNetBlankAreaSqM)} m² előzetes nettó blankterület. Nincs hulladék- vagy beszerzési ráhagyás.</p><label>Piszkozat neve<input value={takeoffName} maxLength={200} onChange={(event) => setTakeoffName(event.target.value)} /></label><button type="button" className="primary-button" disabled={!transferEligible || isPending || !takeoffName.trim()} onClick={transferProfile}>{isPending ? "Átadás…" : "Új piszkozat létrehozása"}</button><button type="button" className="secondary-button" onClick={() => setTransferPreviewOpen(false)}>Mégse</button></div>}
      {transferFeedback && <p className={`form-message ${createdTakeoffId ? "is-success" : "is-error"}`} role="status">{transferFeedback}</p>}
      {createdTakeoffId && <a className="secondary-button" href={`/projektek/${projectId}/anyagkimutatas?organization=${organizationId}&takeoff=${createdTakeoffId}`}>Piszkozat megnyitása</a>}
    </section>
    <section className="detail-surface profile-summary" aria-live="polite"><div className="profile-section-heading"><h2>Számítás és ellenőrzés</h2><span>{draft.dirty || !activeCalculationId ? "Nem mentett előnézet" : "Szerveroldalon is újraszámított eredmény"}</span></div>{result.ok ? <><div className="profile-result-grid"><div><small>Geometria</small><strong>Érvényes, önmetszés nélkül</strong><span>{result.output.geometry.segments.length} egyenes · {result.output.geometry.bends.length} hajtás</span></div><div><small>Terítékszélesség</small><strong>{result.output.flatPattern.widthMm === null ? "Terítékszélesség nem számítható." : `${format(result.output.flatPattern.widthMm)} mm`}</strong><span>{result.output.flatPattern.classification === "INCOMPLETE" ? "Hiányos paraméter" : result.output.flatPattern.classification === "PARAMETER_BASED_ESTIMATE" ? "Paraméteralapú becslés" : "Geometriailag meghatározott"}</span></div></div><div className="profile-allowances">{result.output.bends.map((bend, index) => <p key={bend.id}>H{index + 1}: {bend.allowanceMm === null ? "BA/K hiányzik" : `BA ${format(bend.allowanceMm)} mm`} · {bend.allowanceMode === "explicit_ba" ? "explicit BA" : bend.allowanceMode === "k_factor" ? "K-tényező" : "ismeretlen"} · forrás: {bend.sourceSnapshot?.label ?? "nincs"}</p>)}</div>{result.output.issues.length > 0 && <div className="profile-warnings">{result.output.issues.slice(0, 5).map((issue, index) => <p key={`${issue.code}-${index}`}>{issue.message}</p>)}</div>}</> : <div className="profile-errors" role="alert">{errors.map((error, index) => <p key={index}>{error}</p>)}{result.errors.length > errors.length && <p>További {result.errors.length - errors.length} hiba van. Ellenőrizd a mezőket.</p>}</div>}<p className="profile-summary-note">A DEMO sablonértékek nem gyártói adatok. A mentett eredményt a szerver domainmotorja számolja újra. Gép-, szerszám- és anyagkalibráció, gyárthatóság nem igazolt.</p></section>
  </div>;
}
