import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import type { RoofModelRecord } from "./roof-model-data";
import { TechnicalDrawing } from "./technical-drawing";

export type ProjectRoofDrawing = Readonly<{
  id: string;
  name: string;
  revisionNumber: number;
  output?: NonNullable<RoofModelRecord["currentOutput"]>;
  geometry?: NonNullable<RoofModelRecord["currentMultiRoofOutput"]>;
}>;

export function selectProjectRoofDrawings(models: readonly RoofModelRecord[]): ProjectRoofDrawing[] {
  return models.flatMap((model) => model.currentRevisionId && model.currentRevisionNumber > 0 && (model.roofType === "gable" ? model.currentOutput : model.currentMultiRoofOutput)
    ? [{ id: model.id, name: model.name, revisionNumber: model.currentRevisionNumber, output: model.roofType === "gable" ? model.currentOutput ?? undefined : undefined, geometry: model.roofType === "gable" ? undefined : model.currentMultiRoofOutput ?? undefined }]
    : []);
}

export function ProjectRoofDrawings({ models, projectId, organizationId }: Readonly<{ models: readonly RoofModelRecord[]; projectId: string; organizationId: string }>) {
  const drawings = selectProjectRoofDrawings(models);
  if (!drawings.length) return null;
  return <section className="detail-surface project-roof-drawings" aria-labelledby="project-roof-drawings-title">
    <div className="roof-list-heading"><div><h2 id="project-roof-drawings-title">Tetőrajzok</h2></div></div>
    <div className="project-roof-drawing-list">{drawings.map((model) => <article className="project-roof-drawing" key={model.id}>
      <div className="project-roof-drawing-heading"><div><h3>{model.name}</h3><p>Tetőgeometria · {model.revisionNumber}. mentett revízió</p></div><Link className="secondary-button" href={`/projektek/${projectId}/tetomodellek/${model.id}?organization=${organizationId}`}>Részletes modell megnyitása</Link></div>
      <TechnicalDrawing output={model.output} geometry={model.geometry} isSaved headingId={`project-roof-drawing-${model.id}`} heading="Méretezett rajznézet" />
    </article>)}</div>
  </section>;
}
