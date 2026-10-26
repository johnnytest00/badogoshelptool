# TetőPro — jelenlegi rendszer- és munkafolyamat-felmérés

**Audit dátuma:** 2026-10-26
**Bizonyíték:** a jelenlegi checkout forráskódja, alkalmazott Supabase-migrációk és releváns dokumentáció.
**Korlát:** az audit kezdetekor sok nem commitolt változás volt a munkafában, köztük M9.15/M9.16 kód- és dokumentációmódosítások. Ezeket érintetlenül hagytam. Az „aktuális” az auditkor látható checkoutot jelenti, nem igazolt kiadást. Nem futtattam tesztet, nem olvastam vagy írtam adatbázist, és nem ellenőriztem hitelesített böngészős munkamenetet. Ez kód- és sémaszintű audit, nem élő termékelfogadás.

## 1. Vezetői összefoglaló

A TetőPro mai használatának fő belépési pontja a **Kalkulátorok**: a szakember a kiválasztott számítás űrlapján adja meg a méreteket, és előnézetet kap. A munkanapló külön, önállóan is indítható munkatér; nem előfeltétele a számításnak. Néhány mentett számítás konkrét revízióként munkanaplóhoz, ajánlathoz vagy anyag-előkészítéshez kapcsolható.

Az alkalmazás jelenleg több, eltérő érettségű rétegből áll:

- A közös kalkulátorsuite 31 építési kalkulátort kínál (tető, lépcső, beton/alapozás és geometriai segédkalkulátor). A suite általános mentése négy tetőkalkulátorra van bekötve.
- Külön tető-, cserepeslemez-, trapézlemez- és lemezprofil-munkafelületek mentett, verziózott számításokat kezelnek. Egyes projektbeli tetőmodell- és kalkulációrevíziók között pontos forráshivatkozás van.
- Ügyfelek, projektek, ajánlatok, anyagkezelés, anyagkimutatások, anyaglisták és munkanaplók is létező modulok. Kapcsolataik nem egységesek: néhány átadás egzakt forrásrevíziót rögzít, míg több kalkulátor egymástól független bemenetet kér.
- A különálló **Felmérés** workflow kivezetett. A régi /felmeresek route-ok a kalkulátorokra irányítanak, új felmérés-rekord létrehozását az alkalmazás és az adatbázis is tiltja. A régi táblák, fotóútvonalak és forrásadapterek a korábban rögzített adatok kompatibilitásához még megtalálhatók a kódban; ezek nem jelentenek jelenleg elérhető új Felmérés modult.

**Fő termékkorlát:** a helyszíni munka első adatbevitelétől az anyagbeszerzésig és kivitelezésig nincs egységes, projektszintű adatfolyam. A méretbevitel a kalkulátorokban történik, de a kalkulátorok között sok adatot kézzel újra kell adni; az önálló kalkuláció nem kapcsolódik automatikusan ügyfélhez vagy projekthez; nem minden előnézet menthető.

## 2. Funkcióleltár

| Funkció | Állapot | Tényleges belépési pont és képesség |
|---|---|---|
| Műhely / főoldal | IMPLEMENTED | /: hitelesített felhasználó és szervezet után „Funkciók” és „Aktuális munkák”; több szervezet esetén választó. |
| Kalkulátorok | IMPLEMENTED | /kalkulatorok: kategóriák/keresés, élő előnézet és ábra; külön tető- és lemezmunkafelületek is vannak. |
| Önálló kalkulációmentés | PARTIAL | A négy suite tetőkalkulátor, külön tetőgeometria, cserepeslemez, trapézlemez-kiosztás és lemezprofil menthető. A további 27 suite-kalkulátorhoz nem találtam mentési útvonalat. |
| Mentett számítások és revíziók | IMPLEMENTED, modulonként eltérő | /kalkulatorok/mentett és saját moduloldalak; revíziók újranyithatók és szerkesztés új revízióba menthető. |
| Munkanapló | IMPLEMENTED | /kivitelezes: önálló napló, feladatok, napi bejegyzések, fotók; projekt és elfogadott ajánlati revízió opcionális forrás. |
| Ügyfelek és projektek | IMPLEMENTED | /ugyfelek, /projektek: ügyféltörzs, projekt, helyszín/állapot, tetőmodellek és projektmodulok. Nem elsődleges mobilnavigációs célok. |
| Tetőmodellek | IMPLEMENTED | Projektben mentett geometriai modell és revízió; egyes projektbeli fedési modulok ezt pontos forrásként használják. |
| Anyagkezelő / termékkatalógus | IMPLEMENTED | /anyagkezelo és /anyagok útvonalcsalád: szervezeti kategória, termék, változat és forrásozott árlehetőség. |
| Anyagkimutatások | IMPLEMENTED | Projektbeli és önálló kimutatás, draft/jóváhagyás, anyag-pillanatkép; jóváhagyás után anyaglistává alakítható. |
| Anyaglisták / beszerzés | IMPLEMENTED | /anyaglistak és projektbeszerzés: kézi vagy kimutatásból vett sorok, termék/árforrás, revízió, CSV. |
| Árajánlatok | IMPLEMENTED | Projekt- és önálló piszkozat, anyaglistából vagy mentett számításból átvétel, ügyfél, árkategória, revízió, státusztörténet és PDF. A forrás-pillanatkép soronkénti szerkesztés után is megmarad. |
| Munkadíj-szabályok | IMPLEMENTED | /beallitasok/munkadij: szervezeti szabályok, admin/tulajdonosi módosítással; ajánlatban opcionális forrás. |
| Szervezeti tagság és fiók | IMPLEMENTED | Bejelentkezés, szervezeti adatelkülönítés, owner/admin/member szerepkör, fiók- és megjelenítési beállítás. Teljes biztonsági audit nem készült. |
| Külön Felmérés modul | RETIRED | A lista/új/részlet route-ok a kalkulátorokra irányítanak; új rekord tiltott. A meglévő rekordok adatmodellje és kompatibilitási kódja maradt. |
| Ereszcsatorna- és szegélybecslő | PARTIAL / NOT VERIFIED | Belső kalkulációtípusok és régi integrációs tesztforrások léteznek; jelenlegi önálló UI-belépési pontot nem igazoltam. |
| /demo/meretezes | PLACEHOLDER/DEMO | Képernyő-elrendezést bemutató, DEMO jelölt űrlap; nincs számítási eredmény. |

Az IMPLEMENTED itt kódban elérhető útvonalat és műveleti láncot jelent, nem élő telepítés-ellenőrzést. NOT VERIFIED ott szerepel, ahol a jelenlegi forrásból nem bizonyítható a mai felhasználói belépő és teljes út.

## 3. Navigációs és modulstruktúra

Az elsődleges dashboard-funkciók: Kalkulátorok, Munkanaplók, Árajánlatok, Anyaglisták és Anyagkezelő. A közös navigáció asztalon oldalsáv, mobilon alsó sáv. Mobilon a Műhely és ez az öt funkció érhető el; az ügyfél- és projektindex külön útvonal, illetve kontextuális kapcsolatok révén nyílik.

| Útvonal | Modul |
|---|---|
| /, /bejelentkezes | Műhely, fiók/szervezetválasztás, bejelentkezés |
| /kalkulatorok, /kalkulatorok/mentett | Közös suite és mentett kalkulációk |
| /kalkulatorok/nyeregteto | Önálló tetőgeometria, több tetőforma és mentett geometria |
| /kalkulatorok/cserepeslemez | Önálló cserepeslemez-fedés |
| /kalkulatorok/lemezprofilok | Lemezprofil-szerkesztés és blankterület |
| /kalkulatorok/epitesi | Régi belépő, átirányít a közös suite-ra |
| /projektek, /projektek/[projectId] | Projektek, tetőmodellek, anyagkimutatás/beszerzés, ajánlat, lemezprofil és kivitelezés |
| /ugyfelek, /ugyfelek/[clientId] | Ügyféladatok: név, e-mail, telefon, számlázási cím és megjegyzés |
| /kivitelezes, /kivitelezes/[planId] | Munkanapló, feladat, napi bejegyzés és dokumentáció |
| /anyagkezelo, /anyagok, /anyagok/uj, /anyagok/[productId] | Anyagkatalógus; /anyagok navigációs alias |
| /anyaglistak, /anyaglistak/uj, /anyaglistak/[listId] | Anyaglisták |
| /anyagkimutatasok, /anyagkimutatasok/[takeoffId] | Kimutatás, jóváhagyás, anyaglistává alakítás |
| /ajanlatok, /ajanlatok/uj, /ajanlatok/[quotationId] | Ajánlatok; projektajánlatnak külön projektútvonala van |
| /beallitasok/munkadij | Munkadíj-szabályok |
| /felmeresek, /felmeresek/uj, /felmeresek/[surveyId], /felmeresek/[surveyId]/kalkulator/[calculator] | Megmaradt route-ok, de a kivezetés miatt a kalkulátorokra irányítanak |
| /demo/meretezes | DEMO adatbeviteli minta |

Bizonyíték: [dashboard.data.ts](../src/features/dashboard/dashboard.data.ts), [app-navigation-links.tsx](../src/components/navigation/app-navigation-links.tsx), [routes.ts](../src/components/navigation/routes.ts) és az egyes src/app route-oldalak.

## 4. Jelenlegi felhasználói munkafolyamatok

### A. Gyors önálló számítás

1. Bejelentkezés után a Műhelyből a Kalkulátorok nyílik meg.
2. A /kalkulatorok oldalon kategóriát és számítást választ, majd kézzel kitölti a mezőket.
3. A suite előnézetet, hiányzó/hibás adatot és támogatott modulokban rajzot jelenít meg.
4. A 31-ből 27 suite-kalkulátor eredménye nem menthető a közös mentési útvonalon. A négy menthető: roof.rafter-cut, roof.material-takeoff, roof.timber-cutlist és roof.truss-members.
5. A külön tetőgeometria, cserepeslemez és lemezprofil munkafelület saját mentési folyamatot kínál.

**Nem kell munkanaplót létrehozni.** Egy menthető konstrukciós számítás utólag naplóhoz köthető, de a kapcsolat mentett revízióra mutat. A mentési panel szerint az önálló számítás nem kapcsolódik automatikusan ügyfélhez, projekthez, anyaglistához vagy ajánlathoz. Forrás: [construction-suite.tsx](../src/features/calculators/construction-suite.tsx), [construction-save-panel.tsx](../src/features/calculators/construction-save-panel.tsx).

### B. Tetőhöz kapcsolódó több számítás

**Egy munkameneten belüli út:** a roof.material-takeoff egy kalkulátorban kezeli a tetőgeometriát, a kért szarufa/léc, alátét- és fedésmennyiséget. A roof.timber-cutlist ugyanezt a tetőformacsaládot használja faanyag- és vágáslistához. A Karmi/csatlakozás a tetős suite kalkulátorokban opcionális bemenet.

**Kalkulátorok közötti átadás:** a roof.rafter-cut mentett eredménye nem tölti fel automatikusan a material-takeoff vagy timber-cutlist mezőit. A tetőforma/méretek, kiosztás és specifikáció nem általános megosztott űrlap. Az egyes suite kalkulátorok külön bemeneti/session állapotot tartanak, ezért az eltérő számításba váltáskor szükséges adatot újra meg kell adni.

**Projektbeli fedési út:** a mentett tetőmodell-revízió a támogatott cserepeslemez- vagy trapézlemez-fedési modulban pontos forrásként használható. Ebből anyagkimutatási piszkozat hozható létre. Ez a kapcsolat konkrét projektág, nem minden tetőkalkulátor általános átadási képessége.

### C. Munkanapló-alapú munkavégzés

1. A /kivitelezes oldalon önálló, projekt nélküli munkanapló indítható címmel és opcionális leírással. Elfogadott ajánlati forrás opcionális.
2. Feladat rögzíthető, státusszal, prioritással és határidővel.
3. Dátumozott napi bejegyzés készíthető; opcionális kategória, feladat, akadály és következő lépés adható meg.
4. Fotó feladathoz/bejegyzéshez kapcsolható, kategorizálható és szűrhető; előtte-utána párban megtekinthető. Projektkörnyezetben kivitelezési dokumentum is előkészíthető.
5. Mentett kalkulációt nem a naplón belüli, naplóadatból kitöltött kalkulátor indítja. A menthető kalkuláció naplókapcsolata a kalkuláció mentési paneljéből hozható létre, pontos revízióval.

### D. Ügyfélhez kapcsolódó munka

1. Ügyfél a /ugyfelek útvonalon létrehozható vagy kiválasztható.
2. A projekt ügyfélhez rendelhető; neve, helye, típusa, állapota és leírása van.
3. A projekten belül tetőmodell, anyagkimutatás/beszerzés, ajánlat és munkanapló kezelhető.
4. Az ajánlatszerkesztő ügyfelet választ. Az önálló kalkuláció nem örökli automatikusan ezt az ügyfél- vagy projektkontextust.

Az ügyfél/projekt munkafolyamat létezik, de az önálló kalkulációból a kapcsolat külön művelet és nem automatikus hozzárendelés.

### E. Korábbi munka folytatása

1. A felhasználó az adott modul mentett listájából választ: kalkuláció, tetőgeometria, cserepeslemez, lemezprofil, anyaglista vagy ajánlat.
2. A kiválasztott bemenet- és eredmény-pillanatkép betöltődik; az érintett modulokban korábbi revízió választható.
3. Régebbi revízió szerkesztése új revízióként menthető. Várt revíziószám ellenőrzi az ütközést; ütközéskor a felület frissítésre irányít.
4. Konstrukciós kalkulációban a jelenlegi kód újraszámolt kimenetének eltérése megjeleníthető, a régi snapshotot nem írja át csendben.

A nem menthető suite kalkulátoroknál nincs tartós folytatási út. A régi Felmérés rekordok új workflow-ja nem érhető el.

## 5. Kalkulátorleltár

### 5.1. Közös suite: 31 regisztrált elem

A [construction/catalog.ts](../src/domain/calculations/construction/catalog.ts) 31 bejegyzést tartalmaz; a betöltési teszt mindegyikhez definíciót vár. A státusz „verified” a termék regiszterének jelölése, nem ennek az auditnak az élő számítás-ellenőrzése.

| Név (azonosító) | Bemenetek → eredmény | Mentés, vizualizáció, korlát |
|---|---|---|
| Szarufa kiszabása (roof.rafter-cut) | Fél fesztáv, emelkedés, vízszintes ereszkiülés, HAP; opcionális keresztmetszet, talp-/derékszelemen és gerinckapcsolat → hossz, szög és Karmi/csomóponti eredmény. | Menthető/revíziózható; szarufa- és csomóponti rajz. Statikát, rögzítést és a bevágás megengedhetőségét nem igazolja. |
| Tetőanyag-kimutatás (roof.material-takeoff) | Tetőforma/méretek/hajlás/eresz; választott faanyag, alátét és fedés specifikáció/kiosztás; opcionális csatlakozás → geometria és kért mennyiségek. | Menthető/revíziózható; tető- és csatlakozásrajz. Fedési darabszámhoz megalapozott termékadat kell; nincs szabásmaradék újrahasznosítás, áttörés- vagy statikai vizsgálat. |
| Tetőszerkezet faanyag és vágáslista (roof.timber-cutlist) | Tetőforma/méretek; szarufa/léc keresztmetszet és maximális osztás; opcionális csatlakozás → darab, hossz, összhossz/térfogat. | Menthető/revíziózható; tető/faanyagrajz. Névleges geometriai hossz, nincs ráhagyás, száloptimalizálás, toldás vagy statika. |
| Rácsos tartó elemei (roof.truss-members) | Fesztáv, magasság, fél fesztáv osztásainak száma → felsőöv hossza, talpszög és osztás. | Menthető; sematikus rajz. Csak háromszög burkológeometria, rácsozat/kötés/teherbírás nélkül. |
| Egyenes fa lépcső – zárt pofafa (stair.wood.closed_straight) | Összemelkedés, vízszintes hely, fellépésszám; opcionális kar-szélesség → fellépő, belépő, hajlásvonal, hajlás és kényelmi képlet. | Nem menthető; oldal-/alaprajzi rajz. Pofafa-kiszabás/statika nincs. |
| Egyenes fa lépcső – nyitott tartó (stair.wood.open_straight) | Egyenes lépcső alapbemenetei → azonos geometria. | Nem menthető; geometriai rajz. Tartó gyártási profilja nincs. |
| 90°-os fa lépcső pihenővel (stair.wood.90_landing) | Emelkedés, fok/kiosztás, szélesség és pihenő → két ortogonális kar alaprajza. | Nem menthető; alaprajzi rajz. Statika/fejmagasság nincs. |
| 90°-os fa lépcső húzott fokokkal (stair.wood.90_winder) | Emelkedés, kar/fok adatok, belső sugár, fokszám → járóvonal és fordulógeometria. | Nem menthető; rajz, körív helyett egyenes húrok. Nem gyártási/normatív ellenőrzés. |
| 180°-os fa lépcső pihenővel (stair.wood.180_landing) | Két visszaforduló kar, fokosztás, pihenőmélység és karhézag → kiosztás. | Nem menthető; alaprajzi geometria, statika nélkül. |
| 180°-os fa lépcső húzott fokokkal (stair.wood.180_winder) | Emelkedés, kar/fok adatok, belső sugár és fokszám → járóvonal/kiosztás. | Nem menthető; húrfelbontású tervgeometria. |
| Háromkarú fa lépcső pihenőkkel (stair.wood.three_landing) | Három kar, két 90° pihenő, emelkedés és fokosztás → alaprajzi kiosztás. | Nem menthető; statika/fejmagasság nélkül. |
| Háromkarú fa lépcső húzott fordulókkal (stair.wood.three_winder) | Három kar, két forduló, belső sugár és osztás → tervgeometria. | Nem menthető; nem gyártási rajz. |
| Csigalépcső (stair.wood.spiral) | Emelkedés, belső/külső átmérő, fordulási szög, fellépésszám → fokok/járóvonal/sugár/ívhossz/terület. | Nem menthető; körgyűrű-szektor vázlat. Oszlop, fejmagasság és statika nincs. |
| Egyenes fémlépcső (stair.metal.straight), fűrészfogas változat (stair.metal.zigzag) | Egyenes lépcsőbemenetek → alapgeometria. | Nem menthető; a fűrészfogas tartót a rajz nem modellezi. |
| 90°-os fémlépcső pihenővel (stair.metal.90_landing), fűrészfogas (stair.metal.90_zigzag) | 90° kar-/pihenőbemenet → geometria. | Nem menthető; fém tartó/kötés/statika nincs. |
| 180°-os fémlépcső pihenővel (stair.metal.180_landing), fűrészfogas (stair.metal.180_zigzag) | Visszatérő karok, pihenő, hézag és osztás → geometria. | Nem menthető; tartó és kapcsolat nincs. |
| Ferde lépcsőelem vágási geometriája (stair.beveled_riser) | Belépő, fellépő, opcionális orrkiülés → átló és vágási szög. | Nem menthető; profilvázlat. Rögzítés/ráhagyás nincs. |
| Egyenes betonlépcső – tömör ék (stair.concrete_straight) | Lépcsőfok-profil, karhossz/szélesség → geometriai térfogat. | Nem menthető; keresztmetszeti rajz. Pihenő, vasalás, zsaluzat/statika nélkül. |
| Sávalap (concrete.strip) | Kézzel összesített tengelyhossz, szélesség, mélység → beton/zsaluzat mennyiség. | Nem menthető; a felhasználónak kell a tengelyhosszt előre összesítenie. |
| Hengeres cölöpök (concrete.pile) | Darabszám, átmérő, egyenes hossz → betonmennyiség. | Nem menthető; talpbővítés/teherbírás nincs. |
| Alaplemez (concrete.slab) | Téglalap hossz/szélesség, vastagság → beton és élzsaluzat. | Nem menthető; vasalás/alapozási alkalmasság nincs. |
| Betongyűrű (concrete.ring) | Külső/belső átmérő, magasság → beton- és üregtérfogat. | Nem menthető; gyártás/armatúra nélkül. |
| Térburkolat (concrete.paving) | Téglalap terület és lapméret → darabszám. | Nem menthető; vágás, fuga, minta, veszteség nélkül. |
| Épület körüli beton sáv (concrete.blind_area) | Téglalap alaprajz, sávszélesség, opcionális rétegvastagság → terület/perem/térfogat. | Nem menthető; tetszőleges alaprajz és lejtés nélkül. |
| Betonkeverék (concrete.mix) | Betonmennyiség, felhasználói cementigény és tömegarány, opcionális zsáktömeg → összetevőtömeg/zsákszám. | Nem menthető; nem ajánl receptet vagy betonminőséget. |
| Betonacél rúd (concrete.rebar), betonacél háló (concrete.mesh) | Rúd: átmérő/hossz/darabszám. Háló: méret/fedés/max osztás/átmérő; sűrűség opcionális → hossz, darab, térfogat, tömeg. | Nem menthető; nem vasalástervező, nincs toldás/hajlítás/statika. |
| Derékszögű átló (aux.diagonal) | Két befogó → átló és szög. | Nem menthető; geometriai segédprogram. |

Az űrlapok kötelező mezőit a kalkulátordefiníciók jelölik; az opcionális/haladó mezők ott külön meg vannak adva. A konstrukciós mentési útvonal ugyanazt a mezőszerződést ellenőrzi kliensen és szerveren, majd mentés előtt szerveroldalon újraszámol. Csak a négy tető suite kalkulátor szerepel a SAVEABLE_CONSTRUCTION_CALCULATORS listában.

### 5.2. További, a 31-es katalóguson kívüli tető/bádogos modulok

| Modul / belső azonosító | Bemenet és eredmény | Mentés/elérhetőség/korlát |
|---|---|---|
| Tetőgeometria (roof.gable és roof.geometry.*) | Épülethossz/szélesség, emelkedés vagy hajlás, eresz/orom kiülés → felületek, hosszok, szögek és rajz. | Önálló számításként is menthető; projektben tetőmodell-revízió. A bemeneteket a külön űrlapok nem szinkronizálják általánosan. |
| Trapézlemez-fedés/kiosztás (roof.gable.trapezoidal-covering, covering.metal-sheets.layout) | Geometria, profil/kiosztás, átfedés és termékadat → feltételes mennyiség/kiosztási rajz. | Revíziózható; projektbeli forrásból vagy önálló kézi geometriából. Takeoff draft készíthető; termékadat kell. |
| Cserepeslemez-fedés (roof.gable.metal-tile-covering) | Nyeregtető geometria (kézi vagy projektforrás), termék- és modulparaméterek → mennyiség és rajz. | Revíziózható, projektben takeoff draftba adható. Régi forrást jelöl, nem frissít csendben; gyártói megfelelést nem tanúsít. |
| Lemezprofil-szerkesztő (sheet-metal.profile) | Szakaszhossz/hajlítások és anyagadat → profilrajz és nettó blankterület. | Profil/revízió menthető, önállóan és projektben; anyagkimutatás indítható. Nem gyártási veszteség/alkalmassági minősítés. |
| Ereszcsatorna-becslő (gutters.material-estimate) | Belső kalkulációtípus és régi integrációs nyomok. | A jelenlegi app route és UI-belépési pont nem bizonyított: PARTIAL/NOT VERIFIED. |
| Bádogos szegély-becslő (sheet_metal.flashings.material-estimate) | Belső kalkulációtípus és korábbi tesztforrások. | A jelenlegi app route és UI-belépési pont nem bizonyított: PARTIAL/NOT VERIFIED. |

## 6. Adatkapcsolati térkép

| Forrás → cél | Tényleges működés |
|---|---|
| Suite kalkulátor → másik suite kalkulátor | Nincs általános mező- vagy eredményátadás. Közös domainkód nem jelent felhasználói adatátadást. |
| Tetőgeometria → tetőanyag/faanyag | A material-takeoff/timber-cutlist saját munkamenetén belül közösen számolja a geometriát és kiválasztott anyagkimeneteket; nem más kalkulátor mentett adatát importálja. |
| Projekt tetőmodell → fedési kalkuláció | A támogatott cserepes-/trapézlemez projektág pontos tetőmodell- és számítási revíziót használhat. Régi forrást jelez. |
| Mentett számítás → munkanapló | Mentési panelből kiválasztott teljes kalkulációs revízió kapcsolható; a napló az egzakt revízió kimenetét olvassa. |
| Fedési számítás → anyagkimutatás | Projektbeli fedési modulból forrásrevíziós draft takeoff készül. |
| Anyagkimutatás → anyaglista | Jóváhagyott kimutatás sorai és anyag-pillanatképe átkerülnek; frissítés új listarevízió. |
| Anyaglista → ajánlat | Kijelölt sorok/árak átvehetők. A forráspillanatkép megmarad, a sor kézzel módosítható, az eltérés jelölhető. |
| Ajánlat → munkanapló | Új naplóhoz opcionálisan kiválasztható elfogadott ajánlat pontos forrásrevíziója. |
| Ügyfél → projekt → ajánlat/munkanapló | Ügyfél projekt/ajánlathoz kapcsolható; projektadat a projektes naplóban látható. Az önálló kalkuláció nem örökli a kapcsolatot. |

### Kanonikus adatok és stale kezelés

- Közös tetőgeometriai és számítási domainkód van, de nincs minden kalkulátor mögött egy közös, szerkeszthető munkaszintű tetőadatforrás.
- A sémában létezik calculation_dependencies; konkrét projektbeli tetőmodell/fedés, lemezkiosztás és takeoff ág használja. Ez nem bizonyít automatikus stale állapotot minden suite-kalkulátornál.
- A forrás későbbi változása nem írja át a korábbi snapshotot. A frissítés külön művelet/új revízió. Konstrukciós számításnál az új kód szerinti kimenet eltérése jelezhető.
- A kanonikus bemenet és termékadat az adott revízió pillanatképe. A rajz és az élő eredmény előnézet; nem tanúsít gyárthatóságot vagy statikai megfelelést.
- A felmérésrégi adapterek korábbi rekordokat kezelhetnek, de az új adatbevitelhez nem elérhetőek.

## 7. Mentés és adatarchitektúra

- **Webréteg:** Next.js App Router az src/app útvonalakon; UI az src/features alatt; domain a src/domain alatt; Supabase infrastruktúraadapterként az src/infrastructure alatt.
- **Szervezeti elválasztás:** organizations, organization_members, clients és projects az alapmigrációban. A fő üzleti táblák szervezetazonosítót használnak; kódoldali membership-ellenőrzés, RLS és szervezeten belüli FK-k támogatják az elválasztást. Ez nem teljes biztonsági audit.
- **Kalkulációk:** calculations és calculation_revisions tárolja a kalkulátortípust, input/output snapshotot, sémaverziót, implementációverziót, eredetet és validációs metaadatokat. Revíziószám és várt aktuális revízió ütközés ellen védhet. A construction save action mentés előtt szerveroldalon validál és újraszámol.
- **Tetőmodellek:** roof_models és roof_model_revisions projekt/szervezet szerint elkülönített, számozott inputrevíziók. A downstream támogatott projektmodulok ezeket forrásként használják.
- **Termékek és dokumentumok:** termékváltozat, árforrás, takeoff, anyaglista és ajánlat külön adat- és snapshotmodellel rendelkezik; a korábbi dokumentumok nem változnak csendben katalógusfrissítéskor.
- **Jogosultság:** szervezeti szerepkörök; például takeoff jóváhagyáshoz owner/admin szükséges. Önálló suite-kalkulációt létrehozója szerkeszti; naplótársak a kapcsolt revíziót olvashatják.
- **Konkurencia és idempotencia:** több mentési művelet expected-version/revision és idempotency kulccsal kezeli az ütközést/ismételt kérést. Az egyes műveleti ágak teljes SQL-viselkedését nem vizsgáltam.
- **Dependency/stale:** a séma és egyes projekt workflow-k pontos forrásrevíziót és elavultságot kezelnek; nincs minden modulra kiterjedő automatikus frissítő.

Fő sémabizonyítékok: [foundation migration](../supabase/migrations/20261012000000_foundation.sql), [versioned calculation architecture](../supabase/migrations/20261012010000_versioned_calculation_architecture.sql), [execution planning](../supabase/migrations/20261013050000_execution_planning.sql), [execution journal](../supabase/migrations/20261013060000_execution_journal.sql), [standalone calculation persistence](../supabase/migrations/20261014010000_standalone_calculation_persistence.sql), [material catalog](../supabase/migrations/20261012040000_material_catalog.sql), [quotation lifecycle](../supabase/migrations/20261013020000_quotations.sql).

## 8. UI/UX megfigyelések

**Kódból igazolható erősségek**

- A Kalkulátorok önálló fő belépési pont, kategóriákkal és kereséssel.
- A mobil főnavigáció céljainak száma korlátozott; Műhely és öt elsődleges funkció közvetlenül elérhető.
- A tetőkalkulátorok haladó mezőket és Karmi/csatlakozási mezőket fokozatosan tárnak fel; a csatlakozásokhoz mérési segédlet és rajz tartozik. A jelenlegi nem commitolt M9.15/M9.16 checkout része.
- A mentési állapot, revízió, ütközés, hiányos adat és stale forrás az érintett modulokban megjeleníthető. Több szerkesztő piszkozat-helyreállítást is használ.
- Világos/sötét mód, méretezési, Liquid Glass és háttéranimációs beállítások vannak.

**Kódból látható súrlódások**

- Sok kalkulátor nem menthető, ezért a későbbi folytatás ismételt adatbevitelt igényel.
- A tetőgeometria több kalkulátor űrlapján megismétlődik; az önálló szarufa-kiszabás nem tölti fel a material-takeoff/timber-list mezőit.
- Ügyfél és projekt nem azonos súllyal jelenik meg a fő/mobil navigációban, mint a kalkuláció és kivitelezés; több kontextuális útvonalat igényel.
- Az önálló kalkuláció ügyfélhez, projekthez, anyaglistához vagy ajánlathoz kötése külön munkafolyamat.
- Kivezetett Felmérés útvonalak és történeti szövegek maradtak, így a kódban lévő történeti támogatás és az aktuális elérhetőség könnyen összetéveszthető.

**Böngészős megfigyelés:** ebben az auditban nem történt. A fejlesztői szerver állapotát folyamatlista-lekérdezéssel nem tudtam ellenőrizni, ezért nem indítottam vagy nyitottam szervert. Nem kerültem meg hitelesítést, és nem hoztam létre adatot. A mobilos értékelés kódalapú; aktuális viewport vagy fizikai telefon nincs ellenőrizve.

## 9. Dokumentáció és implementáció eltérései

1. **Felmérés kivezetése:** az aktuális dashboard adatforrás szerint a külön felmérési workflow retired; /felmeresek route-ok redirectelnek, a mentési action elutasítja az új rekordot, és a 20261025140000_retire_field_survey_creation.sql adatbázisoldali insert-védelmet ad. A régi Felmérés dokumentáció nem bizonyít elérhető modult.
2. **Munkafa vs kiadás:** az auditkor M9.15/M9.16 módosítások nem commitoltak voltak. A jelentés a checkoutot írja le, nem bizonyítja, hogy azonos a kiadott verzióval. A docs/PROGRESS.md leír korábbi teszt- és böngészőbizonyítékot; itt nem futtattam újra.
3. **31-es kalkulátorleltár:** a construction/catalog.ts a közös suite regisztere. Külön tető/fedés/profil és történeti gutter/flashing modulok is vannak, így a 31 nem a teljes kalkulátortermék száma.
4. **Célterv vs implementáció:** a docs index szerint a Blueprint célterv, a történeti mérföldkő csak az akkori állapotot bizonyítja. Az aktuális kód és migráció döntött, ahol eltérést találtam.

## 10. A rendszer jelenlegi hiányosságai

### Bizonyított hibák

Ebben a forrásfelmérésben futásidejű hibát nem reprodukáltam; tesztet és böngészős workflow-t nem futtattam, így bizonyított runtime hiba nincs megállapítva.

### Hiányzó funkciók és korlátok

- A 27 nem-tetős suite kalkulátorhoz nem találtam mentést és újranyitást.
- Nincs egységes, kalkulátorok között automatikusan átadott munkaszintű tetőadat.
- A külön Felmérés adatbevitel kivezetett; új rekordban nem rögzíthető a korábbi mérési/fotó/munkaszakasz-workflow.
- Gutter és flashing kalkulátor mai UI-elérhetősége nem bizonyított.
- A faanyaglista nem optimalizál szálhosszt vagy maradékot; a fedési kalkulátor nem helyettesíti a gyártói alkalmasságot, áttörés- és statikai ellenőrzést.

### UX-problémák

- Ismételt kézi adatbevitel kalkulátorok között.
- Az önálló számítás és a projekt/ügyfél/munkanapló kapcsolata külön modulokban történik.
- A rendszer nem mutat egyetlen teljes láncot az első helyszíni mérettől az ajánlatig és kivitelezésig.
- Böngészőben és valódi telefonon nem ellenőriztem a képernyőket.

### Nem ellenőrzött

- Élő adatbázis migrációs állapota, tényleges RLS és felhasználói adatok.
- Route-onkénti böngészős működés, hibás/üres/mentett állapot, mobil/tablet/téma mátrix és fotófeltöltés.
- A nem commitolt checkout-változások jelenléte a kiadott verzióban.
- Valódi gyártói katalógus-adat minősége, illetve szakmai peer review.
- Gutter/flashing maradék UI/API belépőjének pontos állapota.

## 11. Következő fejlesztési lehetőségek

- **P1 — Közös munkakontextus:** legyen-e olyan munka/projekt adatlap, amelyből a tetőméret, ügyfél és helyszín forrással adható át a kapcsolódó kalkulátoroknak?
- **P1 — Munkanapló szerepe:** maradjon-e külön kivitelezési eszköz, vagy legyen opcionális munka-konténer az első adatbeviteltől? Ma nem kötelező.
- **P2 — Mentési lefedettség:** mely egyszeri kalkulátorok eredményét kell ténylegesen megőrizni, és melyek maradjanak gyors segédszámítások?
- **P2 — Gutter/flashing elérhetőség:** a kódban szereplő becslőket aktuális UI-ba kell-e kötni, vagy maradjanak kivett modulok?
- **P3 — Fő navigáció:** hogyan jelenjen meg mobilon ügyfél/projekt, önálló számítás és legutóbbi munka?

## Forrásjegyzék

- Route-ok: src/app/**/page.tsx és src/app/api/**/route.ts.
- Dashboard/navigáció: [dashboard.data.ts](../src/features/dashboard/dashboard.data.ts), [dashboard.tsx](../src/features/dashboard/dashboard.tsx), [app-navigation-links.tsx](../src/components/navigation/app-navigation-links.tsx), [routes.ts](../src/components/navigation/routes.ts).
- Kalkulátorok: [construction/catalog.ts](../src/domain/calculations/construction/catalog.ts), [construction-calculator-loading.ts](../src/features/calculators/construction-calculator-loading.ts), [roof-calculator-definitions.ts](../src/features/calculators/roof-calculator-definitions.ts), [stair-calculator-definitions.ts](../src/features/calculators/stair-calculator-definitions.ts), [concrete-calculator-definitions.ts](../src/features/calculators/concrete-calculator-definitions.ts), [construction-computation.ts](../src/features/calculators/construction-computation.ts), [construction-suite.tsx](../src/features/calculators/construction-suite.tsx).
- Mentés/kapcsolat: [construction-actions.ts](../src/features/calculations/construction-actions.ts), [construction-data.ts](../src/features/calculations/construction-data.ts), [execution-calculation-links.ts](../src/features/execution/execution-calculation-links.ts), [material-preparation-data.ts](../src/features/material-takeoffs/material-preparation-data.ts), [project-calculator-links.tsx](../src/features/projects/project-calculator-links.tsx).
- Kivezetett Felmérés: [retired-survey-route.ts](../src/features/field-surveys/retired-survey-route.ts), [field-survey-actions.ts](../src/features/field-surveys/field-survey-actions.ts), [20261025140000_retire_field_survey_creation.sql](../supabase/migrations/20261025140000_retire_field_survey_creation.sql).
- Projekt/ügyfél/ajánlat/kivitelezés: src/features/projects/, src/features/clients/, src/features/quotations/, src/features/execution/.
- Séma: 20261012000000_foundation.sql, 20261012010000_versioned_calculation_architecture.sql, 20261013050000_execution_planning.sql, 20261013060000_execution_journal.sql, 20261014010000_standalone_calculation_persistence.sql, 20261012040000_material_catalog.sql és kapcsolódó későbbi migrációk.

---

**Audit státusza:** forráskód- és migrációs leltár elkészült; élő adatbázis-, teszt- és böngészőellenőrzés nem történt.
**Javasolt Conventional Commit:** docs(M9.17): add current system and workflow audit
