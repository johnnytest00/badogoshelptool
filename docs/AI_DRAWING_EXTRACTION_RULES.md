# Tervrajz-kinyerési szabályok

**Verzió:** 0.1.4
**Állapot:** M12.1 PDF-alapmotor és M12.2 OCR-alapmotor elkészült; E-01 0/15 pontos OCR-egyezése miatt az OCR-műszaki kapu **BLOCKED**. M12.4 három szűk PDF.js rafter-cut szabályt, M12.5 pedig csak a `FÖLDSZINTI ALAPRAJZ` dokumentumcímet osztályozza; egyik sem oldja fel az OCR-kaput.
**Hatókör:** kliensoldali PDF.js/OCR forrásjelöltek és ember által jóváhagyott draftátvitel; általános műszaki osztályozás nélkül.

## Működési alapelvek

1. A PDF-ből származó érték csak jelölt, amíg a kategóriája és forrása nem ellenőrizhető.
2. A dokumentumból nem kiolvasható vagy többféleképp értelmezhető adat `unknown` vagy `ambiguous`; nem kap becsült értéket.
3. Minden jövőbeli jelölt munkamenet-azonosítót, oldalszámot, eredeti feliratot, módszert és állapotot igényel. Koordináta csak tényleges PDF/OCR-forrásadatból adható meg; különben `null`.
4. Felismert adat nem tölthet mezőt és nem indíthat mentést felhasználói jóváhagyás nélkül.
5. Az elemző a már létező kalkulátorokat használja; új geometriai számítómotort és képletmódosítást nem vezet be.
6. A PDF és az OCR-szöveg a feldolgozás idejére memóriában marad. Nincs automatikus feltöltés, tartós böngészőtár, érzékeny naplózás vagy külső AI API.

## Első vizsgált kalkulátor

A jelenlegi katalógus 31 építési kalkulátort sorol fel. Az első vizsgált cél a `roof.rafter-cut` (`src/domain/calculations/construction/catalog.ts`, `src/features/calculators/roof-calculator-definitions.ts`): egy szarufához közvetlenül szükséges a fél fesztáv, gerincemelkedés, vízszintes ereszkiülés és HAP. Ezek közül tervről csak olyan méret használható fel, amelynek nézete, végpontjai és műszaki jelentése bizonyítható. A szokásos alaprajz mérete önmagában nem igazolja a tető vagy a szarufa méretét.

Ez csak kiválasztott pilotjelölt, nem támogatott automatikus integráció. A `roof.material-takeoff` tetőformát, tetőhosszt, tetőszélességet és fokban megadott hajlást kér; ezekhez tetőalaprajzi bizonyíték kell. Az E-01-en ellenőrzött szövegpozíciók nem bizonyítják egyik jelölt valódi rajzos alkalmasságát vagy a méretek műszaki jelentését.

## Bizonyíték- és állapotmodell

Az első implementáció előtt szükséges minimális típusos szerződés:

| Adat | Kötelező tartalom |
|---|---|
| Forrás | feldolgozási munkamenet, 1-től számozott oldal, eredeti felirat |
| Pozíció | normalizált x/y csak igazolt koordinátából; egyébként `null` |
| Módszer | `pdf-text`, későbbi OCR-nél `ocr`, számított következménynél `rule-derived`, kézi adatnál `user-input` |
| Jelentés | műszaki kategória, mértékegység, normalizált érték; rendezetlen adatnál nincs normalizált mezőérték |
| Állapot | `unknown`, `ambiguous`, `candidate`, `conflict`, `validated`, `approved` |
| Jóváhagyás | csak explicit felhasználói művelet állíthatja `approved` állapotba; munkamenethez kötött |

Ez a táblázat szerződéstervezet, nem implementált adatmodell.

## Kategóriavédelem

A következő osztályok különállók: külső épületméret, belső helyiségméret, méretlánc-rész, nyílászáró, falvastagság, keresztmetszet, szintmagasság, százalékos lejtés, fokban megadott tetőhajlás, ereszkiülés, gerinc/ereszvonal, vízszintes tetővetület, ferde hossz, alapterület és tetőfelület. Egy puszta szám vagy közeli OCR-szöveg nem bizonyítja a kategóriát.

M12.1-ben egyetlen kategória-hozzárendelés sincs automatizálva. A lexikai számfelismerés önmagában nem elegendő bizonyíték.

## Rajztípus és mértékegység

Tervezett típusok: építészeti alaprajz, tetőalaprajz, metszet, homlokzat, csomópont, méretezett kézi vázlat, ismeretlen. M12.1-ben nincs rajztípus-felismerés; minden dokumentum műszaki típusa `unknown`, amíg nincs címkézett referenciateszt.

A magyar tizedesvesszőt és explicit egységeket külön kell kezelni. A `%` nem fok, a `m²` nem hossz, a keresztmetszeti perjel nem méretlánc, a névleges lépték nem kalibráció. Léptékből vagy képpontból fizikai méretet nem számítunk.

## Negatív szabályok

Az M12.0 tesztterv az alábbi elutasításokat követeli meg a jövőbeli besorolás előtt. A számok a kérésben megadott, referenciadokumentumhoz kötött példák; a forrásfájl hiánya miatt ezek itt specifikációs elvárások, nem lefuttatott teszteredmények.

- `17,00` nem válik automatikusan tetőhosszzá.
- `14,50` nem válik automatikusan szarufahosszzá.
- `4,0%` nem válik a főtető hajlásszögévé.
- `43,38 m²` nem válik tetőfelületté.
- `12x16,25/27` nem válik egyszerű hosszméretté.
- `M=1:100` nem ad jogot képpont–méter átszámításra.
- Hiányzó tetőgeometria visszakérdezést igényel, nem következtetett bemenetet.

## PDF.js feldolgozó határ (M12.1)

A `src/infrastructure/drawings/pdf-text-extractor.ts` lusta PDF.js importot és szekvenciális `streamTextContent()` feldolgozást használ. Megőrzi az eredeti szöveget, oldalszámot, oldalméretet, forgatást és `pdf-text` módszert; normalizált, viewporthoz viszonyított kezdőpontot és megbízható esetben szövegfutam-befoglalót számít. Node alatt legacy buildet, böngészőben normál PDF.js buildet használ; megszakításkor/dokumentumzáráskor felszabadítja az oldalt és PDF.js betöltési feladatot. Az átadott bájtokról készített másolat megőrzi a hívó `Uint8Array`-t, de növeli memóriahasználatot.

Koordináta a forgatott PDF viewport 0..1 tartományában van, a lap bal felső sarkától; zoom nem változtatja a forráskoordinátát, csak a renderelt vásznat. A `rotationDegrees` a PDF.js text item transzformációjából becsült szövegfutam-irány; fontmetrikák/ferdeség miatt nem karakterpontos szög. A keret a PDF.js szövegfutam transzformációjából és szélesség/magasság metrikájából származik, nem karakterek tintapontos doboza. Nem véges, lapon kívüli vagy hiányos geometria esetén `null` kerül vissza. A forgatott/zoomolt böngészős E-01 preview/overlay együtt mozgott; ez vizuális pozícióbizonyíték, nem méretértelmezés.

Védelmi korlátok: fájl 32 MiB; 100 oldal; 100 000 szövegelem; 5 MiB összes szöveg; 200 000 token; preview 8 000 000 pixel. A bemeneti másolat miatt két 32 MiB-os tömb lehetséges; a preview 8 MP-es RGBA pixeltára elméletileg 32 MB. A PDF.js belső és böngészőmemória ezen felül van; ezeket a limiteket nem szabad teljes mobileszköz-memóriagaranciának tekinteni. A PDF.js megszakítási útvonala és határok Vitestben teszteltek; fizikai mobilmemória-/latenciamérés nincs.

Csak PDF szövegrétege érhető el. Szkennelt/képalapú vagy pusztán rajzi vonalakat tartalmazó oldal OCR nélkül üres szöveget adhat. Sérült és jelszóvédett fájlhoz nincs automatikus javítás vagy jelszókérés; típusos, felhasználóbarát hiba jár. A normalizálás NFC-t/whitespace-t rendez és általános lexikai tokeneket állít elő. Nem konvertál egységet, nem állít elő megbízható műszaki méretet és nem ad kalkulátorjavaslatot.

A fejlesztői vizsgáló `/devtools/m12-pdf`; éles módban 404-et ad. A PDF csak lokális böngészőmemóriába olvasódott, nincs hálózati API, adatbázis, tartós mentés vagy dokumentumtartalmat rögzítő log. A production build worker assetet bocsátott ki, a böngészőben az asset URL volt konfigurálva és a parse/render működött; külön hálózati Worker-instance/response telemetria nem állt rendelkezésre, a PDF.js `verbosity: 0` diagnosztikai üzenetek némák.

### E-01 valós OCR-ellenőrzés (2026-10-30)

Az egyoldalas, lokális építészeti alaprajzon a kézzel ellenőrzött 15 jelölés szó szerinti OCR-egyezése 0/15. A széles ROI-ban méretlánc-összeolvadás, `4,55`→`455`, `2,35`→`235`, `7,75`→`775`, `17,00`→`17.00` hiba jelentkezett. A célzott 90° crop a `3,85` és `14,50` bounding boxát helyesen lokalizálta, de `3.85` és `14.50` alakra írta át (78–88%, illetve 79–81% confidence). Ezek `conflict`, nem elfogadható méret. 0° crop egyik értéket sem ismerte fel. A széles ROI egyedi futásai 1×/2× 10,7/16,9 s; célzott 90° futásai 6,8/5,7 s voltak. Memória-csúcsmérés nem volt elérhető.

Automatikus illesztés felé csak a nyers szöveg, oldal, módszer/motor és képen ellenőrzött normalizált pozíció/keret vihető nem jóváhagyott `unknown`/`conflict` bizonyítékként. E próba alapján motor által felismert numerikus érték, egység, méretosztály, lejtés, terület, keresztmetszet vagy kalkulátormező nem továbbítható automatikus értékként. M12.3A ettől különbözően csak ember által a rajzon ellenőrzött és kézzel beírt értéket vihet a draftba, felhasználói jóváhagyás után. A `1450` nem alakítható `14,50`-re feltételezéssel; OCR pont és PDF vessző nem vonható össze automatikusan. Építészeti alaprajz csak ember által vizuálisan ellenőrzött forrásként tekinthető feldolgozottnak; tetőalaprajz, metszet, homlokzat, csomópont és kézi vázlat validációja nincs.

## OCR határ (M12.2)

A `src/infrastructure/drawings/ocr.ts` kliensoldali Tesseract.js 7.0.0 modult ad. JPG, PNG, WebP és explicit kiválasztott PDF-oldal támogatott. PDF.js ellenőrzi az oldal szövegrétegét OCR előtt; bármilyen használható szöveg esetén az OCR út elutasítja a feldolgozást, a felület pedig nem kínál OCR gombot. Képalapú PDF csak a kiválasztott oldal explicit OCR-akciójára renderelődik. Külön OCR forrásokat nem fűzünk automatikusan a szövegréteges kimenethez.

A worker, WASM core és magyar tessdata az app saját `/ocr/` statikus útvonaláról jön. A CDN-default felül van írva, `workerBlobURL: false`, cache read/write letiltva; a Tesseract nem kap hálózatra küldhető fájlműveletet. A fájl bájtjai és szövege kizárólag böngésző memóriában vannak. Bemenet 16 MiB, feldolgozott canvas 8 MP; JPG/PNG/WebP méretkorlát fejlécvizsgálata még a teljes képfelbontás előtt történik, a dekódolt bitmap ellenőrzése második védelmi vonal. A 8 MP-es RGBA vászon 32 MiB pixeltár, a dekóder és WASM memória ezen felül. Mobilon memória/latencia nincs mérve, ezért a határ nem jelent mobileszköz garanciát.

Mindkét módszer ugyanarra a `DrawingTextSource` szerződésre ír. OCR soronként visszaadja az eredeti olvasatot, Tesseract 0..100 confidence értéket, 1-alapú oldalt, teljes oldali normalizált pozíciót/keretet és `tesseract.js@7.0.0` eredetet. A `confidence < 60` csak `ambiguous`-t állít; nagyobb érték is `unknown`. OCR önmagában nem állítja be a műszaki kategóriát, mértékegység-konverziót, dimenziót vagy kalkulátormezőt.

Korlátok: Tesseract LSTM modell magyar nyelvhez; a valós böngészőben a szintetikus `14,50` méret képen `1450`-re veszett el (57%, ezért `ambiguous`), ugyanaz az image-only PDF render után `14,50` lett (56%, szintén `ambiguous`). A `8,20` néha `8.20` formátumú ponttal jött vissza. Ez a minimális DEMO készlet bizonyítja az OCR működését és egy valós hibát; általános pontosságot nem igazol. Három kézírás-hatású demo fonttal készült, nem hiteles kézírás, ezért kézírás nem támogatott. Preprocesszálás nem automatikus; egy 2× Node kísérlet javította a vesszőt, de kb. 2.5× OCR-időt igényelt. A böngésző diagnosztika fejlesztői route, éles környezetben 404.

## M12.3A–C ember által jóváhagyott átvitel

A `Kitöltés tervrajzból` panel mind a négy jelenlegi `roof` kalkulátoron elérhető. A PDF.js/OCR szöveg kattintható forrásjelölt; OCR confidence nem növeli a jóváhagyást, és OCR-ből numeric javaslat nem készül. M12.3B óta az egyértelmű, egy számot és explicit egységet tartalmazó PDF.js-szöveg szerkeszthető értékjavaslatot adhat; M12.3C óta egység nélküli egyetlen pozitív számhoz a felhasználónak ezen a feliratonként ki kell választania mm/cm/m-t. Explicit PDF-egység mindig előnyt élvez. A kézi célmezőválasztás, ellenőrzött szerkeszthető érték, meglévő mező felülírásának külön engedélyezése és végső jóváhagyás továbbra is szükséges.

Jóváhagyás előtt a célmező meglévő szerződése fut; meglévő érték külön jóváhagyás nélkül nem írható felül. A részleges mezőjóváhagyás csak a helyi kalkulátordraftot frissíti, teljes számításhoz és mentéshez továbbra is teljes, érvényes input szükséges. A fájl és javaslat kliensmemóriában marad. Az egységválasztás oldal-/forrásváltáskor törlődik, nem öröklődik csendben. A `1450` nem lesz `14,50`; `%`, terület, keresztmetszet, méretarány, OCR vagy többértékű sor nem ad biztonságos hosszmérték-javaslatot.

## M12.4 explicit rafter-cut mezőszabályok

Csak `roof.rafter-cut` esetén és kizárólag a `pdf-text` / `pdfjs-dist@6.4.299` forrás, dokumentumazonosító, oldal, pozíció és keret meglétekor adható szabályjelölt. A parser egyetlen, egyértelmű `címke: szám egység` teljes szövegspanre illeszt; nem kapcsol össze külön spaneket távolság alapján és nem következtet rajzi vonalakból.

| Explicit címke / szinonima | Célmező | Szabály |
|---|---|---|
| `Fél fesztáv` / `Fél tetőfesztáv` | `horizontalHalfSpanMm` | `M12.4.RAFTER.HALF_SPAN` |
| `Gerincemelkedés` / `Tetőemelkedés a gerincig` | `riseMm` | `M12.4.RAFTER.RIDGE_RISE` |
| `Vízszintes ereszkiülés` / `Eresz vízszintes kiülése` | `eaveProjectionMm` | `M12.4.RAFTER.HORIZONTAL_EAVE_PROJECTION` |

Az `mm`, `cm` és `m` explicit forrásegység mm-re konvertálódik, a célmező validációja mégis kötelező. A forrásszöveg, dokumentumazonosító, oldal, pozíció/keret, forrásegység, szabályazonosító, javasolt mező és felhasználó által választott végső mező visszakereshető a munkamenetben. A javaslatot külön kell ellenőrizni és jóváhagyni; alternatív mező vagy javított szám megadható. A rajz önmagában nem engedélyez számítást vagy mentést.

Kifejezetten elutasított szövegek közé tartozik: `GERINC 8,20 m`, címke nélküli `17,00` és `14,50`, `4,0%`, `43,38 m²`, `12×16,25/27`, alaprajzi külső méret, `HAP`, többértékű sor, OCR és minden más kalkulátor. A két szintetikus PDF mérési eredménye: 6/6 pozitív eset helyes, 0 téves javaslat 13 negatív/kétértelmű mintára, mind a 13 kihagyva. Ez csak a deklarált minták eredménye, nem szakmai általánosítás. Valós, szakértő által címkézett tetőrajz-referencia hiányában a szabályok kockázata kizárólag ezekre az alakokra korlátozottan vizsgált.

## M12.5 alaprajz eredetű geometria védelme

A rajztípus `ground-floor-plan` csak akkor állapítható meg, ha PDF.js `pdf-text` források között ugyanazon az oldalon szerepel a `FÖLDSZINTI` és az `ALAPRAJZ` címrész. OCR, oldalanként különálló címrész vagy puszta méret-/terasz-/területszöveg nem elegendő. Ez dokumentumcímke, nem tetőgeometria-felismerés.

Földszinti alaprajz esetén a meglévő tető-kalkulátor geometriai mezőjébe történő draftátvitel előtt a felhasználónak külön meg kell erősítenie, hogy a kiválasztott érték ténylegesen a fedett tetőszakasz mérete. A szöveges százalékértéket a felület nem engedi `pitchDegrees` mezőbe vinni; százalékból nincs fokkonverzió. A szabálymotor továbbra sem ad javaslatot a `17,00`, `14,50`, belső/külső alaprajzi méretek, teraszok, százalékos lejtés, terület, keresztmetszet vagy egyszerű `GERINC` feliratra. A felhasználói megerősítés nem igazolja önmagában a méret műszaki helyességét.

Az E-01 alaprajzán nem látható ellenőrizhető tetőkontúr, gerinc, fokban megadott lejtés vagy ereszkontúr; tetőgeometria/anyagkimutatás ebből nem állítható elő. Még szükséges: fedett részek és teraszok, forma/gerincirány/szakaszszám, szakaszonkénti méretek és ereszkiülés, fokban vett hajlás, fedőanyag és termékspecifikáció. M12.2 OCR-pontossági kapu **BLOCKED** marad.

## Történeti technológiai döntés (M12.1, 2026-10-29)

Ez a lista az M12.1 idején rögzített döntésnapló, nem a jelenlegi függőségi állapot. Akkor a Tesseract.js még nem volt telepítve; az ezt követő M12.2 implementáció felülírta ezt a technológiai döntést. A jelenlegi állapotot a `package.json`/lock, a `src/infrastructure/drawings/ocr.ts` és a helyi `/public/ocr/` assetek bizonyítják: Tesseract.js 7.0.0 telepítve és helyi erőforrásokkal használva.

- A projekt `pdfjs-dist@6.4.299`-ot pontosan rögzített; M12.1-ben Tesseract.js még nem volt telepítve.
- A Mozilla aktuális stabil PDF.js kiadása a vizsgálatkor `6.4.299`, Apache-2.0 licenccel. A hivatalos példa oldalszintű Promise API-t, `getTextContent` alapú feldolgozást, PDF- és viewport-koordinátarendszer közötti transzformációt, valamint Canvas-renderelést mutat.
- A PDF.js deklarációit a telepített csomag tartalmazza. Next.js 16.4.2/Webpack typecheck és production build igazolta a projekt importfeloldását.
- A Tesseract.js aktuális kiadása a vizsgálatkor `7.0.0`, Apache-2.0. Az M12.1 szöveges PDF PoC-jához nem került kiválasztásra vagy telepítésre. Az M12.2 később a külön Web Worker, WASM core és magyar nyelvi adatfájl helyi, verziózott statikus erőforrásaival implementálta.
- A telepített PDF.js-et a tényleges fejlesztői diagnosztikában böngészőben fájlbetöltéssel és preview rendereléssel használtuk; production build után a diagnosztikai útvonal 404-et adott.
- A jelenlegi teljes Vitest suite **206 fájl PASS, 8 SKIP; 1291 teszt PASS, 19 SKIP**. Lint, typecheck, production build és `git diff --check` PASS. E-01 helyi olvasási próbája 467 szövegelemet adott; a fájl nem került repóba, tartalmi szöveg nem került terminál- vagy alkalmazáslogba.

Hivatkozások: [PDF.js kiadások](https://github.com/mozilla/pdf.js/releases), [PDF.js böngészős példák](https://mozilla.github.io/pdf.js/examples/), [PDF.js licenc](https://github.com/mozilla/pdf.js/blob/master/LICENSE), [Tesseract.js kiadások](https://github.com/naptha/tesseract.js/releases), [Tesseract.js TypeScript-deklaráció](https://github.com/naptha/tesseract.js/blob/master/src/index.d.ts), [Tesseract.js helyi telepítés](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md), [Tesseract.js licenc](https://github.com/naptha/tesseract.js/blob/master/LICENSE).
