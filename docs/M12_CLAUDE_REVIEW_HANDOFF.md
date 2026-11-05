# TetőPro M12 – fejlesztői átadás és független felülvizsgálati brief

**Címzett:** Claude Code, független termék-, szakmai és technikai felülvizsgálat
**Projekt állapota a dokumentum összeállításakor:** 2026-10-30, M12.9 implementációs állapot, meg nem commitolt munkafa
**Fontos kapu:** M12.2 OCR-pontosság továbbra is **BLOCKED**.
**Hatókör:** ez a dokumentum állapotátadás, nem új termékspecifikáció és nem az E-01 tetőtervének szakmai igazolása.

## 1. Executive Summary

M12 azzal a céllal indult, hogy egy bádogos tervrajzból indulva a használható méreteket ellenőrizhesse, a hiányzó tetőadatokat megadhassa, majd a TetőPro meglévő kalkulátoraival tetőgeometriát és anyagmennyiséget számíthasson. A cél nem pusztán PDF/OCR-demó volt. A teljes eredeti elképzelés a tervrajz-feltöltéstől az ellenőrizhető anyagkigyűjtésig tartó, mindennapi munkát rövidítő folyamat.

A jelenlegi implementáció egy óvatos, ember által vezérelt szeletet teljesít: PDF.js kiolvashat szöveges PDF-ből feliratot és koordinátát; néhány szigorú, determinisztikus szabály explicit műszaki címke esetén mezőjavaslatot ad; a felhasználó kiválasztja, javítja és jóváhagyja a célmezőt/értéket; a mező mentetlen kalkulátordraftba kerül; a számítás a már meglévő motorral fut. A több tetőszakasz adata szakaszonként külön draftban tartható, az aktuális szakasz külön számolható. M12.9-ben az explicit JSON export/import segít a munkamenet kézi folytatásában.

Ez **nem** általános tervrajz-értelmező, nem OCR-alapú automatikus mezőkitöltő, nem CAD, és nem teljes épülettető-modell. A PDF-ből nem következtetünk léptékre vagy fizikai méretre. A rajzi téglalap csak vizuális referencia. Több tetőszakasz eredményeit a rendszer nem összesíti, mert a közös élek, vápák, átfedések és csatlakozások nincsenek automatikusan modellezve. A felület vagy geometriai eredmény egy megadott, leegyszerűsített szakaszra vonatkozik; nem bizonyítja, hogy az épület minden tetővel fedett része szerepel.

**Bizonyíték:** a legutóbb dokumentált teljes Vitest 213 fájlból 1378 PASS, 19 SKIP, 0 FAIL. Az M12.6 DEMO E2E a jelenlegi kóddal célzottan 46 tesztet futtatott sikeresen; a teljes suite, lint, TypeScript-ellenőrzés és izolált production build is sikeres. Korábbi szintetikus böngészős pilotok dokumentáltak PDF-previewt, zoomot/forgatást és M12.6 folyamatot; a későbbi M12.8.1 bizonyíték csak részleges két szakaszos E2E. M12.9 böngészős export/import **NOT TESTED**. Az eredeti E-01-ből nincs tetőszámítás.

**Független review ajánlott fő megállapítása:** vizsgálja meg, hogy a termék valóban gyorsítja-e a bádogos munkáját a sok kézi jóváhagyás mellett; mely szűk, determinisztikus automatikák csökkenthetnek adatbevitelt téves műszaki következtetés nélkül; és milyen valós, szakember által címkézett rajzkorpusz kell az OCR/M12.2 kapu feloldásához.

## 2. Eredeti felhasználói elképzelés – szó szerinti idézet

Az eredeti célhoz közvetlenül hozzáférhető felhasználói megfogalmazás:

> „egy olyan pdf ről kell leolvasni azokat az adatokat amivel megtudja határozni mekkora. a tető, aztán bekérje a hiányzó adatokat egy tető anyag számításnál, mondjuk bekérje a hajlás szöget meg hogy mekkora szarufákat akar használni az anyaglistából, hogy tudjon számolni szarufát mindent”

Ez a felhasználó által szó szerint átadott részlet. Nem javítottam helyesírását és nem egészítettem ki nem látott mondatokkal. A teljes eredeti beszélgetési előzmény és minden korábbi, külön mellékletként átadott specifikáció nem került egyetlen visszakereshető forrásba; az alábbi M12-idővonal a hozzáférhető kérésekből és a projekt dokumentációjából készült. Ahol a pontos kérés szövege nem áll itt idézőjelben, ott fáziscélt foglalok össze, nem szó szerinti idézetet állítok.

### További, a beszélgetésben szó szerint látható utasításrészletek

Az alábbi rövid célmondatok közvetlen felhasználói üzenetekből származnak:

- M12.3C.1: „Most kizárólag a megmaradt ellenőrzéseket és bizonyított hibák célzott javítását kérem.”
- M12.4: „A cél most az első, tényleges műszaki jelentést felismerő, szabályalapú megoldás megvalósítása, kizárólag ellenőrizhető PDF.js szövegforrásokra építve.”
- M12.8: „A megoldásnak a tényleges, mindennapi bádogosmunkát kell egyszerűsítenie, nem új CAD-rendszert kell létrehoznia.”
- M12.8.1: „Cél: ne építs újabb nagy funkciót. Először bizonyítsd a többszakaszos munkafolyamat stabilitását, különös tekintettel a mobilos használatra és az adatok elkülönítésére.”
- M12.9: „Az M12.2 OCR-pontossági kapuja BLOCKED.”

Az M12.5, M12.6, M12.7 és M12.9 specifikációk mellékletként érkeztek; ez a handoff a látható címeket és a fáziscélokat használja. A fenti rövid részletek nem helyettesítik az eredeti, teljes specifikációkat.

### A belőle következő termékvízió

Kívánt munkafolyamat:

**Tervrajz megnyitása → használható jelölések megtekintése → tetővel fedett részek tisztázása → hiányzó geometriai és anyagadatok bekérése → meglévő kalkulátorral számítás → eredet és korlátok ellenőrzése.**

Az eredeti célok:

- A bádogosnak ne kelljen minden méretet kézzel újra beírnia, ha azok megbízhatóan kiolvashatók.
- A rendszer ne csak értéket mutasson, hanem segítsen tisztázni, hogy az melyik tetőszakaszhoz és melyik kalkulátormezőhöz tartozik.
- A hiányzó adatot kérdezze meg, ahelyett hogy feltételezné.
- A kiválasztott anyaglistából/termékkatalógusból származó paraméterekkel a meglévő számítási képességet használja.
- Az eredmény legyen visszakövethető, és különüljön el a megadott adat, az ember által jóváhagyott rajzi adat, a számítás és a hiányzó információ.

### Felhasználói célok és későbbi technikai döntések

| Felhasználói cél | Később választott korlátozás / technikai döntés |
|---|---|
| Méretek leolvasása tervről | Először PDF.js szövegréteg, majd külön vizsgált lokális OCR; OCR-ből jelenleg nincs automatikus mezőkitöltés. |
| Tető méretének meghatározása | Alaprajzi külső méret nem lesz automatikusan tetőméret; embernek kell a fedett szakaszhoz rendelnie és ellenőriznie. |
| Hiányzó hajlás/anyagadat bekérése | Meglévő kalkulátorséma és validáció használata; nincs párhuzamos számítómotor. |
| Szarufák és anyaglista kiszámítása | `roof.material-takeoff` / timber-layout motorra építés; mennyiség névleges/geometriai, nem statikai vagy beszerzési igazolás. |
| Tagolt alaprajz használata | Szakaszonként külön rectangle-overlay, geometry/material draft és eredmény; pixelekből méretet nem számítunk. |
| Munka későbbi folytatása | M12.9 explicit, felhasználó által kezdeményezett JSON export/import; nincs automatikus vagy szervermentés. |

## 3. A tényleges célfolyamat és mai határ

1. **PDF/image megnyitás:** PDF.js szövegréteget dolgoz fel; OCR külön, kifejezett műveletként fut képre vagy szövegréteg nélküli PDF-oldalra.
2. **Forrás áttekintése:** a felhasználó feliratra vagy szövegforrásra kattint; oldal és pozíció megmarad. A felirat nem válik műszaki adattá pusztán attól, hogy a rajzon szerepel.
3. **Javaslat/ellenőrzés:** explicit egységű numerikus szöveg adhat szerkeszthető értékjavaslatot; három M12.4 szabály explicit műszaki címkére ad lehetséges `roof.rafter-cut` mezőt. A célmező, érték és felhasználói jóváhagyás külön marad.
4. **Tetőszakasz:** a felhasználó nevet, fedettséget és téglalap kijelölést ad meg. A rajz koordinátája csak vizuális referencia. Nem következtet tetősíkra, fizikai méretre vagy területre.
5. **Geometria/anyag:** a felhasználó megadja a hiányzó formát, méreteket, hajlást, ereszkiülést, anyagválasztást és kiosztást. A meglévő kalkulátor validál és számol.
6. **Eredmény:** az aktív szakasz számított mennyisége jelenik meg a forrás/paraméter/korlát jelölésével. Hiányos bemenet hiányos marad; nem készül automatikus épületszintű összesítés.
7. **Folytatás:** explicit JSON export/import adható kézi mentésnek. Importkor a korábbi számítás nem töltődik vissza, az újraellenőrzést igénylő jóváhagyások visszavonódnak.

Ez jelenleg ellenőrzött adatátviteli és számítási segítség, nem olyan automata, amely egy építészeti tervből önállóan meghatározza a teljes tetőt.

## 4. Technikai architektúra – csak az M12-review-hoz szükséges részek

### Alkalmazás és futtatókörnyezet

- Next.js App Router: telepített `next@16.4.2`; React/React DOM `19.3.0`; TypeScript `5.9.3`. A `package.json` tartományokat deklarál (`next ^16.4.2`, `react ^19.0.0`, `typescript ^5.7.2`), a fenti pontos verziók a jelenlegi lockolt telepítésből származnak.
- A `src/app/` tartalmazza az útvonalakat és szerveroldali belépési pontokat. Interaktív kalkulátor, canvas és fájlkezelés klienskomponensben történik (`"use client"`), például `src/features/calculators/construction-suite.tsx` és `src/features/calculators/plan-field-transfer.tsx`.
- A rajzdiagnosztika `src/features/drawings/pdf-inspector.tsx` / `/devtools/m12-pdf` útvonalon van; a PROGRESS szerint fejlesztői eszköz, éles buildben a diagnosztikai útvonal korábban 404 volt.
- Fő rétegek M12 szempontjából: UI a `src/features/calculators/` és `src/features/drawings/` alatt; kalkulátor-orchestration a `construction-computation.ts`-ben; domain geometriák/material takeoff a `src/domain/calculations/`; fájl-adapterek a `src/infrastructure/drawings/` alatt.

### PDF, OCR és forrásmodell

- `src/infrastructure/drawings/pdf-text-extractor.ts` `processPdfDocument()` funkciója lusta PDF.js importtal (`pdfjs-dist@6.4.299`) dolgozik, szövegelemekből oldalt, eredeti/normalizált szöveget, koordinátát, forgatást és keretet állít elő. Fő korlát: 32 MiB, 100 oldal, 100 000 text item, 5 MiB szöveg, 200 000 token; a PDF-preview külön 8 MP korlátú.
- `src/infrastructure/drawings/drawing-text-source.ts` `DrawingTextSource` közös adatkontraktusa rögzíti a dokumentumazonosítót, oldalszámot, eredeti és normalizált feliratot, tokeneket, módszert, motorverziót, confidence/uncertainty adatot, pozíciót és bounds-ot.
- `src/infrastructure/drawings/ocr.ts` a lokális Tesseract.js `7.0.0` adapter. Saját same-origin worker/core/magyar nyelvi assetei a `public/ocr/` alatt vannak. A korlát 16 MiB és legfeljebb 8 megapixel; dolgozik JPEG/PNG/WebP képpel és expliciten indított, szövegréteg nélküli PDF-oldallal. OCR worker megszakítható és lezáráskor terminálódik; canvas takarítás a függvény végén történik.
- PDF.js és OCR közös forrástípust használ, de az OCR `confidence` nem műszaki megbízhatósági bizonyíték. A `drawingUncertainty()` alacsony OCR confidence-ra `ambiguous`, egyébként is `unknown` értéket ad.

### Kalkulátor és anyagkigyűjtési motor

- `roof-calculator-definitions.ts` definiálja a mezőket és bekötéseket; `construction-computation.ts` a validálás, geometria, anyag-inputok, snapshotok és menthetőség egyesítési pontja. `computeConstruction()` használja a meglévő domain függvényeket; `isSaveableComputation()` külön teljes/érvényes állapotot vizsgál.
- `roof-geometry.ts` / meglévő `calculateExistingRoofGeometry()` adja a tetőgeometriai modelleket. Támogatott típus: `gable`, `shed`, `hip`, `pyramid`, `halfHip`, `lShape`, `tShape`, `mansard`.
- `roof-material-takeoff.ts` a geometriára épít, nem rajzból számol. A további motorok: `roof-timber-layout.ts` szarufa/lécezés kiosztása, `roof-underlay.ts` alátétfólia, `roof-covering-layout.ts` fedőtáblakiosztás. Anyagparaméter-sémák és katalógusprofil-feloldás: `roof-material-spec.ts`, `roof-covering-parameters.ts`; UI: `material-spec-editor.tsx`.
- `roof.timber-cutlist` csak faanyag-kiosztást számol; `roof.rafter-cut` egyetlen szarufa geometriája/illesztési segédlete. `roof.material-takeoff` több anyagcsoportot kapcsol a tetőfelülethez.

### Supabase/Auth és mentett kalkulációk

- A Supabase adapterek `src/infrastructure/supabase/browser.ts`, `server.ts`, `proxy.ts` alatt vannak. Szerveroldali kliens cookie-kon keresztül készül (`createServerClient`); `features/auth/auth.server.ts` szolgáltat auth/szervezeti kontextust. Az éles kalkulációs mentés és revíziókezelés a már meglévő adatmodell/RPC/RLS-útvonalakat használja.
- M12 rajzadatot, PDF bájtokat, OCR-kimenetet, hash-t vagy overlay-t nem ment a Supabase-ba. A JSON export fájl-helyi; importból kalkulátordraft készül, a normál mentés csak a meglévő kalkulátor validációján és jogosultsági útvonalán át történhet.
- Mentett kalkulációs revízió forrása a `src/features/calculators/construction-computation.ts` snapshot-szerződéssel; mentési UI: `src/features/calculators/construction-save-panel.tsx`. M12 nem írja át a mentési RPC-t. A fiókhoz kötött M12 session tárolás külön, szervezeti jogosultság/RLS/konkurencia/audit döntést igényel.

## 5. M12.0–M12.9 fejlesztéstörténet és utasítások

Az idővonal a `docs/PROGRESS.md`, `docs/AI_DRAWING_IMPLEMENTATION_PLAN.md`, `docs/AI_DRAWING_EXTRACTION_RULES.md`, `docs/AI_DRAWING_TEST_MATRIX.md`, valamint a jelen beszélgetésben ténylegesen látható felhasználói kérések összevetéséből készült. A korábbi teljes chatlog nem áll rendelkezésre egyetlen hiteles fájlban; az állítások azonosítására mindenhol külön szerepel, hogy közvetlen kérésből vagy projektjegyzetből származnak.

### M12.0 — PDF.js szövegkinyerési PoC

- **Cél / miért:** valós PDF-hez hasonló forrásból a szöveg és koordinátája kinyerhető-e Next.js alatt, biztonságosan, csak helyben.
- **Megvalósítás:** PDF.js worker betöltés, minimális szövegelem/oldal/kezdőpozíció és böngészős preview. Ekkor még nem volt OCR, címkézés vagy kalkulátorátvitel.
- **Érintett terület:** korai rajz-diagnosztika és szintetikus PDF fixture; pontos történeti fájllista az akkori commit nélküli munkához nem rekonstruálható teljes bizonyossággal. Mai adapter: `src/infrastructure/drawings/pdf-text-extractor.ts`.
- **Bizonyíték / elfogadás:** a PROGRESS szerint szintetikus PDF Vitest és böngésző; helyi E-01 olvasási próba 467 pozíciót adott. Teljes suite 1270 PASS / 19 SKIP / 2 FAIL, a két ismert régi teszt-szerződés eltérés miatt. **PASS WITH LIMITATIONS**: text/coordinate PoC bizonyult, workflow nem.
- **Fennmaradt rés:** a koordináta csak kezdőpont, nem karakterhű bounding box; sem méretértelmezés, sem tetőmodell nem volt.

### M12.1 — PDF-feldolgozó infrastruktúra

- **Cél / miért:** a PoC-t megszakítható, korlátozott, oldalanként feldolgozó infrastruktúrává alakítani, hogy későbbi M12 felhasználhassa.
- **Megvalósítás:** lusta PDF.js import; szövegréteg és oldalméret/forgatás/pozíció/keret; fejléc/size/page/token limit, progress, `AbortSignal`, hibaosztályozás; preview/overlay, zoom és forgatás a dev inspectorben.
- **Építkezés:** M12.0 parser proof; publikus `DrawingTextSource`, PDF.js adapter és diagnosztikai UI.
- **Bizonyíték / elfogadás:** dokumentált autentikált helyi böngésző QA: preview, zoom, +90° forgatás, 467 E-01 szövegelem, konzol 0 warning/error. Célzott 5 fájl/35 PASS; teljes 1291 PASS / 19 SKIP. Később a két korábbi suite-hiba javítva lett, de ez a mérföldkő történeti baseline. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** csak szöveg-layer PDF; böngésző memória/latencia nem mért mobilon; E-01 egyetlen próba.

### M12.2 — helyi OCR és pontossági kapu

- **Cél / miért:** szövegréteg nélküli kép/rajz felirataihoz helyi OCR lehetőség, adatküldés nélkül.
- **Megvalósítás:** Tesseract.js 7.0.0, local worker/WASM/magyar nyelvi adatok, képi ROI, zoomolás/forgatás, confidence/uncertainty és korlátok. OCR-kimenet nem válik automatikus kalkulátormezővé.
- **Építkezés:** `DrawingTextSource` közös kontraktus; külön OCR adapter és image/PDF-page beolvasás.
- **Bizonyíték / elfogadás:** E-01 15 kézzel ellenőrzött műszaki feliratából 0 szó szerinti OCR-egyezés; két bbox megfelelő helyű volt, de a vessző/pont normalizálás konfliktust okozott. JPG/WebP próba is `14,50→1450` hibát hozott. Kis tesztminták, nem reprezentatív pontossági benchmark. OCR-alapmotor **PASS WITH LIMITATIONS**, műszaki pontossági kapu **BLOCKED**.
- **Fennmaradt rés:** referencia-adat hiányában OCR nem használható automatikus műszaki méretbevitelhez. Az M12.2 kaput minden későbbi mérföldkő **BLOCKED** állapotban hagyta.

### M12.3A — ember által jóváhagyott draftátvitel

- **Cél / miért:** a PDF/OCR szöveg ne csak diagnosztikában jelenjen meg, hanem egy kiválasztott kalkulátormezőbe csak explicit emberi lépésekkel kerülhessen.
- **Megvalósítás:** „Kitöltés tervrajzból” panel; forrás és célmező választás, felhasználó által javított érték, mezővalidáció, meglévő érték felülírásvédelme és külön jóváhagyás. Négy roof kategóriájú kalkulátor: `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members`.
- **Építkezés:** M12.1 source object + meglévő construction calculator field schema/draft; OCR csak forrás, nem automatikus adat.
- **Bizonyíték / elfogadás:** Vitest, demo browser és adatvédelmi QA a PROGRESS-ben. A panel adatutat tesztelték, de egy korábbi Playwright locator ambiguity adatvédelmi QA-t korlátozott. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** nincs automatikus műszaki címke-hozzárendelés; nincs tartós provenance; a user dönt minden lépésben.

### M12.3B — explicit egységgel ellátott értékjavaslat

- **Cél / miért:** egyértelmű, egyetlen számszöveg+egység normalizálása, OCR-es „okos javítás” nélkül.
- **Megvalósítás:** explicit `mm/cm/m` értékjavaslat PDF-text esetén; forrás egysége elsődleges; manuális mezőválasztás, editálás és jóváhagyás marad.
- **Építkezés:** M12.3A emberi transfer; nem változott a mezőszerződés.
- **Bizonyíték / elfogadás:** pl. `8,20 m→8200 mm`; hiányzó kötelező mező megakadályozta a számítást; meglévő érték külön felülírás-jóváhagyást kért. Több token, unitless, százalék, area, section text elutasítása tesztelt. Célzott 3 fájl/35 PASS, teljes 1327 PASS/19 SKIP, browser kalkulátor demo. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** érték javasolt, de szakmai jelentés és célmező nem automatikus.

### M12.3C — egység nélküli szám és draft-konzisztencia

- **Cél / miért:** rajzokon gyakori unitless számokból ne lehessen némán méretet képezni; a felhasználó válassza az egységet.
- **Megvalósítás:** egység nélküli egy szám csak kézi `mm/cm/m` választás után ad szerkeszthető draftértéket; explicit PDF-egység felülírja a kézi választást. Source/page/file váltáskor a korábbi mezőválasztás, unit, editált érték és jóváhagyás resetelődik. Az érintett `LengthField` kijelződraft frissül, kalkulátorok draftjai elkülönülnek.
- **Építkezés:** M12.3A transfer guard és M12.3B normalizer.
- **Bizonyíték / elfogadás:** `17,00 + cm→170 mm`, `14,50 + m→14500 mm`, explicit `8,20 m→8200 mm`; böngészőben draftátvitel/oldalváltás/kalkulátorváltás és LengthField konzisztencia dokumentálva. M12.3C.1-ben célzott stabilizálás és kontrollált regresszió; a régi HMR-tab belső stale állapotának pontos történeti oka nem volt bizonyítható. Teljes suite a történeti frissítésben 1333 PASS/19 SKIP. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** minden szám/mező-értelmezés továbbra is felhasználói döntés; teljes fájlcserés és keresztböngészős QA nem minden körben történt meg.

### M12.3C.1 — célzott QA és állapotkonzisztencia

- **Forrásstátusz:** a felhasználó külön „célzott stabilizálás és szakmai QA” kérése közvetlenül látható az előzményben, de a fejlesztési naplóban nincs minden tekintetben külön M12.3C.1 fejezet; bizonyítékai a M12.3C bejegyzésbe és későbbi QA-jegyzetekbe kerültek.
- **Cél / megvalósítás:** valós böngészős két szintetikus PDF-csere, unit/mező/érték/jóváhagyás reset, oldal- és címkeváltás, calculator draft isolation, LengthField / korábbi átvitt érték egyezése; a matematikai példánál az értékmező és a kalkulátormotor kimenetének ellenőrzése, képlet módosítása nélkül.
- **Bizonyíték / állapot:** a progress dokumentál böngészőben `17 cm→170 mm` átvitel és `88,053°` függőleges vágásszög eredményét, a 5000 mm félfesztáv / 170 mm gerincemelkedés esetén számított hajlásszög `1,947°`-os értékét, és azt, hogy a régi jegyzet nem rögzítette a `170 mm` célmezőt. Eredmény nem minősült képlethibának. Alacsony hajlásra meglévő warning szabályt nem találtak. A fájlcserés browser QA bizonyos körökben **NOT TESTED** maradt a fájlválasztó miatt. **PASS WITH LIMITATIONS**, OCR kapu továbbra is BLOCKED.
- **Fennmaradt rés:** az adott korábbi böngésző munkamenet nem azonosítható teljes reprodukálható E2E artefaktként; gyártói/szakmai minimum hajlásszög nincs megadva, küszöb nem vezethető be önkényesen.

### M12.4 — első explicit műszaki felirat-szabályok és fokozatos draft

- **Cél / miért:** a PDF-felirat műszaki jelentése csak explicit, egyértelmű címkéből legyen javasolható; a részadatok egyenként gyűjthetők legyenek.
- **Megvalósítás:** csak `roof.rafter-cut`, PDF.js szövegréteg és egy span-en belüli, egyértelmű `címke: szám egység` kap mintát. Három map: fél fesztáv→`horizontalHalfSpanMm`; gerincemelkedés→`riseMm`; vízszintes ereszkiülés→`eaveProjectionMm`. Source text, unit, page, position/bounds, rule ID és jóváhagyás visszakövethető. OCR, közelségből összefűzött span és más calculator nincs.
- **Építkezés:** M12.3B/3C normalizer + M12.3A target validation/approval; parser `drawing-field-transfer.ts`, `drawing-value-suggestion.ts`.
- **Bizonyíték / elfogadás:** 6 pozitív javaslat helyes, 0 téves 13 negatív/kétes mintán, mind a 13 kihagyott; célzott és PDF.js fixture tesztek. Nem általános false-positive becslés. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** 6/13 kis DEMO text case nem helyettesíti az építészeti rajzok szakember által annotált korpuszát.

### M12.5 — alaprajz eredetű méret téves tetőértelmezésének védelme

- **Cél / miért:** E-01 és hasonló földszinti alaprajz külső méretei/teraszai ne váljanak automatikusan tetőméretté.
- **Megvalósítás:** rajztípus-jelzés csak ugyanazon oldali PDF.js `FÖLDSZINTI` + `ALAPRAJZ` címrészből; a tetőgeometriai mezőbe vitt alaprajzi mérethez külön fedett szakasz megerősítés kell; százalék nem konvertálódik fokokká. Negatív műszaki értelmezési esetek.
- **Építkezés:** M12.4 parserek/field validation és M12.3 emberi approval.
- **Bizonyíték / elfogadás:** DEMO negatív PDF, 0 tetőmező-javaslat; E-01 helyi forrás és képi vizsgálat, nincs számítás. Az E-01 automatizált browser-űrlapteszt nem történt. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** a user megerősítése csak hozzárendelést igazol, nem méret helyességét. A teljes tetőhöz tetőterv, metszet vagy jóváhagyott szakaszméret kell.

### M12.6 — vezetett tetőgeometria és anyagkigyűjtés

- **Cél / miért:** a fejlesztés ne álljon meg feliratfelismerésnél; egy DEMO szakasz végigjusson geometriától valódi meglévő anyagmotorig.
- **Megvalósítás:** meglévő tervrajzpanelben szakasznév, fedettség jóváhagyása, geometry/anyag mező navigáció, hiányzó mező jelzés, teljes tető scope gate; a geometria/méretek csak felhasználó által jóváhagyott értékek. Teljes tető elfogadása egyetlen szakasznál is külön user-confirmationt kívánt, és geometria változáskor visszavonódott.
- **Bizonyíték / elfogadás:** szintetikus 8×6 m nyeregtető, 35°, DEMO anyag. A korábbi böngészős pilot: 58,60 m², 20 szarufa, 73,246 m összhossz, 1,172 m³ névleges faanyag, 16 fedőtábla; részleges eredmény, mentést nem végeztek. A későbbi 2026-10-30 célzott újraellenőrzés a `drawing-roof-takeoff.test.ts` compositional E2E-t a jelenlegi forráskóddal futtatta. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** E-01 nem ad bizonyított tetőgeometriát; a szintetikus eredmény nem szakmai/gyártói referencia.

### M12.7 — vizuális szakaszkijelölés

- **Cél / miért:** fedett szakasz rajzi helyét a felhasználó lássa, különösen tagolt alaprajzon.
- **Megvalósítás:** PDF-oldalra normalizált két sarokból álló téglalap; módosítás/törlés, fedett/fedetlen/tisztázandó; zoom/forgatás alatt koordinátamegőrzés. Pixelekből nincs terület vagy lépték.
- **Építkezés:** PDF.js bounds, existing plan panel, M12.6 section/workflow gates.
- **Bizonyíték / elfogadás:** korábbi szintetikus browser pilotban overlay, zoom/90° forgatás és 375×812/812×375 overflow-mentesség; browser és unit tesztek. M12.7 idején egy szakasz volt támogatott. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** polygon/CAD nem készült; kijelölés csak vizuális; M12.7 architektúra-leírás későbbi M12.8 után elavult.

### M12.8 — több, szakaszonként elkülönített munkaterület

- **Cél / miért:** tagolt épület részei ne olvadjanak egyetlen tetőgeometriává, de a workflow maradjon könnyű, ne legyen CAD.
- **Megvalósítás:** egyedi szakasz ID/name; section/page/points/coverage és saját geometry, material, LengthField, approved source draft. Hozzáadás, váltás, törlés; csak aktív szakasz számolódik/jelenik meg. Kapcsolatok/átfedés jelölése ellenőrizetlen; nincs épületszintű összeg.
- **Építkezés:** `drawing-roof-sections.ts`, `drawing-roof-section.ts`, `PlanFieldTransfer` és meglévő material engine.
- **Bizonyíték / elfogadás:** unit tesztek szakaszizolációra, törlésre, source ownership-ra; korlátozott szintetikus browser. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** vizuális selection téglalap; a böngészőmunkamenetben él, M12.8 idején nem volt tartós session export; csatlakozások mennyiségét nem modellezi.

### M12.8.1 — többszakaszos workflow QA/stabilizálás

- **Cél / miért:** új funkció nélkül felmérni két szakasz megőrzését, source/page resetet, coverage és mobil interakció stabilitását, timeoutok gyökerét.
- **Bizonyíték:** dokumentált sötét desktop 1280×720 teszt két SVG rectangle-overlayval; A/B váltáskor gable 6×4 m/25°, hip 7×5 m/30° draft különült. Második PDF/file-picker, multi-page switch, delete/modify, uncovered/unclear teljes browser E2E és kért viewportok nem mind teljesültek. Két 5s timeout teszt önmagában külön futtatva 1.36s és 1.04s alatt ment; terhelésérzékeny tesztidőzítésnek minősült, timeout/kódjavítás nem történt.
- **Elfogadás:** két szakasz adatizolációja részlegesen bizonyított; teljes követelmény nem teljes browser E2E miatt. **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** PDF csere UX kódja van, dialógus/fájlválasztás útvonal nincs minden browser/viewport állapotban bizonyítva. A munkamenet memória-vesztési kockázata megmaradt.

### M12.9 — explicit session export/import és folytatás

- **Cél / miért:** munkamenet-vesztést csökkenteni anélkül, hogy DB-sémát, Auth-ot, RLS-t vagy automatikus mentést vezetne be.
- **Megvalósítás:** `drawing-roof-work-session.ts` verziózott JSON, szigorú Zod séma, 1 MB/30 szakasz limit, kalkulátor-/mező-/anyagparaméter-validálás, PDF SHA-256, explicit export/import. JSON-ból kizártak a PDF bájtok, nyers OCR/PDF tokenek, jóváhagyott forrás-bejegyzések, hitelesítés és korábbi számítás. Import újraszámol és a fedettség/provenance jóváhagyásokat törli. Azonos PDF hash+pageCount esetén kijelölés helperrel újraköthető, de újra jóváhagyandó; más PDF-nél koordináta törlődik, kézi draft megmarad.
- **Építkezés:** M12.8 szakaszmodell, meglévő calculator schema és material validation. UI: `plan-field-transfer.tsx`, hívás a `construction-suite.tsx`-ből.
- **Bizonyíték / elfogadás:** 9 helper teszt; célzott kapcsolódó regresszió 6 fájl/101 PASS; teljes 1378 PASS/19 SKIP; lint/typecheck/build PASS. UI import/export browser E2E **NOT TESTED** (CUA file picker timeout). **PASS WITH LIMITATIONS.**
- **Fennmaradt rés:** explicit export nélkül tab/munkamenet elvesztése adatvesztés; exportfájl bizalmas műszaki adatot tartalmazhat. Nincs automatikus cloud/browser tárolás.

### M12.6 későbbi újraellenőrzése – nem új funkció

2026-10-30-án a már meglévő M12.6 DEMO kompozíciós tesztet négy fájllal, 46 teszttel futtatták. A teljes suite 1378 PASS / 19 SKIP; lint, közvetlen `tsc --noEmit -p tsconfig.typecheck.json`, izolált production build és `git diff --check` PASS. Friss böngészős E2E nem történt: a hozzáférhető Brave lap éles Vercel alkalmazást nyitott, nem a lokális, nem publikált checkoutot. Ez a különbség szerepel a `docs/AI_DRAWING_TEST_MATRIX.md` fájlban. Nem készült új alkalmazáskód.

## 6. Jelenlegi képességek és QA-státusz

Az implementáltság és a bizonyítottság külön tengely. **IMPLEMENTED + PARTIALLY VERIFIED** nem jelenti azt, hogy általánosan megbízható; csak az adott terjedelemben van valamilyen teszt vagy browser proof.

| Képesség | Kódállapot | QA / tényleges határ |
|---|---|---|
| Szöveges PDF PDF.js-feldolgozás, page/text/coordinates | **IMPLEMENTED + VERIFIED** | Unit/compositional tesztek és korábbi browser preview; max limits lásd 4. fejezet. Az egyetlen E-01 korábbi parse nem általános referencia. |
| PDF preview, zoom, 90°-os forgatás és text overlay | **IMPLEMENTED + PARTIALLY VERIFIED** | Korábbi szintetikus browser QA igazolta; minden M12.9 változás utáni kombináció/viewport újratesztje nincs. |
| Szkennelt PDF-oldal OCR | **IMPLEMENTED + PARTIALLY VERIFIED** | Explicit helyi futtatás technikailag működik; szövegréteges PDF útja nem OCR-fallback. E-01 0/15 OCR-pontossági minta miatt mérnöki adatbevitelre nem fogadható el. |
| PNG/JPEG/WebP OCR | **IMPLEMENTED + PARTIALLY VERIFIED** | JPG/WebP/PNG próba létezik; korlátozott DEMO/real sample, nem pontos műszaki pontossági benchmark. |
| OCR-ből automatikus műszaki mezőkitöltés | **NOT IMPLEMENTED** | Tudatos védelem; OCR provenance `unknown/ambiguous`, M12.2 gate BLOCKED. |
| Explicit egységű értékjavaslat / unitless user-selected unit | **IMPLEMENTED + VERIFIED** | Szigorú egy-token parse, manuális mező- és egységválasztás, edit/approval. Nem jelent szakmai mezőbesorolást. |
| Három `roof.rafter-cut` címke-szabály | **IMPLEMENTED + PARTIALLY VERIFIED** | 6 pozitív és 13 negatív/kétes szintetikus példa. Valós, függetlenül annotált tervrajz-korpusz nincs. |
| E-01 alaprajz-védelem | **IMPLEMENTED + PARTIALLY VERIFIED** | Alaprajzi tetőméret külön jóváhagyást kíván, de a jóváhagyás emberi állítás, nem ellenőrzött roof plan. E-01 teljes roof takeoff nincs. |
| Egy tetőszakasz vizuális kijelölése | **IMPLEMENTED + VERIFIED** | Rectangle, page-relative coords, zoom/rotation helper teszt és korábbi browser QA; pixelből nincs mérés. |
| Több szakasz, külön geometry/material draft | **IMPLEMENTED + PARTIALLY VERIFIED** | Unit és korlátozott browser proof. Nem minden add/edit/delete/coverage/file-switch flow teljes E2E-ben bizonyított. |
| Szakaszonkénti tetőgeometria/takeoff | **IMPLEMENTED + PARTIALLY VERIFIED** | Meglévő motorral DEMO 8×6 gable és korábbi két eltérő szakasz-részpróba. Egy aktív szakaszeredmény; no aggregate. |
| Kapcsolatok, vápák, átfedés, közös szerkezeti elem | **NOT IMPLEMENTED** | Nincs metszés/interaction engine; ilyen összesítés nem bizonyítható és nem szabad teljes tetőként mutatni. |
| Hiányzó adat/partial state és menthetőség | **IMPLEMENTED + VERIFIED** | Existing schema validation; részleges draft lehetséges, teljes számítás/mentés csak valid/complete bemenettel. A böngészős állapotok részlegesek. |
| JSON export/import és hash-based selection rebind helper | **IMPLEMENTED + NOT VERIFIED IN BROWSER** | Helper tesztek; fájlválasztó/letöltés/import UI E2E nincs. |
| Automatikus browser/cloud/server munkamenetmentés | **NOT IMPLEMENTED** | M12.9 is explicit export; memóriabeli draft page/document lifecycle-től függ. |
| Teljes E-01 tetőgeometria/material list | **BLOCKED** | Nincs bizonyított roof plan/coverage/section geometry/roof pitch/overhang/connectivity. |

### Tetőgeometria és anyagmotor röviden

- Geometry model a kalkulátornak megadott vízszintes méretekből, alakból és hajlásból készül. A forrásrajzi pixelméret nem input és nem skála.
- Tetőformák: nyeregtető, félnyeregtető, kontytető, sátortető, félkontytető, L-, T-alakú és manzárdtető. E formák létezése a domain enumot/schema-t bizonyítja; egyes speciális csatlakozási vagy anyagkombinációs eredmények korlátosak lehetnek, ezért a megfelelő shape/engine tesztet a Claude önállóan nézze meg.
- Material takeoff part IDs: geometry, rafters, battens, underlay, covering. `QuantityMeaning` megkülönbözteti `GEOMETRIC`, `LAYOUT`, `NOMINAL`, `PROCUREMENT` szemantikát; a kódban a procurement jelenleg fenntartott és a takeoff mennyiségei nem promoválódnak beszerzési mennyiséggé.
- Szarufa/léc: geometriai layout darab, vonalhossz, ahol teljes keresztmetszet ismert névleges térfogat. Cutlist nominal lengths vágási ráhagyás, toldás, selejt nélkül.
- Alátét: csík/kiosztás és bizonyos esetben névleges minimum tekercs; nincs minden felhajtás, áttörés vagy szélességmaradék modellezve.
- Fedés: teljes szélességű oszlopos layout, termék-hatékony szélesség/hossz és átfedés; szabásmaradék-újrafelhasználás, vápa/szegély/hulladék nem teljes. Más terméktípus lehet unsupported/incomplete.
- Anyagprofil választás vagy kézi paraméter a felhasználótól/termékkatalógusból jön. Számított darab/térfogat nem bizonyít gyártói alkalmasságot, statikát, helyszíni vágási tervet, veszteséget vagy végleges beszerzést.

## 7. E-01 – valódi referencia, bizalmas részletek nélkül

Korábbi dokumentáció szerint az E-01 egyoldalas földszinti alaprajz volt, kb. 1190.55×841.89 pt lapmérettel és 467 PDF.js szövegspan-nel. A földszinti rajz külső 17,00×14,50 méretet, további belső/dimenziólánc jelöléseket, 4,0% lejtés feliratot, területi és keresztmetszeti feliratot, valamint teraszok jelölését tartalmazta. E számok/feliratok létezése nem teszi őket tetőméretté. A cím/rajzi típus földszinti alaprajzra utal; tetőkontúr, tetősíkok, gerincvonal, fokban megadott tetőhajlás és ereszkontúr nem volt bizonyítható. A PDF-t nem tettük a repóba, és itt nem ismételjük a title block vagy személyes adat tartalmát.

### Mi kellene valódi tetőmennyiséghez?

- Tetőterv vagy metszet/homlokzat, ami bizonyítja a roof footprint-et, tetőformát, gerincirányt/magasságot, hajlást és eresz/fal kontúrt.
- Szakaszonként bádogos/tervező által megerősített fedettség, horizontális méretek, ereszkiülés és mely terasz/kiugró rész fedett.
- Kapcsolatok: vápa, élgerinc, csatlakozó síkok, közös eresz/gerinc, átfedés és anyaghatárok.
- Anyag/gyártó/profil, effektív fedési szélesség/hossz, átfedés, lemezformátum, alátét adatok, léctávolság, szarufa-kiosztás, keresztmetszet és vágási/beszerzési hossz.
- Statikai méretezéshez terhelés, támaszok, anyagminőség, kapcsolatok, normatív/tervezői ellenőrzés; ezek nem jelenlegi takeoff céljai.

M12 panel használható az E-01-ből kinyert PDF.js szöveget vizuálisan ellenőrizni és méretet felhasználói hozzárendeléssel draftba vinni. Nem tudja meghatározni, hogy a földszinti alaprajzon mely részek fedettek; önmagában semmilyen teljes E-01 tetőanyag-eredményre nem jogosít. E-01-hez bádogossal tisztázandó: mely teraszok fedettek, milyen tetőforma/szakaszok vannak, van-e külön tetőterv/metszet, és mely méreteket kell szakaszonként a tetőgeometriához használni.

## 8. Tesztek és böngészős bizonyítékok

### Legutóbbi összesített tesztbizonyíték

| Kapu | Utolsó dokumentált állapot | Jelentés |
|---|---:|---|
| Teljes Vitest | 213 fájl pass, 8 fájl skip; 1378 pass, 19 skip, 0 fail | M12.9 / M12.6 újraellenőrzési állapot, `npm test`; default suite. |
| M12.6 célzott kompozíciós regresszió | 4 fájl, 46 pass | Közvetlen Vitest binárissal futott; kezdeti RTK parser wrapper próbálkozás önmagában nem adott tesztfutási összesítőt, ezért nem az a bizonyíték. |
| Lint | PASS | `npm run lint`. |
| TypeScript | PASS | M12.6 újraellenőrzéskor `npx tsc --noEmit -p tsconfig.typecheck.json`; korábbi teljes `npm run typecheck` is documented. |
| Production build | PASS | M12.6 újraellenőrzéskor isolated repo copy, `npm run build`, Next.js 16.4.2/Webpack. Isolation azért, mert az eredeti checkout `.next`-ét fejlesztői szerver használhatja. |
| `git diff --check` | PASS | Átadási dokumentum előtt futott; az új handoff fájlra a létrehozás után ismét futtatni kell. |
| M12.2 OCR score | BLOCKED | E-01 0/15 szó szerinti OCR-egyezés. Ne emeld a kaput pusztán unit tesztek vagy magas confidence alapján. |

### Valós böngészős bizonyíték kontra hiány

- **Korábbi pozitív browser evidence:** M12.0/1 PDF.js preview, 467 text source, zoom/forgatás, 0 console warning/error; M12.3B/C draft/unit/file reset, calculator draft isolation és LengthField kijelzés; M12.6 szintetikus egy-szakaszos geometria/material flow, 375×812 és 812×375 dark view, 0 px horizontal overflow; M12.7 rectangle overlay és rotate/zoom; M12.8.1 részleges két szakaszos browser proof.
- **Részleges/NOT TESTED:** M12.8.1 teljes törlés/módosítás/csere/dialogue/coverage állapotú, minden viewportos E2E; M12.9 export-download/import-picker UI; M12.6 jelenlegi checkout helyi source új böngészős futtatása. Utóbbinál az elérhető Brave tab éles Vercel deploymentre mutatott, így nem tekintettük a jelenlegi working tree bizonyítékának.
- **Fizikai eszköz:** fizikai iPhone/iOS billentyűzet, mobil memória és idő nem volt igazolva. Az emulált viewport nem eszközteszt.

## 9. Kockázatok, hibák és adósság – bizonyíték szerinti besorolással

### Bizonyított korlátok (nem feltételezett bugok)

1. Az OCR technikai futása nem hoz elfogadható E-01 műszaki szövegpontosságot: 0/15 pontos találat a címkézett mintán. A kapu BLOCKED.
2. Többszakaszos kapcsolati/összesítési motor nincs. Vápa/átfedés/közös szerkezet miatt totals misleading lehet; UI per-active section only.
3. Munkamenet volatile. `construction-workspace-memory.ts` module-level Map és a rajzpanel state nem perzisztens; session export explicit. Tab/process loss loses unsaved work.
4. Export/import UI file picker/download nincs browser E2E-ben igazolva, helper teszt igen.
5. Fizikai mobil teszt és mobile OCR memory/latency nincs.
6. Az E-01 nem tetőterv, így teljes tető-kalkulációja nem számítható ebből az evidence-ből.

### Architektúra-kockázatok, amelyek review-t igényelnek

- `PlanFieldTransfer` nagy klienskomponensben koordinál file, active page, rotation, proposals, section state, session export/import és geometry/material workflow-t. Ez koncentrált komplexitás, önmagában nem bizonyított hiba; Claude javasoljon simplificationt az elfogadási tesztek ismeretében.
- Szakasz geometry/material draftját `construction-suite.tsx`-ből átadott calculator state és `PlanFieldTransfer` saját state együtt tartja. `LengthField`-nek is van kijelzési piszkozat, a kalkulátordraft mm érték. A M12.3C regresszió ezt a közös életciklust érzékennyé teszi. Source reset/active section switches invariants különösen fontosak.
- A fájlazonosító (`documentId`) és a tartalomazonosító (`sha256`) külön szerepű; a munkamenet újrakötése hash és oldalszám alapján történik. Kövesd végig, hogy hiányzó vagy azonos tartalmú fájloknál a felület minden jóváhagyást töröl-e (a helperben igen), és a felhasználó világos megerősítést kap-e.
- PDF.js/OCR lokális feldolgozás is böngészőmemóriát/CPU-t használ. A limit és worker cleanup adott, de 8 MP canvas, 32 MiB PDF, 100 oldal mellett mobilon tényleges peak memory/latency nincs mérve. Ne feltételezz mobilra biztonságos teljesítményt.
- M12 szakasz state egységesebb domain tágítás nélkül marad: `DrawingRoofSection` generikus UI-modell, material-takeoffhoz specifikus work-session schema. Ha tartós storage vagy más calculator is kapja, schema evolúció, migration/version, org scope, concurrency, audit/retention komoly bővítés.
- Szabályok jelenleg csak ugyanazon span explicit címkéjére támaszkodnak; ez safe, de kevés rajzban alkalmazható. Külön span közelség-alapú összerendelése nem megengedett bizonyíték nélkül.

### Nem bizonyított / nincs aktív igazolt hiba

- A régi `LengthField` HMR-es állapot eredeti gyökérokát nem sikerült rekonstruálni; a célzott draft invalidálási javítás tesztelve van, de ne állítsd, hogy minden böngésző/HMR verseny kizárt.
- Nincs új, jelenlegi M12 konkrét production bug jelentve ebben az átadásban. A felsorolt tételek korlátok vagy review kérdések, nem automatikus hibajegyek.
- Dokumentációs drift létezik (alább); ez bizonyított tartalmi ellentmondás/elavult leírás, nem a program logikai hibája.

## 10. Kód/dokumentáció ellentmondások és working tree

- `docs/PROGRESS.md` M12.7 része történetileg „egyszerre egy szakaszt” ír, M12.8 ezt már több szakaszra bővítette. Ne olvasd az M12.7 bejegyzést aktuális képességnek.
- `docs/AI_DRAWING_IMPLEMENTATION_PLAN.md` fejléc az M12.7 állapotot jelöli; M12.8 és M12.9 utáni részletes funkciólista nincs teljesen átvezetve. Ez tervdokumentum elavultság.
- Tesztmátrix korábbi M12.6 sora browser NOT TESTED-et rögzít a compositional takeoff esetre, miközben a `PROGRESS.md` M12.6 bejegyzése részletes korábbi browser pilotot jegyez. Ezt a handoffban két külön bizonyítékként kezelem: történeti browser pilot volt; a későbbi 2026-10-30 újrafuttatás nem volt browser QA. Matrix row és progress report egységesítését külön dokumentációs feladatként ajánlani lehet.
- M12.8.1 browser QA maga is részleges: desktop 1280×720 sötét állapotban A/B section state részletesen probálva, de kompletten modify/delete/file-change/viewport sweep nem.
- Current git tree includes numerous staged-untracked-in-the-sense-of-working-tree changes: tracked changes in `docs/PROGRESS.md`, `docs/README.md`, dependencies/config, `LengthField`, `construction-suite`, tests; new M12 files/docs/fixtures. They are uncommitted. Git commit list does not represent full M12 lifecycle. Do not reset, checkout, amend or attribute every current diff to a specific milestone without inspecting it.
- At handoff, only this new document was requested. No code/test/config change is made by this handoff task. `docs/PROGRESS.md`/other uncommitted files belong to preceding task/work and are preserved.

## 11. Eredeti cél kontra jelenlegi megvalósítás – GAP

| Eredeti kívánt eredmény | Mostani bizonyított állapot | Gap / hatás bádogosra |
|---|---|---|
| PDF-ről használható méret automatikus leolvasása | PDF text-layer spans reliably extracted; explicit numeric suggestions; limited label rules | Scans/OCR unreliable; many dimensions still manually selected/entered. |
| A rendszer meghatározza, mekkora a tető | Tetőméret csak explicit user-confirmed fields; plan image is visual selection | Roof coverage/form/section boundaries need human interpretation; E-01 cannot yield full area. |
| Hiányzó adatokat egyszerűen kérdezze meg | Calculator required fields and missing state visible; step navigation exists | No intelligent question ordering or high-confidence adaptive questionnaire; user knows source/terms. |
| Material list choice to calculate rafters/material | Existing motor uses profile/manual dimensions and spacing; nominal output | No structural adequacy, actual cutting waste, full purchasing quantities, or complete complex roof connections. |
| One end-to-end workflow | Single-section synthetic flow has compositional and historical browser evidence; multi-section limited | M12.9 browser persistence UI, full mobile and complete multi-section E2E remain gaps. |
| Save/reopen work | JSON file explicit export/import | User must remember export and protect file; no account-linked session, recovery, sync, or concurrency. |
| Real own plan validation | E-01 examined locally and safely; its roof data is insufficient | No verified E-01 result; next genuine proof needs roof plan/sections and expert-confirmed labels/dimensions. |

**Összesített termékértékelés:** M12 érdemben elmozdult a PDF parser PoC-tól a szakaszonként számoló, ember által vezérelt demo workflow felé. A bádogos által kért „tervrajz → tető nagysága → kérdések → szarufák/minden anyag” teljes, valós rajzra működő gyors folyamat még nincs kész. A sikeres DEMO számítás azt igazolja, hogy meglévő engine-en átvihető egy ellenőrzött és teljes input; nem azt, hogy rajzból önállóan megtaláljuk a teljes tetőt.

## 12. Milyen kérdésekre kérünk választ a Claude Opus 5.5-től?

Kérjük, a review legyen kritikus, evidence-based és elsőként read-only. Ne védd a korábbi döntéseket csak azért, mert már implementáltuk őket.

### A. Eredeti cél és termékérték

- Mennyi maradt meg az eredeti ígéretből, ha a bádogos sok mezőt és jóváhagyást kézzel ad meg?
- M12.0–M12.9 közül mely lépések teremtettek közvetlen felhasználói értéket, és melyek voltak főként technikai előkészítés?
- Mi a legkisebb, valós, mérhető workflow, amely már időt spórol egy bádogosnak anélkül, hogy tetőgeometriát találgatna?
- Jól látható-e, hogy „a számítás csak az aktuális szakaszra vonatkozik”, és mely állapotokban válhat félrevezetővé a „material takeoff” kifejezés?

### B. UI/UX és mobil

- A panel egyértelmű-e terv → fedett rész → geometry → material → result útvonalnak? Hol kérünk redundáns megerősítést?
- Mely művelet maradjon külön jóváhagyás, és mely biztonságos döntést lehet eltárolt, visszavonható állapotként kezelni?
- `PlanFieldTransfer` túl sok felelősséget visz-e? Milyen minimális komponens/state határ csökkenti a hibakockázatot refaktorprojekt nélkül?
- Milyen telefonos elrendezést és touch targetet kell valós eszközön mérni? Mely browser gaps blokkolják a használatba adást?
- Hogyan jelölhető még egyszerűbben fedetlen/unclear, partial, incomplete, section-only és no-total állapot?

### C. Műszaki felismerés

- Mely rajzoknál megbízható a PDF text-layer és explicit címkés szabály? Milyen preflight kérdés kell a tervtípushoz?
- Milyen kis, jogszerű, szakember által címkézett benchmark szükséges a M12.2 gate-hez? Milyen mérőszámok (per-dimension exactness, false positive, unit confusion, page/position match) és minimális esetszám indokolt?
- Milyen lokális képfeldolgozási lépés tudja javítani tizedesvesszőt/rotált feliratot mérhetően, és mihin kell elutasítania javaslatot?
- Biztonságos-e külön PDF text span-okat összefűzni, milyen geometriai/layout bizonyíték és annotáció kellene ehhez?
- Mely eseteknél legyen „nem tudom” eredmény, nem javaslat?

### D. Geometria és anyag

- Mely meglévő idealizált alakzatok felelnek meg a mindennapi bádogos felmérésnek? Melyeket kellene elrejteni, amíg szakember jóvá nem hagyja őket?
- A kalkuláció snapshot/provenance megmutatja-e minden számnál, hogy geometriai, layout, nominal vagy actual product input?
- A material groups output korlátai elég jól láthatók-e? Milyen minimum termékparaméter hiányzik a valós fedés/beszerzési eredményhez?
- Melyik geometriai adatot mikor érdemes megkérdezni, és hogyan lehet a profilkatalógus/anyaglistát újrahasznosítani adatismétlés nélkül?
- Milyen szintű kézi kapcsolatjelölés (shared ridge, valley, edge, overlap) adhat értelmes összesítést automatikus metszés nélkül, és milyen esetekben kell total-t tiltani?
- Hol kezdődik statikai/tervezői felelősség, és hogyan ne sugallja ezt a névleges faanyag-kimutatás?

### E. Architektúra, adatvédelem, fenntarthatóság

- A PDF adapter, source model, panel és calculator orchestrator határai fenntarthatóak-e?
- A file/section state-hez milyen invariáns tesztek hiányoznak (PDF change, same hash/new bytes, multi-page, remove active section, import malformed data)?
- Az M12.9 JSON schema túl permissive vagy túl kötött? Hiányzik-e a migrációs terv a v2 formátumhoz?
- Ha account-bound recovery lesz, milyen org isolation, RLS, audit, optimistic concurrency, retention, delete/export és encryption követelmény kell előre?
- Milyen memóriateszt kell 8 MP OCR / max PDF limits mellett iOS Safari és Android Chrome alatt?
- Mi az a duplikált/state logika, amit törölni vagy egyszerűsíteni kell, és milyen kódra mutató reprodukálható evidence indokolja?

### F. Javasolt válaszformátum Claude-tól

1. 5 legfontosabb bizonyíték-alapú megállapítás, súlyossággal és konkrét fájllal.
2. Mely korábbi felhasználói cél teljesült/részleges/nem teljesült.
3. Aktív hiba vs architekturális kockázat vs NOT TESTED elkülönítve.
4. Legkisebb, user-value alapján rangsorolt következő lépések; mi ne épüljön meg.
5. M12.2 gate-hez szükséges bizonyíték- és benchmark terv, automatikus OCR-acceptance nélkül.
6. UI/browser QA terv valódi fizikai mobilhoz és synthetic fixtures-hez.
7. Kódjavítást csak külön jóváhagyott implementációs feladatként javasoljon; ne írjon át DB/Auth/RLS vagy képletet felülvizsgálat során.

## 13. Felülvizsgálati prioritások

1. **Először a terméksiker definíciója:** mi az az egy valós feladat és időmegtakarítás, amit el akarunk érni? A teljes roof plan/OCR automatizálás nem tekinthető közeli eredménynek.
2. **E2E bizonyítékok és docs drift:** a matrix/progress/implementation-plan státuszát igazítsuk össze és jelöljük: historical browser proof vs current-tree NOT TESTED.
3. **Szakasz/dokumentum state invariánsok:** A→B PDF, multipage, active section delete, import+same/different hash, field approval invalidation; mind unit/helper és valódi browser E2E-ben.
4. **Mobil valós eszköz:** 375×812 és fekvő kicsi viewport emuláció mellett iPhone Safari/Android Chrome, keyboard, orientation, memory, scroll, touch hit areas.
5. **OCR program:** csak akkor nyissák újra a M12.2 kaput, ha rendelkezésre áll engedélyezett, reprezentatív és szakember által span/page/unit szinten annotált benchmark, előre rögzített false-positive küszöb és minden téves műszaki javaslat külön elemzése.
6. **Következő üzleti referencia:** E-01 tetőterv/metszet és bádogos által ellenőrzött fedett szakaszok/paraméterek nélkül sem újabb parser, sem további OCR réteg nem oldja meg a hiányzó termékbizonyítékot.
7. **Csak ezután architektúra-átalakítás:** a panel/state refaktor indokát reprodukálható hiba vagy fenntartási költség támassza alá; jelen dokumentum nem rendel el ilyen munkát.

## 14. Ajánlott fájlolvasási sorrend Claude Code-nak

1. Ez a dokumentum: cél, claim scope, státuszok, bizonyíték-korlátok.
2. `docs/PROGRESS.md`: M12.9-től M12.0-ig részletes historikus evidence; vegye figyelembe, hogy az M12.7 bejegyzés történeti.
3. `docs/AI_DRAWING_TEST_MATRIX.md`: pozitív/negatív elvárások és browser NOT TESTED állapotok.
4. `docs/AI_DRAWING_IMPLEMENTATION_PLAN.md`: eredeti biztonsági/architekturális döntések; fejléc M12.7-re datált, tehát current statusként ne fogadja el.
5. `docs/AI_DRAWING_EXTRACTION_RULES.md`: determinisztikus címke-szabályok, kizárások, negatív esetek.
6. Source flow: `src/features/calculators/plan-field-transfer.tsx` → `drawing-field-transfer.ts` → `drawing-value-suggestion.ts` → `drawing-roof-sections.ts` / `drawing-roof-section.ts` → `drawing-roof-work-session.ts`.
7. PDF/OCR adapterek: `src/infrastructure/drawings/drawing-text-source.ts`, `pdf-text-normalizer.ts`, `pdf-text-extractor.ts`, `ocr.ts`; ellenőrizze az AbortError/worker lifecycle és limites ágakat.
8. Calculator bridge/domain: `construction-suite.tsx`, `construction-computation.ts`, `roof-calculator-definitions.ts`, `roof-geometry.ts`, `roof-material-takeoff.ts`, `roof-timber-layout.ts`, `roof-underlay.ts`, `roof-covering-layout.ts`, `roof-material-spec.ts`.
9. Kiemelt tesztek: `drawing-field-transfer.test.ts`, `drawing-value-suggestion.test.ts`, `drawing-roof-section(s).test.ts`, `drawing-roof-work-session.test.ts`, `drawing-roof-takeoff.test.ts`, `pdf-text-extractor.test.ts`, `drawing-text-source.test.ts`.
10. Mielőtt bármit módosít: `git status --short`; jelen checkoutban sok M12 fájl még uncommitted. Ne feltételezze, hogy HEAD tartalmazza a handoffban leírt állapotot, és ne resetelje a munkafát.

## 15. Nyitott döntések és szakemberi jóváhagyás

- **Termék:** mi a legkisebb valós üzleti scope: egy tetőszakasz gyors kalkulációja, vagy több szakasz/fedettség? Ki az első használó, és milyen időmérő feladattal bizonyítjuk a javulást?
- **Műszaki:** mely tervtípusok és mértékek fogadhatók el; milyen minőségű méretet/forrást kell szakembernek jóváhagyni; milyen átfedési/csatlakozási szabály szükséges az aggregate-hoz?
- **Referenciaadat:** ki biztosít E-01-hez jogszerűen használható tetőtervet, metszetet és szakaszonként szakember által jóváhagyott ground truth méreteket? E-01 alaprajz önmagában nem elég.
- **Anyag:** mely termék/adatlap és vágási veszteség szabály alapján nevezhető mennyiségnek „beszerzési lista”? Ki vállalja gyártói és helyszíni megfelelés ellenőrzését?
- **OCR kapu:** mi a tolerált false-positive érték, annotációs folyamat, kép-/rajztípus és független mintanagyság? M12.2 maradjon BLOCKED válaszig.
- **Perzisztencia:** kell-e fiókhoz kötött munkamenet? Ha igen, user/org role, RLS, concurrency, revisioning, retention, export/delete, audit és recovery elvárásokat előbb kell elfogadni.
- **Statika:** a faanyag-kalkuláció nem statikai megfelelőségi ellenőrzés. Minden statikai állítás külön tervezői domain, adat és felelősség.

## 16. Claude Code belépési útmutató

1. Nyisd meg ezt a handoffot, majd a `docs/PROGRESS.md` M12.9–M12.0 bejegyzéseit; a fenti státuszokat ellenőrizd a jelenlegi source-ban.
2. Nézd meg a `git status --short`-ot, és kezeld a jelenlegi uncommitted M12 munkát felhasználói adatként. Ne clean/reset/checkout-olj és ne commitolj.
3. Review módban először olvasd a panel → parser/proposal → existing calculator → session import/export útvonalat. Minden kritika mellé adj pontos fájl/szimbólumot és megkülönböztetést: repro bug / risk / untested.
4. Ellenőrizd saját magad a M12.2 kaput, material motor limitations-t, source approval reset invariánsokat, section isolationt, és hogy a UI sosem állít-e teljes épülettető-összeget.
5. A független review első szakaszában ne futtass teljes tesztet vagy UI/DB mutációt szükségtelenül; ha állítást kell igazolni, indíts célzott tesztet. Böngészőt csak synthetic PDF-fel használj, valódi ügyfélrajz automatizálására ne.
6. Ne állítsd, hogy E-01 tető kiszámítható, az OCR elfogadható, export/import browser E2E bizonyított, vagy a névleges anyagmennyiség végleges beszerzés.
7. Külön javaslatot adj arról, hogy melyik egyetlen következő fejlesztés adná a legtöbb bádogos értéket; ne kezdj el implementálni, amíg nincs külön felhasználói kérés.

**M12.2 állapot:** BLOCKED.
**Commit/push/deploy:** ebben a handoffban nem történt.
