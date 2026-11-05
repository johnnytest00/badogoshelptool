# TetőPro tetőkalkulátorok — UI/UX Pro Max audit

**Dátum:** 2026-11-04  
**Audit:** B fázis, forráskód + részleges élő desktop ellenőrzés  
**Státusz:** **PASS WITH LIMITATIONS** — a megvizsgált felületek és útvonalak értékelése elkészült; a mobil, fekvő mobil és sötét téma vizuális QA nem történt meg. Ez audit, nem implementációs jóváhagyás.

## Vezetői összefoglaló

A Tetőanyag-kimutatás egy központi, forma-first munkafelületet használ. A tetőforma kiválasztása után a kézi/rajzi adatút külön, a geometriamezők fokozatosan jelennek meg, a kért anyagcsoportok pedig csak a számítható geometria után. Ez a sorrend jól illik a szakember munkájához, és a nyolc tetőformához nem kell külön kalkulátor.

A legsúlyosabb probléma szakmai adatjelentés, nem vizuális díszítés: a felület „Tető hossza / Tető szélessége” néven kéri az adatot, a nyeregtető-motor viszont `buildingLengthMm`/`buildingWidthMm`-ként, vagyis falsík menti méretként kezeli, majd pozitív ereszkiülést ad hozzá. Az input snapshot ezt a mérési referenciát nem rögzíti. Ezt P0 szerződés- és mentési probléma megoldásáig nem szabad globálisan átértelmezni.

Az eszközök közötti információhierarchia alapja megfelelő: egy fő Tetőanyag-kimutatás marad a tetős katalógusban; a három speciális kalkulátor megőrizhető közvetlen hivatkozás/mentett munka útján. A glass tokenek, `GlassDisclosure`, `LengthField`, `FeatureToggle`, élő állapotok és egyértelmű mezőcímkék megtartandók. Nem találtam forrásból bizonyítható teljesítményhibát.

## Módszer és bizonyítéki határ

- Követtem a `docs/README.md` → `docs/LIBRARY.md` → `docs/maps/SOURCE_INDEX.md` navigációt; az érintett területek: `ROOF-GEOMETRY`, `ROOF-TAKEOFF`, `ROOF-TIMBER`, `ROOF-UNDERLAY`, `ROOF-COVERING`, `CALC-CONSTRUCTION` és `UI-SYSTEM`.
- Elolvastam a projekt `.agents/skills/ui-ux-pro-max/SKILL.md` útmutatását és a kereshető ux, style és Next.js ajánlásokat. A releváns szabályok: progresszív adatbevitel, látható mezőcímkék, hibák közel a mezőhöz, mobilon vízszintes túlcsordulás elkerülése, sötét/világos kontraszt külön ellenőrzése, fókusz és redukált mozgás megőrzése. A glassmorphism útmutató 10–20 px blurt javasol, de kontrasztellenőrzés mellett.
- Élő alkalmazás: a már futó `http://localhost:3000` szerverre csatlakoztam; nem indítottam új szervert. A látható in-app browser kép körülbelül 1045×935 px, világos témában. A központi kézi nyeregtető-utat kitöltöttem (12 m × 6 m, 35°, eresz üres), a nyolc alakot kiválasztottam, és közvetlenül megnyitottam a szarufa-, faanyag- és rácsostartó-eszközöket. Mentést nem végeztem.
- A tényleges viewport-mátrix (1440×900, 375×812, 812×375) és sötét téma nem volt elérhető az in-app browser felületén; konzolnapló sem volt hozzáférhető. A jelen dokumentum ezeken a pontokon DOM/source auditot jelöl, nem vizuális PASS-t. A teljes rajzfeltöltés, OCR állapot, termékadat-váltás, régi revision visszanyitás és mobil billentyűzet működése nem lett végigjátszva.
- Az UI Pro Max keresési találatai általános iránymutatások. A termékjavaslatokat a meglévő TetőPro mező-, anyag- és glass komponensekhez igazítottam, és nem adtam hozzá frameworköt vagy design rendszert.

## Megőrzendő megoldások

- Egy tetős belépési pont és forma-first adatbevitel; nem kell a speciális eszközöket visszatenni a normál katalógusba.
- Kézi és rajzi út választható ugyanazon kalkulációs feladatban; a mezőátvitel ellenőrzött jóváhagyást és konfliktusvédelmet használ.
- A mezők látható címkét, mértékegységet és az aktuális mezőnél megjelenő segítőszöveget használnak; a megfigyelt 35° fókuszállapot narancs kerettel jól észrevehető volt.
- Anyagcsoportok külön aktiválhatók; a nem kért csoport nem szükséges a geometriához. A választó a gable, shed, hip és mansard esetén teljes, más formáknál „Alátétfólia · korlátozott” jelzést ad.
- A termékértékek szerkeszthetők, és a felület elkülöníti a termék-, kézi- és felülírt forrást. Historikus anyagprofilok visszaállítása megmarad.
- Az eredmény külön jelöli a geometriai mennyiséget, a részleges/hiányos státuszt és a menthetőség korlátját. A rajz a geometriai eredmény után jelenik meg, nem helyettesíti a szöveges numerikus kimenetet.
- A `GlassDisclosure`, `LengthField`, `FeatureToggle`, theme tokenek és meglévő `construction-suite-form-grid` maradjanak a javítások alapjai.

## A központi Tetőanyag-kimutatás

### Megfigyelt útvonal

1. „Milyen tetőt szeretnél számolni?” — nyolc forma, az alátétkorlátozás előre látszik.
2. Kézi vagy rajzi adatbevitel választása.
3. Az első hiányzó szükséges geometriai adat kijelzése.
4. Alapgeometria és opcionális ereszkiülés.
5. Geometria eredménye, majd anyagcsoportok és azok műszaki adatai.
6. Rajz, részletes sík-/élmérések és mentési panel.

12×6 m, 35° nyeregtetőnél üres ereszmezővel a felület a tényleges motorból **72,00 m² vetületet, 87,90 m² síkfelületet, 24,00 m ereszélt és 12,00 m gerincet** mutatott. Ez megerősíti a számolást ennél a numerikus esettől; önmagában nem igazolja a méret forrását.

Képernyőn az inputok és az eredmény ugyanazon hosszú munkafelület részei, ezért egy összetett faanyag + fólia + fedés kalkulációban az eredmény és mentés a formmezők, anyagparaméterek és rajz után következik. A komponens ezeket külön szekciókra bontja; a jelenlegi sorrend konzisztens, de mobilon a görgetési költséget külön kell mérni.

## Nyolc tetőforma külön értékelése

| Forma | Bemenet és motor | Felületi értékelés | Megtartandó / auditjavaslat |
|---|---|---|---|
| Nyeregtető | Hossz, szélesség, hajlás; ereszkiülés; részletesen elöl/hátul külön homlokzati túlnyúlás. A motor szimmetrikus, két síkot használ. | A forma érthető, kevés alapmező. A „tetőméret” és a motor falméret-jelentése eltér; P0. | Mérési referenciát verziózott bemeneti adathoz kötni; a mezőszöveg ezt tükrözze, új selector nélkül. Homlokzati adat maradjon részletes szekcióban. |
| Félnyeregtető | Hossz, szélesség, hajlás, opcionális ereszkiülés. A motor az ereszt az alacsony oldalon, egy irányban terjeszti. | Megosztja az eresz címkét a nyeregtetővel, de geometriája egyoldali. A rövid help nem nevezi meg az alacsony oldalt. | P1: meglévő help szöveg alakfüggővé tétele ugyanabban a mezőben; ne adjunk új mezőt vagy panelt. |
| Kontytető | Hossz, szélesség, hajlás; négysíkú modell, külön ereszmező nincs. | A felhasználó nem adhat meg a fő bemenetben külön túlnyúlást; a méretek a modell határát jelentik. Alátét támogatott. | A teljes külső vetületként jelölt bemeneti szerződéshez igazítani a címkét; megtartani az egyszerű alapűrlapot. |
| Sátortető | Négyzetes oldalhossz és hajlás; négy sík. | A „négyzet oldalhossza” konkrétabb a közös hossz/szélesség címkéknél. Alátét korlátozása a chooserben látszik. | Megtartandó; anyagkimeneteknél a korlátozott alátét állapota maradjon látható. |
| Félkontytető | Hossz, szélesség, hajlás és félkonty ereszmagasság. | Egyedi szakmai paraméter, a többi alakhoz képest többlet adat. A mező neve érthető, a geometriai megengedett tartomány validációja forrásban van. Alátét korlátozott. | Megtartandó; hibás magasság esetén a mező mellett jelenjen meg a konkrét tartományi hiba. Ezt mobilon ellenőrizni kell. |
| L alakú tető | Fő hossz/szélesség, hajlás, szárny szélessége és kiülése. A motor a szárnyat a főalak egyik szélére helyezi. | A megfigyelt selectorból a két szárnymező fokozatosan jelent meg; az orientációt a vázlatnak kell egyértelművé tennie. Alátét korlátozott. | P1: meglévő mérési rajz/útmutató mutassa meg a beépítési irányt és az átfedő fő-/szárnyrészt; ne adjunk új lépést. |
| T alakú tető | Fő hossz/szélesség, hajlás, középre helyezett szárny szélessége és kiülése. | Az L mezőkkel azonos címkék eltérő alaprajzi elhelyezést jelentenek. Forrásban külön geometria, UI-ban az illusztráció segíti. Alátét korlátozott. | P1: a meglévő alakrajz/mező-útmutató tegye világossá a középre igazítást; a rövid label maradhat. |
| Manzárdtető | Hossz/szélesség, alsó futás oldalanként, alsó és felső emelkedés; a két hajlás a méretekből számítódik. | Több adat kell, mert a modell két tetősík-szakaszt használ. A hajlásmező helyett az emelkedések jelennek meg; ez helyes, de első használatkor indokolható rövid, inline leírással. Alátét támogatott. | P2: a már létező tömör mérési help emelje ki, hogy két emelkedést kér, ne plusz „hajlás” mező. |

Minden tetőformánál a geometria közös `RoofGeometry` eredménnyé alakul. A faanyag-, fólia- és fedőanyag-motorok ezt az eredményt kapják, nem külön UI-ból újraszámolt footprintet. Egyes alakoknál a fizikai kiosztás vagy alátét layout korlátozott marad; ezt az eredmény státuszának továbbra is jeleznie kell.

## Speciális tetőkalkulátorok

| ID | Élőn megfigyelt felület | Értékelés |
|---|---|---|
| `roof.material-takeoff` | Forma-first chooser, kézi/rajzi mód, geometria, anyagcsoportok és eredmény. | Fő termékút; normál katalógusban egyedüli tetős kalkulátorként maradjon. |
| `roof.timber-cutlist` | Külön rafter/batten max osztás, opcionális rafter/léc keresztmetszet és termékspec, geometria után. | A megadandó kiosztás és az opcionális térfogati adatok jól szétválnak. A leírás kimondja, hogy vágási ráhagyás nincs. Közvetlen út/mentett munka maradjon. |
| `roof.rafter-cut` | Fél fesztáv, gerincemelkedés, ereszkiülés, HAP; opcionális csatlakozási/kiosztási információ. | Szakmai mérési definíció részletes, HAP súgó tisztázza a függőleges referenciát. A sok kapcsolati mező progresszív csoportjai hasznosak. Közvetlen út/mentett munka maradjon. |
| `roof.truss-members` | Fesztáv, szerkezeti magasság, fél-fesztáv osztásszáma. | Rövid, célzott forma. Az inline note világosan jelzi, hogy belső rácsozatot és teherbírást nem tervez; ezt a szakmai korlátozást megtartani. Közvetlen út/mentett munka maradjon. |

Mindhárom speciális kalkulátor azonos kézi/rajzi választást és mentési felületet használ; külön normál katalóguscsempét nem javaslok.

## Prioritásos javaslatok

Minden javaslat megvalósítás előtt külön jóváhagyást igényel, kivéve az A fázis P0 szerződés megoldását, amely a következő geometriai implementáció előfeltétele.

| Pri. | Érintett elem | Probléma és bizonyíték | Következmény | Konkrét javaslat | Újrahasználandó rendszer | Kockázat |
|---|---|---|---|---|---|---|
| **P0** | Központi gable/shed mezőszerződés, mentés és rajzi átadás | `roofGeometryInputFromFields` gable ága `lengthMm/widthMm` mezőket `buildingLengthMm/buildingWidthMm`-re képezi. `calculateGableRoof` mindkét oldalon hozzáadja az ereszt; input snapshot v1 csak calculatorId/fields/material mezőket tárol. | Teljes külső méret és falméret nem különböztethető meg; régi V1 újraszámítása félreértelmezhető. | Új, nem látható input-contract verzió: új kézi munkánál outer-footprint; régi, verzió nélküli mentésnél legacy-wall. Rajzi átadásnál a meglévő szemantikus provenance vezérelje, ne a mező üressége. A positive eave ne módosítsa a már outer footprintet; ahol támaszpont kell, maradjon incomplete, amíg modell nem adja meg. Ezt oldjuk meg a motor/UI label módosítása előtt. | `constructionInputSnapshotSchema`, server `saveConstructionCalculationAction`, `RoofGeometry`, drawing transfer approval/source semantics, meglévő gable adapter. | Magas: mentett revision, szerveroldali recompute, rajzi jóváhagyás, calculation identity. Sémaverzió és legacy replay tesztek nélkül nem implementálható. |
| **P1** | Shed ereszkiülés help | Ugyanaz az `eaveOverhangMm` mező, mint nyeregtetőnél, de a shed motor csak az alacsony oldali él felé terjeszti a vetületet. A live mező help csak a falsíkot és szélességet nevezi meg. | A szakember kétoldali túlnyúlást feltételezhet. | A meglévő help szöveg shapefüggően mondja meg: shednél az alacsony ereszoldal; gable-nél mindkét ereszoldal. | `Field.help`, jelenlegi inline `<small>`, `LengthField`. | Alacsony; csak szöveg, de A fázis verziózott szemantikájához kötendő. |
| **P1** | L/T alakú tetőmérés | Azonos „Szárny szélessége/kiülése” mezők külön topológiájú (oldalra helyezett vs középre igazított) modellekhez tartoznak. | Hibás irányú kézi adat lehet valid számmal. | A meglévő shape glyph és `MeasurementGuidance` ugyanazon mezősor mellett adjon egy világos alaprajzi nyilat és rögzített referenciapontokat. | Meglévő `RoofShapeGlyph`, `MeasurementGuidance`, geometry drawing; új wizard nélkül. | Közepes: mérési ábrának egyeznie kell a domain koordinátáival. |
| **P1** | Alátétfólia korlátozott alakjai | A chooser előre jelzi a négy korlátozott formát; az eredménynek a pontos layout támogatási korlátot is vissza kell adnia. | Az általános „korlátozott” badge nem mondja meg, hogy a felület, síkgeometria vagy tekercskiosztás limitált-e. | Eredményben a motor által visszaadott konkrét `unsupported/incomplete` ok maradjon az érintett csoport mellett, az általános badge ne ígérjen teljes támogatást. | Meglévő `RoofTakeoffPart.status`, `reasons`, `FeatureToggle` és eredménycsoport. | Alacsony/közepes: csak meglévő status- és reason-adatot jelenítsen meg, ne találjon ki magyarázatot. |
| **P1** | Geometria → anyagok → eredmény/mentés | Anyagadatokkal bővített munkánál hosszú, egyoszlopos folyam van; a save panel az eredmények után következik. A forrás DOM-sorrendben nincs visszafogott, eredményhez ugró hivatkozás. | Mobilon sok görgetés lehet, de tényleges mobilmérés nem történt. | Mobil QA után mérni a lépések távolságát; ha igazolódik, a már meglévő `BackNavigation`/anchor mintával egy kis „Eredményhez” ugrást adni, sticky új toolbar nélkül. | Meglévő nav/focus helper, section ID-k. | Közepes: fókusz/scroll és virtuális billentyűzet ütközhet, csak tényleges mobil QA után. |
| **P2** | Glass felületek | Globális token `--glass-blur: 22px`; a live világos UI-n a panelhatárok észrevehetők, szöveg olvasható volt, de a dark kontraszt és GPU hatás nem mérhető. A skill 10–20 px-et ajánl, nem kötelező küszöbként. | Nincs bizonyított hiba; nagy blur sok egymásba ágyazott felületen költséget jelenthet. | Megtartani a glass hierarchiát. Ha profilozás vagy dark kontraszt audit indokolja, célzott token-szintű blur/opacity próba; nincs alap redesignra. | Jelenlegi CSS glass tokenek és `GlassDisclosure`. | Alacsony, ha csak egy token és kontraszt/perf összehasonlítással történik. |
| **P2** | Teljes UI: dark/light és mobil | Forrásban vannak dark tokenek, mobil breakpointok és reduced-motion szabályok; az aktuális viewport/tema vizuálisan nem lett ellenőrizve. | A forrás jelenléte nem bizonyítja a kontrasztot, overflow-t, fókusz láthatóságot vagy keyboard elhelyezést. | Ezt csak teljes 1440×900, 375×812, 812×375 light/dark futtatással zárjuk le; utána célzottan javítani a konkrét regressziókat. | `ThemeProvider`, theme tokens, existing viewport/focus helper tests. | Alacsony implementációs, de a mostani auditban nyitva marad. |

## A fázis szakmai megállapítás — implementációs blokkoló

Az új outer-footprint szerződés **nem implementálható biztonságosan az aktuális persisted input modellel**. Az old geometry adapter ma a falsíkból induló building méreteket és hozzáadott eave-et használja; a persisted V1 snapshotokban nincs `measurementReference`/geometry-contract mező. A szervermentés a browser inputból újraszámol, a történeti output immutable, de egy régi input új szerkesztési revisionje ugyanazokat a mezőket küldi vissza. Rajzból javasolt mezőérték mellé forrás/provenance lehetőség tartozik, de a konstrukciós V1 snapshotban a mezők jelentése nincs együtt elmentve.

Ezért a globális engine-átírás, az `eaveOverhangMm` elhagyása a geometriai képletből, vagy az „üres = külső méret” következtetés **nem készült el**. A jelenlegi opcionális mező és falmérethez kötött pozitív eresz help változatlanul megőrzi a P1.2.2 viselkedést; üres/0/pozitív tesztek régi szerződést fednek le, nem bizonyítanak v2 külső méret szemantikát.

Az A fázishoz szükséges előfeltétel: bemeneti contract version/reference, régi V1 fallback `legacy-wall`, új kézi input `outer-footprint`, rajzi transfer explicit szemantikus forrása, szerveroldali replay/save adapter és a faanyag/roof edge support modellek világos incomplete szabálya. Ez kódolható rejtett, verziózott adatként új UI selector nélkül, de külön célzott input-contract/replay/regression munkát igényel. Addig a felület nem állíthatja, hogy minden tetőméretet külső méretként kezel.

## Nem ellenőrzött és nem állítható tények

- Nem láttam 1440×900, 375×812 vagy 812×375 viewportot, sötét témát, élő rajzfeltöltést/OCR-t, mentett V1-et újraszerkesztve, vagy teljes termékprofil-váltást.
- A 22 px blur megléte nem bizonyít lassúságot. Render/performance mérést nem végeztem.
- A gable numerikus referenciája a motor képletét igazolja, nem a felhasználó méretforrását, statikai helyességét vagy valós tető támaszpontjait.

## P1.2.4 végrehajtási státusz (2026-11-04)

**Részleges megvalósítás, vizuális QA nem igazolt.** A bizonyíthatóan jóváhagyott eresz-súgó most szerződés- és formafüggő: V2 nyeregnél a két ereszoldalt, félnyeregnél az alsó ereszoldalt nevezi meg, és közli, hogy a teljes méret miatt nem adódik hozzá ismét. V1-nél a történeti képlet szerinti kétoldali/alsó oldali hozzáadás látszik, a mérési referencia igazolatlanságával. L/T szárnynál a mezősúgó a tényleges koordinátákat követi: az L szárny x=0-ról indul, a T szárny x=(hossz-szélesség)/2 középre kerül; a vetületi metszet nem kerül kétszer a tetőfelületbe.

A rajzi méretátvitel eddigi regressziói V1/V2 szerződésmegőrzést igazolnak; a kötelező falméret/azonosítatlan méret referencia-próbát élő rajzi folyamatban nem végeztem. Helyi alkalmazás nem futott (`localhost:3000` nem elérhető), ezért nincs böngészős bizonyíték, nincs viewport/téma mátrix, nincs mobil scroll/keyboard mérés, és a nyolc forma/speciális kalkulátor vizuális QA-ja nyitott. Anyagkimutatási státuszokhoz és glass stílusokhoz ezen a körön nem találtam bizonyított hibát, így nem változtattam rajtuk. Az „Eredményhez” ugrást mobilos használhatósági mérés hiányában nem építettem be.

Dokumentációs leltár: a törölt `hap-figure.tsx` coverage minta törölve, a hét meglévő rajzi/support fájl a `CALC-CONSTRUCTION` indexbe sorolva; `node scripts/check-docs.mjs` PASS.

## P1.2.5 QA-kiegészítés (2026-11-04)

A lokális alkalmazás ténylegesen megnyílt az in-app böngészőben `http://localhost:3000/kalkulatorok` címen, miközben shell `curl` localhoston `curl: (7) ... Couldn't connect` hibát adott. A kézi L alakú tető útját megnyitottam és renderelten ellenőriztem: 1440×900-as desktopon és 375×812-es mobil viewporton, világos témában. A két L-szárnymező és az aktuális V1/V2-től független mérési magyarázat látható; a mobil DOM-mérés `scrollWidth=360`, `innerWidth=375` értéket adott, így vízszintes túlcsordulás nem látszott. A mobiloldal hosszú, de a teljes folyamat görgetési távolságát nem mértem.

Ez részleges, élő böngészős bizonyíték, nem teljes Visual Quality Gate. Nincs vizsgált screenshot a T alakról, a másik hat formáról, speciális kalkulátorokról, részleges anyageredményről, mentett V1/V2 visszanyitásról, dark témáról, 812×375 landscape nézetről vagy valódi virtuális billentyűzetről. A mobil V1/V2 mentés és rajzi referencia ellenőrzése továbbra is nyitott. Ebben a körben nem találtam bizonyított hibát, ami új UI-javítást indokolt volna; a felülethez és Liquid Glass tokenekhez nem nyúltam.

## P1.2.5.1 — teljes vizuális QA kísérlet (2026-11-04)

**Státusz: BLOCKED.** A lokális, `organization=demo` paraméteres `/kalkulatorok` oldal az in-app browserben ténylegesen betöltődött, és a forma-választó renderelődött. A böngészőablak azonban kb. 1045×935 volt. A Computer Use browser API nem tesz elérhetővé pontos viewport-emulációt, témakényszerítést vagy screenshot-fájlba exportálást; a környezetben nincs Playwright, Playwright Core, Puppeteer vagy projektbeli böngésző/E2E-konfiguráció. A Node REPL modul-ellenőrzése ezt megerősítette. Emiatt az előírt 1440×900, 375×812, 812×375 és mindkét téma egyetlen cellája sem volt ténylegesen vizsgálható. A látható kezdőképernyő nem egyezik egyik előírt állapottal sem.

| Felület | Desktop light | Desktop dark | Mobil light | Mobil dark | Fekvő light | Fekvő dark |
|---|---|---|---|---|---|---|
| Nyeregtető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Félnyeregtető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Kontytető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Sátortető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Félkontytető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| L alakú tető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| T alakú tető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| Manzárdtető | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| `roof.timber-cutlist` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| `roof.rafter-cut` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| `roof.truss-members` | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

**Lefedettség:** a 11 felülettípusból 0 lett ténylegesen végigvizsgálva az előírt alapállapotban; a 66 pontos vizuális cellából 0 ellenőrzött, 66 blokkolt. A böngészőben csak a kalkulátor főoldal és a nyeregtető forma-választás utáni adatbeviteli-mód választója jelent meg, de ezt nem számítom a kért 11 felület vagy bármely pontos mátrixcella teljes vizuális ellenőrzésének. A későbbi forma-, anyag- és kalkulátoreredmények DOM- vagy forrásellenőrzésből nem kaptak PASS-t.

**Talált hibák és javítások:** az előírt kalkulátorállapotokban nem sikerült konkrét UI-hibát reprodukálni, ezért felületi javítás nem készült. Ez nem bizonyítja, hogy nincs hiba. Az auditban már dokumentált szakmai korlátozások (több tetőformánál limitált alátét-layout; hiányzó munkaspecifikus anyagadatok) változatlanok. Új Liquid Glass hiba nem bizonyított.

**Screenshot-bizonyíték:** a tényleges, világos témájú kezdőállapot képe az aktív Codex beszélgetés CUA eszköz-kimenetében látható (kb. 1045×935; forma-választás után). A Computer Use képernyőkép byte-jait ez a környezet nem tudta helyi fájlba exportálni. Nincs visszakereshető screenshot-fájlútvonal; mátrixhoz tartozó screenshot egyik kombinációról sem készült. Ezt a képet nem számítom a kért screenshot-csomag helyettesítőjének.

**Mobil munkafolyamat:** nem futott le. A forma kiválasztását követően a kézi/rajzi út választója látható volt, de nem töltöttem méreteket, nem kapcsoltam anyagcsoportot, nem választottam terméket, nem írtam felül műszaki értéket, és nem navigáltam eredményhez vagy mentéshez. Kattintásszámot és scrolltávolságot ezért nem állítok. Belső túlcsordulás, levágás, fókusz, hibakezelés és virtuális billentyűzet nincs mobilnézetben ellenőrizve.

**Anyagállapotok és részleges eredmény:** az alkalmas automatikus előtöltés, üres/hiányos specifikáció, kézi választás, felülírás/visszaállítás, historikus adat, inkompatibilis termék és korlátozott anyagkimutatás élő állapota nem lett megnyitva. A korábbi P1.1–P1.2.1 jelentések leírják a már meglévő szerződéseket és korlátaikat; azok nem helyettesítik ezt a kört. A részleges eredmény érthetőségéről új vizuális következtetés nincs.

**Élő V1/V2 mentési round-trip:** nem történt. Nem nyitottam meg V1 mentést vagy V2 outer-footprint munkát, nem mentettem új revíziót, és nem módosítottam DEMO-adatot. A 12×6 m, 35° korábbi nyeregtető referencia szerepel az auditban, de ebben a körben nem futott újra. Ezért V1 legacy-szerződés, eredeti revízió változatlansága, V2 szerződésmegőrzése és round-trip nincs élőben igazolva.

**Automatizált kapuk:** célzott Vitest (`construction-suite-drawing-entry.test.tsx`, `construction-computation.test.ts`) **88/88 PASS**; teljes Vitest **226 fájl PASS, 8 skip; 1614 teszt PASS, 19 skip** (Vitest kiírt egy `Not implemented: navigation to another Document` üzenetet); `npm run typecheck` **PASS**; az érintett kalkulátorok ESLintje **PASS**; `npm run build` **PASS**; `git diff --check` **PASS**; `node scripts/check-docs.mjs` **PASS** (880 releváns fájl, 239 coverage-minta, 0 fedetlen). Új UI-módosítás nem történt, ezért csak a központi kalkulátor és anyagszerkesztő fájljain futott célzott ESLint.

**Nyitott blokkoló:** a teljes QA-hoz a pontos méret- és témaállapotot emuláló böngésző, hozzáférhető screenshot-export (vagy felhasználó által biztosított eszközút), valamint a hitelesített lokális DEMO mentési adatok és engedélyek szükségesek. A CUA felület nem adott böngészőkonzol-hozzáférést; konzol-egészség ezért nincs ellenőrizve. Az automatizált kapuk zöldek, de nem váltják ki a blokkolt élő vizuális és mentési próbákat.

## P1.2.5.3 — in-app browser QA (2026-11-04)

**Állapot: a 66 megjelenítési állapot ellenőrizve; a lokális Browser QA működik.** A Codex in-app Browser `playwright`-lokátorokat, 1440×900 / 375×812 / 812×375 viewportot és inline, renderelt képet biztosított. A böngésző ugyanazt a `localhost:3000` alkalmazást érte el, amely hitelesített `admin1@testadmin.com` felhasználóként a `DEMO TetőPro Kft.` szervezetet mutatta. Új automatizálót nem telepítettem.

Jelölések: **Kép+DOM** = a pontos viewportban/témában a Browserben renderelt képet közvetlenül megtekintettem, és a kiválasztott felületet, eredményt/állapotot, valamint dokumentumszélességet DOM-ból is ellenőriztem. A mátrix 66 állapota mind ilyen. A képek inline Browser-kimenetben voltak láthatók; fájlba exportálást a biztonsági korlát miatt nem próbáltam. Nincs screenshot-fájl vagy screenshot-útvonal.

| Felület | Desktop light | Desktop dark | Mobil light | Mobil dark | Fekvő light | Fekvő dark |
|---|---|---|---|---|---|---|
| Nyeregtető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| Félnyeregtető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| Kontytető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| Sátortető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| Félkontytető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| L alakú tető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| T alakú tető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| Manzárdtető | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| `roof.timber-cutlist` | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| `roof.rafter-cut` | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |
| `roof.truss-members` | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM | Kép+DOM |

**Funkcionális bizonyíték:** mind a nyolc forma kézi méretadatokkal érvényes geometriai eredményt adott. A 12×6 m, 35° nyeregtető eredménye 87,90 m²; a sátortetőé 43,95 m²; az L alakúé 102,55 m²; a 12×8 m-es T alakúé 136,73 m²; a manzárdé 133,35 m² (alsó futás/emelkedés 250/280 cm, felső emelkedés 100 cm). A többi forma mezői és eredményei is megjelentek.

A korábbi nyeregtető munkamenetben a 12×6 m / 35° geometria után Faanyag csoportot választottam, `DEMO 80×200 mm` terméket és 60/33 cm szarufa/léc kiosztást adtam meg; a vágáslista 42 szarufát és 25 lécsort mutatott. A 8 cm-es szarufaszélesség 7,5 cm-es kézi felülírása 2,461-ről 2,307 m³-re módosította a térfogatot, a kézi adat forrásjelzésével. A külön faanyag-kalkulátor ugyanezzel a tetővel 3662 mm-es, 42 darabos szarufalistát és 12 000 mm-es lécsort számított.

A `roof.rafter-cut` 300 cm félfesztáv / 200 cm gerincemelkedés / 150 cm HAP adatokkal teljes eredményre jutott; a talpszelemen vágásrajza külön hiányos maradt, mert a keresztmetszet-magasság opcionális, de a rajzhoz szükséges adat. A `roof.truss-members` 6000×2000 mm és 4 félfesztáv-osztás mellett 3605,551 mm felső övfelet, 33,69° talpszöget és 750 mm osztást mutatott.

**DOM és belső elrendezés:** mind a 66 állapotban `documentElement.scrollWidth` megegyezett a viewport szélességével; vízszintes oldalgörgetés nem volt. A nyolc tetőforma belső elemeit is vizsgáltam mindhárom méretben/témában. A sötét/világos hátterek dekoratív `premium-glass-background` eleme néhány pixelnyit túlnyúlhat a viewport dobozán, de a dokumentum ezt levágja és nem okoz görgetést. A szarufarajz SVG-jében több `<text>` saját karakterdobozánál szélesebb (`scrollWidth > clientWidth`); ez nem azonos az oldal- vagy komponenskártya túlcsordulásával. A speciális kalkulátorok belső szövegdobozait egy-egy 812×375 állapotban is átnéztem; a szarufa-ábrán csak az SVG-szövegek adtak ilyen mérést.

**Vizuális eredmény:** a kártyák/panelek hierarchiája és Liquid Glass felszínei a világos/sötét képeken következetesek maradtak. A mértékegység-gombcsoportok a számmezők mellett igazodtak, mobilon a mezők egymás alá rendeződtek; a geometriai és faanyag-eredmények olvashatók voltak. A hibaszínhez szöveg és hibaállapot is társult; a fókuszkeret a kitöltött mezőn látható volt. Kontrasztarányt műszeresen nem mértem, kizárólag renderelt képen vizsgáltam; igazolt kontraszthibát, levágott mezőt, felesleges disclosure-t vagy termékadat-/Liquid Glass hibát nem találtam.

**Javítás:** az érvénytelen manzárd geometriánál ugyanaz a hiba egyszer a teljességi státusz listájában, egyszer külön alertként jelent meg. A DOM-ban két azonos hibaszöveg és a képen ismétlés látszott. A központi kalkulátor UI-ja most nem rendereli másodszor a hibát, ha az már szerepel a teljességi okok között. Új regressziós eset került a `construction-suite-drawing-entry.test.tsx`-be. A célzott fájl **33/33 PASS**; a teljes 1614-es suite-ot nem futtattam.

**Élő V1/V2 próba:** a hitelesített DEMO-ban megnyitottam a `P1.1 QA – automatikus szarufa` mentés V1 revízióját (600 cm szélesség, 73,25 m²), 610 cm-re módosítottam, és új V2-ként mentettem. Teljes oldal-újratöltés után a V2 státusz, 610 cm és 74,47 m² visszatöltődött. A két elemű revíziótörténetben a V1-et újra megnyitva 600 cm / 73,25 m² maradt; utána visszaállítottam a V2 nézetet. A meglévő rekord V1 revíziója nem módosult; ez a próba a helyi DEMO-ban egy V2 revíziót hozott létre.

**Nyitva maradt:** a viewport-emuláció nem valódi mobilkészülék, ezért virtuális billentyűzetet nem teszteltem. Nem exportáltam képet fájlba, és nem mértem numerikus WCAG kontrasztarányt. A speciális kalkulátorok belső DOM-túlcsordulását reprezentatív 812×375 képernyőn mértem; a 18 speciális kalkulátor mátrixcella mind kép+DOM módon ellenőrzött, de a belső elem-mérést nem végeztem el cellánként. A böngészőkonzolt nem vizsgáltam.

## P1.2.6 — végső integráció és vizuális finomítás (2026-11-04)

### A — contract integritás

A `P1.1 QA – automatikus szarufa` V1 módosításáról szóló korábbi szöveg a revision 2 létrehozását írja le, de nem rögzíti a geometry contract verzióját. A DEMO azonosítója és a record nem volt biztonságosan elérhető e körben, ezért annak eredeti/új contractja nem jelenthető ki; production vagy másik munkatér adatait nem vizsgáltam és nem módosítottam. Az izolált fixture a hiányzó contractot `legacy-wall`-ként normalizálja, 500 mm ereszkiüléssel 84,00 m²-t ad, és az új server-save revision inputja is `legacy-wall`. A server output azonos a client output snapshotjával, az eredeti input változatlan. V2 fixture: 12×6 m / 35° = 72,00 m² vetület, 87,90 m² ferde felület; további 500 mm ereszkiülés nem növeli a V2 vetületet. A geometriai képlet változatlan.

### B — belépési útvonal

Aktuális útvonalak: dashboard `Kalkulátorok` csempe → `/kalkulatorok?organization=…`; fő navigáció `Kalkulátorok` link → ugyanaz az útvonal. Mindkettő ugyanazt a `ConstructionCalculatorSuite`-ot és inline `RoofShapeChooser`-t használja. A jelenlegi munkafában külön dashboard start-step ág nincs; a shape/mode megjelenítés a kalkulátoronkénti draft és folytatási állapot alapján történik. A korábbi eltérés a most rendelkezésre álló kódon nem reprodukálható és a P1.2.5.3 riportban nem volt gyökérokra bontva, ezért ennél pontosabb történeti okot nem állítok. Saved revision és calculator query/deep link továbbra is saját kezdeti állapotot kap; speciális tetőkalkulátorokat a normál katalógusba nem helyeztem vissza.

### C — SVG és rendered QA

A nyolc korábbi, egyszálas útvonal helyére síkfelületekből, síkélekből és kiemelt gerincből álló, saját inline SVG-k kerültek. A TetőPro meglévő vékony grafikai súlyát, semleges felületeit, sárga akcentusát és `--surface-*` / `--foreground` / `--muted` / `--brand` tokenjeit használtam; a Liquid Glass kártyahátteret, lekerekítést és state-tokeneket megtartottam. Név és geometry ID változatlan; `data-roof-shape` attribútumuk tesztelhető. A renderelt in-app böngészőben desktop light/dark nézetben mind a nyolc illusztráció látható. A dashboard belépést, nyeregtető kiválasztását, kézi űrlapot és rajzi input nyitását ellenőriztem. A korábbi screenshot/export tiltást betartottam: fájlba mentés nem történt.

**Korlát:** ebben a körben elérhető CUA böngésző nem kínált viewport-emulációt vagy console API-t. Ezért az előírt 1440×900, 375×812, 812×375 × light/dark mátrix, billentyűzet fókusz-screenshot és console health nem kapott friss, közvetlen bizonyítékot. Automatizált SVG azonosító/forma választás teszt és a meglévő fókusz-/ARIA szerződések regressziótesztjei a teljes suite eredményével együtt kerülnek rögzítésre.

**Automatizált eredmény:** célzott Vitest 4 fájl / 114 teszt PASS; teljes Vitest 226 fájl PASS / 8 skip, 1617 teszt PASS / 19 skip. TypeScript typecheck, érintett ESLint, production build, `git diff --check` és docs checker PASS. A Vitest két dashboard teszt renderkor egy React `priority` nem-boolean attribútum warningot, továbbá egy JSDOM navigációs „Not implemented” üzenetet írt; tesztbukás nem történt. A `calculation_revisions_immutable` trigger és a meglévő pgTAP negatív teszt immutable input/output revíziót véd, de pgTAP-ot nem futtattam.

**Státusz:** V1/V2 — **PASS WITH LIMITATIONS** (izolált fixture igazolja a contractot; konkrét korábbi DEMO revision contract és output bytes nem ellenőrizhetők); belépési egységesítés — **PASS WITH LIMITATIONS** (dashboard/main navigation route azonos, desktop élő út ellenőrzött, nincs friss mobile/deep-link mátrix); SVG/UI — **PASS WITH LIMITATIONS** (mind a nyolc új SVG desktop light/dark megtekintve, mobil- és fókusz-screenshot nyitott).
