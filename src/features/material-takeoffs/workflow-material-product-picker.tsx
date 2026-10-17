"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { LiquidGlassLayer } from "@/components/ui/liquid-glass-layer";

export type WorkflowMaterialProductOption = Readonly<{
  id: string;
  name: string;
  detail: string;
  searchText: string;
}>;

type PickerPosition = Readonly<{ left: number; top: number; width: number; maxHeight: number }>;

export function normalizeMaterialProductSearch(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("hu-HU").trim();
}

export function filterMaterialProductOptions(options: readonly WorkflowMaterialProductOption[], query: string) {
  const normalizedQuery = normalizeMaterialProductSearch(query);
  if (!normalizedQuery) return options;
  return options.filter((option) => normalizeMaterialProductSearch(`${option.name} ${option.searchText}`).includes(normalizedQuery));
}

export function WorkflowMaterialProductPicker({ options, value, disabled, onSelect, idPrefix = "workflow-material-product", label = "Termék kiválasztása" }: Readonly<{
  options: readonly WorkflowMaterialProductOption[];
  value: string;
  disabled: boolean;
  onSelect: (id: string) => void;
  idPrefix?: string;
  label?: string;
}>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [position, setPosition] = useState<PickerPosition>({ left: 12, top: 12, width: 320, maxHeight: 420 });
  const filteredOptions = useMemo(() => filterMaterialProductOptions(options, query), [options, query]);
  const selectedOption = options.find((option) => option.id === value);
  const listId = `${idPrefix}-options`;

  const close = useCallback((restoreFocus = true) => {
    if (dialogRef.current?.open) dialogRef.current.close();
    setIsOpen(false);
    setQuery("");
    setActiveId(null);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    if (!dialog || !trigger) return;
    if (!dialog.open) dialog.showModal();

    const positionDialog = () => {
      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const rect = trigger.getBoundingClientRect();
      const isNarrow = viewportWidth <= 640;
      const width = Math.max(240, Math.min(isNarrow ? viewportWidth - 24 : 440, viewportWidth - 24));
      const maxHeight = Math.max(120, Math.min(isNarrow ? 440 : 480, viewportHeight - 24));
      const left = isNarrow
        ? viewportLeft + (viewportWidth - width) / 2
        : Math.min(Math.max(viewportLeft + 12, rect.left), viewportLeft + viewportWidth - width - 12);
      const below = viewportTop + viewportHeight - rect.bottom;
      const top = isNarrow
        ? viewportTop + viewportHeight - maxHeight - 12
        : below < Math.min(300, maxHeight) && rect.top - viewportTop > below
          ? Math.max(viewportTop + 12, rect.top - maxHeight - 8)
          : Math.min(viewportTop + viewportHeight - maxHeight - 12, rect.bottom + 8);
      setPosition({ left, top, width, maxHeight });
    };

    // Don't summon the mobile keyboard as a side effect of opening the picker;
    // its visual-viewport resize otherwise moves the page and the popup at once.
    const focusSearch = window.matchMedia("(pointer: coarse)").matches
      ? null
      : window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    positionDialog();
    const onOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!dialog.contains(target) && !trigger.contains(target)) close(false);
    };
    document.addEventListener("pointerdown", onOutsidePointer, true);
    window.addEventListener("resize", positionDialog);
    window.addEventListener("scroll", positionDialog, true);
    visualViewportListeners(window.visualViewport, positionDialog, true);
    return () => {
      if (focusSearch !== null) window.cancelAnimationFrame(focusSearch);
      document.removeEventListener("pointerdown", onOutsidePointer, true);
      window.removeEventListener("resize", positionDialog);
      window.removeEventListener("scroll", positionDialog, true);
      visualViewportListeners(window.visualViewport, positionDialog, false);
      if (dialog.open) dialog.close();
    };
  }, [close, isOpen]);

  function moveActive(direction: 1 | -1) {
    if (!filteredOptions.length) return;
    const currentIndex = filteredOptions.findIndex((option) => option.id === activeId);
    const nextIndex = currentIndex < 0
      ? (direction === 1 ? 0 : filteredOptions.length - 1)
      : (currentIndex + direction + filteredOptions.length) % filteredOptions.length;
    const next = filteredOptions[nextIndex];
    setActiveId(next.id);
    window.requestAnimationFrame(() => document.getElementById(optionId(idPrefix, next.id))?.scrollIntoView({ block: "nearest" }));
  }

  function select(id: string) {
    close();
    onSelect(id);
  }

  return <>
    <button
      ref={triggerRef}
      className="workflow-material-product-trigger"
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      aria-label={selectedOption ? `${label}: ${selectedOption.name}. Másik termék kiválasztása` : label}
      disabled={disabled}
      onClick={() => { setQuery(""); setActiveId(null); setIsOpen(true); }}
    >
      <span>{selectedOption?.name ?? (disabled ? "Előbb válassz kategóriát" : "Válassz terméket…")}</span>
      <span aria-hidden="true" className="workflow-material-product-chevron">⌄</span>
    </button>
    <dialog
      ref={dialogRef}
      className="workflow-material-product-dialog"
      aria-label="Kategória termékeinek kiválasztása"
      autoFocus
      style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === event.currentTarget) close(false); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); moveActive(1); }
        else if (event.key === "ArrowUp") { event.preventDefault(); moveActive(-1); }
        else if (event.key === "Enter") {
          event.preventDefault();
          if (activeId && filteredOptions.some((option) => option.id === activeId)) select(activeId);
        } else if (event.key === "Escape" || event.key === "Esc") {
          event.preventDefault();
          event.stopPropagation();
          close();
        } else if (event.key === "Tab") close(false);
      }}
    >
      <div className="workflow-material-product-search-row">
        <label htmlFor={`${idPrefix}-search`}>Keresés a kiválasztott kategória termékei között</label>
        <input
          ref={inputRef}
          id={`${idPrefix}-search`}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeId ? optionId(idPrefix, activeId) : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActiveId(null); }}
          placeholder="Termék keresése…"
        />
      </div>
      <div id={listId} className="workflow-material-product-options" role="listbox" aria-label="Kategóriába tartozó termékek">
        {filteredOptions.length ? filteredOptions.map((option) => <div
          id={optionId(idPrefix, option.id)}
          key={option.id}
          className={`workflow-material-product-option${activeId === option.id ? " is-active" : ""}`}
          role="option"
          aria-selected={value === option.id}
          onMouseMove={() => setActiveId(option.id)}
          onClick={() => select(option.id)}
        >
          <span>{option.name}</span><small>{option.detail}</small>
        </div>) : <p className="workflow-material-product-empty" role="status">Nincs ilyen termék ebben a kategóriában.</p>}
      </div>
      {isOpen && <LiquidGlassLayer radius={18} />}
    </dialog>
  </>;
}

function optionId(idPrefix: string, id: string) { return `${idPrefix}-option-${id}`; }

function visualViewportListeners(viewport: VisualViewport | null, listener: () => void, add: boolean) {
  if (!viewport) return;
  if (add) {
    viewport.addEventListener("resize", listener);
    viewport.addEventListener("scroll", listener);
  } else {
    viewport.removeEventListener("resize", listener);
    viewport.removeEventListener("scroll", listener);
  }
}
