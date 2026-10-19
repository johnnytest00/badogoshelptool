"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createIdempotencyKey } from "@/lib/secure-uuid";
import { laborBasisLabels, type LaborBasis, type LaborRate } from "@/domain/quotations/labor-rate";
import { createLaborRateAction, reviseLaborRateAction } from "./labor-rate-actions";

/** One editor for every labor-rate surface (settings and quotation). With `rate` it replaces that rate by a new immutable one; without, it creates one. */
export function LaborRateEditor({ organizationId, rate, onSaved }: Readonly<{ organizationId: string; rate?: LaborRate; onSaved?: () => void }>) {
  const router = useRouter();
  const [key] = useState(() => createIdempotencyKey());
  const [name, setName] = useState(rate?.name ?? "");
  const [basis, setBasis] = useState<LaborBasis>(rate?.basis ?? "roof_area_m2");
  const [priceClass, setPriceClass] = useState<"net" | "gross">(rate?.priceClass ?? "net");
  const [amount, setAmount] = useState(rate ? String(Number(rate.rateAmount)) : "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const touch = () => key.renew();

  async function save() {
    if (lock.current) return;
    lock.current = true; setPending(true); setError("");
    try {
      const input = { organizationId, requestKey: key.current(), name, basis, priceClass, rateAmount: amount };
      const result = rate ? await reviseLaborRateAction({ ...input, rateId: rate.id }) : await createLaborRateAction(input);
      if (!result.ok) { setError(result.error); return; }
      key.renew(); if (!rate) { setName(""); setAmount(""); }
      onSaved?.(); router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod."); }
    finally { lock.current = false; setPending(false); }
  }
  return <div className="plan-link-form">
    <label className="field-survey-field"><span>Megnevezés</span><input value={name} maxLength={120} onChange={(e) => { setName(e.target.value); touch(); }} placeholder="Például: Tetőfedés munkadíja" /></label>
    <label className="field-survey-field"><span>Mértékegység-alap</span><select value={basis} onChange={(e) => { setBasis(e.target.value as LaborBasis); touch(); }}>{(Object.keys(laborBasisLabels) as LaborBasis[]).map((b) => <option key={b} value={b}>{laborBasisLabels[b]}</option>)}</select></label>
    <label className="field-survey-field"><span>Díj (Ft)</span><input inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); touch(); }} placeholder="Például: 1500" /></label>
    <label className="field-survey-field"><span>Ár típusa</span><select value={priceClass} onChange={(e) => { setPriceClass(e.target.value as "net" | "gross"); touch(); }}><option value="net">Nettó</option><option value="gross">Bruttó</option></select></label>
    {rate && <p className="plan-link-note">A szervezet díját módosítja. A már alkalmazott ajánlatsorok és a korábbi ajánlatok a mentett díjat őrzik; az ajánlat egyedi díját a sor egységárában írhatod felül.</p>}
    {error && <p role="alert" className="form-message is-error">{error}</p>}
    <button type="button" className="primary-button" disabled={pending || !name.trim() || !amount.trim()} onClick={() => void save()}>{pending ? "Mentés…" : rate ? "Új díj mentése" : "Szabály mentése"}</button>
  </div>;
}
