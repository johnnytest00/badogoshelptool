import { GlassDisclosure } from "@/components/ui/glass-disclosure";

/**
 * CRR-01 reference sketch next to the HAP input: plate top plane, the outer plumb plane (x = 0), the rafter's upper edge and
 * the vertical HAP between them. Schematic only (fixed 22° and proportions), so it carries no measured value.
 */
export function HapFigure() {
  // Upper edge y = 85 − 0.4·(x − 40) in sketch px; the plumb depth 64.6 puts the lower edge 19.6 px below the plate top at x = 40.
  const upper = (x: number) => 85 - .4 * (x - 40), lower = (x: number) => upper(x) + 64.6;
  const seatEnd = 40 + (lower(40) - 130) / .4;
  const rafter = [[10, upper(10)], [230, upper(230)], [230, lower(230)], [seatEnd, 130], [40, 130], [40, lower(40)], [10, lower(10)]].map(([x, y]) => `${x},${y!.toFixed(1)}`).join(" ");
  return <figure className="hap-figure">
    <svg viewBox="0 0 240 182" role="img" aria-label="HAP mérési vázlat: a talpszelemen felső síkjától függőlegesen a szarufa felső éléig, a külső függővágási síkban.">
      <rect className="hap-plate" x={40} y={130} width={60} height={38} />
      <polygon className="rafter-joint-wood" points={rafter} />
      <line className="hap-upper" x1={10} y1={upper(10)} x2={230} y2={upper(230)} />
      <line className="hap-reference" x1={100} y1={130} x2={236} y2={130} />
      <line className="hap-reference" x1={40} y1={58} x2={40} y2={176} />
      <g className="technical-dimension">
        <line x1={28} y1={130} x2={28} y2={upper(40)} />
        <line className="technical-extension" x1={28} y1={130} x2={40} y2={130} />
        <line className="technical-extension" x1={28} y1={upper(40)} x2={40} y2={upper(40)} />
        <path className="technical-dimension-arrow" d={`M28,${upper(40)} l-3,7 h6 z`} /><path className="technical-dimension-arrow" d="M28,130 l-3,-7 h6 z" />
      </g>
      <text x={24} y={(130 + upper(40)) / 2} textAnchor="end" dominantBaseline="central">HAP</text>
      <text x={150} y={upper(150) - 8} textAnchor="middle">szarufa felső éle</text>
      <text x={236} y={142} textAnchor="end">talpszelemen felső síkja</text>
      <text x={44} y={180} textAnchor="start">külső függővágási sík (x = 0)</text>
    </svg>
    <figcaption>Vázlat, nem méretarányos. A mérés helye a külső függővágási sík (x = 0).</figcaption>
  </figure>;
}

/** M9.6: the reference sketch stays one tap away, closed by default; the one-line definition stays visible at the input. */
export function HapMeasuringHelp() {
  return <GlassDisclosure className="hap-help" summary="HAP mérési segédlet"><HapFigure /></GlassDisclosure>;
}
