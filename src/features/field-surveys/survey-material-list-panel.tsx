"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PackageOpen } from "lucide-react";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { createIdempotencyKey, generateSecureUuid } from "@/lib/secure-uuid";
import { saveWorkflowMaterialListAction } from "@/features/material-takeoffs/workflow-material-list-actions";
import { MaterialListQuotationButton } from "@/features/quotations/material-list-quotation-button";
import { defaultSurveyMaterialListName, type SurveyMaterialSource } from "@/features/material-takeoffs/survey-material-source";
import type { SurveyLinkedMaterialList } from "@/features/material-takeoffs/material-list-links";

type CreatedList = Readonly<{ listId: string; name: string; version: number; itemCount: number }>;

/**
 * Inline creation panel under the survey editor. It only offers quantities derived from the exact saved
 * survey revision (measured run lengths, verified roof area) and persists through the existing
 * survey-sourced material list save, which records the revision as immutable provenance.
 */
export const SurveyMaterialListPanel = forwardRef<HTMLElement, Readonly<{
  organizationId: string;
  savedVersion: number;
  source: SurveyMaterialSource | null;
  linkedLists: readonly SurveyLinkedMaterialList[];
  unsaved: boolean;
  preparing: boolean;
  onClose: () => void;
}>>(function SurveyMaterialListPanel({ organizationId, savedVersion, source, linkedLists, unsaved, preparing, onClose }, ref) {
  const router = useRouter();
  const ready = Boolean(source) && source!.surveyVersion === savedVersion && !preparing;
  const [excluded, setExcluded] = useState<ReadonlySet<string>>(new Set());
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [key] = useState(() => createIdempotencyKey());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<CreatedList | null>(null);
  const [addAnother, setAddAnother] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (source && !nameTouched) setName(defaultSurveyMaterialListName(source));
  }, [source, nameTouched]);

  if (!ready || !source) {
    return <section ref={ref} id="survey-material-list-panel" tabIndex={-1} className="glass-bubble survey-material-panel" aria-labelledby="survey-material-panel-title" aria-busy="true">
      <h2 id="survey-material-panel-title">Anyaglista készítése</h2>
      <p role="status">A mentett felmérésváltozat előkészítése…</p>
    </section>;
  }

  const included = source.suggestions.filter((suggestion) => !excluded.has(suggestion.key));
  const existingForRevision = linkedLists.filter((list) => list.surveyVersion === source.surveyVersion);
  const showCreate = !created && (existingForRevision.length === 0 || addAnother);
  const canCreate = !unsaved && !pending && included.length > 0 && name.trim().length > 0;

  function toggle(suggestionKey: string, checked: boolean) {
    key.renew();
    setExcluded((current) => { const next = new Set(current); if (checked) next.delete(suggestionKey); else next.add(suggestionKey); return next; });
  }

  async function create() {
    if (lock.current || !canCreate || !source) return;
    lock.current = true; setPending(true); setError("");
    const items = included.map((suggestion) => ({
      id: generateSecureUuid(), kind: "manual", description: suggestion.description, materialCategory: suggestion.materialCategory,
      categoryId: null, quantity: suggestion.quantity, unit: suggestion.unit, variantId: null, priceId: null,
      manualPriceAmount: "", manualPriceKind: null, sourceRef: suggestion.sourceRef,
    }));
    const form = new FormData();
    form.set("organizationId", organizationId); form.set("listId", ""); form.set("executionPlanId", ""); form.set("name", name.trim());
    form.set("expectedVersion", "0"); form.set("requestKey", key.current()); form.set("items", JSON.stringify(items));
    form.set("sourceSurveyId", source.surveyId); form.set("sourceSurveyRevisionId", source.surveyRevisionId);
    form.set("sourceSurveyVersion", String(source.surveyVersion)); form.set("allowStaleSource", "false");
    try {
      const result = await saveWorkflowMaterialListAction({ ok: false }, form);
      if (!result.ok || !result.listId) { setError(result.error ?? "Az anyaglista létrehozása nem sikerült."); return; }
      key.renew();
      setCreated({ listId: result.listId, name: name.trim(), version: result.version ?? 1, itemCount: items.length });
      router.refresh();
    } catch { setError("A válasz bizonytalan. Ugyanazzal a gombbal biztonságosan újrapróbálhatod; duplikátum nem jön létre."); }
    finally { lock.current = false; setPending(false); }
  }

  return <section ref={ref} id="survey-material-list-panel" tabIndex={-1} className="glass-bubble survey-material-panel" aria-labelledby="survey-material-panel-title">
    <div className="survey-material-panel-heading">
      <div className="workflow-source-heading"><span className="workflow-source-mark" aria-hidden="true"><PackageOpen size={17} /></span><div><h2 id="survey-material-panel-title">Anyaglista készítése</h2><p>Forrás: {source.surveyName} · V{source.surveyVersion} · mentett, változtathatatlan felmérésrevízió</p></div></div>
      <button type="button" className="secondary-button" onClick={onClose}>Bezárás</button>
    </div>

    {!created && existingForRevision.length > 0 && <div className="survey-material-panel-existing" role="status">
      <strong>Ehhez a felmérésváltozathoz már készült anyaglista</strong>
      <ul>{existingForRevision.map((list) => <li key={list.listId}><Link href={`/anyaglistak/${list.listId}?organization=${organizationId}`}>{list.name}</Link> · V{list.version} · {list.itemCount} tétel{list.quotations.length > 0 && <> · ajánlat: {list.quotations.map((quotation, index) => <span key={quotation.quotationId}>{index > 0 && ", "}<Link href={`/ajanlatok/${quotation.quotationId}?organization=${organizationId}`}>{quotation.name}</Link></span>)}</>}</li>)}</ul>
      {!addAnother && !created && <button type="button" className="secondary-button" onClick={() => setAddAnother(true)}>Új, külön anyaglista készítése</button>}
    </div>}
    {linkedLists.filter((list) => list.surveyVersion !== source.surveyVersion).length > 0 && <details className="workflow-source-unavailable"><summary>Korábbi felmérésváltozatból készült listák ({linkedLists.filter((list) => list.surveyVersion !== source.surveyVersion).length})</summary><ul>{linkedLists.filter((list) => list.surveyVersion !== source.surveyVersion).map((list) => <li key={list.listId}><Link href={`/anyaglistak/${list.listId}?organization=${organizationId}`}>{list.name}</Link> · felmérés V{list.surveyVersion} alapján</li>)}</ul></details>}

    {created && <div className="survey-material-panel-done" role="status">
      <strong>Anyaglista létrehozva · {created.name}</strong>
      <p>{created.itemCount} tétel, a felmérés V{source.surveyVersion} változatához kapcsolva. Az árakat és katalógustermékeket az anyaglistában adhatod meg.</p>
      <div className="survey-material-panel-actions"><Link className="secondary-button" href={`/anyaglistak/${created.listId}?organization=${organizationId}`}>Anyaglista megnyitása</Link></div>
      <MaterialListQuotationButton organizationId={organizationId} listId={created.listId} listVersion={created.version} itemCount={created.itemCount} quotations={[]} />
    </div>}

    {showCreate && <>
      {unsaved && <p className="form-message is-error" role="alert">Mentetlen módosításaid vannak. Mentsd a felmérést, hogy az anyaglista a legfrissebb adatokat használja.</p>}
      <div className="survey-material-panel-lines">
        <h3>Átvehető, ellenőrzött mennyiségek</h3>
        {source.suggestions.length === 0
          ? <p className="workflow-source-warning" role="status">Ebből a felmérésváltozatból most nincs biztonságosan átvehető mennyiség. Kézi tételekkel kitöltve az anyaglista-szerkesztőben folytathatod.</p>
          : <ul>{source.suggestions.map((suggestion) => <li key={suggestion.key}><label><input type="checkbox" checked={!excluded.has(suggestion.key)} onChange={(event) => toggle(suggestion.key, event.target.checked)} /><span><strong>{suggestion.description}</strong><small>{Number(suggestion.quantity).toLocaleString("hu-HU", { maximumFractionDigits: 6 })} {materialPurchasingUnitLabels[suggestion.unit]} · {suggestion.quantityKind === "measured" ? "mért adat" : "ellenőrzött számítás"} · {suggestion.sourceLabel}</small></span></label></li>)}</ul>}
        <p className="survey-material-panel-note">Csak mért szakaszhossz és ellenőrzött tetőfelület kerül át. Szálhossz, toldás, átfedés, veszteség és darabszám nem becsült; azt az anyaglistában, termékkel és kézzel adhatod meg.</p>
        {source.unavailable.some((reason) => reason.includes("nyeregtető")) && <p className="survey-material-panel-note">A tetőfelület jelenleg csak nyeregtetőnél, a felmérésváltozathoz kapcsolt, ellenőrzött tetőmodell-revízióból vehető át (a „További műveletek” alatt). Más tetőformánál a felületet kézi tételként add meg az anyaglistában.</p>}
        {source.unavailable.length > 0 && <details className="workflow-source-unavailable"><summary>Nem átvehető mérések ({source.unavailable.length})</summary><ul>{source.unavailable.map((reason) => <li key={reason}>{reason}</li>)}</ul></details>}
      </div>
      <label className="field-survey-field"><span>Anyaglista neve</span><input value={name} maxLength={120} onChange={(event) => { setNameTouched(true); key.renew(); setName(event.target.value); }} /></label>
      {error && <p role="alert" className="form-message is-error">{error}</p>}
      <div className="survey-material-panel-actions">
        <button type="button" className="primary-button" disabled={!canCreate} onClick={() => void create()}>{pending ? "Létrehozás…" : "Anyaglista létrehozása"}</button>
        {source.suggestions.length === 0 && <Link className="secondary-button" href={`/anyaglistak/uj?organization=${organizationId}&surveyId=${source.surveyId}&surveyVersion=${source.surveyVersion}`}>Kézi tételekkel folytatom</Link>}
      </div>
    </>}
  </section>;
});
