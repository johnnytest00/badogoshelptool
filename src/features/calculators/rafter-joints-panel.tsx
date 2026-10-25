import type { RafterJoints } from "@/domain/calculations/construction/rafter-joints";
import { formatLength, type LengthUnit } from "@/domain/measurements/length-input";

const CLASS_LABEL = { A: "A · meglévő adatból", B: "B · megadott adatból" } as const;
const STATUS_LABEL = { computed: null, incomplete: "További adat szükséges", invalid: "Nem számítható", "not-applicable": "Nem alkalmazható", unsupported: "Nem támogatott" } as const;
export const formatJointValue = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);
/** Drawing lengths: mm keeps the table's 0.1 mm rounding, cm is shown to the nearest mm (0.1 cm), m converts the 0.1 mm value. */
export const formatDrawingLength = (mm: number, unit: LengthUnit) => unit === "mm" ? formatJointValue(mm) : unit === "cm" ? formatJointValue(mm / 10) : formatLength(Math.round(mm * 10) / 10, unit);

/**
 * M9.6: state and professional limits stay open; the full value list (also shown under the detail drawing) is a closed
 * disclosure, so no computed value is lost and the drawing's "Ennyit kell bevágni" figures are not repeated in open cards.
 */
export function RafterJointsPanel({ joints }: Readonly<{ joints: RafterJoints }>) {
  const professional = [...new Set(joints.joints.flatMap((joint) => joint.professional))];
  return <section className="construction-suite-results construction-suite-material-summary rafter-joints-panel" aria-live="polite">
    <h3>Csomópontok · állapot és szakmai korlátok</h3>
    <p className="construction-suite-advisory">Felső él szerinti mérés; a HAP a hajlást is módosítja. Geometriai adatok, nem statikai jóváhagyás.</p>
    <ul className="rafter-joints-status">{joints.joints.map((joint) => <li key={joint.id} data-status={joint.status}>
      <strong>{joint.title}</strong> · {STATUS_LABEL[joint.status] ?? "Számított"}
      {joint.reason && <span className="material-takeoff-incomplete is-invalid" role="alert"> {joint.reason}</span>}
      {joint.missing.length > 0 && <span className="material-takeoff-incomplete" role="status"> C · hiányzó adat: {joint.missing.join(", ")}</span>}
    </li>)}</ul>
    <ul className="construction-suite-limit">{professional.map((item) => <li key={item}>D · szakemberi döntés: {item}</li>)}</ul>
    {joints.joints.some((joint) => joint.values.length > 0) && <details className="rafter-joint-all"><summary>Csomópontok összes értéke</summary>
      {joints.joints.map((joint) => joint.values.length > 0 && <div className="material-takeoff-part" key={joint.id} data-status={joint.status === "computed" ? "VALID" : "INCOMPLETE"}>
        <h4>{joint.title}</h4>
        <dl>{joint.values.map((item) => <div key={item.label}><dt>{item.label} <small>{CLASS_LABEL[item.classification]}</small></dt><dd>{formatJointValue(item.value)} <span>{item.unit}</span></dd></div>)}</dl>
      </div>)}
    </details>}
  </section>;
}
