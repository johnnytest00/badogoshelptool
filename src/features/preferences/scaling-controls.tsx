"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { scalingRanges, type ScalingKey } from "@/features/preferences/scaling";
import { useScaling } from "@/features/preferences/scaling-provider";

const labels: Record<ScalingKey, string> = { text: "Szövegméret", ui: "Felület mérete", drawing: "Rajz mérete" };

export function ScalingControls({ compact = false }: Readonly<{ compact?: boolean }>) {
  const scaling = useScaling();
  const keys: readonly ScalingKey[] = ["text", "ui", "drawing"];

  return (
    <div className={`scaling-control-list ${compact ? "is-compact" : ""}`}>
      {keys.map((key) => {
        const range = scalingRanges[key];
        const value = scaling[key];
        return (
          <div className="scaling-control-row" key={key}>
            <span className="scaling-control-label">{labels[key]}</span>
            <div className="scaling-stepper">
              <button type="button" className="scaling-step-button" onClick={() => scaling.adjustScale(key, -range.step)} disabled={value <= range.min} aria-label={`${labels[key]} csökkentése`}><Minus aria-hidden="true" className="size-4" /></button>
              <output className="scaling-value" aria-label={`${labels[key]} értéke`}>{value}%</output>
              <button type="button" className="scaling-step-button" onClick={() => scaling.adjustScale(key, range.step)} disabled={value >= range.max} aria-label={`${labels[key]} növelése`}><Plus aria-hidden="true" className="size-4" /></button>
            </div>
          </div>
        );
      })}
      <button type="button" className="scaling-reset" onClick={scaling.resetScales}><RotateCcw aria-hidden="true" className="size-3.5" /> Alapértékek visszaállítása</button>
    </div>
  );
}
