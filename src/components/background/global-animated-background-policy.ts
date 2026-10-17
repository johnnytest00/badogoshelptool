export type BackgroundDeviceProfile = Readonly<{
  reducedMotion: boolean;
  enabled: boolean;
}>;

export function shouldUseStaticBackground(profile: BackgroundDeviceProfile): boolean {
  return profile.reducedMotion || !profile.enabled;
}

export function getRenderTargetFps(isMobile: boolean): 20 | 30 {
  return isMobile ? 20 : 30;
}

export function capBackgroundPixelRatio(devicePixelRatio: number): number {
  return Math.min(Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1, 1);
}

/** Returns true only when enough time has elapsed for another real render. */
export function createRenderGate(targetFps: number, now: () => number = () => performance.now()) {
  const interval = 1000 / targetFps;
  let lastRenderAt = Number.NEGATIVE_INFINITY;
  return () => {
    const currentTime = now();
    if (currentTime - lastRenderAt + 0.001 < interval) return false;
    lastRenderAt = currentTime;
    return true;
  };
}

export function getBackgroundColor(isDark: boolean): number {
  return isDark ? 0x0b1220 : 0xf5f7fb;
}

export function getNetworkColor(isDark: boolean): number {
  return isDark ? 0xed6100 : 0xb45309;
}
