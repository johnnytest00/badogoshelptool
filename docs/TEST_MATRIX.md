# Tesztmátrix

## F6.1 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Rajzmodell referencia-koordináták | Sikeres | A 8000×12000×3000 mm F5 eset: X -250…12250, Y -4500…4500; eresz Z=-375, gerinc Z=3000. |
| Nézetek | Sikeres | Felülnézet, Oromoldal, Keresztmetszet és Oldalnézet ugyanabból a `GableRoofOutput`-ból. |
| Méret- és szögannotációk | Sikeres | Forrásuk F5 output; magyar `m`/`mm` formázás, hosszanti/függőleges/aligned méret. |
| Rétegek | Sikeres | Hat réteg kapcsolható, csak megjelenítési állapotot módosít. |
| Rajzmodell és viewport unit tesztek | Sikeres | 2026-10-12; 15 Vitest fájl / 50 teszt összesen. |
| `npm run typecheck` | Sikeres | F6.1 módosításokkal hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build. |
| Valós F5 böngészős workflow | Sikeres | Codex in-app browserben: mentett helyi tetőmodell, négy nézet, layer toggle, zoom/reset, élő input-frissülés és nem mentett előnézet. |
| Browser runner pre-flight | Korlátozott | Playwright/Puppeteer nincs a projektben; helyi Playwright Chromium bináris van, de runner nincs. Új függőség telepítése hálózati korlát és arányosság miatt nem történt. |
| Aktuális dokumentum-overflow smoke | Sikeres | Browser DOM-mérés: `clientWidth=1002`, `scrollWidth=1002`; a dedikált mobil viewportok nem voltak beállíthatók. |
| 320×700, 375×812, 390×844, 430×932, 768×1024, 1440×900 | Nem verifikált | A jelenlegi browser connectorban nincs viewport override; nem jelölöm PASS-ként. |
| RLS/Supabase regresszió | Nincs változás | F6 nem módosított migrációt vagy adat-hozzáférési réteget; a korábbi helyi pgTAP baseline változatlan. |
| Keskeny viewportok | Korlátozott | A vezérlő nem támogatott dedikált 320/375/390/430 px emulációt; CSS és accessibility tree vizsgálat történt. |
| Pinch gesztus | Kód + pure unit teszt | Kétpointeres állapot, fókuszpont-megtartás, clamp és cancel/release implementálva; browser multi-touch emuláció és fizikai eszköz nem állt rendelkezésre. |
| Anime.js | Nem alkalmazható | Nincs új animációs függőség; statikus rajz és reduced-motion CSS maradt. |

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

## F2.2 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Helyi Auth bootstrap | Sikeres | `npm run db:local-auth`; valódi lokális GoTrue-felhasználó és DEMO owner tagság létrejött. A jelszó csak futtatási input volt. |
| `npm run typecheck` | Sikeres | 2026-10-12; `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run test` | Sikeres | 2026-10-12; 5 fájl / 12 teszt sikeres, köztük safe return path tesztek. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build, `/`, `/bejelentkezes` és `/demo/meretezes` route-ok elkészültek. |
| `supabase test db` | Sikeres | 2026-10-12; 29/29 pgTAP teszt PASS helyi adatbázison. |
| Hibás login | Sikeres | Böngészőben általános, nem érzékeny hibaüzenet jelenik meg. |
| Sikeres login és SSR session | Sikeres | Helyi böngészőben dashboard, user/org adatok és reload utáni session ellenőrizve. |
| Védett DEMO útvonal | Sikeres | `/demo/meretezes` csak hitelesített, szervezethez tartozó helyi felhasználóval érhető el. |
| Logout | Sikeres | Böngészőben a `Kilépés` visszairányít `/bejelentkezes` oldalra. |
| RLS regresszió | Sikeres | Az F2.1 29 pgTAP tesztje változatlanul PASS; F2.2 nem módosított migrációt. |
| TypeScript DB-típusok | Sikeres | A lokális sémából generált `database.types.ts` felhasználva az SSR/browser klienseknél. |
| `npm audit --audit-level=moderate` | Nem verifikálható | npm registry DNS-hiba; az install korábbi kimenete 0 audit findingot jelzett, de friss audit-lekérdezés nem volt elérhető. |

## F3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| F3 migráció | Sikeres | `20261012020000_project_management.sql`; meglévő migrációk módosítása nélkül alkalmazható. |
| Lokális migration replay | Sikeres | `supabase db reset --local`; F2.1, F2.3 és F3 migráció + seed sikeresen lefutott. |
| Projekt CRUD | Sikeres | Lokális pgTAP-ban létrehozás, módosítás és jogosultsági ellenőrzés; böngészőben létrehozás/szerkesztés sikeres. |
| Ügyfél CRUD | Sikeres | Lokális pgTAP-ban létrehozás/módosítás; böngészőben gyors létrehozás, lista és projekt-hozzárendelés sikeres. |
| Projekt keresés/szűrés/rendezés | Sikeres | Szerveroldali bounded query, névkeresés, status, munkatípus, archived filter és updated_at rendezés. |
| Projekt duplikálás | Sikeres | Csak alapadatok másolódnak, új ID és `draft` státusz készül; történelmi revíziók nem duplikálódnak. |
| Archiválás/visszaállítás | Sikeres | `previous_status` adatbázisban megőrzött; böngészőben inline megerősítés, archív lista és restore ellenőrizve. |
| Végleges törlés tiltása | Sikeres | Authenticated `DELETE` grant projects/clients táblákon visszavonva; pgTAP ellenőrizve. |
| Optimistic concurrency | Sikeres | `version` feltételes update; stale verzió nem egyezik és konfliktusüzenet készül. Több-session terheléses teszt nem futott. |
| Organization isolation | Sikeres | Minden query/action tagságot és organization scope-ot ellenőriz; meglévő RLS tesztek megmaradtak. |
| Dashboard integráció | Sikeres | Funkciók/Aktuális munkák tabok megmaradtak; Aktuális munkák valós aktív projekteket mutat. DEMO projektet nem mutat saját munkaként. |
| Project detail future modules | Sikeres | Tetőmodellek, kalkulációk, anyagkimutatás, ajánlatok/dokumentumok csak „Hamarosan” állapotban jelennek meg. |
| `npm run typecheck` | Sikeres | `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run test` | Sikeres | 8 fájl / 20 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build; minden F3 route dinamikusan elkészült. |
| `supabase test db` | Sikeres | **74/74 pgTAP PASS**, az F2.1 és F2.3 assertionök megőrzésével. |
| Böngészős workflow | Sikeres | Login → dashboard → project list → quick client → project create → detail → edit → duplicate → archive → archived filter → restore → dashboard real projects. |
| Mobil viewport | Korlátozott | Responsive CSS és accessibility tree ellenőrzött; külön 320/375/390/430 px emuláció nem állt rendelkezésre. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba; `npm audit fix --force` nem futott. |

## F2.3 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Új migráció alkalmazása | Sikeres | `20261012010000_versioned_calculation_architecture.sql`; lokális reset után a foundation és F2.3 migráció is lefutott. |
| Migration replay | Sikeres | Két egymást követő sikeres `supabase db reset --local` + seed futás, kizárólag lokális adatbázison. |
| Új táblák | Sikeres | 5/5 tábla létrejött: roof models, model revisions, calculations, calculation revisions, dependencies. |
| RLS és policy-k | Sikeres | Mind az 5 új tábla RLS-es; read-only ellenőrzés: összesen 14 policy. |
| DEMO seed lánc | Sikeres | Minden új F2.3 táblában 1 reprezentatív, DEMO-jelölt rekord; dependency a roof revisionből a calculation revisionbe mutat. |
| pgTAP | Sikeres | 2026-10-12; 60/60 PASS, az eredeti 29 assertion megőrzésével. |
| Constraint és ownership tesztek | Sikeres | FK, összetett szervezet/projekt integritás, invalid reference, duplicate revision és current pointer tesztek. |
| Revízió-konkurencia | Részben bizonyított | A PostgreSQL egyedi constraint párhuzamos azonos revíziószámot elutasít; valódi több-session terheléses concurrency teszt ebben a mérföldkőben nem futott. |
| Immutable revíziók | Sikeres | Roof- és calculation-revision update/delete trigger tesztek PASS. |
| Dependency DAG | Sikeres | Self-dependency, cross-project dependency és cycle rejection tesztek PASS. |
| Membership revocation | Sikeres | Tagság visszavonása után a korábbi F2.1 és új F2.3 üzleti adatok olvasása eltűnik. |
| TypeScript DB-típusgenerálás | Sikeres | `supabase gen types typescript --local`; 394 soros generált fájl, mind az 5 új tábla jelen van. |
| Domain contract unit tesztek | Sikeres | Zod provenance, input/output snapshot és invalid provenance tesztek. |
| `npm run typecheck` | Sikeres | `tsc --noEmit` hibamentes. |
| `npm run lint` | Sikeres | ESLint hibamentes. |
| `npm run test` | Sikeres | 6 fájl / 15 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack production build sikeres; UI-regresszió nélkül. |
| `npm audit` | Nem verifikálható | Korábbiakhoz hasonlóan npm registry DNS-hiba miatt nem adott auditválaszt. |

## F4 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Mértékegység- és konverziós tesztek | Sikeres | 2026-10-12; mm/cm/m, mm²/m², mm³/m³, fok/radián, nem véges és unsafe integer bemenetek. |
| Matematikai referenciaesetek | Sikeres | 2026-10-12; 3–4–5 háromszög, 2000 × 3000 mm téglalap = 6 000 000 mm², 90° = π/2. |
| Geometriai primitívek | Sikeres | Távolság, vektor, normalizálás, szakasz, vetítés, felezőpont, sokszög-terület/kerület. |
| Hibás geometria elutasítása | Sikeres | Nulla szakasz/vektor, kevés pont, degenerált és önmetsző sokszög, invalid koordináta. |
| Calculator Registry | Sikeres | Explicit registry; duplicate és unknown calculator ID elutasítva. |
| Calculation engine integráció | Sikeres | Teszt-only matematikai DEMO fixture: Zod input → számítás → output-validáció → verziózott eredmény. |
| Strukturált hibák | Sikeres | `VALIDATION_ERROR`, `MISSING_REQUIRED_INPUT`, `INVALID_GEOMETRY`, `NUMERIC_OVERFLOW`, `UNSUPPORTED_OPERATION` szerződésben kezelve. |
| Domain tesztek | Sikeres | 2026-10-12; 12 fájl / 38 teszt sikeres. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; ESLint hibamentes. |
| `npm run build` | Sikeres | 2026-10-12; Next.js 16.4.0 webpack production build hibamentesen elkészült. |
| Adatbázis-regresszió | Sikeres | F4 nem módosított sémát; a meglévő helyi 74/74 pgTAP baseline újrafuttatása 2026-10-12-én PASS. |
| `npm audit` | Nem verifikálható | A korábbi npm registry DNS-hiba fenntartva; sikeres audit nem állítható. |

## F5 ellenőrzések

| Ellenőrzés | Állapot | Megjegyzés |
| --- | --- | --- |
| Checkpoint A: gable referenciaeset | Sikeres | 8000×12000 mm, 3000 mm emelkedés, 500/250/250 mm túlnyúlás; 36,86989765°, 5625 mm, 140,625 m², 112,5 m². |
| Checkpoint A: height/angle ekvivalencia | Sikeres | Azonos fizikai eredmény dokumentált tolerancián belül. |
| Checkpoint A: invalid/deterministic/symmetry tesztek | Sikeres | 5 gable teszt, registry-integrációval és független várt értékekkel. |
| F5 DB migration | Sikeres | `20261012030000_gable_calculation_persistence.sql` csak lokális DB-re pusholva; reset nem történt. |
| Atomic persistence | Sikeres | Egy RPC-tranzakció: roof revision + calculation revision + dependency. |
| Revision history/stale write | Sikeres | Lokális pgTAP-ban második revízió és stale `40001` elutasítás. |
| RLS/authorization regression | Sikeres | **83/83 pgTAP PASS**; meglévő tenant/RLS/immutable ellenőrzések és a nem-tagos F5 mentés-elutasítás PASS. |
| TypeScript DB-típusgenerálás | Sikeres | Lokális sémából újragenerálva; F5 RPC szerepel a `database.types.ts` Functions részében. |
| Project-linked UI | Sikeres | Új tetőmodell, szerkesztés, projektkártya és revision result. |
| Élő számítás és input modes | Sikeres | Browserben height/angle váltás, magyar vessző, élő eredmény és inline mentési állapot. |
| Reload/revision browser workflow | Sikeres | 1. mentés → width módosítás → 2. mentés → reload; 9000 mm és 156,25 m² visszatöltve. |
| Adaptive UI | Sikeres | Calculator oldalon Scaling Bubble, 100→110% élő text scaling, reset ellenőrizve. |
| Narrow viewport 320/375/390/430 px | Nem elérhető | A böngészővezérlőben nincs viewport capability; CSS/accessibility és normál browser smoke elvégezve, vizuális narrow screenshot nem állítható. |
| `npm run typecheck` | Sikeres | 2026-10-12; hibamentes. |
| `npm run lint` | Sikeres | 2026-10-12; hibamentes az unused import javítása után. |
| `npm run test` | Sikeres | 13 fájl / 43 teszt sikeres. |
| `npm run build` | Sikeres | Next.js 16.4.0 webpack build; új F5 route-okkal. |
| `npm audit` | Nem verifikálható | npm registry DNS-hiba (`ENOTFOUND registry.npmjs.org`). |
