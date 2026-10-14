"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { materialCategoryLabels, materialProvenanceLabels, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { createGableCoveringTakeoffAction, type GableCoveringTakeoffResult } from "./gable-trapezoidal-covering-takeoff-actions";
import type { SavedGableCovering, SavedGableCoveringRevision } from "./gable-trapezoidal-covering-data";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import { compatibleGableCoveringTakeoffOptions, sameOrNewGableCoveringTakeoffOperation, supportedTakeoffRevision } from "./gable-covering-takeoff-ux";

type Props = Readonly<{
  organizationId: string; projectId: string; projectName: string; roofModelId: string;
  currentRoofRevisionId: string | null; currentRoofRevisionNumber: number;
  saved: SavedGableCovering; revision: SavedGableCoveringRevision;
  dirty: boolean; unsavedRoofGeometry: boolean;
  options: readonly GableCoveringTakeoffOption[];
}>;

const format = (value: number, maximumFractionDigits = 3) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits }).format(value);
const provenanceLabel = (value: unknown) => {
  const labels: Record<string, string> = {
    saved_verified_roof_model_revision: "ellenőrzött mentett tetőrevízió",
    user_provided: "felhasználó által megadott fedési paraméterek",
    server_recomputed: "szerver által újraszámolva",
    manual_user_provided: "kézi geometriai adat",
  };
  return labels[String(value)] ?? materialProvenanceLabels[String(value) as keyof typeof materialProvenanceLabels] ?? String(value ?? "nincs megadva");
};

export function GableCoveringTakeoffCreation(props: Props) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const submitting = useRef(false);
  const operation = useRef<{ signature: string; operationId: string } | null>(null);
  const sourceIdentity = useRef(`${props.saved.calculationId}:${props.revision.revisionId}`);
  const [open, setOpen] = useState(false);
  const [variantId, setVariantId] = useState("");
  const [name, setName] = useState("");
  const [savedRevisionConfirmed, setSavedRevisionConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(false);

  const eligibility = useMemo(() => supportedTakeoffRevision(props.saved, props.revision, props.projectId, props.roofModelId), [props.saved, props.revision, props.projectId, props.roofModelId]);
  const sourceKey = `${props.saved.calculationId}:${props.revision.revisionId}`;
  useEffect(() => {
    if (sourceIdentity.current === sourceKey) return;
    sourceIdentity.current = sourceKey;
    operation.current = null;
    setVariantId(""); setError(""); setRetry(false); setSavedRevisionConfirmed(false);
  }, [sourceKey]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (event: Event) => { if (pending) event.preventDefault(); else setOpen(false); };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [pending]);

  if (!eligibility.ok) return <p className="missing-data" role="status">Anyagkimutatás-átadás nem érhető el: {eligibility.reason}</p>;
  const { view } = eligibility;
  const covering = view.covering;
  const compatibleOptions = compatibleGableCoveringTakeoffOptions(props.options, {
    nominalWidthMm: view.coveringInput.nominalSheetWidthMm,
    effectiveWidthMm: view.coveringInput.effectiveCoveringWidthMm,
    lengthMm: view.coveringInput.selectedSheetLengthMm,
  });
  const option = compatibleOptions.find((candidate) => candidate.id === variantId) ?? null;
  const retrySignature = option ? JSON.stringify({
    organizationId: props.organizationId, projectId: props.projectId, calculationId: props.saved.calculationId,
    revisionId: props.revision.revisionId, variantId: option.id, name: name.trim(),
  }) : "";
  const showRetry = retry && operation.current?.signature === retrySignature;
  const staleRoof = view.roofModelRevisionId !== props.currentRoofRevisionId;
  const unsaved = props.dirty || props.unsavedRoofGeometry;
  const provenance = props.revision.provenance && typeof props.revision.provenance === "object"
    ? props.revision.provenance as Record<string, unknown> : {};
  const completeDimensions = option && option.nominalWidthMm !== null && option.effectiveWidthMm !== null && option.lengthMm !== null;
  const openDialog = () => {
    setName(`Anyagkimutatás · ${props.saved.displayName} V${props.revision.revisionNumber}`.slice(0, 200));
    setVariantId(""); setError(""); setSavedRevisionConfirmed(false); setOpen(true);
  };
  const closeDialog = () => { if (pending) return; setOpen(false); };

  async function createTakeoff() {
    if (!option || pending || submitting.current || (unsaved && !savedRevisionConfirmed) || !name.trim()) return;
    const payload = {
      organizationId: props.organizationId, projectId: props.projectId,
      calculationId: props.saved.calculationId, revisionId: props.revision.revisionId,
      variantId: option.id, name: name.trim(),
    };
    const signature = JSON.stringify(payload);
    try {
      operation.current = sameOrNewGableCoveringTakeoffOperation(operation.current, signature, generateSecureUuid);
    } catch {
      setError("Biztonságos műveletazonosító nem hozható létre. Frissítsd az oldalt, majd próbáld újra.");
      return;
    }
    submitting.current = true; setPending(true); setError("");
    try {
      const result: GableCoveringTakeoffResult = await createGableCoveringTakeoffAction({ ...payload, operationId: operation.current.operationId });
      if (!result.ok) {
        if (result.code === "NETWORK_ERROR") setRetry(true);
        else { operation.current = null; setRetry(false); }
        setError(result.error ?? "Az anyagkimutatás-piszkozat létrehozása nem sikerült.");
        return;
      }
      operation.current = null;
      if (result.takeoffUrl) router.push(result.takeoffUrl);
      else setError("A piszkozat létrejött, de a megnyitási hivatkozás hiányzik. Nyisd meg a projekt anyagkimutatását.");
    } catch {
      setRetry(true);
      setError("A válasz nem érkezett meg; az ismétlés ugyanazzal a műveletazonosítóval folytatja ezt az átadást.");
    } finally { submitting.current = false; setPending(false); }
  }

  const provenanceText = [
    `Geometria: ${provenanceLabel(provenance.geometry)}`,
    `Fedési paraméterek: ${provenanceLabel(provenance.coveringParameters)}`,
    `Mennyiség: ${provenanceLabel(provenance.calculation)}`,
    provenance.professionalApproval === false ? "Szakmai jóváhagyás: nincs" : null,
  ].filter(Boolean).join(" · ");
  const nominalArea = covering.purchasedNominalAreaMm2 === null ? null : covering.purchasedNominalAreaMm2 / 1_000_000;

  return <section className="covering-takeoff-entry" aria-label="Fedés átadása anyagkimutatásba">
    {compatibleOptions.length ? <button type="button" className="primary-button" onClick={openDialog}>Anyagkimutatás készítése</button> : <p className="missing-data" role="status">{props.options.length
      ? "Nincs a mentett szélességekkel és lemezhosszal egyező db variáns. Ellenőrizd a katalógus méretadatait; ismert, eltérő méretű termék nem rendelhető ehhez a kiosztáshoz."
      : "Nincs aktív, db egységű tetőfedés vagy lemez variáns a műhely katalógusában."}</p>}
    <dialog ref={dialogRef} className="association-dialog" aria-labelledby="covering-takeoff-title" onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div className="association-dialog-content">
        <div className="section-heading"><div><p className="section-eyebrow">Új piszkozat</p><h2 id="covering-takeoff-title">Fedés átadása anyagkimutatásba</h2></div><button className="secondary-button" type="button" disabled={pending} onClick={closeDialog}>Bezárás</button></div>
        {unsaved && <div className="association-unsaved"><div><strong>Nem mentett szerkesztés van folyamatban.</strong><p>A lemezkiosztás ezt nem tartalmazza. Az átadás kizárólag a lent megnevezett mentett fedési revízióból készül.</p><label><input type="checkbox" checked={savedRevisionConfirmed} disabled={pending} onChange={(event) => setSavedRevisionConfirmed(event.target.checked)} /> A pontos mentett revízió használatát választom.</label><button type="button" className="text-button" onClick={() => { setOpen(false); window.setTimeout(() => document.getElementById(props.unsavedRoofGeometry ? "roof-model-save-button" : "covering-save-button")?.focus(), 0); }}>Szerkesztések mentése előbb</button></div></div>}
        {staleRoof && <p className="form-message is-error" role="alert">A kiválasztott fedés a tetőmodell régebbi forrásrevíziójára épül. Az átadás ezt a történeti forrást őrzi meg; a geometria nem frissül automatikusan.</p>}
        <dl className="association-confirmation">
          <div><dt>Projekt</dt><dd>{props.projectName}</dd></div>
          <div><dt>Fedési számítás</dt><dd>{props.saved.displayName} · {props.saved.calculationId}</dd></div>
          <div><dt>Kiválasztott változat</dt><dd>V{props.revision.revisionNumber} · {props.revision.revisionId}</dd></div>
          <div><dt>Tetőmodell</dt><dd>{props.saved.roofModelId}</dd></div>
          <div><dt>Forrás tetőrevízió</dt><dd>{view.roofModelRevisionId}{staleRoof ? ` · elavult, jelenlegi V${props.currentRoofRevisionNumber}` : " · aktuális"}</dd></div>
          <div><dt>Rendelési mennyiség</dt><dd>{covering.totalSheetCount} db (piece)</dd></div>
          <div><dt>Lemezhossz</dt><dd>{format(view.coveringInput.selectedSheetLengthMm!)} mm</dd></div>
          <div><dt>Névleges szélesség</dt><dd>{format(view.coveringInput.nominalSheetWidthMm!)} mm</dd></div>
          <div><dt>Hasznos fedési szélesség</dt><dd>{format(view.coveringInput.effectiveCoveringWidthMm!)} mm</dd></div>
          <div><dt>Tetőfelület · műszaki adat</dt><dd>{format(covering.totalRoofAreaMm2 / 1_000_000)} m²</dd></div>
          {nominalArea !== null && <div><dt>Névleges lemezterület · műszaki adat</dt><dd>{format(nominalArea)} m² · nem igazolt vágási veszteség</dd></div>}
          <div><dt>Forrásadatok eredete</dt><dd>{provenanceText}</dd></div>
        </dl>
        <label className="association-search"><span>Anyagkimutatás neve</span><input value={name} maxLength={200} disabled={pending} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} onChange={(event) => setName(event.target.value)} /></label>
        <label className="association-search"><span>Aktív katalógus termék és változat</span><select value={variantId} disabled={pending} onChange={(event) => { setVariantId(event.target.value); setError(""); setRetry(false); }}><option value="">Válassz méretben egyező, db variánst…</option>{compatibleOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.productName} · {candidate.variantName} · {candidate.productCategory === "roof_covering" ? materialCategoryLabels.roof_covering : materialCategoryLabels.sheet_metal} · {candidate.purchasingUnit}</option>)}</select></label>
        {option && <div className="covering-takeoff-catalog-review"><strong>{option.productName} · {option.variantName}</strong><span>{materialCategoryLabels[option.productCategory]} · {materialPurchasingUnitLabels.piece}</span><span>{option.nominalWidthMm === null ? "Névleges szélesség nincs megadva" : `${format(option.nominalWidthMm)} mm névleges szélesség`} · {option.effectiveWidthMm === null ? "hasznos szélesség nincs megadva" : `${format(option.effectiveWidthMm)} mm hasznos szélesség`} · {option.lengthMm === null ? "hossz nincs megadva" : `${format(option.lengthMm)} mm hossz`}</span><span>{option.provenance === "user_provided" ? `Kézi katalógustársítás${option.sourceName ? ` · ${option.sourceName}` : ""}; gyártói kompatibilitás nem igazolt.` : `Katalóguseredet: ${materialProvenanceLabels[option.provenance as keyof typeof materialProvenanceLabels] ?? option.provenance}; a társítás nem gyártói igazolás.`}</span><span>{option.latestPrice ? `Katalógusár elérhető: ${format(option.latestPrice.amount, 2)} ${option.latestPrice.currency}/${materialPurchasingUnitLabels[option.latestPrice.purchasingUnit as keyof typeof materialPurchasingUnitLabels] ?? option.latestPrice.purchasingUnit} · ${option.latestPrice.effectiveDate}. Az átadás nem rögzíti ezt az árat.` : "Nincs rögzített katalógusár; a draft ár nélkül készül."}</span>{!completeDimensions && <span className="missing-data">A katalógus méretadatai hiányosak; a kézi társítás felhasználói adatként kerül mentésre.</span>}</div>}
        {error && <p className="form-message is-error" role="alert">{error}{error.includes("nem érhető el") && <button className="secondary-button" type="button" disabled={pending} onClick={() => window.location.reload()}>Frissítés és újraellenőrzés</button>}</p>}
        <p className="roof-disclaimer">A megerősítés új anyagkimutatás-piszkozatot készít. Nem hagy jóvá kimutatást és nem hoz létre árajánlatot. A rendelési mennyiség darab; a területadatok csak műszaki hivatkozások.</p>
        <div className="form-actions"><button className="secondary-button" type="button" disabled={pending} onClick={closeDialog}>Mégse</button><button className="primary-button" type="button" disabled={pending || !option || !name.trim() || (unsaved && !savedRevisionConfirmed)} onClick={() => void createTakeoff()}>{pending ? "Piszkozat készül…" : showRetry ? "Újrapróbálás ugyanazzal a művelettel" : "Új piszkozat megerősítése"}</button></div>
      </div>
    </dialog>
  </section>;
}
