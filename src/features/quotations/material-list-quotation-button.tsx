"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import { createQuotationDraftFromMaterialListAction } from "./material-list-quotation-actions";

/** One-click creation of a real draft quotation from the saved material list, plus links to the drafts that already exist. */
export function MaterialListQuotationButton({ organizationId, listId, revisionId, listVersion, itemCount, disabled = false }: Readonly<{
  organizationId: string;
  listId: string;
  revisionId: string;
  listVersion: number;
  itemCount: number;
  disabled?: boolean;
}>) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [key] = useState(() => createIdempotencyKey());
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function create() {
    if (lock.current || disabled || itemCount === 0) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await createQuotationDraftFromMaterialListAction({ organizationId, listId, sourceRevisionId: revisionId, operationId: key.current(), allowAdditional: true });
      if (!result.ok) { setError(result.error); return; }
      key.renew();
      setOpen(false);
      router.push(`/ajanlatok/${result.quotationId}?organization=${organizationId}`);
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod; duplikátum nem jön létre."); }
    finally { lock.current = false; setPending(false); }
  }

  return <section className="material-quotation-handoff" aria-label="Árajánlat ebből az anyaglistából">
    <button type="button" className="secondary-button workflow-material-quotation-button" disabled={pending || disabled || itemCount === 0} onClick={() => { setError(""); setOpen(true); }}><FileText aria-hidden="true" size={17} /> Árajánlat létrehozása</button>
    {itemCount === 0 && <p role="status">Az ajánlathoz előbb vegyél fel legalább egy tételt a listába.</p>}
    {error && !open && <p role="alert" className="form-message is-error">{error}</p>}
    <dialog ref={dialogRef} className="glass-confirmation-dialog material-quotation-dialog" aria-labelledby="material-quotation-title" onCancel={(event) => { event.preventDefault(); if (!pending) setOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget && !pending) setOpen(false); }}>
      <div className="association-dialog-content">
        <div className="section-heading"><div><p className="section-eyebrow">Új piszkozat</p><h2 id="material-quotation-title">Árajánlat az anyaglistából</h2></div><button type="button" className="secondary-button" disabled={pending} onClick={() => setOpen(false)}>Bezárás</button></div>
        <p><FileText aria-hidden="true" size={16} /> A forrás a mentett anyaglista V{listVersion} változata ({itemCount} tétel).</p>
        <p>Az ajánlat piszkozatként készül. A katalógusból igazolt árak átkerülnek; a hiányzó ár hiányzó marad. Nem kerül kiállításra.</p>
        {error && <p role="alert" className="form-message is-error">{error}</p>}
        <div className="form-actions"><button type="button" className="secondary-button" disabled={pending} onClick={() => setOpen(false)}>Mégse</button><button type="button" className="primary-button" disabled={pending} onClick={() => void create()}>{pending ? "Piszkozat készül…" : "Piszkozat létrehozása"}</button></div>
      </div>
    </dialog>
  </section>;
}
