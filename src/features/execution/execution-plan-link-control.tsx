"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import type { DocumentKind, DocumentPlanLink } from "./execution-document-links";
import type { ExecutionPlanOption } from "./execution-data";
import { createExecutionPlanAndLinkDocumentAction, linkExecutionPlanDocumentAction, unlinkExecutionPlanDocumentAction } from "./execution-document-link-actions";

const kindLabel: Record<DocumentKind, string> = { material_list: "az anyaglista", quotation: "az ajánlat", calculation: "a kalkuláció" };

/** Optional, reversible association of one material list or quotation with work logs. Never creates a project. */
export function ExecutionPlanLinkControl({ organizationId, kind, documentId, links, plans, readOnly = false, compactHandoff = false, showOptionalBadge = true, linkBlockedReason }: Readonly<{
  organizationId: string;
  kind: DocumentKind;
  documentId: string;
  links: readonly DocumentPlanLink[];
  plans: readonly ExecutionPlanOption[];
  readOnly?: boolean;
  compactHandoff?: boolean;
  showOptionalBadge?: boolean;
  /** Shown instead of the add form, e.g. while a calculation has unsaved changes. */
  linkBlockedReason?: string;
}>) {
  const router = useRouter();
  const { requestConfirmation, notify } = useAppInteraction();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [filter, setFilter] = useState("");
  const [planId, setPlanId] = useState("");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [linkKey] = useState(() => createIdempotencyKey());
  const [planKey] = useState(() => createIdempotencyKey());
  const lock = useRef(false);
  const linkedPlanIds = useMemo(() => new Set(links.filter((link) => !link.documentId || link.documentId === documentId).map((link) => link.planId)), [links, documentId]);
  const available = useMemo(() => plans.filter((plan) => !linkedPlanIds.has(plan.id) && plan.title.toLocaleLowerCase("hu-HU").includes(filter.trim().toLocaleLowerCase("hu-HU"))), [plans, linkedPlanIds, filter]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function run(task: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await task();
      if (!result.ok) { setError(result.error ?? "A művelet nem sikerült."); return; }
      linkKey.renew(); planKey.renew(); setPlanId(""); setTitle(""); setFilter("");
      setOpen(false);
      notify({ kind: "success", message: success });
      router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod; duplikátum nem jön létre."); }
    finally { lock.current = false; setPending(false); }
  }

  async function unlink(link: DocumentPlanLink) {
    if (!link.linkId) return;
    const accepted = await requestConfirmation({
      title: "Leválasztás a munkanaplóról",
      message: `${kindLabel[kind][0].toUpperCase()}${kindLabel[kind].slice(1)} és a „${link.planTitle}” munkanapló is megmarad; csak a kapcsolatuk szűnik meg. A kapcsolat később újra létrehozható.`,
      cancelLabel: "Mégse",
      actions: [{ label: "Leválasztás", tone: "danger", run: () => undefined }],
    });
    if (accepted) await run(() => unlinkExecutionPlanDocumentAction({ organizationId, linkId: link.linkId!, planId: link.planId, kind, documentId }), "Leválasztva a munkanaplóról");
  }

  const idPrefix = `plan-link-${kind}`;
  return <section className={`plan-link-control${compactHandoff ? " is-compact-handoff" : ""}`} aria-label="Munkanapló kapcsolat">
    {!compactHandoff && <div className="plan-link-heading"><ClipboardList aria-hidden="true" size={17} /><strong>Munkanapló</strong><span className="survey-optional-badge">Opcionális</span></div>}
    {links.length === 0
      ? !compactHandoff && <p className="plan-link-empty">{`Nincs munkanaplóhoz kapcsolva; ${kindLabel[kind]} önállóan is használható.`}</p>
      : <ul className="plan-link-list">{links.map((link) => <li key={`${link.planId}:${link.linkId ?? "creation"}`}>
        <Link href={`/kivitelezes/${link.planId}?organization=${organizationId}`}>{link.planTitle}{link.detail && <small> · {link.detail}</small>}</Link>
        {link.origin === "creation" ? <small>Létrehozáskor kapcsolt · nem választható le</small>
          : !readOnly && <button type="button" className="text-action" disabled={pending} onClick={() => void unlink(link)}>Leválasztás</button>}
      </li>)}</ul>}
    {!readOnly && linkBlockedReason && <p className="plan-link-note">{linkBlockedReason}</p>}
    {!readOnly && !linkBlockedReason && <>
      <button type="button" className={`secondary-button plan-link-open${compactHandoff ? " is-compact" : ""}`} onClick={() => { setError(""); setOpen(true); }}>{compactHandoff && <ClipboardList aria-hidden="true" size={17} />} Munkanaplóhoz csatolás</button>
      {compactHandoff && showOptionalBadge && <span className="survey-optional-badge">Opcionális</span>}
      <dialog ref={dialogRef} className="glass-confirmation-dialog plan-link-dialog" aria-labelledby={`${idPrefix}-title`} onCancel={(event) => { event.preventDefault(); if (!pending) setOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
      <div className="association-dialog-content">
      <div className="section-heading"><div><p className="section-eyebrow">Opcionális kapcsolat</p><h2 id={`${idPrefix}-title`}>Munkanaplóhoz csatolás</h2></div><button type="button" className="secondary-button" disabled={pending} onClick={() => setOpen(false)}>Bezárás</button></div>
      <div className="plan-link-modes" role="group" aria-label="Kapcsolás módja">
        <button type="button" className={mode === "existing" ? "primary-button" : "secondary-button"} aria-pressed={mode === "existing"} onClick={() => setMode("existing")}>Meglévő munkanapló</button>
        <button type="button" className={mode === "new" ? "primary-button" : "secondary-button"} aria-pressed={mode === "new"} onClick={() => setMode("new")}>Új munkanapló</button>
      </div>
      {mode === "existing" ? <div className="plan-link-form">
        <label className="field-survey-field" htmlFor={`${idPrefix}-filter`}><span>Keresés a munkanaplók között</span><input id={`${idPrefix}-filter`} type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Munkanapló neve" /></label>
        <label className="field-survey-field" htmlFor={`${idPrefix}-select`}><span>Munkanapló</span><select id={`${idPrefix}-select`} value={planId} onChange={(event) => { setPlanId(event.target.value); linkKey.renew(); }}><option value="">{available.length ? "Válassz munkanaplót…" : "Nincs találat"}</option>{available.map((plan) => <option key={plan.id} value={plan.id}>{plan.title}{plan.projectId ? " · korábbi projektkapcsolat" : ""}</option>)}</select></label>
        <button type="button" className="primary-button" disabled={!planId || pending} onClick={() => void run(() => linkExecutionPlanDocumentAction({ organizationId, planId, kind, documentId, requestKey: linkKey.current() }), "Munkanaplóhoz kapcsolva")}>{pending ? "Kapcsolás…" : "Kapcsolás"}</button>
      </div> : <div className="plan-link-form">
        <label className="field-survey-field" htmlFor={`${idPrefix}-title`}><span>Új munkanapló neve</span><input id={`${idPrefix}-title`} value={title} maxLength={200} onChange={(event) => { setTitle(event.target.value); planKey.renew(); linkKey.renew(); }} placeholder="Például: Tetőfelújítás" /></label>
        <p className="plan-link-note">Önálló munkanapló készül; projekt nem szükséges.</p>
        <button type="button" className="primary-button" disabled={!title.trim() || pending} onClick={() => void run(() => createExecutionPlanAndLinkDocumentAction({ organizationId, title, kind, documentId, planRequestKey: planKey.current(), linkRequestKey: linkKey.current() }), "Munkanapló létrehozva és kapcsolva")}>{pending ? "Létrehozás…" : "Létrehozás és kapcsolás"}</button>
      </div>}
      {error && <p role="alert" className="form-message is-error">{error}</p>}
      </div>
      </dialog>
    </>}
  </section>;
}
