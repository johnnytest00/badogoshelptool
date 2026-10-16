export type BackgroundDeviceProfile = Readonly<{
  reducedMotion: boolean;
  isMobile: boolean;
  saveData: boolean;
  hardwareConcurrency: number | undefined;
  deviceMemory: number | undefined;
}>;

export function shouldUseStaticBackground(profile: BackgroundDeviceProfile): boolean {
  return profile.reducedMotion
    || profile.isMobile
    || profile.saveData
    || (profile.hardwareConcurrency !== undefined && profile.hardwareConcurrency <= 4)
    || (profile.deviceMemory !== undefined && profile.deviceMemory <= 4);
}

export function getBackgroundColor(isDark: boolean): number {
  return isDark ? 0x0b1220 : 0xf5f7fb;
}

export function getNetworkColor(isDark: boolean): number {
  return isDark ? 0xed6100 : 0xc94f00;
}
