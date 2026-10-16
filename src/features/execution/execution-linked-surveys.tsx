"use client";

import dynamic from "next/dynamic";
import { useState, type SyntheticEvent } from "react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { buildGableSurveyPreview } from "@/features/field-surveys/gable-survey-preview";
import { geometryFromSurveyMeasurements } from "@/domain/field-surveys/roof-geometry";
import { calculateRoofGeometry } from "@/domain/calculations/roof-geometry";
import { fieldSurveyUnitLabels } from "@/domain/field-surveys/contracts";
import { completeSectionMeasurements, type SurveySection } from "@/domain/field-surveys/workspace";
import type { ExecutionLinkedSurvey } from "./execution-data";

const TechnicalDrawing = dynamic(() => import("@/features/roof-models/technical-drawing").then((module) => module.TechnicalDrawing), {
  ssr: false,
  loading: () => <p className="missing-data">A műszaki rajz betöltése…</p>,
});

export function ExecutionLinkedSurveys({ organizationId, surveys }: Readonly<{ organizationId: string; surveys: readonly ExecutionLinkedSurvey[] }>) {
  return <GlassDisclosure className="execution-linked-surveys" summary={`Csatolt felmérések · ${surveys.length}`}>
    {surveys.length ? <div className="execution-linked-survey-list">{surveys.map((survey) => <LinkedSurveyCard key={survey.id} organizationId={organizationId} survey={survey} />)}</div> : <p className="missing-data">Ehhez a munkanaplóhoz még nincs felmérés csatolva. Felmérésből a pontos mentett változat csatolható.</p>}
  </GlassDisclosure>;
}

function LinkedSurveyCard({ organizationId, survey }: Readonly<{ organizationId: string; survey: ExecutionLinkedSurvey }>) {
  const [open, setOpen] = useState(false);
  const title = survey.sections.find((section) => section.name)?.name ?? "Felmérés";
  const surveyHref = `/felmeresek/${survey.surveyId}?organization=${organizationId}&version=${survey.surveyVersion}`;
  return <article className="execution-linked-survey">
    <header><div><h3>{title}</h3><p>Felmérés V{survey.surveyVersion} · forrásrevízió: {survey.revisionId}{survey.currentVersion !== survey.surveyVersion ? ` · jelenlegi változat: V${survey.currentVersion}; ez a terv a korábbi forrást őrzi` : " · aktuális forrás"}</p></div><Link className="secondary-button" href={surveyHref}>Teljes felmérés megnyitása</Link></header>
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
