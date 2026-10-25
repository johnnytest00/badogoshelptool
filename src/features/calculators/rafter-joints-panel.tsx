import type { RafterJointDrawing, RafterJoints } from "@/domain/calculations/construction/rafter-joints";

const CLASS_LABEL = { A: "A · meglévő adatból", B: "B · megadott adatból" } as const;
const STATUS_LABEL = { computed: null, incomplete: "További adat szükséges", invalid: "Nem számítható" } as const;
const format = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);

/** Section view of the notched rafter; the same outline points produce the table values. */
function JointDrawing({ drawing }: Readonly<{ drawing: RafterJointDrawing }>) {
  const xs = drawing.outline.map((point) => point.xMm), ys = drawing.outline.map((point) => point.yMm);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = Math.max(maxX - minX, maxY - minY) * 0.04;
  const point = (p: { xMm: number; yMm: number }) => `${p.xMm},${maxY - p.yMm}`;
  return <svg className="construction-drawing-svg" viewBox={`${minX - pad} ${-pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`} role="img" aria-label="Szarufa csomópontjai metszetben">
    <title>Szarufa csomópontjai metszetben</title>
    <polygon points={drawing.outline.map(point).join(" ")} fill="none" stroke="currentColor" strokeWidth={3} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    {drawing.supports.map((support) => <line key={support.id} x1={support.face.xMm - pad} y1={maxY - support.face.yMm} x2={support.seatEnd.xMm + pad} y2={maxY - support.face.yMm} stroke="currentColor" strokeDasharray={`${pad / 2} ${pad / 3}`} strokeWidth={2} vectorEffect="non-scaling-stroke"><title>{support.label} felső síkja</title></line>)}
  </svg>;
}

export function RafterJointsPanel({ joints }: Readonly<{ joints: RafterJoints }>) {
  return <section className="construction-suite-results construction-suite-material-summary" aria-live="polite">
    <h3>Csomópontok</h3>
    <p className="construction-suite-advisory">Felső él szerinti mérés; a madárszáj magassága a hajlást is módosítja. Geometriai adatok, nem statikai jóváhagyás.</p>
    {joints.drawing && <figure className="construction-calculator-drawing"><JointDrawing drawing={joints.drawing} /><figcaption>Szarufa metszete a bevágásokkal · szaggatott: a támaszok felső síkja</figcaption></figure>}
    {joints.joints.map((joint) => <div className="material-takeoff-part" key={joint.id} data-status={joint.status === "computed" ? "VALID" : "INCOMPLETE"}>
      <h4>{joint.title}{STATUS_LABEL[joint.status] && <small>{STATUS_LABEL[joint.status]}</small>}</h4>
      {joint.reason && <p className="material-takeoff-incomplete is-invalid" role="alert">{joint.reason}</p>}
      {joint.values.length > 0 && <dl>{joint.values.map((item) => <div key={item.label}><dt>{item.label} <small>{CLASS_LABEL[item.classification]}</small></dt><dd>{format(item.value)} <span>{item.unit}</span></dd></div>)}</dl>}
      {joint.missing.length > 0 && <p className="material-takeoff-incomplete" role="status"><strong>C · hiányzó adat:</strong> {joint.missing.join(", ")}</p>}
      <ul className="construction-suite-limit">{joint.professional.map((item) => <li key={item}>D · szakemberi döntés: {item}</li>)}</ul>
    </div>)}
  </section>;
}
