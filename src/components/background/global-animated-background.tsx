"use client";

import { useEffect, useRef } from "react";
import {
  capBackgroundPixelRatio,
  createRenderGate,
  getBackgroundPointCount,
  getBackgroundColor,
  getNetworkColor,
  getRenderTargetFps,
  shouldUseStaticBackground,
} from "./global-animated-background-policy";
import {
  backgroundAnimationChangeEvent,
  backgroundAnimationStorageKey,
  parseBackgroundAnimationPreference,
} from "@/features/preferences/background-animation";

type VantaInstance = {
  destroy: () => void;
  setOptions: (options: Record<string, unknown>) => void;
  onUpdate?: () => unknown;
};

type VantaNetFactory = (options: Record<string, unknown>) => VantaInstance;
type ThreeModule = typeof import("three");

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

function getBackgroundProfile() {
  const isDark = document.documentElement.dataset.theme === "dark";
  let enabled = true;
  try {
    enabled = parseBackgroundAnimationPreference(window.localStorage.getItem(backgroundAnimationStorageKey));
  } catch {
    // Keep animation enabled by default when browser storage is unavailable.
  }
  return {
    isDark,
    isMobile: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    enabled,
  };
}

function createBackgroundThree(THREE: ThreeModule, targetFps: number) {
  class CappedWebGLRenderer extends THREE.WebGLRenderer {
    constructor(parameters?: THREE.WebGLRendererParameters) {
      super(parameters);
      const originalRender = this.render.bind(this);
      const originalSetPixelRatio = this.setPixelRatio.bind(this);
      const renderAllowed = createRenderGate(targetFps);
      let frameWindowStart = performance.now();
      let renderedInWindow = 0;
      this.render = ((scene, camera) => {
        if (!renderAllowed()) return;
        originalRender(scene, camera);
        renderedInWindow += 1;
        this.domElement.dataset.renderPixelRatio = String(this.getPixelRatio());
        this.domElement.dataset.renderWidth = String(this.domElement.width);
        this.domElement.dataset.renderHeight = String(this.domElement.height);
        this.domElement.dataset.renderedFrames = String((Number(this.domElement.dataset.renderedFrames) || 0) + 1);
        const now = performance.now();
        const sampleDuration = now - frameWindowStart;
        if (sampleDuration >= 1000) {
          this.domElement.dataset.renderedFps = String(Math.round(renderedInWindow * 1000 / sampleDuration));
          renderedInWindow = 0;
          frameWindowStart = now;
        }
      }) as typeof this.render;
      this.setPixelRatio = ((value: number) => {
        originalSetPixelRatio(capBackgroundPixelRatio(value));
        this.domElement.dataset.renderPixelRatio = String(this.getPixelRatio());
      }) as typeof this.setPixelRatio;
    }
  }

  return { ...THREE, WebGLRenderer: CappedWebGLRenderer };
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
    let activeMobile: boolean | null = null;
    let runtimeEnabled: boolean | null = null;

    const setStatic = (reason: string) => {
      host.dataset.mode = "static";
      host.dataset.reason = reason;
    };

    const stop = () => {
      token += 1;
      pending = false;
      if (instance) {
        try {
          instance.destroy();
        } catch {
          // Remove the renderer canvas below even if upstream teardown fails.
        }
      }
      instance = null;
      activeMobile = null;
      host.querySelectorAll("canvas.vanta-canvas").forEach((canvas) => canvas.remove());
    };

    const profileAndMode = () => {
      const deviceProfile = getBackgroundProfile();
      const profile = { ...deviceProfile, enabled: runtimeEnabled ?? deviceProfile.enabled };
      const staticReason = shouldUseStaticBackground(profile)
        ? profile.reducedMotion ? "reduced-motion" : "user-disabled"
        : null;
      return { ...profile, staticReason };
    };

    const start = async () => {
      if (disposed || isPageHidden() || failed || instance || pending) return;
      const { isDark, isMobile, staticReason } = profileAndMode();
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
      host.querySelectorAll("canvas.vanta-canvas").forEach((canvas) => canvas.remove());
      host.dataset.mode = "loading";
      try {
        const [threeModule, netModule] = await Promise.all([
          import("three"),
          import("vanta/dist/vanta.net.min.js"),
        ]);
        if (disposed || startToken !== token || isPageHidden()) return;

        const THREE = threeModule;
        const VANTA = (netModule.default ?? netModule) as VantaNetFactory;
        const targetFps = getRenderTargetFps();
        const result = VANTA({
          el: host,
          THREE: createBackgroundThree(THREE, targetFps),
          color: getNetworkColor(isDark),
          backgroundColor: getBackgroundColor(isDark),
          backgroundAlpha: 1,
          mouseControls: !isMobile,
          touchControls: !isMobile,
          gyroControls: false,
          scale: 1,
          scaleMobile: 1,
          points: getBackgroundPointCount(isMobile),
          spacing: 15,
          maxDistance: 20,
          showDots: true,
          minHeight: 200,
          minWidth: 200,
        });

        // Vanta 0.5.24 calls this method from its existing RAF loop. Gate the
        // expensive particle-pair update there as well as the actual WebGL render.
        if (typeof result.onUpdate === "function") {
          const originalUpdate = result.onUpdate;
          const updateAllowed = createRenderGate(targetFps);
          result.onUpdate = () => {
            if (updateAllowed()) return originalUpdate.call(result);
            return undefined;
          };
        }

        if (!host.querySelector("canvas.vanta-canvas")) {
          result.destroy();
          failed = true;
          setStatic("webgl-init-failed");
          return;
        }
        instance = result;
        activeMobile = isMobile;
        host.dataset.mode = "animated";
        host.dataset.reason = "";
      } catch {
        host.querySelectorAll("canvas.vanta-canvas").forEach((canvas) => canvas.remove());
        failed = true;
        setStatic("webgl-init-failed");
      } finally {
        pending = false;
      }
    };

    const refresh = () => {
      if (disposed) return;
      const { isMobile, staticReason } = profileAndMode();
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
      if (instance && activeMobile !== isMobile) stop();
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
      resizeFrame = requestAnimationFrame(refresh);
    };
    const onPreferenceChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail as { enabled?: unknown } : null;
      runtimeEnabled = typeof detail?.enabled === "boolean" ? detail.enabled : null;
      if (runtimeEnabled) failed = false;
      refresh();
    };
    const onStorageChange = () => {
      runtimeEnabled = null;
      if (profileAndMode().enabled) failed = false;
      refresh();
    };
    const onVisibilityChange = () => {
      if (!isPageHidden()) failed = false;
      refresh();
    };
    const onThemeChange = () => {
      const { isDark } = profileAndMode();
      const nextTheme = isDark ? "dark" : "light";
      if (host.dataset.theme === nextTheme) return;
      host.dataset.theme = nextTheme;
      if (instance) {
        // Vanta NET chooses additive/subtractive line blending during init. Rebuild
        // on a theme change so its dots and connection lines use the same palette.
        stop();
        refresh();
      }
    };
    const rootObserver = new MutationObserver(onThemeChange);
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const deviceQuery = window.matchMedia("(max-width: 767px), (pointer: coarse)");
    motionQuery.addEventListener("change", refresh);
    deviceQuery.addEventListener("change", refresh);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("resize", onResize);
    window.addEventListener(backgroundAnimationChangeEvent, onPreferenceChange);
    window.addEventListener("storage", onStorageChange);
    rootObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    refresh();

    return () => {
      disposed = true;
      rootObserver.disconnect();
      motionQuery.removeEventListener("change", refresh);
      deviceQuery.removeEventListener("change", refresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(backgroundAnimationChangeEvent, onPreferenceChange);
      window.removeEventListener("storage", onStorageChange);
      cancelAnimationFrame(resizeFrame);
      stop();
    };
  }, []);

  return <div ref={hostRef} className="global-animated-background" aria-hidden="true" data-mode="static" data-reason="initial" />;
}
