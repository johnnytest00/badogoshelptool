import type { FieldSurveyMeasurement } from "@/domain/field-surveys/contracts";
import type { RoofDetail, RoofDetailFieldKey } from "@/domain/field-surveys/roof-details";
import { surveySectionsSchema, type SurveySection } from "@/domain/field-surveys/workspace";

export type SurveyMeasurementDraft = Omit<FieldSurveyMeasurement, "value"> & { value: string };
/** A méretek szerkesztés közben szövegként élnek (magyar tizedesvessző, részleges beírás), mentéskor számra váltanak. */
export type RoofDetailDraft = Omit<RoofDetail, RoofDetailFieldKey> & Record<RoofDetailFieldKey, string>;
export type SurveySectionDraft = Omit<SurveySection, "measurements" | "roofDetails"> & { measurements: SurveyMeasurementDraft[]; roofDetails?: RoofDetailDraft[] };

/** Mentett részlet → szerkeszthető piszkozat; a hiányzó érték üres marad, a tizedespont vesszőre vált. */
export function roofDetailDraft(detail: RoofDetail): RoofDetailDraft {
  const text = (value: number | null) => value === null ? "" : String(value).replace(".", ",");
  return { ...detail, count: text(detail.count), widthMm: text(detail.widthMm), heightMm: text(detail.heightMm), lengthM: text(detail.lengthM) };
}

/** Üres mező = hiányzó adat (null), nem nulla; az érvénytelen szöveg NaN-ként a séma hibájába fut. */
export function serializeRoofDetail(detail: RoofDetailDraft): RoofDetail {
  const value = (raw: string) => raw.trim() === "" ? null : Number(raw.trim().replace(",", "."));
  return { ...detail, count: value(detail.count), widthMm: value(detail.widthMm), heightMm: value(detail.heightMm), lengthM: value(detail.lengthM) };
}

export type SurveyDraftRecovery = Readonly<{
  schemaVersion: 1;
  sections: SurveySectionDraft[];
  activeSectionId: string;
  projectId: string;
  version: number;
  requestSurveyId: string | null;
  /** Ms timestamp and writing tab of the last autosave; absent in drafts stored before F9.45.2. */
  savedAt?: number;
  writer?: string;
}>;

export type SessionDraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export type ListableDraftStorage = SessionDraftStorage & Pick<Storage, "key" | "length">;

const KEY_PREFIX = "tetopro-survey";
/**
 * Each editor instance writes ONLY its own record (`…:{target}:{instance}`), so two tabs can never overwrite each other and
 * no cross-tab compare-and-set is needed. `target` is the saved survey id, or `n-{draftId}` for an unsaved new survey
 * (a stable per-survey id, kept in the URL). Legacy records (`…:{surveyId|new}`, no instance) stay readable.
 */
export const newSurveyTarget = (draftId: string) => `n-${draftId}`;
export const surveyDraftKey = (userId: string, organizationId: string, target: string, instanceId?: string) =>
  `${KEY_PREFIX}:${userId}:${organizationId}:${target}${instanceId ? `:${instanceId}` : ""}`;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function serializeSurveyDraftSections(sections: readonly SurveySectionDraft[]): SurveySection[] {
  return sections.map((section) => ({
    ...section,
    roofDetails: section.roofDetails?.map(serializeRoofDetail),
    measurements: section.measurements.map((measurement) => ({
      ...measurement,
      value: measurement.value.trim() === "" ? null : Number(measurement.value.trim().replace(",", ".")),
    })),
  }));
}

function hasValidDraftShape(value: unknown): value is Omit<SurveyDraftRecovery, "schemaVersion" | "requestSurveyId"> & Partial<Pick<SurveyDraftRecovery, "schemaVersion" | "requestSurveyId">> {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.sections) || typeof candidate.projectId !== "string"
    || (candidate.activeSectionId !== undefined && typeof candidate.activeSectionId !== "string")
    || !Number.isSafeInteger(candidate.version) || Number(candidate.version) < 0
    || (candidate.schemaVersion !== undefined && candidate.schemaVersion !== 1)
    || (candidate.requestSurveyId !== undefined && candidate.requestSurveyId !== null
      && (typeof candidate.requestSurveyId !== "string" || !uuidPattern.test(candidate.requestSurveyId)))) return false;

  const sections = candidate.sections as unknown[];
  if (sections.some((section) => !section || typeof section !== "object" || !Array.isArray((section as { measurements?: unknown }).measurements)
    || (section as { measurements: unknown[] }).measurements.some((measurement) => !measurement || typeof measurement !== "object" || typeof (measurement as { value?: unknown }).value !== "string"))) return false;

  // Validate the full editable structure while allowing temporarily invalid numeric input to recover.
  const structuralSections = sections.map((section) => ({
    ...(section as Record<string, unknown>),
    name: typeof (section as { name?: unknown }).name === "string" && (section as { name: string }).name.trim() ? (section as { name: string }).name : "x",
    notes: typeof (section as { notes?: unknown }).notes === "string" ? (section as { notes: string }).notes.slice(0, 2000) : "",
    measurements: ((section as { measurements: Array<Record<string, unknown>> }).measurements).map((measurement) => ({
      ...measurement,
      label: typeof measurement.label === "string" && measurement.label.trim() ? measurement.label : "x",
      value: null,
    })),
    // A részletek méretei szerkesztés közben szövegek; a státuszt is semlegesítjük, mert érték nélkül a „Felmérve” nem érvényes.
    ...(Array.isArray((section as { roofDetails?: unknown }).roofDetails)
      ? { roofDetails: (section as { roofDetails: Array<Record<string, unknown>> }).roofDetails.map((detail) => ({
          ...detail,
          status: "present_unmeasured",
          count: null, widthMm: null, heightMm: null, lengthM: null,
          note: typeof detail.note === "string" ? detail.note.slice(0, 500) : "",
        })) }
      : {}),
  }));
  return surveySectionsSchema.safeParse(structuralSections).success;
}

export function parseSurveyDraftRecovery(raw: string): SurveyDraftRecovery | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!hasValidDraftShape(value)) return null;
    return {
      schemaVersion: 1,
      sections: value.sections as SurveySectionDraft[],
      activeSectionId: typeof value.activeSectionId === "string" && value.sections.some((section) => section.id === value.activeSectionId) ? value.activeSectionId : value.sections[0].id,
      projectId: value.projectId,
      version: value.version,
      requestSurveyId: value.requestSurveyId ?? null,
      ...(typeof (value as { savedAt?: unknown }).savedAt === "number" ? { savedAt: (value as { savedAt: number }).savedAt } : {}),
      ...(typeof (value as { writer?: unknown }).writer === "string" ? { writer: (value as { writer: string }).writer } : {}),
    };
  } catch {
    return null;
  }
}

export function readSurveyDraftRecovery(storage: SessionDraftStorage, key: string): SurveyDraftRecovery | null {
  const raw = storage.getItem(key);
  return raw ? parseSurveyDraftRecovery(raw) : null;
}

export function writeSurveyDraftRecovery(storage: SessionDraftStorage, key: string, draft: SurveyDraftRecovery): boolean {
  try {
    storage.setItem(key, JSON.stringify({ ...draft, savedAt: draft.savedAt ?? Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function removeSurveyDraftRecovery(storage: SessionDraftStorage, key: string): boolean {
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

/** A draft is worth recovering only if it holds something the user actually entered; an empty work-type choice is not. */
export function draftHasContent(draft: SurveyDraftRecovery): boolean {
  return draft.sections.length > 1 || draft.sections.some((section) => section.notes.trim() !== ""
    || section.measurements.some((measurement) => measurement.value.trim() !== "")
    || (section.roofDetails?.length ?? 0) > 0);
}


export type ListedSurveyDraft = Readonly<{
  key: string; organizationId: string; target: string; surveyId: string | null; draftId: string | null;
  /** `"legacy"` for records written before per-instance keys. */
  instance: string; draft: SurveyDraftRecovery;
}>;

function parseKey(key: string, prefix: string): { organizationId: string; target: string; instance: string; surveyId: string | null; draftId: string | null } | null {
  if (!key.startsWith(prefix)) return null;
  const [organizationId, target, instance, extra] = key.slice(prefix.length).split(":");
  if (!organizationId || !target || extra !== undefined) return null;
  const draftId = target.startsWith("n-") && uuidPattern.test(target.slice(2)) ? target.slice(2) : null;
  const surveyId = uuidPattern.test(target) ? target : null;
  if (!draftId && !surveyId && target !== "new") return null;
  return { organizationId, target, instance: instance ?? "legacy", surveyId, draftId };
}

/** Recoverable drafts of exactly this user in the given organizations, newest first. Malformed or empty drafts are ignored. */
export function listSurveyDrafts(storage: ListableDraftStorage, userId: string, organizationIds: readonly string[]): ListedSurveyDraft[] {
  const prefix = `${KEY_PREFIX}:${userId}:`;
  const found: ListedSurveyDraft[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      const parsed = key ? parseKey(key, prefix) : null;
      if (!key || !parsed || !organizationIds.includes(parsed.organizationId)) continue;
      const raw = storage.getItem(key);
      const draft = raw ? parseSurveyDraftRecovery(raw) : null;
      if (draft && draftHasContent(draft)) found.push({ key, ...parsed, draft });
    }
  } catch { return []; }
  return found.sort((a, b) => (b.draft.savedAt ?? 0) - (a.draft.savedAt ?? 0));
}

/** Other editors' recoverable drafts for the same survey/draft id (never this tab's own, never a live tab's). Callers must not auto-select from this list. */
export function findOtherDrafts(storage: ListableDraftStorage, userId: string, organizationId: string, target: string, ownInstance: string, live: ReadonlySet<string>): ListedSurveyDraft[] {
  return listSurveyDrafts(storage, userId, [organizationId]).filter((item) => item.target === target && item.instance !== ownInstance && !live.has(item.instance));
}

/** Moves a valid draft to a fresh unique key so it stays recoverable (listed on the dashboard) while its original key is reused. */
export function moveDraftAside(storage: SessionDraftStorage, fromKey: string, toKey: string): boolean {
  try {
    const raw = storage.getItem(fromKey);
    if (!raw || !parseSurveyDraftRecovery(raw)) return false;
    storage.setItem(toKey, raw);
    storage.removeItem(fromKey);
    return true;
  } catch { return false; }
}

export type RecoveryResolution = Readonly<{ candidate: Readonly<{ key: string; draft: SurveyDraftRecovery; explicit: boolean }> | null; others: number }>;

/**
 * Which draft this editor restores: the one the dashboard explicitly named (`wanted` = "{target}.{instance}"), otherwise exactly this
 * tab's own record. Another tab's draft is never chosen implicitly; it is only counted so the user can be pointed to it.
 */
export function resolveRecovery(storage: ListableDraftStorage, userId: string, organizationId: string, target: string, ownInstance: string, wanted: string | null, live: ReadonlySet<string>): RecoveryResolution {
  const read = (key: string) => { try { const raw = storage.getItem(key); const draft = raw ? parseSurveyDraftRecovery(raw) : null; return draft && draftHasContent(draft) ? draft : null; } catch { return null; } };
  let candidate: RecoveryResolution["candidate"] = null;
  if (wanted) {
    const dot = wanted.lastIndexOf(".");
    const wantedTarget = wanted.slice(0, dot); const wantedInstance = wanted.slice(dot + 1);
    const matches = wantedTarget === target || (wantedTarget === "new" && wantedInstance === "legacy" && target.startsWith("n-"));
    const key = surveyDraftKey(userId, organizationId, wantedTarget, wantedInstance === "legacy" ? undefined : wantedInstance);
    const draft = dot > 0 && matches ? read(key) : null;
    if (draft) candidate = { key, draft, explicit: true };
  } else {
    const key = surveyDraftKey(userId, organizationId, target, ownInstance);
    const draft = read(key);
    if (draft) candidate = { key, draft, explicit: false };
  }
  const others = findOtherDrafts(storage, userId, organizationId, target, ownInstance, live).filter((item) => item.key !== candidate?.key).length;
  return { candidate, others };
}
