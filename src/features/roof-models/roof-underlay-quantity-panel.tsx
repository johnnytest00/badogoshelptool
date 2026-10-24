"use client";

import { useMemo, useState } from "react";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { LengthField } from "@/components/ui/length-field";
import { calculateRoofUnderlayLayout, type RoofUnderlayParameters } from "@/domain/calculations/roof-underlay";
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { formatQuantityValue } from "@/lib/quantity-format";

const fields = [
  ["rollWidthMm", "Tekercs szélessége", "mm"],
  ["rollLengthMm", "Tekercs hossza", "mm"],
  ["sideOverlapMm", "Oldalátfedés", "mm"],
  ["endOverlapMm", "Végtoldás átfedése", "mm"],
] as const satisfies readonly (readonly ["rollWidthMm" | "rollLengthMm" | "sideOverlapMm" | "endOverlapMm", string, string])[];
const number = (value: number | undefined) => value === undefined ? "" : String(value);
const m2 = (areaMm2: number) => formatQuantityValue(areaMm2 / 1_000_000, "m²");
const metres = (lengthMm: number) => formatQuantityValue(lengthMm / 1000, "m");

export function RoofUnderlayQuantityPanel({ geometry, value: controlledValue, onChange }: Readonly<{ geometry: RoofGeometry; value?: RoofUnderlayParameters; onChange?: (value: RoofUnderlayParameters) => void }>) {
  const [localValue, setLocalValue] = useState<RoofUnderlayParameters>({});
  const value = controlledValue ?? localValue;
  const result = useMemo(() => calculateRoofUnderlayLayout(geometry, value), [geometry, value]);
  function update<K extends keyof RoofUnderlayParameters>(key: K, nextValue: RoofUnderlayParameters[K] | undefined) {
    const next = { ...value, [key]: nextValue };
    const clean = Object.fromEntries(Object.entries(next).filter(([, item]) => item !== undefined)) as RoofUnderlayParameters;
    if (onChange) onChange(clean); else setLocalValue(clean);
  }
  return <GlassDisclosure className="roof-timber-quantity roof-underlay-quantity" summary="Tetőfedés és alátétfólia">
    <p className="roof-timber-help">Opcionális fóliacsík-geometria. A tekercs, átfedés és fektetési irány adatait a kiválasztott termék vagy telepítési előírás alapján add meg; hiányzó adatból a rendszer nem következtet.</p>
    <div className="roof-timber-input-grid">{fields.map(([key, label]) => <label className="field-survey-field" key={key}><span>{label}</span><LengthField label={label} maxMm={key === "rollLengthMm" ? 1_000_000 : 100_000} value={number(value[key])} onChange={(raw) => {
      const parsed = raw === "" ? undefined : Number(raw);
      if (parsed !== undefined && !Number.isFinite(parsed)) return;
      update(key, parsed as RoofUnderlayParameters[typeof key] | undefined);
    }} /></label>)}</div>
    <label className="field-survey-field roof-underlay-direction"><span>Fektetés iránya</span><select value={value.installationDirection ?? ""} aria-label="Fektetés iránya" onChange={(event) => update("installationDirection", event.target.value === "" ? undefined : event.target.value as RoofUnderlayParameters["installationDirection"])}><option value="">Válassz irányt</option><option value="eave-to-ridge">Eresztől a gerinc felé</option><option value="ridge-to-eave">Gerinctől az eresz felé</option></select></label>
    <div className="roof-timber-results" aria-live="polite">
      {result.netRoofAreaMm2 !== null && <section className="roof-timber-family-result"><h4>Geometriai fedendő felület</h4><dl><div><dt>Nettó tetőfelület</dt><dd>{m2(result.netRoofAreaMm2)} m²</dd></div></dl></section>}
      {result.courses.length > 0 && <section className="roof-timber-family-result"><h4>Alátétfólia csík-geometria</h4><dl><div><dt>Számított csíkszám</dt><dd>{result.courseCount}</dd></div><div><dt>Csíkok összes vágási hossza</dt><dd>{metres(result.calculatedStripLengthMm ?? 0)} m</dd></div>{result.grossRequiredUnderlayAreaMm2 !== null && <div><dt>Bruttó vágott fóliafelület</dt><dd>{m2(result.grossRequiredUnderlayAreaMm2)} m²</dd></div>}{result.rollCount !== null && <div><dt>Tekercsszám · pontos vágási minimum</dt><dd>{result.rollCount} db</dd></div>}</dl><p className="roof-timber-help">Matematikai vágási minimum teljes szélességű blankokkal; nem ellenőrzött beszerzési darabszám.</p></section>}
      {result.reasons.map((reason) => <p className={result.status === "INVALID" ? "form-message is-error" : "form-message"} role={result.status === "INVALID" || result.status === "UNSUPPORTED" ? "alert" : "status"} key={reason}>{reason}</p>)}
    </div>
    <p className="roof-timber-disclaimer">A nettó felület a tetősíkok geometriája. A bruttó vágott mennyiség teljes szélességű csíkblankokkal számol; a pontos tekercsszám kis méretű, egydimenziós vágási minimum, nem rendelési mennyiség. Szélességi maradék újrahasználata, felhajtások, áttörések, gyártói alkalmasság és kivitelezési terv nincs modellezve.</p>
  </GlassDisclosure>;
}
