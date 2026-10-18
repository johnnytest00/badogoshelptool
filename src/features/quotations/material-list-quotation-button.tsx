"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import type { LinkedQuotationDraft } from "@/features/material-takeoffs/material-list-links";
import { createQuotationDraftFromMaterialListAction } from "./material-list-quotation-actions";

/** One-click creation of a real draft quotation from the saved material list, plus links to the drafts that already exist. */
export function MaterialListQuotationButton({ organizationId, listId, listVersion, itemCount, quotations, disabled = false }: Readonly<{
  organizationId: string;
  listId: string;
  listVersion: number;
  itemCount: number;
  quotations: readonly LinkedQuotationDraft[];
  disabled?: boolean;
}>) {
  const router = useRouter();
  const [key] = useState(() => createIdempotencyKey());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const current = quotations.filter((quotation) => quotation.sourceListVersion === listVersion);
  const earlier = quotations.filter((quotation) => quotation.sourceListVersion !== listVersion);

  async function create(allowAdditional: boolean) {
    if (lock.current || disabled || itemCount === 0) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await createQuotationDraftFromMaterialListAction({ organizationId, listId, operationId: key.current(), allowAdditional });
      if (!result.ok) { setError(result.error); return; }
      key.renew();
      router.push(`/ajanlatok/${result.quotationId}?organization=${organizationId}`);
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod; duplikátum nem jön létre."); }
    finally { lock.current = false; setPending(false); }
  }

  return <section className="material-quotation-handoff" aria-label="Árajánlat ebből az anyaglistából">
    {current.map((quotation) => <p key={quotation.quotationId} className="material-quotation-link"><FileText aria-hidden="true" size={16} /><span>Ajánlat-piszkozat ebből a listaváltozatból: <Link href={`/ajanlatok/${quotation.quotationId}?organization=${organizationId}`}>{quotation.name}</Link>{quotation.status !== "draft" ? ` · ${quotation.status}` : ""}</span></p>)}
    {earlier.map((quotation) => <p key={quotation.quotationId} className="material-quotation-link is-earlier"><FileText aria-hidden="true" size={16} /><span>Korábbi listaváltozatból (V{quotation.sourceListVersion ?? "?"}): <Link href={`/ajanlatok/${quotation.quotationId}?organization=${organizationId}`}>{quotation.name}</Link></span></p>)}
    <div className="material-quotation-actions">
      {current.length === 0
        ? <button type="button" className="primary-button" disabled={pending || disabled || itemCount === 0} onClick={() => void create(false)}>{pending ? "Létrehozás…" : "Árajánlat-piszkozat készítése"}</button>
        : <button type="button" className="secondary-button" disabled={pending || disabled} onClick={() => void create(true)}>{pending ? "Létrehozás…" : "Újabb piszkozat ugyanebből"}</button>}
      <p>{itemCount === 0 ? "Az ajánlathoz előbb vegyél fel legalább egy tételt a listába." : "Az ajánlat piszkozatként készül. A katalógusból igazolt árak átkerülnek; ami nincs megadva, hiányzó ár marad. Nem kerül kiállításra."}</p>
    </div>
    {error && <p role="alert" className="form-message is-error">{error}</p>}
  </section>;
}
