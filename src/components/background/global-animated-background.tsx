"use client";

import { useEffect, useRef } from "react";
import {
  getBackgroundColor,
  getNetworkColor,
  shouldUseStaticBackground,
} from "./global-animated-background-policy";

type VantaInstance = {
  destroy: () => void;
  setOptions: (options: Record<string, unknown>) => void;
  renderer?: { setPixelRatio: (ratio: number) => void; domElement?: HTMLCanvasElement };
};

type VantaNetFactory = (options: Record<string, unknown>) => VantaInstance;

const MAX_PIXEL_RATIO = 1.5;
const isPageHidden = () => document.visibilityState === "hidden";

function hasWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl") ?? canvas.getContext("experimental-webgl");
    if (!context) return false;
    (context as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function getDeviceProfile() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const isDark = document.documentElement.dataset.theme === "dark";

  return {
    isDark,
    profile: {
      reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      isMobile: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
      saveData: connection?.saveData === true,
      hardwareConcurrency: navigator.hardwareConcurrency || undefined,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    },
  };
}

export function GlobalAnimatedBackground() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let pending = false;
    let failed = false;
    let token = 0;
    let instance: VantaInstance | null = null;
    let resizeFrame = 0;

    const setStatic = (reason: string) => {
      host.dataset.mode = "static";
      host.dataset.reason = reason;
    };

    const stop = () => {
      token += 1;
      pending = false;
      if (!instance) return;
      try {
        instance.destroy();
      } catch {
        host.querySelector("canvas.vanta-canvas")?.remove();
      }
      instance = null;
      host.querySelector("canvas.vanta-canvas")?.remove();
    };

    const profileAndMode = () => {
      const { isDark, profile } = getDeviceProfile();
      if (shouldUseStaticBackground(profile)) {
        return { isDark, staticReason: profile.reducedMotion ? "reduced-motion" : profile.isMobile ? "mobile" : profile.saveData ? "data-saver" : "low-power" };
      }
      return { isDark, staticReason: null };
    };

    const capPixelRatio = () => {
      if (instance?.renderer) {
        instance.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
      }
    };

    const start = async () => {
      if (disposed || isPageHidden() || failed || instance || pending) return;
      const { isDark, staticReason } = profileAndMode();
      if (staticReason) {
        setStatic(staticReason);
        return;
      }
      if (!hasWebGLSupport()) {
        failed = true;
        setStatic("webgl-unavailable");
        return;
      }

      pending = true;
      const startToken = ++token;
      host.dataset.mode = "loading";
      try {
        const [threeModule, netModule] = await Promise.all([
          import("three"),
          import("vanta/dist/vanta.net.min.js"),
        ]);
        if (disposed || startToken !== token || isPageHidden()) return;

        const THREE = threeModule;
        const VANTA = (netModule.default ?? netModule) as VantaNetFactory;
        const result = VANTA({
          el: host,
          THREE,
          color: getNetworkColor(isDark),
          backgroundColor: getBackgroundColor(isDark),
          backgroundAlpha: 1,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          scale: 1,
          scaleMobile: 1,
          points: 10,
          spacing: 15,
          maxDistance: 20,
          showDots: true,
          minHeight: 200,
          minWidth: 200,
        });

        if (!host.querySelector("canvas.vanta-canvas")) {
          result.destroy();
          failed = true;
          setStatic("webgl-init-failed");
          return;
        }
        instance = result;
        host.dataset.mode = "animated";
        host.dataset.reason = "";
        capPixelRatio();
      } catch {
        host.querySelector("canvas.vanta-canvas")?.remove();
        failed = true;
        setStatic("webgl-init-failed");
      } finally {
        pending = false;
      }
    };

    const refresh = () => {
      if (disposed) return;
      const { staticReason } = profileAndMode();
      if (staticReason) {
        stop();
        setStatic(staticReason);
        return;
      }
      if (isPageHidden()) {
        stop();
        setStatic("page-hidden");
        return;
      }
      if (instance) {
        const { isDark } = profileAndMode();
        host.dataset.theme = isDark ? "dark" : "light";
        instance.setOptions({
          color: getNetworkColor(isDark),
          backgroundColor: getBackgroundColor(isDark),
        });
        return;
      }
      void start();
    };

    const onResize = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(capPixelRatio);
    };
    const onVisibilityChange = () => refresh();
    const onThemeChange = () => {
      const { isDark } = profileAndMode();
      host.dataset.theme = isDark ? "dark" : "light";
      if (instance) {
        instance.setOptions({
          color: getNetworkColor(isDark),
          backgroundColor: getBackgroundColor(isDark),
        });
      }
    };
    const rootObserver = new MutationObserver(onThemeChange);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)");
    motionQuery.addEventListener("change", refresh);
    mobileQuery.addEventListener("change", refresh);
    coarsePointerQuery.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize);
    rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    refresh();

    return () => {
      disposed = true;
      rootObserver.disconnect();
      motionQuery.removeEventListener("change", refresh);
      mobileQuery.removeEventListener("change", refresh);
      coarsePointerQuery.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(resizeFrame);
      stop();
    };
  }, []);

  return <div ref={hostRef} className="global-animated-background" aria-hidden="true" data-mode="static" data-reason="initial" />;
}
