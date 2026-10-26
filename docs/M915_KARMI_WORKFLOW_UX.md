# M9.15 — Karmi workflow UI/UX

## Státusz és hatókör

**PARTIAL.** A kapcsolódó bemeneti workflow három tetőkalkulátorban előtérbe került, a korábbi geometriai motor, mentési útvonal és rajzi komponensek újrahasználásával. Ez a dokumentum elkülöníti a megvalósított UI-t a még nem teljesített M9.15 követelményektől.

## Korábbi adatbevitel és új hierarchia

A szarufa-csatlakozási mezők a „Részletes számítás · opcionális” gyűjtőpanelben voltak. Az M9.15 változtatás külön „Szarufák és bevágások” szekcióba emeli őket, ezzel a Karmi- és szelemenadatok a három érintett tetőkalkulátorban egy helyen találhatók.

- `roof.rafter-cut`: a fél fesztáv, gerincemelkedés, ereszkiülés és HAP a szarufa alapgeometriájának része. A keresztmetszet, talpszelemen-ellenőrzés, derékszelemen és gerinckapcsolat az új blokk további mezőcsoportjaiban szerepel.
- `roof.material-takeoff` és `roof.timber-cutlist`: a már létező szarufacsatlakozási kapcsoló az új blokk tetején marad. Bekapcsolás után a szarufa keresztmetszetéhez termék vagy kézi méret választható, majd külön csoport jelenik meg a talpszelemen/szarufa, a derékszelemen és a gerinckapcsolat adataihoz. Ez ugyanaz a `materialState.specs.rafter` state, amelyből a meglévő faanyagkalkulátor dolgozik; bekapcsolt Karmi-módban a szerkesztő nem jelenik meg még egyszer a faanyag szekcióban. A gerincdeszka és gerincszelemen mezői továbbra is csak az adott választásnál láthatók.
- Opcionális számítások, amelyek nem Karmi-csatlakozáshoz tartoznak, továbbra is a generikus részletes panelben maradnak.

A teljes kétszárnyú szarufa áttekintő, a tetősíkonkénti rajz, a csatlakozásválasztó, a kiválasztott részletrajz és a kiszabási lista már korábbi mérföldkövekben létezett. M9.15 ezeket nem cseréli le és a geometriájukat nem módosítja.

## HAP terminológiai vizsgálat

A helyi domain-definíció szerint a `seatCutHeightMm` függőlegesen a talpszelemen felső síkjától a szarufa felső éléig mért távolság, a talpszelemen külső függővágási síkjában. Ez egyezik mindhárom kalkulátor input adapterével. Nem azonos a függővágás hosszával, az ülékhosszal, a merőleges bevágási mélységgel vagy a megmaradó szarufamagassággal; ezeket a közös `calculateRafterJoints` számítja a már megadott geometriából.

A Magyar Kereskedelmi és Iparkamara [Tetőfedő mester oktatási jegyzete](https://mkik.hu/download/244/tetofedo-mester-oktatasi-jegyzet) a „kármi” szót a szarufába kerülő kivágásra, illetve annak mélységére és függőleges méretére használja. A [Faipar szakmai cikke](https://faipar.hu/data/file/13967/9428%2Cfaban-otthon-vagyunk) szintén a szarufába vágott kármit nevezi meg. E források nem nevezik meg külön a TetőPro által kért függőleges felsőél-magasságot, és a HAP rövidítésre sem találtam megbízható magyar szakmai definíciót. Ezért az elsődleges mezőcím magyar és mérték-referenciát mond: **„Szarufa felső élének magassága a talpszelemen felett (HAP)”**. A terminológia önmagában nem ad kivitelezési vagy statikai jóváhagyást.

Az inputmező címe változott, de az eredmény- és domain-hibacímkék belső/kimeneti `HAP_LABEL` értéke változatlan maradt, így a számított kimeneti sor neve nem változik. A domain kulcsok, belső `birdsmouth*` nevek és `construction-suite.input.v1` / `output.v1` szerződések változatlanok.

## Kötelező, opcionális és átvett adat

- **Átvett:** az épület/tető méretei, tetőforma, lejtés, ereszkiülés és keresztmetszet a meglévő kalkulátoradatokból származik, ahol azok ténylegesen rendelkezésre állnak.
- **Szarufa-kiszabás alapja:** fél fesztáv, gerincemelkedés, vízszintes ereszkiülés és HAP a meglévő kalkulátor alapmezői; ezek jelentése nem változott.
- **Csatlakozási számítás:** a két anyagkalkulátorban bekapcsolható. A HAP és a termékből/kézi adatból származó keresztmetszet-magasság szükséges a talpszelemen bevágási eredményéhez; a hiányzó adatot a meglévő domain teljességi ellenőrzése jelzi. A méretezett tetősík-rajzhoz a meglévő „Szarufa és léc” kiosztást is be kell kapcsolni, mert ez biztosítja a tetősíkonkénti szarufavonalakat.
- **Opcionális:** derékszelemen-méretek és a hozzájuk tartozó korábbi mérési segédlet; gerinckapcsolat-típus és csak a választott kapcsolathoz tartozó méretek. A talpszelemen szélessége továbbra is opcionális, ellenőrzési célú bemenet.

Nem adtam alternatív, automatikus HAP-értéket vagy kitalált kivitelezési alapértéket. A mezők mértékegységváltóit és számításait a meglévő `LengthField` és domain-kód szolgálja ki.

## Három kalkulátor közötti egységesség és rajzi kapcsolat

Az azonos csatlakozási inputkulcsok a közös mezőbesorolással kerülnek ugyanabba a szekcióba mindhárom kalkulátorban; a `roof.rafter-cut` HAP mezője az alapgeometriában marad, mert az ott nem opcionális csatlakozási adat. A két anyagkalkulátor a meglévő `birdsmouth` kapcsolót és közös `planeBirdsmouthsFor` adaptert használja.

Az űrlap után megjelenő számított rajz és méretek továbbra is a domain `calculateRafterJoints`, `planeBirdsmouthsFor`, `createRafterJointDrawingModel` és meglévő React rajzkomponensek eredményei. A részleges, invalid vagy nem támogatott állapotok mentési szabályát a `computeConstruction` és a szerveroldali újraszámítás őrzi meg. Ebben a mérföldkőben nem készült új overview rajz, új kijelölési interakció vagy rajzszinkron.

## UI és akadálymentesség

Az új terület a meglévő Liquid Glass felületi tokenekkel, szemantikus szekciócímekkel és már meglévő, billentyűzettel működő checkbox/mező/disclosure komponensekkel készült. Mobilon a meglévő 1 oszlopos mezőrács marad érvényben; az új szekció nem vezet be fix szélességet vagy új animációt. Ebben a változtatásban nem történt teljes accessibility audit vagy valamennyi viewport vizuális mérőszámos mérése.

## Teszt és bizonyíték

- TDD red/green: az új csatlakozómező-besorolási regresszió a helper hozzáadása előtt elbukott, utána sikeres lett.
- Célzott Karmi- és szarufaspecifikáció-tesztek — **8 fájl / 73 teszt PASS**.
- Teljes `npm test` — **192 fájl PASS / 8 SKIP; 1173 teszt PASS / 19 SKIP**.
- Teljes `npm run lint` — **PASS**; izolált `/private/tmp` másolatban `npm run typecheck` és `npm run build` — **PASS**.
- `git diff --check` — **PASS**.
- Helyi Brave-ben (asztali ablak) képernyőkép és accessibility tree igazolta az új szekciót, a magyar HAP feliratot, a HAP mérési segédet, az opcionális mezőket és a csatlakozási csoportokat. Mindhárom tetőkalkulátort megnyitottam; a material/timber csatlakozáskapcsoló megjelenítette a közös mezőcsoportokat és a szarufatermék-szerkesztőt. A „Szarufa és léc” bekapcsolásakor a szarufa-szerkesztő nem duplikálódott; a gerincdeszka opció megmutatta a saját vastagságmezőjét. Ez nem helyettesíti a specifikáció szerinti teljes, valid/invalid kitöltéses böngészőtesztet.

## Korlátok / nem bizonyított követelmények

- A `roof.material-takeoff` és `roof.timber-cutlist` teljes adatbevitele, mindhárom gerinckapcsolati típus és a hiányos/hibás csatlakozási rajz vizuális ellenőrzése ebben a menetben nem futott; a két kapcsoló, a szarufa-szerkesztő és a gerincdeszka feltételes mezője ellenőrizve lett.
- 375×812 mobil, 812×375 fekvő, tablet, desktop, sötét/világos téma és nagyított szöveg méretezett összevetése nem történt. A 375 px-en természetes működés ezért nincs bizonyítva.
- Nem került be külön „van derékszelemen?” választó; a két derékszelemen-mező csoportja opcionális, és üresen hagyható. A gerincdeszka/szelemen mezők a meglévő típusválasztás szerint jelennek meg.
- A `roof.rafter-cut` a kalkulátor saját alapfeladataként nem kap új aktív/inaktív kapcsolót; ezen a felületen a szarufa-alapgeometria mindig szükséges, a kapcsolódó méretek opcionálisak. Ez részleges eltérés a M9.15 progresszív kapcsoló követelményétől.
- Adatbázis-/mentési teszt és valós telefonos eszközteszt nem futott. Statikai, gyártói vagy kivitelezési megfelelőség nincs igazolva.

## Módosított fájlok

- `src/features/calculators/construction-suite.tsx`
- `src/features/calculators/rafter-connection-fields.ts`
- `src/features/calculators/rafter-connection-fields.test.ts`
- `src/app/globals.css`
- `src/domain/calculations/construction/rafter-joints.ts`
- `src/features/calculators/roof-calculator-definitions.ts`
- az érintett HAP-címke tesztek
- `docs/PROGRESS.md`, `docs/README.md`, `funkciok.md`

Javasolt Conventional Commit: `feat(M9.15): surface the rafter joint workflow across roof calculators`.
