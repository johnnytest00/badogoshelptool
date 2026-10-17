import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ScalingProvider } from "@/features/preferences/scaling-provider";
import { AppInteractionProvider } from "@/components/feedback/app-interaction-provider";
import { ScalingBubble } from "@/components/accessibility/scaling-bubble";
import { MobileFocusSupport } from "@/components/accessibility/mobile-focus-support";
import { GlobalAnimatedBackground } from "@/components/background/global-animated-background";
import { themeStorageKey } from "@/lib/theme";
import { scalingStorageKey } from "@/features/preferences/scaling";
import { LiquidGlassProvider } from "@/features/preferences/liquid-glass-provider";
import { liquidGlassStorageKey } from "@/features/preferences/liquid-glass";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";
import "./globals.css";

const appearanceBootstrap = `(() => {
  try {
    const root = document.documentElement;
    const storedTheme = localStorage.getItem('${themeStorageKey}');
    const mode = ['system', 'light', 'dark'].includes(storedTheme) ? storedTheme : 'system';
    const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    const storedScale = JSON.parse(localStorage.getItem('${scalingStorageKey}') || '{}');
    const scale = (value, fallback, min, max) => {
      const normalized = typeof value === 'number' && Number.isFinite(value) ? (value > 2.5 ? value / 100 : value) : fallback;
      return Math.min(max, Math.max(min, normalized));
    };
    root.style.setProperty('--tp-text-scale', String(scale(storedScale.text, 1, 0.8, 2)));
    root.style.setProperty('--tp-ui-scale', String(scale(storedScale.ui, 1.15, 0.8, 1.5)));
    root.style.setProperty('--tp-drawing-scale', String(scale(storedScale.drawing, 1, 0.5, 2.5)));
    root.style.setProperty('--tp-spacing-scale', String(scale(storedScale.spacing, 1, 0.75, 1.5)));
    const storedGlass = JSON.parse(localStorage.getItem('${liquidGlassStorageKey}') || '{}');
    const glassVersion = storedGlass.version;
    const supportedGlassVersion = glassVersion === 1 || glassVersion === 2;
    const storedOpacity = typeof storedGlass.opacity === 'number' && Number.isFinite(storedGlass.opacity) ? Math.min(100, Math.max(0, Math.round(storedGlass.opacity))) : 0;
    const opacity = !supportedGlassVersion ? 0 : glassVersion === 1 && storedOpacity === 10 ? 0 : storedOpacity;
    const tint = supportedGlassVersion && typeof storedGlass.customTint === 'string' && /^#(?:[\\da-f]{3}|[\\da-f]{6})$/i.test(storedGlass.customTint) ? storedGlass.customTint : '#FFFFFF';
    root.style.setProperty('--glass-opacity', opacity + '%');
    root.style.setProperty('--glass-custom-tint', tint);
    root.dataset.glassTintMode = supportedGlassVersion && storedGlass.tintMode === 'custom' ? 'custom' : 'auto';
    const reduceGlassEffects = matchMedia('(prefers-reduced-transparency: reduce)').matches || matchMedia('(forced-colors: active)').matches;
    root.dataset.glassFrameFree = String((opacity === 0 || opacity === 100) && !reduceGlassEffects);
  } catch {}
})();`;

export const metadata: Metadata = {
  title: "TetőPro — műhely",
  description: "Tetőfedő és bádogos munkafolyamatok egy helyen.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" data-glass-frame-free="true" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
      </head>
      <body><GlobalAnimatedBackground /><ThemeProvider><LiquidGlassProvider><ScalingProvider><AppInteractionProvider>{children}<MobileFocusSupport /><ScalingBubble /></AppInteractionProvider></ScalingProvider></LiquidGlassProvider></ThemeProvider></body>
    </html>
  );
}
