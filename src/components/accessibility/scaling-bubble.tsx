"use client";

import { Scaling } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScalingControls } from "@/features/preferences/scaling-controls";
import { closeBubbleOnKey, closeBubbleOnOutsideClick, toggleBubble } from "@/components/accessibility/scaling-bubble.utils";
import { chooseFloatingPlacement, type FloatingPlacement } from "@/lib/floating-control-placement";

export function ScalingBubble() {
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const placementRef = useRef<FloatingPlacement | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    let frame = 0;
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.appendChild(probe);
    const updatePlacement = () => {
      window.clearTimeout(frame);
      frame = window.setTimeout(() => {
        const bubble = bubbleRef.current;
        const launcher = bubble?.querySelector(".scaling-launcher");
        if (!bubble || !launcher || openRef.current) return;
        const viewport = window.visualViewport;
        const box = { left: viewport?.offsetLeft ?? 0, top: viewport?.offsetTop ?? 0, width: viewport?.width ?? window.innerWidth, height: viewport?.height ?? window.innerHeight };
        const keyboardInset = Math.max(0, window.innerHeight - box.top - box.height);
        const rightInset = Math.max(0, window.innerWidth - box.left - box.width);
        const safe = getComputedStyle(probe);
        const margin = 12;
        const size = launcher.getBoundingClientRect().width || 44;
        const sticky = ".drawing-toolbar, .survey-savebar, .quotation-savebar, .preparation-save-bar, .workflow-material-save, .standalone-save, .field-survey-save-row";
        const protectedElements = document.querySelectorAll(`${sticky}, input:not([type=range]):not([type=hidden]), textarea, select, summary, .field-survey-measurement button, .field-survey-add, button.primary-button, button.secondary-button, a.primary-button, a.secondary-button, [role=dialog], nav`);
        const obstacles = Array.from(protectedElements).filter((element) => !bubble.contains(element)).map((element) => element.getBoundingClientRect()).filter((rect) => rect.width > 0 && rect.height > 0);
        const next = chooseFloatingPlacement({ viewport: box, size, margin, baseBottom: margin + (keyboardInset > 0 ? 0 : parseFloat(safe.paddingBottom) || 0), obstacles, current: placementRef.current ?? undefined });
        placementRef.current = next;
        const sideInset = (next.side === "right" ? parseFloat(safe.paddingRight) : parseFloat(safe.paddingLeft)) || 0;
        const style = bubble.style;
        style.bottom = `${next.bottom + keyboardInset}px`;
        style.setProperty("--tp-bubble-bottom", `${next.bottom + keyboardInset}px`);
        style.right = next.side === "right" ? `${margin + sideInset + rightInset}px` : "auto";
        style.left = next.side === "left" ? `${margin + sideInset + box.left}px` : "auto";
        bubble.dataset.side = next.side;
      }, 40);
    };
    const observer = new MutationObserver(updatePlacement);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("scroll", updatePlacement, true);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("focusin", updatePlacement);
    window.addEventListener("focusout", updatePlacement);
    window.visualViewport?.addEventListener("resize", updatePlacement);
    window.visualViewport?.addEventListener("scroll", updatePlacement);
    updatePlacement();
    return () => {
      window.clearTimeout(frame);
      probe.remove();
      observer.disconnect();
      window.removeEventListener("scroll", updatePlacement, true);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("focusin", updatePlacement);
      window.removeEventListener("focusout", updatePlacement);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
    };
  }, []);

  useEffect(() => { openRef.current = open; }, [open]);

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
    <div className={`scaling-bubble ${open ? "is-open" : ""}`} ref={bubbleRef}>
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
