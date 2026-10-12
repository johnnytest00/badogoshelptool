# F0 állapot

## Jelenlegi fázis

F0 — projekt inicializálása.

## Elkészült

- Next.js 15.5.27 App Router + React 19.3.0 + TypeScript 5.9.3 + `src/` + `@/*` alias.
- Tailwind CSS 4.3.3 PostCSS-alap és központosított minimális design tokenek.
- shadcn/ui `components.json` konfiguráció és Lucide ikonfüggőség.
- Magyar, reszponzív kezdőoldal, amely csak az inicializálás állapotát jelzi.
- Szigorú typecheck, ESLint, Vitest smoke teszt, dokumentáció és `.env.example`.

## Szándékosan nincs benne

Dashboard, projektkezelés, autentikáció, Supabase, téma-/méretezésvezérlés, kalkulátor, geometria, ár- vagy gyártói adat.

## Következő fázis

F1 — design system, dashboard, téma és alap megjelenítés-méretezés, külön jóváhagyással.

## Ismert hiányok

- Az npm telepítés auditja 13 tranzitív sérülékenységet jelzett (4 moderate, 7 high, 2 critical); automatikus, törő `audit fix --force` nem futott.
- Ez az F0 nem tartalmaz üzleti funkciót, adatbázist vagy hitelesítést.
