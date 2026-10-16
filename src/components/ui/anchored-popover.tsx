"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CircleHelp, X, type LucideIcon } from "lucide-react";
import { placeAnchoredMenu } from "@/lib/viewport-menu-placement";

/** A compact, viewport-aware help or settings panel anchored to its trigger. */
export function AnchoredPopover({
  label,
  heading = label,
  children,
  icon: Icon = CircleHelp,
  className = "",
  triggerClassName = "",
  closeLabel = `${heading} bezárása`,
  disabled = false,
  focusFirst = true,
}: Readonly<{
  label: string;
  heading?: string;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
  triggerClassName?: string;
  closeLabel?: string;
  disabled?: boolean;
  focusFirst?: boolean;
}>) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<ReturnType<typeof placeAnchoredMenu> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const safeAreaRef = useRef<HTMLSpanElement>(null);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    setPlacement(null);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePlacement = () => {
      const trigger = triggerRef.current;
      const panel = panelRef.current;
      if (!trigger || !panel) return;

      const visual = window.visualViewport;
      const viewport = {
        left: visual?.offsetLeft ?? 0,
        top: visual?.offsetTop ?? 0,
        width: visual?.width ?? window.innerWidth,
        height: visual?.height ?? window.innerHeight,
      };
      const computed = safeAreaRef.current ? getComputedStyle(safeAreaRef.current) : null;
      const readInset = (name: "paddingLeft" | "paddingRight" | "paddingTop" | "paddingBottom") => Number.parseFloat(computed?.[name] ?? "0") || 0;
      const insets = { left: readInset("paddingLeft"), right: readInset("paddingRight"), top: readInset("paddingTop"), bottom: readInset("paddingBottom") };
      panel.style.maxWidth = `${Math.max(0, viewport.width - insets.left - insets.right - 24)}px`;
      panel.style.maxHeight = "";
      const next = placeAnchoredMenu(trigger.getBoundingClientRect(), panel.getBoundingClientRect(), viewport, insets);
      setPlacement(next);
    };

    updatePlacement();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePlacement);
    if (panelRef.current) observer?.observe(panelRef.current);
    if (triggerRef.current) observer?.observe(triggerRef.current);
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!panelRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("orientationchange", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    window.visualViewport?.addEventListener("resize", updatePlacement);
    window.visualViewport?.addEventListener("scroll", updatePlacement);
    return () => {
      observer?.disconnect();
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("orientationchange", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
    };
  }, [close, open]);

  useEffect(() => {
    if (!open || !placement || !focusFirst) return;
    const firstField = panelRef.current?.querySelector<HTMLElement>("input:not(:disabled), select:not(:disabled), textarea:not(:disabled)");
    (firstField ?? panelRef.current)?.focus();
  }, [focusFirst, open, placement]);

  const toggle = () => {
    if (open) close(true);
    else setOpen(true);
  };

  return <>
    <span className={`anchored-popover-wrap${className ? ` ${className}` : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`anchored-popover-trigger${triggerClassName ? ` ${triggerClassName}` : ""}`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        title={label}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(event) => { if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); close(true); } }}
      ><Icon aria-hidden="true" className="size-4" /></button>
    </span>
    {open && typeof document !== "undefined" && createPortal(<>
      <span ref={safeAreaRef} className="project-action-menu-safe-area" aria-hidden="true" />
      <div
        ref={panelRef}
        id={id}
        className="anchored-popover-panel"
        role="dialog"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        data-positioned={Boolean(placement)}
        style={placement ? { left: `${placement.left}px`, top: `${placement.top}px`, maxWidth: `${placement.maxWidth}px`, maxHeight: `${placement.maxHeight}px` } : undefined}
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); } }}
      >
        <div className="anchored-popover-heading">
          <h2 id={`${id}-title`}>{heading}</h2>
          <button type="button" className="anchored-popover-close" aria-label={closeLabel} onClick={() => close(true)}><X aria-hidden="true" className="size-4" /></button>
        </div>
        <div className="anchored-popover-content">{children}</div>
      </div>
    </>, document.body)}
  </>;
}
