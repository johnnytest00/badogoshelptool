# M9.15.2 — Karmi-előnézet megerősítése és workflow-QA

## Státusz: PARTIAL
A két mesterséges próbatáv megszűnt, helyette bizonyított geometriai előfeltétel van, de a rétegkiosztás-híváshoz egyetlen rögzített tengelytáv még kell (lásd 2.). Mentés–újranyitás: **NOT VERIFIED**.

## 1. A korábbi (100 000 / 1 000 mm) megoldás értékelése
Az egyezésből nem következett bizonyítottan a függetlenség: egy hosszabb belső szarufavonalat két minta kihagyhat. Ezért lecseréltem.

## 2. Végleges adatút
- Ok: `calculatePlaneBirdsmouths` a tetősík „leghosszabb ereszről induló szarufavonalának” két végpontjából veszi a futást, az ereszkiülést és az irányt; ezek a `RoofTimberLayout` szegmenseiből jönnek, a rétegkiosztás pedig tengelytávot kér.
- Tengelytávtól független: a kiülés, futás, hajlás és irány **akkor**, ha a tetősík minden szarufavonala egyforma hosszú.
- `rafterChordsAreSpacingIndependent` (`construction-computation.ts`) ezt a kanonikus tetősíkgeometriából bizonyítja: minden sík négyszög, a síkvetületben téglalap, oldalai az esésvonallal párhuzamosak/merőlegesek, és nincs két sík azonos kiosztási csoportban. Ekkor a hossz minden tengelytávon azonos.
- Bizonyított: nyeregtető, félnyeregtető (shed). **Nem** bizonyítható és ezért nincs előnézet: kontyolt, sátor, félkonty, L/T, manzárd — ezeknél a „Szarufa és léc” kiosztás kell.
- A híváshoz egy rögzített 100 000 mm-es (két szélső vonal) kiosztás készül; az eredmény a fenti miatt nem függ tőle. Teljes megszüntetése új, kiosztásmentes szakaszképző függvényt (`calculatePlaneBirdsmouths` első fele) igényelne a domainben; ezt nem hajtottam végre, döntés szükséges.
- Az előnézet nincs a `computeConstruction` kimenetében: teljességi státusz, snapshot, mentés, szerveroldali újraszámítás változatlan (teszt).

## 3. Módosítások
`construction-computation.ts` (előfeltétel + egyszerűsített előnézet), `construction-suite.tsx`, új `feature-toggle.tsx`, `material-spec-editor.tsx`, `rafter-connection-fields.ts`, `globals.css`, tesztek.
UI: „Szarufák és bevágások” alatt egy „Karmi és csatlakozások” kapcsolócsempe („Szarufabevágások, szelemen- és gerinckapcsolatok méretezése.”), ismétlődő hosszú cím nélkül; „Anyagszükséglet · mennyiségszámítás” alatt három csempe: Faanyag — szarufa és léc, Alátétfólia, Fedőanyag. Mindkét csoport külön kapcsolható; egyik sem kapcsolja be a másikat. Számítási mezők, kulcsok, snapshot nem változtak. Egy szakaszállapot-hiba javítva (kitöltött, de seat nélkül várakozó derékszelemen „Nincs még elég adat”).

## 4. Böngészős tesztek (beépített pane; ideiglenes, törölt útvonal a bejelentkezési kapu miatt)
Nyeregtető 10×8 m, 35°, 40 cm ereszkiülés, 8×20 cm szarufa, HAP 10 cm.
- Tetőanyag-kimutatás, négy kombináció: mindkettő ki → nincs csatlakozási rész, „Válassz legalább egy anyagcsoportot”; csak Karmi → „Szarufa vágásai” nézet, tengelytáv-mező nincs; csak faanyag → tengelytáv-mező, nincs Karmi; mindkettő → Karmi + Szarufaosztás.
- Függővágás 14,4 cm / 144,155 mm az eredményben és a rajzon; kézi számítás: 200/cos35° − 100 = 144,15 mm ✔. Azonos érték kiosztással és anélkül (90 cm tengelytáv).
- Szarufa kiszabása: 400/290,08/40/10/20 cm → „Teljes eredmény”, 14,4 cm ✔. Faanyag-vágáslista: Karmi tengelytáv nélkül előnézet („Hiányos”), tengelytávval teljes, 144,155 mm ✔.
- Derékszelemen nélkül „Nincs megadva · opcionális”; megadva „Számítható”; három gerinckapcsolat (szembefutó, deszka, szelemen) külön számítható, a megfelelő mezőkkel; derékszelemen felső síkja 140 cm → „Hibás…”, a Karmi és a gerinc marad „Számítható”; HAP törlése → „Nincs még elég adat”.
- Nézetméretek 375×812, 812×375, 768×1024, 1440×900; sötét és világos (375-ön): nincs vízszintes túlcsordulás, minden érintési cél ≥ 44 px (csempék 65–89 px), rajz 321–719 px, a kapcsoló fókuszkerete látszik. Mérés JS-sel + képernyőkép; szimulált viewport, nem valódi touch.

## 5. Tesztek
`construction-computation.test.ts`: előfeltétel (gable/shed igen; hip, pyramid, halfHip, L, T nem), konty → nincs előnézet, előnézet = rétegút 300/900/2500 mm-en, nincs hatás a teljességre/sorokra, hiányzó szelvény. `rafter-connection-fields.test.ts`: állapotok. Teljes Vitest 192 fájl / 1181 teszt PASS (8 fájl/19 skip), ESLint, tsc, `git diff --check` tiszta, izolált `npm run build` PASS.

## 6. Korlátok / NOT VERIFIED
Mentés–újranyitás E2E (nincs izolált tesztadatbázis); valódi telefonos touch; kontyolt/L/T/manzárd előnézet (szándékosan nincs); a derékszelemen-csoport csak betöltéskor nyílik ki magától, utólag (pl. mentett revízió betöltése) kézzel nyitható; kiosztásmentes domain-szakaszképzés döntésre vár.
