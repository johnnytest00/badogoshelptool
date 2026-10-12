import { AlertTriangle, PanelsTopLeft } from "lucide-react";
import type { CalculationResult } from "@/domain/calculations/engine";
import type { MetalSheetLayoutInput, MetalSheetLayoutOutput } from "@/domain/calculations/metal-sheet-layout";

export type MetalSheetLayoutFormValues = Readonly<{
  effectiveCoveringWidthMm: string;
  nominalSheetWidthMm: string;
  alignment: "left" | "right";
  minimumSheetLengthMm: string;
  maximumSheetLengthMm: string;
  endAllowanceMm: string;
}>;

export const initialMetalSheetLayoutValues: MetalSheetLayoutFormValues = {
  effectiveCoveringWidthMm: "",
  nominalSheetWidthMm: "",
  alignment: "left",
  minimumSheetLengthMm: "",
  maximumSheetLengthMm: "",
  endAllowanceMm: "",
};

function LayoutField({ name, label, value, onChange, optional = true }: Readonly<{ name: keyof MetalSheetLayoutFormValues; label: string; value: string; onChange: (name: keyof MetalSheetLayoutFormValues, value: string) => void; optional?: boolean }>) {
  return <label className="roof-field"><span>{label} <small>{optional ? "opcionális · mm" : "mm"}</small></span><input name={`sheetLayout.${name}`} inputMode="decimal" value={value} onChange={(event) => onChange(name, event.target.value)} /></label>;
}

const numberFormat = new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 });
const millimeters = (value: number) => `${numberFormat.format(value)} mm`;

export function MetalSheetLayoutPanel({ values, calculation, onChange }: Readonly<{
  values: MetalSheetLayoutFormValues;
  calculation: CalculationResult<MetalSheetLayoutInput, MetalSheetLayoutOutput> | null;
  onChange: (name: keyof MetalSheetLayoutFormValues, value: string) => void;
}>) {
  const output = calculation?.ok ? calculation.output : null;
  return <section className="roof-surface sheet-layout-panel" aria-labelledby="sheet-layout-title">
    <div className="roof-section-heading"><div><p className="section-eyebrow">F7.3.1 · ideiglenes előnézet</p><h2 id="sheet-layout-title">Lemezkiosztás</h2></div><span className="unit-note">Felhasználó által megadott paraméterek</span></div>
    <p className="roof-disclaimer">A hasznos és a névleges szélesség nem ugyanaz. A rendszer nem következtet gyártói átfedésre, vágási méretre vagy jóváhagyott szerelési tervre.</p>
    <div className="roof-form-grid sheet-layout-fields">
      <LayoutField name="effectiveCoveringWidthMm" label="Hasznos fedési szélesség" value={values.effectiveCoveringWidthMm} onChange={onChange} optional={false} />
      <LayoutField name="nominalSheetWidthMm" label="Névleges lemezszélesség" value={values.nominalSheetWidthMm} onChange={onChange} />
      <label className="roof-field"><span>Indulási oldal</span><select name="sheetLayout.alignment" value={values.alignment} onChange={(event) => onChange("alignment", event.target.value)}><option value="left">Balról jobbra</option><option value="right">Jobbról balra</option></select></label>
      <LayoutField name="minimumSheetLengthMm" label="Minimális lemezhossz" value={values.minimumSheetLengthMm} onChange={onChange} />
      <LayoutField name="maximumSheetLengthMm" label="Maximális lemezhossz" value={values.maximumSheetLengthMm} onChange={onChange} />
      <LayoutField name="endAllowanceMm" label="Végoldali ráhagyás" value={values.endAllowanceMm} onChange={onChange} />
    </div>
    {!values.effectiveCoveringWidthMm.trim() && <p className="sheet-layout-note"><PanelsTopLeft aria-hidden="true" className="size-4" /> Add meg a hasznos fedési szélességet az élő kiosztási előnézethez.</p>}
    {calculation && !calculation.ok && <div className="sheet-layout-warning" role="alert"><AlertTriangle aria-hidden="true" className="size-4" /><span>{calculation.errors[0]?.message ?? "A lemezkiosztás nem számítható ki."}</span></div>}
    {output && <div className="sheet-layout-results" aria-live="polite">
      <div className="roof-result-grid"><div className="roof-result-metric"><small>Sávok száma tetősíkonként</small><strong>{output.stripsPerPlane}</strong></div><div className="roof-result-metric"><small>Összes fedési sáv</small><strong>{output.totalStripCount}</strong></div><div className="roof-result-metric"><small>Geometriai lemezhossz</small><strong>{millimeters(output.geometricSheetLengthMm)}</strong></div><div className="roof-result-metric"><small>Ideiglenes lemezhossz</small><strong>{millimeters(output.provisionalSheetLengthMm)}</strong></div><div className="roof-result-metric"><small>Részleges szélső sáv</small><strong>{output.partialEdgeIntervalMm === null ? "Nincs" : millimeters(output.partialEdgeIntervalMm)}</strong></div></div>
      <p className="sheet-layout-note"><PanelsTopLeft aria-hidden="true" className="size-4" /> A „Lemezkiosztás” réteg a Felülnézetben kapcsolható be.</p>
      {output.manufacturingStatus === "not_evaluated" && <p className="roof-disclaimer">Gyártási korlát nem lett megadva; a gyárthatóság nincs ellenőrizve.</p>}
      {output.manufacturingStatus === "within_limits" && <p className="form-message is-success">Az ideiglenes lemezhossz a megadott hosszkorlátokon belül van.</p>}
      {output.manufacturingIssues.map((issue) => <p className="sheet-layout-warning" role="status" key={issue.code}><AlertTriangle aria-hidden="true" className="size-4" /> {issue.message}</p>)}
    </div>}
  </section>;
}
