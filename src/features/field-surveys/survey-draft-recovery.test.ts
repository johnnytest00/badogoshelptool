import { describe, expect, it } from "vitest";
import { parseSurveyDraftRecovery, readSurveyDraftRecovery, removeSurveyDraftRecovery, writeSurveyDraftRecovery, type SurveyDraftRecovery } from "./survey-draft-recovery";

const snapshot: SurveyDraftRecovery = {
  schemaVersion: 1,
  activeSectionId: "123e4567-e89b-42d3-a456-426614174003",
  projectId: "project-demo-1",
  version: 0,
  requestSurveyId: "123e4567-e89b-42d3-a456-426614174099",
  sections: [{
    id: "123e4567-e89b-42d3-a456-426614174002",
    name: "Tető",
    workType: "roof",
    roofType: "gable",
    notes: "Megjegyzés frissítés után is",
    photoIds: [],
    measurements: [{ id: "123e4567-e89b-42d3-a456-426614174001", label: "Külső hossz", value: "még nincs kész", unit: "mm", semanticType: "roof_outer_length" }],
  }, {
    id: "123e4567-e89b-42d3-a456-426614174003",
    name: "Eresz",
    workType: "gutter",
    notes: "Külön munkaszakasz",
    photoIds: [],
    measurements: [],
  }],
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe("survey draft recovery", () => {
  it("round-trips notes, roof selection, sections, and unfinished measurement input", () => {
    const parsed = parseSurveyDraftRecovery(JSON.stringify(snapshot));
    expect(parsed).toEqual(snapshot);
    expect(parsed?.sections[0].notes).toBe("Megjegyzés frissítés után is");
    expect(parsed?.sections[0].roofType).toBe("gable");
    expect(parsed?.sections[0].measurements[0].value).toBe("még nincs kész");
    expect(parsed?.sections).toHaveLength(2);
    expect(parsed?.activeSectionId).toBe(snapshot.sections[1].id);
    expect(parsed?.projectId).toBe("project-demo-1");
  });

  it("reads, writes, and removes an explicit session draft", () => {
    const storage = memoryStorage();
    expect(writeSurveyDraftRecovery(storage, "survey", snapshot)).toBe(true);
    expect(readSurveyDraftRecovery(storage, "survey")).toEqual(snapshot);
    expect(removeSurveyDraftRecovery(storage, "survey")).toBe(true);
    expect(readSurveyDraftRecovery(storage, "survey")).toBeNull();
  });

  it("rejects malformed versions and identifiers without losing valid older drafts", () => {
    const legacy = { ...snapshot } as Record<string, unknown>;
    delete legacy.schemaVersion;
    delete legacy.activeSectionId;
    delete legacy.requestSurveyId;
    expect(parseSurveyDraftRecovery(JSON.stringify(legacy))).toMatchObject({ schemaVersion: 1, requestSurveyId: null, activeSectionId: snapshot.sections[0].id });
    expect(parseSurveyDraftRecovery(JSON.stringify({ ...snapshot, version: -1 }))).toBeNull();
    expect(parseSurveyDraftRecovery(JSON.stringify({ ...snapshot, requestSurveyId: "not-a-uuid" }))).toBeNull();
  });
});
