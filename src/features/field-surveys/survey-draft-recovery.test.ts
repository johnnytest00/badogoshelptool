import { describe, expect, it } from "vitest";
import { draftHasContent, findOtherDrafts, listSurveyDrafts, moveDraftAside, resolveRecovery, newSurveyTarget, surveyDraftKey, parseSurveyDraftRecovery, readSurveyDraftRecovery, removeSurveyDraftRecovery, writeSurveyDraftRecovery, type SurveyDraftRecovery } from "./survey-draft-recovery";

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
    roofTimberParameters: { rafterMaxSpacingMm: 600, rafterStartInsetMm: 0, battenSectionWidthMm: 30 },
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
    expect(parsed?.sections[0].roofTimberParameters).toEqual(snapshot.sections[0].roofTimberParameters);
    expect(parsed?.sections[0].measurements[0].value).toBe("még nincs kész");
    expect(parsed?.sections).toHaveLength(2);
    expect(parsed?.activeSectionId).toBe(snapshot.sections[1].id);
    expect(parsed?.projectId).toBe("project-demo-1");
  });

  it("reads, writes, and removes an explicit session draft", () => {
    const storage = memoryStorage();
    expect(writeSurveyDraftRecovery(storage, "survey", snapshot)).toBe(true);
    expect(readSurveyDraftRecovery(storage, "survey")).toMatchObject(snapshot);
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

describe("F9.45.2 per-instance local drafts", () => {
  const A = "123e4567-e89b-42d3-a456-4266141740a1"; const B = "123e4567-e89b-42d3-a456-4266141740b2";
  const O1 = "123e4567-e89b-42d3-a456-4266141740c1"; const O2 = "123e4567-e89b-42d3-a456-4266141740c2";
  const S1 = "123e4567-e89b-42d3-a456-4266141740d1";
  const D1 = "123e4567-e89b-42d3-a456-4266141740e1"; const D2 = "123e4567-e89b-42d3-a456-4266141740e2";
  const store = () => { const m = new Map<string, string>(); return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), key: (i: number) => [...m.keys()][i] ?? null, get length() { return m.size; } }; };
  const withValue = (value: string): SurveyDraftRecovery => ({ ...snapshot, sections: [{ ...snapshot.sections[0], notes: "", measurements: [{ ...snapshot.sections[0].measurements[0], value }] }] });
  const value = (s: ReturnType<typeof store>, key: string) => readSurveyDraftRecovery(s, key)?.sections[0].measurements[0].value;

  it("two tabs editing the same survey keep independent records; one tab's save removes only its own", () => {
    const s = store();
    const tabA = surveyDraftKey(A, O1, S1, "tab-a"); const tabB = surveyDraftKey(A, O1, S1, "tab-b");
    writeSurveyDraftRecovery(s, tabA, { ...withValue("9,1"), savedAt: 1 });
    writeSurveyDraftRecovery(s, tabB, { ...withValue("5,5"), savedAt: 2 });
    removeSurveyDraftRecovery(s, tabA); // tab A's manual Save succeeded
    expect(value(s, tabB)).toBe("5,5");
    expect(listSurveyDrafts(s, A, [O1]).map((item) => item.instance)).toEqual(["tab-b"]);
  });
  it("restores exactly this tab's own record after a refresh, never another instance's — even a newer one (no found[0])", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-b"), { ...withValue("9,3"), savedAt: 1 });
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-a"), { ...withValue("9,6"), savedAt: 99 });
    const own = resolveRecovery(s, A, O1, S1, "tab-b", null, new Set());
    expect(own.candidate && value(s, own.candidate.key)).toBe("9,3");
    expect(own.others).toBe(1);
  });
  it("a tab without its own record gets NO candidate even if other drafts exist; they are only counted", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-a"), withValue("9,6"));
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-c"), withValue("1"));
    const r = resolveRecovery(s, A, O1, S1, "tab-b", null, new Set());
    expect(r.candidate).toBeNull();
    expect(r.others).toBe(2);
    expect(findOtherDrafts(s, A, O1, S1, "tab-b", new Set(["tab-a"])).map((item) => item.instance)).toEqual(["tab-c"]);
  });
  it("the dashboard's explicit target restores exactly that record; a mismatching or missing target restores nothing", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-a"), withValue("9,6"));
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-c"), withValue("1"));
    const hit = resolveRecovery(s, A, O1, S1, "tab-b", `${S1}.tab-a`, new Set());
    expect(hit.candidate && value(s, hit.candidate.key)).toBe("9,6");
    expect(resolveRecovery(s, A, O1, S1, "tab-b", `${S1}.nope`, new Set()).candidate).toBeNull();
    expect(resolveRecovery(s, A, O1, S1, "tab-b", `${D1}.tab-a`, new Set()).candidate).toBeNull();
    expect(resolveRecovery(s, A, O1, S1, "tab-b", "garbage", new Set()).candidate).toBeNull();
  });
  it("a corrupted own record fails safely and is not replaced by another's", () => {
    const s = store();
    s.setItem(surveyDraftKey(A, O1, S1, "tab-b"), "{broken");
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "tab-a"), withValue("9,6"));
    expect(resolveRecovery(s, A, O1, S1, "tab-b", null, new Set()).candidate).toBeNull();
  });
  it("another user's or organization's record is never offered", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(B, O1, S1, "tab-b"), withValue("1"));
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O2, S1, "tab-b"), withValue("2"));
    expect(resolveRecovery(s, A, O1, S1, "tab-b", null, new Set())).toEqual({ candidate: null, others: 0 });
    expect(resolveRecovery(s, A, O1, S1, "tab-b", `${S1}.tab-b`, new Set()).candidate).toBeNull();
  });
  it("'decide later' moves the draft aside intact, so reusing the tab's key cannot overwrite it", () => {
    const s = store(); const own = surveyDraftKey(A, O1, S1, "tab-b"); const aside = surveyDraftKey(A, O1, S1, "aside-1");
    writeSurveyDraftRecovery(s, own, { ...withValue("9,3"), version: 6 });
    expect(moveDraftAside(s, own, aside)).toBe(true);
    writeSurveyDraftRecovery(s, own, withValue("official+edit"));
    expect(readSurveyDraftRecovery(s, aside)).toMatchObject({ version: 6 });
    expect(value(s, aside)).toBe("9,3");
    expect(moveDraftAside(s, "missing", "x")).toBe(false);
  });
  it("without Web Locks (empty live set) other drafts are still counted, nothing is hidden", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "x"), withValue("1"));
    expect(findOtherDrafts(s, A, O1, S1, "me", new Set())).toHaveLength(1);
  });
  it("unsaved new surveys have separate, stable draft ids and never share records", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, newSurveyTarget(D1), "i1"), withValue("1"));
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, newSurveyTarget(D2), "i2"), withValue("2"));
    expect(listSurveyDrafts(s, A, [O1]).map((item) => item.draftId).sort()).toEqual([D1, D2]);
    expect(resolveRecovery(s, A, O1, newSurveyTarget(D1), "i1", null, new Set()).candidate).not.toBeNull();
    expect(resolveRecovery(s, A, O1, newSurveyTarget(D1), "i2", null, new Set()).candidate).toBeNull();
  });
  it("legacy single-key drafts stay listed and are restored only when named explicitly", () => {
    const s = store();
    writeSurveyDraftRecovery(s, `tetopro-survey:${A}:${O1}:new`, withValue("L"));
    writeSurveyDraftRecovery(s, `tetopro-survey:${A}:${O1}:${S1}`, withValue("S"));
    expect(listSurveyDrafts(s, A, [O1]).map((item) => item.instance)).toEqual(["legacy", "legacy"]);
    expect(resolveRecovery(s, A, O1, newSurveyTarget(D1), "me", null, new Set()).candidate).toBeNull();
    const legacyNew = resolveRecovery(s, A, O1, newSurveyTarget(D1), "me", "new.legacy", new Set());
    expect(legacyNew.candidate && value(s, legacyNew.candidate.key)).toBe("L");
    const legacySaved = resolveRecovery(s, A, O1, S1, "me", `${S1}.legacy`, new Set());
    expect(legacySaved.candidate && value(s, legacySaved.candidate.key)).toBe("S");
  });
  it("a stale tab's draft keeps its original base version after another tab saved (conflict is detectable)", () => {
    const s = store(); const key = surveyDraftKey(A, O1, S1, "tab-b");
    writeSurveyDraftRecovery(s, key, { ...withValue("9,3"), version: 4 });
    const r = resolveRecovery(s, A, O1, S1, "tab-b", null, new Set());
    expect(r.candidate?.draft.version).toBe(4);
    expect(r.candidate?.draft.sections[0].measurements[0].value).toBe("9,3");
  });
  it("lists only this user's drafts of the given organization, newest first; empty, malformed and foreign keys are ignored", () => {
    const s = store();
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "a"), { ...withValue("9"), savedAt: 2000 });
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, newSurveyTarget(D1), "b"), { ...withValue("8,5"), savedAt: 1000 });
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O2, S1, "c"), withValue("1"));
    writeSurveyDraftRecovery(s, surveyDraftKey(B, O1, S1, "d"), withValue("1"));
    writeSurveyDraftRecovery(s, surveyDraftKey(A, O1, S1, "empty"), withValue("  "));
    s.setItem(surveyDraftKey(A, O1, S1, "bad"), "{nonsense");
    s.setItem(`tetopro-survey:${A}:${O1}:not-a-uuid:x`, JSON.stringify(withValue("5")));
    s.setItem("other-app:key", "x");
    expect(listSurveyDrafts(s, A, [O1]).map((item) => item.instance)).toEqual(["a", "b"]);
    expect(listSurveyDrafts(s, B, [O2])).toEqual([]);
    expect(draftHasContent(withValue("0"))).toBe(true);
  });
  it("a draft keeps its base version, so an older draft is recognisable next to a newer saved survey", () => {
    const s = store(); const key = surveyDraftKey(A, O1, S1, "a");
    writeSurveyDraftRecovery(s, key, { ...withValue("1"), version: 1 });
    expect(readSurveyDraftRecovery(s, key)?.version).toBe(1);
  });
  it("keeps the measurement mode through a draft round trip", () => {
    const draft = { ...withValue("7,3"), sections: [{ ...withValue("7,3").sections[0], roofType: "shed" as const, roofMeasurementMode: "quick" as const }] };
    const s = store(); const key = surveyDraftKey(A, O1, S1, "a");
    writeSurveyDraftRecovery(s, key, draft);
    expect(readSurveyDraftRecovery(s, key)?.sections[0]).toMatchObject({ roofType: "shed", roofMeasurementMode: "quick" });
  });
});

describe("F9.52 piszkozat meglévő tetőrészletekkel", () => {
  const detail = (patch: Record<string, unknown> = {}) => ({
    id: "123e4567-e89b-42d3-a456-4266141740f1", kind: "chimney", status: "measured",
    count: "1", widthMm: "600", heightMm: "800", lengthM: "", note: "Hátsó tetősík", ...patch,
  });
  const withDetails = (details: Record<string, unknown>[], value = "10,5"): SurveyDraftRecovery => ({
    ...snapshot,
    sections: [{ ...snapshot.sections[0], notes: "", measurements: [{ ...snapshot.sections[0].measurements[0], value }], roofDetails: details }],
  } as unknown as SurveyDraftRecovery);

  it("visszaállítható a mért tetőrészletet tartalmazó piszkozat, a szöveges értékekkel együtt", () => {
    const parsed = parseSurveyDraftRecovery(JSON.stringify(withDetails([detail()])));
    expect(parsed).not.toBeNull();
    expect(parsed?.sections[0].roofDetails?.[0]).toMatchObject({ kind: "chimney", status: "measured", count: "1", widthMm: "600", note: "Hátsó tetősík" });
  });
  it("a szerkesztés közbeni részleges vagy érvénytelen méret sem teszi visszaállíthatatlanná", () => {
    for (const widthMm of ["12,", "abc", "", "0"]) {
      expect(parseSurveyDraftRecovery(JSON.stringify(withDetails([detail({ widthMm })])))).not.toBeNull();
    }
    expect(parseSurveyDraftRecovery(JSON.stringify(withDetails([detail({ status: "absent", count: "", widthMm: "", heightMm: "" })])))).not.toBeNull();
  });
  it("tartalmasnak számít a csak tetőrészletet rögzítő piszkozat is", () => {
    expect(draftHasContent(withDetails([detail({ status: "present_unmeasured", count: "", widthMm: "", heightMm: "" })], ""))).toBe(true);
    expect(draftHasContent(withDetails([], ""))).toBe(false);
  });
  it("a szerkezetileg hibás tetőrészletet továbbra is elutasítja", () => {
    expect(parseSurveyDraftRecovery(JSON.stringify(withDetails([detail({ kind: "new_gutter_work" })])))).toBeNull();
    expect(parseSurveyDraftRecovery(JSON.stringify(withDetails([detail({ id: "nem-uuid" })])))).toBeNull();
    expect(parseSurveyDraftRecovery(JSON.stringify(withDetails([detail({ plannedWork: "új szegély" })])))).toBeNull();
  });
  it("a tetőrészlet nélküli régi piszkozat változatlanul visszaáll", () => {
    const parsed = parseSurveyDraftRecovery(JSON.stringify(snapshot));
    expect(parsed?.sections[0].roofDetails).toBeUndefined();
    expect(parsed?.sections).toHaveLength(2);
  });
  it("a saját piszkozatot a szerkesztő visszaállításra jelölteként találja meg", () => {
    const user = "123e4567-e89b-42d3-a456-4266141740a1"; const org = "123e4567-e89b-42d3-a456-4266141740c1"; const survey = "123e4567-e89b-42d3-a456-4266141740d1";
    const memory = new Map<string, string>();
    const storage = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v), removeItem: (k: string) => void memory.delete(k), key: (i: number) => [...memory.keys()][i] ?? null, get length() { return memory.size; } };
    const key = surveyDraftKey(user, org, survey, "tab-1");
    writeSurveyDraftRecovery(storage, key, withDetails([detail()]));
    const resolved = resolveRecovery(storage, user, org, survey, "tab-1", null, new Set());
    expect(resolved.candidate?.key).toBe(key);
    expect(resolved.candidate?.draft.sections[0].roofDetails?.[0].widthMm).toBe("600");
  });
});
