"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { Archive, ChevronDown, Copy, MoreHorizontal, RotateCcw } from "lucide-react";
import { archiveProjectAction, duplicateProjectAction, restoreProjectAction } from "./project-actions";
import type { ProjectRecord } from "./project-data";
import { projectStatusLabels } from "@/domain/projects/contracts";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { PendingIndicator } from "@/components/feedback/pending-indicator";
import { placeAnchoredMenu } from "@/lib/viewport-menu-placement";
import { closeMenuOnEscape } from "./project-menu-keyboard";

export function ProjectActionsMenu({ organizationId, project }: Readonly<{ organizationId: string; project: ProjectRecord }>) {
  const router = useRouter();
  const { requestConfirmation, notify } = useAppInteraction();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<ReturnType<typeof placeAnchoredMenu> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const safeAreaRef = useRef<HTMLSpanElement>(null);
  const menuId = useId();
  const deleteHelpId = useId();
  const archived = project.status === "archived";

  useEffect(() => {
    if (!open) { setPlacement(null); return; }
    const updatePlacement = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
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
      const maxWidth = Math.max(0, viewport.width - insets.left - insets.right - 24);
      menu.style.maxHeight = "";
      menu.style.maxWidth = `${maxWidth}px`;
      const menuRect = menu.getBoundingClientRect();
      const rect = trigger.getBoundingClientRect();
      setPlacement(placeAnchoredMenu(rect, menuRect, viewport, insets));
    };
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)');
    updatePlacement();
    first?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.parentElement?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("orientationchange", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    window.visualViewport?.addEventListener("resize", updatePlacement);
    window.visualViewport?.addEventListener("scroll", updatePlacement);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("orientationchange", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
    };
  }, [open]);

  const run = async (action: typeof archiveProjectAction | typeof duplicateProjectAction | typeof restoreProjectAction, extra: Record<string, string> = {}) => {
    const data = new FormData();
    data.set("organizationId", organizationId);
    data.set("projectId", project.id);
    data.set("version", String(project.version));
    Object.entries(extra).forEach(([key, value]) => data.set(key, value));
    setError("");
    setIsPending(true);
    try {
      const result = await action(data);
      if (!result.ok) throw new Error(result.error ?? "A művelet nem sikerült.");
      else if (result.projectId && action === duplicateProjectAction) router.push(`/projektek/${result.projectId}?organization=${organizationId}`);
      else router.refresh();
      notify({ kind: "success", message: action === archiveProjectAction ? "Projekt archiválva. Később visszaállítható." : action === restoreProjectAction ? "Projekt visszaállítva." : "Projektmásolat elkészült." });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "A művelet nem sikerült.";
      setError(message);
      throw cause;
    } finally { setIsPending(false); }
  };

  async function requestArchive() {
    setOpen(false);
    await requestConfirmation({ title: "Projekt archiválása", message: "A projekt archiválódik, és később visszaállítható. A kapcsolódó előzmények megmaradnak.", cancelLabel: "Mégse", actions: [{ label: "Projekt archiválása", tone: "danger", run: () => run(archiveProjectAction) }] });
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    closeMenuOnEscape(event, open, closeMenu);
  }

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (closeMenuOnEscape(event, open, closeMenu)) return;
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next]?.focus();
    }
  }

  return <div className="project-action-menu-wrap">
    <span ref={safeAreaRef} className="project-action-menu-safe-area" aria-hidden="true" />
    <button ref={triggerRef} type="button" className="project-action-menu-trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((current) => !current)} onKeyDown={onTriggerKeyDown}>
      <MoreHorizontal aria-hidden="true" className="size-4" /><span>Projektműveletek</span><ChevronDown aria-hidden="true" className={`project-action-menu-chevron${open ? " is-open" : ""}`} />
    </button>
    <div ref={menuRef} id={menuId} className="project-action-menu" role="menu" aria-label="Projektműveletek" hidden={!open} data-positioned={Boolean(placement)} style={placement ? { left: `${placement.left}px`, top: `${placement.top}px`, maxWidth: `${placement.maxWidth}px`, maxHeight: `${placement.maxHeight}px` } : undefined} onKeyDown={onMenuKeyDown}>
      <Link role="menuitem" tabIndex={-1} href={`/felmeresek/uj?organization=${organizationId}&project=${project.id}`} onClick={() => setOpen(false)}>Új felmérés</Link>
      <button role="menuitem" tabIndex={-1} type="button" disabled={archived || isPending} aria-describedby={archived ? "project-archive-help" : undefined} onClick={() => void requestArchive()}><Archive aria-hidden="true" className="size-4" /><span className="project-menu-item-copy"><span>Archiválás</span>{archived && <small id="project-archive-help">A projekt már archiválva van.</small>}</span></button>
      <button role="menuitem" tabIndex={-1} type="button" aria-disabled="true" aria-describedby={deleteHelpId}><span className="project-menu-item-copy"><span>Törlés</span><small id={deleteHelpId}>Nem elérhető: a végleges törlés nincs engedélyezve, a projekt előzményeit munkafolyamatok hivatkozzák.</small></span></button>
      <div className="project-menu-separator" role="separator" />
      <button role="menuitem" tabIndex={-1} type="button" disabled={isPending} onClick={() => { setOpen(false); void run(duplicateProjectAction).catch(() => undefined); }}><Copy aria-hidden="true" className="size-4" />Másolat készítése</button>
      {archived && project.previousStatus && <button role="menuitem" tabIndex={-1} type="button" disabled={isPending} onClick={() => { setOpen(false); void run(restoreProjectAction).catch(() => undefined); }}><RotateCcw aria-hidden="true" className="size-4" />Visszaállítás: {projectStatusLabels[project.previousStatus]}</button>}
    </div>
    {isPending && <PendingIndicator label="Művelet folyamatban…" />}
    {error && <p className="project-menu-feedback form-message is-error" role="alert">{error}</p>}
  </div>;
}
