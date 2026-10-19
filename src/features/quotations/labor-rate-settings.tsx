"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { laborBasisLabels } from "@/domain/quotations/labor-rate";
import type { LaborRateRecord } from "./labor-rate-data";
import { archiveLaborRateAction } from "./labor-rate-actions";
import { LaborRateEditor } from "./labor-rate-editor";

const classLabel = { net: "nettó", gross: "bruttó" } as const;

export function LaborRateSettings({ organizationId, rates, canEdit }: Readonly<{ organizationId: string; rates: readonly LaborRateRecord[]; canEdit: boolean }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  async function archive(rateId: string) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await archiveLaborRateAction({ organizationId, rateId });
      if (!result.ok) { setError(result.error); return; }
      router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod."); }
    finally { lock.current = false; setPending(false); }
  }
  const active = rates.filter((r) => !r.archived);
  const archived = rates.filter((r) => r.archived);
  return <div className="labor-rate-settings">
    <section className="glass-bubble material-quotation-card" aria-label="Aktív munkadíj-szabályok">
      <h2>Aktív szabályok</h2>
      <p className="plan-link-note">A szabály csak akkor kerül ajánlatba, ha a felhasználó az ajánlatszerkesztőben kifejezetten alkalmazza, ellenőrzött felmérési mennyiségre. ÁFA, kedvezmény és becslés nincs. A díj módosítása új szabályt hoz létre és archiválja a régit, így a korábbi ajánlatok forrása visszakövethető marad.</p>
      {active.length === 0 ? <p className="plan-link-empty">Még nincs szabály.</p> : <ul className="plan-link-list">{active.map((r) => <li key={r.id}>
        <span><strong>{r.name}</strong><br /><small>{laborBasisLabels[r.basis]} · {Number(r.rateAmount).toLocaleString("hu-HU", { minimumFractionDigits: 2 })} Ft · {classLabel[r.priceClass]}</small>
          {canEdit && <details><summary>Díj szerkesztése</summary><LaborRateEditor organizationId={organizationId} rate={r} /></details>}</span>
        {canEdit && <button type="button" className="text-action" disabled={pending} onClick={() => void archive(r.id)}>Archiválás</button>}</li>)}</ul>}
      {archived.length > 0 && <details><summary>Archivált szabályok ({archived.length})</summary><ul className="plan-link-list">{archived.map((r) => <li key={r.id}><small>{r.name} · {laborBasisLabels[r.basis]} · {r.rateAmount} Ft · {classLabel[r.priceClass]}</small></li>)}</ul></details>}
    </section>
    {canEdit ? <section className="glass-bubble material-quotation-card" aria-label="Új munkadíj-szabály">
      <h2>Új szabály</h2>
      <LaborRateEditor organizationId={organizationId} />
    </section> : <p className="plan-link-note">A szabályokat tulajdonos vagy adminisztrátor kezelheti.</p>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
  </div>;
}
