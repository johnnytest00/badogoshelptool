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

export function WorkspaceSummary({ organizationId, surveyId, version, sections, calculations, initialFollowups, projects, originalProjectId, readOnly = false, onPendingChange }: {
  organizationId: string; surveyId: string; version: number; sections: SurveySection[]; calculations: SurveyCalculationLink[]; initialFollowups: SurveyFollowup[];
  projects: readonly { id: string; name: string }[]; originalProjectId: string | null; readOnly?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const [project, setProject] = useState(false);
  const [quotation, setQuotation] = useState(false);
  const [projectId, setProjectId] = useState(originalProjectId ?? initialFollowups.find((row) => row.kind === "project")?.projectId ?? "");
  const [name, setName] = useState(() => sections.map((section) => section.name).join(" · ").slice(0, 200));
  const [followups, setFollowups] = useState(initialFollowups);
  const linkedProjectId = originalProjectId ?? followups.find((row) => row.kind === "project")?.projectId ?? null;
  const effectiveProject = project || Boolean(linkedProjectId);
  const effectiveProjectId = projectId || linkedProjectId;
  const quotationExists = followups.some((row) => row.kind === "quotation" && row.projectId === (effectiveProject ? effectiveProjectId : null));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { onPendingChange?.(pending); }, [pending, onPendingChange]);
  const lock = useRef(false);
  async function create() {
    if (lock.current || (!project && !quotation)) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await createSurveyFollowups({ organizationId, surveyId, version, project: effectiveProject, quotation, projectId: effectiveProjectId, name });
      setFollowups((current) => [...current, ...result.results.filter((row) => !current.some((existing) => existing.id === row.id))]);
      const savedProject = result.results.find((row) => row.kind === "project");
      if (savedProject) setProjectId(savedProject.projectId ?? "");
      if (!result.ok) setError(result.error ?? "A következő lépés nem sikerült; a létrejött eredmények megmaradnak.");
      else { setProject(false); setQuotation(false); }
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
    {!readOnly && <fieldset disabled={pending}><legend>Következő lépés · opcionális</legend>{!linkedProjectId && <label><input type="checkbox" checked={project} onChange={(event) => setProject(event.target.checked)} /> Projekt létrehozása / kapcsolása</label>}{!quotationExists && <label><input type="checkbox" checked={quotation} onChange={(event) => setQuotation(event.target.checked)} /> Árajánlat-piszkozat létrehozása</label>}
      {project && <label className="field-survey-field"><span>Projekt</span><select value={projectId} onChange={(event) => setProjectId(event.target.value)} disabled={Boolean(originalProjectId || followups.some((row) => row.kind === "project"))}><option value="">Új projekt</option>{projects.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}{projectId && !projects.some((option) => option.id === projectId) && <option value={projectId}>Kapcsolt projekt</option>}</select></label>}
      {(project || quotation) && <><label className="field-survey-field"><span>Projekt / piszkozat neve</span><input value={name} maxLength={200} onChange={(event) => setName(event.target.value)} /></label><p>{quotation && !effectiveProject ? "Önálló ajánlatpiszkozat készül." : quotation ? "A kapcsolt projekt ajánlatpiszkozata készül." : "A felmérés történeti projektazonosítója változatlan marad."} Az ajánlat üres piszkozat; a címzettet, tételeket és árakat az ajánlatszerkesztőben adhatod meg.</p><button type="button" className="primary-button" disabled={!name.trim() || pending} onClick={() => void create()}>{pending ? "Létrehozás…" : "Kiválasztott lépések végrehajtása"}</button></>}
      {!project && !quotation && <p>{linkedProjectId && quotationExists ? "A projekt és az ajánlatpiszkozat már létrejött; az alábbi hivatkozásokkal megnyithatók." : "A felmérés mentve marad, bármikor folytatható."}</p>}
    </fieldset>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    {followups.map((row) => <p key={row.id}>{row.kind === "project" ? <Link href={`/projektek/${row.projectId}?organization=${organizationId}`}>Kapcsolt projekt megnyitása · {row.projectId}</Link> : <Link href={row.projectId ? `/projektek/${row.projectId}/ajanlatok?organization=${organizationId}&edit=${row.quotationId}` : `/ajanlatok/${row.quotationId}?organization=${organizationId}`}>Árajánlat megnyitása · {row.quotationId}</Link>}<small> · forrásrevízió: {row.surveyRevisionId}{row.quotationRevisionId ? ` · ajánlatrevízió: ${row.quotationRevisionId}` : ""}</small></p>)}
  </section>;
}
