"use client";

import dynamic from "next/dynamic";
import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { buildGableSurveyPreview } from "@/features/field-surveys/gable-survey-preview";
import { geometryFromSurveyMeasurements } from "@/domain/field-surveys/roof-geometry";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { fieldSurveyUnitLabels } from "@/domain/field-surveys/contracts";
import { completeSectionMeasurements, type SurveySection } from "@/domain/field-surveys/workspace";
import type { ExecutionLinkedSurvey, ExecutionLinkedSurveysResult } from "./execution-data";

const TechnicalDrawing = dynamic(() => import("@/features/roof-models/technical-drawing").then((module) => module.TechnicalDrawing), {
  ssr: false,
  loading: () => <p className="missing-data">A műszaki rajz betöltése…</p>,
});

export function ExecutionLinkedSurveys({ result }: Readonly<{ organizationId: string; result: ExecutionLinkedSurveysResult }>) {
  const router = useRouter();
  // M5: surveys can no longer be created, so an empty list is not offered as a next step; errors stay visible.
  if (result.status === "loaded" && result.items.length === 0) return null;
  const available = result.status === "loaded" ? result.items.filter((item): item is Extract<ExecutionLinkedSurvey, { status: "available" }> => item.status === "available") : [];
  const unavailable = result.status === "loaded" ? result.items.filter((item): item is Extract<ExecutionLinkedSurvey, { status: "unavailable" }> => item.status === "unavailable") : [];
  const summary = result.status === "loaded"
    ? `Csatolt felmérések · ${result.items.length}${unavailable.length ? ` · ${unavailable.length} ellenőrzést igényel` : ""}`
    : `Csatolt felmérések · ${result.status === "access_denied" ? "nincs hozzáférés" : "nem tölthető be"}`;
  return <GlassDisclosure className="execution-linked-surveys" summary={summary}>
    {result.status === "access_denied" && <p className="missing-data" role="alert">Nincs hozzáférés a munkanaplóhoz kapcsolt felmérésekhez. A munkanapló többi adata külön is elérhető.</p>}
    {result.status === "unavailable" && <p className="missing-data" role="alert">A kapcsolt felmérések átmenetileg nem tölthetők be. Próbáld újra az oldal frissítésével. <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button></p>}
    {result.status === "loaded" && available.length > 0 && <div className="execution-linked-survey-list">{available.map((survey) => <LinkedSurveyCard key={survey.id} survey={survey} />)}</div>}
    {result.status === "loaded" && unavailable.map((item) => <p className="missing-data" role="alert" key={item.linkId}>{item.reason === "invalid_snapshot" ? "Egy kapcsolt felmérés mentett változata hibás vagy nem támogatott; a többi felmérés adatai elérhetők." : "Egy kapcsolt felmérés pontos forrásváltozata nem érhető el; másik változattal nem helyettesítettük."}</p>)}
  </GlassDisclosure>;
}

function LinkedSurveyCard({ survey }: Readonly<{ survey: Extract<ExecutionLinkedSurvey, { status: "available" }> }>) {
  const [open, setOpen] = useState(false);
  const title = survey.sections.find((section) => section.name)?.name ?? "Felmérés";
  return <article className="execution-linked-survey">
    <header><div><h3>{title}</h3><p>Felmérés V{survey.surveyVersion} · forrásrevízió: {survey.revisionId}{survey.currentVersion !== survey.surveyVersion ? ` · jelenlegi változat: V${survey.currentVersion}; ez a terv a korábbi forrást őrzi` : " · aktuális forrás"}</p></div></header>
    <details className="execution-linked-survey-data" onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => setOpen(event.currentTarget.open)}>
      <summary>Mérések, rajz és felmérési fotók</summary>
      {survey.sections.map((section) => <SurveySectionSummary key={section.id} section={section} open={open} />)}
      {survey.notes && <p className="execution-linked-survey-note">{survey.notes}</p>}
      {survey.photos.length > 0 && <div className="execution-linked-survey-photos">{survey.photos.map((photo) => <figure key={photo.id}>{photo.signedUrl ? <img src={photo.signedUrl} alt={photo.description || photo.displayFilename} loading="lazy" /> : <div className="missing-data">A fotó nem érhető el.</div>}<figcaption>{photo.description || photo.displayFilename}</figcaption></figure>)}</div>}
    </details>
  </article>;
}

function SurveySectionSummary({ section, open }: Readonly<{ section: SurveySection; open: boolean }>) {
  const gablePreview = section.workType === "roof" && section.roofType === "gable"
    ? buildGableSurveyPreview(section.measurements.map((measurement) => ({ ...measurement, value: measurement.value === null ? "" : String(measurement.value), semanticType: measurement.semanticType ?? "custom" })))
    : null;
  const geometryInput = section.workType === "roof" && section.roofType && section.roofType !== "gable"
    ? geometryFromSurveyMeasurements(section.roofType, completeSectionMeasurements(section))
    : null;
  const geometry = geometryInput ? calculateRoofGeometry(geometryInput) : null;
  return <section className="execution-linked-survey-section"><h4>{section.name}</h4>
    {section.measurements.length ? <dl>{section.measurements.map((measurement) => <div key={measurement.id}><dt>{measurement.label}</dt><dd>{measurement.value === null ? "Nincs megadva" : `${measurement.value.toLocaleString("hu-HU")} ${fieldSurveyUnitLabels[measurement.unit]}`}</dd></div>)}</dl> : <p>Nincs rögzített mérés.</p>}
    {open && gablePreview?.output && <TechnicalDrawing output={gablePreview.output} isSaved compact />}
    {open && geometry && <TechnicalDrawing geometry={geometry} isSaved compact />}
    {open && section.workType === "roof" && !gablePreview?.output && !geometry && <p className="missing-data">Ehhez a mentett változathoz nem áll rendelkezésre teljes, rajzolható geometriai bemenet.</p>}
    {section.notes && <p>{section.notes}</p>}
  </section>;
}
