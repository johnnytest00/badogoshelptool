/**
 * P3.3a: the one-line result preview that belongs next to the drawing.
 *
 * It only *reports* what the calculator already computed, with the same qualifiers the remote result block uses
 * (`construction-suite.tsx` completenessTitle). It computes no quantity of its own, decides nothing and blocks
 * nothing: a téves átvitel így a vászon elhagyása nélkül látszik, de a részletes kimutatás, a limitációk és a
 * mentési kapu a helyükön maradnak. A számot csak igazolt (`VALID`) részre írjuk ki; hiányos vagy hibás részhez
 * az állapot megy a szám helyére, hogy a csík soha ne mutasson kész értéknek valamit, ami nem az.
 */
import type { RoofGeometry } from "@/domain/calculations/roof-geometry";
import { summarizeRoofGeometry } from "@/domain/calculations/roof-geometry-results";
import type { RoofMaterialTakeoff } from "@/domain/calculations/roof-material-takeoff";
import { formatQuantity } from "@/lib/quantity-format";

export type DrawingResultItem = Readonly<{
  label: string;
  /** Formázott mennyiség, vagy a rész állapota, ha nincs igazolt mennyiség. */
  text: string;
  /** false: állapot áll a szám helyén. */
  proven: boolean;
}>;

export type DrawingResultStrip = Readonly<{
  items: readonly DrawingResultItem[];
  /** A távoli eredményblokkal azonos minősítés. */
  state: string;
  tone: "ok" | "warn" | "error";
}>;

export type DrawingResultStripInput = Readonly<{
  geometry: RoofGeometry | null;
  takeoff: RoofMaterialTakeoff | null;
  completenessStatus: "complete" | "incomplete" | "invalid" | "unsupported";
  /** Csak ott, ahol a kalkulátor tetőszakaszra szűkít (anyagkimutatás). */
  scopeActive: boolean;
  coverageConfirmed: boolean;
  wholeRoofConfirmed: boolean;
}>;

function stripState(input: DrawingResultStripInput): Readonly<{ state: string; tone: DrawingResultStrip["tone"] }> {
  if (input.completenessStatus === "invalid" || input.completenessStatus === "unsupported") return { state: "Nem számítható", tone: "error" };
  if (input.completenessStatus === "incomplete") return { state: "Hiányos · előnézet", tone: "warn" };
  if (input.scopeActive && !input.coverageConfirmed) return { state: "Nem igazolt fedettség · előnézet", tone: "warn" };
  if (input.scopeActive && !input.wholeRoofConfirmed) return { state: "Tetőszakasz-eredmény · nem a teljes tető", tone: "warn" };
  return { state: "Teljes eredmény", tone: "ok" };
}

/**
 * P3.5/B: a csíkon álló mennyiség a rész ELSŐ eredménye volt, az alátétfóliánál viszont ez a CSÍKOK száma —
 * „Alátétfólia 6 db" így tekercsnek olvasható (P3.4 G.3). A fólia ezért a saját két mennyiségét nevén nevezve
 * kapja: csík és tekercs. Az értékek a kalkulátor már kiszámított eredményéből jönnek, itt nincs új képlet;
 * a tekercs csak akkor kerül ki, ha a domain ki is számolta (`rollCount`), hogy hamis 0 soha ne látszódjon.
 * Nem igazolt (`VALID`-tól eltérő) résznél továbbra is az állapot megy a szám helyére.
 */
function provenText(part: RoofMaterialTakeoff["parts"][number], takeoff: RoofMaterialTakeoff | null): string | null {
  if (part.status !== "VALID") return null;
  if (part.id === "underlay") {
    const { courseCount, rollCount } = takeoff?.underlay ?? { courseCount: null, rollCount: null };
    if (courseCount === null) return null;
    const courses = formatQuantity(courseCount, "csík");
    return rollCount === null ? courses : `${courses} · ${formatQuantity(rollCount, "tekercs")}`;
  }
  const quantity = part.quantities[0];
  return quantity ? formatQuantity(quantity.value, quantity.unit) : null;
}

export function drawingResultStrip(input: DrawingResultStripInput): DrawingResultStrip | null {
  if (!input.geometry) return null;
  // Ugyanaz a kiemelt geometriai eredmény (tetősíkfelület), amit a részletes blokk is mutat; a csíkon az
  // anyagkimutatás rövid „Tetőfelület” felirata áll, mert a hosszú cím egy sorban nem olvasható.
  const highlight = summarizeRoofGeometry(input.geometry).primary[0];
  if (!highlight || highlight.status !== "available") return null;

  const items: DrawingResultItem[] = [{ label: "Tetőfelület", text: formatQuantity(highlight.value, highlight.unit), proven: true }];
  for (const part of input.takeoff?.parts ?? []) {
    if (!part.requested || part.id === "geometry") continue;
    const text = provenText(part, input.takeoff);
    items.push(text !== null
      ? { label: part.label, text, proven: true }
      : { label: part.label, text: part.status === "INVALID" ? "hibás adat" : "hiányos", proven: false });
  }

  return { items, ...stripState(input) };
}
