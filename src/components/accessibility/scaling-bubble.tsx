"use client";

import { Settings2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { closeBubbleOnKey, closeBubbleOnOutsideClick, toggleBubble } from "@/components/accessibility/scaling-bubble.utils";
import { rectanglesOverlap } from "@/lib/floating-control-placement";

export function ScalingBubble() {
  const [open, setOpen] = useState(false);
  const [obstructed, setObstructed] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const updatePlacement = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const launcher = bubbleRef.current?.querySelector(".scaling-launcher");
        if (!launcher) return;
        const launcherRect = launcher.getBoundingClientRect();
        const protectedElements = document.querySelectorAll(".drawing-toolbar, input:not([type=range]):not([type=hidden]), textarea, select, button.primary-button, button.secondary-button, a.primary-button, a.secondary-button, [role=dialog], nav");
        const covered = Array.from(protectedElements).some((element) => {
          if (bubbleRef.current?.contains(element)) return false;
          const rect = element.getBoundingClientRect();
          return rectanglesOverlap(launcherRect, rect);
        });
        setObstructed(covered);
      });
    };
    const observer = new MutationObserver(updatePlacement);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", updatePlacement, true);
    window.addEventListener("resize", updatePlacement);
    updatePlacement();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", updatePlacement, true);
      window.removeEventListener("resize", updatePlacement);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => setOpen((current) => closeBubbleOnKey(current, event.key));
    const onPointerDown = (event: PointerEvent) => setOpen((current) => closeBubbleOnOutsideClick(current, Boolean(bubbleRef.current?.contains(event.target as Node))));
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [open]);

  return (
    <div className={`scaling-bubble ${open ? "is-open" : ""} ${obstructed ? "is-obstructed" : ""}`} ref={bubbleRef}>
        <div className="scaling-bubble-panel" id="scaling-bubble-panel" aria-hidden={!open} inert={!open}>
        <div className="scaling-bubble-heading"><div><span className="section-eyebrow">Megjelenítés</span><h2>Megjelenítési beállítások</h2></div><button type="button" className="scaling-close" onClick={() => setOpen(false)} aria-label="Beállítások bezárása"><X aria-hidden="true" className="size-4" /></button></div>
        <ScalingControls compact />
      </div>
      <button className="scaling-launcher" type="button" onClick={() => setOpen(toggleBubble)} aria-expanded={open} aria-controls="scaling-bubble-panel" aria-label={open ? "Beállítások bezárása" : "Megjelenítési beállítások"}>
        <Settings2 aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
