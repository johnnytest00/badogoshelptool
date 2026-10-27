# M10.1.7 — Numerikusan stabil output-drift összehasonlítás és M10.1 lezárása

**Dátum:** 2026-10-27
**Döntés:** **PASS WITH LIMITATIONS**
**Hatókör:** `construction-save-panel.tsx` output-drift döntési logikája és a hozzá tartozó tesztek. Karmi-képlet, geometriamotor, mentett adat, séma, DB és szerveroldali újraszámítás nem változott.

## 1. Gyökérok

A [`M10_PHASE1_DRIFT_INDEPENDENT_QA.md`](M10_PHASE1_DRIFT_INDEPENDENT_QA.md) által bizonyítottak szerint a mentett és az élő `{lines, takeoff, cutList}` kimenet `stableJsonStringify`-alapú, pontos string-összehasonlítása a Karmi trigonometrikus eredmények (`Math.tan`/`Math.atan2`) utolsó bitjében eltérő, de matematikailag azonos lebegőpontos értékeket is driftként jelzett (`~1e-14` nagyságrendű eltérés `lines[6]`, `lines[7]`, `lines[9]` értékén).

## 2. A választott összehasonlítási szabály

Az eddigi `comparableOutput(a) !== comparableOutput(b)` (pontos JSON-string egyezés) helyett a döntés most `!outputsEquivalent(driftComparisonFields(a), driftComparisonFields(b))` ([`construction-save-panel.tsx`](../src/features/calculators/construction-save-panel.tsx)). `outputsEquivalent` rekurzív, strukturális összehasonlítás:

- Objektumkulcs-halmaz és tömbhossz pontosan egyezik (hiányzó mező ≠ explicit `null`); tömbelemek indexenként, sorrendhelyesen.
- `string`/`boolean`/`null`/típus pontos `===`.
- Csak `number`–`number` pár kap toleranciát; minden más eltérés (típus, struktúra, szöveg) azonnal drift.
- `NaN` sosem egyenlő semmivel (saját magával sem); `Infinity === Infinity` igaz, de semmilyen véges értékkel nem egyezik.

## 3. Numerikus tolerancia

```
abs(a − b) ≤ 1e-9 + 1e-9 × max(|a|, |b|)
```

Abszolút és relatív komponens is `1e-9`. Indoklás:
- A bizonyított zaj `~1e-14…1e-13` nagyságrendű — a tolerancia ennél **~5 nagyságrenddel** nagyobb, bőven elnyeli.
- A legkisebb szakmailag érdemi eltérés (1 darabszám, 0,01 mm, 0,001°) ennél **~7–9 nagyságrenddel** nagyobb — a tolerancia nem nyeli el.
- Darabszámok, indexek és más egész értékek pontos egészek; a `1e-9` tolerancia minden valódi, legalább 1 egységnyi eltérést driftként hagy, ezért nincs szükség a mezők diszkrét/folytonos jellegének külön osztályozására.

A tolerancia globális numerikus kerekítést **nem** alkalmaz — kizárólag a drift-döntés `outputsEquivalent` függvényén belül, csak a két összehasonlított `number` érték között.

## 4. Mit tolerál és mit nem

**Toleráns (nincs drift):**
- A három bizonyított `~1e-14` Karmi-eltérés (pozitív, negatív, nullához közeli és nagy nagyságrendű variánsban is tesztelve).
- Objektumkulcsok eltérő szerializációs sorrendje (a függvény kulcs szerint, nem string szerint hasonlít).

**Nem toleráns (drift marad):**
- Érdemben eltérő szám (pl. `55.98` vs `56.5`, darabszám `5` vs `6`).
- Hiányzó mező vs. explicit `null`.
- Típuseltérés (`1` vs `"1"`).
- Tömbhossz- és tömbsorrend-eltérés.
- Szöveges eredmény eltérése.
- `NaN`/érvénytelen szám sosem válik hamisan egyenlővé.

## 5. Regressziós bizonyítékok

Új teszt: *"tolerates only machine-precision numeric noise, not any real difference (M10.1.7)"* — a három dokumentált ULP-eltérés, negatív/nullához közeli/nagy érték, kulcssorrend-független objektum, tömbsorrend-érzékenység, majd valódi eltérések (szög, darabszám, hiányzó vs. `null` mező, típus, tömbhossz, szöveg, `NaN`, `Infinity`) — mind a dokumentált elvárás szerint.

Új teszt: *"suppresses a saved-vs-live drift warning that is only ULP noise but keeps a real one"* — a `ConstructionSavePanel`-t egy `Number.EPSILON`-nyi eltérő mentett sorral renderelve a figyelmeztetés **nem** jelenik meg; +1 valódi eltéréssel renderelve a figyelmeztetés **megjelenik**.

Mindkét teszt a tényleges production `outputsEquivalent` függvényt hívja, nem másolatot.

## 6. Diagnosztika

A production UI-ban futó ideiglenes `useEffect` + `console.debug` (M10.1.5 dev-only drift-logolás) és a hozzá tartozó `loggedDrift` ref eltávolítva. A fejlesztői `outputDriftDiffPaths` strukturális diff-helper megmaradt tiszta, tesztelt utilityként (pontos egyezést vizsgál, az eltérő útvonalak lokalizálására); a tényleges drift-döntésben nem vesz részt, csak a saját tesztjében használt.

## 7. Két korábbi mentett kalkuláció újranyitása

**NEM VERIFIKÁLT ebben a menetben.** A böngészőben a session `demo.owner@local.test`-ként hitelesített; a két célrevízió (`material-takeoff` `1a78b905-e80a-44fb-b701-1ad75e2171c3`, `timber-cutlist` `ee5d703f-5c64-4179-9147-d8b776ad2866`) az `admin1@testadmin.com` tulajdonú, `standalone` scope-ú rekord, amelyet az RLS `calculations_select_authorized` policy a `demo.owner` munkamenetnek jogosan nem mutat meg (lásd [M10_PHASE1_DRIFT_INDEPENDENT_QA.md §1](M10_PHASE1_DRIFT_INDEPENDENT_QA.md)). Az `admin1@testadmin.com` jelszava ebben a menetben nem volt elérhető (nincs seed-fájlban, nincs a felhasználótól kapott érték), ezért a bejelentkezést nem kíséreltem meg találgatással. Adatvesztésre nincs bizonyíték és nem is kerestem; a rekordok DB-szinten továbbra is léteznek.

## 8. Futtatott ellenőrzések

- Célzott Vitest: `construction-save-panel.test.tsx` — **13/13 PASS** (11 meglévő + 2 új).
- Korábbi 7 fájlos célzott regressziós kör (`construction-computation`, `construction-save-panel`, `construction-drafts`, `rafter-connection-fields`, `roof-geometry`, `gable-roof`, `construction-actions`) — **109/109 PASS**.
- Teljes Vitest — **192 fájl PASS / 8 SKIP, 1219 teszt PASS / 19 SKIP**.
- ESLint — **PASS**.
- Izolált `npm run typecheck` (`git worktree`, symlinkelt `node_modules`) — **PASS**.
- Izolált `npm run build` (ugyanaz a worktree) — **PASS**, 32/32 oldal generálva.
- `git diff --check` — **PASS**.
- Böngészős E2E: **NEM VERIFIKÁLT** (§7).

## 9. Fennmaradó kockázatok

- A két korábbi DEMO revízió böngészős újranyitása nem volt verifikálható ebben a menetben (admin1 hitelesítés hiánya); a false-positive szűrés csak unit/komponens-szinten bizonyított, nem élő böngészőben ugyanazon a két konkrét adaton.
- A tolerancia (`1e-9`) jelenleg minden `number`–`number` páron egységesen érvényes (mm, fok, m², m³, darabszám); ez biztonságos, mert minden ilyen mezőn a legkisebb érdemi eltérés `≥1e-2` nagyságrendű, de a szabály nem mezőtípus-specifikus — ha a jövőben egy mező érdemi felbontása `1e-9` alá csökkenne, a tolerancia felülvizsgálatra szorul.

## 10. Minimális ellenőrzési pontok a következő független QA-hoz

1. Hitelesített `admin1@testadmin.com` session alatt nyisd meg a két korábbi revíziót, teljes oldalfrissítéssel — nincs hamis drift figyelmeztetés.
2. Egy élő, valódi output-eltérést (pl. mentett revízió régebbi `implementationVersion`-je más eredményt adna) próbálj reprodukálni, és igazold, hogy a figyelmeztetés megjelenik.
3. `outputsEquivalent` és `outputDriftDiffPaths` teszteket futtasd újra a 7 fájlos célzott körrel együtt.

**Javasolt Conventional Commit:** `fix(M10.1.7): tolerate machine-precision output-drift noise and drop the dev-only drift logger`
