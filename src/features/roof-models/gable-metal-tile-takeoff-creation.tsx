"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { materialCategoryLabels, materialProvenanceLabels, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { createGableMetalTileTakeoffAction, type GableMetalTileTakeoffResult } from "./gable-metal-tile-takeoff-actions";
import type { SavedMetalTileCovering, SavedMetalTileCoveringRevision } from "./gable-metal-tile-covering-data";
import type { GableCoveringTakeoffOption } from "@/features/material-takeoffs/takeoff-data";
import { compatibleGableMetalTileTakeoffOptions, sameOrNewGableMetalTileTakeoffOperation, supportedMetalTileTakeoffRevision } from "./gable-metal-tile-takeoff-ux";

type Props = Readonly<{
  organizationId: string; projectId: string; projectName: string; roofModelId: string;
  currentRoofRevisionId: string | null; currentRoofRevisionNumber: number;
  saved: SavedMetalTileCovering; revision: SavedMetalTileCoveringRevision;
  dirty: boolean; unsavedRoofGeometry: boolean;
  options: readonly GableCoveringTakeoffOption[];
}>;

const format = (value: number, maximumFractionDigits = 3) => new Intl.NumberFormat("hu-HU", { maximumFractionDigits }).format(value);
const provenanceLabel = (value: unknown) => ({
  saved_verified_roof_model_revision: "mentett, ellenőrzött tetőmodell-revízió",
  manual_user_provided: "kézi geometriai adat",
  user_provided: "felhasználó által megadott termékadat",
  server_recomputed: "szerver által újraszámolva",
}[String(value)] ?? String(value ?? "nincs megadva"));

export function GableMetalTileTakeoffCreation(props: Props) {
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

  const eligibility = useMemo(() => supportedMetalTileTakeoffRevision(props.saved, props.revision, props.projectId, props.roofModelId), [props.saved, props.revision, props.projectId, props.roofModelId]);
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
  const transfer = eligibility.transfer;
  const compatibleOptions = compatibleGableMetalTileTakeoffOptions(props.options, transfer);
  const option = compatibleOptions.find((candidate) => candidate.id === variantId) ?? null;
  const retrySignature = option ? JSON.stringify({ organizationId: props.organizationId, projectId: props.projectId, calculationId: props.saved.calculationId, revisionId: props.revision.revisionId, variantId: option.id, name: name.trim() }) : "";
  const showRetry = retry && operation.current?.signature === retrySignature;
  const source = transfer.source!;
  const input = transfer.productInput!;
  const output = transfer.coveringOutput!;
  const staleRoof = source.roofModelRevisionId !== props.currentRoofRevisionId;
  const unsaved = props.dirty || props.unsavedRoofGeometry;
  const provenance = props.revision.provenance && typeof props.revision.provenance === "object" ? props.revision.provenance as Record<string, unknown> : {};
  const modular = input.isModular;
  const moduleText = modular ? `${format(input.moduleBaseLengthMm!)} mm alap + ${format(input.moduleCount!)} × ${format(input.modulePitchMm!)} mm osztás` : "Nem moduláris";
  const openDialog = () => {
    setName(`Anyagkimutatás · ${props.saved.displayName} V${props.revision.revisionNumber}`.slice(0, 200));
    setVariantId(""); setError(""); setSavedRevisionConfirmed(false); setOpen(true);
  };
  const closeDialog = () => { if (!pending) setOpen(false); };

  async function createTakeoff() {
    if (!option || pending || submitting.current || (unsaved && !savedRevisionConfirmed) || !name.trim()) return;
    const payload = { organizationId: props.organizationId, projectId: props.projectId, calculationId: props.saved.calculationId, revisionId: props.revision.revisionId, variantId: option.id, name: name.trim() };
    const signature = JSON.stringify(payload);
    try { operation.current = sameOrNewGableMetalTileTakeoffOperation(operation.current, signature, generateSecureUuid); }
    catch { setError("Biztonságos műveletazonosító nem hozható létre. Frissítsd az oldalt, majd próbáld újra."); return; }
    submitting.current = true; setPending(true); setError("");
    try {
      const result: GableMetalTileTakeoffResult = await createGableMetalTileTakeoffAction({ ...payload, operationId: operation.current.operationId });
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

  const provenanceText = `Geometria: ${provenanceLabel(provenance.geometry)} · Fedési paraméterek: ${provenanceLabel(provenance.productInput ?? provenance.coveringParameters ?? "user_provided")} · Eredmény: ${provenanceLabel("server_recomputed")} · Hosszadat: ${input.lengthDataSource} (${input.lengthCompatibilityConfirmed ? "kézzel ellenőrzött" : "nincs igazolva"})`;

  return <section className="covering-takeoff-entry" aria-label="Cserepeslemez átadása anyagkimutatásba">
    {compatibleOptions.length ? <button type="button" className="primary-button" onClick={openDialog}>Anyagkimutatás készítése</button> : <p className="missing-data" role="status">{props.options.length ? "Nincs a mentett szélességekkel, fizikai lemezhosszal és ismert moduladatokkal egyező db variáns. Ellenőrizd a katalógus méretadatait." : "Nincs aktív, db egységű tetőfedés vagy lemez variáns a műhely katalógusában."}</p>}
    <dialog ref={dialogRef} className="association-dialog" aria-labelledby="metal-tile-takeoff-title" onClick={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
      <div className="association-dialog-content">
        <div className="section-heading"><div><p className="section-eyebrow">Új piszkozat</p><h2 id="metal-tile-takeoff-title">Cserepeslemez átadása anyagkimutatásba</h2></div><button className="secondary-button" type="button" disabled={pending} onClick={closeDialog}>Bezárás</button></div>
        {unsaved && <div className="association-unsaved"><div><strong>Nem mentett szerkesztés van folyamatban.</strong><p>Az átadás a lent megnevezett mentett cserepeslemez-revíziót használja, és nem veszi át a szerkesztés alatt álló értékeket.</p><label><input type="checkbox" checked={savedRevisionConfirmed} disabled={pending} onChange={(event) => setSavedRevisionConfirmed(event.target.checked)} /> A pontos mentett revízió használatát választom.</label><button type="button" className="text-button" onClick={() => { setOpen(false); window.setTimeout(() => document.getElementById(props.unsavedRoofGeometry ? "roof-model-save-button" : "metal-tile-save-button")?.focus(), 0); }}>Szerkesztések mentése előbb</button></div></div>}
        {staleRoof && <p className="form-message is-error" role="alert">A kiválasztott cserepeslemez-számítás egy korábbi tetőrevízióból készült. Az átadás ezt a történeti forrást őrzi meg; a geometria nem frissül automatikusan. Jelenlegi tetőrevízió: V{props.currentRoofRevisionNumber}.</p>}
        <dl className="association-confirmation">
          <div><dt>Projekt</dt><dd>{props.projectName}</dd></div>
          <div><dt>Cserepeslemez-számítás</dt><dd>{props.saved.displayName} · {props.saved.calculationId}</dd></div>
          <div><dt>Kiválasztott változat</dt><dd>V{props.revision.revisionNumber} · {props.revision.revisionId}</dd></div>
          <div><dt>Tetőmodell és forrásrevízió</dt><dd>{source.roofModelId} · {source.roofModelRevisionId}{staleRoof ? " · korábbi forrás" : " · aktuális"}</dd></div>
          <div><dt>Rendelési mennyiség</dt><dd>{output.totalSheetCount} db · {output.columnsPerPlane} oszlop/sík · {output.rowsPerPlane} sor/sík</dd></div>
          <div><dt>Lemezméret</dt><dd>Fizikai {format(input.physicalSheetLengthMm!)} mm · fedési {format(input.effectiveCoveringLengthMm!)} mm</dd></div>
          <div><dt>Névleges / hasznos szélesség</dt><dd>{format(input.nominalSheetWidthMm!)} / {format(input.effectiveCoveringWidthMm!)} mm</dd></div>
          <div><dt>Modulkiosztás</dt><dd>{moduleText}{modular ? " · egyeztetjük a katalógusban rögzített moduladatokat" : ""}</dd></div>
          <div><dt>Forrásadatok eredete</dt><dd>{provenanceText}</dd></div>
        </dl>
        <label className="association-search"><span>Anyagkimutatás neve</span><input value={name} maxLength={200} disabled={pending} onKeyDown={(event) => { if (event.key === "Enter") event.preventDefault(); }} onChange={(event) => setName(event.target.value)} /></label>
        <label className="association-search"><span>Aktív katalógustermék és változat</span><select value={variantId} disabled={pending} onChange={(event) => { setVariantId(event.target.value); setError(""); setRetry(false); }}><option value="">Válassz méretben egyező, db variánst…</option>{compatibleOptions.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.productName} · {candidate.variantName} · {materialCategoryLabels[candidate.productCategory]} · {materialPurchasingUnitLabels.piece}</option>)}</select></label>
        {option && <div className="covering-takeoff-catalog-review"><strong>{option.productName} · {option.variantName}</strong><span>{materialCategoryLabels[option.productCategory]} · {materialPurchasingUnitLabels.piece}</span><span>{option.nominalWidthMm === null ? "Névleges szélesség nincs a katalógusban" : `${format(option.nominalWidthMm)} mm névleges szélesség`} · {option.effectiveWidthMm === null ? "hasznos szélesség nincs megadva" : `${format(option.effectiveWidthMm)} mm hasznos szélesség`} · {option.lengthMm === null ? "fizikai lemezhossz nincs megadva" : `${format(option.lengthMm)} mm fizikai lemezhossz`}</span>{option.latestPrice ? <span>Katalógusár elérhető: {format(option.latestPrice.amount, 2)} {option.latestPrice.currency}/{materialPurchasingUnitLabels[option.latestPrice.purchasingUnit as keyof typeof materialPurchasingUnitLabels] ?? option.latestPrice.purchasingUnit} · {option.latestPrice.effectiveDate}. Az átadás nem rögzíti ezt az árat.</span> : <span>Nincs rögzített katalógusár; a draft ár nélkül készül.</span>}<details><summary>Részletes katalógus- és eredetadatok</summary>{modular && <p>Moduladatok: alap {option.technicalSpecs?.moduleBaseLengthMm ?? "nincs a katalógusban"} mm · osztás {option.technicalSpecs?.modulePitchMm ?? "nincs a katalógusban"} mm · darab {option.technicalSpecs?.moduleCount ?? "nincs a katalógusban"}. A hiányzó katalogizált adatot a kézi forrásadat és az átadási ellenőrzés őrzi.</p>}<p>{option.provenance === "user_provided" ? `Kézi katalógustársítás${option.sourceName ? ` · ${option.sourceName}` : ""}; gyártói kompatibilitás nem igazolt.` : `Katalóguseredet: ${materialProvenanceLabels[option.provenance as keyof typeof materialProvenanceLabels] ?? option.provenance}; a társítás nem gyártói igazolás.`}</p><p>{provenanceText}</p></details></div>}
        {error && <p className="form-message is-error" role="alert">{error}</p>}
        <p className="roof-disclaimer">A megerősítés új anyagkimutatás-piszkozatot készít, a mentett számítási revízió alapján. Nem hagy jóvá kimutatást, nem rögzít árat és nem hoz létre árajánlatot.</p>
        <div className="form-actions"><button className="secondary-button" type="button" disabled={pending} onClick={closeDialog}>Mégse</button><button className="primary-button" type="button" disabled={pending || !option || !name.trim() || (unsaved && !savedRevisionConfirmed)} onClick={() => void createTakeoff()}>{pending ? "Piszkozat készül…" : showRetry ? "Újrapróbálás ugyanazzal a művelettel" : "Új piszkozat megerősítése"}</button></div>
      </div>
    </dialog>
  </section>;
}
