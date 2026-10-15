"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateGableRoof, gableRoofInputSchema, type GableRoofInput } from "@/domain/calculations/gable-roof";
import { TechnicalDrawing } from "./technical-drawing";
import { GableTrapezoidalCoveringPanel } from "./gable-trapezoidal-covering-panel";
import type { SavedGableCovering } from "./gable-trapezoidal-covering-data";
import type { RoofPrefill, SurveyHandoffSource } from "@/domain/field-surveys/calculator-handoff";

type Draft = Record<string, string> & { inputMode: "height" | "angle" };
const emptyDraft: Draft = {
  inputMode: "height", buildingLengthMm: "", buildingWidthMm: "", roofRiseMm: "", roofPitchDegrees: "",
  eaveOverhangMm: "", frontGableOverhangMm: "", rearGableOverhangMm: "",
};
const parse = (value: string) => value.trim() ? Number(value.trim().replace(",", ".")) : undefined;
const format = (value: number, unit: string) => `${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value)} ${unit}`;
function draftFromInput(input: GableRoofInput): Draft { return { inputMode: input.inputMode, buildingLengthMm: String(input.buildingLengthMm), buildingWidthMm: String(input.buildingWidthMm), roofRiseMm: input.inputMode === "height" ? String(input.roofRiseMm) : "", roofPitchDegrees: input.inputMode === "angle" ? String(input.roofPitchDegrees) : "", eaveOverhangMm: String(input.eaveOverhangMm), frontGableOverhangMm: String(input.frontGableOverhangMm), rearGableOverhangMm: String(input.rearGableOverhangMm) }; }
function draftFromPrefill(input: RoofPrefill): Draft { return { ...input }; }

function toInput(draft: Draft): GableRoofInput | null {
  const parsed = gableRoofInputSchema.safeParse({
    inputMode: draft.inputMode,
    buildingLengthMm: parse(draft.buildingLengthMm), buildingWidthMm: parse(draft.buildingWidthMm),
    eaveOverhangMm: parse(draft.eaveOverhangMm), frontGableOverhangMm: parse(draft.frontGableOverhangMm), rearGableOverhangMm: parse(draft.rearGableOverhangMm),
    roofRiseMm: draft.inputMode === "height" ? parse(draft.roofRiseMm) : undefined,
    roofPitchDegrees: draft.inputMode === "angle" ? parse(draft.roofPitchDegrees) : undefined,
  });
  return parsed.success ? parsed.data : null;
}

export function StandaloneGablePreview({ organizationId, saved = null, initialHandoff, handoffSource, missingHandoffFields = [] }: Readonly<{ organizationId: string; saved?: SavedGableCovering | null; initialHandoff?: RoofPrefill; handoffSource?: SurveyHandoffSource; missingHandoffFields?: readonly string[] }>) {
  const current = saved?.revisions.find((revision) => revision.revisionId === saved.currentRevisionId);
  const source = (current?.input as { source?: { geometryInput?: GableRoofInput } } | undefined)?.source?.geometryInput;
  const [draft, setDraft] = useState(() => source ? draftFromInput(source) : initialHandoff ? draftFromPrefill(initialHandoff) : emptyDraft);
  const handoffBaseline = useRef(initialHandoff ? JSON.stringify(draftFromPrefill(initialHandoff)) : "");
  const handoffModified = Boolean(handoffSource && JSON.stringify(draft) !== handoffBaseline.current);
  const [savedGeometry, setSavedGeometry] = useState<GableRoofInput | null>(source ?? null);
  const [historical, setHistorical] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [coveringDirty, setCoveringDirty] = useState(false);
  const geometryDirty = !historical && (handoffSource ? handoffModified : JSON.stringify(draft) !== JSON.stringify(savedGeometry ? draftFromInput(savedGeometry) : emptyDraft));
  useEffect(() => { const handler = (event: BeforeUnloadEvent) => { if (geometryDirty) { event.preventDefault(); event.returnValue = ""; } }; window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler); }, [geometryDirty]);
  const input = useMemo(() => toInput(draft), [draft]);
  const result = useMemo(() => input ? calculateGableRoof(input) : null, [input]);
  const lastValid = useRef<{ input: GableRoofInput; result: NonNullable<typeof result> } | null>(null);
  if (input && result) lastValid.current = { input, result };
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const fields: { key: keyof Draft; label: string; unit: string }[] = [
    { key: "buildingLengthMm", label: "Épület hossza", unit: "mm" },
    { key: "buildingWidthMm", label: "Épület szélessége", unit: "mm" },
    ...(draft.inputMode === "height" ? [{ key: "roofRiseMm" as const, label: "Tetőemelkedés", unit: "mm" }] : [{ key: "roofPitchDegrees" as const, label: "Tetőhajlás", unit: "°" }]),
    { key: "eaveOverhangMm", label: "Eresztúlnyúlás", unit: "mm" },
    { key: "frontGableOverhangMm", label: "Első oromtúlnyúlás", unit: "mm" },
    { key: "rearGableOverhangMm", label: "Hátsó oromtúlnyúlás", unit: "mm" },
  ];
  return <><Link className="back-navigation" href={`/kalkulatorok?organization=${organizationId}`} onClick={(event) => { if ((geometryDirty || coveringDirty) && !window.confirm("A nem mentett módosítások elvesznek. Továbbmész?")) event.preventDefault(); }}><ArrowLeft aria-hidden="true" className="size-4" /><span>Vissza a kalkulátorokhoz</span></Link><section className="detail-surface" aria-labelledby="standalone-gable-title">
    <header className="section-heading"><div><p className="section-eyebrow">Tetők és tetőfedés · projekt nélküli számítás</p><h1 id="standalone-gable-title">Nyeregtető geometria</h1><p>A meglévő `roof.gable` motor számítja az eredményeket. A fedési eredmény külön menthető; anyagkimutatás és statikai méretezés nem készül.</p></div></header>
    {handoffSource && <div className={`survey-handoff-banner ${handoffModified ? "is-modified" : ""}`} role="status"><strong>{handoffModified ? "A kalkuláció módosított adatokat tartalmaz" : "Adatok átvéve a felmérésből"}</strong><small>Felmérés: {handoffSource.surveyId} · V{handoffSource.version} · revízió: {handoffSource.revisionId}. A forrás változatlan marad.</small>{missingHandoffFields.length > 0 && <span>Ehhez a számításhoz még add meg: {missingHandoffFields.join(", ")}.</span>}</div>}
    <form className="roof-form" onSubmit={(event) => event.preventDefault()}>
      <label className="roof-field"><span>Bemenet módja</span><select value={draft.inputMode} disabled={historical || savePending} onChange={(event) => { const inputMode = event.target.value as Draft["inputMode"]; setDraft((current) => ({ ...current, inputMode, roofRiseMm: "", roofPitchDegrees: "" })); }}><option value="height">Tetőemelkedés</option><option value="angle">Tetőhajlás</option></select></label>
      {fields.map((field) => <label className="roof-field" key={field.key}><span>{field.label} <small>{field.unit}</small></span><input inputMode="decimal" value={draft[field.key]} disabled={historical || savePending} onChange={(event) => set(field.key, event.target.value)} /></label>)}
    </form>
    {result ? <><section className="roof-results" aria-live="polite"><div className="roof-result-grid">
      <div className="roof-result-metric"><small>Teljes tetőfelület</small><strong>{format(result.areas.combinedRoofM2, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Vízszintes vetület</small><strong>{format(result.areas.horizontalProjectedM2, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Egy tetősík felülete</small><strong>{format(result.areas.individualRoofPlaneM2, "m²")}</strong></div>
      <div className="roof-result-metric"><small>Tetőhajlásszög</small><strong>{format(result.angles.pitchDegrees, "°")}</strong></div>
      <div className="roof-result-metric"><small>Ferde hossz a falig</small><strong>{format(result.lengths.slopeLengthToWallMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Ferde hossz túlnyúlással</small><strong>{format(result.lengths.slopeLengthIncludingEaveMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Gerincvonal</small><strong>{format(result.lengths.ridgeLineMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Két ereszél összesen</small><strong>{format(result.lengths.totalEaveEdgesMm / 1000, "m")}</strong></div>
      <div className="roof-result-metric"><small>Ferde oromélek összesen</small><strong>{format(result.lengths.totalSlopingGableEdgesMm / 1000, "m")}</strong></div>
    </div></section></>
      : <p className="missing-data">Add meg az összes méretet egész milliméterben, vagy válassz érvényes tetőhajlást a geometriai előnézethez.</p>}
    {lastValid.current && <div hidden={!result}><GableTrapezoidalCoveringPanel mode="standalone" organizationId={organizationId} saved={saved} geometryInput={result && input ? input : lastValid.current.input} onLoadGeometry={(value) => setDraft(draftFromInput(value))} onRevisionModeChange={setHistorical} onSavePendingChange={setSavePending} onSaveComplete={setSavedGeometry} onDirtyChange={setCoveringDirty} geometry={result ?? lastValid.current.result} sourceLabel="Kézi tetőméretek · projekt nélküli előnézet" /></div>}
    {result && <TechnicalDrawing output={result} isSaved={false} />}
    <p className="roof-disclaimer">A ferde hossz geometriai érték; nem igazolt szarufavágási méret. A felület és hosszak nem jelentenek fedőanyag-, léc-, fólia- vagy szerkezeti mennyiséget.</p>
  </section></>;
}
