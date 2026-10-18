"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import { laborBasisLabels, type LaborBasis } from "@/domain/quotations/labor-rate";
import type { LaborRateRecord } from "./labor-rate-data";
import { archiveLaborRateAction, createLaborRateAction } from "./labor-rate-actions";

const classLabel = { net: "nettó", gross: "bruttó" } as const;

export function LaborRateSettings({ organizationId, rates, canEdit }: Readonly<{ organizationId: string; rates: readonly LaborRateRecord[]; canEdit: boolean }>) {
  const router = useRouter();
  const [key] = useState(() => createIdempotencyKey());
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<LaborBasis>("roof_area_m2");
  const [priceClass, setPriceClass] = useState<"net" | "gross">("net");
  const [rate, setRate] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);

  async function run(task: () => Promise<{ ok: boolean; error?: string }>, done?: () => void) {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const result = await task();
      if (!result.ok) { setError(result.error ?? "A művelet nem sikerült."); return; }
      done?.(); router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod."); }
    finally { lock.current = false; setPending(false); }
  }
  const active = rates.filter((r) => !r.archived);
  const archived = rates.filter((r) => r.archived);
  return <div className="labor-rate-settings">
    <section className="glass-bubble material-quotation-card" aria-label="Aktív munkadíj-szabályok">
      <h2>Aktív szabályok</h2>
      <p className="plan-link-note">A szabály csak akkor kerül ajánlatba, ha a felhasználó az ajánlatszerkesztőben kifejezetten alkalmazza, ellenőrzött felmérési mennyiségre. ÁFA, kedvezmény és becslés nincs.</p>
      {active.length === 0 ? <p className="plan-link-empty">Még nincs szabály.</p> : <ul className="plan-link-list">{active.map((r) => <li key={r.id}><span><strong>{r.name}</strong><br /><small>{laborBasisLabels[r.basis]} · {Number(r.rateAmount).toLocaleString("hu-HU", { minimumFractionDigits: 2 })} Ft · {classLabel[r.priceClass]}</small></span>{canEdit && <button type="button" className="text-action" disabled={pending} onClick={() => void run(() => archiveLaborRateAction({ organizationId, rateId: r.id }))}>Archiválás</button>}</li>)}</ul>}
      {archived.length > 0 && <details><summary>Archivált szabályok ({archived.length})</summary><ul className="plan-link-list">{archived.map((r) => <li key={r.id}><small>{r.name} · {laborBasisLabels[r.basis]} · {r.rateAmount} Ft · {classLabel[r.priceClass]}</small></li>)}</ul></details>}
    </section>
    {canEdit ? <section className="glass-bubble material-quotation-card" aria-label="Új munkadíj-szabály">
      <h2>Új szabály</h2>
      <p className="plan-link-note">A szabály nem módosítható: változtatáshoz hozz létre újat és archiváld a régit, így a korábbi ajánlatok forrása visszakövethető marad.</p>
      <div className="plan-link-form">
        <label className="field-survey-field"><span>Megnevezés</span><input value={name} maxLength={120} onChange={(e) => { setName(e.target.value); key.renew(); }} placeholder="Például: Tetőfedés munkadíja" /></label>
        <label className="field-survey-field"><span>Mértékegység-alap</span><select value={basis} onChange={(e) => { setBasis(e.target.value as LaborBasis); key.renew(); }}>{(Object.keys(laborBasisLabels) as LaborBasis[]).map((b) => <option key={b} value={b}>{laborBasisLabels[b]}</option>)}</select></label>
        <label className="field-survey-field"><span>Díj (Ft)</span><input inputMode="decimal" value={rate} onChange={(e) => { setRate(e.target.value); key.renew(); }} placeholder="Például: 1500" /></label>
        <label className="field-survey-field"><span>Ár típusa</span><select value={priceClass} onChange={(e) => { setPriceClass(e.target.value as "net" | "gross"); key.renew(); }}><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>
        {error && <p role="alert" className="form-message is-error">{error}</p>}
        <button type="button" className="primary-button" disabled={pending || !name.trim() || !rate.trim()} onClick={() => void run(() => createLaborRateAction({ organizationId, requestKey: key.current(), name, basis, priceClass, rateAmount: rate }), () => { key.renew(); setName(""); setRate(""); })}>{pending ? "Mentés…" : "Szabály mentése"}</button>
      </div>
    </section> : <p className="plan-link-note">A szabályokat tulajdonos vagy adminisztrátor kezelheti.</p>}
    {!canEdit && error && <p role="alert" className="form-message is-error">{error}</p>}
  </div>;
}
