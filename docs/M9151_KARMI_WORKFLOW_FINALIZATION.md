# M9.15.1 — KARMI-részletrajz a szarufakiosztás nélkül

## Státusz: PARTIAL
Kész: a KARMI-rajz függetlenítése a „Szarufa és léc”-től, szakaszállapotok, a derékszelemen nyitható csoportja, viewport/téma mérések. Nem készült: új desktop két oszlopos elrendezés (a munkaterület 1440 px-en is csak 741 px széles, a bal oldalt a kalkulátorlista foglalja, ezért az egyoszlopos marad), „van derékszelemen?” választó, valódi telefonteszt, mentés–újranyitás E2E.

## 1. A függőség oka
`planeBirdsmouthsFor` (`plane-birdsmouth.ts`) a `RoofTimberLayout.rafters` szarufavonalaiból veszi a tetősíkonkénti futást és ereszkiülést, ezért `computeConstruction` csak kért faanyag + megadott tengelytáv esetén ad `birdsmouths`-ot. A „Szarufa vágásai” nézet ettől függött.

## 2. Megoldás
`previewPlaneBirdsmouths` (`construction-computation.ts`): csak megjelenítési előnézet, ugyanazt a `calculatePlaneBirdsmouths`-ot hívja. A rétegkiosztás tengelytávot kér, ezért két eltérő próbatávval (100 000 és 1 000 mm) számol; csak akkor ad eredményt, ha a csatlakozási geometria nem függ tőle (pl. nyeregtető). Egyébként `null`, és a nézet nem jelenik meg. A sorszám és osztás ismeretlen (0), a rajz ezt a sort ilyenkor elrejti.
A `construction-suite.tsx` a „Szarufa vágásai” nézetet az előnézetből adja, ha nincs kiosztás-alapú `birdsmouths`.

## 3. Megőrzött szerződések
`computeConstruction`, teljességi státusz, snapshotok, mentés és szerveroldali újraszámítás változatlan; az előnézet nem része ezeknek (teszt: azonos `rows`/`completeness` joint be- és kikapcsolva). Nincs séma/RPC/RLS változás.

## 4. Tesztek
`construction-computation.test.ts`: 4 új teszt (előnézet = rétegút eredménye, nincs hatás a teljességre, hiányzó keresztmetszet → „incomplete”, faanyag-vágáslista). Teljes Vitest: 192 fájl / 1177 teszt PASS, 8 fájl / 19 skip; ESLint, tsc, `git diff --check` tiszta.

## 5. Böngésző (beépített pane, 800×600 felület, sötét téma)
Ideiglenes, törölt útvonalon (a `/kalkulatorok` bejelentkezést kér, azt nem tettem meg) a Tetőanyag-kimutatásban: nyeregtető 10×8 m, 35°, 40 cm ereszkiülés, 8×20 cm szarufa, HAP 10 cm, „Szarufa és léc” **kikapcsolva** → megjelent a „Szarufa vágásai” áttekintő rajz; a státusz továbbra is „Hiányos kalkuláció”.
Nem ellenőrzött: Faanyag-vágáslista böngészőben (csak unit teszt), derékszelemen, gerinckapcsolat-típusok, 375×812 / 812×375 / 768×1024 / 1440×900, világos téma, hibás adatbevitel, mentés–újranyitás, izolált production build.

## 5b. Szakaszállapotok és derékszelemen (2. kör)
`jointGroupState` (`rafter-connection-fields.ts`, tesztelve) minden csatlakozási csoport fejléce alatt mutatja: Nincs még elég adat · Számítható · Hibás vagy ellentmondásos geometria · Dokumentált korláttal számítható · Nem támogatott (opcionális, üres derékszelemen: „Nincs megadva · opcionális”). Az állapot a már számított csatlakozásokból származik, csak megjelenítés. A derékszelemen csoport zárt `GlassDisclosure`, nyitva, ha valamely mezője ki van töltve; nem vezettem be jelenlétválasztót, így nincs adatmodell-változás és a régi mentett értékek jelentése sem változik.
Böngésző (mock, 375×812, 812×375, 768×1024, 1440×900; sötét és világos 375-ön): nincs vízszintes túlcsordulás, a rajz 321–719 px széles, a mezők/gombok ≥ 36 px magasak; HAP + keresztmetszet megadása után a KARMI-állapot „Nincs még elég adat” → „Számítható”. Az ellenőrzés JS-méréssel történt, nem szemrevételezéssel; szimulált viewport, nem valódi touch. Izolált `npm run build` PASS; teljes Vitest 1178 PASS.

## 6. Korlátok
- Nem nyeregtetős formáknál (pl. kontyolt) az előnézet tengelytávfüggés miatt elmaradhat; ilyenkor a „Szarufa és léc” szükséges.
- Az érvénytelen részrajz nem tesz mentésessé semmit (nem része a számításnak).
- Nem készült: vezérelt szakaszok, derékszelemen-jelenlétválasztó, szakaszállapotok, rajz–input elrendezés.
