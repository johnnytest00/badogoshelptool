import type { FieldSurveyMeasurement } from "@/domain/field-surveys/contracts";
import { surveySectionsSchema, type SurveySection } from "@/domain/field-surveys/workspace";

export type SurveyMeasurementDraft = Omit<FieldSurveyMeasurement, "value"> & { value: string };
export type SurveySectionDraft = Omit<SurveySection, "measurements"> & { measurements: SurveyMeasurementDraft[] };

export type SurveyDraftRecovery = Readonly<{
  schemaVersion: 1;
  sections: SurveySectionDraft[];
  activeSectionId: string;
  projectId: string;
  version: number;
  requestSurveyId: string | null;
}>;

export type SessionDraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function serializeSurveyDraftSections(sections: readonly SurveySectionDraft[]): SurveySection[] {
  return sections.map((section) => ({
    ...section,
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
    storage.setItem(key, JSON.stringify(draft));
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
