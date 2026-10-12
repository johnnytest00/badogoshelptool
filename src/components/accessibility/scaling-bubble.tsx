"use client";

import { Accessibility, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { closeBubbleOnKey, closeBubbleOnOutsideClick, toggleBubble } from "@/components/accessibility/scaling-bubble.utils";

export function ScalingBubble() {
  const [open, setOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => setOpen((current) => closeBubbleOnKey(current, event.key));
    const onPointerDown = (event: PointerEvent) => setOpen((current) => closeBubbleOnOutsideClick(current, Boolean(bubbleRef.current?.contains(event.target as Node))));
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.removeEventListener("pointerdown", onPointerDown); };
  }, [open]);

  return (
    <div className={`scaling-bubble ${open ? "is-open" : ""}`} ref={bubbleRef}>
        <div className="scaling-bubble-panel" id="scaling-bubble-panel" aria-hidden={!open}>
        <div className="scaling-bubble-heading"><div><span className="section-eyebrow">Megjelenítés</span><h2>Méretezés</h2></div><button type="button" className="scaling-close" onClick={() => setOpen(false)} aria-label="Méretezés bezárása"><X aria-hidden="true" className="size-4" /></button></div>
        <ScalingControls compact />
      </div>
      <button className="scaling-launcher" type="button" onClick={() => setOpen(toggleBubble)} aria-expanded={open} aria-controls="scaling-bubble-panel" aria-label={open ? "Méretezés bezárása" : "Méretezés megnyitása"}>
        <Accessibility aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
