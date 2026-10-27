# M10.1.9 — Domain-aware output-drift összehasonlítás véglegesítése

**Dátum:** 2026-10-27
**Hatókör:** kizárólag az `outputsEquivalent` drift-comparator (`src/features/calculators/construction-save-panel.tsx`) és a hozzá tartozó tesztek. Domain-számítás, mentési szerződés, séma, RPC és korábbi QA-k nem módosultak.

## 1. A javított P2 gyökéroka

A [`M10_PHASE1_FINAL_NUMERICAL_QA.md`](M10_PHASE1_FINAL_NUMERICAL_QA.md) független QA bizonyította, hogy a korábbi `numbersEquivalent` kizárólag egy korlátlanul a nagysággal növő relatív toleranciát (`1e-9 × max(|a|, |b|)`) használt minden számra, mezőszemantikától függetlenül. Ez helyes volt a bizonyított gépi zajra (~`1e-14` a Karmi szögeredményeken), de a valós, érvényes séma mellett milliárdos nagyságrendet elérhető `LAYOUT` darabszámoknál (`takeoff.parts[].quantities[].value`, `unit: "db"`) egy tényleges `+1` darabeltérést is elrejtett (`outputsEquivalent(1_000_000_000, 1_000_000_001) === true`).

## 2. A javított comparator működése

Két változás, mindkettő `src/features/calculators/construction-save-panel.tsx`-ben:

1. **Diszkrét mezők pontos összevetése.** Az `outputsEquivalent` rekurzió egy `exact` jelzőt ad át a következő szintre: igaz, ha a kulcs `"count"` (a `cutList` sorai), vagy a kulcs `"value"` és a testvér `unit` mező `"db"` (a `lines` és a `takeoff.parts[].quantities[]` darabszámai). Ezeken a leveleken a számok csak `===` szerint egyeznek, toleranciát soha nem kapnak — a nagyság nem véd.
2. **Folytonos mezők felső korlátos toleranciája.** Minden más numerikus levélnél (hosszak, szögek, területek, térfogatok) a tolerancia `min(1e-9 + 1e-9 × max(|a|, |b|), 1e-6)`. A `1e-6` felső korlát (`DRIFT_NUMERIC_MAX_TOLERANCE`) megállítja a relatív tag korlátlan növekedését: a domain-kontraktusban rögzített tetőméret-felső határ (100 000 mm) mellett bármely hossz-, szög-, terület- vagy térfogat-eredmény abszolút magnitúdója korlátos, így a `1e-6` cap ~`1e7`-szer nagyobb marad, mint a bizonyított ULP-zaj, és ~`1e4`-szer kisebb, mint a legkisebb szakmailag releváns különbség (`0,01 mm`, `0,001°`).
3. **Érvénytelen szám.** `NaN` vagy nem véges (`Infinity`/`-Infinity`) szám sosem egyenértékű, még önmagával összevetve sem (`Number.isFinite` ellenőrzés az összehasonlítás elején). Ez szándékos viselkedésváltozás a korábbi `outputsEquivalent(Infinity, Infinity) === true`-hoz képest; a hozzá tartozó tesztet frissítettem.

A struktúra (kulcshalmaz, tömbhossz és -sorrend, hiányzó mező vs. `null`, szöveg, típus) változatlanul szigorú maradt.

## 3. Diszkrét vs. folytonos mezők kategorizálása

| Mező | Forrás | Kategorizálás alapja |
|---|---|---|
| `lines[].value` | `ResultLine` | `unit === "db"` esetén diszkrét, egyébként folytonos |
| `takeoff.parts[].quantities[].value` | `RoofTakeoffQuantity` | `unit === "db"` esetén diszkrét (a `meaning: "LAYOUT"` önmagában **nem** elég — a kódbázisban `"LAYOUT"` jelölt folytonos mennyiség is létezik, pl. `"Geometriai összhossz"`, `unit: "m"`) |
| `cutList.*.count` | `ConstructionComputation["cutList"]` | a `"count"` kulcsnév önmagában diszkrét |
| `cutList.*.lengthMm`, hosszak, szögek, területek, térfogatok | — | folytonos, felső korlátos tolerancia |

## 4. Választott tolerancia és indoklása

- `DRIFT_NUMERIC_ABSOLUTE_TOLERANCE = 1e-9`, `DRIFT_NUMERIC_RELATIVE_TOLERANCE = 1e-9`: változatlan, az M10.1.7-ben igazolt Karmi ULP-zajhoz (~`1e-14`) illesztve.
- `DRIFT_NUMERIC_MAX_TOLERANCE = 1e-6`: új felső korlát, nem mechanikus `1e-9 → 1e-12` csere. A domain-kontraktus (max. tetőméret 100 000 mm, szög 0–90°) alapján minden folytonos mező abszolút magnitúdója korlátos, így egy fix abszolút felső korlát biztonságosan elválasztja a gépi zajt a szakmai küszöbértékektől minden mértékegységben (mm, m, °, m², m³).
- Diszkrét mezőknél nincs tolerancia (`exact` ág): a darabszám bármely eltérése, bármely nagyságrendnél, drift.

## 5. A korábbi hamis drift elnyomásának bizonyítéka

`construction-save-panel.test.tsx` — a három korábban dokumentált Karmi ULP-eltérés (`55.98065001017354` vs. `...355`, `34.01934998982646` vs. `...645`, `209.33121517077495` vs. `...498`) továbbra is `outputsEquivalent === true`; a `suppresses a saved-vs-live drift warning` komponensteszt szerint az azonos input + `Number.EPSILON` zaj nem jelenít meg figyelmeztetést.

## 6. A nagy darabszámeltérés felismerésének bizonyítéka

Új célzott teszt (`compares discrete counts exactly, regardless of magnitude`):

- `{ value: 1_000_000_000, unit: "db" }` vs. `{ value: 1_000_000_001, unit: "db" }` → **különböző** (a korábban bizonyított P2 reprodukciója, most javítva).
- Ugyanekkora magnitúdójú folytonos (`unit: "m"`) mező `0.001` eltérése is **különböző** marad; csak a `1e-10` gépi zaj tűnik el.
- `cutList`-szerű `{ lengthMm, count }` objektum `count` mezőjének `+1` eltérése **különböző**.

Új komponensszintű teszt (`flags a real billion-scale LAYOUT count +1 as drift but tolerates the same-scale angle's ULP noise`) valódi `takeoff.parts[].quantities[]` alakú struktúrával igazolja, hogy a `ConstructionSavePanel` a milliárdos darabszám `+1` eltérésére figyelmeztet, azonosan maradva pedig nem jelez hamis drift-et.

## 7. Teszt- és build-eredmények

- Célzott: `rtk bypass npx vitest run src/features/calculators/construction-save-panel.test.tsx` — **13/13 PASS** (4 új/kibővített teszt: diszkrét darabszám-egzaktság, `Infinity` érvénytelensége, billió-darabszám komponensteszt, határértékek).
- Teljes Vitest: `rtk bypass npx vitest run` — **192 fájl PASS / 8 SKIP, 1221 teszt PASS / 19 SKIP**.
- ESLint (`npx eslint` a két érintett fájlra) — **PASS**.
- Izolált (`git worktree`, futó dev szerver `.next`-jétől elválasztva, symlinkelt `node_modules`) `npm run typecheck` — **PASS**.
- Izolált `npm run build` (`next build --webpack`) — **PASS**, minden route legenerálva.
- `git diff --check` a két érintett fájlra — **PASS**.

## 8. Böngészős ellenőrzés és korlátja

A futó helyi dev szerveren (`localhost:3000`), egy már hitelesített munkamenetben megnyitottam egy mentett `roof.timber-cutlist` (`"DEMO M10 QA cél"`, `calculation=b9255f62-44c8-487e-8c66-0246eba772a5`, `Mentve · V1`) kalkulációt: a teljes oldalszövegben nem jelent meg a `"A mentett V1 eredménye eltér a mostani számítástól."` drift-figyelmeztetés.

**Korlát:** a feladatban megadott két konkrét DEMO azonosító (material-takeoff `1a78b905-e80a-44fb-b701-1ad75e2171c3`, timber-cutlist `ee5d703f-5c64-4179-9147-d8b776ad2866`) ebben a munkamenetben, ebben a szervezetben (`00000000-0000-4000-8000-000000000010`) nem volt elérhető — a `Tetőanyag-kimutatás` szűrő üres listát adott, és a `Faanyag és vágáslista` listában más azonosítójú mentett tétel szerepelt. Az `admin1@testadmin.com` hitelesített munkamenet elérhetőségét nem tudtam külön igazolni. A fenti ellenőrzés emiatt csak általános (nem a két megnevezett rekordra specifikus) bizonyíték a hamis drift hiányára; a két konkrét DEMO revízió újranyitása **nem verifikált**.

## 9. Fennmaradó kockázatok

- A `1e-6` felső tolerancia-korlát a domain jelenlegi bemeneti határain (≤100 000 mm, ≤90°) belül biztonságos; ha egy jövőbeli mezőbővítés ennél nagyobb magnitúdójú, de legitim folytonos eredményt vezet be, a korlátot felül kell vizsgálni.
- A diszkrét/folytonos elkülönítés az `unit === "db"` és a `"count"` kulcsnévre épül; egy új, darabszám jellegű mező más kulcsnévvel vagy mértékegység-jelöléssel bevezetve nem kerülne automatikusan a pontos összehasonlítás alá.
- A két konkrét DEMO revízió böngészős újranyitása ebben a menetben nem volt verifikálható (lásd 8. pont).

## 10. Javasolt Conventional Commit

```
fix(M10.1.9): cap continuous-value drift tolerance and compare discrete counts exactly
```
