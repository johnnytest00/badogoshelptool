"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import type { RoofModelRecord } from "./roof-model-data";
import { TechnicalDrawing } from "./technical-drawing";

export type ProjectRoofDrawing = Readonly<{
  id: string;
  name: string;
  revisionId: string;
  revisionNumber: number;
  calculationId: string | null;
  calculationRevisionId: string | null;
  output?: NonNullable<RoofModelRecord["currentOutput"]>;
  geometry?: NonNullable<RoofModelRecord["currentMultiRoofOutput"]>;
}>;

const roofTypeLabels: Record<RoofModelRecord["roofType"], string> = {
  gable: "Nyeregtető",
  shed: "Félnyeregtető",
  hip: "Kontytető",
  pyramid: "Sátortető",
  halfHip: "Félkontyos tető",
  lShape: "L alakú tető",
  tShape: "T alakú tető",
  other: "Egyéb tető",
};

export function selectProjectRoofDrawings(models: readonly RoofModelRecord[]): ProjectRoofDrawing[] {
  return models.flatMap((model) => model.currentRevisionId && model.currentRevisionNumber > 0 && (model.roofType === "gable" ? model.currentOutput : model.currentMultiRoofOutput)
    ? [{
      id: model.id,
      name: model.name,
      revisionId: model.currentRevisionId,
      revisionNumber: model.currentRevisionNumber,
      calculationId: model.currentCalculationId,
      calculationRevisionId: model.currentCalculationRevisionId,
      output: model.roofType === "gable" ? model.currentOutput ?? undefined : undefined,
      geometry: model.roofType === "gable" ? undefined : model.currentMultiRoofOutput ?? undefined,
    }]
    : []);
}

export function resolveProjectRoofDrawing(drawings: readonly ProjectRoofDrawing[], selectedId: string | null): ProjectRoofDrawing | null {
  return drawings.find((drawing) => drawing.id === selectedId) ?? drawings[0] ?? null;
}

export function ProjectRoofDrawings({ models, projectId, organizationId }: Readonly<{ models: readonly RoofModelRecord[]; projectId: string; organizationId: string }>) {
  const drawings = selectProjectRoofDrawings(models);
  const [selectedDrawingId, setSelectedDrawingId] = useState(() => drawings[0]?.id ?? null);
  const selectedDrawing = resolveProjectRoofDrawing(drawings, selectedDrawingId);

  return <>
    <section id="tetomodellek" className="detail-surface roof-model-list" aria-labelledby="project-roof-models-title">
      <div className="roof-list-heading"><h2 id="project-roof-models-title">Tetőmodellek</h2><Link className="primary-button" href={`/projektek/${projectId}/tetomodellek/uj?organization=${organizationId}`}>+ Új tetőmodell</Link></div>
      {models.length > 0 ? <div className="roof-model-cards">{models.map((model) => {
        const roofArea = model.currentOutput?.areas.combinedRoofM2 ?? (model.currentMultiRoofOutput ? model.currentMultiRoofOutput.totalAreaMm2 / 1_000_000 : null);
        const drawing = drawings.find((item) => item.id === model.id);
        const selected = selectedDrawing?.id === model.id;
        return <article className={`roof-model-card${selected ? " is-drawing-selected" : ""}`} key={model.id}>
          <button className="roof-model-select" type="button" disabled={!drawing} aria-pressed={drawing ? selected : undefined} aria-label={drawing ? `Rajz megtekintése: ${model.name}, V${drawing.revisionNumber}` : `${model.name}: nincs mentett rajz`} onClick={() => drawing && setSelectedDrawingId(model.id)}>
            <span className="roof-model-type">{roofTypeLabels[model.roofType]}</span><strong>{model.name}</strong>
            <small>{model.currentRevisionNumber ? <>Revízió {model.currentRevisionNumber}{roofArea !== null && <> <span aria-hidden="true">·</span> {roofArea.toLocaleString("hu-HU", { maximumFractionDigits: 3 })} m²</>}</> : "Még nincs mentett revízió"}</small>
            <span className="roof-model-drawing-state">{drawing ? selected ? "A rajz látható" : "Rajz megtekintése" : "Nincs mentett rajz"}</span>
          </button>
          <Link className="secondary-button roof-model-open-link" href={`/projektek/${projectId}/tetomodellek/${model.id}?organization=${organizationId}`}>Teljes modell megnyitása <ArrowUpRight aria-hidden="true" className="size-4" /></Link>
        </article>;
      })}</div> : <p className="detail-description">Ehhez a projekthez még nincs tetőmodell.</p>}
    </section>
    <section id="tetorajzok" className="project-roof-drawings" aria-labelledby="project-roof-drawings-title">
      <div className="roof-list-heading"><h2 id="project-roof-drawings-title">Tetőrajzok</h2></div>
      {selectedDrawing ? <article
        className="project-roof-drawing"
        data-model-id={selectedDrawing.id}
        data-model-revision-id={selectedDrawing.revisionId}
        data-calculation-id={selectedDrawing.calculationId ?? ""}
        data-calculation-revision-id={selectedDrawing.calculationRevisionId ?? ""}
      >
        <p className="project-roof-drawing-source">{selectedDrawing.name} · {selectedDrawing.revisionNumber}. mentett modellrevízió</p>
        <TechnicalDrawing
          key={`${selectedDrawing.id}:${selectedDrawing.revisionId}`}
          output={selectedDrawing.output}
          geometry={selectedDrawing.geometry}
          isSaved
          headingId={`project-roof-drawing-${selectedDrawing.id}`}
          heading="Méretezett rajznézet"
        />
      </article> : <p className="detail-description">A tetőrajz megjelenítéséhez válassz olyan modellt, amelynek van mentett geometriai revíziója.</p>}
    </section>
  </>;
}
