import { z } from "zod";
import { MATERIAL_SPEC_FIELDS, coveringParametersFromSpec, resolveMaterialSpec, underlayParametersFromSpec, type MaterialProfile } from "@/domain/calculations/roof-material-spec";
import { roofTimberParametersSchema } from "@/domain/calculations/roof-timber-layout";
import { roofCoveringProductParametersSchema } from "@/domain/calculations/roof-covering-parameters";
import { roofUnderlayParametersSchema } from "@/domain/calculations/roof-underlay";
import { fieldContractIssues } from "./construction-computation";
import { definitions } from "./roof-calculator-definitions";
import { drawingAssumptionFieldKeys } from "./drawing-field-transfer";
import type { LengthFieldState } from "@/components/ui/length-field";
import type { RoofMaterialUiState } from "./material-spec-editor";
import type { DrawingRoofSection } from "./drawing-roof-sections";
import type { AcceptedCalibration } from "./drawing-calibration";

const FORMAT = "tetopro-roof-material-session";
const VERSION = 3;
export type RoofWorkCalculatorId = "roof.material-takeoff" | "roof.timber-cutlist";
const MAX_BYTES = 1_000_000;
const MAX_SECTIONS = 30;
const groups = ["covering", "underlay", "rafter", "batten"] as const;
const takeoffFields = definitions["roof.material-takeoff"].fields;
const inputFields = new Set(takeoffFields.map(({ key }) => key));
// A numeric draft as typed (possibly half-finished or out of range); its business validity is checked separately.
const numericDraft = /^-?\d{0,12}(?:[.,]\d{0,6})?$/u;

type WorkSectionData = Readonly<{
  fields: Record<string, string>;
  materials: RoofMaterialUiState;
  lengthDrafts: Record<string, LengthFieldState>;
  approvedEntries: readonly unknown[];
  /** Optional: a section without accepted defaults is still a valid work file (only the calculation save is gated). */
  assumptionConfirmations?: Readonly<Record<string, string>>;
}>;
export type RoofWorkSessionSection = DrawingRoofSection<WorkSectionData>;
export type RoofWorkSource = Readonly<{ kind: "pdf" | "image"; documentId: string; sha256: string; pageCount: number }>;
export type RoofWorkSessionInput = Readonly<{
  /** Omitted by older callers; v1-v3 material-takeoff files remain unchanged. */
  calculatorId?: RoofWorkCalculatorId;
  source: RoofWorkSource;
  activeSectionId: string;
  sections: readonly RoofWorkSessionSection[];
  /** The page's accepted scale (P1.1), carried along so it survives a save/reload of the same document and page. */
  calibration?: AcceptedCalibration | null;
}>;
export type RoofWorkSession = Omit<RoofWorkSessionInput, "sections"> & { sections: RoofWorkSessionSection[] };
type WorkSectionDataLike = Readonly<{ fields: Record<string, string>; materials: RoofMaterialUiState; lengthDrafts: Record<string, LengthFieldState>; approvedEntries: readonly unknown[] }>;

// Structural bounds only: a negative or decimal value typed by the user is preserved and reported as invalid input, not dropped.
const specValueSchema = z.union([z.number().finite().min(-1_000_000).max(1_000_000), z.string().max(200)]);
const layoutSchema = z.object(Object.fromEntries(Object.keys(roofTimberParametersSchema.shape).map((key) => [key, z.number().finite().min(-1_000_000).max(1_000_000).optional()]))).strict();
const specStateSchema = z.object({ mode: z.literal("manual"), profileId: z.null(), entered: z.record(z.string().max(80), specValueSchema) }).strict();
const materialSchema = z.object({
  requested: z.object({ timber: z.boolean(), underlay: z.boolean(), covering: z.boolean() }).strict(),
  layout: layoutSchema,
  specs: z.object({ covering: specStateSchema, underlay: specStateSchema, rafter: specStateSchema, batten: specStateSchema }).strict(),
}).strict();
const fieldsSchema = z.record(z.string().max(80), z.string().max(200));
const pointSchema = z.object({ x: z.number().finite().min(0).max(1), y: z.number().finite().min(0).max(1) }).strict();
const sectionSchema = z.object({
  id: z.string().min(1).max(128), sourceDocumentId: z.string().min(1).max(128), name: z.string().max(120), page: z.number().int().min(1).max(100),
  points: z.array(pointSchema).max(2), coverage: z.enum(["covered", "uncovered", "unclear"]), coverageConfirmed: z.boolean(),
  data: z.object({ fields: fieldsSchema, materials: materialSchema, lengthDrafts: z.record(z.string().max(80), z.object({ text: z.string().max(100), unit: z.enum(["mm", "cm", "m"]) }).strict()),
    assumptionConfirmations: z.record(z.string().max(80), z.string().max(240)).optional() }).strict(),
}).strict();
const documentFields = { documentId: z.string().min(1).max(128), sha256: z.string().regex(/^[a-f0-9]{64}$/u), pageCount: z.number().int().min(1).max(100) };
const documentSchema = z.object({ kind: z.enum(["pdf", "image"]), ...documentFields }).strict().refine((source) => source.kind === "pdf" || source.pageCount === 1, "Képforrás egyoldalas.");
// Version 1 knew PDF sources only.
const documentSchemaV1 = z.object(documentFields).strict().transform((source) => ({ kind: "pdf" as const, ...source }));
const calibrationReferenceSchema = z.object({ from: pointSchema, to: pointSchema, lengthMm: z.number().finite().positive().max(10_000_000) }).strict();
// Carries its own documentSha256/pageNumber; absent or for another document/page, it just stays unused (drawing-calibration.ts).
const calibrationSchema = z.object({
  documentSha256: z.string().regex(/^[a-f0-9]{64}$/u), pageNumber: z.number().int().min(1).max(100),
  mmPerPoint: z.number().finite().positive().max(1_000_000), deviationRatio: z.number().finite().min(0).max(1),
  primary: calibrationReferenceSchema, check: calibrationReferenceSchema,
}).strict();
// Versions 1 and 2 predate saved calibration; absent is read as "none", never as "unconfirmed but present".
const payloadFor = <V extends number, S extends z.ZodType>(version: V, source: S) => z.object({
  format: z.literal(FORMAT), version: z.literal(version), calculatorId: z.enum(["roof.material-takeoff", "roof.timber-cutlist"]), source,
  activeSectionId: z.string().min(1).max(128), sections: z.array(sectionSchema).min(1).max(MAX_SECTIONS),
  calibration: calibrationSchema.nullable().optional(),
}).strict();
const payloadSchema = z.union([payloadFor(1, documentSchemaV1), payloadFor(2, documentSchema), payloadFor(VERSION, documentSchema)]);

function validateSection(section: z.infer<typeof sectionSchema>, sourceDocumentId: string, pageCount: number) {
  if (section.sourceDocumentId !== sourceDocumentId) throw new Error("A szakasz forrásazonosítója nem egyezik a munkamenet dokumentumával.");
  if (section.page > pageCount || section.points.length === 1 || (section.points.length === 2 && (section.points[0]!.x === section.points[1]!.x || section.points[0]!.y === section.points[1]!.y))) throw new Error("A mentett rajzi kijelölés hibás.");
  for (const [key, value] of Object.entries(section.data.fields)) {
    const field = takeoffFields.find((item) => item.key === key);
    const shapeValid = field && (value === "" || (field.kind === "select" ? field.options?.some((option) => option.value === value)
      : field.kind === "checkbox" ? value === "true" || value === "false" : field.kind === "text" || numericDraft.test(value.trim())));
    if (!shapeValid) throw new Error("A mentett kalkulátormező ismeretlen vagy szerkezetileg hibás.");
  }
  if (Object.keys(section.data.assumptionConfirmations ?? {}).some((key) => !drawingAssumptionFieldKeys.has(key))) throw new Error("A mentett alapérték-megerősítés ismeretlen mezőhöz tartozik.");
  if (Object.keys(section.data.lengthDrafts).some((key) => !inputFields.has(key) || takeoffFields.find((field) => field.key === key)?.unit !== "mm")) {
    throw new Error("A mentett LengthField-piszkozat ismeretlen mezőhöz tartozik.");
  }
  for (const group of groups) {
    for (const [key, value] of Object.entries(section.data.materials.specs[group].entered)) {
      const field = MATERIAL_SPEC_FIELDS[group].find((item) => item.key === key);
      if (!field) throw new Error("A mentett anyagparaméter ismeretlen.");
      if (field.kind === "select" ? typeof value !== "string" || !field.options?.some((option) => option.value === value)
        : field.kind === "text" ? typeof value !== "string" : typeof value !== "number") throw new Error("A mentett anyagparaméter szerkezetileg hibás.");
    }
  }
}

/**
 * Business validity of a section's inputs, deliberately separate from what a work file preserves:
 * a half-finished or contradictory section is saved as typed and the calculator reports it after import.
 */
export function roofWorkSectionHasInvalidInput(data: Pick<WorkSectionData, "fields" | "materials">, profiles: readonly MaterialProfile[] = []): boolean {
  const { specs, layout } = data.materials;
  const resolve = (group: (typeof groups)[number]) => resolveMaterialSpec(group, specs[group], profiles);
  return fieldContractIssues(takeoffFields, data.fields).length > 0
    || !roofTimberParametersSchema.safeParse(layout).success
    || resolve("rafter").invalidKeys.length > 0 || resolve("batten").invalidKeys.length > 0
    || !roofCoveringProductParametersSchema.safeParse(coveringParametersFromSpec(resolve("covering"))).success
    || !roofUnderlayParametersSchema.safeParse(underlayParametersFromSpec(resolve("underlay"))).success;
}

export function createRoofWorkSessionJson(input: RoofWorkSessionInput, profiles: readonly MaterialProfile[] = []): string {
  const payload = {
    format: FORMAT, version: VERSION, calculatorId: input.calculatorId ?? "roof.material-takeoff", source: input.source, activeSectionId: input.activeSectionId,
    calibration: input.calibration ?? null,
    sections: input.sections.map(({ id, sourceDocumentId, name, page, points, coverage, coverageConfirmed, data }) => ({
      id, sourceDocumentId, name, page, points, coverage, coverageConfirmed,
      data: { fields: data.fields, materials: materialSnapshot(data.materials, profiles), lengthDrafts: data.lengthDrafts, ...(data.assumptionConfirmations ? { assumptionConfirmations: data.assumptionConfirmations } : {}) },
    })),
  };
  const json = JSON.stringify(payload);
  if (new TextEncoder().encode(json).byteLength > MAX_BYTES) throw new Error("A mentett munkamenetfájl meghaladja az 1 MB-os méretkorlátot.");
  parseRoofWorkSessionJson(json);
  return json;
}

function materialSnapshot(materials: RoofMaterialUiState, profiles: readonly MaterialProfile[]): RoofMaterialUiState {
  return {
    requested: materials.requested,
    layout: materials.layout,
    specs: Object.fromEntries(groups.map((group) => {
      const state = materials.specs[group];
      if (state.mode === "product" && state.profileId && !profiles.some((profile) => profile.id === state.profileId && profile.group === group)) {
        throw new Error("A kiválasztott anyagprofil nem érhető el; frissítsd vagy válts kézi adatokra mentés előtt.");
      }
      return [group, { mode: "manual", profileId: null, entered: resolveMaterialSpec(group, state, profiles).values }];
    })) as RoofMaterialUiState["specs"],
  };
}

export function parseRoofWorkSessionJson(json: string): RoofWorkSession {
  if (new TextEncoder().encode(json).byteLength > MAX_BYTES) throw new Error("A munkamenetfájl nagyobb az 1 MB-os korlátnál.");
  let raw: unknown;
  try { raw = JSON.parse(json); } catch { throw new Error("A munkamenetfájl nem érvényes JSON."); }
  const version = (raw as { version?: unknown } | null)?.version;
  if (!raw || typeof raw !== "object" || (raw as { format?: unknown }).format !== FORMAT || (version !== 1 && version !== 2 && version !== VERSION)) {
    throw new Error("Ismeretlen TetőPro-munkamenet formátum vagy verzió.");
  }
  const parsed = payloadSchema.safeParse(raw);
  if (!parsed.success) throw new Error("A munkamenet szerkezete hibás vagy nem támogatott.");
  const ids = new Set<string>();
  for (const section of parsed.data.sections) {
    if (ids.has(section.id)) throw new Error("A munkamenet ismétlődő szakaszazonosítót tartalmaz.");
    ids.add(section.id);
    validateSection(section, parsed.data.source.documentId, parsed.data.source.pageCount);
  }
  if (!ids.has(parsed.data.activeSectionId)) throw new Error("Az aktív szakasz hiányzik a munkamenetből.");
  const calibration = parsed.data.calibration ?? null;
  if (calibration && calibration.pageNumber > parsed.data.source.pageCount) throw new Error("A mentett lépték oldalszáma nem egyezik a dokumentummal.");
  return {
    calculatorId: parsed.data.calculatorId,
    source: parsed.data.source,
    activeSectionId: parsed.data.activeSectionId,
    calibration,
    sections: parsed.data.sections.map((section) => ({ ...section, coverageConfirmed: false, data: { ...section.data, approvedEntries: [] } })),
  };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function rebindRoofWorkSessionSource<T extends WorkSectionDataLike>(session: Omit<RoofWorkSession, "sections"> & { sections: readonly DrawingRoofSection<T>[] }, source: RoofWorkSource) {
  const { documentId } = source;
  const matchesSavedSource = session.source.kind === source.kind && session.source.sha256 === source.sha256 && session.source.pageCount === source.pageCount;
  return {
    matchesSavedSource,
    session: {
      ...session,
      source,
      sections: session.sections.map((section) => ({
        ...section,
        sourceDocumentId: documentId,
        page: matchesSavedSource ? section.page : 1,
        points: matchesSavedSource ? section.points : [],
        coverageConfirmed: false,
        data: { ...section.data, approvedEntries: [] as T["approvedEntries"] },
      })),
    },
  };
}
