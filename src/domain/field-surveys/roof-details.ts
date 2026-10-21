import { z } from "zod";

/**
 * Meglévő, helyszínen megfigyelt fizikai tetőrészletek. Csak a jelenlegi állapotot rögzíti: nem munkatétel,
 * nem keletkezik belőle beszerzési mennyiség, és a tetőfelületből sem kerül levonásra (ehhez elhelyezkedés is kellene).
 */
export const roofDetailKindSchema = z.enum([
  "chimney", "skylight", "hatch", "vent", "penetration", "valley", "wall_junction", "gutter", "downpipe", "flashing", "other",
]);
export type RoofDetailKind = z.infer<typeof roofDetailKindSchema>;

/** „Nem vizsgált” nem érték, hanem a bejegyzés hiánya: ismeretlen soha nem válik megerősített hiánnyá. */
export const roofDetailStatusSchema = z.enum(["absent", "present_unmeasured", "measured"]);
export type RoofDetailStatus = z.infer<typeof roofDetailStatusSchema>;

export const roofDetailStatusLabels: Record<RoofDetailStatus, string> = {
  absent: "Nincs (ellenőrizve)",
  present_unmeasured: "Van, de nincs felmérve",
  measured: "Felmérve",
};

export const roofDetailFieldKeys = ["count", "widthMm", "heightMm", "lengthM"] as const;
export type RoofDetailFieldKey = (typeof roofDetailFieldKeys)[number];
type RoofDetailField = Readonly<{ key: RoofDetailFieldKey; label: string; unit: "db" | "mm" | "m" }>;
const count: RoofDetailField = { key: "count", label: "Darabszám", unit: "db" };
const width = (label: string): RoofDetailField => ({ key: "widthMm", label, unit: "mm" });
const height = (label: string): RoofDetailField => ({ key: "heightMm", label, unit: "mm" });
const length = (label: string): RoofDetailField => ({ key: "lengthM", label, unit: "m" });

export const roofDetailDefs: Record<RoofDetailKind, Readonly<{ label: string; fields: readonly RoofDetailField[] }>> = {
  chimney: { label: "Kémény", fields: [count, width("Szélesség"), height("Mélység")] },
  skylight: { label: "Tetőablak", fields: [count, width("Nyílás szélessége"), height("Nyílás magassága")] },
  hatch: { label: "Tetőkibúvó", fields: [count, width("Nyílás szélessége"), height("Nyílás magassága")] },
  vent: { label: "Szellőzőáttörés", fields: [count, width("Átmérő vagy szélesség")] },
  penetration: { label: "Egyéb áttörés", fields: [count, width("Szélesség"), height("Magasság")] },
  valley: { label: "Vápa", fields: [count, length("Vápa mért hossza")] },
  wall_junction: { label: "Falcsatlakozás", fields: [count, length("Csatlakozó él mért hossza")] },
  gutter: { label: "Meglévő ereszcsatorna", fields: [length("Meglévő hossz"), width("Névleges méret")] },
  downpipe: { label: "Meglévő lefolyó", fields: [count, length("Meglévő hossz")] },
  flashing: { label: "Meglévő szegély", fields: [count, length("Meglévő hossz")] },
  other: { label: "Egyéb helyszíni körülmény", fields: [count] },
};
export const roofDetailKinds = roofDetailKindSchema.options;

const dimension = (max: number) => z.number().finite().int("Egész milliméter értéket adj meg.").positive("A méret legyen nagyobb nullánál.").max(max, `A méret legfeljebb ${max / 1000} m lehet.`).nullable();

export const roofDetailSchema = z.object({
  id: z.string().uuid(),
  kind: roofDetailKindSchema,
  status: roofDetailStatusSchema,
  count: z.number().finite().int("A darabszám egész szám legyen.").positive("A darabszám legyen legalább 1.").max(999, "A darabszám legfeljebb 999 lehet.").nullable(),
  widthMm: dimension(100_000),
  heightMm: dimension(100_000),
  lengthM: z.number().finite().positive("A hossz legyen nagyobb nullánál.").max(1000, "A hossz legfeljebb 1000 m lehet.").nullable(),
  note: z.string().trim().max(500, "A megjegyzés legfeljebb 500 karakter lehet."),
}).strict().superRefine((detail, context) => {
  if (detail.lengthM !== null && Math.abs(detail.lengthM * 1000 - Math.round(detail.lengthM * 1000)) > 1e-6) {
    context.addIssue({ code: "custom", path: ["lengthM"], message: "A hossz legfeljebb milliméter pontosságú lehet (pl. 12,4)." });
  }
  const values = roofDetailValues(detail);
  if (detail.status === "absent" && values.length) {
    context.addIssue({ code: "custom", path: ["status"], message: "Megerősített hiányhoz ne adj meg méretet vagy darabszámot." });
  }
  if (detail.status === "measured" && !values.length) {
    context.addIssue({ code: "custom", path: ["status"], message: "Felmért állapothoz adj meg legalább egy értéket, vagy jelöld „van, de nincs felmérve”-nek." });
  }
  if (roofDetailDefs[detail.kind].fields.length && values.some(({ key }) => !roofDetailDefs[detail.kind].fields.some((field) => field.key === key))) {
    context.addIssue({ code: "custom", path: ["kind"], message: "Ehhez a tetőrészlethez nem értelmezett méret szerepel." });
  }
});
export type RoofDetail = z.infer<typeof roofDetailSchema>;

export const roofDetailsSchema = z.array(roofDetailSchema).max(30, "Legfeljebb 30 tetőrészlet rögzíthető egy szakaszban.").superRefine((details, context) => {
  const ids = details.map((detail) => detail.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: "custom", message: "A tetőrészletek azonosítója legyen egyedi." });
  for (const kind of roofDetailKinds) {
    if (details.filter((detail) => detail.kind === kind).some((detail) => detail.status === "absent") && details.filter((detail) => detail.kind === kind).length > 1) {
      context.addIssue({ code: "custom", message: `${roofDetailDefs[kind].label}: a megerősített hiány mellett ne szerepeljen másik bejegyzés ugyanabból a típusból.` });
    }
  }
});

/** A tényleges, megadott értékek — az üres mező hiányzó adat, nem nulla. */
export function roofDetailValues(detail: Readonly<Record<RoofDetailFieldKey, number | null>>): readonly Readonly<{ key: RoofDetailFieldKey; value: number }>[] {
  return roofDetailFieldKeys
    .map((key) => ({ key, value: detail[key] }))
    .filter((entry): entry is { key: RoofDetailFieldKey; value: number } => entry.value !== null);
}

export function roofDetailLabel(detail: Readonly<{ kind: RoofDetailKind }>): string {
  return roofDetailDefs[detail.kind].label;
}

/** Rövid, mindig a rögzített állapotot tükröző összegzés; nem vizsgált típus nem jelenik meg benne. */
export function roofDetailsSummary(details: readonly Readonly<{ status: RoofDetailStatus }>[]): string {
  if (!details.length) return "Nem vizsgált tetőrészletek (nincs rögzített bejegyzés)";
  const by = (status: RoofDetailStatus) => details.filter((detail) => detail.status === status).length;
  return [[by("measured"), "felmérve"], [by("present_unmeasured"), "hiányosan felmérve"], [by("absent"), "megerősített hiány"]]
    .filter(([value]) => (value as number) > 0).map(([value, label]) => `${value} ${label}`).join(" · ");
}
