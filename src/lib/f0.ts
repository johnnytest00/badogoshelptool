export const projectPhase = "F0" as const;

export function isF0FoundationReady(checks: readonly boolean[]): boolean {
  return checks.length > 0 && checks.every(Boolean);
}
