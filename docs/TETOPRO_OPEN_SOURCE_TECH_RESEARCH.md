# TetőPro – nyílt forrású technológiai kutatás tervrajz-feldolgozáshoz

**Státusz:** kutatási riport, implementációs döntés-előkészítés  
**Verzió:** 1.0  
**Kutatás dátuma:** 2026-10-31  
**Hatókör:** PDF, OCR, tervrajz-geometria, mennyiségszámítás, mobil dokumentum-UX, lokális AI és ellenőrzés  
**Bizonyíték típusa:** jelenlegi TetőPro-forráskód és dokumentáció, továbbá elsődleges projektforrások  

> Ez a dokumentum nem jogi vélemény és nem igazolja, hogy egy külső projekt vagy modell minden artefaktuma azonos licencű. Beépítés előtt a konkrét kiadás, modellfájl, súly, transzitív függőség és terjesztési mód külön ellenőrzendő.

## 1. Vezetői összefoglaló

A TetőPro jelenlegi szűk keresztmetszete nem egyszerűen „gyenge OCR”. A vizsgált mintán a PDF.js szövegréteg mind a 15 vizuális szöveget megtalálta, miközben a Tesseract magyar OCR 0/15 pontos literális egyezést adott. A teljes hibaút négy külön problémából áll:

1. raszteres rajzon karakterfelismerési hiba;
2. PDF-szövegnél töredezett spanok és nem szemantikus sorrend;
3. szám, mértékegység, vonal és célmező hibás társítása;
4. hiányzó szakmai jelentés: egy szám önmagában nem mondja meg, hogy eresz, gerinc, hajlásszög vagy födémméret.

Ezért nincs egyetlen nyílt forrású motor, amely biztonságosan „megoldja” a teljes feladatot. A legjobb következő lépés egy **human-in-the-loop, kettős bizonyítékú mérési folyamat**:

- a meglévő PDF.js marad a dokumentum-megjelenítő és szövegréteg;
- a felhasználó egy ismert méret két végpontjával kalibrálja az adott oldalt;
- ezután poliláncot vagy poligont rajzol, a rendszer pedig csak számol és konzisztenciát ellenőriz;
- PDF-vektorok, OCR és később képfeldolgozás csak illesztési/jelölt pontokat ajánlanak;
- minden automatikus találat visszautasítható, bizonytalan marad, és nem ír közvetlenül szakmai mezőt.

Az ajánlott első kutatási sorrend:

1. rajzspecifikus, címkézett TetőPro-benchmark létrehozása;
2. PaddleOCR és RapidOCR összevetése a jelenlegi Tesseracttal;
3. kétpontos kalibráció + poligon/polilánc prototípus a meglévő PDF.js nézeten;
4. Konva vagy OpenLayers-interakciós minta kipróbálása, nem teljes nézőcsere;
5. born-digital PDF-eknél korlátozott PDF.js `getOperatorList()` vagy pdfplumber vektoros PoC;
6. csak igazolt kontúrok után Turf/Martinez topológiai műveletek.

## 2. Az eredeti cél és a kutatási kérdés

A cél olyan nyílt forrású technológiák feltérképezése, amelyek a TetőPro jelenlegi tervrajzos munkafolyamatát javíthatják anélkül, hogy:

- szakmai adatot találnánk ki;
- OCR- vagy AI-kimenetet ellenőrzés nélkül kalkulátorba töltenénk;
- a működő PDF.js, geometriai vagy mennyiségszámítási magot indokolatlanul lecserélnénk;
- felhőszolgáltatásnak adnánk át ügyfélrajzot;
- későbbi BIM/CAD/mikroszerviz-architektúrát idő előtt építenénk.

A kutatás külön választja a dokumentum olvasását, a geometriai mérést, a szakmai értelmezést és a mennyiségszámítást. Ez a négy réteg eltérő hibamóddal, licenccel és ellenőrzési igénnyel rendelkezik.

## 3. A jelenlegi TetőPro-architektúra tényszerű állapota

### 3.1 Dokumentum-feldolgozás

- A PDF-kezelés `pdfjs-dist` **6.4.299** verzióra épül. A böngésző saját workerfájlt használ, külső CDN nélkül.
- A PDF-szöveg oldalanként, megszakíthatóan kerül kiolvasásra. A forrásoldal, normalizált koordináta, bounding box, motorverzió és bizonytalanság megmarad.
- A PDF-előnézet canvasra renderel, 8 megapixeles korláttal; a PDF 32 MiB/100 oldal, a szöveg- és tokenmennyiség szintén korlátozott.
- A Tesseract.js **7.0.0** lokális workerrel, magyar nyelvi csomaggal, CDN és tartós nyelvi cache nélkül fut. ROI, 1×/2× méret és 0/90/180/270° forgatás támogatott.
- A raszteres OCR 16 MiB/8 megapixel korláttal, megszakítással és erőforrás-takarítással működik.

### 3.2 Adatbiztonság és visszakövethetőség

- A rajz- és munkamenetadat alapértelmezetten böngészőmemóriában marad.
- Az export/import SHA-256 kötést használ; a forrás visszaköthető, de a nyers PDF/OCR-tokenek nem részei a munkamenet-JSON-nak.
- Az OCR-kimenet nem kap automatikusan szakmai jelentést.
- Az egylépéses kitöltés csak PDF-szövegből, szigorú mértékegység- és dimenzióellenőrzéssel működik; OCR kézi ellenőrzésre kerül.

### 3.3 Interakció és geometria

- Van zoom, 90°-os forgatás, PDF-szöveg-hitbox és kétpontos, tengelypárhuzamos szakaszkijelölés.
- Nincs igazolt natív csippentéses zoom, szerkeszthető többpontos poligon, snapping vagy kalibrált rajzi mérés.
- A tetőgeometriai mag parametrikus nyeregtető, félnyeregtető, konty, sátor, csonkakonty, manzárd, L és T alakú modelleket kezel.
- A 3D síkokból eresz, felső él, oromél, gerinc, élgerinc, vápa és törésél képződik; a poligonterület és síkbeli transzformáció már külön domainlogika.
- A mennyiségszámítás explicit `VALID`/`INCOMPLETE`/`INVALID`/`UNSUPPORTED` állapotot és geometriai/layout/névleges/beszerzési jelentésszintet használ. A beszerzési minősítés fenntartott, jelenleg semmi nem kap ilyen státuszt.

### 3.4 M12 mérési bizonyíték

- PDF.js: 15/15 vizuális minta megtalálható volt a szövegrétegben; egy területfeliratnál a `43,38 m` és a felső indexű `2` külön spanra esett.
- Tesseract magyar OCR: 0/15 pontos literális egyezés.
- Megfigyelt hibák: vesszőből pont, elvesző tizedesjel (`455`, `235`, `775`), összefolyó méretlánc és 13/15 esetben nem biztonságos címke–érték párosítás.
- Egy széles OCR-futás kb. 10,7 s volt 1× és 16,9 s 2× méreten; a célzott, forgatott ROI kb. 5,7–6,8 s. Ezek egyedi futások, nem benchmarkeloszlások.
- Egy 2× teljes oldali render kb. 4 megapixel, azaz csak a nyers RGBA canvas közel 16 MiB; ehhez hozzáadódik a PDF.js, a WASM, a modell és az átmeneti memória.

Következmény: az M12.2 automatikus tervrajzkinyerési kapu továbbra is **BLOCKED**. A kutatás ezt nem minősíti át.

## 4. A jelenlegi megoldás erősségei és korlátai

### Erősségek

- Lokális, adatvédelmi szempontból kedvező feldolgozás.
- Pontosan verziózott forrásmotor és oldal-/koordináta-proveniencia.
- Konzervatív automatikus kitöltés és külön OCR-felülvizsgálat.
- Megszakítható, korlátozott erőforrású PDF/OCR-folyamat.
- Már meglévő, tesztelhető domaingeometria és explicit mennyiségjelentés.
- Az eredeti forrásrajz és az abból származó munkamenet hash-alapú visszakötése.

### Korlátok

- A PDF-szöveg bounding boxa szöveg-run doboz, nem tényleges tintakontúr vagy méretvonal.
- A szám- és egységfelismerés nem oldja meg a térbeli/szakmai társítást.
- A kétpontos téglalap nem képes tetőkontúr, vápa, gerinc vagy szabálytalan felület rögzítésére.
- A forgatás/zoom renderelési és forrásazonossági költsége mérendő; a PDF újraparszolása kerülendő.
- A nagy klienskomponens több párhuzamos állapotot kezel; új rajzeszközt nem célszerű további ad hoc state-ekkel hozzáadni.
- A jelenlegi mobilmérés nem bizonyított valódi, alacsony memóriájú telefonokon.

## 5. Kutatási módszer és minősítési skála

A külső állítások elsődleges forrásból származnak: hivatalos GitHub-tár, dokumentáció, licencfájl vagy kutatási publikáció. A csillagszám csak ökoszisztémajelzés, nem minőségi bizonyíték; a táblázatban a 2026-10-31-én látott, kerekített érték szerepel. A TetőPro-alkalmasság minősítése:

A széles keresés 30 jelöltet rögzített. Ezek közül 19 kapott részletesebb technikai összevetést a 7–13. fejezetben (OCR, PDF, alaprajz, geometria, takeoff, viewer, frontend/backend és QA), a nyolc legerősebb döntési egység pedig külön due diligence elemzést a 14. fejezetben. Közösségi fórumállítás csak jelöltkeresésre szolgált; döntési állítást hivatalos forrás vagy jelenlegi TetőPro-mérés nélkül nem vettünk át.

- **A – közeli PoC:** kis kockázatú, mérhető, a jelenlegi rétegeket megtartó kísérlet.
- **B – feltételes:** csak az A szintű bizonyíték után, konkrét mérési eredmény vagy új igény esetén.
- **C – most ne:** licenc-, erőforrás-, érettségi vagy hatókör-probléma miatt nem indokolt.

A „lokális” itt azt jelenti, hogy az ügyfélrajz nem kerül külső szolgáltatóhoz. Ez lehet böngésző, saját gépen futó worker vagy saját üzemeltetésű szerver; a három nem azonos adatvédelmi és üzemeltetési profil.

## 6. Előzetes technológiai leltár

| # | Projekt | Terület | Futás | Licenc | Érettségi jelzés 2026-10-31 | TetőPro-minősítés |
|---:|---|---|---|---|---|---|
| 1 | [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) | OCR, dokumentumértelmezés | Python/Paddle, szerver/desktop | Apache-2.0; modellek külön | 91 957 csillag, aktív | A: OCR-kihívó |
| 2 | [RapidOCR](https://github.com/RapidAI/RapidOCR) | könnyű OCR runtime | Python/C++/ONNX | Apache-2.0; [modelllicencek külön](https://rapidai.github.io/RapidOCRDocs/main/en/model_licenses/) | aktív | A/B: CPU PoC |
| 3 | [docTR](https://github.com/mindee/doctr) | OCR detection/recognition | Python, PyTorch/TF/ONNX | Apache-2.0 | kb. 6,4k csillag, aktív | B: második kihívó |
| 4 | [EasyOCR](https://github.com/JaidedAI/EasyOCR) | többnyelvű OCR | Python/PyTorch | Apache-2.0 | kb. 30,1k csillag, sok nyitott issue | B/C: benchmark, nem első választás |
| 5 | [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) | kereshető PDF, deskew/rotate | Python CLI/szerver | MPL-2.0 | kb. 34,7k csillag | B: előfeldolgozási referencia |
| 6 | [Docling](https://github.com/docling-project/docling) | dokumentumstruktúra | Python/API, offline | MIT kód; modellek külön | kb. 67,2k csillag | B/C: dokumentum-, nem rajzszemantika |
| 7 | [Qwen2.5-VL](https://github.com/QwenLM/Qwen2.5-VL) | VLM, OCR-grounding | GPU/saját szerver | modellenként ellenőrizendő | aktív | C: magyarázó kísérlet csak |
| 8 | [SmolDocling](https://openaccess.thecvf.com/content/ICCV2025/papers/Nassar_SmolDocling_An_ultra-compact_vision-language_model_for_end-to-end_multi-modal_document_conversion_ICCV_2025_paper.pdf) | kompakt dokumentum-VLM | lokális modellruntime | modellenként ellenőrizendő | ICCV 2025 | C: kutatás |
| 9 | [PDF.js](https://mozilla.github.io/pdf.js/) | PDF render/szöveg/operatorok | böngésző/Node | Apache-2.0 | 6.4.299 stabil, jelenleg használt | A: megtartandó |
| 10 | [pdfplumber](https://github.com/jsvine/pdfplumber) | karakter/vonal/görbe/rect kinyerés | Python | MIT | kb. 10,8k csillag | A/B: referencia-parser |
| 11 | [pypdfium2](https://github.com/pypdfium2-team/pypdfium2) | PDF render/szöveg | Python/PDFium | Apache-2.0/BSD-3 + PDFium notice | aktív | B: kontrollmotor |
| 12 | [MuPDF.js](https://github.com/ArtifexSoftware/mupdf.js) | PDF render/strukturált szöveg | WASM, böngésző/Node | AGPL-3.0 vagy kereskedelmi | aktív | C: licenc miatt ne |
| 13 | [OpenLayers](https://github.com/openlayers/openlayers) | Draw/Modify/Snap/Measure | böngésző JS/TS | BSD-2-Clause | 12 637 csillag, aktív | A: interakciós PoC/minta |
| 14 | [Konva](https://github.com/konvajs/konva) | canvas scene graph, overlay | böngésző JS/TS | MIT | kb. 14,9k csillag, aktív | A: overlay PoC |
| 15 | [OpenSeadragon](https://github.com/openseadragon/openseadragon) | nagy kép, pan/pinch/deep zoom | böngésző JS | BSD-3-Clause | kb. 3,5k csillag | B: nagy scan esetén |
| 16 | [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) | PDF.js kijelölés/koordináta | React | MIT | kb. 1,4k csillag | B: koordinátaminta |
| 17 | [Excalidraw](https://github.com/excalidraw/excalidraw) | rajzolás, undo/redo | React/canvas | MIT | nagy, aktív közösség | C: inspiráció, túl nagy dependency |
| 18 | [Turf](https://github.com/Turfjs/turf) | geometriák/topológia | böngésző/Node TS | MIT | kb. 10,5k csillag | A/B: igazolt poligonok után |
| 19 | [Martinez](https://github.com/w8r/martinez) | poligonbooleans | böngésző/Node JS | MIT | kb. 0,8k csillag, aktív | A/B: szűk boolean művelet |
| 20 | [polygon-clipping](https://github.com/mfogel/polygon-clipping) | union/intersection/difference | böngésző/Node JS | MIT | érett | B: Martinez-alternatíva |
| 21 | [Clipper2](https://github.com/AngusJohnson/Clipper2) | robusztus clipping/offset | C++/C#/Delphi | BSL-1.0 | aktív | B/C: algoritmikus referencia/WASM |
| 22 | [OpenCV](https://github.com/opencv/opencv) | vonal/kontúr/képjavítás | natív/Python/OpenCV.js | Apache-2.0 | érett | B: jelöltképzés, nem szemantika |
| 23 | [CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k) | alaprajz-szegmentálás | régi PyTorch-stack | CC BY-NC 4.0 adat | 587 csillag, kutatási | C: kereskedelmi tréninghez nem |
| 24 | [RoomFormer](https://github.com/ywyue/RoomFormer) | szoba/poligon rekonstrukció | PyTorch/CUDA | MIT kód | 336 csillag, kutatási | C: más bemeneti domén |
| 25 | [Raster2Seq](https://github.com/Cornell-VAILab/Raster2Seq) | raszterből room polygon | ML-kutatás | beépítés előtt ellenőrizendő | 62 csillag, SIGGRAPH 2026 | C: kutatás |
| 26 | [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) | IFC/BIM/QTO | C++/Python/CLI | LGPL-3.0-or-later; részek eltérhetnek | kb. 2,8k csillag, aktív | B/C: szemantikai referencia |
| 27 | [OpenCutList](https://www.opencutlist.org/) | alkatrészlista/vágás/költség | SketchUp plugin | GPL-3.0 | érett | B/C: workflow-inspiráció |
| 28 | [Deepnest](https://github.com/deepnest-next/deepnest) | 2D nesting | desktop/C++/Rust irány | MIT | közösségi fork | C: csak későbbi gyártási kontúrhoz |
| 29 | [fast-check](https://fast-check.dev/) | property-based teszt | JS/TS | MIT | kb. 5,2k csillag | B: geometriai fuzzing, ha indokolt |
| 30 | [Yjs](https://github.com/yjs/yjs) | lokális/collab CRDT | JS/TS | MIT | érett | C: nincs jelenlegi kollaborációs igény |

## 7. OCR-motorok és dokumentum-AI összevetése

### 7.1 Tesseract.js – mit bizonyít a jelenlegi eredmény?

A 0/15 pontos egyezés nem azt bizonyítja, hogy a Tesseract minden magyar dokumentumon használhatatlan. Azt bizonyítja, hogy a jelenlegi modell, renderelés, ROI és mintarajz kombinációja nem éri el a TetőPro biztonságos automatikus mezőkitöltési küszöbét. A Tesseract előnye továbbra is a teljesen böngészős, saját hostolású működés. Hátránya a telefonon jelentős WASM/memória/időigény, a műszaki méretláncokhoz gyenge társítás és a nem szemantikus eredmény.

### 7.2 PaddleOCR

A [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) Apache-2.0 licencű, aktív OCR-ökoszisztéma. A hivatalos [dokumentáció](https://www.paddleocr.ai/main/en/) több méretű felismerő és dokumentumértelmező pipeline-t ír le, a projekt pedig lokális telepítést és szerveres API-t is támogat. A közzétett sebesség- és pontosságszámok gyártói benchmarkok; nem vetíthetők át a TetőPro rajzaira.

TetőPro-haszon:

- erősebb detektor/felismerő kombináció kipróbálása ferde és sűrű feliratokon;
- szó-/sordobozok és confidence összevetése a jelenlegi tokenmodellel;
- saját gépen vagy saját szerveren futó, dokumentumot el nem küldő benchmark.

Korlát:

- nem böngésző-first megoldás;
- a pontos magyar/latin modell és minden súly licence külön ellenőrzendő;
- a jó OCR továbbra sem oldja meg, mely méret melyik tetőélhez tartozik;
- mobilon helyben futtatása a jelenlegi webes stackben nem tekinthető kész opciónak.

**Ajánlás:** A prioritású kihívó a Tesseract ellen, de csak benchmarkban. Beépítésről kizárólag numerikus pontosság, társítási F1, p95 latency, peak RAM és licencellenőrzés után szabad dönteni.

### 7.3 RapidOCR

A [RapidOCR](https://github.com/RapidAI/RapidOCR) ONNX-alapú, CPU-barát csomagolást ad több, jellemzően PaddleOCR-eredetű modellhez. A projekt külön [modelllicenc-nyilvántartást](https://rapidai.github.io/RapidOCRDocs/main/en/model_licenses/) közöl, ami fontos: a futtatókód licence nem automatikusan a súlyok licence.

TetőPro-haszon: kisebb saját gépes/szerveres PoC, könnyebb ONNX-deployment, összehasonlítható preprocess/postprocess. Korlát: a kiválasztott modell magyar karakterkészletét és műszaki rajzos teljesítményét mérni kell. **Ajánlás:** PaddleOCR után vagy azzal párban A/B PoC.

### 7.4 docTR

A [docTR](https://github.com/mindee/doctr) Apache-2.0 licencű detektor- és felismerőmodelleket kínál PyTorch/TensorFlow környezetben, továbbá ONNX-irányt és dokumentumorientációs eszközöket. Jó második kontrollmotor, mert a pipeline felépítése eltérő lehet. Ugyanakkor Python-központú, és nem ad tervrajzi jelentést. **Ajánlás:** B; csak akkor, ha az első két motor eredménye nem elég vagy torzításuk túl hasonló.

### 7.5 EasyOCR és OCRmyPDF

Az [EasyOCR](https://github.com/JaidedAI/EasyOCR) 80+ nyelvet és forgatási opciókat kínál, de a projekt karbantartási terhe és a PyTorch-runtime miatt nem első integrációs jelölt. Az [OCRmyPDF](https://github.com/ocrmypdf/OCRmyPDF) kiváló deskew/rotate/kereshető-PDF workflow, de alapvetően nem cseréli le a Tesseract felismerési magját. **Ajánlás:** benchmark-/előfeldolgozási referencia, nem termékmotor.

### 7.6 Dokumentum-VLM-ek

A [Docling](https://github.com/docling-project/docling), [Qwen2.5-VL](https://github.com/QwenLM/Qwen2.5-VL) és [SmolDocling](https://openaccess.thecvf.com/content/ICCV2025/papers/Nassar_SmolDocling_An_ultra-compact_vision-language_model_for_end-to-end_multi-modal_document_conversion_ICCV_2025_paper.pdf) olvasási sorrendet, régiót, dokumentumstruktúrát vagy groundingot tud adni. Ez hasznos lehet későbbi magyarázatban vagy jelöltgenerálásban, de:

- nem determinisztikus mérőműszer;
- hallucinatív vagy formátumérzékeny lehet;
- a modelllicenc és hardverigény külön vizsgálandó;
- szakmai kalkulátorértéket nem szabad közvetlenül elfogadni tőle.

**Ajánlás:** C az automatikus kitöltésre; későbbi, elkülönített „mit látok ezen a rajzon?” asszisztenshez csak validált, visszakereshető idézett régiókkal.

### 7.7 Javasolt OCR-benchmark

Legalább három réteget kell külön mérni:

| Réteg | Metrika | Miért szükséges? |
|---|---|---|
| karakter/szó | CER, WER | általános felismerési hiba |
| műszaki érték | pontos normalizált szám, tizedesjel-, egység- és felsőindex-megőrzés | egyetlen tizedeshiba is szakmai hibát okozhat |
| társítás | érték–címke–vonal link precision/recall/F1 | a helyes szám rossz élhez kötve veszélyes |
| lokalizáció | bbox IoU és forgatás | mobil kijelölés/snap használhatósága |
| döntés | automatikusan elfogadott érték pontossága és abstention rate | a biztonságos visszautasítás is helyes eredmény |
| erőforrás | p50/p95 idő, peak RAM, modellméret, cold/warm start | mobil és saját szerver költsége |

Sem a [FUNSD](https://github.com/crcresearch/FUNSD), sem a [DocLayNet](https://arxiv.org/abs/2206.01062) nem helyettesít tervrajz-specifikus, jogtisztán használható TetőPro-korpuszt: űrlap- és oldalelrendezési benchmarkok, nem tetőméretláncok.

## 8. PDF-szöveg, vektorkinyerés és mérés

### 8.1 A PDF.js maradjon az elsődleges böngészős motor

A jelenlegi verzió a PDF.js hivatalos stabil kiadásával egyezik: [PDF.js Getting Started](https://mozilla.github.io/pdf.js/getting_started/). Az API képes operatorlistát adni, de a [hivatalos API-forrás](https://mozilla.github.io/pdf.js/api/draft/api.js.html) és a projekt karbantartóinak [magyarázata](https://github.com/mozilla/pdf.js/discussions/21075) alapján a pontos vektorútvonalakhoz az operátorokat, grafikai állapotot, transzformációkat és clippinget vissza kell játszani. Ez alacsony szintű grafikai adat, nem kész „méretvonal-API”.

**Következtetés:** a PDF.js nem cserélendő le. Szűk PoC-ban born-digital PDF-en ki lehet nyerni vonaljelölteket snaphez, de az eredmény nem automatikus tetőgeometria.

### 8.2 pdfplumber mint referencia-parser

A [pdfplumber](https://github.com/jsvine/pdfplumber) közvetlen hozzáférést ad karakterekhez, vonalakhoz, téglalapokhoz és görbékhez, valamint vizuális debugginghoz. A projekt maga is jelzi, hogy gépileg előállított PDF-eken működik a legjobban. Előnye, hogy gyorsan megmutatja: a mintadokumentum ténylegesen hordoz-e hasznos vektorgeometriát. Hátránya a Python-backend és az eltérő koordináta-/renderelési út.

**Ajánlás:** A/B referencia PoC: ugyanazon oldal PDF.js operatorlistája és pdfplumber objektumlistája legyen összevetve. Ha nincs stabil méretvonal-struktúra, ne épüljön új infrastruktúra.

### 8.3 pypdfium2 és MuPDF.js

A [pypdfium2](https://github.com/pypdfium2-team/pypdfium2) jó render-/szövegkontrollmotor lehet szerveres kutatásban, de nem ad önmagában tervrajzszemantikát. A [MuPDF.js](https://github.com/ArtifexSoftware/mupdf.js) technikailag erős WASM-opció, ám a hivatalos [licenc-FAQ](https://mupdfjs.readthedocs.io/en/latest/faq/index.html) szerint az AGPL SaaS esetén forrásközzétételi kötelezettséget okozhat, hacsak nincs kereskedelmi licenc. **Ajánlás:** MuPDF.js ne kerüljön a jelenlegi zárt SaaS-ba pusztán PDF.js-alternatívaként.

### 8.4 OCR nélküli új mérési út

A legfontosabb új ötlet a **kettős bizonyítékú oldalkalibráció**:

1. a felhasználó kiválaszt egy olvasható, ismert hosszméretet;
2. megadja a két végpontot és az értéket/mértékegységet;
3. a rendszer rögzíti az oldalhash-t, pontokat, skálát és forrást;
4. a felhasználó egy második ismert mérettel ellenőrizheti az eltérést;
5. csak elfogadható konzisztencia után mérhető polilánc/poligon;
6. PDF-vektor vagy képfeldolgozás csak snap-jelöltet ad, a pontot a felhasználó hagyja jóvá.

Ez nem igényel OCR-t, és nem feltételezi, hogy az épület alaprajzi kontúrja azonos a tetőkontúrral. A skála bizonytalansága megőrizhető, ezért a számított eredmény nem tűnik pontosabbnak a forrásnál.

## 9. Alaprajz- és geometriafelismerés

### 9.1 CubiCasa5K

A [CubiCasa5K](https://github.com/CubiCasa/CubiCasa5k) 5000 alaprajzot és 80+ kategóriát tartalmazó kutatási adatbázis. A [licenc](https://github.com/CubiCasa/CubiCasa5k/blob/master/LICENSE) CC BY-NC 4.0, ezért a dataset kereskedelmi termékhez történő tréning- vagy származtatott felhasználása jogi engedély nélkül nem megfelelő. A régi Python/PyTorch/CUDA stack és a nagy adatkészlet további integrációs költség.

Még fontosabb a doménkülönbség: a szoba/fal/ajtó szegmentálása nem tetősík-, eresz-, gerinc- vagy vápaértelmezés. **Ajánlás:** C; tudományos referencia, nem TetőPro-termékkomponens.

### 9.2 RoomFormer és Raster2Seq

A [RoomFormer](https://github.com/ywyue/RoomFormer) strukturált szobapoligonokat állít elő, de top-down 3D scan density map doménre készült és CUDA-bővítményeket igényel. A [Raster2Seq](https://github.com/Cornell-VAILab/Raster2Seq) raszterből generál szobapoligonokat, de kutatási projekt, alacsony adaptációs bizonyítékkal és beépítés előtt tisztázandó licenccel. **Ajánlás:** C; legfeljebb jövőbeli kutatási benchmark.

### 9.3 OpenCV

Az [OpenCV](https://github.com/opencv/opencv) Apache-2.0 licencű, OpenCV.js részhalmazzal is rendelkező képfeldolgozó alap. Hasznos lehet deskew, vonaljelölt, kontúr és sarok detektálására. Nem tudja, hogy egy vonal gerinc, méretsegédvonal vagy fal. **Ajánlás:** B; csak human-in-the-loop snap-javaslatként, rajzspecifikus false-positive méréssel.

### 9.4 Biztonságos szemantikai határ

Az automatikus rendszer legfeljebb ezt állíthatja: „itt valószínű vonal/sarok/poligon található”. A következő állítások emberi megerősítés nélkül nem biztonságosak:

- ez a tető külső kontúrja;
- ez a vonal vápa vagy gerinc;
- ez az alaprajzi méret a tető vetületi hossza;
- az épületkontúrhoz tartozó eresztúlnyúlás ennyi;
- a felismert szoba-/falpoligon tetősíkra vihető át.

## 10. Tetőgeometria, anyagkiírás és optimalizálás

### 10.1 A jelenlegi domainmagot nem kell lecserélni

A TetőPro már rendelkezik 3D tetősík-, él- és felületmodellel, továbbá explicit `INCOMPLETE`/`UNSUPPORTED` állapotokkal. A kutatott könyvtárak nem adnak kész, magyar tetőfedési szabályrendszert. A helyes integráció az, hogy egy jóváhagyott, kalibrált rajzi poligon a meglévő domain bemenetévé váljon, ne pedig új párhuzamos geometriamotor szülessen.

### 10.2 Turf és Martinez

A [Turf](https://github.com/Turfjs/turf) MIT licencű TypeScript/JavaScript geometriakönyvtár; metszés, távolság, vonal/poligon és több topológiai művelet érhető el. A [Martinez](https://github.com/w8r/martinez) kifejezetten poligon/multipoligon union, intersection, difference és xor műveletekre alkalmas.

TetőPro-haszon igazolt kontúrok után:

- szomszédos szekciók átfedésének és résének jelzése;
- közös határvonal-jelölt;
- L/T alakú kontúr felosztásának támogatása;
- felhasználói poligon normalizálása és önmetszés előtti ellenőrzése.

Korlát: egyik sem tudja, hogy a közös él vápa vagy gerinc, és egyik sem számít szakmai anyagigényt. **Ajánlás:** A/B szűk utilityként, csak ha a jelenlegi domainprimitívek nem fedik le az adott műveletet.

### 10.3 IfcOpenShell és Bonsai mint szemantikai minta

Az [IfcOpenShell](https://github.com/IfcOpenShell/IfcOpenShell) IFC-geometriát, tulajdonságokat és quantity takeoff eszközöket ad; a [Bonsai QTO](https://wiki.osarch.org/bonsai-quantity-takeoff/) névvel, szabállyal és forrással kezelt quantity seteket mutat. A hasznos tanulság nem egy BIM-stack beépítése, hanem a lánc:

**forráselem → igazolt geometria → névvel és jelentéssel rendelkező mennyiség → költség/beszerzés**.

Ez összhangban van a TetőPro meglévő jelentésszintjeivel. **Ajánlás:** architekturális referencia; IFC csak akkor, ha valódi IFC-import üzleti igény lesz.

### 10.4 OpenCutList és Deepnest

Az [OpenCutList](https://www.opencutlist.org/) alkatrészlista, vágási diagram, költség és tömeg workflow-t demonstrál. A [Deepnest](https://github.com/deepnest-next/deepnest) 2D kontúrok nestingjét optimalizálja. Ezek csak akkor relevánsak, ha már rendelkezésre állnak gyártható, termék- és gépspecifikus darabkontúrok. A jelenlegi névleges faanyag- vagy lemezszám nem ilyen. **Ajánlás:** C, amíg nincs igazolt gyártási adatmodell.

## 11. Mobil dokumentumnéző és mérési UX

### 11.1 OpenLayers

Az [OpenLayers](https://github.com/openlayers/openlayers) BSD-2 licencű, érett interakciós rendszer. Hivatalos példái között megtalálható a [Draw, Modify, Snap, Measure, Trace és Pinch Zoom](https://openlayers.org/en/latest/examples/?q=interaction); a [Draw API](https://openlayers.org/en/latest/apidoc/module-ol_interaction_Draw-Draw.html) dokumentálja a pont- és vonalinterakciókat, beleértve a snap toleranciát.

Hasznos átvehető minta:

- dokumentumkoordináta külön a képernyőkoordinátától;
- interakciók explicit módokként;
- mobilbarát pixel-alapú snap/hit tolerancia;
- külön rajzolás, módosítás, törlés és befejezés;
- pointer és touch események egységesítése.

Korlát: térképprojekcióra épülő teljes könyvtár túl nagy lehet egy egyoldalas PDF-overlayhez. **Ajánlás:** A interakciós referencia vagy izolált prototípus; csak mért bundle/memóriaeredmény után dependency.

### 11.2 Konva

A [Konva](https://github.com/konvajs/konva) MIT licencű canvas scene graph, külön rétegekkel, eseményekkel, drag/transform funkciókkal és exporttal. A 2026-os [changelog](https://github.com/konvajs/konva/blob/master/CHANGELOG.md) mobil pointer/touchcancel és memóriakezelési javításokat is mutat.

TetőPro-haszon:

- a meglévő PDF.js canvas fölött szerkeszthető pontok, vonalak és poligonok;
- külön hit canvas, nagyobb mobil fogópontok;
- vizuális kijelölés és undo/redo eseménymodell;
- a PDF renderelő lecserélése nélkül használható.

Korlát: plusz canvasréteg és hit canvas növeli a memóriát, sok objektumnál teljesítménymérés kell. **Ajánlás:** A, a legkisebb életképes overlay PoC egyik első jelöltje.

### 11.3 OpenSeadragon

Az [OpenSeadragon](https://github.com/openseadragon/openseadragon) nagy felbontású képek deep-zoom, pan és pinch kezelésére készült; a [Viewport API](https://openseadragon.github.io/docs/OpenSeadragon.Viewport.html) képernyő-, viewport- és képkoordináták közötti transzformációt ad. Szkennelt, több tíz megapixeles oldalnál jobb lehet, mint egyetlen nagy canvas.

Korlát: a normál PDF-oldalhoz tiling/piramisgenerálás kellhet, mérést és poligonszerkesztést nem ad. **Ajánlás:** B; csak akkor, ha valódi készülékmérés szerint a jelenlegi PDF canvas nagy scaneken nem tartható.

### 11.4 react-pdf-highlighter és Excalidraw

A [react-pdf-highlighter](https://github.com/agentcooper/react-pdf-highlighter) jó példa PDF.js feletti normalizált szöveg-/területkijelölésre és Playwright-tesztekre, de nem mérési motor. Az [Excalidraw](https://github.com/excalidraw/excalidraw) undo/redo, zoom/pan és nyílt JSON modellje inspiráló, de teljes editor beemelése túl nagy. **Ajánlás:** forrásminta, nem közvetlen dependency.

### 11.5 Javasolt mobil interakció

1. **Navigáció mód:** egyujjas pan, kétujjas pinch; nincs pontelhelyezés.
2. **Mérés mód:** rövid tap pontot tesz, nagy fogóponttal; hosszú nyomás vagy külön gomb nagyítólencsés finomítást ad.
3. **Snap:** csak javaslat, vizuálisan jelölt forrással; felhasználó felülírhatja.
4. **Poligon:** minimum három pont, explicit „Befejezés”; visszalépés pontonként.
5. **Bizonyítékpanel:** kalibráció, oldal, skálaeltérés, mért hossz/terület és bizonytalanság.
6. **Hozzáférhetőség:** legalább 44 CSS-pixeles érintési cél, billentyűzetes alternatíva és nem csak színnel jelzett állapot.

## 12. Frontend-, backend- és lokális AI-architektúra

### 12.1 Megtartandó réteghatár

```text
UI: PDF nézet + pont/poligon szerkesztés + kézi megerősítés
  ↓
Alkalmazás: kalibráció, koordinátatranszformáció, bizonyíték, workflow/reducer
  ↓
Domain: validált hossz/poligon/tetőtípus → meglévő tetőgeometria és takeoff
  ↑
Infrastruktúra-adapterek: PDF.js, opcionális OCR/vector/snap motor
```

Az OCR, PDF-vektor és későbbi ML-adapter nem hívhatja közvetlenül a domainkalkulátort. Ugyanazt a bizonyítékos, validált alkalmazási parancsot kell előállítaniuk, mint a kézi bevitelnek.

### 12.2 Állapotkezelés

Az új interakciót egyetlen explicit reducer/state machine-szerű modellben érdemes tartani: `idle → calibrating → calibrated → drawing → reviewing → accepted`. Ehhez nem szükséges azonnal [XState](https://github.com/statelyai/xstate) dependency; a projekt meglévő TypeScript-reducere kisebb és elég lehet. XState állapotdiagramjai és model-based testing ötletei átvehetők csomag nélkül.

### 12.3 Hol fusson az OCR?

| Mód | Előny | Kockázat | Ajánlás |
|---|---|---|---|
| böngésző/Tesseract.js | nincs rajzfeltöltés, offline | telefon RAM/idő, jelenlegi pontatlanság | megmaradhat kézi segédnek |
| saját gépes worker | erősebb CPU/GPU, adat helyben | telepítés és frissítés | jó szakmai/desktop PoC |
| saját üzemeltetésű szerver | központi modell, kontrollált hardver | rajz hálózaton mozog, üzemeltetés | csak explicit beleegyezés és retention policy mellett |
| külső OCR/VLM SaaS | gyors integráció | adatvédelmi, szerződéses és költségkockázat | jelen kutatásban nem ajánlott |

### 12.4 Mikor ne vezessünk be külön backendet?

Ha a kalibráció, poligon és PDF-vektor PoC teljesen böngészőben működik, nincs ok új szolgáltatásra. Backend csak akkor indokolt, ha a kiválasztott OCR-modell mérhetően jobb, de böngészőben nem fér el, és az adatkezelési feltételek elfogadottak.

## 13. Más szakterületekről átvehető ötletek

### 13.1 GIS: kalibráció, snapping és koordinátarendszerek

A GIS-rendszerek nem keverik össze a képernyőpixelt a világkoordinátával. A TetőPro számára ennek megfelelője az oldal normalizált koordinátája és a kalibrált valós méret. Az OpenLayersből a Draw/Modify/Snap interakció, nem a földrajzi projekció veendő át.

### 13.2 Orvosi képalkotás: mérés csak kalibrált képen

Az orvosi képnézők külön kezelik a pixeladatot, a spacinget és a mérési annotációt. TetőPro-párhuzam: kalibráció nélkül csak „képpixelben mért távolság” létezhet, szakmai méter nem.

### 13.3 BIM/QTO: forrásból származó, jelentéssel ellátott mennyiség

Az IfcOpenShell/Bonsai gondolkodása szerint a quantity nem puszta szám: van forráseleme, szabálya, mértékegysége és jelentése. Ez támogatja a TetőPro már meglévő `GEOMETRIC`/`LAYOUT`/`NOMINAL`/`PROCUREMENT` különválasztását.

### 13.4 CAD: constraint és kétlépcsős snap

A snap nem változtathat észrevétlenül geometriát. Először jelöltet mutat, majd a felhasználó rögzíti. Egy második ismert méret ellenőrző constraintként használható, és skálahiba esetén blokkolhatja az elfogadást.

### 13.5 Fotogrammetria: bizonytalanság propagálása

Ha a kalibráció két pontja ±n pixel bizonytalan, a hossz- és területértékek sem lehetnek végtelen pontosságúak. A UI-nak eltérést vagy tartományt kell mutatnia, nem hamis tizedeseket.

### 13.6 Gyártás/nesting: csak gyártható kontúron optimalizálunk

Az OpenCutList/Deepnest tanulsága, hogy optimalizálni csak tisztított, anyagvastagsággal, vágási hézaggal és forgatási szabállyal ellátott darablistát szabad. Névleges tetőfelületből nem következik közvetlen vágási terv.

### 13.7 Adatcímkézés: aktív tanulás helyett először hibaleltár

Az első adatgyűjtés ne nagy ML-tréning legyen. A rendszer a felhasználó által elutasított OCR-/snap-jelölteket anonimizált, engedélyezett hibaosztályokba rendezheti. Csak későbbi külön döntés után lehet ebből tanítási adat.

## 14. A nyolc legfontosabb jelölt mélyebb értékelése

| Projekt | Pontos probléma | TetőPro-haszon | Integráció | Teljesítmény/üzemeltetés | Mi nem működik | Döntés |
|---|---|---|---|---|---|---|
| PDF.js | PDF megjelenítés, szöveg és alacsony szintű operátorok | meglévő proveniencia és böngészős render | jelenlegi infrastruktúra-adapter marad | már ismert 8MP/32MiB korlátok; mért mobilprofil kell | operatorlista nem kész CAD-geometria | **A: megtartani** |
| PaddleOCR | scanen jobb OCR-kihívó keresése | detektor + recognizer, többnyelvű pipeline | saját benchmark-adapter, nem közvetlen domainhívás | Python/Paddle, saját worker/szerver; telefonböngésző nem alapút | nem ad tetőszemantikát; benchmark nélkül nincs fölény | **A: benchmark** |
| RapidOCR | könnyebb CPU/ONNX OCR runtime | kisebb deployment és modellválaszték | ugyanaz a benchmark-contract | CPU-barát lehet, de konkrét modell mérendő | modelllicenc/nyelv nem következik a kód licencéből | **A/B: benchmark** |
| pdfplumber | born-digital PDF objektumainak gyors feltárása | chars/lines/rects/curves, vizuális debug | külön kutatási script/szolgáltatás nélkül is offline kontroll | Python; nem mobil kliens | scanen nem OCR, PDF.js-szel eltérő koordináta | **A/B: referencia-PoC** |
| Konva | szerkeszthető overlay és mobil fogópontok | többpontos vonal/poligon, drag, rétegek | PDF.js canvas fölötti izolált komponens | plusz render/hit canvas; heap és FPS mérendő | nem PDF-parser, nem geometriamotor | **A: UI PoC** |
| OpenLayers | érett Draw/Modify/Snap/Measure interakció | kipróbált gesture- és snapping-minta | dokumentumkoordinátára adaptálva | teljes könyvtár bundle-je lehet túl nagy | map-projekció és sok funkció irreleváns | **A: minta/PoC** |
| Turf/Martinez | poligon átfedés, metszés, közös határ | validált szekciók topológiai ellenőrzése | domainből hívott tiszta utility vagy adapter | kiszámítható kliensoldali művelet; degenerált eset tesztelendő | nem tud tetőélt osztályozni | **A/B: igazolt kontúr után** |
| OpenSeadragon | nagy raszteroldalak pan/pinch és tile | memória-kímélő nagy scan néző | alternatív viewer adapter, csak bizonyított szükségnél | csempegenerálás és cache költség | nem mérési/poligon eszköz | **B: feltételes** |

### 14.1 Forrás-, licenc- és karbantartási due diligence

Az alábbi állapot a kutatás napjának pillanatképe. A GitHub „open issues” száma triázsterhelést jelez, nem hibaarányt, és egyes GitHub-nézetek a pull requesteket is beleszámítják. A „teszt” oszlop csak a nyilvános tesztinfrastruktúrát igazolja; nem állít TetőPro-specifikus lefedettséget.

| Döntési egység | Hivatalos forrás és hasznos funkció | Stack, lokális/mobil | Licenc és kereskedelmi SaaS | Aktivitás, issue- és tesztbizonyíték | Integrációs ítélet |
|---|---|---|---|---|---|
| **PDF.js** | [repo](https://github.com/mozilla/pdf.js), `getTextContent()`, `getOperatorList()`, `render()` | JavaScript; böngésző/Node; teljesen lokális; mobilon már használatban | Apache-2.0; notice mellett általában SaaS-kompatibilis | kb. 54k csillag; 6.4.x aktív kiadások; a projekt unit-, integrációs-, reference- és [benchmarkteszteket](https://github.com/mozilla/pdf.js#benchmarks) dokumentál | a jelenlegi 6.4.299 adapter marad; az operatorlista csak izolált PoC |
| **PaddleOCR** | [repo](https://github.com/PaddlePaddle/PaddleOCR), detekció + felismerés + orientáció/dokumentum pipeline | Python/Paddle; lokális desktop vagy saját szerver; nem kész mobil-web runtime | Apache-2.0 kód; minden kiválasztott modellsúly külön ellenőrzendő; saját szerveren SaaS-képes lehet | 91 957 csillag, 261 nyitott issue; GitHub frissítve 2026-10-30, utolsó push 2026-09-16; nagy CI/tesztfa, de a konkrét modellteszt-lefedettség nem auditált | közös OCR-contract mögötti A benchmark; termékintegráció csak mért fölénnyel |
| **RapidOCR** | [repo](https://github.com/RapidAI/RapidOCR), ONNX OCR-pipeline; külön [modelllicenc-lista](https://rapidai.github.io/RapidOCRDocs/main/en/model_licenses/) | Python/C++/ONNX; lokális CPU/saját szerver; browser/mobile illesztés külön munka | Apache-2.0 runtime; modellsúlyonként eltérhet; kereskedelmi alkalmasság csak a kiválasztott csomagra mondható ki | aktív issue 2026-10-17-én is nyílt; repo-tesztek léteznek, lefedettség és magyar rajzpontosság nem auditált | A/B CPU-kontroll a PaddleOCR mellett; a kisebb runtime nem jelent automatikus jobb pontosságot |
| **pdfplumber** | [repo](https://github.com/jsvine/pdfplumber), `page.chars`, `lines`, `rects`, `curves`, vizuális debug | Python/pdfminer; teljesen lokális; nem kliensoldali mobilkomponens | MIT; notice mellett általában SaaS-kompatibilis | kb. 10,8k csillag; aktív 2026. októberi issue-k; nyilvános tesztek vannak. Ismert issue-k közt memória-, koordináta- és szövegsorrend-problémák is szerepelnek | rövid offline referencia-PoC; nem új kötelező backend |
| **Konva** | [repo](https://github.com/konvajs/konva), `Stage`, `Layer`, `Line`, `Circle`, `Transformer`, pointeresemények | JavaScript/TypeScript; lokális böngésző; mobil pointer/touch | MIT; notice mellett SaaS-kompatibilis | kb. 14,9k csillag; [10.9.0 changelog, 2026-10-14](https://github.com/konvajs/konva/blob/master/CHANGELOG.md); nyilvános tesztfa, mobil és memóriajavítások; TetőPro készülékprofil nem mért | A overlay-PoC a meglévő PDF canvas fölött; heap/FPS/bundle kapu kötelező |
| **OpenLayers** | [repo](https://github.com/openlayers/openlayers), `Draw`, `Modify`, `Snap`, `PinchZoom`; [interakciós példák](https://openlayers.org/en/latest/examples/?q=interaction) | JavaScript + generált TS-típusok; lokális böngésző; modern mobilböngészők | BSD-2-Clause; notice mellett SaaS-kompatibilis | 12 637 csillag, frissítve 2026-10-26; nagy unit/integrációs tesztkészlet; nyitott mobil-, memória- és poligon-issue-k miatt saját use case teszt kell | A mintakönyvtár/összevetési PoC; teljes map stack csak kisebb saját megoldásnál jobb mérés esetén |
| **Turf + Martinez** | [Turf](https://github.com/Turfjs/turf): validálás, metszés, vonalműveletek; [Martinez](https://github.com/w8r/martinez): `union`, `intersection`, `diff`, `xor` | TS/JS; lokális böngésző/Node; mobilon kis inputtal alkalmas | mindkettő MIT; notice mellett SaaS-kompatibilis | Turf kb. 10,5k csillag és 235 nyitott issue; Martinez 777 csillag, 16 nyitott issue, 0.9.0, Vitest-fixture és reprodukálható benchmark. Mindkettőnél dokumentált degenerált/hibás poligonesetek vannak | csak szükséges részcsomag és saját degenerált fixture; tetőszemantika marad domainkód |
| **OpenSeadragon** | [repo](https://github.com/openseadragon/openseadragon), `Viewport` koordinátatranszformáció, `MouseTracker`, tile/deep zoom | JavaScript; lokális böngésző és mobil; tile-forrás szükséges | BSD-3-Clause; notice mellett SaaS-kompatibilis | kb. 3,5k csillag; 6.1.1 körüli aktív ág; changelog szerint mobil- és unit-tesztjavítások; TetőPro PDF/tile költség nem mért | B alternatív néző kizárólag igazolt nagy-scan memóriahiba esetén |

**Tesztelési következmény:** egyetlen külső projekt saját tesztkészlete sem bizonyítja a TetőPro rajzi pontosságát. Beépítés előtt a kiválasztott verziót rögzíteni, licence-notice-t generálni, ismert releváns issue-kat triázsolni, majd a projekt saját fixture-jein és fizikai készülékein mérni kell.

### Fejlesztési idő várható megtakarítása

- **Konva/OpenLayers-minta:** hetekkel csökkentheti a pointer/touch, hit testing, drag és snap alapok saját megírását, de csak akkor, ha a bundle- és integrációs költség nem nagyobb a szűk saját overlaynél.
- **pdfplumber:** napok alatt eldöntheti, van-e egyáltalán stabil vektorgeometria a reprezentatív PDF-ekben; ezzel hónapnyi rossz irányú „PDF-ből CAD” fejlesztés kerülhető el.
- **PaddleOCR/RapidOCR:** közös benchmark-contracttal gyorsan kizárható, hogy puszta motorcserével megoldható-e az M12.2. A legnagyobb megtakarítás itt a téves integráció elkerülése.
- **Turf/Martinez:** jól tesztelt poligonbooleans esetén nem kell numerikusan kényes algoritmust újraírni; a tetőszemantika ettől még TetőPro-kód marad.

Ezek kvalitatív becslések, nem projekttervórák.

## 15. Licenc-, adatvédelmi- és teljesítménykockázatok

### 15.1 Licenc

- Apache-2.0/MIT/BSD projektek általában kereskedelmi SaaS-ban használhatók a notice- és attribution-feltételek betartásával.
- A modellfájlok licence eltérhet a futtatókódétól; RapidOCR, PaddleOCR, Docling és VLM-ek esetén artefaktszintű ellenőrzés kell.
- MuPDF AGPL vagy kereskedelmi licencet igényelhet; jelenleg ne kerüljön be.
- CubiCasa5K CC BY-NC adata kereskedelmi tréninghez nem megfelelő külön engedély nélkül.
- GPL/LGPL komponenseknél a linkelés, hálózati szolgáltatás, módosítás és terjesztés módja jogi vizsgálatot igényel. Inspirációként való tanulmányozás nem azonos a kód beemelésével.

### 15.2 Adatvédelem

- A rajz személyes adatot, címet, alaprajzot, biztonsági információt és ügyféltulajdont tartalmazhat.
- Alapértelmezés maradjon a kliensoldali/saját gépes feldolgozás.
- Saját szerveres OCR előtt szükséges adatkezelési cél, retention, hozzáférési napló, titkosítás, törlés és régió rögzítése.
- Benchmarkkorpuszba csak engedélyezett, anonimizált vagy szintetikus/nyílt licencű rajz kerülhet; `DEMO` jelölés kötelező, ha nem valódi szakmai adat.
- Harmadik fél VLM/OCR API-ja külön, explicit felhasználói döntés nélkül nem kaphat rajzot.

### 15.3 Mobil teljesítmény

Mérendő, nem feltételezendő:

- cold és warm start;
- p50/p95 oldalrender és gesztuslatencia;
- peak JS heap, WASM memória, canvasok összes bájtja;
- 2–4 GB RAM-os Android és régebbi iPhone viselkedés;
- 1×/2× render, 90° forgatás, oldalváltás és megszakítás utáni felszabadulás;
- 50/200/500 szöveg-hitbox és 10/50/200 poligonpont;
- háttérbe helyezés/visszatérés, touchcancel és orientation change.

A Playwright [device emulation](https://playwright.dev/docs/next/emulation) viewportot, user agentet és touch környezetet emulál, de nem helyettesít valódi telefonmemóriát, GPU-t és böngészőfolyamat-korlátot.

## 16. Összevetés a jelenlegi megoldással

### 16.1 Tesseract és alternatívák

| Szempont | Tesseract.js most | PaddleOCR/RapidOCR/docTR |
|---|---|---|
| adat helye | böngésző, kiváló privacy | saját gép/szerver tarthatja lokálisan |
| jelenlegi bizonyíték | 0/15 literális találat a mintán | TetőPro-mintán még nincs bizonyíték |
| mobil web | működik, de lassú/memóriaigényes | nem kész browser-first út |
| rajzszemantika | nincs | nincs |
| következő lépés | marad kézi segéd | közös, vak benchmark |

### 16.2 PDF.js-szöveg és vektoros mérés

| Szempont | szövegréteg | operator/vonal-geometria | kézi kalibráció/poligon |
|---|---|---|---|
| born-digital szöveg | erős | nem célja | nem szükséges |
| scan | nincs | nincs | működhet olvasható ismert mérettel |
| jelentés | nincs | nincs | felhasználó adja |
| pontosság | span bbox, nem tintakontúr | PDF-grafikai állapottól függ | kalibráció és pontkijelölés bizonytalanságától függ |
| automatikus kockázat | rossz párosítás | vonal szerepe ismeretlen | kisebb, mert explicit megerősítés |

### 16.3 Kétpontos szakasz és többpontos geometria

A jelenlegi két sarok jó ROI/területkijelölés, de nem szakmai kontúr. A többpontos modellnek külön típusokat kell kezelnie:

- kalibrációs szakasz;
- mérési polilánc;
- zárt vetületi poligon;
- szakmai éljelölt, amely csak megerősítés után kap `eave`/`ridge`/`hip`/`valley` jelentést.

### 16.4 Oldalsó panel és dokumentum-munkatér

A jelenlegi panel a mezőkitöltéshez jó, de többpontos szerkesztésnél a dokumentum a fő munkafelület. Kis képernyőn a javasolt minta:

- teljes szélességű dokumentumnézet;
- alsó, összecsukható eszköztár;
- rövid, kontextuális bizonyítékkártya;
- mezőlista csak jóváhagyáskor vagy külön lapon.

Nem indokolt egy teljes CAD-felület; a feladat egyetlen kalibráció és egyetlen aktív geometria szerkesztése legyen.

## 17. Prioritási ajánlás

### A – közeli, kis kockázatú kutatás/PoC

1. Reprezentatív, jogtiszta TetőPro-benchmark és metrikák.
2. PaddleOCR + RapidOCR + jelenlegi Tesseract vak összevetése.
3. Kétpontos oldalkalibráció, második méretes konzisztenciaellenőrzés.
4. Polilánc/poligon overlay a meglévő PDF.js fölött.
5. Konva és egy minimális saját overlay összevetése; OpenLayers-interakciók mintaként.
6. Born-digital PDF-vektor PoC PDF.js operatorlistával és pdfplumber kontrollal.
7. A forrás, oldal, kalibráció, pontok, eltérés és kézi jóváhagyás változtathatatlan snapshotja.

### B – csak az A eredménye után

1. docTR kontrollmotor.
2. OpenCV vonal-/sarokjelöltek snaphez.
3. Turf/Martinez poligonellenőrzés és közös határ.
4. OpenSeadragon nagy raszteroldalakhoz, ha a készülékmérés ezt indokolja.
5. Saját szerveres OCR privacy- és üzemeltetési tervvel.
6. Property-based geometriai tesztelés fast-checkkel, ha a poligonállapottér bővül.

### C – most ne

1. PDF.js teljes lecserélése.
2. MuPDF.js közvetlen beépítése licencdöntés nélkül.
3. CubiCasa5K-alapú kereskedelmi modelltréning.
4. VLM/OCR közvetlen automatikus kalkulátorbevitele.
5. Teljes BIM/IFC-, CAD- vagy CRDT-kollaborációs réteg.
6. Gyártási nesting/vágásoptimalizálás igazolt darabkontúr és gyártói szabály nélkül.
7. Alaprajzi épületkontúr automatikus tetőkontúrként kezelése.

## 18. Kis kockázatú későbbi PoC-k

### PoC-1 – OCR-vakteszt

- Bemenet: legalább 30–50 engedélyezett oldal, előre rögzített ground truth.
- Motorok: Tesseract.js, PaddleOCR, RapidOCR; docTR csak szükség esetén.
- Kimenet: CER/WER mellett pontos numerikus érték, egység, bbox, társítás, abstention, p95 idő és peak RAM.
- Stopfeltétel: ha egyik motor sem éri el a szakmai numerikus és társítási küszöböt, nincs termékintegráció.

### PoC-2 – kalibrált poligon

- Egy PDF-oldal, egy ismert távolság, egy ellenőrző távolság, egy zárt poligon.
- Nincs OCR, nincs automatikus szakmai osztályozás.
- Összevetés: minimális saját SVG/canvas overlay kontra Konva.
- Stopfeltétel: koordinátaroundtrip hiba, pinch/pan konfliktus vagy elfogadhatatlan telefonmemória.

### PoC-3 – vektoros snap-jelöltek

- 5–10 born-digital PDF ugyanazon oldalán PDF.js `getOperatorList()` és pdfplumber objektumkinyerés.
- Csak hosszú, egyenes, látható vonal jelöltként; clipping és transzformáció naplózva.
- Stopfeltétel: dokumentumonként eltérő, nem stabil kódolás vagy sok méretsegédvonal/téves kontúr.

### PoC-4 – topológiai szekciógráf

- Két vagy több felhasználó által jóváhagyott poligon.
- Turf/Martinez csak átfedést, rést és közös határjelöltet számít.
- A közös él szakmai típusa továbbra is kézi.
- Stopfeltétel: numerikus instabilitás, önmetszés vagy a domainmodellhez nem illeszkedő eredmény.

### PoC-5 – fizikai mobilprofil

- Legalább egy alacsonyabb memóriájú Android és egy iPhone/Safari.
- Forgatás, pinch/pan, 200 pont/hitbox, háttérbe helyezés és megszakítás.
- A mérés előtt rögzített memória-, FPS- és interakciós küszöb.

## 19. Mit ne vegyünk át

- Ne építsünk „AI-first” automatikus kitöltést, ha a rendszer nem tud biztonságosan tartózkodni.
- Ne kezeljük a GitHub-csillagot szakmai pontosságként.
- Ne használjunk szobafelismerő benchmarkot tetőgeometria-bizonyítékként.
- Ne engedjük, hogy OCR/VLM eredmény forrásoldal, bbox, motorverzió és megerősítés nélkül tartós adattá váljon.
- Ne másoljuk be teljes OpenLayers-, Excalidraw-, IFC- vagy BIM-ökoszisztémát egyetlen rajzeszköz kedvéért.
- Ne vezessünk be XState-et vagy Yjs-t addig, amíg egyszerű reducer, illetve egyfelhasználós munkamenet elegendő.
- Ne állítsunk elő beszerzési vagy gyártási mennyiséget gyártói adat, veszteségszabály, vágási hézag és szakmai jóváhagyás nélkül.
- Ne tekintsük a Playwright mobil emulációját fizikai készüléktesztnek.

## 20. Végső ajánlás és válasz a nyolc döntési kérdésre

### 1. Melyik öt open-source projekt a legígéretesebb számunkra?

1. **[Konva](https://github.com/konvajs/konva):** szerkeszthető, mobilbarát pont-, vonal- és poligon-overlay a meglévő PDF.js canvas fölött.
2. **[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR):** a Tesseract legerősebb első OCR-kihívója saját gépes/szerveres benchmarkhoz.
3. **[pdfplumber](https://github.com/jsvine/pdfplumber):** gyorsan eldönti, hogy a born-digital PDF-ekből ténylegesen nyerhető-e használható vonal-, görbe- és karaktergeometria.
4. **[OpenLayers](https://github.com/openlayers/openlayers):** érett Draw/Modify/Snap/Measure és touch-interakciós minták; nem feltétlenül teljes dependencyként.
5. **[Martinez](https://github.com/w8r/martinez):** igazolt felhasználói poligonok metszése, uniója, különbsége és közös területének kezelése.

A meglévő [PDF.js](https://github.com/mozilla/pdf.js) továbbra is alaptechnológia, a [RapidOCR](https://github.com/RapidAI/RapidOCR) pedig a PaddleOCR CPU/ONNX kontrolljelöltje.

### 2. Melyik meglévő TetőPro-problémát oldhatná meg mindegyik?

- **Konva:** a kétpontos téglalapot többpontos, szerkeszthető, visszavonható rajzi geometriává bővítheti anélkül, hogy PDF-renderelőt cserélnénk.
- **PaddleOCR:** csökkentheti a scaneken tapasztalt karakter-, forgatás- és kisfelirat-hibákat; a műszaki társítást nem oldja meg.
- **pdfplumber:** feltárhatja a PDF.js szövegréteg mögötti karakter-, vonal- és görbeobjektumokat, és kizárhatja a nem életképes „PDF-ből CAD” irányt.
- **OpenLayers:** kipróbált mintát adhat pinch/pan, Draw/Modify/Snap, hit tolerance és dokumentum–viewport koordinátakezeléshez.
- **Martinez:** validált tetőszekciók átfedését, rését és közös határjelöltjét számíthatja; az él szakmai típusát nem állapítja meg.

### 3. Találtunk-e lényegesen jobb megoldást a jelenlegi Tesseract-használatnál?

**Ígéretesebbet igen, bizonyítottan jobbat még nem.** A PaddleOCR, RapidOCR és második kontrollként a docTR valószínűleg erősebb detektor/felismerő pipeline-t ad, de a TetőPro E-01 jellegű rajzain nincs még közös vakteszt. A Tesseract csak akkor cserélhető le, ha a kihívó a pontos numerikus érték, tizedesjel, mértékegység, bbox, társítás, p95 idő és peak RAM terén is jobb. A puszta CER/WER-előny nem elég.

### 4. Találtunk-e megbízhatóbb, OCR nélküli módszert a rajzi méretekhez?

**Igen:** kétpontos, ismert méretű oldalkalibráció; második ismert mérettel végzett konzisztencia-ellenőrzés; ezután felhasználó által rajzolt polilánc/poligon. PDF-vektor vagy OpenCV csak snap-jelöltet kínál. Ez megbízhatóbb, mert a skálát és a tetőkontúrt ember igazolja, a bizonytalanság pedig mérhető és tárolható.

### 5. Mely megoldások használhatók kereskedelmi TetőPro SaaS-ban megfelelő feltételekkel?

- **Apache-2.0:** PDF.js, PaddleOCR-kód, RapidOCR-runtime, docTR, OpenCV.
- **MIT:** Konva, pdfplumber, Turf, Martinez és több kisebb geometriai komponens.
- **BSD-2/BSD-3:** OpenLayers, OpenSeadragon.

Ezeknél notice/attribution és transzitív licencellenőrzés szükséges; az OCR-/VLM-modellsúlyokat külön kell auditálni. MuPDF.js AGPL/kereskedelmi kettős licence, CubiCasa5K CC BY-NC adata, valamint GPL/LGPL komponensek esetén nem mondható ki automatikusan ugyanez.

### 6. Melyik három fejlesztési lehetőséget vizsgálnánk meg először?

1. **Rajzspecifikus OCR-vakteszt:** Tesseract.js kontra PaddleOCR és RapidOCR, azonos ground truth és erőforrásmérés mellett.
2. **Kalibrált poligon PoC:** minimális saját overlay kontra Konva a jelenlegi PDF.js fölött, fizikai mobilméréssel.
3. **Born-digital vektoros snap PoC:** PDF.js `getOperatorList()` kontra pdfplumber 5–10 reprezentatív PDF-en.

### 7. Mit biztosan nem építenénk be most?

- OCR- vagy VLM-kimenet közvetlen, ellenőrizetlen kalkulátorbemenetként;
- MuPDF.js a PDF.js helyére AGPL/kereskedelmi licencdöntés és bizonyított technikai előny nélkül;
- CubiCasa5K-adatra épülő kereskedelmi tréning külön engedély nélkül;
- teljes CAD/BIM/IFC-, mikroszerviz- vagy CRDT-rendszer;
- épületkontúr automatikus tetőkontúrként;
- gyártási nesting, amíg nincs gyártható darabmodell és gyártói szabály.

### 8. Milyen új ötlet született, amely az M12-ben eddig nem szerepelt?

A **kettős bizonyítékú kalibráció és szekciógráf**: egy ismert méret kalibrál, egy második független méret ellenőrzi a skálát; a felhasználó által jóváhagyott poligonokból topológiai gráf készül. A gráf csak átfedést, rést és közös él-jelöltet ad, a felhasználó pedig szakmailag `eresz`/`gerinc`/`élgerinc`/`vápa` típust rendel hozzá. A snapshot megőrzi az oldalhash-t, pontokat, skálaeltérést és jóváhagyást. Így OCR nélkül is létrejöhet ellenőrizhető geometriai bemenet, miközben az automatika nem talál ki tetőt.

### Vezetői, legfeljebb tízpontos összefoglaló

1. A PDF.js marad; motorcsere nem indokolt.
2. Az M12.2 továbbra is blokkolt, mert az OCR- és társítási pontosság nem bizonyított.
3. A legjobb új irány az OCR nélküli, kétpontos kalibráció + többpontos geometria.
4. PDF-vektor és OCR csak jelöltet adjon, ne automatikus szakmai értéket.
5. PaddleOCR és RapidOCR legyen az első vak OCR-benchmark, Tesseract kontrollal.
6. Konva/minimális overlay és OpenLayers-interakciók adhatják a leggyorsabb mobil PoC-t.
7. Turf/Martinez csak ember által igazolt poligonok után szükséges.
8. CubiCasa/VLM/BIM/nesting nem közeli termékkomponens.
9. Minden eredményhez forrás, oldal, koordináta, motor/verzió, bizonytalanság és jóváhagyás tartozzon.
10. A döntést rajzspecifikus pontosság, p95 latency, peak RAM, licenc és fizikai mobilmérés hozza meg.

