import type { CalculatorDefinition } from "./construction-calculator-types";
import { fieldContractIssues, isFieldVisible, roofShapeOf } from "./construction-computation";
import type { DrawingTextSource } from "@/infrastructure/drawings/drawing-text-source";

export type DrawingFieldProposal = Readonly<{ fieldKey: string; value: string }>;
/** What the user says a page shows. Only their answer decides it; a title in the text layer is a suggestion (P0-2). */
export type DrawingPlanKind = "roof-plan" | "floor-plan" | "section" | "unknown";
/** "" = not answered yet, treated as strictly as "unknown". */
export type DrawingPlanAnswer = DrawingPlanKind | "";
export const drawingPlanKindChoices: readonly Readonly<{ kind: DrawingPlanKind; label: string }>[] = [
  { kind: "roof-plan", label: "Tetőterv" }, { kind: "floor-plan", label: "Alaprajz" },
  { kind: "section", label: "Metszet" }, { kind: "unknown", label: "Nem tudom" },
];
/** Why a page other than a roof plan still needs the covered-roof confirmation on every roof dimension. */
export const drawingPlanWarnings: Readonly<Record<Exclude<DrawingPlanKind, "roof-plan">, string>> = {
  "floor-plan": "Alaprajz, nem tetőterv. A méretek a falakra vonatkoznak; tetőméretként csak ellenőrizve vidd át.",
  section: "Metszet, nem tetőfelülnézet. A látszó méretek egy vágási síkra vonatkoznak, nem a tető vetületére.",
  unknown: "A lap típusa tisztázatlan. Amíg nem tetőterv, minden tetőméretet külön meg kell erősítened.",
};
/** Field key → the token (see drawingAssumptionToken) the user explicitly accepted the calculator default for. */
export type DrawingAssumptionConfirmations = Readonly<Record<string, string>>;
export type DrawingTakeoffScope = Readonly<{ active: boolean; sectionId: string; sectionName: string; coverageConfirmed: boolean; wholeRoofConfirmed: boolean; assumptionConfirmations: DrawingAssumptionConfirmations }>;
export const noDrawingAssumptionConfirmations: DrawingAssumptionConfirmations = {};
export const inactiveDrawingTakeoffScope: DrawingTakeoffScope = { active: false, sectionId: "", sectionName: "", coverageConfirmed: false, wholeRoofConfirmed: false, assumptionConfirmations: noDrawingAssumptionConfirmations };

/**
 * A3: melyik kalkulátor kap tetőszakasz-hatókört (kijelölés, fedettség igazolása, szakaszonkénti mentés).
 *
 * Nem minden tetőkalkulátor ilyen. A `roof.material-takeoff` és a `roof.timber-cutlist` mezősémája AZONOS (ugyanaz
 * a 23 kulcs, lásd `roof-calculator-definitions.ts`): mindkettő a tető vízszintes geometriájából számol mennyiséget,
 * ezért értelmes megkérdezni, MELYIK fedett tetőrészről van szó. A `roof.rafter-cut` egyetlen szarufát szab ki
 * (fél fesztáv és gerincemelkedés, nincs tetőforma és nincs felület), a `roof.truss-members` pedig egyetlen rácsos
 * tartó burkológeometriája — ezeknél a „fedett tetőrész" és a „teljes tetőt lefedi" állítás nem jelentene semmit,
 * a kapu csak szertartás lenne szakmai tartalom nélkül. Ők továbbra is kapnak rajzpanelt, kalibrációt és
 * koppintásos átvitelt, szakaszkezelést nem.
 */
export const roofSectionScopeCalculators: ReadonlySet<string> = new Set(["roof.material-takeoff", "roof.timber-cutlist"]);
export const supportsRoofSectionScope = (calculatorId: string) => roofSectionScopeCalculators.has(calculatorId);

/**
 * Inputs a drawing never proves but the calculator silently defaults (roof shape = gable, overhangs = 0 mm). On a drawing
 * section these defaults are assumptions until the user accepts them or enters another value; manual calculators are unaffected.
 */
export const drawingAssumptionFieldKeys: ReadonlySet<string> = new Set(["roofShape", "frontGableOverhangMm", "rearGableOverhangMm"]);

/** An acceptance is bound to the value and roof shape it was given for; changing either asks again. */
export const drawingAssumptionToken = (values: Record<string, string>, key: string) => `${roofShapeOf(values)}|${(values[key] ?? "").trim()}`;

export function unconfirmedDrawingAssumptions(definition: CalculatorDefinition, values: Record<string, string>, scope: DrawingTakeoffScope) {
  if (!scope.active) return [];
  return definition.fields.filter((field) => {
    if (!drawingAssumptionFieldKeys.has(field.key) || !isFieldVisible(field, values)) return false;
    const value = (values[field.key] ?? "").trim();
    // Any other value was entered or transferred by the user, so it is no default.
    return (value === "" || value === (field.initial ?? "")) && scope.assumptionConfirmations[field.key] !== drawingAssumptionToken(values, field.key);
  });
}

/** What the calculation itself cannot express about overhangs for the current shape (no formula is invented for it). */
export function drawingOverhangLimitation(values: Record<string, string>) {
  const shape = roofShapeOf(values);
  if (shape === "gable") return null;
  if (shape === "shed") return "Félnyeregtetőnél csak az alsó eresz vízszintes kiülése számít; a felső él és az oldalsó oromfalak túlnyúlását a számítás nem kezeli.";
  return "Ennél a tetőformánál a számítás nem kezel külön kiülést: a megadott hossz és szélesség maga a tető vízszintes vetülete. Alaprajzi falméretből a túlnyúlás nem kerül bele az eredménybe.";
}

/**
 * A named, coverage-confirmed section is saveable on its own once its assumed defaults are confirmed; the whole-roof
 * confirmation only labels it. The work-session export is not gated by this.
 */
export function canSaveDrawingTakeoff(scope: DrawingTakeoffScope, unconfirmedAssumptions: readonly unknown[] = []) {
  return !scope.active || (scope.sectionName.trim() !== "" && scope.coverageConfirmed && unconfirmedAssumptions.length === 0);
}

/**
 * Save-session key: every drawing section is its own calculation (own calculationId and revisions), so saving
 * section B never becomes a new revision of section A (M12 audit T4).
 */
export function drawingTakeoffSessionKey(calculatorId: string, scope: DrawingTakeoffScope) {
  return scope.active && scope.sectionId ? `${calculatorId}#section:${scope.sectionId}` : calculatorId;
}

/** Default calculation name; the stored name is the only place a section scope survives the save without a schema change. */
export function drawingTakeoffCalculationName(title: string, scope: DrawingTakeoffScope) {
  if (!scope.active || !scope.sectionId) return title;
  const name = scope.sectionName.trim() || "Tetőszakasz";
  return scope.wholeRoofConfirmed ? `${title} · ${name}` : `${title} · ${name} (tetőszakasz, nem teljes épület)`;
}

const rafterCutRules = [
  { labels: ["Fél fesztáv", "Fél tetőfesztáv"], fieldKey: "horizontalHalfSpanMm", ruleId: "M12.4.RAFTER.HALF_SPAN" },
  { labels: ["Gerincemelkedés", "Tetőemelkedés a gerincig"], fieldKey: "riseMm", ruleId: "M12.4.RAFTER.RIDGE_RISE" },
  { labels: ["Vízszintes ereszkiülés", "Eresz vízszintes kiülése"], fieldKey: "eaveProjectionMm", ruleId: "M12.4.RAFTER.HORIZONTAL_EAVE_PROJECTION" },
] as const;
const lengthToMm = { mm: 1, cm: 10, m: 1_000 } as const;
const roofGeometryFields = new Set([
  "lengthMm", "widthMm", "pitchDegrees", "eaveOverhangMm", "frontGableOverhangMm", "rearGableOverhangMm", "sideMm",
  "lowerRunMm", "lowerRiseMm", "upperRiseMm", "hipEaveHeightMm", "wingWidthMm", "wingProjectionMm",
  "horizontalHalfSpanMm", "riseMm", "eaveProjectionMm", "spanMm",
]);

/**
 * Suggested answer only (P0-2): a page whose PDF.js text layer carries a "földszinti alaprajz" title is very likely
 * a floor plan, but no title match may stand in for the user's answer — other titles, other languages, scans and
 * OCR pages would silently get no warning at all. Returning null means "no suggestion", never "this is a roof plan".
 */
export function classifyDrawingPlan(sources: readonly DrawingTextSource[]): DrawingPlanKind | null {
  const pages = new Map<number, string[]>();
  for (const source of sources) {
    if (source.method !== "pdf-text") continue;
    const text = source.originalText.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase();
    pages.set(source.pageNumber, [...(pages.get(source.pageNumber) ?? []), text]);
  }
  return [...pages.values()].some((texts) => texts.some((text) => /\bFOLDSZINTI\b/u.test(text)) && texts.some((text) => /\bALAPRAJZ\b/u.test(text)))
    ? "floor-plan"
    : null;
}

/**
 * Strict by default (P0-2): a roof dimension needs the covered-roof confirmation on every page the user has not
 * declared a roof plan, the unanswered page included. Previously only a recognized "földszinti alaprajz" title
 * triggered it, so any other plan title — and every image or OCR source — reached the roof fields unguarded.
 */
export function requiresRoofGeometryConfirmation(definition: CalculatorDefinition, plan: DrawingPlanAnswer, fieldKey: string) {
  return plan !== "roof-plan" && definition.reference.category === "roof" && roofGeometryFields.has(fieldKey);
}

export function isPercentSlopeForPitch(source: DrawingTextSource | null, fieldKey: string) {
  return fieldKey === "pitchDegrees" && Boolean(source && /%/u.test(source.originalText));
}

export function suggestRafterCutField(source: DrawingTextSource, calculatorId: string) {
  if (calculatorId !== "roof.rafter-cut" || source.method !== "pdf-text" || source.engine !== "pdfjs-dist@6.4.299"
    || !source.sourceDocumentId || source.pageNumber < 1 || !source.position || !source.bounds) return null;
  for (const rule of rafterCutRules) for (const label of rule.labels) {
    const match = new RegExp(`^\\s*${label}\\s*:\\s*(\\d+(?:[.,]\\d{1,2})?)\\s*(mm|cm|m)\\s*$`, "iu").exec(source.originalText);
    if (!match) continue;
    const value = Number(match[1]!.replace(",", ".")) * lengthToMm[match[2]!.toLowerCase() as keyof typeof lengthToMm];
    if (!Number.isFinite(value) || value <= 0) return null;
    return {
      fieldKey: rule.fieldKey, value: String(value), sourceUnit: match[2]!.toLowerCase() as keyof typeof lengthToMm,
      ruleId: rule.ruleId, sourceText: source.originalText, sourceDocumentId: source.sourceDocumentId, pageNumber: source.pageNumber,
      position: source.position, bounds: source.bounds,
    };
  }
  return null;
}

export function missingRequiredDrawingFields(definition: CalculatorDefinition, current: Record<string, string>, proposed: Record<string, string>) {
  const values = { ...current, ...proposed };
  return definition.fields.filter((field) => field.key !== "eaveOverhangMm" && !field.advanced && field.initial === undefined && field.kind !== "checkbox" && isFieldVisible(field, values)
    && !(proposed[field.key] ?? current[field.key] ?? field.initial ?? "").trim());
}

export function revokeApprovedDrawingValues(fields: Record<string, string>, approvals: readonly Pick<DrawingFieldProposal, "fieldKey" | "value">[]) {
  const nextFields = { ...fields };
  const invalidatedFieldKeys = approvals.flatMap(({ fieldKey, value }) => {
    if (nextFields[fieldKey] !== value) return [];
    delete nextFields[fieldKey];
    return [fieldKey];
  });
  return { fields: nextFields, invalidatedFieldKeys };
}

export function approveDrawingFields(
  definition: CalculatorDefinition,
  current: Record<string, string>,
  proposals: readonly DrawingFieldProposal[],
  overwriteKeys: ReadonlySet<string>,
): { ok: true; fields: Record<string, string> } | { ok: false; issues: string[] } {
  const fields = definition.fields;
  const allowed = new Set(fields.map((field) => field.key));
  const seen = new Set<string>();
  const issues: string[] = [];
  for (const proposal of proposals) {
    if (!allowed.has(proposal.fieldKey)) issues.push("A kiválasztott mező ehhez a kalkulátorhoz nem tartozik.");
    if (seen.has(proposal.fieldKey)) issues.push("Egy mező csak egyszer szerepelhet.");
    if (Object.hasOwn(current, proposal.fieldKey) && current[proposal.fieldKey].trim() !== "" && !overwriteKeys.has(proposal.fieldKey)) {
      issues.push(`${fields.find((field) => field.key === proposal.fieldKey)?.label ?? proposal.fieldKey}: a meglévő érték felülírása nincs jóváhagyva.`);
    }
    seen.add(proposal.fieldKey);
  }
  if (issues.length) return { ok: false, issues };

  const proposedValues = Object.fromEntries(proposals.map(({ fieldKey, value }) => [fieldKey, value]));
  const validation = fieldContractIssues(fields, proposedValues);
  if (definition.reference.id === "roof.rafter-cut") for (const key of ["horizontalHalfSpanMm", "riseMm"] as const) {
    if (Object.hasOwn(proposedValues, key) && Number(proposedValues[key]!.replace(",", ".")) <= 0) {
      validation.push(`${fields.find((field) => field.key === key)?.label}: 0-nál nagyobb értéket adj meg.`);
    }
  }
  if (validation.length) return { ok: false, issues: validation };
  return { ok: true, fields: Object.fromEntries(proposals.map(({ fieldKey, value }) => [fieldKey, value.replace(",", ".")])) };
}

/**
 * The gate chain the one-tap transfer runs before it will fill a roof dimension, as a single message ("" = may go
 * ahead). Extracted from `PlanFieldTransfer` unchanged (T8): the order matters, because each later answer only makes
 * sense once the earlier one is given — what the page shows, then which covered section it belongs to, then that the
 * dimension really is taken from the covered roof part and not from a wall.
 */
export function drawingQuickScopeIssue(input: Readonly<{
  definition: CalculatorDefinition;
  fieldKey: string;
  plan: DrawingPlanAnswer;
  pageNumber: number;
  takeoffScopeActive: boolean;
  sectionName: string;
  coverageConfirmed: boolean;
  planScopeConfirmed: boolean;
}>) {
  if (!requiresRoofGeometryConfirmation(input.definition, "unknown", input.fieldKey)) return "";
  if (!input.plan) return `Előbb add meg, mit mutat ez a lap (${input.pageNumber}. oldal).`;
  if (input.takeoffScopeActive && (!input.sectionName.trim() || !input.coverageConfirmed)) {
    return "Előbb nevezd meg a tetőszakaszt, jelöld ki a rajzon, és igazold, hogy tetővel fedett.";
  }
  if (!requiresRoofGeometryConfirmation(input.definition, input.plan, input.fieldKey)) return "";
  return input.planScopeConfirmed ? "" : "Előbb erősítsd meg, hogy a rajzi méreteket a ténylegesen fedett tetőrészhez rendeled.";
}

/**
 * T7: melyik mezőt kéri be a rajz melletti vezetett bevitel éppen. Egyszerre pontosan egyet, ebben a sorrendben:
 * a tetőforma előbb (ő dönti el, mely mezők léteznek egyáltalán — `isFieldVisible`), utána a hiányzó kötelező
 * méretek, végül a megmaradt, meg nem erősített alapértékek. `""` = nincs mit bekérni, nem jelenik meg kártya.
 *
 * Csak sorrendet mond: mindkét listát a hívó állítja elő a meglévő `missingRequiredDrawingFields` és
 * `unconfirmedDrawingAssumptions` függvényekkel, így a láthatóság és a validáció szabálya változatlan.
 */
export function guidedDrawingFieldKey(
  missing: readonly Readonly<{ key: string }>[],
  unconfirmedAssumptions: readonly Readonly<{ key: string }>[],
) {
  if (unconfirmedAssumptions.some((field) => field.key === "roofShape")) return "roofShape";
  return missing[0]?.key ?? unconfirmedAssumptions[0]?.key ?? "";
}
