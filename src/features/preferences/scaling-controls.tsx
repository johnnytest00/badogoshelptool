"use client";

import { RotateCcw } from "lucide-react";
import { scalingRanges, type ScalingKey } from "@/features/preferences/scaling";
import { useScaling } from "@/features/preferences/scaling-provider";

const labels: Record<ScalingKey, string> = { text: "Szövegméret", ui: "Gombok és vezérlők mérete", drawing: "Műszaki rajz megjelenítése", spacing: "Felület térközei" };

export function ScalingControls({ compact = false, keys = ["text", "ui", "spacing", "drawing"], labels: labelOverrides = {}, showReset = true, idPrefix = "display-scale" }: Readonly<{ compact?: boolean; keys?: readonly ScalingKey[]; labels?: Partial<Record<ScalingKey, string>>; showReset?: boolean; idPrefix?: string }>) {
  const scaling = useScaling();

  return (
    <div className={`scaling-control-list ${compact ? "is-compact" : ""}`}>
      {keys.map((key) => {
        const range = scalingRanges[key];
        const value = scaling[key];
        return (
          <div className="scaling-control-row" key={key}>
            <label className="scaling-control-label" htmlFor={`${idPrefix}-${key}`}>{labelOverrides[key] ?? labels[key]}</label>
            <div className="scaling-slider-row"><input id={`${idPrefix}-${key}`} type="range" min={range.min} max={range.max} step={range.step} value={value} onChange={(event) => scaling.setScale(key, Number(event.target.value))} aria-valuetext={`${value}%`} /><output className="scaling-value" htmlFor={`${idPrefix}-${key}`}>{value}%</output></div>
          </div>
        );
      })}
      {showReset && <button type="button" className="scaling-reset" onClick={scaling.resetScales}><RotateCcw aria-hidden="true" className="size-3.5" /> Alapértelmezett beállítások</button>}
    </div>
  );
}
