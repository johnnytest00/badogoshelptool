# Tesztmátrix

## F1.1 ellenőrzések

| Parancs | Állapot | Megjegyzés |
| --- | --- | --- |
| `npm audit` (előtte) | Sikeres audit-lekérdezés | 2026-10-12; 13 sérülékenység: 4 moderate, 7 high, 2 critical. |
| `npm install` frissítés | Sikeres | Next 16.4.0, Vitest 5.0.3, Vite 8.3.4, TypeScript ESLint flat config. |
| `npm audit` (utána) | Sikeres | 2026-10-12; 0 info/low/moderate/high/critical sérülékenység. |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 2 fájl / 4 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build, `/` statikusan generálva. |
| Böngészős smoke | Sikeres | 2026-10-12; kezdőoldal betöltött; Sötét mód kiválasztása, `Váltás: Világos` felirat, reload utáni perzisztencia és `Rendszer szerint` visszaállítás ellenőrizve. |

Megjegyzés: a Next 16 alapértelmezett Turbopack buildje portkötési hibával elhasalt a futtatókörnyezetben; a `npm run build` script webpack módot használ, amely sikeresen lefutott.

## F1.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Dashboard unit tesztek | Sikeres | 2026-10-12; 1 dashboard tesztfájlban 3 teszt, összesen 7 projekt-teszt sikeres. |
| Mobil-first grid szabály | Ellenőrizve | Alapértelmezett 1 oszlop, 640 px felett legfeljebb 2 oszlop, 960 px felett 3 oszlop; nincs fix kártyaszélesség. |
| Tab váltás | Sikeres | Böngészőben `Funkciók` ↔ `Aktuális munkák` váltás oldalújratöltés nélkül. |
| Billentyűzetes tab navigáció | Sikeres | Böngészőben ArrowLeft használatával visszaváltás ellenőrizve; utility teszteli mindkét irányt. |
| DEMO jelölés | Sikeres | Böngészőben a DEMO banner és projektcímkék láthatók. |
| Téma integráció | Sikeres | Világos/sötét mód, következő módot jelző címke és Beállítások → Rendszer szerint visszaállítás ellenőrizve. |
| Reduced motion | Ellenőrizve | `prefers-reduced-motion` CSS szabály tiltja a dashboard belépőanimációját és a hosszú átmeneteket. |
| Vízszintes túlcsordulás | Kód szerint ellenőrizve | Grid `minmax(0, 1fr)`, `overflow-wrap:anywhere`, nincs fix kártyaszélesség; külön mobil viewport-eszköz nem állt rendelkezésre. |

## F1.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Skálázási unit tesztek | Sikeres | 2026-10-12; összesen 9 teszt: alapértékek, független frissítés, clamp, hibás adat, reset, bubble állapot. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 4 tesztfájl / 9 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; webpack build, `/demo/meretezes` statikusan generálva. |
| Skálázási tartományok | Sikeres | Böngészőben szöveg 200%, UI 150%, rajz 200%; felső határon a növelő gomb letilt. |
| Perzisztencia és reset | Sikeres | Böngészőben reload után megmaradtak az értékek, reset 100%-ra állított. |
| Bubble nyitás/zárás | Sikeres | Böngészőben fix launcher, nyitás, aria-expanded, close gomb, click-outside és Escape logika. |
| Dashboard settings integráció | Sikeres | Beállítások panel ugyanazt a globális ScalingProvider állapotot használja. |
| DEMO SVG | Sikeres | Böngészőben látható; `viewBox` változatlan, 12,0 m-es felirat megmarad. |
| Light/dark és hydration | Sikeres | Téma integráció megmaradt, böngészőben nincs új hydration-warning a scale inicializálás után. |
| Mobil viewport vizuális ellenőrzés | Korlátozott | A böngészővezérlőben nincs viewport override; mobil reflow CSS alapján és accessibility tree-ben ellenőrzött, külön 320–430 px screenshot nem készült. |

## F2.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Repo/remote/git preflight | Sikeres | `main` ág és a konfigurált remote ellenőrizve; meglévő módosítások megőrizve. |
| Supabase CLI | Sikeres | 2.120.0 telepítve és működik; távoli login/link nem történt. |
| Docker runtime | Sikeres | Docker 29.8.0 daemon elérhető; a lokális Supabase konténerek healthy állapotban futnak. |
| SMTP konfiguráció | Sikeres | Deprecated `[inbucket]` helyett `[local_smtp]`; restart után nincs deprecation warning. |
| SQL/migráció statikus áttekintés | Sikeres | Öt tábla, FK-k, összetett tenant-kulcs, indexek, timestamp/version és RLS/grant szabályok elkészültek. |
| Helyi séma read-only ellenőrzés | Sikeres | 5 tábla, 5 RLS, 13 policy, DEMO seed rekordok és kritikus constraint-ek igazolva. |
| pgTAP adatbázisteszt | Sikeres | 2026-10-12; 1 fájl / 29 teszt, `Result: PASS`. |
| Migration replay / clean reset | Sikeres | `supabase db reset --local` kétszer sikeresen lefutott; remote célpont nem volt használva. |
| TypeScript DB-típusgenerálás | Sikeres | `supabase gen types typescript --local`; 258 soros generált fájl készült. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 4 fájl / 9 teszt sikeres. |
| `npm run build` | Sikeres | 2026-10-12; Next.js webpack production build, `/` és `/demo/meretezes` generálva. |
| `npm audit --audit-level=high` | Nem verifikálható | Az npm registry DNS-feloldása sikertelen volt; audit eredmény nem állt rendelkezésre. |
