# F9.66 — Safe Dependency Cleanup & Dead-Code Verification

**Dátum:** 2026-10-22  
**Státusz:** az egyetlen magas bizalmú dependency-jelölt eltávolítva; további takarítás csak külön célzott feladatban.

## Eltávolított függőség

- `liquid-glass-react@1.1.1` kikerült a `package.json`-ból, a `package-lock.json`-ból és a helyi `node_modules`-ból.
- A forrásban, route-okban, dinamikus importokban/registrykben, tesztekben/fixture-ekben, konfigurációban, build- és scriptbelépőkben nincs package import vagy package-névvel hivatkozó runtime használat. Az exact-name keresés csak dokumentációs előzményeket és a két npm manifestet találta.
- Az `npm ls liquid-glass-react --all` eltávolítás előtt kizárólag a root project közvetlen dependency-jét mutatta; a lockfile rekordjában nem volt saját függőség, csak React/React DOM peer requirement. Másik telepített csomag nem használta.
- A jelenlegi SSR/client belépők nem töltenek be könyvtárat és nem futtatnak belőle oldalhatást: nincs import, CSS import vagy runtime integráció. A saját `LiquidGlassProvider`, `LiquidGlassControls`, `GlassDisclosure` és `globals.css` külön implementáció, több aktív használattal.
- Történeti kompatibilitás: az F9.39.1 dokumentáltan eltávolította a könyvtár rim rétegét (`LiquidGlassLayer`, policy, prop és kapcsolódó CSS), a CSS-tokenes megjelenítés megmaradt. A F9.21-es említések történeti állapotot rögzítenek; jelenlegi külső API-szerződés nem található.

## Függőség-footprint és vizuális kockázat

| Mérés | Eltávolítás előtt | Utána | Bizonyíték |
|---|---:|---:|---|
| Közvetlen runtime dependency | 12 | 11 | `package.json` |
| Lockfile package rekord | 350 | 349 | `package-lock.json` |
| A csomag telepített könyvtára | 208 KiB | 0 | `du -sk`, majd könyvtár hiánya |
| Cleanup diff | — | −1 manifest sor, −14 lockfile sor | `git diff -- package.json package-lock.json` |

A build, Liquid Glass céltesztek és teljes tesztkészlet ellenőrizték, hogy az aktív alkalmazáskód továbbra is fordul és működőképes. Külön böngészős smoke nem futott: a törölt csomag forrásból elérhetetlen volt; a Liquid Glass megjelenítést a saját, változatlan CSS és React komponensek adják. Ez nem új runtime-vizuális mérés.

## További statikus jelöltek

| Jelölt | Bizalom | Várható haszon | Döntés |
|---|---|---|---|
| Rendezett snapshot-JSON helper duplikáció: `src/features/roof-models/gable-trapezoidal-covering-data.ts`, `src/features/roof-models/gable-metal-tile-covering-data.ts`, `src/features/roof-models/gable-trapezoidal-covering-panel.tsx` | Magas, hogy a helper implementációk duplikáltak; közepes, hogy közös helper fenntartása nettó előny | Kicsi; három azonos rendezett JSON szerializáló | Külön, alacsony kockázatú deduplikációs mérföldkőben mérlegelendő. Nem része ennek a takarításnak, mert nem dead code. |
| Régi kalkulátoros belépő: `src/app/kalkulatorok/epitesi/page.tsx` | Alacsony törölhetőségi bizalom; ismert, aktív kompatibilitási cél | Nagyon kicsi | Megőrizve: redirectként megtartja a korábbi `/kalkulatorok/epitesi` hivatkozásokat és query-paramétereket. Külső könyvjelzők/linkek forgalma nincs felmérve. |
| Egyéb unused package, export vagy source module | Nem igazolt | Nem becsülhető | Nincs további magas bizalmú eltávolítási jelölt. A lint/typecheck nem bizonyít teljes exportszintű használatlanságot; Knip vagy más analyzer nem volt telepítve, és nem telepítettem újat. |

## Téves pozitívak és megőrzött területek

- A Liquid Glass név és CSS nem azonos a törölt npm csomaggal. A saját provider, vezérlők, disclosure, design tokenek és globális stílusok alkalmazáskódon belül használtak.
- A `src/app/**` filesystem route-ok, API route-ok, `import()`-tal betöltött kalkulátormodulok, dinamikus rajzok, Supabase migration/RPC-k, tesztfixture-ek és történeti revisionek lehetnek statikus importgrafikonon kívül elérhetők. Nem töröltem belőlük semmit.
- Az ismétlődő `authorized`/revision-validációk hasonlónak tűnhetnek, de ownership-scope és snapshot contract ellenőrzéseik eltérnek. Jogosultsági vagy historical-data kockázat miatt nem vontam össze őket.
- A repó jelenlegi, másik munkához tartozó módosításai a státuszfelméréskor azonosítva lettek, és változatlanok maradtak.

## Ellenőrzések és korlátok

- Célzott: `npm test -- src/features/preferences/liquid-glass.test.ts src/features/dashboard/dashboard-controls.test.tsx` — **2 fájl / 8 teszt PASS**.
- `npm run lint` — **PASS**, ESLint: no issues.
- `npm run typecheck` — **PASS**, Next route type generation és TypeScript.
- `npm test` — **158 fájl PASS, 8 SKIP; 918 teszt PASS, 19 SKIP**.
- `npm run build` — **PASS**, Next.js 16.4.2 webpack, 32 statikus oldal.
- `git diff --check` — **PASS** a végleges riport és progress update után.
- DB/migration/RLS teszt, böngészőteszt és fizikai eszközteszt nem futott; adatbázis vagy üzleti adat nem változott. Teljes, dynamic-/framework-aware dead-code gráf nem készült; az ilyen megállapítások nem tekinthetők bizonyítottnak.

**Következő legbiztonságosabb cleanup:** ha a kis mennyiségű duplikáció eltávolítása indokolt, a három `stable` snapshot-helper deduplikálása külön teszt- és output-paritás-ellenőrzéssel. Az unused export/module auditot csak meglévő vagy külön jóváhagyott analyzerrel érdemes folytatni; jelen mérföldkő nem ad alapot további törlésre.

**Javasolt Conventional Commit:** `chore: F9.66 remove unused liquid-glass dependency`
