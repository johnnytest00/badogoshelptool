"use client";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useEffect, useRef, useState } from "react";
import { fieldSurveyUnitLabels } from "@/domain/field-surveys/contracts";
import { mapFieldSurveyToCalculator } from "@/domain/field-surveys/calculator-handoff";
import { savedQuantitySummary, completeSectionMeasurements, type SurveySection, type SurveyCalculationLink, type SurveyFollowup } from "@/domain/field-surveys/workspace";
import { createSurveyFollowups } from "./workspace-actions";

const calculatorRoutes: Record<string, string> = {
  "gutters.material-estimate": "ereszcsatorna",
  "sheet_metal.flashings.material-estimate": "szegelyek",
  "roof.gable.trapezoidal-covering": "nyeregteto",
  "roof.gable.metal-tile-covering": "cserepeslemez",
};

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
  return <section className="field-survey-history survey-workspace-summary" aria-label="Felmérés összesítése"><h2>Felmérés összesítése · V{version}</h2><p>A felmérés tovább szerkeszthető. A számítások a saját mentett forrásrevíziójukhoz tartoznak.</p>
    {sections.map((section) => {
      const links = calculations.filter((link) => link.sectionId === section.id && link.surveyVersion <= version);
      const unselectedRoof = section.workType === "roof" && !section.roofType;
      const handoff = unselectedRoof ? null : mapFieldSurveyToCalculator({ surveyId, revisionId: "summary", version, workType: section.workType, measurements: completeSectionMeasurements(section) });
      return <article key={section.id}><h3>{section.name}</h3><p>{section.measurements.length ? `${section.measurements.filter((measurement) => measurement.value !== null).length} kitöltött, ${section.measurements.filter((measurement) => measurement.value === null).length} hiányzó mérés` : "Hiányzik: mérés"} · {section.photoIds.length} kapcsolt fotó · {links.length} mentett számítás</p>{unselectedRoof && <p>A felmérés menthető tetőforma nélkül. Tetőszámításhoz válassz tetőformát a szerkesztésnél.</p>}<dl>{section.measurements.map((measurement) => <div key={measurement.id}><dt>{measurement.label}</dt><dd>{(measurement.value === null ? "Hiányzik" : measurement.value.toLocaleString("hu-HU"))} {fieldSurveyUnitLabels[measurement.unit]}</dd></div>)}</dl>{section.notes && <p>{section.notes}</p>}
      {handoff?.ok ? handoff.missing.length > 0 && <p>A felmérésből hiányzik (a kalkulátorban pótolható): {handoff.missing.join(", ")}</p> : handoff && <p>{handoff.error}</p>}
      {links.map((link) => {
        const projectRoute = linkedProjectId && link.calculatorType === "gutters.material-estimate"
          ? `/projektek/${linkedProjectId}/ereszcsatorna`
          : linkedProjectId && link.calculatorType === "sheet_metal.flashings.material-estimate"
            ? `/projektek/${linkedProjectId}/szegelyek`
            : null;
        const calculationHref = projectRoute
          ? `${projectRoute}?organization=${organizationId}&calculation=${link.calculationId}&revision=${link.revisionId}`
          : `/kalkulatorok/${calculatorRoutes[link.calculatorType]}?organization=${organizationId}&calculation=${link.calculationId}${link.calculatorType === "roof.gable.metal-tile-covering" ? `&revision=${link.revisionNumber}` : ""}`;
        return <div className="survey-saved-calculation" key={link.id}><strong>{link.name} · V{link.revisionNumber}</strong><p>Forrásfelmérés: V{link.surveyVersion}{link.surveyVersion !== version ? " · korábbi forrás, nincs automatikus újraszámítás" : ""}</p>{savedQuantitySummary(link.calculatorType, link.output).map((quantity) => <p key={quantity.label}>{quantity.label}: {quantity.value.toLocaleString("hu-HU")} {quantity.unit}</p>)}{calculatorRoutes[link.calculatorType] && <Link className="secondary-button" href={calculationHref}>Mentett számítás megnyitása</Link>}<details><summary>Forrásazonosítók</summary><p>Számítás: {link.calculationId} · revízió: {link.revisionId} · felmérésrevízió: {link.surveyRevisionId}</p></details>{Array.isArray(link.warnings) && link.warnings.length > 0 && <p>Forrásfigyelmeztetések: {link.warnings.map((warning) => typeof warning === "string" ? warning : JSON.stringify(warning)).join("; ")}</p>}</div>;
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
