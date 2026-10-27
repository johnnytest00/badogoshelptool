"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { QuotationSaveBar, quotationSaveState } from "./quotation-save-bar";
import { decimalToScaled, lineTotal, scaledToDecimal } from "@/domain/quotations/money";
import { validateStandaloneLines } from "@/domain/quotations/standalone";
import { useAppInteraction, useUnsavedChangeGuard } from "@/components/feedback/app-interaction-provider";
import { GuardedLink as Link } from "@/components/navigation/guarded-link";
import { generateSecureUuid } from "@/lib/secure-uuid";
import { materialProvenanceLabels, materialPurchasingUnitLabels } from "@/domain/materials/contracts";
import { getStandaloneSaveOperation, isHistoricalStandaloneRevision, standaloneManualRecipient, type StandaloneSaveOperation } from "./standalone-quotation-ui-state";
import { quotationRecoveryKey, readQuotationRecovery, writeQuotationRecovery, isQuotationRecoveryCurrent, clearOtherQuotationRecoveryOwners, type QuotationRecovery, type QuotationDraftValues } from "./quotation-draft-recovery";
import { resolveStandaloneQuotationCatalogItemAction, saveStandaloneQuotationDraftAction, updateStandaloneIssuerProfileAction, validateStandaloneQuotationDocumentAction, type StandaloneDocumentSources, type StandaloneQuotationResult } from "./standalone-quotation-actions";
import type { MaterialProductRecord } from "@/features/materials/material-data";
import { defaultPrice, priceChoices, priceChoiceLabel, selectablePrices, supplierLabel } from "@/domain/pricing";
import type { MaterialCategoryRecord } from "@/features/materials/material-data";
import { searchMaterialProductsAction } from "@/features/materials/material-actions";
import { WorkflowMaterialProductPicker, type WorkflowMaterialProductOption } from "@/features/material-takeoffs/workflow-material-product-picker";
import { catalogReplacementNeedsConfirmation, changeQuotationMaterialCategory, quotationMaterialLinkState, quotationPricesEqual, quotationPurchasingUnitLabel, quotationPurchasingUnitsMatch } from "./quotation-material-state";
import { emptyQuotationDocumentDraft, validateQuotationDocumentReadiness, type DocumentReadiness, type IssuerDocumentProfile, type QuotationDocumentDraft } from "@/domain/quotations/document-readiness";
import { BackNavigation } from "@/components/navigation/back-navigation";
import { LaborRatePanel } from "./labor-rate-panel";
import { quotationQuantity, type CalculationQuoteCandidate, type QuotationCalculationSource } from "./calculation-quotation-source";
import { appliedLaborKeys, quantityAtSix, sameQuantity, type LaborBase, type LaborRate } from "@/domain/quotations/labor-rate";

type Line = QuotationDraftValues["lines"][number];
type EditorLine = Line & { localId: string };
type Revision = { id: string; revisionNumber: number; createdAt: string; subtotal: string | null };
type CurrentRevision = { id: string; revision_number: number; input_snapshot: unknown; line_items_snapshot: unknown; subtotal: string | number | null; currency: string; price_class: "net" | "gross" | null };
const empty = (type: Line["type"]): Line => ({ type, description: "", quantity: "", unit: "", unitPrice: "", priceClass: "net", variantId: "", categoryId: "", priceId: "", takeoffItemId: "", sourceMaterialItemId: "", priceProvenance: "missing", notes: "" });
const toPersistedLine = (line: EditorLine): Line => {
  const { localId, ...persisted } = line;
  void localId;
  return persisted;
};
const money = (value: string | number | null) => {
  if (value === null) return "—";
  const normalized = String(value).trim().replace(",", ".");
  const match = normalized.match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) return `${String(value)} Ft`;
  return `${BigInt(match[1]).toLocaleString("hu-HU")},${(match[2] ?? "").padEnd(2, "0")} Ft`;
};
const provenanceLabel = (value: unknown) => typeof value === "string" && Object.prototype.hasOwnProperty.call(materialProvenanceLabels, value)
  ? materialProvenanceLabels[value as keyof typeof materialProvenanceLabels] : "Forrás nincs megadva";
const objectValue = (value: unknown): Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
const textValue = (value: unknown) => typeof value === "string" ? value : "";

function revisionDocument(revision?: CurrentRevision): { draft: QuotationDocumentDraft; issuer?: Record<string, unknown>; recipient?: Record<string, unknown> } {
  const document = objectValue(objectValue(revision?.input_snapshot).document);
  const recipient = objectValue(document.recipient);
  const draft = {
    ...emptyQuotationDocumentDraft(),
    recipientSource: "manual" as const,
    recipientClientId: "", recipientName: textValue(recipient.name), recipientAddress: textValue(recipient.address),
    recipientEmail: textValue(recipient.email), recipientPhone: textValue(recipient.phone), recipientTaxIdentifier: textValue(recipient.taxIdentifier),
    reference: textValue(document.reference), validUntil: textValue(document.validUntil), notes: textValue(document.notes), terms: textValue(document.terms),
  };
  return { draft, issuer: objectValue(document.issuer), recipient };
}

export type QuotationMaterialSource = Readonly<{ materialListId: string; materialRevisionId: string; listName: string; revisionNumber: number; currentRevisionId: string | null; currentVersion: number; executionPlanId: string | null; sourceLineMap: ReadonlyArray<{ materialItemId: string; quotationLineIndex: number }> }>;

function quotationProductOptions(products: readonly MaterialProductRecord[], categoryId: string): WorkflowMaterialProductOption[] {
  return products.filter((product) => product.categoryId === categoryId && product.categoryActive && product.status === "active").flatMap((product) => product.variants.map((variant) => {
    const knownPrice = variant.latestPrice?.priceKind === "net" ? variant.latestPrice : null;
    const supplierCount = selectablePrices(variant.priceOptions, variant.purchasingUnit).length;
    const priceDetail = knownPrice ? `${knownPrice.amount.toLocaleString("hu-HU")} Ft/${materialPurchasingUnitLabels[knownPrice.purchasingUnit]} · ${provenanceLabel(knownPrice.provenance)} · ${knownPrice.effectiveDate}${supplierLabel(knownPrice) ? ` · ${supplierLabel(knownPrice)}` : ""}` : supplierCount > 1 ? `${supplierCount} beszállítói ár · válassz` : "Ár nincs megadva";
    return { id: variant.id, name: `${product.name} · ${variant.name}`, detail: [`Egység ${materialPurchasingUnitLabels[variant.purchasingUnit]}`, product.manufacturerName, priceDetail].filter(Boolean).join(" · "), searchText: [product.productCode, product.description, product.manufacturerName, variant.sku, variant.name].filter(Boolean).join(" ") };
  }));
}

export function StandaloneQuotationEditor({ userId, organizationId, quotationId, name: initialName, version, currentRevisionId, currentRevision, revisions, selectedRevisionId, products: initialProducts, categories, documentSources, materialSource = null, calculationSource = null, initialLines = [], laborRates = [], laborBases = [] }: Readonly<{
  userId: string; organizationId: string; quotationId: string | null; name?: string; version: number; currentRevisionId: string | null;
  currentRevision?: CurrentRevision; revisions: Revision[]; selectedRevisionId?: string; products: MaterialProductRecord[]; categories: MaterialCategoryRecord[]; documentSources: StandaloneDocumentSources;
  materialSource?: QuotationMaterialSource | null; calculationSource?: QuotationCalculationSource | null; initialLines?: Line[]; laborRates?: readonly LaborRate[]; laborBases?: readonly LaborBase[];
}>) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const { requestConfirmation } = useAppInteraction();
  const lineKeyCounter = useRef(0);
  const makeLocalId = () => { lineKeyCounter.current += 1; return `line-${lineKeyCounter.current}`; };
  const historical = isHistoricalStandaloneRevision(currentRevisionId, selectedRevisionId);
  const activeRevision = historical ? revisions.find((revision) => revision.id === selectedRevisionId) : undefined;
  const seed = historical ? currentRevision : currentRevision;
  const [name, setName] = useState(initialName ?? "");
  const savedDocument = revisionDocument(currentRevision);
  const [document, setDocument] = useState<QuotationDocumentDraft>(savedDocument.draft);
  const [issuerProfile, setIssuerProfile] = useState<IssuerDocumentProfile>(() => historical && savedDocument.issuer ? {
    businessName: textValue(savedDocument.issuer.businessName) || null, businessAddress: textValue(savedDocument.issuer.businessAddress) || null,
    contactEmail: textValue(savedDocument.issuer.contactEmail) || null, contactPhone: textValue(savedDocument.issuer.contactPhone) || null,
    taxIdentifier: textValue(savedDocument.issuer.taxIdentifier) || null,
  } : { businessName: documentSources.issuer.businessName, businessAddress: documentSources.issuer.businessAddress, contactEmail: documentSources.issuer.contactEmail, contactPhone: documentSources.issuer.contactPhone, taxIdentifier: documentSources.issuer.taxIdentifier });
  const [issuerMessage, setIssuerMessage] = useState("");
  const [serverReadiness, setServerReadiness] = useState<DocumentReadiness | null>(null);
  const [issuerDirty, setIssuerDirty] = useState(false);
  const issuerDirtyRef = useRef(false);
  const [lines, setLines] = useState<EditorLine[]>(() => {
    const raw = seed?.line_items_snapshot;
    if (!Array.isArray(raw)) return initialLines.map((value) => {
      const product = products.find((entry) => entry.variants.some((variant) => variant.id === value.variantId));
      return { ...empty(value.type), ...value, categoryId: value.categoryId || product?.categoryId || "", localId: makeLocalId() };
    });
    const linkedSourceIndexes = new Map((materialSource?.sourceLineMap ?? []).map((source) => [source.quotationLineIndex, source.materialItemId]));
    const linkedCalculationKeys = new Map((calculationSource?.sourceLineMap ?? []).map((source) => [source.quotationLineIndex, source.sourceKey]));
    return raw.map((entry, index) => {
      // JSONB stores absent optional fields as null; drop them so the editor's empty-string defaults stay controlled.
      const value = Object.fromEntries(Object.entries(entry as Record<string, unknown>).filter(([, item]) => item !== null)) as Partial<Line>;
      const sourceMaterialItemId = linkedSourceIndexes.get(index) ?? value.sourceMaterialItemId ?? "";
      const type = value.type === "MATERIAL" || value.type === "LABOR" || value.type === "OTHER" ? value.type : "OTHER";
      const product = products.find((candidate) => candidate.variants.some((variant) => variant.id === value.variantId));
      return {
        ...empty(type), ...value,
        type: sourceMaterialItemId && type === "OTHER" ? "MATERIAL" : type,
        categoryId: value.categoryId || product?.categoryId || "",
        sourceMaterialItemId, calculationSourceKey: linkedCalculationKeys.get(index) ?? "", priceClass: value.priceClass ?? "net", priceProvenance: value.priceProvenance ?? (value.priceId ? "catalog_snapshot" : "missing"), localId: makeLocalId(),
      } as EditorLine;
    });
  });
  const [expandedLineIds, setExpandedLineIds] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [pdfPromptOpen, setPdfPromptOpen] = useState(false);
  const dirtyRef = useRef(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<StandaloneQuotationResult<{ quotation_id: string; revision_id: string; revision_number: number; revision_created: boolean; totals_snapshot: Record<string, unknown> }>>({ ok: false, code: "INTERNAL", error: "" });
  const [catalogMessage, setCatalogMessage] = useState("");
  const baseline = useRef(JSON.stringify({ name: initialName ?? "", lines, document: savedDocument.draft }));
  const recoveryKey = quotationRecoveryKey(userId, organizationId, "standalone", quotationId);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recovery, setRecovery] = useState<{ value: QuotationRecovery; current: boolean } | null>(null);
  const operation = useRef<StandaloneSaveOperation | null>(null);
  const savedSubtotal = currentRevision?.subtotal ?? null;
  const savedAmountLabel = currentRevision?.price_class === "gross" ? "Bruttó árbesorolás összege" : currentRevision?.price_class === "net" ? "Nettó árbesorolás összege" : "Árbesorolás nélküli összeg";
  const latestUrl = `/ajanlatok/${quotationId}?organization=${organizationId}`;
  const pdfRevisionId = selectedRevisionId ?? currentRevisionId;
  const pdfUrl = quotationId && pdfRevisionId ? `/api/ajanlatok/${quotationId}/pdf?revision=${encodeURIComponent(pdfRevisionId)}` : null;

  const setDirtyState = (value: boolean) => { dirtyRef.current = value; setDirty(value); };
  const syncDirty = (nextName = name, nextLines = lines, nextDocument = document) => setDirtyState(JSON.stringify({ name: nextName, lines: nextLines, document: nextDocument }) !== baseline.current);
  const setDocumentField = <K extends keyof QuotationDocumentDraft>(key: K, value: QuotationDocumentDraft[K]) => {
    const next = { ...document, [key]: value };
    setDocument(next); setServerReadiness(null); syncDirty(name, lines, next); setResult({ ok: false, code: "INTERNAL", error: "" });
  };
  const changeIssuerProfile = <K extends keyof IssuerDocumentProfile>(key: K, value: IssuerDocumentProfile[K]) => {
    setIssuerProfile((current) => ({ ...current, [key]: value })); issuerDirtyRef.current = true; setIssuerDirty(true); setIssuerMessage("");
  };
  const update = (index: number, patch: Partial<Line>) => {
    const next = lines.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line);
    setLines(next); syncDirty(name, next); setResult({ ok: false, code: "INTERNAL", error: "" });
  };
  const discardRecovery = () => { try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ } setRecovery(null); };
  useUnsavedChangeGuard({ dirty: (dirty || issuerDirty) && !historical, pending, discard: () => { setDirtyState(false); issuerDirtyRef.current = false; setIssuerDirty(false); discardRecovery(); } });
  useEffect(() => {
    try {
      clearOtherQuotationRecoveryOwners(window.sessionStorage, userId);
      const stored = readQuotationRecovery(window.sessionStorage, recoveryKey);
      if (stored) setRecovery({ value: stored, current: isQuotationRecoveryCurrent(stored, version, currentRevisionId) });
    } catch { /* A tiltott sessionStorage nem akadályozhatja a szerkesztést. */ }
    setRecoveryReady(true);
  }, [currentRevisionId, recoveryKey, userId, version]);
  useEffect(() => {
    if (!recoveryReady || historical) return;
    try {
      if (dirty) writeQuotationRecovery(window.sessionStorage, recoveryKey, { sourceVersion: version, sourceRevisionId: currentRevisionId, values: { name, clientId: document.recipientSource === "client" ? document.recipientClientId : "", document, lines: lines.map(toPersistedLine) } });
      else if (!recovery) window.sessionStorage.removeItem(recoveryKey);
    } catch { /* A privát mód vagy kvóta nem blokkolja a használatot. */ }
  }, [currentRevisionId, dirty, document, historical, lines, name, recovery, recoveryKey, recoveryReady, version]);

  const localEstimate = useMemo(() => lines.reduce((sum, line) => {
    try { return sum + lineTotal(line.quantity || "0", line.unitPrice || "0").minor; } catch { return sum; }
  }, BigInt(0)), [lines]);
  const currentPriceClasses = new Set(lines.map((line) => line.priceClass));
  const mixedPriceClasses = currentPriceClasses.size > 1;
  const missingPriceCount = lines.filter((line) => !line.unitPrice.trim()).length;
  const currentPriceBasisLabel = mixedPriceClasses ? "vegyes árbesorolás" : missingPriceCount ? `részleges ${[...currentPriceClasses][0] === "gross" ? "bruttó" : "nettó"} HUF` : [...currentPriceClasses][0] === "gross" ? "bruttó HUF" : "nettó HUF";
  const readinessDocument = document;
  const savedIssuerForReadiness: IssuerDocumentProfile | null = savedDocument.issuer ? {
    businessName: textValue(savedDocument.issuer.businessName) || null,
    businessAddress: textValue(savedDocument.issuer.businessAddress) || null,
    contactEmail: textValue(savedDocument.issuer.contactEmail) || null,
    contactPhone: textValue(savedDocument.issuer.contactPhone) || null,
    taxIdentifier: textValue(savedDocument.issuer.taxIdentifier) || null,
  } : null;
  const issuerForReadiness: IssuerDocumentProfile = currentRevision && savedIssuerForReadiness ? savedIssuerForReadiness : documentSources.issuer;
  const savedLines = Array.isArray(currentRevision?.line_items_snapshot) ? currentRevision.line_items_snapshot : [];
  const savedLineValidation = validateStandaloneLines(savedLines);
  let savedTotalsConsistent = false;
  if (savedLineValidation.ok && currentRevision?.subtotal !== null && currentRevision?.subtotal !== undefined) {
    try { savedTotalsConsistent = decimalToScaled(String(currentRevision.subtotal), 2) === decimalToScaled(savedLineValidation.totals.subtotal, 2) && savedLineValidation.totals.priceClass === currentRevision.price_class; } catch { savedTotalsConsistent = false; }
  }
  const readiness = validateQuotationDocumentReadiness(issuerForReadiness, readinessDocument, undefined, {
    hasCurrentRevision: Boolean(currentRevisionId && currentRevision?.id === currentRevisionId),
    hasCompleteLines: savedLineValidation.ok && savedLineValidation.totals.complete && savedLines.length > 0 && currentRevision?.price_class !== null,
    monetaryValuesConsistent: savedTotalsConsistent,
    currency: currentRevision?.currency ?? null,
    priceBasis: currentRevision?.price_class ?? null,
    taxTreatment: "unresolved",
  });
  const displayedReadiness = serverReadiness ?? readiness;
  // Presentation only: an untouched, still-empty optional document group is "not provided", not an error.
  const documentUntouched = displayedReadiness.status !== "valid_draft" && JSON.stringify(document) === JSON.stringify(emptyQuotationDocumentDraft());

  const addLine = (type: Line["type"]) => { const next = [{ ...empty(type), localId: makeLocalId() }, ...lines]; setLines(next); syncDirty(name, next); };
  const addPrebuiltLine = (line: Line) => { const next = [{ ...line, localId: makeLocalId() }, ...lines]; setLines(next); syncDirty(name, next); };
  // A verified calculation quantity becomes an editable, unpriced material line; its source stays attached.
  const addCalculationLine = (candidate: CalculationQuoteCandidate) => addPrebuiltLine({ ...empty("MATERIAL"), description: candidate.label, quantity: quotationQuantity(candidate.quantity), unit: candidate.unit, priceProvenance: "missing", calculationSourceKey: candidate.sourceKey });
  const usedCalculationKeys = new Set(lines.flatMap((line) => line.calculationSourceKey ? [line.calculationSourceKey] : []));
  const candidateByKey = new Map((calculationSource?.candidates ?? []).map((candidate) => [candidate.sourceKey, candidate]));
  const moveLine = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines]; [next[index], next[target]] = [next[target], next[index]];
    setLines(next); syncDirty(name, next);
  };
  const restoreRecovery = () => {
    if (!recovery?.current || historical) return;
    const recovered = recovery.value.values.lines.map((line) => ({ ...line, localId: makeLocalId() }));
    const nextDocument = standaloneManualRecipient(recovery.value.values.document ?? document);
    const values = { name: recovery.value.values.name, lines: recovered, document: nextDocument };
    setName(values.name); setLines(values.lines); setDocument(nextDocument); setDirtyState(JSON.stringify(values) !== baseline.current); setRecovery(null);
  };
  const catalogVariant = (variantId: string) => products.flatMap((product) => product.variants.map((variant) => ({ product, variant }))).find((entry) => entry.variant.id === variantId);
  const resolvePrice = async (lineIndex: number, variantId: string, requestedPriceId: string, useDefaultPrice = false) => {
    const selected = catalogVariant(variantId);
    if (!selected) { setCatalogMessage("A katalógustermék nem található a betöltött listában."); return; }
    const previous = lines[lineIndex];
    if (!previous) return;
    const compatiblePrices = selected.variant.prices.filter((price) => price.currency === "HUF" && price.priceKind === "net" && price.purchasingUnit === selected.variant.purchasingUnit);
    const selectedPriceId = requestedPriceId
      || (useDefaultPrice && previous.variantId === variantId ? previous.priceId : "")
      || (useDefaultPrice && !previous.unitPrice.trim() ? (defaultPrice(selected.variant.priceOptions, selected.variant.purchasingUnit)?.priceKind === "net" ? defaultPrice(selected.variant.priceOptions, selected.variant.purchasingUnit)?.id ?? "" : "") : "");
    const localPrice = compatiblePrices.find((price) => price.id === selectedPriceId);
    const preserveOldSnapshotPrice = !selectedPriceId && previous.unitPrice.trim()
      && previous.variantId !== variantId
      && previous.priceProvenance !== "user_entered" && previous.priceProvenance !== "missing";
    const needsConfirmation = catalogReplacementNeedsConfirmation(previous, selected.variant.purchasingUnit, localPrice ? localPrice.amount.toFixed(2) : undefined)
      || Boolean(preserveOldSnapshotPrice);
    if (needsConfirmation) {
      const changes = [
        previous.unit.trim() && !quotationPurchasingUnitsMatch(previous.unit, selected.variant.purchasingUnit)
          ? `az egység ${quotationPurchasingUnitLabel(previous.unit)} helyett ${quotationPurchasingUnitLabel(selected.variant.purchasingUnit)} lesz` : "",
        localPrice && previous.unitPrice.trim() && !quotationPricesEqual(previous.unitPrice, localPrice.amount.toFixed(2))
          ? `az egységár ${previous.unitPrice} Ft helyett ${localPrice.amount.toLocaleString("hu-HU")} Ft lesz` : "",
        preserveOldSnapshotPrice ? "a korábbi forrásár a kiválasztott termékhez kézi ajánlati árként marad meg" : "",
      ].filter(Boolean).join("; ");
      const accepted = await requestConfirmation({
        title: "Katalógustermék cseréje",
        message: `A kiválasztás módosítja az ajánlatsort: ${changes}. A megnevezés, mennyiség és anyaglista-forrás megmarad. Folytatod?`,
        cancelLabel: "Mégse",
        actions: [{ label: "Katalógustermék kiválasztása", tone: "primary", run: () => undefined }],
      });
      if (!accepted) { setCatalogMessage("A termékválasztás megszakadt; az ajánlatsor adatai változatlanok."); return; }
    }
    let response: Awaited<ReturnType<typeof resolveStandaloneQuotationCatalogItemAction>>;
    try { response = await resolveStandaloneQuotationCatalogItemAction(organizationId, variantId, selectedPriceId || undefined); }
    catch { setCatalogMessage("A katalógus most nem érhető el. Ellenőrizd a kapcsolatot, majd válaszd ki újra a tételt."); return; }
    if (!response.ok) { setCatalogMessage(response.error); return; }
    const price = response.data.price as { amount: string; provenance: string | null; effectiveDate: string; priceKind: "net" | "gross" } | null;
    if (price && price.priceKind !== "net") { setCatalogMessage("Ez az ár bruttó besorolású. A standalone szerkesztő jelenleg nettó HUF árakat fogad el; válassz másik árat vagy kézi nettó árat."); return; }
    update(lineIndex, {
      variantId, categoryId: selected.product.categoryId, priceId: selectedPriceId,
      unit: String(response.data.purchasingUnit ?? selected.variant.purchasingUnit),
      unitPrice: price?.amount ?? previous.unitPrice,
      priceClass: price?.priceKind ?? previous.priceClass,
      priceProvenance: price ? "catalog_snapshot" : previous.unitPrice.trim() ? "user_entered" : "missing",
    });
    setCatalogMessage(price
      ? `Katalógustermék: ${selected.product.name} · ${selected.variant.name}. Katalógusár: ${price.amount} Ft/${quotationPurchasingUnitLabel(selected.variant.purchasingUnit)} · ${materialProvenanceLabels[(price.provenance ?? "missing") as keyof typeof materialProvenanceLabels]} · ${price.effectiveDate}.`
      : `Katalógustermék: ${selected.product.name} · ${selected.variant.name}. A megnevezés és a meglévő ajánlati ár megmaradt.`);
  };
  const removeLine = async (line: EditorLine) => {
    const accepted = await requestConfirmation({
      title: "Ajánlati tétel eltávolítása",
      message: line.sourceMaterialItemId
        ? `A „${line.description || "névtelen tétel"}” kikerül ebből a piszkozatból. A mentett anyaglista-forrás és a korábbi ajánlati revízió változatlan marad.`
        : `A „${line.description || "névtelen tétel"}” kikerül ebből a piszkozatból. A már mentett ajánlati revíziók változatlanok maradnak.`,
      cancelLabel: "Mégse",
      actions: [{ label: "Tétel eltávolítása", tone: "danger", run: () => undefined }],
    });
    if (!accepted) return;
    const next = lines.filter((candidate) => candidate.localId !== line.localId);
    setLines(next); syncDirty(name, next);
  };
  const save = (saveIssuerProfileFirst = false) => {
    if (historical || pending) return;
    if (!name.trim()) { setResult({ ok: false, code: "VALIDATION", error: "Add meg az ajánlat nevét a mentéshez." }); return; }
    if (issuerDirty && !saveIssuerProfileFirst) { setResult({ ok: false, code: "VALIDATION", error: "Előbb mentsd a kibocsátói profilt, hogy az ajánlati revízió a friss adatokat rögzítse." }); return; }
    const savedLines = lines.map(toPersistedLine);
    const payload = JSON.stringify({ quotationId, version, name: name.trim(), lines: savedLines, document, materialListId: materialSource?.materialListId ?? null, materialRevisionId: materialSource?.materialRevisionId ?? null, calculationRevisionId: calculationSource?.calculationRevisionId ?? null });
    try {
      operation.current = getStandaloneSaveOperation(operation.current, payload, generateSecureUuid);
    } catch { setResult({ ok: false, code: "INTERNAL", error: "A biztonságos mentési azonosító nem hozható létre ezen a böngészőn." }); return; }
    const form = new FormData();
    form.set("organizationId", organizationId); form.set("operationId", operation.current.id); form.set("version", String(version));
    if (quotationId) form.set("quotationId", quotationId);
    form.set("name", name.trim()); form.set("clientId", "");
    form.set("lines", JSON.stringify(savedLines));
    if (materialSource && lines.some((line) => line.sourceMaterialItemId)) {
      form.set("materialListId", materialSource.materialListId);
      form.set("materialRevisionId", materialSource.materialRevisionId);
    }
    if (calculationSource && lines.some((line) => line.calculationSourceKey)) form.set("calculationRevisionId", calculationSource.calculationRevisionId);
    form.set("document", JSON.stringify(document));
    setResult({ ok: false, code: "INTERNAL", error: "" });
    startTransition(async () => {
      if (issuerDirty && saveIssuerProfileFirst) {
        let profile: Awaited<ReturnType<typeof updateStandaloneIssuerProfileAction>>;
        try {
          profile = await updateStandaloneIssuerProfileAction(organizationId, {
            businessName: issuerProfile.businessName ?? "", businessAddress: issuerProfile.businessAddress ?? "",
            contactEmail: issuerProfile.contactEmail ?? "", contactPhone: issuerProfile.contactPhone ?? "", taxIdentifier: issuerProfile.taxIdentifier ?? "",
          });
        } catch { setIssuerMessage("A kibocsátói profil hálózati mentése nem sikerült; az ajánlati revízió nem készült el."); return; }
        if (!profile.ok) { setIssuerMessage(profile.error); setResult({ ok: false, code: "INTERNAL", error: "A kibocsátói profil mentése nem sikerült; az ajánlati revízió nem készült el." }); return; }
        setIssuerProfile(profile.data); issuerDirtyRef.current = false; setIssuerDirty(false); setIssuerMessage("A kibocsátói profil mentve; az ajánlati revízió mentése folyamatban.");
      }
      let saved: Awaited<ReturnType<typeof saveStandaloneQuotationDraftAction>>;
      try { saved = await saveStandaloneQuotationDraftAction(form); }
      catch { setResult({ ok: false, code: "INTERNAL", error: "A hálózati mentés eredménye nem érkezett meg. Ugyanennek a módosításnak az újrapróbálásakor azonos műveletazonosítót használunk." }); return; }
      setResult(saved);
      if (saved.ok) {
        try { window.sessionStorage.removeItem(recoveryKey); } catch { /* Best effort. */ }
        setRecovery(null); setDirtyState(false); operation.current = null;
        baseline.current = JSON.stringify({ name, lines, document });
        router.push(`/ajanlatok/${saved.data.quotation_id}?organization=${organizationId}`);
      }
    });
  };
  const saveIssuerProfile = () => {
    if (!documentSources.canEditIssuer || pending) return;
    startTransition(async () => {
      const saved = await updateStandaloneIssuerProfileAction(organizationId, {
        businessName: issuerProfile.businessName ?? "", businessAddress: issuerProfile.businessAddress ?? "",
        contactEmail: issuerProfile.contactEmail ?? "", contactPhone: issuerProfile.contactPhone ?? "", taxIdentifier: issuerProfile.taxIdentifier ?? "",
      });
      if (!saved.ok) { setIssuerMessage(saved.error); return; }
      setIssuerProfile(saved.data); issuerDirtyRef.current = false; setIssuerDirty(false); setIssuerMessage("A kibocsátói adatok mentve."); setServerReadiness(null); router.refresh();
    });
  };
  const checkReadiness = () => {
    startTransition(async () => {
      const checked = await validateStandaloneQuotationDocumentAction(organizationId, document, quotationId);
      if (!checked.ok) { setResult(checked); return; }
      setServerReadiness(checked.data);
    });
  };

  return <section className="quotation-editor detail-surface standalone-quotation-editor">
    <BackNavigation href={`/ajanlatok?organization=${organizationId}`} label="Vissza az ajánlatokhoz" />
    <div className="section-heading standalone-quotation-header glass-bubble"><div className="standalone-quotation-title"><ClipboardList aria-hidden="true" className="standalone-quotation-icon" /><div><p className="section-eyebrow">Önálló ajánlat</p><h2>{quotationId ? `${initialName || "Ajánlat"} · v${activeRevision?.revisionNumber ?? version}` : "Új árajánlat"}</h2><p className="standalone-quotation-subtitle">HUF · Menthető piszkozat</p></div></div><span className="status-pill status-draft">Piszkozat</span></div>
    <p className="standalone-quotation-note">A véglegesítés, az ÁFA-kezelés és a hivatalos PDF még nem támogatott.</p>
    {materialSource && <section className="glass-bubble quotation-material-source" aria-label="Anyaglista forrás"><strong>Anyaglista-forrás · <Link href={`/anyaglistak/${materialSource.materialListId}?organization=${organizationId}`}>{materialSource.listName}</Link></strong><span>V{materialSource.revisionNumber} revízió · {materialSource.sourceLineMap.length} forrástétel</span>{materialSource.currentRevisionId && materialSource.currentRevisionId !== materialSource.materialRevisionId && <p role="status">A lista azóta V{materialSource.currentVersion} verzióra változott. Az ajánlat a kiválasztott, változtathatatlan V{materialSource.revisionNumber} forrásból indul.</p>}</section>}
    {calculationSource && <section className="glass-bubble quotation-material-source quotation-calculation-source" aria-label="Kalkulációs forrás">
      <strong>Kalkulációs forrás · <Link href={`/kalkulatorok?organization=${organizationId}&calculator=${calculationSource.calculatorId}&calculation=${calculationSource.calculationId}`}>{calculationSource.calculationName}</Link></strong>
      <span>V{calculationSource.revisionNumber} rögzített revízió · nettó ár, ÁFA nélkül · az árat a tételenként választott termék vagy kézi ár adja</span>
      {calculationSource.candidates.length === 0 ? <p role="status">Ebben a revízióban nincs ajánlati mennyiségként átvehető kiosztási mennyiség vagy vágáslista-sor.</p>
        : <ul className="quotation-calculation-candidates">{calculationSource.candidates.map((candidate) => <li key={candidate.sourceKey}><span>{candidate.label}<small>{new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 6 }).format(candidate.quantity)} {candidate.unit} · {candidate.meaning === "CUT_LIST" ? "vágáslista" : "kiosztási mennyiség"}</small></span>
          <button type="button" className="secondary-button" disabled={historical || usedCalculationKeys.has(candidate.sourceKey)} onClick={() => addCalculationLine(candidate)}>{usedCalculationKeys.has(candidate.sourceKey) ? "Felvéve" : "Tételként felvétel"}</button></li>)}</ul>}
      {calculationSource.informational.length > 0 && <details><summary>Tájékoztató eredmények · nem ajánlati mennyiség</summary><dl>{calculationSource.informational.map((line) => <div key={line.label}><dt>{line.label}</dt><dd>{typeof line.value === "number" ? new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 3 }).format(line.value) : line.value} {line.unit}</dd></div>)}</dl></details>}
    </section>}
    {!historical && materialSource && <LaborRatePanel organizationId={organizationId} canEditRates={documentSources.canEditIssuer} rates={laborRates} bases={laborBases} quotationClass={lines[0]?.priceClass ?? null} appliedKeys={appliedLaborKeys(lines)} source={materialSource} onApply={addPrebuiltLine} />}
    <div className="standalone-quotation-toolbar">
    <div className="standalone-revision-bar" aria-label="Ajánlati revíziók">
      {revisions.map((revision) => <Link key={revision.id} className={`secondary-button ${revision.id === (selectedRevisionId ?? currentRevisionId) ? "is-current" : ""}`} href={`/ajanlatok/${quotationId}?organization=${organizationId}&revision=${revision.id}`} aria-current={revision.id === (selectedRevisionId ?? currentRevisionId) ? "page" : undefined}>v{revision.revisionNumber} · {money(revision.subtotal)}</Link>)}
      {historical && <Link className="primary-button" href={latestUrl}>Legfrissebb revízió megnyitása (v{version})</Link>}
      {historical && <span className="form-message" role="status">Történeti, változtathatatlan revízió megtekintése.</span>}
    </div>
    {pdfUrl && <div className="standalone-pdf-actions">
      {dirty || issuerDirty ? <button className="secondary-button" type="button" disabled={pending} onClick={() => setPdfPromptOpen(true)}>PDF-előnézet</button>
        : <a className="secondary-button" href={pdfUrl} target="_blank" rel="noreferrer">PDF-előnézet</a>}
      {pdfPromptOpen && <section className="form-message" aria-labelledby="standalone-pdf-unsaved-title">
        <strong id="standalone-pdf-unsaved-title">Mentetlen módosítások</strong>
        <p>Az előnézet a mentett v{revisions.find((revision) => revision.id === pdfRevisionId)?.revisionNumber ?? currentRevision?.revision_number ?? version} revízióból készül. A helyi módosításokat nem tartalmazza.</p>
        {issuerDirty && <p>Módosult a kibocsátói profil is; azt külön mentsd, majd mentsd új ajánlati revízióként, ha az adatoknak szerepelniük kell az előnézetben.</p>}
        <div className="quotation-add-actions">
          <button className="secondary-button" type="button" disabled={pending} onClick={() => { setPdfPromptOpen(false); save(true); }}>Mentés előbb</button>
          <a className="primary-button" href={pdfUrl} target="_blank" rel="noreferrer" onClick={() => setPdfPromptOpen(false)}>Utolsó mentett előnézet megnyitása</a>
          <button className="text-button" type="button" onClick={() => setPdfPromptOpen(false)}>Mégse</button>
        </div>
      </section>}
    </div>}
    </div>
    {recovery && !historical && <section className="form-message" role="status"><p>{recovery.current ? "Korábban nem mentett módosítás található ebben a munkamenetben." : "A helyi változat régebbi szerverrevízióból készült, ezért nem állítható vissza automatikusan."}</p>{recovery.current && <button className="secondary-button" type="button" onClick={restoreRecovery}>Változat visszaállítása</button>}<button className="text-button" type="button" onClick={discardRecovery}>Helyi változat elvetése</button></section>}
    <fieldset className="quotation-editor-fields" disabled={historical || pending || !recoveryReady} aria-busy={pending || !recoveryReady}>
      <div className="quotation-meta"><label htmlFor="standalone-name">Ajánlat neve<input id="standalone-name" required maxLength={200} value={name} onChange={(event) => { setName(event.target.value); syncDirty(event.target.value); setResult({ ok: false, code: "INTERNAL", error: "" }); }} aria-describedby="standalone-name-hint" placeholder="Például: Tóth utca tetőfelújítás" /></label><small id="standalone-name-hint">Ez az egyetlen kötelező alapadat; a címzett és dokumentummezők opcionálisak.</small></div>
      <details className="standalone-document-details quotation-document-disclosure" aria-labelledby="standalone-document-heading">
        <summary id="standalone-document-heading" className="quotation-document-summary"><span><small>Opcionális</small><strong>Címzett és dokumentumadatok</strong></span><span className={`status-pill status-draft${documentUntouched ? " is-neutral" : ""}`}>{documentUntouched ? "Nincs megadva" : displayedReadiness.status === "valid_draft" ? "Adatok rendben" : displayedReadiness.status === "invalid_document_data" ? "Hibás adat" : "Hiányos kiállítási adatok"}</span></summary>
        <div className="quotation-document-disclosure-body">
        <p className="missing-data">Ez a piszkozat menthető. Az adókezelés és a véglegesítés még nincs támogatva; ez az összegzés nem jelent kiállíthatóságot.</p>
        <div className="quotation-line-grid">
            <label htmlFor="document-recipient-name">Címzett neve<input id="document-recipient-name" value={document.recipientName} onChange={(event) => setDocumentField("recipientName", event.target.value)} /></label>
            <label htmlFor="document-recipient-address">Címzett címe<input id="document-recipient-address" value={document.recipientAddress} onChange={(event) => setDocumentField("recipientAddress", event.target.value)} /></label>
            <label htmlFor="document-recipient-email">Címzett e-mail-címe<input id="document-recipient-email" type="email" value={document.recipientEmail} onChange={(event) => setDocumentField("recipientEmail", event.target.value)} /></label>
            <label htmlFor="document-recipient-phone">Címzett telefonszáma<input id="document-recipient-phone" value={document.recipientPhone} onChange={(event) => setDocumentField("recipientPhone", event.target.value)} /></label>
            <label htmlFor="document-recipient-tax">Címzett adóazonosító adata<input id="document-recipient-tax" value={document.recipientTaxIdentifier} onChange={(event) => setDocumentField("recipientTaxIdentifier", event.target.value)} /></label>
          <label htmlFor="document-reference">Belső hivatkozás<input id="document-reference" value={document.reference} onChange={(event) => setDocumentField("reference", event.target.value)} /></label>
          <label htmlFor="document-valid-until">Érvényesség dátuma<input id="document-valid-until" type="date" value={document.validUntil} onChange={(event) => setDocumentField("validUntil", event.target.value)} /></label>
          <label htmlFor="document-notes">Ajánlati megjegyzés<textarea id="document-notes" rows={3} value={document.notes} onChange={(event) => setDocumentField("notes", event.target.value)} /></label>
          <label htmlFor="document-terms">Feltételek<textarea id="document-terms" rows={4} value={document.terms} onChange={(event) => setDocumentField("terms", event.target.value)} /></label>
        </div>
        <div className="issuer-profile"><div><p className="section-eyebrow">Kibocsátó</p><strong>{historical ? textValue(savedDocument.issuer?.organizationName) || documentSources.issuer.organizationName : documentSources.issuer.organizationName}</strong></div>
          <div className="quotation-line-grid">
            <label htmlFor="issuer-business-name">Vállalkozás neve<input id="issuer-business-name" value={issuerProfile.businessName ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("businessName", event.target.value || null)} /></label>
            <label htmlFor="issuer-business-address">Vállalkozás címe<input id="issuer-business-address" value={issuerProfile.businessAddress ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("businessAddress", event.target.value || null)} /></label>
            <label htmlFor="issuer-contact-email">Kapcsolati e-mail<input id="issuer-contact-email" type="email" value={issuerProfile.contactEmail ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("contactEmail", event.target.value || null)} /></label>
            <label htmlFor="issuer-contact-phone">Kapcsolati telefon<input id="issuer-contact-phone" value={issuerProfile.contactPhone ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("contactPhone", event.target.value || null)} /></label>
            <label htmlFor="issuer-tax-id">Adóazonosító adat<input id="issuer-tax-id" value={issuerProfile.taxIdentifier ?? ""} disabled={!documentSources.canEditIssuer || pending} onChange={(event) => changeIssuerProfile("taxIdentifier", event.target.value || null)} /><small>Tájékoztató profiladat; nem adószámítási beállítás.</small></label>
          </div>
          {documentSources.canEditIssuer && !historical && <button className="secondary-button" type="button" disabled={pending} onClick={saveIssuerProfile}>Kibocsátói profil mentése</button>}
          {issuerDirty && <small role="status">Mentetlen kibocsátói profil módosítás.</small>}
          {!documentSources.canEditIssuer && <small>A kibocsátói adatokat csak műhelytulajdonos vagy admin módosíthatja.</small>}
          {issuerMessage && <p className="form-message" role="status">{issuerMessage}</p>}
        </div>
        <ul className="document-readiness" aria-label="Kiállítási hiányosságok">{displayedReadiness.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}</ul>
        {!historical && <button className="secondary-button" type="button" disabled={pending} onClick={checkReadiness}>{pending ? "Ellenőrzés folyamatban…" : "Dokumentumadatok szerveroldali ellenőrzése"}</button>}
        {serverReadiness && <small role="status">Az ellenőrzés hitelesített szerveroldali adatokkal lefutott.</small>}
        </div>
      </details>
      <div className="quotation-lines"><div className="section-heading"><div><h3>Tételek ({lines.length})</h3></div><div className="quotation-add-actions"><button className="secondary-button" type="button" onClick={() => addLine("MATERIAL")}>+ Kézi anyag</button><button className="secondary-button" type="button" onClick={() => addLine("LABOR")}>+ Munkadíj</button><button className="secondary-button" type="button" onClick={() => addLine("OTHER")}>+ Egyéb</button></div></div>
        {lines.length === 0 && <p className="empty-state">Még nincs tétel. Üres piszkozatot is elmenthetsz.</p>}
        {lines.map((line, index) => {
          const selected = line.variantId ? catalogVariant(line.variantId) : undefined;
          const categoryId = line.categoryId || selected?.product.categoryId || "";
          const category = categories.find((candidate) => candidate.id === categoryId);
          const productOptions = quotationProductOptions(products, categoryId);
          const currentPrice = selected?.variant.prices.find((price) => price.id === line.priceId);
          const knownPrices = selected ? selectablePrices(selected.variant.priceOptions, selected.variant.purchasingUnit).filter((price) => price.priceKind === "net") : [];
          const linkState = quotationMaterialLinkState(line);
          const linkLabel = linkState === "catalog_linked"
            ? selected ? "Katalógushoz kapcsolva" : "Katalóguskapcsolat nem található"
            : linkState === "source_unmapped" ? "Anyaglista-forrás · nincs katalógustermék" : "Kézi anyag · nincs katalógustermék";
          const priceOrigin = line.priceId
            ? currentPrice ? `Katalógusár · ${supplierLabel(currentPrice) ? `${supplierLabel(currentPrice)} · ` : ""}${provenanceLabel(currentPrice.provenance)} · ${currentPrice.effectiveDate}` : "Mentett katalógusár; az aktuális katalógusárforrás nem érhető el"
            : line.priceProvenance === "catalog_snapshot" ? "Korábbi katalógusár-pillanatkép, kézi ajánlati árként megőrizve"
              : line.priceProvenance === "takeoff_snapshot" ? "Korábbi anyagkimutatás-ár-pillanatkép"
                : line.priceProvenance === "user_entered" ? "Kézi ajánlati ár"
                  : "Ár eredete nincs megadva";
          const lineAmount = !line.unitPrice.trim() ? "Hiányzó egységár" : (() => { try { return money(scaledToDecimal(lineTotal(line.quantity || "0", line.unitPrice).minor, 2)); } catch { return "—"; } })();
          const unitLabel = quotationPurchasingUnitLabel(line.unit) || "—";
          const linePriceLabel = line.priceClass === "gross" ? "Bruttó egységár (Ft)" : "Nettó egységár (Ft)";
          const lineTotalLabel = line.priceClass === "gross" ? "Bruttó tételösszeg" : "Nettó tételösszeg";
          const editId = `line-${line.localId}-advanced`;
          return <article className="quotation-line" key={line.localId}>
            <div className="quotation-compact-row">
              <div className="quotation-compact-title"><span className={`quotation-material-state state-${linkState}`}>{line.type === "MATERIAL" ? linkLabel : line.type === "LABOR" ? "Munkadíj" : "Egyéb tétel"}</span><strong>{line.description || "Névtelen tétel"}</strong><small>{category?.name ?? ""}</small></div>
              <label className="quotation-compact-field"><span>Mennyiség</span><input aria-label={`${line.description || "Tétel"} mennyisége`} inputMode="decimal" value={line.quantity} onChange={(event) => update(index, { quantity: event.target.value })} /></label>
              <div className="quotation-compact-field quotation-compact-unit"><span>Egység</span><strong>{unitLabel}</strong></div>
              <label className="quotation-compact-field"><span>{linePriceLabel}</span><input aria-label={`${line.description || "Tétel"} ${linePriceLabel.toLowerCase()}`} className={line.unitPrice.trim() ? undefined : "is-missing"} inputMode="decimal" value={line.unitPrice} onChange={(event) => update(index, { unitPrice: event.target.value, priceId: "", priceProvenance: event.target.value.trim() ? "user_entered" : "missing" })} /></label>
              <output className={`quotation-compact-total${line.unitPrice.trim() ? "" : " is-missing"}`}><span>{lineTotalLabel}</span><strong>{lineAmount}</strong></output>
              <button className="secondary-button quotation-edit-toggle" type="button" aria-expanded={Boolean(expandedLineIds[line.localId])} aria-controls={editId} onClick={() => setExpandedLineIds((current) => ({ ...current, [line.localId]: !current[line.localId] }))}>{expandedLineIds[line.localId] ? "Bezárás" : "Szerkesztés"}</button>
            </div>
            {expandedLineIds[line.localId] && <div id={editId} className="quotation-line-edit">
              <div className="quotation-line-grid quotation-advanced-grid">
                <label htmlFor={`${line.localId}-type`}>Tétel típusa<select id={`${line.localId}-type`} value={line.type} onChange={(event) => {
                  const type = event.target.value as Line["type"];
                  if (type === "MATERIAL") update(index, { type, categoryId: line.categoryId || selected?.product.categoryId || "" });
                  else update(index, { type, variantId: "", categoryId: "", priceId: "", priceProvenance: line.priceId ? "catalog_snapshot" : line.priceProvenance });
                }}><option value="MATERIAL">Anyag</option><option value="LABOR">Munkadíj</option><option value="OTHER">Egyéb</option></select></label>
                {line.type === "MATERIAL" && <>
                  <label htmlFor={`${line.localId}-category`}>Kategória<select id={`${line.localId}-category`} value={categoryId} onChange={(event) => {
                    const next = changeQuotationMaterialCategory(line, event.target.value, selected?.product.categoryId ?? null);
                    update(index, next);
                  }}><option value="">Nincs kategória</option>{categories.filter((entry) => entry.isActive || entry.id === categoryId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}{entry.isActive ? "" : " · inaktív"}</option>)}</select></label>
                  <div className="standalone-catalog-product-field" role="group" aria-label="Katalógustermék"><span>Katalógustermék</span><WorkflowMaterialProductPicker idPrefix={`quotation-${line.localId}-catalog`} label="Katalógustermék" options={productOptions} value={line.variantId} disabled={!categoryId} loadOptions={async (search, page) => {
                    const result = await searchMaterialProductsAction(organizationId, { categoryId, search, page });
                    setProducts((current) => [...new Map([...current, ...result.products].map((product) => [product.id, product])).values()]);
                    return { options: quotationProductOptions(result.products, categoryId), hasNext: result.hasNext };
                  }} onSelect={(variantId) => { if (variantId) void resolvePrice(index, variantId, "", true); }} /></div>
                </>}
                <label htmlFor={`${line.localId}-description`}>Megnevezés<input id={`${line.localId}-description`} maxLength={240} value={line.description} onChange={(event) => update(index, { description: event.target.value })} /></label>
                <label htmlFor={`${line.localId}-unit`}>Egység<input id={`${line.localId}-unit`} maxLength={40} value={line.variantId ? unitLabel : line.unit} readOnly={Boolean(line.variantId)} aria-describedby={`${line.localId}-unit-help`} onChange={(event) => update(index, { unit: event.target.value, priceId: "", priceProvenance: line.priceId ? "catalog_snapshot" : line.priceProvenance })} /></label>
                <small id={`${line.localId}-unit-help`}>{line.variantId ? "Az egységet a katalógusváltozat határozza meg." : "Kézi tételnél az egység szerkeszthető."}</small>
                {line.type === "MATERIAL" && selected && <label htmlFor={`${line.localId}-price-source`}>Ajánlati árforrás<select id={`${line.localId}-price-source`} value={line.priceId} onChange={(event) => { void resolvePrice(index, line.variantId, event.target.value); }}><option value="">Kézi ajánlati ár</option>{priceChoices(selected.variant.priceOptions, selected.variant.purchasingUnit, line.priceId).map((price) => <option key={price.id} value={price.id} disabled={price.priceKind !== "net"}>{priceChoiceLabel(price)}{price.priceKind !== "net" ? " (itt nem használható)" : ""}{price.id === line.priceId && !selectablePrices(selected.variant.priceOptions, selected.variant.purchasingUnit).some((c) => c.id === price.id) ? " · korábbi" : ""}</option>)}</select></label>}
                <div className="quotation-price-provenance"><strong>{priceOrigin}</strong>{selected && <small>A katalógusváltozat eredete: {provenanceLabel(selected.variant.provenance)}.</small>}{knownPrices.length === 1 && !line.priceId && <small>Elérhető nettó katalógusár: {priceChoiceLabel(knownPrices[0]!)} · {knownPrices[0]!.effectiveDate}.</small>}{knownPrices.length > 1 && !line.priceId && <small>{knownPrices.length} beszállítói ár érhető el; válaszd ki az árforrást (nincs automatikus választás).</small>}</div>
                <label className="quotation-notes-field" htmlFor={`${line.localId}-notes`}>Megjegyzés<textarea id={`${line.localId}-notes`} maxLength={500} rows={2} value={line.notes} onChange={(event) => update(index, { notes: event.target.value })} /></label>
              </div>
              {line.laborSource && <div className="quotation-source-line quotation-labor-source"><strong>Munkadíj-szabály forrása</strong>{line.laborSource.rateSnapshot ? <small>{line.laborSource.rateSnapshot.name} · {line.laborSource.rateSnapshot.rateAmount} Ft/{line.laborSource.sourceUnit} · {line.laborSource.rateSnapshot.priceClass === "net" ? "nettó" : "bruttó"} · forrás: {line.laborSource.sourceLabel}, {line.laborSource.sourceQuantity} {line.laborSource.sourceUnit} (felmérés V{line.laborSource.surveyVersion})</small> : <small>Mentés után jelenik meg a rögzített szabály- és forráspillanatkép.</small>}{line.laborSource.rateSnapshot && (!sameQuantity(line.quantity, quantityAtSix(line.laborSource.sourceQuantity ?? line.quantity)) || line.unitPrice !== line.laborSource.rateSnapshot.rateAmount) && <small className="quotation-labor-edited">A mennyiség vagy az ár a szabálytól kézzel eltér; a forrás megmarad.</small>}</div>}
              {line.sourceMaterialItemId && <div className="quotation-source-line"><strong>Változtathatatlan forrástétel</strong><code>{line.sourceMaterialItemId}</code>{materialSource && <small>{materialSource.listName} · V{materialSource.revisionNumber} · anyaglista-revízió {materialSource.materialRevisionId}</small>}</div>}
              {line.calculationSourceKey && (() => { const candidate = candidateByKey.get(line.calculationSourceKey); return <div className="quotation-source-line"><strong>Kalkulációs forrás{calculationSource ? ` · ${calculationSource.calculationName} V${calculationSource.revisionNumber}` : ""}</strong>{candidate ? <small>{candidate.label} · eredeti: {new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 6 }).format(candidate.quantity)} {candidate.unit}{line.unit !== candidate.unit ? ` · az egység eltér a forrástól (${candidate.unit}); ellenőrizd a mennyiséget` : quotationQuantity(candidate.quantity) !== line.quantity.replace(",", ".") ? " · a mennyiséget módosítottad; az eredeti érték forrásként megmarad" : ""}</small> : <small role="alert">A forrásmennyiség nem található a kalkulációs revízióban.</small>}</div>; })()}
              <div className="standalone-line-actions"><button className="text-button" type="button" disabled={index === 0} aria-label={`${line.description || "Tétel"} mozgatása fel`} onClick={() => moveLine(index, -1)}>↑ Fel</button><button className="text-button" type="button" disabled={index === lines.length - 1} aria-label={`${line.description || "Tétel"} mozgatása le`} onClick={() => moveLine(index, 1)}>↓ Le</button><button className="text-button" type="button" aria-label={`${line.description || "Tétel"} törlése`} onClick={() => void removeLine(line)}>Tétel törlése</button></div>
            </div>}
          </article>;
        })}
      </div>
      {catalogMessage && <p className="form-message" role="status">{catalogMessage}</p>}
      <div className="quotation-summary"><div className="quotation-current-total"><span>{historical ? `Történeti revízió · ${savedAmountLabel}` : `Jelenlegi piszkozat becslése · ${currentPriceBasisLabel}`}</span><strong>{historical ? money(activeRevision?.subtotal ?? null) : mixedPriceClasses ? "Árbesorolás ellenőrzése" : money(scaledToDecimal(localEstimate, 2))}</strong><small>{historical ? "Változtathatatlan ajánlati pillanatkép összege." : mixedPriceClasses ? "Nettó és bruttó tételek nem keverhetők; a mentés blokkolva marad." : missingPriceCount ? `${missingPriceCount} tétel egységára hiányzik; ez a részösszeg csak a megadott árakat tartalmazza, nem kész ajánlat.` : "A szerver mentéskor újraszámítja; nem végleges ajánlat."}</small></div>{!historical && dirty && savedSubtotal !== null && <div className="quotation-saved-total"><span>Legutóbb mentve · v{currentRevision?.revision_number ?? version} · {savedAmountLabel}</span><strong>{money(String(savedSubtotal))}</strong></div>}</div>
    </fieldset>
    {!historical && !result.ok && result.error && <div className="form-message is-error" role="alert">{result.error}{result.code === "CONFLICT" && quotationId && <button type="button" className="secondary-button" onClick={async () => { const accepted = await requestConfirmation({ title: "Helyi változat elvetése", message: "A legfrissebb revízió megnyitása elveti ezt a helyi módosításcsomagot.", cancelLabel: "Maradok", actions: [{ label: "Legfrissebb revízió megnyitása", tone: "danger", run: () => undefined }] }); if (accepted) { discardRecovery(); router.replace(latestUrl); } }}>Legfrissebb revízió megnyitása</button>}</div>}
    {!historical && <QuotationSaveBar state={quotationSaveState({ pending, error: !result.ok && Boolean(result.error), dirty, hasRevision: Boolean(currentRevisionId) || result.ok })} labels={{ saving: "Mentés folyamatban…", error: "A mentés nem sikerült", unsaved: "Nem mentett módosítások", saved: `Mentve · v${result.ok ? result.data.revision_number : currentRevision?.revision_number ?? version}`, new: "Még nincs mentve" }} disabled={pending || !recoveryReady} onSave={() => save()} />}
  </section>;
}
