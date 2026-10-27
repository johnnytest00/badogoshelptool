import { materialPurchasingUnitLabels, type MaterialPurchasingUnit } from "@/domain/materials/contracts";
import { findPotentialQuotationItemOverlaps, type PotentialOverlapLine } from "./quotation-item-overlaps";
import { quotationPurchasingUnitLabel } from "./quotation-material-state";

export function QuotationItemOverlapWarning({
  lines,
  materialSourceLabel,
  calculationSourceLabel,
}: Readonly<{
  lines: readonly PotentialOverlapLine[];
  materialSourceLabel: string;
  calculationSourceLabel: string;
}>) {
  const groups = findPotentialQuotationItemOverlaps(lines);
  if (groups.length === 0) return null;

  return <section className="glass-bubble quotation-overlap-warning" role="status" aria-live="polite" aria-labelledby="quotation-overlap-title">
    <h3 id="quotation-overlap-title">Lehetséges átfedés az ajánlati tételek között</h3>
    <p>Különböző forrásokból hasonló anyagtételek kerültek az ajánlatba. Ellenőrizd, hogy mindegyikre szükség van-e. A rendszer egyik tételt sem módosította.</p>
    {groups.length > 1 && <details>
      <summary>{groups.length} lehetséges átfedés · Részletek</summary>
      <ul>{groups.map((group) => <OverlapGroup key={group.key} group={group} materialSourceLabel={materialSourceLabel} calculationSourceLabel={calculationSourceLabel} />)}</ul>
    </details>}
    {groups.length === 1 && <ul><OverlapGroup group={groups[0]!} materialSourceLabel={materialSourceLabel} calculationSourceLabel={calculationSourceLabel} /></ul>}
  </section>;
}

function OverlapGroup({
  group,
  materialSourceLabel,
  calculationSourceLabel,
}: Readonly<{
  group: ReturnType<typeof findPotentialQuotationItemOverlaps>[number];
  materialSourceLabel: string;
  calculationSourceLabel: string;
}>) {
  return <li>
    <strong>{group.description}</strong>
    <ul>
      {group.materialLines.map((line) => <OverlapLine key={line.id} line={line} sourceLabel={materialSourceLabel} />)}
      {group.calculationLines.map((line) => <OverlapLine key={line.id} line={line} sourceLabel={calculationSourceLabel} />)}
    </ul>
  </li>;
}

function OverlapLine({ line, sourceLabel }: Readonly<{ line: PotentialOverlapLine; sourceLabel: string }>) {
  const unit = materialPurchasingUnitLabels[line.unit as MaterialPurchasingUnit] ? quotationPurchasingUnitLabel(line.unit) : line.unit;
  return <li><span>{sourceLabel}</span> · {line.quantity.trim() || "—"} {unit}</li>;
}
