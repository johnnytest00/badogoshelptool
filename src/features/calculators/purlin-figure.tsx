import { GlassDisclosure } from "@/components/ui/glass-disclosure";

/**
 * Derékszelemen (purlin) reference sketch: the same origin as the HAP figure (talpszelemen outer plumb plane x = 0,
 * top plane y = 0, see CRR-01 / hap-figure.tsx), extended with the purlin's own horizontal and vertical measurement.
 * Schematic only (fixed proportions), so it carries no measured value and does not duplicate the live, computed
 * RafterJointDrawing/RoofJointDrawing detail.
 */
export function PurlinFigure() {
  const upper = (x: number) => 85 - .4 * (x - 40), lower = (x: number) => upper(x) + 64.6;
  const seatEndSeat = 40 + (lower(40) - 130) / .4;
  const purlinFaceX = 150, purlinTopY = lower(purlinFaceX) - 16, seatEndPurlin = purlinFaceX + 16 / .4;
  const rafter = [
    [10, upper(10)], [230, upper(230)], [230, lower(230)],
    [seatEndPurlin, purlinTopY], [purlinFaceX, purlinTopY], [purlinFaceX, lower(purlinFaceX)],
    [seatEndSeat, 130], [40, 130], [40, lower(40)], [10, lower(10)],
  ].map(([x, y]) => `${x},${y!.toFixed(1)}`).join(" ");
  return <figure className="purlin-figure">
    <svg viewBox="0 0 240 210" role="img" aria-label="Derékszelemen mérési vázlat: a talpszelemen felső síkjától és külső függővágási síkjától mérve a derékszelemen vízszintes helye és magassága.">
      <rect className="purlin-plate" x={40} y={130} width={60} height={38} />
      <rect className="purlin-plate" x={purlinFaceX} y={purlinTopY} width={45} height={24} />
      <polygon className="rafter-joint-wood" points={rafter} />
      <line className="purlin-upper" x1={10} y1={upper(10)} x2={230} y2={upper(230)} />
      <line className="purlin-reference" x1={100} y1={130} x2={236} y2={130} />
      <line className="purlin-reference" x1={40} y1={58} x2={40} y2={176} />
      <g className="technical-dimension">
        <line x1={122} y1={purlinTopY} x2={122} y2={130} />
        <line className="technical-extension" x1={122} y1={purlinTopY} x2={purlinFaceX} y2={purlinTopY} />
        <path className="technical-dimension-arrow" d={`M122,${purlinTopY} l-3,7 h6 z`} /><path className="technical-dimension-arrow" d="M122,130 l-3,-7 h6 z" />
      </g>
      <text x={116} y={(130 + purlinTopY) / 2} textAnchor="end" dominantBaseline="central">magasság</text>
      <g className="technical-dimension">
        <line className="technical-extension" x1={40} y1={176} x2={40} y2={196} />
        <line className="technical-extension" x1={purlinFaceX} y1={lower(purlinFaceX)} x2={purlinFaceX} y2={196} />
        <line x1={40} y1={196} x2={purlinFaceX} y2={196} />
        <path className="technical-dimension-arrow" d="M40,196 l7,-3 v6 z" /><path className="technical-dimension-arrow" d={`M${purlinFaceX},196 l-7,-3 v6 z`} />
      </g>
      <text x={(40 + purlinFaceX) / 2} y={207} textAnchor="middle">vízszintes távolság</text>
      <text x={purlinFaceX + 50} y={purlinTopY + 4} textAnchor="start">derékszelemen</text>
      <text x={150} y={upper(150) - 8} textAnchor="middle">szarufa felső éle</text>
      <text x={236} y={142} textAnchor="end">talpszelemen felső síkja</text>
      <text x={44} y={180} textAnchor="start">külső függővágási sík (x = 0)</text>
    </svg>
    <figcaption>Vázlat, nem méretarányos. Ugyanaz az origó, mint a HAP mérésénél: a talpszelemen felső síkja és külső függővágási síkja.</figcaption>
  </figure>;
}

/** The reference sketch stays one tap away, closed by default — same pattern as HapMeasuringHelp. */
export function PurlinMeasuringHelp() {
  return <GlassDisclosure className="purlin-help" summary="Derékszelemen mérési segédlet"><PurlinFigure /></GlassDisclosure>;
}
