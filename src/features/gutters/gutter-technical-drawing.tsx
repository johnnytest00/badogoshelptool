import { buildGutterDrawingModel } from "@/domain/calculations/gutter-material-integration";
import type { GutterMaterialInput, GutterMaterialOutput } from "@/domain/calculations/gutter-material";

export function GutterTechnicalDrawing({ input, output, sourceRevisionId }: Readonly<{ input: GutterMaterialInput; output: GutterMaterialOutput; sourceRevisionId: string | null }>) {
  const model = buildGutterDrawingModel(input, output, sourceRevisionId);
  return <div className="gutter-drawing" aria-label="Ereszcsatorna technikai séma">
    <svg viewBox={`0 0 ${model.width} ${model.height}`} role="img" aria-labelledby="gutter-drawing-title gutter-drawing-desc">
      <title id="gutter-drawing-title">Ereszcsatorna anyagbecslési séma</title>
      <desc id="gutter-drawing-desc">A mentett revízió konfigurált ereszszakaszai és egymástól független lefolyómenetei; nem kivitelezési rajz.</desc>
      <text x="24" y="28" className="gutter-svg-title">Ereszcsatorna · séma</text>
      {model.runs.map((run) => <g key={run.id}>
        <text x="24" y={run.y + 34} className="gutter-svg-label">{run.label}</text>
        <line x1="140" y1={run.y} x2={140 + run.width} y2={run.y} className="gutter-svg-run" />
        {run.sectionBoundaries.map((x) => <line key={x} x1={x} y1={run.y - 16} x2={x} y2={run.y + 16} className="gutter-svg-boundary" />)}
        <line x1="140" y1={run.y - 24} x2={140 + run.width} y2={run.y - 24} className="gutter-svg-dimension" />
        <text x={140 + run.width / 2} y={run.y - 30} textAnchor="middle" className="gutter-svg-measure">{run.lengthMm.toLocaleString("hu-HU")} mm</text>
      </g>)}
      {model.downpipes.map((run) => <g key={run.id}>
        <line x1="140" y1={run.y} x2={140 + run.width} y2={run.y} className="gutter-svg-downpipe" />
        {run.sectionBoundaries.map((x) => <line key={x} x1={x} y1={run.y - 12} x2={x} y2={run.y + 12} className="gutter-svg-boundary" />)}
        <text x={160 + run.width} y={run.y + 5} className="gutter-svg-label">{run.label} · {run.lengthMm.toLocaleString("hu-HU")} mm · {run.stockSections} szál · könyök {run.selectedBends} db</text>
      </g>)}
      <g transform={`translate(24 ${model.height - 48})`}>
        <line x1="0" y1="0" x2="42" y2="0" className="gutter-svg-run" /><text x="50" y="5" className="gutter-svg-legend">Ereszszakasz</text>
        <line x1="180" y1="-7" x2="180" y2="7" className="gutter-svg-boundary" /><text x="190" y="5" className="gutter-svg-legend">Szálhatár</text>
        <line x1="300" y1="0" x2="342" y2="0" className="gutter-svg-downpipe" /><text x="350" y="5" className="gutter-svg-legend">Független lefolyó</text>
      </g>
    </svg>
    <p className="detail-description">Séma, nem hitelesített szerelési rajz. Forrásrevízió: {sourceRevisionId ?? "nincs mentett revízió"}.</p>
  </div>;
}
