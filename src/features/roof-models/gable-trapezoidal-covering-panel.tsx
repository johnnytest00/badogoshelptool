"use client";

import type { SavedSurveyCalculation } from "@/domain/field-surveys/workspace";


import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateGableRoof, type GableRoofInput, type GableRoofOutput } from "@/domain/calculations/gable-roof";
import { calculateGableTrapezoidalCovering, gableTrapezoidalCoveringInputSchema, type GableTrapezoidalCoveringInput, type GableTrapezoidalCoveringOutput } from "@/domain/calculations/gable-trapezoidal-covering";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { stableJsonStringify } from "./stable-json";
import { coveringRevisionView, sameOrNewCoveringOperation, type CoveringOperation } from "./gable-trapezoidal-covering-ux";
import { readGableTrapezoidalCovering, saveGableTrapezoidalCovering } from "./gable-trapezoidal-covering-actions";
import type { SavedGableCovering, SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import { GableCoveringTakeoffCreation } from "./gable-covering-takeoff-creation";

type Draft = { nominalSheetWidthMm: string; effectiveCoveringWidthMm: string; selectedSheetLengthMm: string; minimumSheetLengthMm: string; maximumSheetLengthMm: string; endAllowanceMm: string; longitudinalOverlapMm: string; lapCompatibilityConfirmed: boolean };
const initial: Draft = { nominalSheetWidthMm: "", effectiveCoveringWidthMm: "", selectedSheetLengthMm: "", minimumSheetLengthMm: "", maximumSheetLengthMm: "", endAllowanceMm: "", longitudinalOverlapMm: "", lapCompatibilityConfirmed: false };
const number = (value: string): number | null => value.trim() === "" ? null : Number(value.trim().replace(",", "."));
const display = (value: number | null, unit: string) => value === null ? "—" : `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value)} ${unit}`;
const fields: { key: Exclude<keyof Draft, "lapCompatibilityConfirmed">; label: string }[] = [
  { key: "nominalSheetWidthMm", label: "Névleges lemezszélesség" }, { key: "effectiveCoveringWidthMm", label: "Hasznos fedési szélesség" },
  { key: "selectedSheetLengthMm", label: "Kiválasztott lemezhossz" }, { key: "minimumSheetLengthMm", label: "Megadott termékminimum" },
  { key: "maximumSheetLengthMm", label: "Megadott termékmaximum" }, { key: "endAllowanceMm", label: "Kézi hosszráhagyás" },
  { key: "longitudinalOverlapMm", label: "Hosszanti átlapolás" },
];
function draftFrom(input: GableTrapezoidalCoveringInput): Draft {
  return { nominalSheetWidthMm: String(input.nominalSheetWidthMm ?? ""), effectiveCoveringWidthMm: String(input.effectiveCoveringWidthMm ?? ""),
    selectedSheetLengthMm: String(input.selectedSheetLengthMm ?? ""), minimumSheetLengthMm: String(input.minimumSheetLengthMm ?? ""),
    maximumSheetLengthMm: String(input.maximumSheetLengthMm ?? ""), endAllowanceMm: String(input.endAllowanceMm ?? ""),
    longitudinalOverlapMm: String(input.longitudinalOverlapMm ?? ""), lapCompatibilityConfirmed: input.lapCompatibilityConfirmed };
}
function latest(saved: SavedGableCovering | null): SavedGableCoveringRevision | null {
  return saved?.revisions.find((revision) => revision.revisionId === saved.currentRevisionId) ?? null;
}
function LayoutDrawing({ columns, rows, roofLength, slopeLength }: { columns: number; rows: number; roofLength: number; slopeLength: number }) {
  const lines: string[] = [];
  if (rows <= 400) for (const x of [30, 230]) {
    for (let i = 1; i < columns; i++) lines.push(`M${x + (180 * i) / columns} 35V145`);
    for (let i = 1; i < rows; i++) lines.push(`M${x} ${35 + (110 * i) / rows}h180`);
  }
  return <svg className="covering-layout-svg" viewBox="0 0 440 190" role="img" aria-label={`Sematikus lemezkiosztás: síkonként ${columns} oszlop és ${rows} sor`}><title>Sematikus fedési kiosztás</title><desc>A két azonos nyeregtető-sík hasznos szélességű lemezoszlopokra és a számított toldássorokra osztva.</desc><path d="M30 35H210V145H30Z M230 35H410V145H230Z" className="covering-plane"/><path d={lines.join("")} className="covering-grid"/><text x="120" y="165" textAnchor="middle">Bal tetősík</text><text x="320" y="165" textAnchor="middle">Jobb tetősík</text><text x="220" y="20" textAnchor="middle">Tetőhossz {display(roofLength / 1000, "m")} · ferde hossz {display(slopeLength / 1000, "m")}</text>{rows > 400 && <text x="220" y="184" textAnchor="middle">A túl nagy sorháló sematikus rajza rácsvonalak nélkül</text>}</svg>;
}

type Common = { onSaved?: (saved: SavedSurveyCalculation) => Promise<void>; organizationId: string; geometry: GableRoofOutput; geometryInput: GableRoofInput; sourceLabel: string; onDirtyChange?: (dirty: boolean) => void };
type Props = Common & ({ mode: "standalone"; saved?: SavedGableCovering | null; onLoadGeometry: (input: GableRoofInput) => void; onRevisionModeChange: (historical: boolean) => void; onSavePendingChange: (pending: boolean) => void; onSaveComplete: (input: GableRoofInput) => void } | { mode: "project"; projectId: string; projectName: string; roofGeometryDirty?: boolean; takeoffOptions: readonly GableCoveringTakeoffOption[]; roofModelId: string; roofModelRevisionId: string | null; roofModelRevisionNumber: number; savedCalculations: readonly SavedGableCovering[]; name: string });

export function GableTrapezoidalCoveringPanel(props: Readonly<Props>) {
  const router = useRouter();
  const { requestConfirmation } = useAppInteraction();
  const first = props.mode === "standalone" ? props.saved ?? null : props.savedCalculations[0] ?? null;
  const [saved, setSaved] = useState<SavedGableCovering | null>(first);
  const [draft, setDraft] = useState<Draft>(() => latest(first) ? draftFrom(coveringRevisionView(latest(first)!).coveringInput) : initial);
  const [viewedId, setViewedId] = useState<string | null>(first?.currentRevisionId ?? null);
  const [name, setName] = useState(first?.displayName ?? (props.mode === "project" ? `${props.name} trapézlemez-fedés` : "Trapézlemez-fedés"));
  const [useLatestSource, setUseLatestSource] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const operation = useRef<CoveringOperation | null>(null);
  const lastEdit = useRef<string | null>(null);
  const selected = saved?.revisions.find((revision) => revision.revisionId === viewedId) ?? null;
  const historical = Boolean(selected && selected.revisionId !== saved?.currentRevisionId);
  const selectedSource = selected ? coveringRevisionView(selected) : null;
  const stale = props.mode === "project" && Boolean(selectedSource?.roofModelRevisionId && selectedSource.roofModelRevisionId !== props.roofModelRevisionId);
  const sourceInput = props.mode === "standalone" ? props.geometryInput : selectedSource && !useLatestSource ? selectedSource.geometryInput : props.geometryInput;
  const sourceGeometry = props.mode === "standalone" ? props.geometry : selectedSource && !useLatestSource ? calculateGableRoof(selectedSource.geometryInput) : props.geometry;
  const coveringInput = useMemo<GableTrapezoidalCoveringInput>(() => ({ nominalSheetWidthMm: number(draft.nominalSheetWidthMm), effectiveCoveringWidthMm: number(draft.effectiveCoveringWidthMm), selectedSheetLengthMm: number(draft.selectedSheetLengthMm), minimumSheetLengthMm: number(draft.minimumSheetLengthMm), maximumSheetLengthMm: number(draft.maximumSheetLengthMm), endAllowanceMm: number(draft.endAllowanceMm), longitudinalOverlapMm: number(draft.longitudinalOverlapMm), lapCompatibilityConfirmed: draft.lapCompatibilityConfirmed, maximumSheetCount: 100_000 }), [draft]);
  const calculated = useMemo(() => calculateGableTrapezoidalCovering(sourceGeometry, coveringInput), [sourceGeometry, coveringInput]);
  const savedInput = selected ? coveringRevisionView(selected).coveringInput : null;
  const dirty = Boolean(selected ? stableJsonStringify(coveringInput) !== stableJsonStringify(savedInput) || name !== saved?.displayName || (props.mode === "standalone" && stableJsonStringify(props.geometryInput) !== stableJsonStringify(selectedSource?.geometryInput)) || useLatestSource : fields.some((field) => draft[field.key].trim()) || draft.lapCompatibilityConfirmed);
  const shown: GableTrapezoidalCoveringOutput = selected && !dirty ? (selected.output as { covering: GableTrapezoidalCoveringOutput }).covering : calculated;
  const shownGeometry = selected && !dirty ? (selected.output as { geometry: GableRoofOutput }).geometry : sourceGeometry;
  useEffect(() => { props.onDirtyChange?.(dirty); }, [dirty, props.onDirtyChange]);
  const editSignature = stableJsonStringify({ coveringInput, geometryInput: props.geometryInput, name, useLatestSource, viewedId });
  useEffect(() => { if (lastEdit.current !== null && lastEdit.current !== editSignature) operation.current = null; lastEdit.current = editSignature; }, [editSignature]);
  const set = (key: keyof Draft, value: string | boolean) => { setDraft((current) => ({ ...current, [key]: value })); setFeedback(""); };
  const openRevision = async (revision: SavedGableCoveringRevision) => {
    if (pending) return;
    if (dirty && !await requestConfirmation({ title: "Fedési módosítások elvetése", message: "A jelenlegi fedési előnézet nem mentett módosításait elveted, és betöltöd a kiválasztott változatot?", cancelLabel: "Maradok", actions: [{ label: "Változat betöltése", tone: "danger", run: () => undefined }] })) return;
    setViewedId(revision.revisionId); setDraft(draftFrom(coveringRevisionView(revision).coveringInput)); setName(saved?.displayName ?? name); setUseLatestSource(false); setFeedback(`V${revision.revisionNumber} betöltve.`);
    if (props.mode === "standalone") { props.onLoadGeometry(coveringRevisionView(revision).geometryInput); props.onRevisionModeChange(revision.revisionId !== saved?.currentRevisionId); }
  };
  const save = async () => {
    if (pending || historical || (props.mode === "project" && (!props.roofModelRevisionId || (stale && !useLatestSource)))) return;
    const parsed = gableTrapezoidalCoveringInputSchema.safeParse(coveringInput);
    if (!parsed.success || calculated.status !== "VALID") { setFeedback("A mentéshez érvényes lemezadatok és teljes mennyiségi eredmény szükséges."); return; }
    const scope = props.mode === "project" ? { kind: "project" as const, projectId: props.projectId, roofModelId: props.roofModelId, roofModelRevisionId: useLatestSource ? props.roofModelRevisionId! : selectedSource?.roofModelRevisionId ?? props.roofModelRevisionId! } : { kind: "standalone" as const };
    const payload = { organizationId: props.organizationId, expectedRevisionNumber: saved?.currentRevisionNumber ?? 0, name: name.trim(), scope, geometryInput: sourceInput, coveringInput: parsed.data };
    const signature = JSON.stringify(payload);
    operation.current = sameOrNewCoveringOperation(operation.current, signature, saved?.calculationId ?? null, generateSecureUuid);
    const ids = operation.current;
    setPending(true); if (props.mode === "standalone") props.onSavePendingChange(true); setFeedback("");
    try {
      const response = await saveGableTrapezoidalCovering({ ...payload, calculationId: ids.calculationId, operationId: ids.operationId });
      if (!response.ok) { setFeedback(response.error ?? "A mentés nem sikerült. Ha a számítás közben változott, nyisd meg újra."); return; }
      const loaded = await readGableTrapezoidalCovering(props.organizationId, response.calculationId!);
      if (!loaded || !latest(loaded)) { setFeedback("A mentés megtörtént, de az új változat nem tölthető be. Nyisd meg újra a számítást."); return; }
      setSaved(loaded); setViewedId(loaded.currentRevisionId); setName(loaded.displayName); setDraft(draftFrom(coveringRevisionView(latest(loaded)!).coveringInput)); setUseLatestSource(false); operation.current = null;
      if (props.mode === "standalone") { props.onSaveComplete(sourceInput); if (props.onSaved) { await props.onSaved({ calculationId: loaded.calculationId, revisionId: response.revisionId!, revisionNumber: response.revisionNumber! }); return; } router.replace(`/kalkulatorok/nyeregteto?organization=${props.organizationId}&calculation=${loaded.calculationId}`); }
      else router.refresh();
      setFeedback(`Mentve: V${loaded.currentRevisionNumber}${response.reused ? " · az ismételt kérés nem hozott létre új változatot" : ""}.`);
    } catch { setFeedback("A hálózati válasz bizonytalan. Azonos adatokkal ismételve ugyanazt a mentési műveletet folytatjuk."); }
    finally { setPending(false); if (props.mode === "standalone") props.onSavePendingChange(false); }
  };
  return <section className="roof-surface trapezoidal-covering" aria-labelledby="trapezoidal-covering-title">
    <div className="roof-section-heading"><div><p className="section-eyebrow">Tetők és tetőfedés · {props.sourceLabel}</p><h2 id="trapezoidal-covering-title">Trapézlemez-fedés mennyiségi előnézet</h2><p>A termékadatokat kézzel kell megadni. {saved ? `Mentett számítás · V${saved.currentRevisionNumber}` : "Nem mentett előnézet"}.</p></div></div>
    {props.mode === "project" && props.savedCalculations.length > 0 && <div className="project-module-links" aria-label="Mentett fedési számítások">{props.savedCalculations.map((item) => <button type="button" className="secondary-button" key={item.calculationId} disabled={pending} onClick={async () => { if (dirty && !await requestConfirmation({ title: "Fedési módosítások elvetése", message: "A jelenlegi fedési előnézet nem mentett módosításait elveted, és megnyitod a kiválasztott számítást?", cancelLabel: "Maradok", actions: [{ label: "Számítás megnyitása", tone: "danger", run: () => undefined }] })) return; setSaved(item); setViewedId(item.currentRevisionId); setDraft(latest(item) ? draftFrom(coveringRevisionView(latest(item)!).coveringInput) : initial); setName(item.displayName); setUseLatestSource(false); }}>{item.displayName} · V{item.currentRevisionNumber}</button>)}</div>}
    {props.mode === "project" && <p className="roof-help-note">Forrás: {useLatestSource && props.roofModelRevisionId ? `újraszámítási előnézet a legfrissebb mentett tetőmodell V${props.roofModelRevisionNumber} · ${props.roofModelRevisionId}` : selectedSource?.roofModelRevisionId ? `mentett tetőmodell-revízió ${selectedSource.roofModelRevisionId}` : props.roofModelRevisionId ? `mentett tetőmodell V${props.roofModelRevisionNumber} · ${props.roofModelRevisionId}` : "nincs ellenőrzött mentett tetőrevízió"}. {useLatestSource ? "A forrásváltás csak új fedési változat mentésével válik tartóssá." : stale ? "A fedés forrása eltér a tetőmodell legfrissebb revíziójától." : props.roofModelRevisionId ? "A geometriai forrás aktuális." : "Előbb ments ellenőrzött tetőgeometriát."} {stale && !historical && props.roofModelRevisionId && <button type="button" className="secondary-button" onClick={() => setUseLatestSource(true)}>Újraszámítás a legfrissebb mentett tetőrevízióból</button>}</p>}
    {props.mode === "standalone" && <p className="roof-help-note">Geometriai forrás: kézzel megadott, projekt nélküli tetőméretek.</p>}
    <details className="roof-help-note"><summary>Fedéshez használt geometriai bemenet</summary><p>Épülethossz: {display(sourceInput.buildingLengthMm, "mm")}; épületszélesség: {display(sourceInput.buildingWidthMm, "mm")}; {sourceInput.inputMode === "height" ? `tetőemelkedés: ${display(sourceInput.roofRiseMm, "mm")}` : `tetőhajlás: ${display(sourceInput.roofPitchDegrees, "°")}`}; eresztúlnyúlás: {display(sourceInput.eaveOverhangMm, "mm")}; első és hátsó oromtúlnyúlás: {display(sourceInput.frontGableOverhangMm, "mm")} / {display(sourceInput.rearGableOverhangMm, "mm")}.</p></details>
    {selected && <p className="roof-help-note">Számítási változat: V{selected.revisionNumber} · mentve {new Date(selected.createdAt).toLocaleString("hu-HU")} · {selected.validationStatus === "estimated" ? "előzetes mennyiségi becslés" : selected.validationStatus}. A geometria és az eredmény az adott változat mentett snapshotjából származik.</p>}
    <label className="roof-field roof-name-field"><span>Számítás neve</span><input value={name} maxLength={200} disabled={historical || pending} onChange={(event) => setName(event.target.value)} /></label>
    <div className="roof-form-grid">{fields.map((field) => <label className="roof-field" key={field.key}><span>{field.label} <small>mm</small></span><input inputMode="decimal" value={draft[field.key]} disabled={historical || pending} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} onChange={(event) => set(field.key, event.target.value)} /></label>)}</div>
    <label className="roof-field roof-covering-confirm"><span><input type="checkbox" checked={draft.lapCompatibilityConfirmed} disabled={historical || pending} onChange={(event) => set("lapCompatibilityConfirmed", event.target.checked)} /> Megerősítem, hogy a megadott termék és kialakítás alkalmas hosszanti toldásra</span></label>
    <p className="roof-help-note">A lemez a tetősík lejtésirányában fut. A hasznos szélesség önálló adat; ebből nem vonunk le újabb oldalsó átfedést. A termékhatárok és hosszráhagyás opcionális kézi adatok.</p>
    {shown.status === "VALID" && shown.columnsPerPlane !== null && shown.rowsPerPlane !== null ? <><div className="roof-result-grid" aria-live="polite">
      <div className="roof-result-metric"><small>Egy tetősík</small><strong>{display(shown.roofPlaneAreaMm2 / 1_000_000, "m²")}</strong></div><div className="roof-result-metric"><small>Teljes tetőfelület</small><strong>{display(shown.totalRoofAreaMm2 / 1_000_000, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Hasznos fedési szélesség</small><strong>{display(coveringInput.effectiveCoveringWidthMm, "mm")}</strong></div><div className="roof-result-metric"><small>Névleges lemezszélesség</small><strong>{display(coveringInput.nominalSheetWidthMm, "mm")}</strong></div><div className="roof-result-metric"><small>Lemezhossz</small><strong>{display(coveringInput.selectedSheetLengthMm, "mm")}</strong></div>
      <div className="roof-result-metric"><small>Oszlop / sík</small><strong>{shown.columnsPerPlane} db</strong></div><div className="roof-result-metric"><small>Sor / sík</small><strong>{shown.rowsPerPlane} db</strong></div><div className="roof-result-metric"><small>Előzetes lemezmennyiség</small><strong>{shown.totalSheetCount} db</strong></div>
      <div className="roof-result-metric"><small>Névleges beszerzett lemezterület</small><strong>{display(shown.purchasedNominalAreaMm2 === null ? null : shown.purchasedNominalAreaMm2 / 1_000_000, "m²")}</strong></div><div className="roof-result-metric"><small>Hosszanti átlapolás</small><strong>{display(shown.overlapMm, "mm")}</strong></div><div className="roof-result-metric"><small>Megadott hajlásszög</small><strong>{display(shown.pitchDegrees, "°")}</strong></div>
    </div><LayoutDrawing columns={shown.columnsPerPlane} rows={shown.rowsPerPlane} roofLength={shown.roofLongitudinalLengthMm} slopeLength={shown.slopeLengthMm} /><p className="roof-disclaimer">Sematikus kiosztás, nem gyártási vagy vágási terv. Az előzetes darabszám nem rendelési mennyiség; igazolt vágási veszteség, termékalkalmasság és rögzítés nincs számítva. Tetősík: {display(shownGeometry.areas.individualRoofPlaneM2, "m²")}.</p></> : <p className="missing-data" role="status">{shown.status === "UNSUPPORTED" ? "Ez a tető- vagy lemezkiosztás nem támogatott." : shown.status === "INVALID" ? shown.reasons.join(" ") : "Add meg a hasznos fedési szélességet és a kiválasztott lemezhosszt a mennyiségi eredményhez."} {shown.reasons.length > 0 && shown.status !== "INVALID" ? shown.reasons.join(" ") : ""}</p>}
    <div className="form-actions"><button id="covering-save-button" type="button" className="primary-button" disabled={pending || historical || (Boolean(saved) && !dirty) || calculated.status !== "VALID" || !name.trim() || (props.mode === "project" && (!props.roofModelRevisionId || (stale && !useLatestSource)))} onClick={save}>{pending ? "Mentés folyamatban…" : saved ? "Új változat mentése" : "Számítás mentése"}</button>{props.mode === "standalone" && <Link className="secondary-button" href={`/kalkulatorok/mentett?organization=${props.organizationId}`}>Mentett számításaim</Link>}</div>
    {props.mode === "project" && (saved && selected
      ? <GableCoveringTakeoffCreation organizationId={props.organizationId} projectId={props.projectId} projectName={props.projectName} roofModelId={props.roofModelId} currentRoofRevisionId={props.roofModelRevisionId} currentRoofRevisionNumber={props.roofModelRevisionNumber} saved={saved} revision={selected} dirty={dirty} unsavedRoofGeometry={props.roofGeometryDirty ?? false} options={props.takeoffOptions} />
      : <p className="roof-help-note">Anyagkimutatás csak kiválasztott, mentett projektfedési revízióból készíthető.</p>)}
    <p className="roof-help-note" role="status">{historical ? `Korábbi változat · V${selected?.revisionNumber}. A történeti állapot csak olvasható.` : pending ? "Mentés folyamatban." : dirty ? saved ? "Módosítva a mentés óta · nem mentett előnézet." : "Nem mentett előnézet." : saved ? `Mentett változat · V${saved.currentRevisionNumber}.` : "Nem mentett előnézet."} {feedback}</p>
    {saved && <section aria-label="Korábbi változatok"><h3>Korábbi változatok</h3><div className="project-module-links">{saved.revisions.map((revision) => <button type="button" className={revision.revisionId === viewedId ? "primary-button" : "secondary-button"} key={revision.revisionId} disabled={pending} onClick={() => void openRevision(revision)}>{revision.revisionId === saved.currentRevisionId ? "Legfrissebb változat" : `V${revision.revisionNumber}`} · {new Date(revision.createdAt).toLocaleString("hu-HU")}</button>)}</div></section>}
  </section>;
}
