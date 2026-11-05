# Tervrajz-feldolgozás megvalósítási terv

**Verzió:** 0.2.0
**Dátum:** 2026-10-30
**Állapot:** M12.7 **PASS WITH LIMITATIONS**. A PDF-előnézetben egy téglalap alakú, oldalhoz rögzített szakasz jelölhető; a kijelölés nem szolgál mérésre. A meglévő `roof.material-takeoff` motorral szintetikus, felhasználó által jóváhagyott geometriából anyagkigyűjtés készült. Forrásváltás QA-ja **NOT TESTED** a fájlválasztó blokkolása miatt. Az E-01 helyi, csak olvasási renderje földszinti alaprajzot és 17,00 × 14,50 m külső befoglaló méretet mutatott; tetőgeometriát továbbra sem igazol. M12.2 automatikus OCR-pontossági kapu **BLOCKED** marad.

## M12.7 — vizuális tetőszakasz és anyagkigyűjtés

A meglévő PDF.js előnézetre került egy két sarokkal kijelölhető téglalap-overlay. Koordinátái normalizáltak az adott PDF-oldalra, ezért a kijelölés zoomnál stabil, a forgatási eltolással együtt fordul. Kijelölhető, módosítható és törölhető; a fedettség külön `covered` / `uncovered` / `unclear` emberi állapot. Csak fedett állapot és explicit ellenőrzés mellett aktív a meglévő geometriai mezőátvitel. Sem pixelterület, sem lépték nem számítódik.

Egyetlen szakasz kezelhető egy időben. Az overlay nem kerül a kalkulációs snapshotba, csak az aktuális panelmunkamenetben él. Több szakasz eredményét nem vonjuk össze, a teljes épülettető lefedettségét az alkalmazás nem állapítja meg automatikusan. A geometria, az anyagkiosztás és a felhasználó/gyártó által adott anyagparaméterek továbbra is a meglévő kalkulátorokból származnak; a számított anyagkiosztás nem beszerzési veszteségterv és nem statikai igazolás. A szintetikus böngésző-pilot és a nem ellenőrzött fájlcserés QA részletei a [fejlesztési naplóban](PROGRESS.md) és a [tesztmátrixban](AI_DRAWING_TEST_MATRIX.md) szerepelnek.

## Audit és architekturális határ

- A közös építési kalkulátorkatalógusban 31 típus van; az első pilot `roof.rafter-cut` volt. A felhasználó külön kérésére a biztonságos, ember által ellenőrzött draftátviteli panel mind a négy jelenlegi `roof` kategóriájú kalkulátorra kiterjed. Ez nem automatikus műszaki mezőillesztés.
- M12.0–12.2 a kliensoldali PDF/OCR motor és fejlesztői diagnosztika. M12.3A–C a meglévő kalkulátor draftjához ad ember által jóváhagyott, helyben végzett átvitelt; képletet, automatikus mentést, adatbázist, jogosultságot, Auth-ot vagy hosted konfigurációt nem módosít.
- A PDF bájtjai csak a böngésző memóriájába kerülnek. Nincs API-feltöltés, külső AI, Supabase, tartós böngészőtár, automatikus kalkuláció vagy mentés.

## M12.0 — szöveges PDF PoC

Elkészült. A szintetikus PDF-en a szöveg, oldal, oldalméret és kezdőpont Vitestben és böngészőben ellenőrzött. Next.js 16.4.2/Webpack alatt a PDF.js 6.4.299 és a worker buildelhető. A korábbi E-01 helyi olvasási próba 467 pozíciót adott. M12.0 idején a teljes suite két régi teszteltérés miatt piros volt; ezeket az M12.1 regressziós javítása rendezte, lásd a tesztmátrixot.

## M12.1 — kliensoldali feldolgozó alapmotor

**Elkészült, korlátozásokkal.** A `src/infrastructure/drawings/` réteg lusta PDF.js betöltést használ (Node teszthez legacy build, böngészőben normál build), szekvenciálisan dolgozza fel az oldalakat a `streamTextContent()` API-val, és kiadja az eredeti szöveget, oldalszámot, elforgatott oldalméretet, módszert, normalizált kezdőpontot és — csak megbízható geometria esetén — szövegfutam-befoglalót. A pozíció forgatott, 1× PDF-viewporthoz viszonyított normalizált koordináta; a zoom csak az előnézet méretét módosítja. Az overlay a viewport- és renderelési elforgatást együtt alkalmazza.

A normalizáló NFC/whitespace normalizálást és általános lexikai tokenizálást végez. Egyértelmű magyar tizedesvesszőt ismer fel, de nem konvertál mértékegységet, nem rendel műszaki kategóriát és nem következtet kalkulátormezőre. A PDF.js text item `width`/`height` és transzformáció alapján számított keret a szövegfutam metrikai befoglalója, nem tinta-/karakterpontos glyph-határ; bizonytalan vagy lapon kívüli geometria esetén a keret/pozíció `null`.

Védelmi korlátok: fájl legfeljebb 32 MiB, legfeljebb 100 oldal, 100 000 szövegelem, 5 MiB összes szöveg és 200 000 lexikai token; az előnézeti canvas legfeljebb 8 000 000 pixel. A bemeneti `Uint8Array` PDF.js-nek átadása másolatot készít, tehát a fájlra legfeljebb két 32 MiB-os JS bájttömb jut; az 8 MP RGBA canvas elméleti pixeltára 32 MB. Ezek felső korlátok, nem teljes eszközmemória-garanciák vagy mobileszközön mért ajánlott értékek; a PDF.js belső memóriája és a böngésző további allokációi ezen felül jelentkeznek. A feldolgozás megszakítható, a PDF.js dokumentum és oldal erőforrásai felszabadulnak.

A jelszóvédett PDF nem támogatott; sérült/nem olvasható és túl nagy/túl összetett PDF kontrollált hibát ad. Csak PDF szövegréteggel rendelkező tartalom nyerhető ki. Szkennelt, képalapú PDF esetén az eredmény üres szöveg lehet; automatikus OCR nincs.

Fejlesztői ellenőrző felület: `/devtools/m12-pdf` (`src/app/devtools/m12-pdf/`). A route `NODE_ENV !== "development"` esetén `notFound()`-ot ad. A production build sikeres, és production szerveren a route böngészőből 404-re futott.

### M12.1 kapu

**PASS WITH LIMITATIONS.** Szintetikus többoldalas/forgatási/koordináta és hibahatárok unit tesztjei PASS; tényleges böngészős E-01 olvasási próba PASS (1 oldal, 467 szövegelem; 2× zoom és +90° forgatás mellett preview/overlay állapot követhető; 0 browser warning/error). A Next build kibocsátotta a worker assetet, a browser workerSrc lokális assetre mutatott, a PDF.js parse/render sikerült; a browser eszköz nem adott külön Worker-instance/network response introspekciót, a PDF.js saját verbosity=0 diagnosztikája némított. Teljes Vitest, lint, typecheck, production build és diff-check PASS. A teljes mérföldkő nem tekinthető építészeti rajzfelismerésnek, mert nincs OCR, műszaki osztályozás, méretértelmezés, címkézett pontossági minta vagy kalkulátorkapcsolat. Fizikai mobil és más böngésző nem tesztelt.

## M12.2 — helyi OCR alapmotor

**Alapmotor: PASS; valós tervrajz kapu: BLOCKED.** A `tesseract.js@7.0.0` pontosan rögzített és kompatibilis a Next.js 16.4.2/Webpack builddel. A diagnosztika JPG/PNG/WebP képet és explicit indítású, szövegréteg nélküli PDF-oldalt kezel; szövegréteges PDF OCR-jét a publikus út visszautasítja. A korlátozott benchmarkhoz az E-01 egyetlen oldala kizárólag lokális, memóriabeli fájlútvonalon futott, a PDF.js szövegrétegét és OCR-eredményét külön tartva. Nem került fájlba, repóba, logba vagy külső szolgáltatásba.

Az OCR worker, LSTM WASM core-változatok és `hun.traineddata.gz` a saját `/ocr/` útvonalról jönnek; `workerBlobURL: false`, explicit helyi útvonalak és `cacheMethod: "none"` miatt nincs CDN vagy tartós nyelvimodell-cache. A `public/ocr/THIRD_PARTY_NOTICES.md` és licencállományok jelzik az Apache-2.0 forrásokat. A telepítés 12 csomagot adott hozzá; npm 0 audit-sebezhetőséget jelzett. Az install-script engedélyezési figyelmeztetést kaptunk fsevents és Tesseract donation postinstall miatt; ezeket nem futtattuk.

Védelmi korlátok: OCR kép legfeljebb 16 MiB, renderelt/feldolgozott canvas legfeljebb 8 MP. JPG/PNG/WebP fejlécből legfeljebb 1 MiB beolvasásával a rasterméretet dekódolás előtt ellenőrzi, majd a dekódolt bitmapet is ellenőrzi. Az OCR ROI opcionális, normalizált (x/y/szélesség/magasság) terület, 1× vagy 2× méretrészlettel. PDF-oldal renderelése 8 MP-re korlátozott és csak a felhasználó explicit OCR-műveletére fut. Worker lezárás, canvas-nullázás, kép bitmap bezárása és PDF.js erőforrás-zárás finally ágban történik; megszakítási jelet a worker és render kezel.

**Szintetikus böngészős eredmény:** a 1600×800, jogtiszta `public/ocr/fixtures/synthetic-drawing.png` képen 3 sort adott vissza. A mért sorok: `DEMO TETO 1450 m` (57%, `ambiguous`; az eredeti 14,50-ből elveszett a tizedesvessző), `GERINC 8.20 m` (67%, `unknown`) és `FAL 38 cm` (95%, `unknown`). A PDF.js-szel renderelt, csak képet tartalmazó `synthetic-scanned-drawing.pdf` ugyanazt a három sort adta, `DEMO TETO 14,50 m` (56%, `ambiguous`), `GERINC 8.20 m` (73%) és `FAL 38 cm` (95%). Feliratok bounding boxai a szintetikus kép ismert helyére estek; a koordináták a teljes, elforgatás utáni oldal 0..1 területén vannak. A valódi appböngészőben mindkét OCR útvonal lefutott. Böngészőkonzol: **0 warning / 0 error**. Az OCR nem küldte ki a fájlt; a runtime same-origin assetekről töltődött.

Az OCR-confidence nem pontossági százalék és nem igazolja a feliratot. 60 alatti érték `ambiguous`, a magasabb is `unknown`; nincs műszaki kategória, mértékegység-átváltás vagy kalkulátorbemenet. A 2× részlet egy külön Node kísérletben helyreállította a `14,50` alakot a szintetikus képen (kb. 66 ms → 168 ms OCR-idő), de nem alkalmazzuk alapértelmezetten. PSM 11 kismértékű konfidencia-emelkedést, PSM 7 többsoros mintán hibás olvasatot adott; a kontraszt- és élesítés-kísérletek nem oldották meg következetesen a vesszővesztést. Ezek kicsi DEMO mintán végzett irányadó próbák, nem reprezentatív pontosságmérések.

### E-01 valódi tervlap benchmark (2026-10-30)

Az 1 oldalas, 1190.55 × 841.89 pt E-01-et PDF.js dolgozta fel lokálisan: 467 span (346 nem üres szövegdarab). Ugyanazon lapot Tesseract.js renderelt 2× cropon. A title block és személyes/kapcsolati mezők nem kerültek OCR ROI-ba, konzolba vagy jegyzetbe; fájl semmilyen tartós helyre nem került.

| E-01 képen kézzel ellenőrzött jelölés | PDF.js | Széles ROI OCR 1×/2× | Célzott 90° OCR | Értékelés |
|---|---|---|---|---|
| 14,50 (függőleges méret) | `14,50` | a teljes méretlánc összeolvadt | `14.50`, 81% / `14.50`, 79% | konfliktus; vessző ponttá változott |
| 3,85 (függőleges méret) | `3,85` | nem párosítható megbízhatóan | `3.85`, 78% / `3.85`, 88% | konfliktus; vessző ponttá változott |
| 17,00 (teljes méret) | `17,00` | `17.00`, 61% (2×) | — | konfliktus; az OCR kimenet `unknown` |
| 4,55 (részméret) | `4,55` | `455` (1×), `4.55` (2×) | — | tizedesjel elvész vagy ponttá változik |
| 2,35 (részméret, 1) | `2,35` | `2.35` (1×), `235` (2×) | — | nem stabil; vessző/pont és számjegyhiba |
| 2,35 (részméret, 2) | `2,35` | `2.35` (1×), `2.35` (2×) | — | vessző ponttá változik |
| 7,75 (részméret) | `7,75` | `775` (1×), `7.75` (2×) | — | 1× tizedesjel-vesztés, 2× pont-helyettesítés |
| 9,20 (belső méretlánc) | `9,20` | nem párosítható megbízhatóan | — | nincs biztonságos OCR-egyezés |
| 4,30 (belső méretlánc) | `4,30` | nem párosítható megbízhatóan | — | nincs biztonságos OCR-egyezés |
| 1,55 (részméret) | `1,55` | nem párosítható megbízhatóan | — | nincs biztonságos OCR-egyezés |
| 1,50 (részméret) | `1,50` | nem párosítható megbízhatóan | — | nincs biztonságos OCR-egyezés |
| 2,00 (részméret) | `2,00` | nem párosítható megbízhatóan | — | nincs biztonságos OCR-egyezés |
| 12×16,25/27 (keresztmetszetjelölés) | `12x16,25/27` | nem adott teljes, párosítható olvasatot | — | keresztmetszetként OCR-rel nem igazolt |
| 4,0% (lejtésjelölés) | `4,0%` | nem adott helyes, párosítható olvasatot | — | OCR-lejtés felismerése nem igazolt |
| 43,38 m² (területjelölés) | PDF.js több spanra bontja (`43,38 m` + felső index `2`) | nem adott teljes, párosítható olvasatot | — | területként nem használható |

Képi kontroll során a PDF.js piros szövegkezdőpontjai és keretei a két célzott felirat fölé estek; a célzott OCR bounding boxok is a megfelelő felirat környezetébe estek. Ez 2/2 célzott doboz helyesség, de nem jelenti a méret helyes olvasását. A minta szigorú, szó szerinti pontossága **0/15 (0%)**; két célzott sor helye egyezett, a szövegérték egyiknél sem. A széles ROI-ban a 15 feliratból 13-hoz nem volt biztonságosan összerendelhető OCR-sor. A lejtés és területjelölésre használható olvasatot nem adott. `12×16,25/27`, `15/15` és `30/30` keresztmetszetszerű rajzi jelek láthatók, de nincs igazolt OCR-olvasat; keresztmetszet-felismerés támogatottként nem állítható.

| Mérési adat | Eredmény |
|---|---|
| PDF.js | 15/15 vizuálisan mintavételezett karakterlánc visszakereshető a szövegrétegben; ebből a terület két spanból áll |
| Tesseract pontos egyezés | 0/15 a kézzel ellenőrzött mintán |
| Tizedesjel-hiba | legalább 7/15: két célzott vessző→pont, három széles ROI-vesztés, két széles ROI pont-helyettesítés; a széles ROI hibái közül néhány sor duplikáltan érinti ugyanazt a feliratot |
| Téves számalak | legalább `455`, `235`, `775`; a `1450` hibát a DEMO JPG/WebP ismételte, E-01 célzott OCR-je `14.50`-et adott |
| Bounding box | célzott OCR 2/2 vizuálisan helyes hely; széles ROI sorai több helyen összeolvadtak, átfedő méretláncra nem megbízható |
| Konfliktus / bizonytalanság | 2 célzott PDF.js↔OCR konfliktus; 13/15 nem biztonságosan párosítható; 0 automatikusan biztosnak minősített műszaki adat |
| Idő | széles OCR: kb. 10,7 s 1×, 16,9 s 2×; célzott 90° ROI: kb. 6,8 s 1×, 5,7 s 2× (böngészőben mért egyedi futások, nem stabil benchmark) |
| Memória | nem mérhető megbízhatóan browser API-ból; 2× E-01 teljes render kb. 4 MP × 4 bájt ≈ 16 MiB canvas pixelpuffer, OCR/WASM és PDF.js további memóriaigényével |

`1450` és `14,50` között nincs automatikus konverzió. OCR-pont (`.`) és magyar vessző (` , `) közötti eltérés is conflict marad; a normalizáló lexikai tokeneket őriz, nem állapít meg egyenértékűséget vagy mértékegységet. Automatikus illesztés (M12.3B) felé csak a módszer, motorverzió, oldal, nyers szöveg és képen ellenőrzött normalizált bbox adható át `unknown`/`conflict` forrásbizonyítékként. M12.3A-ban csak a felhasználó által begépelt és a rajzképen külön ellenőrzött adat kerülhet draftba, explicit mező- és egységválasztással; a PDF/OCR-kimenet maga soha nem lesz numerikus kalkulátorérték.

A szintetikus 1600×800 PNG-ből helyben előállított JPG/WebP fájlokon is tényleges böngészős OCR futott. Mindkettő 3 sort adott, és mindkettő a szándékos `14,50` értéket `1450`-nek olvasta (73% JPG, 74% WebP); `8.20 m` és `38 cm` sorok megmaradtak. Ez a formátumutat igazolja, nem plusz pontosságot.

Három kézírás-hatású, méretezett szintetikus vázlat készült (`sketch-readable.png`, `sketch-ambiguous.png`, `sketch-missing-label.png`) és valós böngészőben futott. A „readable” vázlat 3,20 m méretét `3.20m`-ként, 39%-os confidence-szel adta vissza (`ambiguous`); átfedő méret `1,00 X 7,0` lett 52%-kal (`ambiguous`); hiányzó méret esetén a vázlat feliratát olvasta, a dimenzióvonalakat nem minősítette adatnak. Ezek fonttal rajzolt szintetikus esetek, nem valódi kézírás-referenciák; a kézírásfelismerés **nem támogatott**. Nincs valódi, anonimizált tervrajzból álló címkézett OCR pontossági készlet és nincs fizikai mobilteszt. A 16 MiB és 8 MP határ kódolt, de a mobil csúcs-memória/latencia nincs mérve.

Kimeneti szerződés: `DrawingTextSource` (`src/infrastructure/drawings/drawing-text-source.ts`) egységesen ad `sourceDocumentId`, 1-alapú `pageNumber`, `originalText`, normalizált szöveget/tokeneket, normalizált pozíciót/keretet, `method`, verziózott `engine`, OCR `confidence | null` és `uncertainty` értéket. PDF.js: `pdf-text` / `pdfjs-dist@6.4.299`, confidence `null`. OCR: `ocr` / `tesseract.js@7.0.0`. Bármely szám műszaki jelentése unknown marad. Ez az M12.3 forrásmegjelenítő szerződésének bizonyított alapja, nem kalkulátor-API.

A helyi Tesseract v7 modell és asset csomag teljes mérete kb. 22 MiB (`public/ocr/`); a felhasználónál első alkalommal ennyi statikus adat letöltése várható. SHA-256: worker `576b7df7e3393e137e51849357c9adb53fe7ac1bb69bfa06cf3d61520f182c6d`; magyar modell `5485218d78cab6eb71e0709492448036012c4e4317d8e68b6355953f6414bf0f`; WASM core: LSTM `66b17df6e20c5329a17ffa9c202a47eaa3e32500b253d4c7f38e7f2bc01457c3`, SIMD `34e8d50cac216427d86bf397d610fdd9f49492539bbcdfbfccc4eda20c810bea`, relaxed SIMD `7985c92d4c64e7267d24cadffe1b2a1da6bf8aa55fdcaf953fe94fe122a24545`.

## Következő fázisok

### M12.5 — valós alaprajzra vonatkozó korlátozott geometriaátvitel (2026-10-30)

Az E-01 helyi PDF.js-szövegrétegén ugyanazon oldal egyértelmű `FÖLDSZINTI` + `ALAPRAJZ` címe alapján felismerhető a rajztípus. A földszinti alaprajz teljes külső mérete, belső méretlánca, teraszfelirata, területjelölése és százalékos lejtése önmagában nem tetőgeometriai bizonyíték. A panel figyelmeztet, hogy a tetőalakzatot és a fedett tetőszakasz valódi méretét ellenőrizni kell; tetőgeometriamező mentetlen draftba vitele egy további explicit megerősítést kér. A százalékos szöveg nem vihető át fok mezőbe. Ez nem ad automatikus javaslatot a felsorolt alaprajzi számokra.

A fokozatos átviteli audit igazolta: egy külön érvényes mező átvihető mentetlen draftba úgy is, hogy a többi kötelező adat hiányzik. A mezőszintű validáció és felülírásvédelem marad, a hiányzó mezők megjelennek, teljes számítás és mentés csak a meglévő teljes inputkapun keresztül történik. A material-takeoff és timber-cutlist meglévő alakzat-/mezőrendszerét használjuk; képlet, mentési validáció és számítási motor nem változott.

E-01 alapján továbbra is hiányzik: fedett tetőszakaszok/teraszok meghatározása, tetőforma, gerincirány és szakaszszám, szakaszonkénti geometria, fokban mért hajlás és ereszkiülés, valamint fedőanyag és anyagspecifikáció. A jelenlegi leegyszerűsített L/T alakkalkulátor nem igazol tetszőleges vagy többféle csatlakozó tetőszakaszt. A tényleges anyagkimutatáshoz bádogos által ellenőrzött tetőterv, metszet vagy méretlista szükséges.

Szintetikus földszinti alaprajz regresszió: 0 rafter-cut mezőjavaslat a külső méretre, méretláncra, teraszra, `4,0%`, területre és keresztmetszetjelölésre; külön unit tesztek igazolják az oldalankénti PDF.js címfelismerést, a geometriamező-megerősítési kaput és a százalékból fokot beviteli tiltást. Célzott Vitest **2 fájl / 59 teszt PASS**; teljes Vitest **209 fájl PASS, 8 SKIP; 1361 PASS, 19 SKIP, 0 FAIL**; lint, izolált typecheck/build és diff-check PASS. A valós böngészős fájlbetöltés és viewport QA ebben a futásban NOT TESTED; részletek a tesztmátrixban. M12.2 **BLOCKED** marad.

### M12.2 — OCR

Elkészült a fenti korlátozásokkal. Új OCR-engine vagy nyelvi modell csak mért, címkézett mintakészlet és mobilmemória/latencia eredmények alapján mérlegelhető.

Csak szkennelt, jogtiszta és címkézett referenciakészlet, mért minőség és memória/latencia eredmények után. A Tesseract.js helyi, verziózott worker/WASM/nyelvi asseteket igényelne; OCR legyen külön módszer, bizonytalanságnál `unknown`, automatikus külső CDN nélkül.

### M12.3A — végső funkcionális/adatvédelmi QA (2026-10-30)

- Mind a négy roof kalkulátorban hitelesített DEMO műhelyben, szintetikus, helyi PDF-ből, kézi mező-hozzárendeléssel és külön jóváhagyással draftátvitel futott. Rafter: 3000/2000 mm → 3605,551 mm és 33,69°. Truss: 6000/2000 mm, 6 osztás → 3605,551 mm fél felső öv, 33,69°, 500 mm osztás; hiányos inputnál approve disabled. Material takeoff: 10000/8000 mm, 30° → 92,38 m² geometriai tetősík és 80,00 m² vetület; anyagcsoport hiányában a meglévő számítás nem menthető. Timber cutlist: a 10000/8000 mm és 30° geometria átkerült; anyagspecifikáció hiányában a meglévő validáció hiányosként jelezte; mentés nem történt.
- A material/timber próbánál reprodukáltuk, hogy a jóváhagyási panel a kiválasztott nyeregtetőnél rejtett shape-specifikus adatokat is hiányzóként követelt. A kapu a meglévő `isFieldVisible` helperhez igazodott. Új `missingRequiredDrawingFields` regressziós teszt RED állapotban a hiányzó helper miatt, majd GREEN állapotban; célzott file 10/10 PASS és böngészős approval PASS.
- A szintetikus PDF parse/render tényleges böngészőben futott. 125% zoom és +90° forgatás után a kiemelő overlay vizuálisan a kijelölt forrásfelirathoz igazodott. Browser konzol a záró menetben 0 warning/0 error. A Worker objektum/hálózati válasz külön introspekciója a CUA-val nem elérhető. A korábbi valós Tesseract szintetikus PNG tesztben a `1450` jelölt `ambiguous`, nem autofill; 375 px light/dark bizonyíték korábbi futásból. Fizikai iPhone, natív keyboard és iOS PWA NOT TESTED.
- **Adatvédelmi eredmény: PASS WITH LIMITATIONS.** Az incidens gyökéroka selector-ambiguitás: a Playwright a többes találat ARIA-címkéit visszaadta a saját selector-diagnosztikájában; a dokumentumszöveg UI/accessibility tartalomként látható. A PDF/OCR feldolgozó és hibakezelés nem logolja a szöveget, hibájuk statikus általános üzenet. A `/devtools/m12-pdf` diagnosztika szöveget mutat, de csak development módban fut. A böngésző-kiegészítők és minden lehetséges külső telemetria nem auditált; ezért az incidens teljes körű adatvédelmi lezárását nem állítjuk. E-01-et ebben a záró QA-ban nem nyitottuk meg; kizárólag szintetikus adatot használtunk, majd azt elvetettük.
- **Ellenőrzés:** teljes `npm test` 208 file PASS, 8 SKIP; 1310 PASS, 19 SKIP, 0 FAIL. `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: PASS. A 413 és PDF renderer mock régi regressziós teszt jelenlegi teljes futása PASS.
- **Kapu:** M12.3A **PASS WITH LIMITATIONS** szintetikus, nem OCR-alapú mezőátvitelre mind a négy tetőkalkulátoron. A fájlok memóriában maradnak, a jóváhagyás mentetlen draftot frissít, kalkulátorséma/validáció és mentési jogosultsági út változatlan. M12.2 OCR pontossági kapuja változatlanul **BLOCKED** (E-01 0/15 pontos OCR-egyezés). Ez nem bizonyít automatikus felismerést vagy általános OCR-támogatást.

### M12.3B — mértékegységes PDF-szöveg értékjavaslata (2026-10-30)

> Történeti állapot: az itt leírt egység nélküli értékek elutasítása az M12.3B lezárásakor volt érvényes; M12.3C ezt explicit, feliratonkénti felhasználói egységválasztással bővítette.

**PASS WITH LIMITATIONS.** A meglévő, felhasználó által kiválasztott PDF.js szövegforráshoz csak egyértelmű, explicit mértékegységű, egyetlen numerikus hossz-, szög- vagy darabszám-tokenből készül értékjavaslat. A hossz mm/cm/m között konvertálható; fok és egész `db` csak saját dimenziójába kerül. A mező kiválasztása továbbra is kézi; az érték szerkeszthető, hozzáadása és végső draftátvitele külön emberi jóváhagyást kér. Meglévő értéket külön felülírási jelölő véd.

- Nem készül PDF/OCR alapú mezőosztályozás vagy kérdésgenerálás. OCR-forrás soha nem kap numerikus javaslatot. Egység nélküli `17,00`/`1450`, százalékos lejtés, m², keresztmetszet (`12x16,25/27 mm`), több méretet tartalmazó sor, nem pozitív érték vagy dimenzióütközés elutasított. `1450` nem alakul `14,50`-né. A tizedesvessző/pont lexikai alakja megmarad, bizonytalan szövegre nincs találgatás.
- A mértékegység-normalizáló szintetikus esetei és meglévő átviteli validációi teszteltek. Böngészőben 7 szövegspanos szintetikus PDF-ből `8,20 m` → `8200 mm` javaslat, kézi mezőválasztás/jóváhagyás után 820 cm megjelenítés és 8440,379 mm eredmény igazolt. A hiányzó gerincemelkedés miatt a jóváhagyás kezdetben letiltott; kézi megadás után engedélyeződött. A meglévő 3000 mm érték felülírása külön megerősítést igényelt. Adatmentés nem történt.
- Korlát: kizárólag expliciten mértékegységes PDF.js-szöveg lexikai javaslata. Valódi rajzokon a PDF-szövegréteg műszaki jelentése továbbra sincs validálva; OCR/automatikus besorolás, keresztmetszet, felület, lejtés, kézírás és más rajztípus nem támogatott. Korábban megnyitott, fejlesztői hot reloadon átesett tabban egy stale hosszmező-draft kijelzése eltért az átvitt értéktől; ennek pontos gyökéroka nem igazolt. Tiszta böngészőtabban az átvitt 8200 mm 820 cm-ként jelent meg, a számítás pedig 8440,379 mm-t adott. A friss tab konzolja: 0 warning / 0 error.
- **Záró ellenőrzés:** a 2 további több-szám-token regressziós esettel célzott Vitest **3 fájl / 35 teszt PASS**. Teljes Vitest **209 fájl PASS, 8 SKIP; 1327 PASS, 19 SKIP, 0 FAIL**; `npm run lint`, `npm run typecheck`, `npm run build` (Next.js 16.4.2/Webpack) és `git diff --check`: **PASS**. A fejlesztői szervert a typecheck/build előtt leállítottuk.
- **Javasolt Conventional Commit:** `feat(M12.3B): suggest explicitly unitized PDF values`.

### M12.3C — explicit forrásegység és biztonságos draftátvitel (2026-10-30)

**PASS WITH LIMITATIONS.** A PDF.js `pdf-text` forrásból származó egyetlen pozitív, egység nélküli numerikus token mm/cm/m kiválasztása után a meglévő, mm-ben tárolt hosszmezőre konvertálható. Az egységválasztás feliratonkénti, nincs oldal-szintű öröklés; fájl-/oldal-/forrásváltáskor törlődik. A rajzon explicit egység (`8,20 m`) mindig elsőbbséget kap. OCR, méretarány, százalék, terület, keresztmetszet, több számot tartalmazó vagy nullánál nem nagyobb token nem ad numeric javaslatot. A célmezőt továbbra is a felhasználó választja, minden draftátvitel külön jóváhagyást igényel. A korábban igazolt működés megmarad; az M12.3C utó-QA a fájlcserét és a pontos mobil viewportokat nem tudta újra igazolni.

- Az overlay-gomb és a forrásszöveg-lista közös forrásváltó resetet használ: unit, field, value, overwrite és reviewed állapot egyaránt ürül. A hibát előbb valódi böngészőben reprodukáltuk (cm átszivárgott a következő unitless forrásra), a javítás után ugyanaz az új forrás üres egységgel, javaslat nélkül jelent meg.
- A stale LengthField jelenség kezelése célzott: átvitelnél csak a módosított mm-mezők saját UI-draftjai törlődnek; a kanonikus kalkulátordraft és az átvitt érték szinkronizálódik. Új memória-helper teszteli a csak megcélzott mezők törlését. Az eredeti, HMR utáni történeti állapot pontos gyökéroka teljesen bizonyíthatóan nem rekonstruálható.
- Szintetikus böngészőbizonyíték a korábbi M12.3C körből: `17,00` + cm → `170 mm`; `8,20 m` → `8200 mm`; kötelező adat hiányában approve tiltott; kézi pótlás után a meglévő számítás 5002,889 mm gerendahosszt és 88,053° függőleges vágásszöget adott. A dokumentum nem rögzítette, hogy a `170 mm`-t melyik mezőre vitték át. Matematikailag ez az eredmény 5000 mm félfesztáv + 170 mm `riseMm` (Gerincemelkedés) mellett áll elő; a tetőhajlás ekkor 1,947°. A rafter-cut bemeneti validáció a hosszakat pozitív, legfeljebb 1 000 000 mm értékre korlátozza, ehhez nincs hajlásszög-határ. A rokon tetőgeometria validálása külön `<80°` tartományt használ, de alacsony hajlásra nincs megállapított figyelmeztetési küszöb. Gyártói minimum nélkül csak általános, nem blokkoló „ellenőrizd a fedés gyártói minimális hajlásszögét” megjegyzés volna szakmailag óvatos; meglévő szabály hiányában ezt nem implementáltuk.
- Utó-QA (2026-10-30): két jogtiszta, kétszintes DEMO PDF (`/tmp/tetopro-m123c-a.pdf`, `/tmp/tetopro-m123c-b.pdf`) készült. A Codex in-app böngésző megjelenítette az autentikált helyi kalkulátort, de a fájlkiválasztó eseményt nem nyitotta meg; ezért A→B csere, mező/unit reset, fájlváltás utáni draft, LengthField és konzol **NOT TESTED ebben a körben**. A telepített Brave-ben a helyi `/kalkulatorok` auth nélküli `getProjectOrganization` állapotban üres oldalt adott (`200`, csak skip-link; konzolhiba nélkül), így nem volt elérhető az autentikált DEMO út. 375×812 és 812×375, világos/sötét QA **NOT TESTED**; a CUA nem ad pontos viewport-override API-t, fizikai iPhone szintén **NOT TESTED**. A korábbi kétoldalas oldalcserés és kalkulátor-draftizolációs bizonyíték változatlanul történeti bizonyíték, de az új fájlcserére nem vonatkozik.
- Friss minőségi kapuk izolált `/tmp` munkapéldányban (dev szerver az eredeti `.next`-et használta): célzott **4 fájl / 42 teszt PASS**; teljes Vitest **209 fájl PASS, 8 SKIP; 1333 PASS, 19 SKIP, 0 FAIL**; lint, typecheck, Next.js 16.4.2/Webpack build **PASS**. A teljes tesztben két nem blokkoló, korábbi dashboard `priority` attribútum React-figyelmeztetés jelent meg. `git diff --check` a záráskor futtatandó. M12.2 valós OCR kapu **BLOCKED** változatlan.
- **Javasolt Conventional Commit:** `feat(M12.3C): require explicit units for unitless drawing values`.

### M12.4 — explicit rafter-cut mezőjavaslat és fokozatos átvitel (2026-10-30)

**Státusz: PASS WITH LIMITATIONS.** A korábbi átviteli kapu a kalkuláció teljességét követelte, ezért egyetlen ellenőrzött méret jóváhagyását is blokkolta hiányzó kötelező adat esetén. A kliensoldali jóváhagyási helper most csak az átadott célmezőket validálja és engedi az érvényes részhalmaz mentetlen draftba vételét. A `missingRequiredDrawingFields` a látható, még hiányzó kötelező bemeneteket jelzi. A teljes számítás és szerveroldali mentés meglévő complete-input útja változatlan; képlet, szerveroldali mentésvalidáció, DB/Auth/RLS nem változott.

Az új `suggestRafterCutField` kizárólag a `roof.rafter-cut` kalkulátorra, a `pdf-text` módszerre, `pdfjs-dist@6.4.299` motorra, igazolt dokumentum-/oldalazonosítóra és nem-null pozícióra/keretre korlátozott. Ugyanazon egyetlen PDF.js text spannek pontosan az alábbi explicit címke, kettőspont, egy pozitív szám és `mm|cm|m` egység szerkezetet kell hordoznia:

| Elfogadott címke (szinonima) | Célmező | Szabályazonosító |
|---|---|---|
| `Fél fesztáv` (`Fél tetőfesztáv`) | `horizontalHalfSpanMm` | `M12.4.RAFTER.HALF_SPAN` |
| `Gerincemelkedés` (`Tetőemelkedés a gerincig`) | `riseMm` | `M12.4.RAFTER.RIDGE_RISE` |
| `Vízszintes ereszkiülés` (`Eresz vízszintes kiülése`) | `eaveProjectionMm` | `M12.4.RAFTER.HORIZONTAL_EAVE_PROJECTION` |

Az explicit mm/cm/m érték mm-re konvertálódik. A forrás span nyers szövege, dokumentumazonosítója, oldala, helye, kerete, egysége és szabályazonosítója az előnézetben és a jóváhagyott forráslistában látható marad a munkamenet végéig. A javaslat szerkeszthető; másik mező választható, az átvitel külön felülvizsgálati jelölést és jóváhagyási műveletet követel. A javaslat önmagában nem hagy jóvá és nem ment.

**Negatív védelem:** nem kapcsolunk össze külön PDF.js spaneket közelség alapján. Nincs javaslat a `GERINC 8,20 m`, `17,00`, `14,50`, `4,0%`, `43,38 m²`, `12×16,25/27`, alaprajzi külső méret, `HAP`, több értékű vagy címke nélküli szövegre. OCR-forrásra és más kalkulátorra sem készül műszaki mezőjavaslat. A dimenzió célmező-szerződés továbbra is validálja az értéket, a már megadott mező pedig külön felülírás-engedély nélkül nem írható felül.

**Szintetikus mérés:** jogtiszta `synthetic-rafter-dimensions.pdf` és `synthetic-rafter-dimensions-b.pdf` fixture-ök a `public/ocr/fixtures/` könyvtárban: 6/6 pozitív helyes mezőjavaslat, 0 téves műszaki javaslat 13 negatív/kétértelmű szövegre, mind a 13 kihagyva. A két fájl parseres tesztje külön forrásdokumentum-azonosítót is ellenőriz. Mind a 6 pozitív javaslat kezdetben függő, és rajzi forrásellenőrzést igényel. A felülvizsgálati jelölő és a jóváhagyó művelet az éppen előkészített átviteli csomagra vonatkozik: egy méret külön, több mező együtt is átvihető. Szerkesztés vagy célmezőcsere opcionálisan további lépés. Ez nem általános pontosságbecslés, és nem helyettesíti szakértő által címkézett referencia-PDF-eket. Böngészős feltöltés/mobil mátrix csak sikeresen kiválasztott szintetikus fájl esetén igazolható; nem hozzáférhető fájlválasztó esetén **NOT TESTED**.

Az M12.2 OCR-pontossági kapu változatlanul **BLOCKED**. További rajztípus, vonal-/léptékfelismerés, geometriai küszöb vagy szakmai figyelmeztetés új, visszakövethető referencia és külön igazolt szabály nélkül nem része ennek a pilotnak.

### M12.6 — vezetett szakasz és meglévő anyagkigyűjtés (2026-10-30)

A meglévő tervrajzpanelen egy szakasz elnevezése, fedettségének ellenőrzése, hiányzó kalkulátorbemenetek kijelzése, a geometria- és anyagmezőkhöz navigálás, valamint teljes tető-lefedettségi megerősítés készült. A PDF szövegrétegében lévő alaprajzi méret továbbra is jelölt: csak felhasználói célmező-választás, értékellenőrzés, fedett szakasz-megerősítés és meglévő draft-jóváhagyás viszi be. A mentés a meglévő teljes számítási állapoton felül megköveteli az egy szakasz = teljes tető kifejezett jóváhagyását; geometriai bemenet változtatása ezt visszavonja.

A `synthetic-simple-roof-plan.pdf` PDF.js fixture pozitív, 8000 × 6000 mm méretet tartalmaz. A nyeregformát és 35°-ot a teszt kifejezetten megadja, majd a meglévő számításból 58 597 180 mm² felület, 20 szarufa és 16 fedőtábla jön ki. DEMO kézi anyagadatok használatosak. A böngészőben végigvitt ugyanez a folyamat 58,60 m²-t, 20 szarufát, 73,246 m összhosszt, 1,172 m³ névleges faanyagot és 16 fedőtáblát mutatott. Ez szintetikus funkcionális bizonyíték, nem E-01 számítás és nem szakmai minősítés.

E-01 továbbra is csak földszinti alaprajz. A vizsgált szöveg nem igazolja a tetőkontúrt, tetőformát, fedett teraszokat, tetőméreteket, gerincet, fokban mért hajlást vagy ereszkiülést; a külső 17,00 × 14,50 m méret nem kerül tetőméretként használatba. A teljes épülettetőhöz szakaszonként ellenőrzött tetőterv/metszet vagy méretlista hiányzik. Egyidejűleg több tetőszakasz összeadása, tetszőleges kontúr, statikai méretezés, veszteség/toldás és termékgyártói megfelelőség nincs benne a meglévő motor igazolt körében.

Mentéshez csak a teljes roof.material-takeoff eredmény és külön teljes-lefedettség visszajelzés kell; részleges eredmény előnézet marad. Böngészőben a teljes fedettség megerősítése engedélyezte a mentési gombot; geometria módosítása visszavonta a megerősítést és újra blokkolta a mentést. A terv fájlja nem mentődik, és az elfogadott forrás-/pozíció-provenance csak a panel aktuális munkamenetében követhető, nem része a mentett snapshotnak. Képlet, számítási motor, DB/Auth/RLS és szerveroldali mentési validáció nem változott. A szintetikus PDF böngészőben beolvasódott, zoom/forgatás működött; A→B forrásváltás resetelte a kiválasztást/jóváhagyást, a kalkulátorváltás a külön draftot megtartotta. 375×812 és 812×375 dark-theme viewportokon vízszintes túlcsordulás nem volt. Világos téma, valódi mobil billentyűzet és iPhone **NOT TESTED**; konzolon alkalmazáshiba nem volt, négy Next.js Fast Refresh figyelmeztetés igen. Minőségi kapuk: célzott 2 fájl/40 teszt; teljes Vitest 210 fájl, 1363 PASS, 19 SKIP, 0 FAIL; lint, izolált typecheck/build, diff-check PASS.

## Tiltott előrelépés

- Nincs AI API, automatikus fájlfeltöltés, adatbázis-módosítás, kalkuláció, mentés vagy második geometriai motor.
- PDF.js/Tesseract.js nem kerülhet browser API-t igénylő szerveroldali feldolgozóba.
- OCR-asset nem tölthető le futás közben külső CDN-ről.
- E-01 vagy ügyfélterv nem kerülhet repóba, logba vagy külső szolgáltatásba.
