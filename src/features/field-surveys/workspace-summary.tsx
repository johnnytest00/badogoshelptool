"use client";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useEffect, useRef, useState } from "react";
import { fieldSurveyUnitLabels } from "@/domain/field-surveys/contracts";
import { completeSectionMeasurements, savedQuantitySummary, type SurveySection, type SurveyCalculationLink, type SurveyFollowup } from "@/domain/field-surveys/workspace";
import { geometryFromSurveyMeasurements } from "@/domain/field-surveys/roof-geometry";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { calculateRoofTimberLayout, roofTimberInputFromParameters, type RoofTimberFamilyResult, type RoofTimberParameters } from "@/domain/calculations/roof-timber-layout";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { TechnicalDrawing } from "@/features/roof-models/technical-drawing";
import { buildGableSurveyPreview } from "./gable-survey-preview";
import { createSurveyFollowups } from "./workspace-actions";

export function WorkspaceSummary({ organizationId, surveyId, version, sections, calculations, initialFollowups, originalProjectId, readOnly = false, onPendingChange }: {
  organizationId: string; surveyId: string; version: number; sections: SurveySection[]; calculations: SurveyCalculationLink[]; initialFollowups: SurveyFollowup[];
  originalProjectId: string | null; projects?: readonly { id: string; name: string }[]; readOnly?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const [quotation, setQuotation] = useState(false);
  const [name, setName] = useState(() => sections.map((section) => section.name).join(" · ").slice(0, 200));
  const [followups, setFollowups] = useState(initialFollowups);
  const linkedProjectId = originalProjectId ?? followups.find((row) => row.kind === "project")?.projectId ?? null;
  const quotationExists = followups.some((row) => row.kind === "quotation" && row.projectId === linkedProjectId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  const lock = useRef(false);
  async function create() {
    if (lock.current || !quotation) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await createSurveyFollowups({ organizationId, surveyId, version, project: false, quotation, projectId: linkedProjectId, name });
      setFollowups((current) => [...current, ...result.results.filter((row) => !current.some((existing) => existing.id === row.id))]);
      if (!result.ok) setError(result.error ?? "A következő lépés nem sikerült; a létrejött eredmények megmaradnak.");
      else setQuotation(false);
    } catch { setError("A válasz bizonytalan. Azonos választással biztonságosan újrapróbálhatod."); }
    finally { setPending(false); lock.current = false; }
  }
  return <section className="field-survey-history survey-workspace-summary" aria-label="Felmérés összesítése"><h2>Felmérés összesítése · V{version}</h2><p>A felmérés tovább szerkeszthető. A korábban kapcsolt számítások forrásrevíziója itt ellenőrizhető.</p>
    {sections.map((section) => {
      const links = calculations.filter((link) => link.sectionId === section.id && link.surveyVersion <= version);
      const unselectedRoof = section.workType === "roof" && !section.roofType;
      return <article key={section.id}><h3>{section.name}</h3><p>{section.measurements.length ? `${section.measurements.filter((measurement) => measurement.value !== null).length} kitöltött, ${section.measurements.filter((measurement) => measurement.value === null).length} hiányzó mérés` : "Hiányzik: mérés"} · {section.photoIds.length} kapcsolt fotó · {links.length} korábban kapcsolt számítás</p>{unselectedRoof && <p>A felmérés menthető tetőforma nélkül. A geometriai előnézethez válassz tetőformát a szerkesztésnél.</p>}{readOnly && <HistoricalSurveyRoofGeometry section={section} />}<dl>{section.measurements.map((measurement) => <div key={measurement.id}><dt>{measurement.label}</dt><dd>{(measurement.value === null ? "Hiányzik" : measurement.value.toLocaleString("hu-HU"))} {fieldSurveyUnitLabels[measurement.unit]}</dd></div>)}</dl>{section.notes && <p>{section.notes}</p>}
      {links.map((link) => {
        return <div className="survey-saved-calculation" key={link.id}><strong>{link.name} · V{link.revisionNumber}</strong><p>Forrásfelmérés: V{link.surveyVersion}{link.surveyVersion !== version ? " · korábbi forrás, nincs automatikus újraszámítás" : ""}</p>{savedQuantitySummary(link.calculatorType, link.output).map((quantity) => <p key={quantity.label}>{quantity.label}: {quantity.value.toLocaleString("hu-HU")} {quantity.unit}</p>)}<details><summary>Forrásazonosítók</summary><p>Számítás: {link.calculationId} · revízió: {link.revisionId} · felmérésrevízió: {link.surveyRevisionId}</p></details>{Array.isArray(link.warnings) && link.warnings.length > 0 && <p>Forrásfigyelmeztetések: {link.warnings.map((warning) => typeof warning === "string" ? warning : JSON.stringify(warning)).join("; ")}</p>}</div>;
      })}
      </article>;
    })}
    {calculations.some((link) => !sections.some((section) => section.id === link.sectionId)) && <p>Eltávolított munkaszakaszhoz is tartozik mentett számítás; a kapcsolat a korábbi forrásváltozatban megmaradt.</p>}
    <p>Helyszíni, felhasználói adatok; a forrás nem szakmai vagy gyártói jóváhagyás. Eltérő egységeket nem összesítünk. Ár, áfa és beszerzési jóváhagyás nem készül.</p>
    {!readOnly && <fieldset disabled={pending}><legend>Következő lépés · opcionális</legend>{!quotationExists && <label><input type="checkbox" checked={quotation} onChange={(event) => setQuotation(event.target.checked)} /> Árajánlat-piszkozat létrehozása</label>}
      {quotation && <><label className="field-survey-field"><span>Árajánlat neve</span><input value={name} maxLength={200} onChange={(event) => setName(event.target.value)} /></label><p>{linkedProjectId ? "A régi projektkapcsolat megmarad; az ajánlat üres piszkozatként készül." : "Önálló, üres ajánlatpiszkozat készül. A címzettet, tételeket és árakat az ajánlatszerkesztőben adhatod meg."} Ár és hivatalos kiállítás nem készül.</p><button type="button" className="primary-button" disabled={!name.trim() || pending} onClick={() => void create()}>{pending ? "Létrehozás…" : "Ajánlatpiszkozat létrehozása"}</button></>}
      {!quotation && <p>{linkedProjectId && quotationExists ? "Az ajánlatpiszkozat már létrejött; a kapcsolódó rekordok alább érhetők el." : "A felmérés önállóan mentett marad, bármikor folytatható."}</p>}
    </fieldset>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {followups.map((row) => <p key={row.id}>{row.kind === "project" ? <Link href={`/projektek/${row.projectId}?organization=${organizationId}`}>Régi projekthez kapcsolt adatok megnyitása</Link> : <Link href={row.projectId ? `/projektek/${row.projectId}/ajanlatok?organization=${organizationId}&edit=${row.quotationId}` : `/ajanlatok/${row.quotationId}?organization=${organizationId}`}>Árajánlatpiszkozat megnyitása</Link>}<small> · forrásrevízió: {row.surveyRevisionId}{row.quotationRevisionId ? ` · ajánlatrevízió: ${row.quotationRevisionId}` : ""}</small></p>)}
    <div className="survey-material-list-handoff"><Link className="primary-button" href={`/anyaglistak/uj?organization=${organizationId}&surveyId=${surveyId}&surveyVersion=${version}`}>Anyaglista készítése</Link><p>A felmérés-revízióból csak biztonságosan átvehető mért vagy ellenőrzött mennyiségek kerülnek javaslatként a szerkeszthető listába.</p></div>
  </section>;
}

function HistoricalSurveyRoofGeometry({ section }: Readonly<{ section: SurveySection }>) {
  if (section.workType !== "roof" || !section.roofType) return null;

  if (section.roofType === "gable") {
    const preview = buildGableSurveyPreview(section.measurements.map((measurement) => ({
      id: measurement.id,
      label: measurement.label,
      value: measurement.value === null ? "" : String(measurement.value),
      unit: measurement.unit,
      semanticType: measurement.semanticType,
    })));
    if (!preview.output) return <p role="status">A tetőforma rajza hiányos vagy hibás mérések miatt nem számítható újra. A mentett mérések változatlanok.</p>;
    const timberInput = section.roofTimberParameters ? roofTimberInputFromParameters(section.roofTimberParameters) : null;
    const timberLayout = preview.geometry && timberInput ? calculateRoofTimberLayout(preview.geometry, timberInput) : null;
    return <section className="roof-results" aria-label="Mentett felmérés tetőgeometriája"><TechnicalDrawing output={preview.output} timberLayout={timberLayout?.status === "available" ? timberLayout : null} compact isSaved /><p>Mentett felmérési mérésekből újraszámított tetőfelület: <strong>{new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(preview.output.areas.combinedRoofM2)} m²</strong> · {preview.output.planes.length} tetősík.</p>{preview.geometry && <HistoricalSurveyTimberLayout section={section} geometry={preview.geometry} />}</section>;
  }

  const input = geometryFromSurveyMeasurements(section.roofType, completeSectionMeasurements(section));
  if (!input) return <p role="status">A tetőforma rajza hiányos vagy hibás mérések miatt nem számítható újra. A mentett mérések változatlanok.</p>;
  const geometry = calculateRoofGeometry(input);
  const timberInput = section.roofTimberParameters ? roofTimberInputFromParameters(section.roofTimberParameters) : null;
  const timberLayout = timberInput ? calculateRoofTimberLayout(geometry, timberInput) : null;
  return <section className="roof-results" aria-label="Mentett felmérés tetőgeometriája"><TechnicalDrawing geometry={geometry} timberLayout={timberLayout?.status === "available" ? timberLayout : null} compact isSaved /><p>Mentett felmérési mérésekből újraszámított tetőfelület: <strong>{new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(geometry.totalAreaMm2 / 1_000_000)} m²</strong> · {geometry.planes.length} tetősík.</p>{section.roofTimberParameters && <HistoricalSurveyTimberLayout section={section} geometry={geometry} />}</section>;
}

const timberParameterLabels: Readonly<Record<keyof RoofTimberParameters, string>> = {
  rafterMaxSpacingMm: "Szarufa legnagyobb osztása", rafterStartInsetMm: "Szarufa kezdő peremsávja", rafterEndInsetMm: "Szarufa záró peremsávja",
  rafterSectionWidthMm: "Szarufa szélessége", rafterSectionHeightMm: "Szarufa magassága", battenMaxSpacingMm: "Léc legnagyobb osztása",
  battenStartInsetMm: "Léc kezdő peremsávja", battenEndInsetMm: "Léc záró peremsávja", battenSectionWidthMm: "Léc szélessége", battenSectionHeightMm: "Léc magassága",
};

function HistoricalSurveyTimberLayout({ section, geometry }: Readonly<{ section: SurveySection; geometry: RoofGeometry }>) {
  const parameters = section.roofTimberParameters;
  if (!parameters) return null;
  const input = roofTimberInputFromParameters(parameters);
  const result = input ? calculateRoofTimberLayout(geometry, input) : null;
  const family = (label: string, value: RoofTimberFamilyResult | null) => value && <p key={label}>{label}: {value.count} geometriai tengely/vonal · {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(value.totalLengthM)} m{value.nominalVolumeM3 === null ? "" : ` · ${new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 4 }).format(value.nominalVolumeM3)} m³`}</p>;
  return <section className="roof-timber-history" aria-label="Mentett faanyag geometriai mennyisége"><h4>Mentett faanyag-paraméterek és újraszámított geometriai mennyiségek</h4><dl>{(Object.keys(timberParameterLabels) as (keyof RoofTimberParameters)[]).filter((key) => parameters[key] !== undefined).map((key) => <div key={key}><dt>{timberParameterLabels[key]}</dt><dd>{parameters[key]} mm</dd></div>)}</dl>
    {!input && <p role="status">A mentett paraméterkészlet részleges; ebből nem állítható elő teljes geometriai mennyiség.</p>}
    {result?.status === "unavailable" && <p role="status">A geometriai mennyiség nem számítható újra: {result.reason}</p>}
    {result?.status === "available" && <><p><strong>Fizikai kiosztás nem igazolt.</strong> {result.physicalLayout.reason}</p>{family("Szarufa geometriai mennyisége", result.rafters)}{family("Léc geometriai mennyisége", result.battens)}</>}
  </section>;
}
