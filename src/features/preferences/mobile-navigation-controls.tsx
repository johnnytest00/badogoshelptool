"use client";

import { useEffect, useState } from "react";
import { mobileNavigationStorageKey, parseMobileNavigationPreference, persistMobileNavigationPreference } from "@/features/preferences/mobile-navigation";

function syncMobileNavigation(enabled: boolean) {
  if (enabled) document.documentElement.dataset.mobileNav = "visible";
  else delete document.documentElement.dataset.mobileNav;
}

export function useMobileNavigationPreference(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const restore = () => {
      let stored: string | null = null;
      try {
        stored = window.localStorage.getItem(mobileNavigationStorageKey);
      } catch {
        // Without local storage the safe default is hidden.
      }
      const next = parseMobileNavigationPreference(stored);
      setEnabled(next);
      syncMobileNavigation(next);
    };
    restore();
    window.addEventListener("storage", restore);
    return () => window.removeEventListener("storage", restore);
  }, []);

  const update = (next: boolean) => {
    setEnabled(next);
    syncMobileNavigation(next);
    try {
      persistMobileNavigationPreference(window.localStorage, next);
    } catch {
      // The current tab still honors the in-memory choice if storage is unavailable.
    }
  };

  return [enabled, update];
}

export function MobileNavigationControl({ enabled, onChange }: Readonly<{ enabled: boolean; onChange: (enabled: boolean) => void }>) {
  return <label className="background-animation-setting">
    <span><strong>Alsó navigáció megjelenítése</strong><small>Az alsó menüsáv megjelenítése a gyors navigációhoz.</small></span>
    <input type="checkbox" checked={enabled} onChange={(event) => onChange(event.target.checked)} />
  </label>;
}
