export type LiquidGlassRuntimeProfile = Readonly<{
  userAgent: string;
  reducedMotion: boolean;
  reducedTransparency: boolean;
  coarsePointer: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  touchPoints?: number;
}>;

export function shouldEnhanceLiquidGlass(profile: LiquidGlassRuntimeProfile): boolean {
  const userAgent = profile.userAgent.toLowerCase();
  const appleMobile = /iphone|ipad|ipod/.test(userAgent) || (userAgent.includes("macintosh") && (profile.touchPoints ?? 0) > 1);
  const supportedChromium = /chrome|chromium|edg|opr/.test(userAgent) && !appleMobile;
  const unsupportedEngine = userAgent.includes("firefox") || (userAgent.includes("safari") && !supportedChromium) || appleMobile;
  const lowMemory = profile.deviceMemory !== undefined && profile.deviceMemory <= 4;
  const lowCpu = profile.hardwareConcurrency !== undefined && profile.hardwareConcurrency <= 4;
  return supportedChromium && !unsupportedEngine && !profile.reducedMotion && !profile.reducedTransparency && !profile.coarsePointer && !lowMemory && !lowCpu;
}
