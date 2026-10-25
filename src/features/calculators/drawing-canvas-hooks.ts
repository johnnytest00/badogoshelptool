"use client";

import { useEffect, useRef, useState } from "react";
import type { CanvasSize } from "@/domain/drawings/rafter-joint-drawing";

const FALLBACK_SIZE: CanvasSize = { width: 360, height: 280 };

/** Measured px size of a drawing canvas; px-based SVGs keep their labels the same size at every zoom. */
export function useCanvasSize() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<CanvasSize>(FALLBACK_SIZE);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry.contentRect.width), height = Math.round(entry.contentRect.height);
      if (width > 0 && height > 0) setSize((current) => current.width === width && current.height === height ? current : { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/**
 * Label font size in px follows the app's adaptive text scale, so the collision estimate matches what is drawn.
 * CRR-05: the scaling provider writes --tp-text-scale on <html>'s style, so a live change is observed there, without polling.
 */
export function useFontSize() {
  const [fontSize, setFontSize] = useState(13);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setFontSize(13 * (Number.parseFloat(getComputedStyle(root).getPropertyValue("--tp-text-scale")) || 1));
    read();
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
  }, []);
  return fontSize;
}

