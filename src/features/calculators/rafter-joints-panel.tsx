import type { RafterJoints } from "@/domain/calculations/construction/rafter-joints";
import { formatLength, type LengthUnit } from "@/domain/measurements/length-input";

const CLASS_LABEL = { A: "A · meglévő adatból", B: "B · megadott adatból" } as const;
const STATUS_LABEL = { computed: null, incomplete: "További adat szükséges", invalid: "Nem számítható" } as const;
export const formatJointValue = (value: number) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 1 }).format(value);
/** Drawing lengths: mm keeps the table's 0.1 mm rounding, cm is shown to the nearest mm (0.1 cm), m converts the 0.1 mm value. */
export const formatDrawingLength = (mm: number, unit: LengthUnit) => unit === "mm" ? formatJointValue(mm) : unit === "cm" ? formatJointValue(mm / 10) : formatLength(Math.round(mm * 10) / 10, unit);

export function RafterJointsPanel({ joints }: Readonly<{ joints: RafterJoints }>) {
  return <section className="construction-suite-results construction-suite-material-summary" aria-live="polite">
    <h3>Csomópontok</h3>
    <p className="construction-suite-advisory">Felső él szerinti mérés; a madárszáj magassága a hajlást is módosítja. Geometriai adatok, nem statikai jóváhagyás.</p>
    {joints.joints.map((joint) => <div className="material-takeoff-part" key={joint.id} data-status={joint.status === "computed" ? "VALID" : "INCOMPLETE"}>
      <h4>{joint.title}{STATUS_LABEL[joint.status] && <small>{STATUS_LABEL[joint.status]}</small>}</h4>
      {joint.reason && <p className="material-takeoff-incomplete is-invalid" role="alert">{joint.reason}</p>}
      {joint.values.length > 0 && <dl>{joint.values.map((item) => <div key={item.label}><dt>{item.label} <small>{CLASS_LABEL[item.classification]}</small></dt><dd>{formatJointValue(item.value)} <span>{item.unit}</span></dd></div>)}</dl>}
      {joint.missing.length > 0 && <p className="material-takeoff-incomplete" role="status"><strong>C · hiányzó adat:</strong> {joint.missing.join(", ")}</p>}
      <ul className="construction-suite-limit">{joint.professional.map((item) => <li key={item}>D · szakemberi döntés: {item}</li>)}</ul>
    </div>)}
  </section>;
}
