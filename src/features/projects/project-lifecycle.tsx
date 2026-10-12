"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Copy, LoaderCircle, RotateCcw } from "lucide-react";
import { archiveProjectAction, duplicateProjectAction, restoreProjectAction } from "./project-actions";
import type { ProjectRecord } from "./project-data";
import { projectStatusLabels } from "@/domain/projects/contracts";

export function ProjectLifecycleActions({ organizationId, project }: Readonly<{ organizationId: string; project: ProjectRecord }>) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const run = (action: (data: FormData) => Promise<{ ok: boolean; error?: string; projectId?: string }>, extra: Record<string, string> = {}) => {
    const data = new FormData(); data.set("organizationId", organizationId); data.set("projectId", project.id); data.set("version", String(project.version)); Object.entries(extra).forEach(([key, value]) => data.set(key, value));
    setError(""); startTransition(async () => { const result = await action(data); if (!result.ok) setError(result.error ?? "A művelet nem sikerült."); else if (result.projectId && action === duplicateProjectAction) router.push(`/projektek/${result.projectId}?organization=${organizationId}`); else router.refresh(); });
  };
  return <div className="lifecycle-actions">{project.status !== "archived" && (confirmingArchive ? <div className="archive-confirm" role="group" aria-label="Archiválás megerősítése"><span>Archiválod? Később visszaállítható.</span><button className="primary-button" type="button" disabled={isPending} onClick={() => run(archiveProjectAction)}>Igen, archiválom</button><button className="text-button" type="button" onClick={() => setConfirmingArchive(false)}>Mégse</button></div> : <button className="secondary-button" type="button" disabled={isPending} onClick={() => setConfirmingArchive(true)}><Archive className="size-4" /> Archiválás</button>)}<button className="secondary-button" type="button" disabled={isPending} onClick={() => run(duplicateProjectAction)}><Copy className="size-4" /> Másolat készítése</button>{project.status === "archived" && project.previousStatus && <button className="primary-button" type="button" disabled={isPending} onClick={() => run(restoreProjectAction)}><RotateCcw className="size-4" /> Visszaállítás: {projectStatusLabels[project.previousStatus]}</button>}{isPending && <LoaderCircle className="size-4 animate-spin" aria-label="Mentés folyamatban" />}{error && <p className="form-message is-error" role="alert">{error}</p>}</div>;
}
