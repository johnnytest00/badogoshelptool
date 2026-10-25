"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { GlassDisclosure } from "@/components/ui/glass-disclosure";
import { useAppInteraction } from "@/components/feedback/app-interaction-provider";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import type { LinkCandidate, PlanLinkedDocument, PlanLinkedDocumentsResult } from "./execution-document-links";
import { linkExecutionPlanDocumentAction, unlinkExecutionPlanDocumentAction } from "./execution-document-link-actions";
import type { ExecutionWorkspaceSection } from "./execution-workspace-read";

const hrefFor = (organizationId: string, document: Pick<PlanLinkedDocument, "kind" | "documentId">) =>
  `/${document.kind === "material_list" ? "anyaglistak" : "ajanlatok"}/${document.documentId}?organization=${organizationId}`;

/** Work log side of the list/quotation associations: shows linked records and lets the user attach or detach them. */
export function ExecutionPlanDocumentLinks({ organizationId, planId, documents, materialListCandidates, quotationCandidates }: Readonly<{
  organizationId: string;
  planId: string;
  documents: PlanLinkedDocumentsResult;
  materialListCandidates: ExecutionWorkspaceSection<readonly LinkCandidate[]>;
  quotationCandidates: ExecutionWorkspaceSection<readonly LinkCandidate[]>;
}>) {
  const router = useRouter();
  const { requestConfirmation, notify } = useAppInteraction();
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [key] = useState(() => createIdempotencyKey());
  const lock = useRef(false);
  const materialDocuments = documents.status === "loaded" ? documents.materialLists : documents;
  const quotationDocuments = documents.status === "loaded" ? documents.quotations : documents;
  const documentRows = [
    ...(materialDocuments.status === "loaded" ? materialDocuments.data : []),
    ...(quotationDocuments.status === "loaded" ? quotationDocuments.data : []),
  ];
  const linkedIds = new Set(documentRows.map((document) => `${document.kind}:${document.documentId}`));
  const candidates = [
    ...(materialListCandidates.status === "loaded" ? materialListCandidates.data : []),
    ...(quotationCandidates.status === "loaded" ? quotationCandidates.data : []),
  ];
  const available = candidates.filter((candidate) => (candidate.kind === "material_list" ? materialDocuments : quotationDocuments).status === "loaded"
    && !linkedIds.has(`${candidate.kind}:${candidate.documentId}`)
    && `${candidate.name} ${candidate.detail}`.toLocaleLowerCase("hu-HU").includes(filter.trim().toLocaleLowerCase("hu-HU")));
  const [kind, documentId] = selected.split(":");
  const selectedDocuments = kind === "material_list" ? materialDocuments : quotationDocuments;
  const canLink = documents.status === "loaded" && selectedDocuments.status === "loaded" && available.length > 0;
  const availableCount = documentRows.length;
  const incompleteDocuments = materialDocuments.status !== "loaded" || quotationDocuments.status !== "loaded";
  const summary = documents.status === "loaded" ? `Kapcsolódó dokumentumok · ${availableCount}${incompleteDocuments ? " · részben nem érhető el" : ""}`
    : `Kapcsolódó dokumentumok · ${documents.status === "access_denied" ? "nincs hozzáférés" : "nem tölthető be"}`;

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

  const candidateWarning = (label: string, result: ExecutionWorkspaceSection<readonly LinkCandidate[]>) => result.status === "loaded" ? null
    : <p className="missing-data" role="alert">{label}: {result.status === "access_denied" ? "nincs hozzáférés" : "nem tölthető be"}{result.status === "unavailable" && <>. <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button></>}</p>;
  return <GlassDisclosure className="execution-workflow-links" defaultOpen={documents.status === "loaded" && documentRows.length > 0} summary={summary}>
    {documents.status === "access_denied" && <p className="missing-data" role="alert">Nincs hozzáférés a kapcsolt dokumentumokhoz. A munkanapló többi része továbbra is elérhető.</p>}
    {documents.status === "unavailable" && <p className="missing-data" role="alert">A kapcsolt dokumentumok átmenetileg nem tölthetők be. <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button></p>}
    {documents.status === "loaded" && materialDocuments.status !== "loaded" && <p className="missing-data" role="alert">A kapcsolt anyaglisták: {materialDocuments.status === "access_denied" ? "nincs hozzáférés" : "nem tölthetők be"}{materialDocuments.status === "unavailable" && <>. <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button></>}</p>}
    {documents.status === "loaded" && quotationDocuments.status !== "loaded" && <p className="missing-data" role="alert">A kapcsolt ajánlatok: {quotationDocuments.status === "access_denied" ? "nincs hozzáférés" : "nem tölthetők be"}{quotationDocuments.status === "unavailable" && <>. <button className="text-action" type="button" onClick={() => router.refresh()}>Újrapróbálás</button></>}</p>}
    {documents.status === "loaded" && !incompleteDocuments && documentRows.length === 0 && <p className="missing-data">Ehhez a naplóhoz nem található látható utólagos anyaglista- vagy ajánlatkapcsolat. A kapcsolás opcionális, és bármikor megszüntethető.</p>}
    {documents.status === "loaded" && documentRows.length > 0 && <ul className="plan-link-list">{documentRows.map((document) => <li key={`${document.kind}:${document.documentId}`}>
        <Link href={hrefFor(organizationId, document)}><strong>{document.name}</strong><span>{document.detail}</span></Link>
        <button type="button" className="text-action" disabled={pending} onClick={() => void unlink(document)}>Leválasztás</button>
      </li>)}</ul>}
    <div className="plan-link-form">
      {candidateWarning("Anyaglista-jelöltek", materialListCandidates)}
      {candidateWarning("Ajánlatjelöltek", quotationCandidates)}
      <label className="field-survey-field" htmlFor="plan-documents-filter"><span>Meglévő anyaglista vagy ajánlat keresése</span><input id="plan-documents-filter" type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Név" /></label>
      <label className="field-survey-field" htmlFor="plan-documents-select"><span>Kapcsolandó dokumentum</span><select id="plan-documents-select" disabled={documents.status !== "loaded" || candidates.length === 0} value={selected} onChange={(event) => { setSelected(event.target.value); key.renew(); }}><option value="">{available.length ? "Válassz dokumentumot…" : materialListCandidates.status !== "loaded" || quotationCandidates.status !== "loaded" ? "A jelöltlista részben nem érhető el" : "Nincs találat"}</option>{available.map((candidate) => <option key={`${candidate.kind}:${candidate.documentId}`} value={`${candidate.kind}:${candidate.documentId}`}>{candidate.name} · {candidate.detail}</option>)}</select></label>
      <button type="button" className="primary-button" disabled={!selected || !canLink || pending} onClick={() => void run(() => linkExecutionPlanDocumentAction({ organizationId, planId, kind: kind as "material_list" | "quotation", documentId, requestKey: key.current() }), "Munkanaplóhoz kapcsolva")}>{pending ? "Kapcsolás…" : "Kapcsolás"}</button>
    </div>
    {error && <p role="alert" className="form-message is-error">{error}</p>}
  </GlassDisclosure>;
}
