"use client";

import { useEffect, useState } from "react";
import { shouldEnhanceLiquidGlass } from "@/components/ui/liquid-glass-policy";

const staticMousePosition = { x: 0, y: 0 };

/** Client-only decorative refraction from the pinned liquid-glass-react package. */
export function LiquidGlassLayer({ radius = 22 }: Readonly<{ radius?: number }>) {
  const [LiquidGlass, setLiquidGlass] = useState<typeof import("liquid-glass-react").default | null>(null);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const profile = {
      userAgent: navigator.userAgent,
      reducedMotion: reducedMotion.matches,
      reducedTransparency: reducedTransparency.matches,
      coarsePointer: coarsePointer.matches,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      touchPoints: navigator.maxTouchPoints,
    };
    if (!shouldEnhanceLiquidGlass(profile)) return;

    let mounted = true;
    void import("liquid-glass-react").then((module) => {
      if (mounted) setLiquidGlass(() => module.default);
    }).catch(() => {
      // The shared CSS glass surface remains active when the optional filter fails to load.
    });
    return () => { mounted = false; };
  }, []);

  if (!LiquidGlass) return null;

  return (
    <span className="tp-liquid-glass-effect" aria-hidden="true">
      <LiquidGlass
        className="tp-liquid-glass-react-root"
        mode="standard"
        displacementScale={8}
        blurAmount={0.06}
        saturation={120}
        aberrationIntensity={0}
        elasticity={0}
        cornerRadius={radius}
        padding="0px"
        globalMousePos={staticMousePosition}
        mouseOffset={staticMousePosition}
        style={{ position: "absolute", top: "50%", left: "50%", width: "100%", height: "100%", pointerEvents: "none" }}
      >
        <span className="tp-liquid-glass-fill" />
      </LiquidGlass>
    </span>
  );
}
