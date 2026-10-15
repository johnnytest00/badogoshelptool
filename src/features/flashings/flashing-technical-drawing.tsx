import { buildFlashingDrawingModel } from "@/domain/calculations/flashing-material-integration";
import type { FlashingMaterialInput, FlashingMaterialOutput } from "@/domain/calculations/flashing-material";

const labels = { verge: "Oromszegély", wall: "Falszegély", eaves: "Ereszszegély", ridge: "Gerincszegély", hip: "Kontyszegély", valley: "Vápalemez", custom: "Egyedi szegélyprofil" } as const;
const mm = (value: number) => `${value.toLocaleString("hu-HU")} mm`;

export function FlashingTechnicalDrawing({ input, output, sourceRevisionId }: Readonly<{ input: FlashingMaterialInput; output: FlashingMaterialOutput; sourceRevisionId: string }>) {
  const model = buildFlashingDrawingModel(input, output, sourceRevisionId);
  const sourceLabel = sourceRevisionId === "Nem mentett előnézet" ? "nem mentett előnézet" : "mentett számítási változat";
  const connectionLabels: Record<string, string> = { unknown: "nincs megadva", explicit_overlap: "megadott átfedés", effective_length_supplied: "megadott hasznos fedés", no_overlap_confirmed: "átfedés nélküliként megadva" };
  return <div className="flashing-drawing" aria-label="Szegélyanyag műszaki áttekintés">
    <div className="flashing-drawing-scroll" role="region" aria-label="Szegélyrajz, vízszintesen görgethető" tabIndex={0}>
      <svg viewBox={`0 0 ${model.width} ${model.height}`} role="img" aria-labelledby="flashing-drawing-title flashing-drawing-desc">
        <title id="flashing-drawing-title">Szegélyszakaszok méretezett sémája</title>
        <desc id="flashing-drawing-desc">A {sourceLabel} alapján készült, méretarányos lineáris becslési séma. Nem mutat tetőtopológiát, profilmetszetet vagy szerelési kapcsolatot. Kapcsolati adatok: {connectionLabels[model.connectionMode] ?? "nincs megadva"}.</desc>
        <text x="24" y="32" className="flashing-svg-title">Műszaki áttekintés · séma</text>
        <text x="24" y="56" className="flashing-svg-note">Forrás: {sourceLabel} · névleges szál: {mm(model.nominalLengthMm)} · kapcsolat: {connectionLabels[model.connectionMode] ?? "nincs megadva"}</text>
        {model.rows.map((row) => {
          const requiredEnd = model.xOrigin + row.requiredMm * model.scale;
          const targetEnd = model.xOrigin + row.targetMm * model.scale;
          return <g key={row.id}>
            <text x="24" y={row.y - 28} className="flashing-svg-label">{row.name} · {labels[row.category]}</text>
            <text x="24" y={row.y - 8} className="flashing-svg-note">{row.sectionCount === null ? "Darabszám: nem számítható" : `Előzetes szálbecslés: ${row.sectionCount} db`}</text>
            {row.overlapBands.map((band, index) => <rect key={`overlap-${index}`} x={model.xOrigin + band.startMm * model.scale} y={row.y - 12} width={Math.max(1, (band.endMm - band.startMm) * model.scale)} height="24" className="flashing-svg-overlap" />)}
            <line x1={model.xOrigin} y1={row.y} x2={requiredEnd} y2={row.y} className="flashing-svg-required" />
            {row.targetMm > row.requiredMm && <line x1={requiredEnd} y1={row.y} x2={targetEnd} y2={row.y} className="flashing-svg-reserve" />}
            {row.boundaryMm.map((boundary, index) => <line key={`boundary-${index}`} x1={model.xOrigin + boundary * model.scale} y1={row.y - 20} x2={model.xOrigin + boundary * model.scale} y2={row.y + 20} className="flashing-svg-boundary" />)}
            <line x1={model.xOrigin} y1={row.y + 28} x2={targetEnd} y2={row.y + 28} className="flashing-svg-dimension" />
            <line x1={model.xOrigin} y1={row.y + 23} x2={model.xOrigin} y2={row.y + 33} className="flashing-svg-tick" />
            <line x1={targetEnd} y1={row.y + 23} x2={targetEnd} y2={row.y + 33} className="flashing-svg-tick" />
            <text x={model.xOrigin} y={row.y + 49} className="flashing-svg-measure">Mért {mm(row.lengthMm)} · kezdő +{mm(row.startExtensionMm)} · záró +{mm(row.endExtensionMm)}</text>
            <text x={model.xOrigin} y={row.y + 68} className="flashing-svg-measure">Szükséges fedés {mm(row.requiredMm)} · tartalék +{mm(row.reserveMm)} · cél {mm(row.targetMm)}</text>
            {row.sectionCount !== null ? <text x={model.xOrigin} y={row.y + 87} className="flashing-svg-note">Névleges összhossz: {row.sectionCount} × {mm(row.nominalLengthMm)} = {mm(row.sectionCount * row.nominalLengthMm)}{row.overlapMm !== null ? ` · megadott átfedés: ${mm(row.overlapMm)}` : row.effectiveAdvanceMm !== null ? ` · további szál hasznos fedése: ${mm(row.effectiveAdvanceMm)} (nem fizikai toldásrajz)` : " · átfedés nélküli modell"}</text> : <text x={model.xOrigin} y={row.y + 87} className="flashing-svg-note">A kapcsolati szabály ismeretlen; szálhatár nem lett becsülve.</text>}
            {row.source && <text x={model.xOrigin} y={row.y + 106} className="flashing-svg-provenance">Tetőgeometriából átvett szakasz · mentett forrásváltozat</text>}
          </g>;
        })}
        {model.manualComponents.map((component, index) => <text key={component.id} x="24" y={100 + model.rows.length * 142 + index * 24} className="flashing-svg-note">Kézi tétel · {component.name} · {labels[component.category]} · {component.quantity} db · {component.source.label}</text>)}
        <g transform={`translate(24 ${model.height - 35})`}>
          <line x1="0" y1="0" x2="34" y2="0" className="flashing-svg-required" /><text x="42" y="4" className="flashing-svg-legend">Szükséges fedés</text>
          <line x1="170" y1="0" x2="204" y2="0" className="flashing-svg-reserve" /><text x="212" y="4" className="flashing-svg-legend">Tartalék</text>
          <line x1="305" y1="-9" x2="305" y2="9" className="flashing-svg-boundary" /><text x="314" y="4" className="flashing-svg-legend">Szálhatár</text>
          {model.connectionMode === "explicit_overlap" && <><rect x="410" y="-7" width="24" height="14" className="flashing-svg-overlap" /><text x="442" y="4" className="flashing-svg-legend">Explicit átfedés</text></>}
        </g>
      </svg>
    </div>
    <p className="detail-description">A széles séma vízszintesen görgethető; külön nagyítás vagy mozgatás nem érhető el. Lineáris séma, nem tetőrajz, profilmetszet, vágásterv vagy szerelési jóváhagyás. A terméknév és a kategória nem bizonyít profil- vagy gyártói kompatibilitást.</p>
  </div>;
}
