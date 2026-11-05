"use client";

import { RotateCcw } from "lucide-react";
import { useLiquidGlass } from "@/features/preferences/liquid-glass-provider";

export function LiquidGlassControls() {
  const { opacity, tintMode, customTint, setOpacity, setTintMode, setCustomTint, resetLiquidGlass } = useLiquidGlass();
  return (
    <div className="liquid-glass-settings">
      <div className="liquid-glass-setting-row">
        <label htmlFor="liquid-glass-opacity">Átlátszóság</label>
        <output htmlFor="liquid-glass-opacity">{opacity}%</output>
      </div>
      <input id="liquid-glass-opacity" className="liquid-glass-opacity" type="range" min="0" max="100" step="1" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} aria-valuetext={`${opacity} százalékos fedettség`} />
      <p className="liquid-glass-help">0% teljesen átlátszó · 100% teljes fedettség</p>
      <fieldset className="liquid-glass-tint-options">
        <legend>Üveg színe</legend>
        <label><input type="radio" name="liquid-glass-tint" value="auto" checked={tintMode === "auto"} onChange={() => setTintMode("auto")} /> Automatikus, a témához igazítva</label>
        <label><input type="radio" name="liquid-glass-tint" value="custom" checked={tintMode === "custom"} onChange={() => setTintMode("custom")} /> Egyéni szín</label>
      </fieldset>
      <div className="liquid-glass-color-row">
        <span className="liquid-glass-color-preview" aria-hidden="true" />
        <label htmlFor="liquid-glass-color">Egyéni üvegszín</label>
        <input id="liquid-glass-color" type="color" value={customTint} disabled={tintMode !== "custom"} onChange={(event) => setCustomTint(event.target.value)} />
      </div>
      <button type="button" className="secondary-button liquid-glass-reset" onClick={resetLiquidGlass}><RotateCcw aria-hidden="true" className="size-4" /> Alapértékek</button>
    </div>
  );
}
