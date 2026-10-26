# KARMI terminológia és tető workflow QA

## Státusz

**PASS WITH LIMITATIONS — 2026-10-26**

Ez a riport az M9.13 célzott hatókörét és bizonyítékait rögzíti. A felület terminológiai egységesítése elkészült; a kitöltött helyi böngészős workflow-k és a célzott regressziók lefutottak. A teljes ellenőrzési parancsok végső státuszát a riport végén vezetem át a tényleges futási kimenetre.

## Hatókör és változatlan szerződés

Megvalósult:

- az aktív magyar felület „madárszáj” szövegeinek **KARMI**-ra cseréje;
- HAP-segédszövegek, hiányzóadat-üzenetek, eredménysorok, csomópont-részletrajzok és a két tetős anyagkalkulátor címkéinek egységesítése;
- célzott terminológiai regresszió, amely az aktív tető-kalkulátor szövegét KARMI-jelenlétre és a régi felületi kifejezés hiányára ellenőrzi;
- kitöltött rafter-cut, material-takeoff és timber-cutlist workflow ellenőrzése mentés nélkül.

Szándékosan nem változott:

- `birdsmouth*` domain típusok, függvények, property-k, input/output kulcsok és belső azonosítók;
- snapshotok, mentett sorok kompatibilitása, RPC-k, migrációk és adatbázis-szerződések;
- képletek, geometriai kimenetek, roof-shape modellek és anyagkiosztási algoritmusok;
- történeti mérföldkő-bejegyzések és azok korabeli bizonyítékai.

## Érintett források

- `src/domain/calculations/construction/catalog.ts`
- `src/domain/calculations/construction/rafter-joints.ts`
- `src/domain/calculations/construction/plane-birdsmouth.ts`
- `src/domain/calculations/construction/roofs.ts`
- `src/features/calculators/material-spec-editor.tsx`
- `src/features/calculators/rafter-result-flow.tsx`
- `src/features/calculators/rafter-layout-drawing.tsx`
- `src/features/calculators/roof-calculator-definitions.ts`
- a hozzájuk tartozó érintett Vitest-fájlok és az új `terminology.test.ts` regresszió.

## Böngészős környezet és módszer

- Helyi Next fejlesztői szerver, Brave Browser natív ablak, `localhost:3000/kalkulatorok`.
- Hitelesített helyi DEMO szervezet: `admin1@testadmin.com`, `DEMO TetőPro Kft.`
- Minden bemenet helyi előnézetben maradt; mentés gombot nem nyomtam meg, DB-írás nem történt.
- A Browser plugin nem volt elérhető, ezért a valós Brave ablak accessibility állapotát és képernyőképét használtam. Natív Brave esetén a CUA console-log API nem volt hozzáférhető; látható Next error overlay vagy böngészős hiba nem jelent meg.

## Kitöltött workflow-k

### 1. Szarufa kiszabása — PASS

Nyereg-jellegű rafter-cut bemenetek:

| Bemenet | Érték |
|---|---:|
| fél fesztáv | 400 cm |
| gerincemelkedés | 280,08 cm |
| vízszintes ereszkiülés | 40 cm |
| HAP | 10 cm |
| szarufa keresztmetszet-magassága | 20 cm |
| derékszelemen ereszoldali síkja | 200 cm |
| derékszelemen felső síkja | 135 cm |
| talpszelemen-szélesség ellenőrzéshez | 15 cm |
| gerinckapcsolat | Szembefutó szarufák |

Bizonyított eredmény: teljes kalkulációs eredmény, 530,9 cm teljes szarufahossz, 34,027° tetőhajlás, KARMI-részletrajz és „Mit hol jelölj” lista. A Talpszelemen és Derékszelemen részletnézet váltható volt; a rajz vágáséleket, méreteket és a geometriai túlnyúlás figyelmeztetését mutatta.

### 2. Tetőanyag-kimutatás — PASS kézi DEMO fedési adatokkal

Nyeregtető bemenetek: 1000 cm tetőhossz, 800 cm tetőszélesség, 35°, 40 cm ereszkiülés. Bekapcsolva: Szarufa és léc, Alátétfólia, Fedőtábla, valamint a „Szarufacsatlakozások számítása (KARMI, szelemenek, gerinc)” blokk.

Kiosztási és csomóponti adatok: szarufa 60 cm, léc 30 cm, szarufa 8×20 cm, léc 5×5 cm, HAP 10 cm, talpszelemen 15 cm, derékszelemen 200/135 cm, szembefutó szarufák.

Kézi, kifejezetten DEMO-ként megjelölt fedési specifikáció:

- alátétfólia: 150 cm × 5000 cm tekercs, 10/10 cm átfedés, eresztől a gerinc felé;
- fedőtábla: 110 cm névleges, 100 cm hasznos szélesség, 350 cm fizikai, 300 cm használható hossz, adatforrás: `DEMO kézi adat`.

Bizonyított eredmény: teljes kalkulációs eredmény; 107,43 m² teljes geometriai tetősík, 36 szarufa, 37 léc, 8 fóliacsík / 80 m vágott hossz / 2 tekercs minimum, valamint 40 fedőtábla / 20 táblaoszlop / 154 m² névleges táblafelület. A kézi, nem gyártói ellenőrzött jelzés végig látható maradt.

Gyártói termékválasztással a workflow ebben a munkamenetben nem lett bizonyítva, mert nem volt kiválasztott termékadat; a korábbi hiányos állapotban a rendszer nem következtetett hiányzó tekercs- vagy hasznos fedési adatokra.

### 3. Tetőszerkezet faanyag és vágáslista — PASS

Nyeregtetőn a 1000/800 cm, 35°, 60/30 cm kiosztás és a 8×20 / 5×5 cm kézi keresztmetszetek után a KARMI-csomóponti blokk HAP 10 cm, talpszelemen 15 cm és derékszelemen 200/135 cm adatokkal teljes eredményt adott.

Bizonyított eredmény: 36 szarufa, 175,792 m geometriai összhossz, 35 léc, 350 m geometriai összhossz, továbbá KARMI-vágásrajz, Talpszelemen/Derékszelemen részlet és a felsővég-vágás korlátainak jelzése.

## Tetőforma-mátrix

| Forma | Böngészős ellenőrzés | Bizonyíték / korlát |
|---|---|---|
| Nyeregtető | PASS | teljes anyagkimutatás és vágáslista |
| Kontytető | PASS WITH LIMITATIONS | geometria és rajz megjelent; kontyél-/felsővég-vágás nem támogatottként jelzett |
| Sátortető | PASS WITH LIMITATIONS | négyzetes geometria és kontyél-korlát megjelent; kontyél-szarufa vágása nincs modellezve |
| Félnyeregtető, Félkontytető, L, T, Manzárd | SOURCE-LEVEL ONLY | a domain/tesztmátrix lefedettsége nem helyettesíti az e mérföldkőben lefuttatott böngészős workflow-t |

Ez a mátrix nem állít teljes framing- vagy statikai támogatást. A felület a nem támogatott csatlakozást külön jelzi, és nem rajzol igazolatlan bevágást.

## UI és paritás QA

- Desktop Brave képernyőn az aktív KARMI/HAP szövegek, a kézi DEMO mezők és a részletrajz láthatóan megjelentek; fedés vagy elcsúszás nem volt látható.
- Accessibility állapotban a számított eredmények, a kiválasztott részletnézetek és a `KARMI` feliratok visszaolvashatók voltak.
- A `Szarufa vágásai`, `Szarufaosztás`, `Térbeli részlet` és `Tetőforma` nézetválasztó jelen volt a két érintett tetős kalkulátorban.
- Mobil- és tablet-viewportok külön, mérőszámos ellenőrzése ebben a mérföldkőben **NOT VERIFIED**.
- Mentés, újranyitás, szerveroldali action és DB-ellenőrzés **NOT RUN**; a kérés terminológiai és lokális workflow-QA hatókörű volt.

## P0–P3 megállapítások

- **P0:** nincs talált blokkoló vagy adatvesztést okozó hiba.
- **P1:** nincs talált új terminológiai vagy számítási regresszió.
- **P2:** mobil/tablet újramérés és valódi gyártói termékadat-workflow nincs bizonyítva ebben a mérföldkőben.
- **P3:** történeti dokumentumokban a régi megnevezés marad; ez szándékos visszakövethetőségi döntés, nem aktív UI-szivárgás.

## Ismert korlátok és következő mérföldkő-jelöltek

- A KARMI itt geometriai kivágási és jelölési fogalom; statikai, gyártói vagy kivitelezési jóváhagyást nem jelent.
- A fedési darabszám kézi DEMO-specifikációból bizonyítható; gyártói katalógus- és árparitás külön anyagkezelői QA-t igényel.
- Kontyél-/vápaszarufa, komplex felsővágás, teljes framing terv, mobil/tablet viewport-mátrix és mentett szerveres újranyitás külön következő scope.

## Ellenőrzési napló

### Ténylegesen futtatott

- TDD célzott regresszió: implementáció előtt a négy érintett fájl 4/4 tesztfájlban RED volt (4 tesztbukás a régi felirat miatt), implementáció után GREEN: **4 fájl / 52 teszt PASS**;
- teljes Vitest: `npm test` → **190 fájl PASS, 8 SKIP; 1171 teszt PASS, 19 SKIP**;
- ESLint: `npm run lint` → **PASS**;
- izolált típusellenőrzés: `cd /private/tmp/tetopro-qa.Mzxxfn && npm run typecheck` → **PASS** (`next typegen` és `tsc --noEmit -p tsconfig.typecheck.json`);
- izolált production build ugyanebben a másolatban: `npm run build` → **PASS**, Next.js 16.4.2, webpack, 32 generált oldal;
- diff-formázás: `git diff --check` → **PASS**;
- célzott Vitest: `src/features/calculators/terminology.test.ts`, `rafter-layout-drawing.test.tsx`, `construction-computation.test.ts`, `plane-birdsmouth.test.ts`;
- helyi Brave böngészős workflow-k a fenti bemenetekkel;
- aktív forrás terminológiai keresés: a `src/` alatt a régi kifejezés csak a regressziós teszt negatív matcherében maradt; belső `birdsmouth*` neveket nem neveztem át.

### Nem futtatott / blokkolt

- Supabase DB-teszt és migráció: nem szükséges ehhez a terminológiai változáshoz, ezért nem futott;
- mentett kalkulációs workflow: nem futott, mert a kérés nem kért adatírást;
- mobil/tablet viewport QA: natív Brave ablakban nincs e mérföldkőben külön viewport-mérő futtatás.

## Átadás

Javasolt commit: `feat(M9.13): standardize KARMI terminology and verify roof workflows`

Commit, push, deploy és éles adatbázis-módosítás nem történt.
