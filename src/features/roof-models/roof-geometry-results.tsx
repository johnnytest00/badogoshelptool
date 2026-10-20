import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { summarizeRoofGeometry, type RoofGeometryResult } from "@/domain/calculations/roof-geometry-results";

const number = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 });

function resultText(result: Extract<RoofGeometryResult, { status: "available" }>) {
  return `${number.format(result.value)} ${result.unit}`;
}

function Metric({ result }: Readonly<{ result: Extract<RoofGeometryResult, { status: "available" }>; }>) {
  return <div className="roof-result-metric">
    <small>{result.label}</small>
    <strong>{resultText(result)}</strong>
    {result.detail && <small>{result.detail.label}: {number.format(result.detail.value)} {result.detail.unit}</small>}
  </div>;
}

export function RoofGeometryResults({ geometry, heading = "Ellenőrzött eredmények", provenanceLabel = "Kézi bemenetek · számított geometriai eredmények.", compact = false }: Readonly<{ geometry: RoofGeometry; heading?: string; provenanceLabel?: string; compact?: boolean }>) {
  const summary = summarizeRoofGeometry(geometry);
  const [highlight, ...primary] = summary.primary;
  if (!highlight || highlight.status !== "available") return null;

  return <section className={`roof-results roof-geometry-results${compact ? " is-compact" : ""}`} aria-live="polite">
    {compact ? <h2 className="sr-only">{heading}</h2> : <><div className="roof-section-heading"><div><p className="section-eyebrow">Számított geometria</p><h2>{heading}</h2></div></div>
    <p className="roof-results-provenance">{provenanceLabel}</p></>}
    <div className="roof-result-highlight"><span>{highlight.label}{compact && <span className="quick-gable-tag">számított</span>}</span><strong>{resultText(highlight)}</strong><small>Geometriai tetősíkfelület · nem beszerzési mennyiség</small></div>
    <div className="roof-result-grid">{primary.map((result) => result.status === "available" ? <Metric key={result.key} result={result} /> : null)}</div>
    <details className="roof-result-details">
      <summary>Tetősíkok részletes mérései</summary>
      <div className="roof-result-detail-list">{summary.planes.map((plane, index) => <article key={plane.id}>
        <h3>Tetősík {index + 1}</h3>
        {[plane.area, plane.projectedArea, plane.pitch, plane.slopeRun, plane.slopeLength, plane.perimeter].map((result) => result.status === "available"
          ? <p key={result.key}><span>{result.label}</span><strong>{resultText(result)}</strong>{result.detail && <small>{number.format(result.detail.value)} {result.detail.unit}</small>}</p>
          : <p key={result.key}><span>{result.label}</span><strong>{result.reason}</strong></p>)}
      </article>)}</div>
    </details>
    <details className="roof-result-details">
      <summary>Élszakaszok bontása</summary>
      <div className="roof-result-detail-list">
        {summary.edges.map((edge) => edge.status === "available"
          ? <p key={edge.key}><span>{edge.label} · összesen</span><strong>{resultText(edge)}</strong></p>
          : <p key={edge.key}><span>{edge.label}</span><strong>{edge.reason}</strong></p>)}
        {summary.edgeSegments.map((edge, index) => <p key={edge.id}><span>{edge.label} {index + 1} · {edge.adjacentPlaneIds.map((id) => `Tetősík ${summary.planes.findIndex((plane) => plane.id === id) + 1}`).join(" / ")}</span><strong>{number.format(edge.lengthM)} m</strong></p>)}
      </div>
    </details>
    <details className="roof-result-details">
      <summary>Faanyag, lécezés és fedés</summary>
      <p>Szarufa-darabszámhoz kiosztási távolság és eresz-/gerincvégi szabály kell. Faanyag-térfogathoz keresztmetszet is szükséges.</p>
      <p>Léc- és fedőanyag-becsléshez a kiosztás, a termék hasznos fedési mérete és a gyártói átfedés szükséges. Ezek nélkül anyag- és darabszám nem készül.</p>
      <p>A rajz és a geometriai méretek nem statikai vagy gyártási terv.</p>
    </details>
  </section>;
}
