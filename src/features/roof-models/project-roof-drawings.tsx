import Link from "next/link";
import type { RoofModelRecord } from "./roof-model-data";
import { TechnicalDrawing } from "./technical-drawing";

export type ProjectRoofDrawing = Readonly<{
  id: string;
  name: string;
  revisionNumber: number;
  output: NonNullable<RoofModelRecord["currentOutput"]>;
}>;

export function selectProjectRoofDrawings(models: readonly RoofModelRecord[]): ProjectRoofDrawing[] {
  return models.flatMap((model) => model.roofType === "gable" && model.currentRevisionId && model.currentRevisionNumber > 0 && model.currentOutput
    ? [{ id: model.id, name: model.name, revisionNumber: model.currentRevisionNumber, output: model.currentOutput }]
    : []);
}

export function ProjectRoofDrawings({ models, projectId, organizationId }: Readonly<{ models: readonly RoofModelRecord[]; projectId: string; organizationId: string }>) {
  const drawings = selectProjectRoofDrawings(models);
  if (!drawings.length) return null;
  return <section className="detail-surface project-roof-drawings" aria-labelledby="project-roof-drawings-title">
    <div className="roof-list-heading"><div><p className="section-eyebrow">Műszaki nézetek</p><h2 id="project-roof-drawings-title">Tetőrajzok</h2></div></div>
    <div className="project-roof-drawing-list">{drawings.map((model) => <article className="project-roof-drawing" key={model.id}>
      <div className="project-roof-drawing-heading"><div><h3>{model.name}</h3><p>Nyeregtető · {model.revisionNumber}. mentett revízió</p></div><Link className="secondary-button" href={`/projektek/${projectId}/tetomodellek/${model.id}?organization=${organizationId}`}>Részletes modell megnyitása</Link></div>
      <TechnicalDrawing output={model.output} isSaved headingId={`project-roof-drawing-${model.id}`} heading={`${model.name} · V${model.revisionNumber} rajzai`} />
    </article>)}</div>
  </section>;
}
