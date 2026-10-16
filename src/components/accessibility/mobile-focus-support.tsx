"use client";

import { useEffect } from "react";
import { focusedElementNeedsReveal } from "@/lib/keyboard-visibility";

function isEditableElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element.matches("input:not([type=range]):not([type=hidden]), textarea, [contenteditable=true]");
}

export function MobileFocusSupport() {
  useEffect(() => {
    let frame = 0;
    const revealIfNeeded = (element: HTMLElement | null) => {
      if (!element?.isConnected) return;
      const viewport = window.visualViewport;
      const bounds = element.getBoundingClientRect();
      const top = viewport?.offsetTop ?? 0;
      const height = viewport?.height ?? window.innerHeight;
      if (focusedElementNeedsReveal({ top: bounds.top, bottom: bounds.bottom }, { top, height })) {
        element.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isEditableElement(event.target as Element | null)) return;
      document.body.dataset.editing = "true";
      const active = event.target as HTMLElement;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => revealIfNeeded(active));
    };
    const onFocusOut = () => window.setTimeout(() => {
      if (!isEditableElement(document.activeElement)) delete document.body.dataset.editing;
    }, 0);
    const onViewportChange = () => {
      const active = document.activeElement;
      if (!isEditableElement(active)) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => revealIfNeeded(active));
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    window.visualViewport?.addEventListener("resize", onViewportChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      delete document.body.dataset.editing;
    };
  }, []);

  return null;
}
