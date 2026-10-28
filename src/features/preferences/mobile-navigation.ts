export const mobileNavigationStorageKey = "tetopro-mobile-navigation-v1";

export function parseMobileNavigationPreference(raw: string | null): boolean {
  return raw === "true";
}

export function persistMobileNavigationPreference(storage: Pick<Storage, "setItem">, enabled: boolean): void {
  storage.setItem(mobileNavigationStorageKey, String(enabled));
}
