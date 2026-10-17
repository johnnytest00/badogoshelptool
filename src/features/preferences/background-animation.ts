export const backgroundAnimationStorageKey = "tetopro-background-animation-v1";
export const backgroundAnimationChangeEvent = "tetopro:background-animation-change";
export const backgroundAnimationDefault = true;

export function parseBackgroundAnimationPreference(raw: string | null): boolean {
  return raw === "false" ? false : backgroundAnimationDefault;
}

export function persistBackgroundAnimationPreference(storage: Pick<Storage, "setItem">, enabled: boolean): void {
  storage.setItem(backgroundAnimationStorageKey, String(enabled));
}
