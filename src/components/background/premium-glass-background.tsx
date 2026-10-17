"use client";

import { useEffect, useRef } from "react";
import {
  backgroundAnimationChangeEvent,
  backgroundAnimationStorageKey,
  parseBackgroundAnimationPreference,
} from "@/features/preferences/background-animation";

function readSavedMotionPreference(): boolean {
  try {
    return parseBackgroundAnimationPreference(window.localStorage.getItem(backgroundAnimationStorageKey));
  } catch {
    return true;
  }
}

/** Decorative global artwork. Motion starts only after the stored preference is restored. */
export function PremiumGlassBackground() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const setEnabled = (enabled: boolean) => {
      host.dataset.animationEnabled = String(enabled);
    };
    const onPreferenceChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { enabled?: unknown } : null;
      setEnabled(typeof detail?.enabled === "boolean" ? detail.enabled : readSavedMotionPreference());
    };
    const onStorageChange = (event: StorageEvent) => {
      if (event.key === null || event.key === backgroundAnimationStorageKey) setEnabled(readSavedMotionPreference());
    };
    const onVisibilityChange = () => {
      host.dataset.pageVisible = String(document.visibilityState !== "hidden");
    };

    // The server markup is artwork-only (motion off); restore before enabling CSS animations.
    setEnabled(readSavedMotionPreference());
    onVisibilityChange();
    window.addEventListener(backgroundAnimationChangeEvent, onPreferenceChange);
    window.addEventListener("storage", onStorageChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener(backgroundAnimationChangeEvent, onPreferenceChange);
      window.removeEventListener("storage", onStorageChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="premium-glass-background"
      aria-hidden="true"
      data-animation-enabled="false"
      data-page-visible="true"
    >
      <div className="premium-glass-background__ambient" />
      <div className="premium-glass-background__dot-grid" />
    </div>
  );
}
