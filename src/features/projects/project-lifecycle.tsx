"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, ChevronDown, Copy, LoaderCircle, MoreHorizontal, RotateCcw } from "lucide-react";
import { archiveProjectAction, duplicateProjectAction, restoreProjectAction } from "./project-actions";
import type { ProjectRecord } from "./project-data";
import { projectStatusLabels } from "@/domain/projects/contracts";

export function ProjectActionsMenu({ organizationId, project }: Readonly<{ organizationId: string; project: ProjectRecord }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const confirmationRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const deleteHelpId = useId();
  const archived = project.status === "archived";

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)');
    first?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.parentElement?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!confirmingArchive) return;
    confirmationRef.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
  }, [confirmingArchive]);

  const run = (action: typeof archiveProjectAction | typeof duplicateProjectAction | typeof restoreProjectAction, extra: Record<string, string> = {}) => {
    const data = new FormData();
    data.set("organizationId", organizationId);
    data.set("projectId", project.id);
    data.set("version", String(project.version));
    Object.entries(extra).forEach(([key, value]) => data.set(key, value));
    setError("");
    startTransition(async () => {
      const result = await action(data);
      if (!result.ok) setError(result.error ?? "A művelet nem sikerült.");
      else if (result.projectId && action === duplicateProjectAction) router.push(`/projektek/${result.projectId}?organization=${organizationId}`);
      else { setConfirmingArchive(false); router.refresh(); }
    });
  };

  function onMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])];
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const current = items.indexOf(document.activeElement as HTMLElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (current + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length;
      items[next]?.focus();
    }
  }

  return <div className="project-action-menu-wrap">
    <button ref={triggerRef} type="button" className="project-action-menu-trigger" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((current) => !current)}>
      <MoreHorizontal aria-hidden="true" className="size-4" /><span>Projektműveletek</span><ChevronDown aria-hidden="true" className={`project-action-menu-chevron${open ? " is-open" : ""}`} />
    </button>
    <div ref={menuRef} id={menuId} className="project-action-menu" role="menu" aria-label="Projektműveletek" hidden={!open} onKeyDown={onMenuKeyDown}>
      <Link role="menuitem" tabIndex={-1} href={`/felmeresek/uj?organization=${organizationId}&project=${project.id}`} onClick={() => setOpen(false)}>Új felmérés</Link>
      <button role="menuitem" tabIndex={-1} type="button" disabled={archived || isPending} aria-describedby={archived ? "project-archive-help" : undefined} onClick={() => { setOpen(false); setConfirmingArchive(true); }}><Archive aria-hidden="true" className="size-4" /><span className="project-menu-item-copy"><span>Archiválás</span>{archived && <small id="project-archive-help">A projekt már archiválva van.</small>}</span></button>
      <button role="menuitem" tabIndex={-1} type="button" aria-disabled="true" aria-describedby={deleteHelpId}><span className="project-menu-item-copy"><span>Törlés</span><small id={deleteHelpId}>Nem elérhető: a végleges törlés nincs engedélyezve, a projekt előzményeit munkafolyamatok hivatkozzák.</small></span></button>
      <div className="project-menu-separator" role="separator" />
      <button role="menuitem" tabIndex={-1} type="button" disabled={isPending} onClick={() => { setOpen(false); run(duplicateProjectAction); }}><Copy aria-hidden="true" className="size-4" />Másolat készítése</button>
      {archived && project.previousStatus && <button role="menuitem" tabIndex={-1} type="button" disabled={isPending} onClick={() => { setOpen(false); run(restoreProjectAction); }}><RotateCcw aria-hidden="true" className="size-4" />Visszaállítás: {projectStatusLabels[project.previousStatus]}</button>}
    </div>
    {isPending && !confirmingArchive && <span className="project-menu-feedback" role="status"><LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Művelet folyamatban…</span>}
    {error && !confirmingArchive && <p className="project-menu-feedback form-message is-error" role="alert">{error}</p>}
    {confirmingArchive && <div ref={confirmationRef} className="archive-confirm project-archive-confirm" role="alertdialog" aria-labelledby={`${menuId}-archive-title`} aria-describedby={`${menuId}-archive-description`}>
      <strong id={`${menuId}-archive-title`}>Projekt archiválása</strong><p id={`${menuId}-archive-description`}>Később visszaállítható. Folytatod?</p>
      <button className="primary-button" type="button" disabled={isPending} onClick={() => run(archiveProjectAction)}>{isPending ? "Archiválás…" : "Igen, archiválom"}</button>
      <button className="text-button" type="button" disabled={isPending} onClick={() => { setConfirmingArchive(false); setError(""); }}>Mégse</button>
      {isPending && <LoaderCircle className="size-4 animate-spin" aria-label="Mentés folyamatban" />}{error && <p className="form-message is-error" role="alert">{error}</p>}
    </div>}
  </div>;
}
