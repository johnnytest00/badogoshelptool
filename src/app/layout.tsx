import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { ScalingProvider } from "@/features/preferences/scaling-provider";
import { ScalingBubble } from "@/components/accessibility/scaling-bubble";
import { MobileFocusSupport } from "@/components/accessibility/mobile-focus-support";
import { themeStorageKey } from "@/lib/theme";
import { scalingStorageKey } from "@/features/preferences/scaling";
import "@fontsource/noto-sans/400.css";
import "@fontsource/noto-sans/500.css";
import "@fontsource/noto-sans/600.css";
import "@fontsource/noto-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "TetőPro — műhely",
  description: "Tetőfedő és bádogos munkafolyamatok egy helyen.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hu" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(() => { try { const root = document.documentElement; const storedTheme = localStorage.getItem('${themeStorageKey}'); const mode = ['system', 'light', 'dark'].includes(storedTheme) ? storedTheme : 'system'; const dark = mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches); root.dataset.theme = dark ? 'dark' : 'light'; root.style.colorScheme = dark ? 'dark' : 'light'; const storedScale = JSON.parse(localStorage.getItem('${scalingStorageKey}') || '{}'); const scale = (value, fallback, min, max) => { const normalized = typeof value === 'number' && Number.isFinite(value) ? (value > 2.5 ? value / 100 : value) : fallback; return Math.min(max, Math.max(min, normalized)); }; root.style.setProperty('--tp-text-scale', String(scale(storedScale.text, 1, 0.8, 2))); root.style.setProperty('--tp-ui-scale', String(scale(storedScale.ui, 1.15, 0.8, 1.5))); root.style.setProperty('--tp-drawing-scale', String(scale(storedScale.drawing, 1, 0.5, 2.5))); root.style.setProperty('--tp-spacing-scale', String(scale(storedScale.spacing, 1, 0.75, 1.5))); } catch {} })()` }} />
      </head>
      <body><ThemeProvider><ScalingProvider>{children}<MobileFocusSupport /><ScalingBubble /></ScalingProvider></ThemeProvider></body>
    </html>
  );
}
