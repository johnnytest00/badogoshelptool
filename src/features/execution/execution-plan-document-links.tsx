"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import type { LinkCandidate, PlanLinkedDocument } from "./execution-document-links";
import { linkExecutionPlanDocumentAction, unlinkExecutionPlanDocumentAction } from "./execution-document-link-actions";

const hrefFor = (organizationId: string, document: Pick<PlanLinkedDocument, "kind" | "documentId">) =>
  `/${document.kind === "material_list" ? "anyaglistak" : "ajanlatok"}/${document.documentId}?organization=${organizationId}`;

/** Work log side of the list/quotation associations: shows linked records and lets the user attach or detach them. */
export function ExecutionPlanDocumentLinks({ organizationId, planId, documents, candidates }: Readonly<{
  organizationId: string;
  planId: string;
  documents: readonly PlanLinkedDocument[];
  candidates: readonly LinkCandidate[];
}>) {
  const router = useRouter();
  const { requestConfirmation, notify } = useAppInteraction();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() => createIdempotencyKey());
  const lock = useRef(false);
  const linkedIds = useMemo(() => new Set(documents.map((document) => `${document.kind}:${document.documentId}`)), [documents]);
  const available = useMemo(() => candidates.filter((candidate) => !linkedIds.has(`${candidate.kind}:${candidate.documentId}`)
    && `${candidate.name} ${candidate.detail}`.toLocaleLowerCase("hu-HU").includes(filter.trim().toLocaleLowerCase("hu-HU"))), [candidates, linkedIds, filter]);

  async function run(task: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await task();
      if (!result.ok) { setError(result.error ?? "A művelet nem sikerült."); return; }
      key.renew(); setSelected(""); setFilter("");
      notify({ kind: "success", message: success });
      router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod; duplikátum nem jön létre."); }
    finally { lock.current = false; setPending(false); }
  }

  async function unlink(document: PlanLinkedDocument) {
    if (!document.linkId) return;
    const accepted = await requestConfirmation({
      title: "Leválasztás a munkanaplóról",
      message: `A „${document.name}” és a munkanapló is megmarad; csak a kapcsolatuk szűnik meg. A kapcsolat később újra létrehozható.`,
      cancelLabel: "Mégse",
      actions: [{ label: "Leválasztás", tone: "danger", run: () => undefined }],
    });
    if (accepted) await run(() => unlinkExecutionPlanDocumentAction({ organizationId, linkId: document.linkId!, planId, kind: document.kind, documentId: document.documentId }), "Leválasztva a munkanaplóról");
  }

  const [kind, documentId] = selected.split(":");
  return <GlassDisclosure className="execution-workflow-links" summary={`Kapcsolt anyaglisták és ajánlatok · ${documents.length}`}>
    {documents.length === 0 ? <p className="missing-data">Még nincs utólag kapcsolt anyaglista vagy ajánlat. A kapcsolás opcionális, és bármikor megszüntethető.</p>
      : <ul className="plan-link-list">{documents.map((document) => <li key={`${document.kind}:${document.documentId}`}>
        <Link href={hrefFor(organizationId, document)}><strong>{document.name}</strong><span>{document.detail}</span></Link>
        <button type="button" className="text-action" disabled={pending} onClick={() => void unlink(document)}>Leválasztás</button>
      </li>)}</ul>}
    <div className="plan-link-form">
      <label className="field-survey-field" htmlFor="plan-documents-filter"><span>Meglévő anyaglista vagy ajánlat keresése</span><input id="plan-documents-filter" type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Név" /></label>
      <label className="field-survey-field" htmlFor="plan-documents-select"><span>Kapcsolandó dokumentum</span><select id="plan-documents-select" value={selected} onChange={(event) => { setSelected(event.target.value); key.renew(); }}><option value="">{available.length ? "Válassz dokumentumot…" : "Nincs találat"}</option>{available.map((candidate) => <option key={`${candidate.kind}:${candidate.documentId}`} value={`${candidate.kind}:${candidate.documentId}`}>{candidate.name} · {candidate.detail}</option>)}</select></label>
      <button type="button" className="primary-button" disabled={!selected || pending} onClick={() => void run(() => linkExecutionPlanDocumentAction({ organizationId, planId, kind: kind as "material_list" | "quotation", documentId, requestKey: key.current() }), "Munkanaplóhoz kapcsolva")}>{pending ? "Kapcsolás…" : "Kapcsolás"}</button>
    </div>
    {error && <p role="alert" className="form-message is-error">{error}</p>}
  </GlassDisclosure>;
}
