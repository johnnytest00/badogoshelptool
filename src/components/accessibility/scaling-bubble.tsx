"use client";

import { Scaling } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { closeBubbleOnKey, closeBubbleOnOutsideClick, toggleBubble } from "@/components/accessibility/scaling-bubble.utils";
import { rectanglesOverlap } from "@/lib/floating-control-placement";

export function ScalingBubble() {
  const [open, setOpen] = useState(false);
  const [obstructed, setObstructed] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    let frame = 0;
    const updatePlacement = () => {
      const viewport = window.visualViewport;
      const rightInset = Math.max(0, window.innerWidth - (viewport?.offsetLeft ?? 0) - (viewport?.width ?? window.innerWidth));
      bubbleRef.current?.style.setProperty("--tp-visual-viewport-right-inset", `${rightInset}px`);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const launcher = bubbleRef.current?.querySelector(".scaling-launcher");
        if (!launcher) return;
        const launcherRect = launcher.getBoundingClientRect();
        const protectedElements = document.querySelectorAll(".drawing-toolbar, input:not([type=range]):not([type=hidden]), textarea, select, .field-survey-measurement button, .field-survey-add, button.primary-button, button.secondary-button, a.primary-button, a.secondary-button, [role=dialog], nav");
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
    window.visualViewport?.addEventListener("resize", updatePlacement);
    window.visualViewport?.addEventListener("scroll", updatePlacement);
    updatePlacement();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", updatePlacement, true);
      window.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
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

  useEffect(() => {
    if (open) wasOpen.current = true;
    else if (wasOpen.current) { launcherRef.current?.focus({ preventScroll: true }); wasOpen.current = false; }
  }, [open]);

  return (
    <div className={`scaling-bubble ${open ? "is-open" : ""} ${obstructed ? "is-obstructed" : ""}`} ref={bubbleRef}>
      {open && <div className="scaling-quick-cluster" id="scaling-quick-cluster" aria-label="Gyors méretezés">
        <button type="button" className="scaling-quick-close" onClick={() => setOpen(false)} aria-label="Méretező bezárása"><span aria-hidden="true">×</span></button>
        <section className="scaling-quick-bubble"><h2>Szövegméret</h2><ScalingControls compact keys={["text"]} labels={{ text: "Szövegméret" }} showReset={false} idPrefix="quick-scale" /></section>
        <section className="scaling-quick-bubble"><h2>Felületméret</h2><ScalingControls compact keys={["ui"]} labels={{ ui: "Felületméret" }} showReset={false} idPrefix="quick-scale" /></section>
      </div>}
      <button ref={launcherRef} className="scaling-launcher" type="button" onClick={() => setOpen(toggleBubble)} aria-expanded={open} aria-controls="scaling-quick-cluster" aria-label={open ? "Méretező bezárása" : "Méretezés és megjelenítés"}>
        <Scaling aria-hidden="true" className="size-5" />
      </button>
    </div>
  );
}
