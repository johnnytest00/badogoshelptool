export const MONEY_SCALE = 2;
export const QUANTITY_SCALE = 6;

export type Money = { minor: bigint; currency: "HUF" };

const DECIMAL = /^\d+(?:\.\d+)?$/;

export function decimalToScaled(value: string, scale: number): bigint {
  const normalized = value.trim().replace(",", ".");
  if (!DECIMAL.test(normalized)) throw new Error("Érvénytelen decimális érték.");
  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > scale) throw new Error("Túl sok tizedesjegy.");
  return BigInt(whole) * BigInt(10) ** BigInt(scale) + BigInt((fraction + "0".repeat(scale)).slice(0, scale) || "0");
}

export function scaledToDecimal(value: bigint, scale: number): string {
  const base = BigInt(10) ** BigInt(scale);
  const whole = value / base;
  const fraction = (value < BigInt(0) ? -value : value) % base;
  return `${whole}.${fraction.toString().padStart(scale, "0")}`;
}

export function lineTotal(quantity: string, unitPrice: string): Money {
  const q = decimalToScaled(quantity, QUANTITY_SCALE);
  const p = decimalToScaled(unitPrice, MONEY_SCALE);
  const product = q * p;
  const divisor = BigInt(10) ** BigInt(QUANTITY_SCALE);
  const rounded = (product + divisor / BigInt(2)) / divisor;
  return { minor: rounded, currency: "HUF" };
}

export function sumMoney(values: Money[]): Money {
  if (values.some((value) => value.currency !== "HUF")) throw new Error("A pénznemek nem keverhetők.");
  return { currency: "HUF", minor: values.reduce((sum, value) => sum + value.minor, BigInt(0)) };
}

export function formatMoney(value: Money): string {
  return (Number(value.minor) / 100).toLocaleString("hu-HU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " HUF";
}
