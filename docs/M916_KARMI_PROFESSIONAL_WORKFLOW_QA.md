# M9.16 — Karmi-kiszabás szakmai és használhatósági véglegesítése

## Státusz: PASS WITH LIMITATIONS
Kész és bizonyított: az „Ereszkiülés” mező téves, lejtésirányú megfogalmazása javítva mindhárom kalkulátorban (közös definíció); a felhasználó jóváhagyása után a helyi teszt-bejelentkezés beállítva (`npm run db:local-auth`), és mindhárom kalkulátor kitöltött, hitelesített böngészős workflow-ja — Karmi-only, anyag-only, kombinált, hip-fallback, mentés–újranyitás E2E — élőben ellenőrizve (lásd 2. szakasz). A derékszelemen disclosure élő viselkedése is megerősítve: manuális bezárás nem íródik felül egy nem kapcsolódó mező változásakor. **NOT VERIFIED marad**: fizikai telefonteszt, a teljes nézetméret×téma mátrix (csak 375 px és asztali nézet lett ellenőrizve ebben a menetben), régi (M9.15 előtti) snapshotok kompatibilitása.

## 1. Szakmai terminológia és mérési referenciák

### Mi változott?
- `src/features/calculators/roof-calculator-definitions.ts:37` — az `eaveOverhangMm` mező címkéje **„Ereszkiülés a lejtés irányában”** volt, ami szakmailag téves: a domainkód ezt az értéket mindenhol **vízszintes** vetületi távolságként kezeli, nem a lejtőn mért hosszként. Az új címke: **„Vízszintes ereszkiülés”**, kiegészítve egy rövid segédlettel: „Vízszintesen a falsíktól az eresz külső kontúrjáig mérve, nem a lejtős felületen.” Ez pontosan megegyezik a `roof.rafter-cut` kalkulátor már helyes `eaveProjectionMm` mezőjének szóhasználatával („Vízszintes ereszkiülés”) és a felhasználó saját tesztforgatókönyvében használt kifejezéssel.
- Csak prezentációs szöveg (label + help) változott; `eaveOverhangMm` kulcs, séma, snapshot és számítás (`gable-roof.ts`, `roofs.ts`, `roof-geometry.ts`) érintetlen.

### Mi bizonyítottan megfelelő?
- **Domain-ellenőrzés** (kód, nem feltételezés): `gable-roof.ts:85` `horizontalSlopeRunMm = halfSpanMm + input.eaveOverhangMm` (közvetlen vízszintes összeadás), `:92` `horizontalRoofWidthMm = buildingWidthMm + eaveOverhangMm * 2`, `:94` `eaveLevelMm = -eaveOverhangMm * tan(pitch)` (vízszintes érték tangensszel vetítve függőlegesbe — ha az bemenet lejtés menti hossz volna, koszinusszal kellene szorozni/osztani, nem tangenssel). `roofs.ts:33`: `eaveLengthMm = eaveProjectionMm / cos(pitch)` — a vízszintes bemenetből vezeti le a lejtős hosszt, nem fordítva.
- A HAP mező (`seatCutHeightMm`) címkéje és segédlete (`HAP_INPUT_LABEL`, `HAP_HELP`, `rafter-joints.ts:30-31`) szakmailag pontos: „Szarufa felső élének magassága a talpszelemen felett (HAP)”, függőleges mérés, pontos origó (talpszelemen felső síkja, külső síkban) és explicit elhatárolás a bevágás mélységétől/ülékhossztól. Nem módosítottam.
- A derékszelemen két mezője (`purlinFaceMm`, `purlinTopMm`) és segédlete (`PURLIN_FACE_HELP`, `PURLIN_TOP_HELP`, M9.10-ben hozzáadva) ugyanazt az origót és mértékegységet írja le, mint a HAP; a felirat és a mérési vázlat (`purlin-figure.tsx`) konzisztens. Nem módosítottam.
- Talpszelemen szélessége (`plateWidthMm`, „Talpszelemen szélessége · ellenőrzéshez”) és a gerinckapcsolat mezői (`ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`) már egyértelmű, egységes elnevezésűek; nincs ismételt vagy ütköző szöveg.
- **Egységesség a három kalkulátorban:** `roof.material-takeoff` és `roof.timber-cutlist` szó szerint ugyanazt a `[...roofShapeFields, ...birdsmouthFields]` tömböt importálja (`roof-calculator-definitions.ts:109,115`) — a két kalkulátor címkéi garantáltan azonosak. `roof.rafter-cut` saját, de tartalmilag megegyező mezőlistát használ; a HAP/derékszelemen szövegek mindhárom helyen ugyanabból a megosztott konstansból (`rafter-joints.ts`) jönnek, duplikáció nélkül.

### Mi maradt hibás vagy nem ellenőrzött?
- Valódi, külső ácsszakmai forrásellenőrzés (pl. szakkönyv vagy mesteroktatási jegyzet) nem történt ebben a menetben; a döntés a kódban bizonyított számítási szemantikára épül, ahogy az AGENTS.md előírja („a terveket ne tekintsd bizonyítéknak a kódra, de fordítva: a kódot vedd bizonyítéknak a szövegre”).

### Teszt/bizonyíték
- Célzott: `npx vitest run src/features/calculators` → **16 fájl / 90 teszt PASS** (a címkeváltozás nem érint számítást, ezért a meglévő tesztek változatlanul zöldek).
- Teljes regresszió: lásd 4. szakasz.

## 2. Kalkulátor-workflow és integrációs QA

### Mi változott?
Nincs kódváltozás ebben a szakaszban.

### Mi bizonyítottan megfelelő?
- A kért tesztforgatókönyvhöz (10×8 m, 35°, vízszintes ereszkiülés 40 cm, szarufa 8×20 cm, kiosztás 60 cm, HAP 10 cm) legközelebbi, **ténylegesen futtatott és korábban dokumentált** domain-bizonyíték az M9.15.3 riport szerinti 24 kombinációs mátrix (`construction-computation.test.ts`, `rafter-connection-fields.test.ts`): hajlás 20/35/45°, ereszkiülés 0/400 mm, szelvény 160/200 mm, HAP 60/100 mm, futás 4000 mm — független kézi számítással ellenőrizve (függővágás = d/cos α − HAP, ülék = függővágás/tan α).
- **Élő böngészős bizonyíték ebben a menetben** (felhasználói jóváhagyás után `npm run db:local-auth`-tal beállított helyi `demo.owner@local.test` teszt-bejelentkezéssel, `DEMO TetőPro Kft.` szervezetben, a pontos tesztforgatókönyvvel: fél fesztáv 400 cm, gerincemelkedés 280 cm ≈ 35°, vízszintes ereszkiülés 40 cm, HAP 10 cm, szarufa 8×20 cm, szarufaosztás 60 cm, léc sortáv 30 cm):
  - **Szarufa kiszabása:** Karmi-only teljes eredmény; a talpszelemen-bevágás (függővágás 14,1 cm / ülék 20,9 cm / bevágás 11,7 cm) pontosan egyezik a fő rajz és a „Csomópontok” táblázat között. A 15 cm-es talpszelemenre rá nem férő 20,9 cm-es ülék helyesen figyelmeztet: „Az ülék (20,9 cm) nem fér rá a 15 cm széles talpszelemenre: 5,9 cm-rel túlnyúlik.” Derékszelemen kitöltésével (vízszintes 200 cm, felső sík 140 cm) a közbenső felfekvés is „Számított” lett, saját résztrajzzal (függő 19,1 / ülék 28,3 / bevágás 15,9 cm), a fő rajzzal egyező pozícióval (241,3 cm). Gerinckapcsolat-váltás („Gerincdeszkára fut”) helyesen „További adat szükséges”-re vált hiányzó gerincdeszka-vastagság miatt, majd vissza „Szembefutó szarufák”-ra ismét teljes.
  - **Tetőanyag-kimutatás:** a 10×8 m / 35° nyeregtető vízszintes vetületi területe **88,00 m²** — pontosan egyezik a kézi ellenőrzéssel (10 m × (8 m + 2×0,4 m) = 88 m²), megerősítve, hogy az `eaveOverhangMm` valóban vízszintes (a javított címke helyes). Karmi és anyag egymástól függetlenül kapcsolható, külön állapotsorral; mindkettő be: „Karmi és csatlakozások: A megadott geometria alapján a bevágási előnézet elkészült.” / „Anyagszükséglet: Az anyagkimutatás elkészült.”, teljes eredmény, bal/jobb tetősík külön Karmi-résszel (mindkettő 14,4/20,6/11,8/8,2 cm, 35° hajlás, osztás 58,8 cm — konzisztens a 60 cm-es kért osztással, a ténylegesen felosztott tengelytávval). **Kontytető-váltással**: az eresz felőli síkok Karmi-ja változatlanul számított, a két kontyél-sík helyesen „Felső vég nem támogatott: A tetősík szarufái a gerinc végpontjába futnak (kontyos vég): ez a gerinccsatlakozás nincs modellezve.”, és a „Nem alkalmazható vagy nem támogatott csatlakozás · 2 tétel” korlátlista megjelenik — pontosan a dokumentált, szándékos korlátozás.
  - **Tetőszerkezet faanyag és vágáslista:** Karmi kikapcsolva, csak anyag/vágáslista: teljes eredmény (36 db szarufa × 5371 mm, 37 db léc × 10 000 mm), és a Karmi-rajz helyén egyértelmű felhívás: „A Karmi és a szelemencsatlakozások rajzához a tetőformán felül két adat kell… Szarufacsatlakozások bekapcsolása” gombbal — a „mindkét funkció kikapcsolva”-típusú állapot helyesen kezelt.
  - **Mentés–újranyitás E2E** (Szarufa kiszabása, teljes kitöltött állapot, Szembefutó gerinccsatlakozással): mentés után „Mentve · V1”; a böngészőt **friss navigálással** (nem csak kattintással) a mentett `calculation` azonosítóval újranyitva minden bemenet, a teljes rajz, mindhárom csomópont (talpszelemen, derékszelemen, gerinc) számértéke és a talpszelemen-túlnyúlás figyelmeztetés is **pontosan** visszaállt; a verziókezelő „Új revízió mentése · V2” opciót kínál.
  - **Derékszelemen disclosure élő viselkedés:** a panelt kézzel becsuktam, majd egy **nem kapcsolódó** mezőt (gerinckapcsolat típusa) módosítottam — a panel **nem** nyílt vissza magától; ez megerősíti a statikus kódelemzést (`GlassDisclosure`/`<details open>` csak tényleges üres↔kitöltött átmenetkor vált, nem minden rendernél), tehát a korábban dokumentált korlát („csak kezdeti betöltéskor nyílik ki”) a jelen kódbázisban **nem reprodukálható hibaként**: friss oldalbetöltéskor (mentett adat visszatöltésekor) a panel helyesen automatikusan nyitva jelenik meg, kézi bezárás után pedig nem íródik felül nem kapcsolódó változásra. Nem módosítottam kódot, mert nem volt mit javítani.
  - **375 px mobil nézet** (Tetőszerkezet faanyag és vágáslista, kitöltött geometria): `document.documentElement.scrollWidth` nem haladja meg a `clientWidth`-et (nincs vízszintes túlcsordulás); a „Vízszintes ereszkiülés” címke és az új segédszöveg jól tördelődik, a Karmi-kapcsoló és a mezők kényelmesen érinthetők (képernyőkép-bizonyítékkal).

### Mi maradt hibás vagy nem ellenőrzött?
- A fenti böngészős ellenőrzés desktop nézetben (1024×768) és 375 px mobil nézetben történt; a kötelező teljes mátrix (812×375 mobil fekvő, 768×1024 tablet, 1440×900 desktop) és a sötét/világos téma összevetés ebben a menetben **NOT VERIFIED** maradt (időkeret miatt, nem technikai akadály miatt).
- Fizikai telefonteszt **NOT VERIFIED** (nem állt rendelkezésre eszköz).
- Régi (M9.15 előtti) mentett snapshotok visszanyitási kompatibilitása **NOT VERIFIED** — a mentett teszt-kalkuláció ebben a menetben jött létre, nem egy korábbi mérföldkőből származó valódi régi snapshot.
- A termékkatalógusos szarufaválasztás (nem kézi keresztmetszet) ezúttal sem volt tesztelhető: a `DEMO TetőPro Kft.` szervezetben nem található előre feltöltött szarufatermék; ez korábbi mérföldkövek (M9.13, M9.15.3) óta ismert, változatlan korlát.

## 3. Mobil/desktop UI/UX ellenőrzés

### Mi változott?
Nincs kódváltozás ebben a szakaszban (a derékszelemen disclosure vizsgálata eredménye alább).

### Mi bizonyítottan megfelelő?
- **Derékszelemen disclosure** — gyökérok-elemzés ÉS élő böngészős megerősítés (lásd 2. szakasz): a `GlassDisclosure` `defaultOpen={group.keys.some(key => values[key]?.trim() !== "")}` (`construction-suite.tsx:327`) ⇒ `<details open={defaultOpen || undefined}>` (`glass-disclosure.tsx`) mintája React diffelési szabálya miatt csak **tényleges** üres↔kitöltött átmenetkor írja át a DOM állapotát. Élőben teszteltem: friss oldalbetöltéskor (mentett, kitöltött derékszelemen-adattal) a panel automatikusan nyitva jelenik meg; kézi bezárás után egy nem kapcsolódó mező (gerinckapcsolat típusa) módosítása **nem** nyitotta vissza. A korábban dokumentált korlát nem reprodukálható hibaként; kódváltoztatás nem szükséges.
- **375 px mobil nézet** (Tetőszerkezet faanyag és vágáslista, kitöltött geometriával): nincs vízszintes túlcsordulás (`scrollWidth` ≤ `clientWidth`, programozottan ellenőrizve), a „Vízszintes ereszkiülés” címke és az új segédszöveg jól tördelődik, a Karmi-kapcsoló és a mezők kényelmes méretűek (képernyőkép-bizonyíték).
- Desktop nézetben (1024×768) a Szarufa kiszabása fő rajza és a csomóponti résztrajz (talpszelemen + derékszelemen + gerinc egyszerre) felirat-ütközés nélkül, olvashatóan jelenik meg három aktív csomóponttal is (ez a 2. szakasz képernyőkép-bizonyítékával azonos munkamenetből).

### Mi maradt hibás vagy nem ellenőrzött?
- A kötelező teljes nézetméret-mátrix (812×375 mobil fekvő, 768×1024 tablet, 1440×900 desktop külön ellenőrzéssel) és a sötét/világos téma vizuális összevetése ebben a menetben **NOT VERIFIED** maradt — időkeret miatt, nem technikai akadály miatt (a bejelentkezés és a böngésző elérhető volt).
- A rajz zoom/pan/reset és a dupla koppintásos részletváltás **nem lett külön, dedikált gesztussorozattal** tesztelve (csak kattintással váltottam csomópont-részletet); ez NOT VERIFIED.
- Fizikai telefonteszt **NOT VERIFIED** (nem állt rendelkezésre eszköz).
- Mivel az élő ellenőrzés nem talált tényleges hibát a derékszelemen disclosure-ban, és a mobil nézetben sem találtam túlcsordulást vagy olvashatósági problémát, ebben a szakaszban **nem** volt szükség kódváltoztatásra.

## 4. Összevont regresszió
- `npx vitest run` → **192 fájl PASS / 8 SKIP; 1184 teszt PASS / 19 SKIP** (azonos számok, mint az M9.15.3 bázis — a jelen változtatás presentation-only).
- `npm run lint` → **PASS** (ESLint: No issues found).
- Izolált `git worktree` másolatban (`/tmp/claude-501/tetopro-m916-verify`, a futó dev szerver `.next`-je érintetlen maradt): `npm run typecheck` → **PASS**, `npm run build` (`next build --webpack`) → **PASS**.
- `git diff --check` → **PASS** (nincs whitespace-hiba).
- A worktree-t a menet végén eltávolítottam (`git worktree remove`).

## Használt skillek
Nem volt szükség `ui-ux-pro-max`/`web-design-guidelines`/`react-best-practices` meghívására: az élő böngészős ellenőrzés konkrét, célzott kódolvasással és közvetlen DOM/JS-ellenőrzéssel (túlcsordulás, disclosure-állapot) elvégezhető volt; általános UX-audit nem volt indokolt egy ilyen szűk, presentation-only hatókörben.

## Helyi tesztkörnyezet
A felhasználó jóváhagyása után `LOCAL_AUTH_EMAIL=demo.owner@local.test LOCAL_AUTH_PASSWORD=<helyi teszt jelszó> npm run db:local-auth` futott, kizárólag a helyi Supabase-példányon (`127.0.0.1`), a `supabase/seed.sql`-ben már szereplő DEMO-felhasználóhoz és DEMO szervezethez (`00000000-0000-4000-8000-000000000010`) rendelve jelszót. Nem történt séma-, migrációs vagy adattartalom-módosítás; a menet végén egy saját teszt-kalkuláció (`M916 QA teszt szarufa`, V1) maradt a DEMO szervezet alatt — ez a felhasználó saját helyi fejlesztői adatbázisában törölhető, ha nem kívánt.

## Módosított fájlok
- `src/features/calculators/roof-calculator-definitions.ts` — az `eaveOverhangMm` mező címkéje és segédlete (presentation-only).
- `docs/M916_KARMI_PROFESSIONAL_WORKFLOW_QA.md` — ez a riport (új).
- `docs/PROGRESS.md` — rövid M9.16 bejegyzés.

## Javasolt Conventional Commit
`fix(M9.16): correct the horizontal eave-overhang label and finalize Karmi terminology QA`
