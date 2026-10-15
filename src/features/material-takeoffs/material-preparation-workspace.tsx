"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { aggregateMaterialRequirements, type MaterialSourceTakeoff } from "@/domain/material-takeoffs/aggregation";
import { materialPurchasingUnitLabels, type MaterialPurchasingUnit } from "@/domain/materials/contracts";

type TargetQuote = Readonly<{ id: string; name: string; version: number }>;

export function MaterialPreparationWorkspace({ organizationId, projectId, takeoffs, draftQuotations }: Readonly<{
  organizationId: string;
  projectId: string;
  takeoffs: readonly MaterialSourceTakeoff[];
  draftQuotations: readonly TargetQuote[];
}>) {
  const router = useRouter();
  const approved = takeoffs.filter((takeoff) => takeoff.status === "approved");
  const [selected, setSelected] = useState<string[]>([]);
  const [quotationId, setQuotationId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const requirements = useMemo(() => aggregateMaterialRequirements(takeoffs, selected), [takeoffs, selected]);
  const sourceCount = requirements.reduce((count, row) => count + row.sources.length, 0);

  function toggleSource(id: string, checked: boolean) {
    setSelected((current) => checked ? [...current, id] : current.filter((item) => item !== id));
    setError("");
  }

  function continueToQuotation() {
    if (pending || requirements.length === 0) return;
    const sourceIds = requirements.flatMap((row) => row.sources.map((source) => source.itemId));
    if (sourceIds.length > 100) {
      setError("Egy árajánlati előkészítéshez legfeljebb 100 forrást válassz. Bontsd több részre a hosszú listát.");
      return;
    }
    setPending(true);
    const query = new URLSearchParams({ organization: organizationId, takeoffItems: sourceIds.join(","), operationId: crypto.randomUUID() });
    if (quotationId) query.set("edit", quotationId);
    else query.set("new", "1");
    router.push(`/projektek/${projectId}/ajanlatok?${query.toString()}`);
  }

  return <section className="detail-surface material-preparation" aria-labelledby="material-preparation-title">
    <div className="section-heading"><div><p className="section-eyebrow">Projekt-előkészítés</p><h2 id="material-preparation-title">Anyagok és költségek</h2><p className="detail-description">Válassz jóváhagyott anyagkimutatásokat. A piszkozatok nem kerülnek az összesítésbe.</p></div></div>
    {approved.length === 0 ? <p className="missing-data">Még nincs jóváhagyott anyagkimutatás. A piszkozatot előbb az illetékes műhelytag hagyja jóvá.</p> : <div className="material-preparation-sources">
      <fieldset><legend>1. Anyagok áttekintése · források</legend>{approved.map((takeoff) => {
        const stale = takeoff.sourceRevisionId !== takeoff.sourceCurrentRevisionId;
        return <label className="material-preparation-source" key={takeoff.id}>
          <input type="checkbox" checked={selected.includes(takeoff.id)} onChange={(event) => toggleSource(takeoff.id, event.target.checked)} />
          <span><strong>{takeoff.name}</strong><small>{takeoff.items.length} tétel · V{takeoff.version} · számítási revízió {takeoff.sourceRevisionId.slice(0, 8)}{stale ? " · régebbi számítási forrás" : ""}</small></span>
        </label>;
      })}</fieldset>
      {takeoffs.some((takeoff) => takeoff.status === "draft") && <details><summary>Piszkozat kimutatások · nem vehetők át</summary><ul>{takeoffs.filter((takeoff) => takeoff.status === "draft").map((takeoff) => <li key={takeoff.id}>{takeoff.name} · V{takeoff.version}: jóváhagyás szükséges az átvételhez.</li>)}</ul></details>}
      {requirements.length > 0 && <><div className="material-preparation-list"><div className="section-heading"><h3>Összevont anyagigény</h3><small>{sourceCount} forrástétel · {requirements.length} kompatibilis csoport</small></div>{requirements.map((row) => {
        const dimensions = [row.dimensions.lengthMm != null ? `${String(row.dimensions.lengthMm)} mm hossz` : null, row.dimensions.nominalWidthMm != null ? `${String(row.dimensions.nominalWidthMm)} mm névleges szélesség` : null, row.dimensions.effectiveWidthMm != null ? `${String(row.dimensions.effectiveWidthMm)} mm hasznos szélesség` : null, row.dimensions.thicknessMm != null ? `${String(row.dimensions.thicknessMm)} mm vastagság` : null, ...Object.entries(row.dimensions.technicalSpecs as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`)].filter(Boolean);
        const priceLabel = row.priceState === "missing" ? "Ár nincs rögzítve" : row.priceState === "mixed" ? "Eltérő árforrások · az ajánlathoz egységár kell" : `${row.unitPrice} HUF/${materialPurchasingUnitLabels[row.unit as MaterialPurchasingUnit] ?? row.unit} · ${row.priceKind === "gross" ? "bruttó" : "nettó"} forrásár`;
        return <article className="material-preparation-row" key={row.key}>
          <div><strong>{row.productName} · {row.variantName}</strong><small>{row.sku ? `Cikkszám: ${row.sku} · ` : ""}{row.sources.length} forrás · {row.sources.filter((source) => source.stale).length ? "régebbi számítási pillanatkép" : "jóváhagyott forrás"}</small>
            {dimensions.length > 0 && <details><summary>Méretek és műszaki adatok</summary><p>{dimensions.join(" · ")}</p></details>}
            <small>{priceLabel}</small>
            <details><summary>Források és revíziók</summary><ul>{row.sources.map((source) => <li key={source.itemId}>{source.takeoffName} · V{source.takeoffVersion} · számítás {source.calculationRevisionId} · {source.quantity} {source.unit} · árpillanatkép {source.priceSnapshot?.id ?? "nincs"}</li>)}</ul></details>
          </div><strong className="material-preparation-quantity">{row.quantity} {materialPurchasingUnitLabels[row.unit as MaterialPurchasingUnit] ?? row.unit}</strong>
        </article>;
      })}</div>
      <div className="material-preparation-costs"><label className="field-survey-field"><span>Árajánlati piszkozat</span><select value={quotationId} onChange={(event) => setQuotationId(event.target.value)}><option value="">Új piszkozat</option>{draftQuotations.map((quote) => <option value={quote.id} key={quote.id}>{quote.name} · v{quote.version}</option>)}</select></label><p>2. A költségszerkesztőben ellenőrizd a rögzített árakat, add meg a hiányzó egységárakat, valamint a kézi anyag-, munkadíj- és egyéb tételeket. Az ár nélküli anyaglista itt megmarad; üres vagy nulla árral nem készül automatikus ajánlat.</p>
        <button className="primary-button" type="button" disabled={pending} onClick={continueToQuotation}>{pending ? "Megnyitás…" : "Költségek megadása és átvétel"}</button>
      </div></>}
      {error && <p className="form-message is-error" role="alert">{error}</p>}
      {selected.length > 0 && requirements.length === 0 && <p className="missing-data">A kiválasztott forrásokban nincs összevonható anyagtétel.</p>}
    </div>}
  </section>;
}
