# Tervrajzfeldolgozás — munkafolyamat-felmérés és fejlesztési terv

Dátum: 2026-10-31 · Hatókör: felmérés és tervezés, alkalmazáskód-módosítás nélkül.
Érintett funkcióterületek: `DRAW-PDF`, `DRAW-OCR`, `DRAW-INTERPRET`, `DRAW-SECTIONS`, `DRAW-SESSION`, `CALC-CONSTRUCTION`, `ROOF-TAKEOFF`, `CALC-PERSIST`, `UI-SYSTEM`.

**Státuszjelölések:** BIZONYÍTOTT (kód olvasva + létező teszt) · KÓDBAN JELEN, NEM FUTTATVA · RÉSZLEGES · BLOCKED · HIÁNYZIK · CSAK TERV. A `JAVASLAT` jelölés tervezői ajánlás, nem megállapított tény.
**Módszer:** `docs/LIBRARY.md` → `docs/maps/SOURCE_INDEX.md` szerinti célzott kódolvasás, plusz a `docs/PROGRESS.md` P0–P1.6.1 szakaszai. Ebben a körben nem futtattam tesztet és nem végeztem böngészős ellenőrzést; a „BIZONYÍTOTT” státusz itt azt jelenti, hogy a kódot elolvastam és névazonos, az adott szabályt lefedő teszt létezik — a futtatott bizonyíték a `PROGRESS.md` hivatkozott köreiből származik, nem ebből a körből.

---

## A. Jelenlegi állapot

### A.1 A tényleges felhasználói útvonal

| # | Lépés | Hol | Bizonyíték |
|---|---|---|---|
| 1 | Belépés a kalkulátorlistára | `/kalkulatorok` | `src/app/kalkulatorok/page.tsx` |
| 2 | Kategória + kalkulátor kiválasztása (asztalon oldalsáv, mobilon „Kalkulátor váltása” lenyitó) | `ConstructionCalculatorSuite` | `construction-suite.tsx:591-607` |
| 3 | A „Kitöltés tervrajzból” **alapból csukott** `<details>` megnyitása | `PlanFieldTransfer` | `plan-field-transfer.tsx:535-536` |
| 4 | PDF/kép kiválasztása, vagy „Korábbi munka folytatása” (JSON) | ugyanott | `plan-field-transfer.tsx:545-548` |
| 5 | „Mit mutat ez a lap?” — oldalankénti rajztípus megadása | `plan-step` | `plan-field-transfer.tsx:571-579` |
| 6 | Csak `roof.material-takeoff`-nál: szakasznév + rajzi kijelölés + fedettség + fedettség-igazolás | `plan-step` | `plan-field-transfer.tsx:581-598` |
| 7 | Opcionális lépték: két független referencia megjelölése, hossz megadása, elfogadás | „Lépték · kísérleti” panel + vászon feletti sáv | `plan-field-transfer.tsx:617-634`, `759-780` |
| 8 | Gyors kitöltés: cél mező kiválasztása, majd koppintás a rajzi feliratra | `plan-quick-bar` | `plan-field-transfer.tsx:687-712` |
| 9 | Vagy részletes átvitel: felirat kijelölése → mező, egység, érték, jóváhagyások → „Javaslat hozzáadása” → „Átvezetés áttekintése” → jóváhagyás | `plan-field-transfer-editor` | `plan-field-transfer.tsx:733-758` |
| 10 | Hiányzó adatok és alapértékek pótlása a kalkulátor saját mezőin (a rajzpanelből kigörgetve) | `plan-todo` → `construction-geometry-inputs` | `plan-field-transfer.tsx:714-732` |
| 11 | Eredmény, majd mentés szakaszonként külön kalkulációként | `ConstructionSavePanel` | `construction-suite.tsx:507-508, 562` |
| 12 | Opcionális munkaállapot-export JSON-ba | „További műveletek” | `plan-field-transfer.tsx:789-794` |

### A.2 Ami ebben szükséges, és ami felesleges munkát okoz

**Szükséges és szakmailag indokolt** (ezeket a terv nem bontja meg): oldalankénti rajztípus-kérdés, fedett tetőrész igazolása, feliratonkénti egységválasztás, egységkonfliktus blokkolása, alapérték-megerősítés, szakasz-izoláció, forráshash-kötés.

**Felesleges vagy aránytalan munka — BIZONYÍTOTT megállapítások:**

1. **A rajz nem belépési pont, hanem egy kalkulátor tartozéka.** A felhasználónak előbb ki kell találnia, melyik kalkulátor kell neki, és csak utána nyithat rajzot (`construction-suite.tsx:346`: a panel `definition.reference.category === "roof"` esetén jelenik meg, a kiválasztott kalkulátor mezőihez kötve). Rajzból induló munkánál ez fordított sorrend: a rajz van meg, a kalkulátor nincs kiválasztva.
2. **Alapból csukott, egyetlen óriás `<details>`.** Betöltött rajz vagy importált munka után is zárt állapotból indul minden belépés (`plan-field-transfer.tsx:535`, nincs `open` attribútum) — ez egy állandó, elkerülhető plusz koppintás és a munka láthatatlansága.
3. **Két külön UI ugyanarra a műveletre.** A kitöltendő mezőt egy `<select>`-ben (`:689`) *és* chipekként (`:704`) is ki lehet választani; a két vezérlő ugyanazt a `targetFieldKey`-t írja. Duplikált UI-elem.
4. **A szakaszlépés sorrendje fordított a valós munkához képest.** Először szakasznevet kér, utána engedi a rajzi kijelölést (`:583-585`). A szakember a rajzon lát egy épületrészt, és utána nevezi el.
5. **Natív `window.confirm` négy destruktív ponton** (`:370`, `:375`, `:390`, `:440`): forráscsere, oldalszám-eltérés, új rajz, munkamenet-import. Nem a design system része, mobilon idegen, és nem mutatja meg, pontosan mi veszik el.
6. **Elavult, hamis útmutató szöveg.** A mentési panel blokkoló üzenete a „Kitöltés tervrajzból **3/4 Geometria** lépésére” hivatkozik (`construction-suite.tsx:562`), de a rajzpanelben nincs lépésszámozás — a lépéscímek: „Mit mutat ez a lap?”, „Jelöld ki a fedett tetőrészt”, „Átvezetés áttekintése” (`plan-field-transfer.tsx:572, 582, 754`). A felhasználó nem létező lépést keres.
7. **Nincs összefogott haladásjelző.** A lépések állapota három-négy különálló összefoglalóban és egy „Teendők és figyelmeztetések” blokkban szóródik szét (`:565-570`, `:599-604`, `:714-732`); nincs egy helyen látható „hol vagyok, mi a következő”.
8. **A hiányzó adatok pótlása kiviszi a rajzpanelből.** A `plan-todo` csak görgető gombokat ad a kalkulátor saját mezőihez (`:727-730`), tehát a hiányzó adatbekérés nem a rajz melletti, vezetett lépés, hanem helyváltás egy hosszú űrlapra.
9. **Munkamenet-visszaállítás kézi munkát igényel.** Importálás után a rajzot újra ki kell választani, a fedettséget és a rajzi jóváhagyásokat újra meg kell adni (`:541`, `:439-449`). A `DRAW-SESSION` szerint nincs DB-perzisztencia; ez tudatos szerződés, de a felhasználó szemszögéből ismételt munka.

### A.3 Képesség-táblázat

| Képesség | Státusz | Bizonyíték / korlát |
|---|---|---|
| PDF szöveg- és koordinátakinyerés | BIZONYÍTOTT | `pdf-text-extractor.ts` + `pdf-text-extractor.test.ts`, `pdf-text-normalizer.test.ts` |
| Oldal-előnézet, zoom, 90°-os forgatás | BIZONYÍTOTT | `pdf-preview.ts` + teszt; `plan-field-transfer.tsx:606-613` |
| Helyi OCR (Tesseract) | **BLOCKED** | `ocr.ts`; M12.2 pontossági kapu, `LIBRARY.md#draw-ocr`. OCR-felirat a részletes átvitelre van kényszerítve |
| **Automatikus mezőjavaslat rajzból** | **RÉSZLEGES, gyakorlatilag HIÁNYZIK valós terven** | `suggestRafterCutField` (`drawing-field-transfer.ts:118-134`) csak `roof.rafter-cut`-ra, csak `pdf-text` + `engine === "pdfjs-dist@6.4.299"` forrásra, és csak `^Fél fesztáv: 3200 mm$` alakú, pontos címkés feliratra illeszkedik. Építészeti terven ilyen felirat nem jellemző → a hasznos adat gyakorlatilag 100%-ban kézi koppintással kerül be |
| Koppintásos gyorsátvitel, automatikus továbblépés a következő hiányzó mezőre | BIZONYÍTOTT | `drawing-quick-transfer.ts` + teszt, `plan-field-transfer.tsx:231-262` |
| Átfedő feliratok kérdése 44 px érintési zónával | BIZONYÍTOTT | `numericSourcesAt`, `plan-field-transfer.tsx:264-279` |
| Feliratonkénti mértékegység-kezelés | BIZONYÍTOTT | `drawing-mixed-unit-plan.test.ts`, `chooseLabelUnit` (`:318-320`) |
| Oldalankénti rajztípus-kérdés, szigorú alapértelmezés | BIZONYÍTOTT | `requiresRoofGeometryConfirmation` (`drawing-field-transfer.ts:113-115`) + teszt |
| Rajztípus automatikus felismerése | RÉSZLEGES | `classifyDrawingPlan` kizárólag „FÖLDSZINTI” + „ALAPRAJZ” együttállást javasol (`:97-105`); minden más lapon nincs javaslat — szándékos, de az élmény szempontjából üres |
| Kétreferenciás kalibráció, SHA-256 + oldalszám kötés | BIZONYÍTOTT | `drawing-calibration.ts` + 15 teszt; UI-ban „kísérleti”-ként jelölve (`:759`) |
| Kalibrált mérés, felirat–mérés explicit összekapcsolás | BIZONYÍTOTT | `activeLinkFor` (`:168-172`), `unitEvidence`, `measurementConflict` + tesztek |
| Egységkonfliktus blokkolása + provenance | BIZONYÍTOTT | `addEntry` (`:477-486`), `measurementOverride` az auditlistában (`:787`) |
| Tetőszakaszok (név, oldal, kijelölés, fedettség, szakaszonkénti kalkuláció) | **RÉSZLEGES** | `drawing-roof-sections.ts` + tesztek, de a szakaszkezelés csak `roof.material-takeoff`-nál aktív (`takeoffScopeActive`, `:122`). Minden más tetőkalkulátor kap rajzpanelt és kalibrációt, de szakaszt és fedettségi kaput nem |
| Szakaszonkénti külön mentés, revízió-izoláció | BIZONYÍTOTT | `drawingTakeoffSessionKey` (`:65-67`) + teszt |
| **Több szakasz összesítése (közös élek, vápák, teljes tető)** | HIÁNYZIK (szándékosan) | `plan-field-transfer.tsx:724`: „Közös elemeket és teljes tető-összeget nem számolunk”; `wholeRoofConfirmed` csak `sections.length === 1`-nél (`:601`) |
| Munkamenet export/import, forráshash-kötés, rebind | BIZONYÍTOTT | `drawing-roof-work-session.ts` + 194 soros teszt |
| Munkamenet automatikus visszaállítása | RÉSZLEGES | `construction-workspace-memory.ts` a kalkulátordraftot őrzi; a rajz és a kijelölések nem állnak vissza maguktól (`:541`) |
| Anyagprofil-választás a kalkulációhoz | KÓDBAN JELEN, NEM FUTTATVA | `profiles` prop a katalógusból (`construction-suite.tsx:346`), `material-spec-editor`; ebben a körben nem ellenőriztem futtatással |
| Rajzos munka DB-perzisztencia | HIÁNYZIK (szándékosan) | `SOURCE_INDEX.md#draw-pdf`, `#draw-session`: „Adatbázis: nincs” |
| Átadás projektbe / kivitelezési tervbe | RÉSZLEGES | `planLinks` csak **mentés után**, a mentett kalkuláció lapján (`construction-suite.tsx:564`) |

### A.4 Elszakított funkciók

- **Kalibráció ↔ átvitel:** a kalibrált mérés semmilyen mezőt nem tölt ki, csak egységbizonyítékot ad, és csak egyetlen, egyértelmű számfeliratra (`:636-650`). A „megmértem a rajzon” és a „beírom a kalkulátorba” két külön világ.
- **Rajzpanel ↔ kalkulátor-űrlap:** a rajzból csak mezőérték megy át; a hiányzó adatok bekérése a kalkulátor saját, hosszú űrlapján történik (`:727-730`).
- **Szakaszok ↔ anyag/eredmény:** szakaszonként külön kalkuláció, külön mentés, összegzés nélkül; a felhasználónak kell fejben összerakni.
- **OCR ↔ minden más:** BLOCKED pontossági kapu miatt az OCR a gyakorlatban csak feliratlistát ad, átvitel előtt kötelező részletes ellenőrzéssel.
- **Fejlesztői diagnosztika:** `src/app/devtools/m12-pdf/page.tsx` + `pdf-inspector.tsx` külön rajzfelület, de `NODE_ENV !== "development"`-nél `notFound()` — **nem** felhasználói duplikáció.

### A.5 Dokumentáció ↔ kód ellentmondások (jelezve, nem feloldva)

1. **Kalibráció a munkamenet-exportban.** `PROGRESS.md` P1.1 (2026-10-31): „A mentett munkamenet-formátum (v2) sem változott: a kalibráció **nem** kerül bele, a lap bezárásával elvész.” A jelenlegi kód ezzel szemben exportálja: `createRoofWorkSessionJson({ …, calibration: calibration.accepted }, profiles)` (`plan-field-transfer.tsx:428`), importnál `dispatchCalibration({ type: "restore", … })` (`:445`). A P1.1 bejegyzés a saját körére érvényes történeti állapot; a P1.6 szövege már „v1–v3 munkamenet-sémát” említ. **Az aktuális kód az irányadó**, de a P1.1 szakasz önmagában olvasva ma megtévesztő.
2. **„3/4 Geometria” lépés.** A `construction-save-panel` felé adott blokkoló szöveg (`construction-suite.tsx:562`) olyan lépésszámozásra hivatkozik, amely a jelenlegi UI-ban nem létezik.
3. **`docs/PROJECT_MAP.md`** a `CLAUDE.md` szerint 2026-10-17-i, M12-ben hiányos — a tervrajzos folyamatra nem használható; ezt a tervet nem erre alapoztam.

---

## B. Javasolt célfolyamat (JAVASLAT)

Vezérelv: **a rajz a munkafolyamat, a kalkulátor az eszköz** — nem fordítva. Egyetlen felület, progresszív feltárással, új számítómotor nélkül.

```
0. Rajz megnyitása (belépési pont)         → „Rajzból indítok” a /kalkulatorok lapon
1. Mit mutat ez a lap?                     → oldalankénti rajztípus (változatlan szabály)
2. Melyik tetőrész?                        → rajzi kijelölés ELŐBB, elnevezés UTÁNA, fedettség igazolása
3. Lépték (opcionális, ajánlott)           → két referencia; ellenőrzéshez, nem kitöltéshez
4. Mit számolunk?                          → kalkulátor kiválasztása ITT, a szakasz ismeretében
5. Méretek a rajzról                       → cél mező ki van jelölve, koppintás; automatikus továbblépés
6. Ami a rajzból nem derül ki              → vezetett, egy-kérdés-egyszerre bekérés a rajz mellett
7. Anyag és profil                         → meglévő anyagválasztó, változatlan validációval
8. Eredmény és forrás                      → származás szerinti bontás, szakaszonként
9. Mentés / export                         → meglévő szerződés, szakaszonként
```

**Mit lehet automatikusan előkészíteni** (szabályt nem lazítva): a PDF szövegrétegének feliratlistája és pozíciója; a rajztípus-javaslat ott, ahol a cím egyértelmű; a következő hiányzó mező előre kijelölése (már így működik); a szakaszok listája és állapota; a lépték, ha ugyanarra az oldalra és forráshash-re már elfogadott volt.

**Mihez kell kifejezett szakmai jóváhagyás** (mind megtartandó): rajztípus megadása; fedettség igazolása; minden tetőméret nem-tetőterv lapon; egység nélküli felirat egysége; mért hossznak ellentmondó érték; alapértékek (tetőforma, kiülések); meglévő érték felülírása; eltérő forrás visszakötése.

**Mikor kérjük a hiányzó adatot:** csak miután a szakasz és a kalkulátor adott, és csak azt, ami az adott tetőformánál látható (`isFieldVisible`) és kötelező (`missingRequiredDrawingFields`). Egy kérdés egyszerre, a rajz mellett, nem egy teljes űrlap.

**Eltérő rajztípusok és tetőformák:** a rajztípus marad oldalankénti, explicit válasz. Egyszerű eset (egy szakasz, nyeregtető): 2. és 4. lépés egyetlen képernyőn, a „Ez az egyetlen szakasz a teljes tetőt lefedi” jelölővel. Összetett eset: szakaszcsíkon váltott szakaszok, szakaszonként külön eredmény, a „nincs összesítés” figyelmeztetés megtartásával.

---

## C. UI/UX-koncepció (JAVASLAT)

- **Lépéssáv a vászon felett:** egyetlen, kompakt állapotsor (Lap · Szakasz · Lépték · Mezők) jelöléssel „kész / folyamatban / hátravan”, a mostani három-négy szétszórt összefoglaló helyett. Megnyitható, nem görgetni kell hozzá.
- **A rajz a képernyő domináns eleme:** a P1.2/P1.6-ban már bevezetett „aktív munkaterület a vászon felett” mintát minden lépésre kiterjesztve (`min(78svh,60rem)` előnézet aktív interakció alatt).
- **Egy vezérlő egy művelethez:** a mezőválasztó `<select>` és a chipek közül a chipek maradnak (nagyobb érintési cél, egyszerre látható hiánylista), a `<select>` megy.
- **Ami a rajzból nem derül ki:** kártyás, egy-kérdés-egyszerre bekérés a vászon alatt, a kalkulátor saját mezőkomponenseivel (`length-field`, `material-spec-editor`) — nem új űrlaprendszer.
- **Figyelmeztetések súlyossági hierarchiája:** blokkoló (piros, művelethez kötött) / megerősítendő (sárga, gombbal azonnal elfogadható) / tájékoztató (halk, összecsukható „Miért?”). Jelenleg mind a `plan-todo`-ban, hasonló súllyal.
- **Destruktív műveletek:** a design system saját megerősítő felülete a `window.confirm` helyett, felsorolva, mi veszik el.
- **Asztali nézet:** a már létező kétoszlopos fekvő elrendezés (rajz balra, lépések jobbra) kiterjesztése szélesebb nézetre; a rajz nem keskenyedik el.
- **Technológia:** meglévő tokenek és komponensek (`src/app/globals.css`, `src/components/ui/`), nincs új UI-könyvtár, nincs új állapotkezelő.

---

## D. Technikai megvalósíthatóság

**Változatlanul használható (nem igényel üzleti logikát):** a teljes `src/domain/` számítási motor; `drawing-calibration.ts`; `drawing-field-transfer.ts` kapuszabályai; `drawing-quick-transfer.ts` döntési lánca; `drawing-value-suggestion.ts`; `drawing-roof-section(s).ts`; `drawing-roof-work-session.ts`; `construction-workspace-memory.ts`; `ConstructionSavePanel` és a `CALC-PERSIST` szerződés; `pdf-text-extractor`, `pdf-preview`, `ocr` infrastruktúra.

**Csak UI/állapotkezelési átalakítás:** a `<details>` nyitott alapállapota; lépéssáv; chip/select duplikáció megszüntetése; szakaszlépés sorrendje; figyelmeztetés-hierarchia; megerősítő felület; hiányzó adatok kártyás bekérése (a meglévő `missingRequiredDrawingFields`/`isFieldVisible` kimenetéből, új szabály nélkül).

**Új üzleti logikát igényelne (nagyobb kockázat, külön döntés):**
- szakaszkezelés kiterjesztése `roof.material-takeoff`-on túl (új fedettségi kapu más kalkulátorokra);
- bármilyen szakaszok közti összesítés (invariáns tiltja, amíg a közös élek nincsenek igazolva);
- a `suggestRafterCutField` szabálykészlet bővítése valós terv-feliratokra (valós rajzkorpusz és pontossági kapu nélkül nem felelős);
- a rajzos munka DB-perzisztenciája (`SCHEMA_INDEX` szerint ma nincs ilyen tábla).

**Kockázatos, halasztandó:** OCR-pontosság (BLOCKED, külön feladat); automatikus geometriai felismerés; több szakasz közös éleinek kezelése; szakaszok közti mezőátvétel (szakasz-izolációt sérthet).

**A megőrzés módja:** minden javasolt UI-változás a meglévő tiszta függvényeket hívja (`approveDrawingFields`, `decideQuickTransfer`, `requiresRoofGeometryConfirmation`, `canSaveDrawingTakeoff`); a mentés továbbra is a `drawingTakeoffSessionKey` szerinti szakaszkulcson megy, a provenance (`approvedEntries`, `measurementOverride`, `unitOrigin`) és a SHA-256 kötés érintetlen. Új párhuzomos állapot nem jön létre; a `PlanFieldTransfer` ~40 `useState`-je miatt a 8. feladat (komponensbontás) a nagyobb változások előfeltétele.

---

## E. Priorizált fejlesztési terv

Sorrend: felhasználói érték / kockázat arány. Minden feladat önállóan szállítható és tesztelhető.

### T1 — Elavult „3/4 Geometria” útmutató javítása — **MEGVALÓSÍTVA (2026-10-31)**
> A szöveg a „Teendők és figyelmeztetések” részre mutat. Bizonyíték: `docs/PROGRESS.md` → P2.1.
- **Cél:** a mentési blokkoló szöveg a tényleges lépésnevet említse.
- **Előny:** a felhasználó nem keres nem létező lépést.
- **Terület:** `CALC-CONSTRUCTION`. **Fájl:** `construction-suite.tsx:562`.
- **Függőség:** nincs. **Elfogadás:** a szöveg a UI-ban létező lépéscímre hivatkozik. **Teszt:** meglévő `construction-save-panel.test.tsx` szövegállítás frissítése. **Kockázat:** alacsony, visszafordítható.

### T2 — A rajzpanel nyitva indul, ha már van munka — **MEGVALÓSÍTVA (2026-10-31)**
> `panelOpen` + effekt, amely csak bekapcsol; a kézi összecsukás megmarad. Bizonyíték: `docs/PROGRESS.md` → P2.1.
- **Cél:** betöltött rajz, importált munkamenet vagy létező szakasz esetén a `<details>` nyitott.
- **Előny:** minden visszatéréskor egy koppintással kevesebb; a munka nem tűnik el.
- **Terület:** `DRAW-INTERPRET`. **Fájl:** `plan-field-transfer.tsx:535`.
- **Függőség:** nincs. **Elfogadás:** rajz nélkül csukott, rajzzal/importtal nyitott; a felhasználó kézi összecsukása nem nyílik vissza magától. **Teszt:** `plan-field-transfer.test.tsx` új eset. **Kockázat:** alacsony.

### T3 — Mezőválasztó duplikáció megszüntetése — **MEGVALÓSÍTVA, FORDÍTOTT IRÁNYBAN (2026-10-31)**
> Az alábbi eredeti javaslat (chipek maradnak, `<select>` megy) élő, 375 px-es méréssel megdőlt: a nem tördelő, scrollbart elrejtő `.plan-quick-chips` 300 px-es sávban 954–1567 px tartalmat ad, 7 chipből 1–2 látszik. A megvalósítás ezért a `<select>`-et tartotta meg teljes listaként, és a **chipsort** távolította el. Részletek és mérési táblázat: `docs/PROGRESS.md` → P2.1.
- **Cél (eredeti javaslat):** a gyorsátvitel cél mezőjét csak a chipek állítsák; a `<select>` megszűnik.
- **Előny:** egy művelet, egy vezérlő; nagyobb érintési cél mobilon.
- **Terület:** `DRAW-INTERPRET`. **Fájl:** `plan-field-transfer.tsx:689-692`, `:704`.
- **Függőség:** nincs. **Elfogadás:** minden `quickFields` mező elérhető chipként (a már kitöltöttek is, nem csak a hiányzók), a `targetFieldKey` viselkedése és az automatikus továbblépés változatlan. **Teszt:** a meglévő quick-transfer komponenstesztek a chip-útra átállítva. **Kockázat:** alacsony–közép (a `<select>` ma a már kitöltött mezőket is felsorolja, a chipek csak a hiányzókat — ezt a chipeknek át kell venniük, különben funkciócsökkenés).

### T4 — Egységes lépéssáv (haladás és következő lépés) — **MEGVALÓSÍTVA (2026-10-31)**
> Négy lépés (A lap · Szakasz · Lépték · Mezők) a vászon felett, a logika a `drawing-step-bar.ts` tiszta moduljában. A kalibráció `optional`, ezért soha nem következő lépés. A `plan-todo` minden figyelmeztetése megmaradt. Mért hely 375 px-en: a lecserélt két státuszblokk 141 px, az új sáv a „következő teendő” sorral 165 px. Bizonyíték: `docs/PROGRESS.md` → P2.3.
- **Cél:** egy kompakt állapotsor a vászon felett: Lap · Szakasz · Lépték · Mezők, állapottal és a következő lépésre vivő akcióval.
- **Előny:** a felhasználó mindig látja, hol áll és mi jön; a szétszórt összefoglalók összevonhatók.
- **Terület:** `DRAW-INTERPRET`, `UI-SYSTEM`. **Fájl:** `plan-field-transfer.tsx:565-604`, `714-732`.
- **Függőség:** T2. **Elfogadás:** egyetlen figyelmeztetés sem veszik el (hiányzó mezők, alapértékek, számítási korlát, szakaszfigyelmeztetés mind elérhető marad); mobil 375×812-n nincs vízszintes túlcsordulás. **Teszt:** komponensteszt minden figyelmeztetés jelenlétére + böngészős mobilviewport-ellenőrzés. **Kockázat:** közép (figyelmeztetés elvesztésének veszélye — ez a fő elfogadási feltétel).

### T5 — Szakaszlépés: rajzon jelölés előbb, elnevezés utána — **MEGVALÓSÍTVA (2026-10-31)**
> A névmező a kijelölés és annak eredménysora alá került; `sectionReady` és `canSaveDrawingTakeoff` változatlan, a fedettség-igazolás továbbra is kijelöléshez kötött. Bizonyíték: `docs/PROGRESS.md` → P2.5.
- **Cél:** a lépés a rajzi kijelöléssel induljon, a név és a fedettség utána jöjjön; a név maradjon kötelező a mentéshez.
- **Előny:** a valós munkamenetet követi; kevesebb visszalépés.
- **Terület:** `DRAW-SECTIONS`. **Fájl:** `plan-field-transfer.tsx:581-598`.
- **Függőség:** T4. **Elfogadás:** `canSaveDrawingTakeoff` szerződése változatlan (név + igazolt fedettség + elfogadott alapértékek nélkül nincs mentés); a fedettség-igazoló jelölő továbbra is csak tényleges kijelölés mellett engedélyezett. **Teszt:** `drawing-roof-section(s).test.ts` és `plan-field-transfer.test.tsx` meglévő kapu-tesztek változatlan zöldje. **Kockázat:** közép.

### T6 — Destruktív megerősítések a design systembe — **MEGVALÓSÍTVA (2026-10-31)**
> A felmérés négy hívási helyet nevezett meg; valójában **öt** volt (a „Fájl és javaslatok elvetése” gomb kimaradt). Mind az öt a meglévő `requestConfirmation` párbeszédet használja; új komponens nem készült. Bizonyíték: `docs/PROGRESS.md` → P2.2.
- **Cél:** a négy `window.confirm` helyett saját megerősítő felület, amely felsorolja, mi veszik el.
- **Előny:** mobilon használható, érthető; kevesebb véletlen adatvesztés.
- **Terület:** `UI-SYSTEM`, `DRAW-SESSION`. **Fájl:** `plan-field-transfer.tsx:370`, `:375`, `:390`, `:440`.
- **Függőség:** nincs. **Elfogadás:** mind a négy útvonal megszakítható, és megszakításkor semmilyen állapot nem változik (a mai `return` szemantika megőrzése); a szöveg megnevezi az elvesző adatot. **Teszt:** komponensteszt mind a négy útra, megszakítás + folytatás. **Kockázat:** közép (a mai `window.confirm` szinkron; az aszinkron megerősítés az `async chooseFile` sorrendjét érinti — ez a feladat lényegi része, nem mellékhatás).

### T7 — Hiányzó adatok vezetett bekérése a rajz mellett — **MEGVALÓSÍTVA (2026-10-31)**
> Egyszerre egy mező, a sorrendet a `guidedDrawingFieldKey` adja (tetőforma → hiányzó kötelezők → alapértékek); a mezőt a kalkulátorűrlap átengedi, nem duplikálja. Bizonyíték: `docs/PROGRESS.md` → P2.9.
> **Előfeltétel pontosítva (2026-10-31):** nem állapot-átalakítás kell hozzá, hanem egy `renderField` render-prop — a kalkulátor mezőrenderelője a szülőben él. Lásd `docs/DRAWING_STATE_REDESIGN_PLAN.md` S1.
- **Cél:** a `missingRequiredDrawingFields` és `unconfirmedDrawingAssumptions` kimenete kártyás, egy-kérdés-egyszerre formában a vászon alatt, a kalkulátor saját mezőkomponenseivel — görgetés helyett.
- **Előny:** a legnagyobb egyszerűsödés: nincs váltás a rajz és egy hosszú űrlap között.
- **Terület:** `DRAW-INTERPRET`, `CALC-CONSTRUCTION`. **Fájl:** `plan-field-transfer.tsx:714-732`, `construction-suite.tsx` mezőrenderelés.
- **Függőség:** T4, T8 (a komponensbontás nélkül ez a fájl kezelhetetlenül nő).
- **Elfogadás:** csak látható (`isFieldVisible`) és valóban kötelező mezők kérdeznek; a validáció, a `length-field` viselkedés és az alapérték-token (`drawingAssumptionToken`) változatlan; a kalkulátor saját űrlapja továbbra is elérhető és konzisztens.
- **Teszt:** új komponensteszt a bekérési sorrendre + meglévő alapérték-tesztek; böngészős ellenőrzés mobilon. **Kockázat:** közép–magas (a legnagyobb UI-felület).

### T8 — `PlanFieldTransfer` komponensekre bontása (előfeltétel-refaktor) — **RÉSZBEN, MÁS IRÁNYBAN (2026-10-31)**
> A komponensbontás **nem történt meg**, mérés alapján: a 841 sorból 561 az állapot és a kezelők, a legnagyobb JSX-blokk külön komponensként **87 propot** igényelne. Helyette három addig tesztelhetetlen szabály (`drawingQuickScopeIssue`, `activeMeasurementLink`, `drawingCoverageLabel`) került saját, tesztelt modulba; a komponens tesztjei módosítás nélkül zöldek. **A T7 és a T10 előfeltétele ezzel nem teljesült** — ahhoz az állapot átszervezése kellene, ami újratervezés, nem refaktor. Bizonyíték: `docs/PROGRESS.md` → P2.6.
- **Cél:** a 798 soros, ~40 `useState`-es komponens felosztása (forrásbetöltés, lépéssáv, vászon+overlay, kalibráció, gyorsátvitel, részletes átvitel, teendők) változatlan viselkedéssel.
- **Előny:** közvetlen felhasználói előny nincs; T7 és minden további UI-munka kockázatát csökkenti. A P1.6 ezt kifejezetten elhalasztotta.
- **Terület:** `DRAW-INTERPRET`. **Fájl:** `plan-field-transfer.tsx`.
- **Függőség:** T1–T6 után javasolt (ne ütközzön folyamatban lévő UI-változással).
- **Elfogadás:** a `plan-field-transfer.test.tsx` 29+ tesztje változtatás nélkül zöld; nincs új állapot, nincs új szabály. **Teszt:** meglévő teszthalmaz + `tsc`, `eslint`. **Kockázat:** közép (viselkedési regresszió), de teljesen visszafordítható.

### T9 — Többoldalas rajz oldalválasztója (kis javítás) — **MEGVALÓSÍTVA (2026-10-31)**
> Az opciók `1. · Alaprajz` / `2. · nincs megadva` alakúak. Az oldalváltás állapottörlése változatlan, teszttel igazolva. Mért ár 375 px-en: az eszköztár 70 px → 98 px, kizárólag többlapos rajznál. Bizonyíték: `docs/PROGRESS.md` → P2.4.
- **Cél:** az oldalválasztó `<select>` mellé az oldalak rajztípus-állapota is látszódjon (melyik lapot válaszoltad már meg).
- **Előny:** többlapos terven nem kell emlékezni, melyik oldal volt tisztázva.
- **Terület:** `DRAW-PDF`, `DRAW-INTERPRET`. **Fájl:** `plan-field-transfer.tsx:607`.
- **Függőség:** T4. **Elfogadás:** a `planKinds` oldalankénti állapota látható; oldalváltás a mai állapottörlést (mérés, kijelölés) változatlanul elvégzi. **Teszt:** komponensteszt. **Kockázat:** alacsony.

### T10 — „Rajzból indítok” belépési pont
> **Előfeltétel pontosítva (2026-10-31):** a `key={selectedId}` miatti újramount az egyetlen valódi akadály; a megoldás a dokumentumhoz kötött állapot felvitele a szülőbe, a kulcs megtartásával. Lásd `docs/DRAWING_STATE_REDESIGN_PLAN.md` S3–S5.
- **Cél:** a `/kalkulatorok` lapon rajzzal indítható út: rajz megnyitása → szakasz → **majd** kalkulátor kiválasztása.
- **Előny:** a tényleges munkamenet sorrendje; a felhasználónak nem kell előre tudnia a kalkulátor nevét.
- **Terület:** `CORE-APP`, `CALC-CATALOG`, `DRAW-INTERPRET`. **Fájl:** `src/app/kalkulatorok/page.tsx`, `construction-suite.tsx:346, 568-577`.
- **Függőség:** T4, T8. **Elfogadás:** a kalkulátorváltás nem veszít el rajzot és szakaszt (ma a `key={selectedId}` miatt a panel újramountol — ez a feladat magja); minden kapu és a `drawingTakeoffSessionKey` szerződés változatlan.
- **Teszt:** komponensteszt a kalkulátorváltásra rajz megtartásával + böngészős ellenőrzés. **Kockázat:** magas (állapot-életciklus átszervezése), ezért a sor végén.

### NEM ebben a körben
- Szakaszok összesítése, közös élek/vápák — invariáns tiltja, amíg nincs igazolt geometriai kezelés.
- OCR-pontosság és új felismerőmotorok — M12.2 BLOCKED, külön feladat.
- `suggestRafterCutField` szabálybővítés valós terv-feliratokra — valós rajzkorpusz és pontossági kapu nélkül nem felelős.
- Rajzos munka DB-perzisztenciája — új séma, `SCHEMA_INDEX` szerint ma nincs.
- Szakaszok közti mezőátvétel — szakasz-izolációt sértheti.
- CAD/BIM, automatikus geometriai felismerés.

### Dokumentációs utómunka (feladatként, nem ebben a körben)
- A `PROGRESS.md` P1.1 kalibráció-export állítása (A.5/1.) kapjon egy sornyi „későbbi körben megváltozott” jelölést, hogy önmagában olvasva ne legyen megtévesztő.
- Az érintett `LIBRARY.md` / `SOURCE_INDEX.md` bejegyzések csak akkor frissüljenek, ha egy feladat tényleges belépési pontot vagy invariánst változtat.
