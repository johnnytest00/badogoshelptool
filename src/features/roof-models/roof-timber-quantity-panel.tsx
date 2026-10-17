"use client";

import { useMemo, useState } from "react";
import { calculateRoofTimberLayout, roofTimberInputFromParameters, type RoofTimberFamilyResult, type RoofTimberParameters } from "@/domain/calculations/roof-timber-layout";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";

const fields = [
  ["rafterMaxSpacingMm", "Szarufák legnagyobb tengelytávolsága", "mm"], ["rafterStartInsetMm", "Szarufák kezdő peremsávja", "mm"], ["rafterEndInsetMm", "Szarufák záró peremsávja", "mm"],
  ["rafterSectionWidthMm", "Szarufa keresztmetszetének szélessége", "mm"], ["rafterSectionHeightMm", "Szarufa keresztmetszetének magassága", "mm"],
  ["battenMaxSpacingMm", "Lécek legnagyobb sortávolsága", "mm"], ["battenStartInsetMm", "Lécek kezdő peremsávja · eresztől", "mm"], ["battenEndInsetMm", "Lécek záró peremsávja · felső éltől", "mm"],
  ["battenSectionWidthMm", "Léc keresztmetszetének szélessége", "mm"], ["battenSectionHeightMm", "Léc keresztmetszetének magassága", "mm"],
] as const satisfies readonly (readonly [keyof RoofTimberParameters, string, string])[];
const number = (value: number | undefined) => value === undefined ? "" : String(value);
function familyResult(title: string, result: RoofTimberFamilyResult | null) {
  if (!result) return null;
  const spacingText = result.actualSpacingMm === null
    ? `${Math.min(...result.planeLayouts.map((item) => item.actualSpacingMm)).toLocaleString("hu-HU", { maximumFractionDigits: 1 })}–${Math.max(...result.planeLayouts.map((item) => item.actualSpacingMm)).toLocaleString("hu-HU", { maximumFractionDigits: 1 })} mm · síkcsoportonként`
    : `${result.actualSpacingMm.toLocaleString("hu-HU", { maximumFractionDigits: 1 })} mm`;
  return <section className="roof-timber-family-result"><h4>{title}</h4><dl>
    <div><dt>Geometriai tengely / vonal</dt><dd>{result.count} db</dd></div><div><dt>Tényleges geometriai távolság</dt><dd>{spacingText}</dd></div>
    <div><dt>Geometriai összhossz</dt><dd>{(result.totalLengthM).toLocaleString("hu-HU", { maximumFractionDigits: 3 })} m</dd></div>
    {result.sectionAreaMm2 !== null && <div><dt>Névleges keresztmetszeti térfogat</dt><dd>{result.nominalVolumeM3?.toLocaleString("hu-HU", { maximumFractionDigits: 4 })} m³</dd></div>}
  </dl></section>;
}

export function RoofTimberQuantityPanel({ geometry, value: controlledValue, onChange }: Readonly<{ geometry: RoofGeometry; value?: RoofTimberParameters; onChange?: (value: RoofTimberParameters) => void }>) {
  const [localValue, setLocalValue] = useState<RoofTimberParameters>({});
  const value = controlledValue ?? localValue;
  const input = useMemo(() => roofTimberInputFromParameters(value), [value]);
  const result = useMemo(() => input ? calculateRoofTimberLayout(geometry, input) : null, [geometry, input]);
  return <GlassDisclosure className="roof-timber-quantity" summary="Szarufák és lécezés">
    <p className="roof-timber-help">Opcionális geometriai mennyiségek. Add meg a kiosztást és mindkét peremsávot; a megadott távolság felső korlát, a sorok a két perem között egyenletesen oszlanak el. Térfogathoz mindkét keresztmetszeti méret szükséges.</p>
    <div className="roof-timber-input-grid">{fields.map(([key, label, unit]) => <label className="field-survey-field" key={key}><span>{label} <small>{unit}</small></span><input type="number" inputMode="numeric" min={key.includes("Inset") ? "0" : "1"} max="100000" step="1" value={number(value[key])} aria-label={`${label}, ${unit}`} onChange={(event) => {
      const raw = event.target.value;
      const parsed = raw === "" ? undefined : Number(raw);
      if (parsed !== undefined && !Number.isFinite(parsed)) return;
      const next = { ...value, [key]: parsed };
      const clean = Object.fromEntries(Object.entries(next).filter(([, item]) => item !== undefined)) as RoofTimberParameters;
      if (onChange) onChange(clean); else setLocalValue(clean);
    }} /></label>)}</div>
    {result?.status === "unavailable" && <p className="form-message" role="status">A mennyiség nem számítható: {result.reason}</p>}
    {result?.status === "available" && <div className="roof-timber-results" aria-live="polite"><p className="roof-timber-physical-status"><strong>Fizikai kiosztás nem igazolt.</strong> {result.physicalLayout.reason}</p>{familyResult("Szarufák geometriai mennyisége", result.rafters)}{familyResult("Lécek geometriai mennyisége", result.battens)}<ul>{result.assumptions.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    <p className="roof-timber-disclaimer">Igazolt geometriai tengely- és vonalhossz, a megadott egyenletes kiosztási feltételezés mellett. Ez nem fizikai faelem-darabszám vagy statikai terv; nem tartalmaz vágást, toldást, nyílást, veszteséget vagy csomóponti kialakítást.</p>
  </GlassDisclosure>;
}
