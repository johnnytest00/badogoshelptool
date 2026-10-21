/**
 * Egységes magyar mennyiség-megjelenítés.
 *
 * Kizárólag megjelenítés: a tárolt és számított értékeket nem kerekíti, csak formázza.
 * A tizedesjegyek száma mértékegységenként rögzített, hogy egy panelen belül a felületek és
 * hosszak egy oszlopban olvashatók legyenek, és ne látsszon valótlan pontosság
 * (pl. „97,662 m²” ezred négyzetmétere terepen értelmezhetetlen).
 */
type Precision = Readonly<{ min: number; max: number }>;

const precisionByUnit: Readonly<Record<string, Precision>> = {
  "m²": { min: 2, max: 2 },
  "m³": { min: 0, max: 3 },
  m: { min: 2, max: 2 },
  fm: { min: 2, max: 2 },
  cm: { min: 0, max: 1 },
  mm: { min: 0, max: 0 },
  "°": { min: 0, max: 1 },
  "%": { min: 0, max: 1 },
  db: { min: 0, max: 0 },
  kg: { min: 0, max: 2 },
};

/** Ismeretlen mértékegységnél a korábbi, megengedőbb viselkedés marad. */
const fallback: Precision = { min: 0, max: 3 };

export function quantityPrecision(unit: string): Precision {
  return precisionByUnit[unit] ?? fallback;
}

/**
 * A rögzített tizedesjegyszám miatt egy valós, pozitív mennyiség látszólag pontos nullaként
 * jelenne meg (pl. 0,004 m² → „0,00 m²”). Ilyenkor küszöbjelölést adunk, hogy a „van, de kicsi”
 * ne legyen összetéveszthető a „nincs”-csel. A tárolt és számított értéket ez nem érinti.
 */
function roundsToZero(value: number, formatted: string): boolean {
  return value !== 0 && !/[1-9]/.test(formatted);
}

function thresholdText(value: number, max: number): string {
  const smallest = new Intl.NumberFormat("hu-HU", { minimumFractionDigits: max, maximumFractionDigits: max }).format(10 ** -max);
  return value > 0 ? `<${smallest}` : `>-${smallest}`;
}

export function formatQuantityValue(value: number, unit: string): string {
  if (!Number.isFinite(value)) return "—";
  const { min, max } = quantityPrecision(unit);
  // A -0 ugyanaz a mennyiség, mint a 0: ne jelenjen meg „-0,00”-ként.
  const normalized = value === 0 ? 0 : value;
  const formatted = new Intl.NumberFormat("hu-HU", { minimumFractionDigits: min, maximumFractionDigits: max }).format(normalized);
  return roundsToZero(normalized, formatted) ? thresholdText(normalized, max) : formatted;
}

export function formatQuantity(value: number, unit: string): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatQuantityValue(value, unit)} ${unit}`;
}
