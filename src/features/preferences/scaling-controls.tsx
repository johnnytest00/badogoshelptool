"use client";

import { RotateCcw } from "lucide-react";
import { scalingRanges } from "@/features/preferences/scaling";
import { useScaling } from "@/features/preferences/scaling-provider";

export function ScalingControls({ compact = false, showReset = true, idPrefix = "display-scale" }: Readonly<{ compact?: boolean; showReset?: boolean; idPrefix?: string }>) {
  const scaling = useScaling();

  return (
    <div className={`scaling-control-list ${compact ? "is-compact" : ""}`}>
      <div className="scaling-control-row">
        <label className="scaling-control-label" htmlFor={`${idPrefix}-text`}>Szövegméret</label>
        <div className="scaling-slider-row"><input id={`${idPrefix}-text`} type="range" min={scalingRanges.text.min} max={scalingRanges.text.max} step={scalingRanges.text.step} value={scaling.text} onChange={(event) => scaling.setScale("text", Number(event.target.value))} aria-valuetext={`${scaling.text}%`} /><output className="scaling-value" htmlFor={`${idPrefix}-text`}>{scaling.text}%</output></div>
      </div>
      {showReset && <button type="button" className="scaling-reset" onClick={scaling.resetScales}><RotateCcw aria-hidden="true" className="size-3.5" /> Alapértelmezett beállítások</button>}
    </div>
  );
}
