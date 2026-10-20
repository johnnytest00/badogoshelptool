# F9.47 — Zhitov funkcionális paritás: független gap report

## 1. Vezetői összefoglaló

Az audit célja a hat Zhitov referenciaoldal funkcionális scope-jának összevetése a jelenlegi TetőPro-kóddal, nem pedig a Zhitov képleteinek vak átvétele. A jelenlegi rendszer már valóban **feladat-alapú**: négy tető/faszerkezeti katalógusfeladat van, és a tetőforma a feladat bemenete. Ez a szerkezet a korábbi forma-alapú katalógust megszüntette, de a régi, perzisztált `roof.gable` és `roof.geometry.*` azonosítók több üzleti útvonalban tovább élnek.

A geometriai mag jelenlegi állapotában erős és célzottan tesztelt: a szarufa-hossz javított képlete, a nyolc tetőforma közös síkgeometriája, a síkpoligonból számolt faanyag-vonalak, az alátét csík-geometriája és a fedőtábla-oszlopok külön motorban léteznek. Ez azonban **nem teljes Zhitov-funkcionális paritás**. A standalone konstrukciós felület helyi előnézet, nem ment számítást, nem hoz létre anyaglistát vagy ajánlatot; a fizikai darabszám, raktári vágás, áttörés, szegélyezés és gyártói kompatibilitás több helyen csak `UNSUPPORTED`/`INCOMPLETE` korlátként jelenik meg.

Az auditban talált fő eltérések P1-esek: a reference-scope és a task-alapú katalógus közötti tartós adat- és integrációs szerződés nincs lezárva; a `roof2`/`roof3`/`roof4` teljes anyag- és nyomtatható eredményfunkciója nincs meg; a `wooden_truss` csak burkológörbét ad; a részletes eredménydokumentum és a gyártási/stock mennyiség hiányzik. **P0-s, bizonyított numerikus vagy adat-integritási hibát ebben a célzott vizsgálatban nem találtam.**

## 2. Bizonyíték és ellenőrzési határ

Áttekintett elsődleges források:

- `docs/ZHITOV_PARITY_REDESIGN.md`
- `docs/ROOF_CALCULATION_SPECIFICATION.md`
- `docs/CALCULATOR_COVERAGE_MATRIX.md`
- `docs/PROGRESS.md`, különösen F9.47–F9.49
- a katalógus, konstrukciós suite, geometria-, fedés-, alátét-, faanyag- és rajzmotorok

Célzott automatizált futás:

```text
npm test -- --run \
  src/domain/calculations/construction/construction.test.ts \
  src/domain/calculations/roof-geometry.test.ts \
  src/domain/calculations/roof-timber-layout.test.ts \
  src/domain/calculations/roof-underlay.test.ts \
  src/domain/calculations/roof-covering-layout.test.ts \
  src/features/calculators/construction-thumbnails.test.tsx
```

Eredmény: **6 fájl, 64 teszt PASS**. Typecheck, lint, production build és teljes Vitest ebben az auditban nem futott. Élő böngészős újraellenőrzés nem volt elvégezhető: nem volt megnyitott alkalmazáslap, a helyi dev-szerver indítása sandbox `listen EPERM` hibával blokkolódott. A korábbi F9.46 dokumentált browser smoke eredményeit ezért csak történeti kontextusként, nem új F9.47 bizonyítékként kezelem.

## 3. A hat referencia és a jelenlegi katalógus megfeleltetése

| Zhitov referencia | TetőPro-feladat | Tetőforma a jelenlegi modellben | Megjegyzés |
|---|---|---|---|
| `roof` | `roof.rafter-cut` | nincs forma-választó; egy keresztmetszeti szarufa | Egy szarufa hossza és vágási szöge, nem teljes tető anyaglistája. |
| `roof2` | `roof.material-takeoff` | `gable` (és további formák) | A közös geometry/timber/underlay/covering rétegek több formát kezelnek; a régi `roof.gable` termékmotor külön maradt. |
| `roof3` | `roof.material-takeoff` | `shed` | Ugyanaz a task több formára; nem külön katalógus-entry. |
| `roof4` | `roof.material-takeoff` | `mansard` | F9.48 óta a közös geometry motor része; a mezőértelmezés saját, explicit alsó/felső futás-emelkedés. |
| `hip_roof` | `roof.timber-cutlist`, illetve `roof.material-takeoff` | `hip` | A Zhitov-féle konty anyag- és vágásigénye két TetőPro-taskra oszlik; a saját szimmetrikus modell szándékosan nem másolja a gyanús Zhitov-eredményeket. |
| `wooden_truss` | `roof.truss-members` | nem tetőforma, háromszögű tartó | Csak burkológörbe és egyenletes csomóponti osztás; teljes rácsozat nincs. |

A jelenlegi katalógus tetőbejegyzései a `src/domain/calculations/construction/catalog.ts` fájlban: `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members`. A `src/features/calculators/construction-suite.tsx` ugyanilyen négy definitiont használ; a tetőformákat a `roofShapeFields` választja ki. Ez igazolja a task-alapú átszervezést, de nem igazolja önmagában a Zhitov-szintű üzleti integrációt.

## 4. Referenciánkénti funkcionális paritás

Státuszok: **IMPLEMENTED & VERIFIED**, **IMPLEMENTED BUT NOT VERIFIED**, **PARTIALLY IMPLEMENTED**, **MISSING**, **NOT APPLICABLE**.

| Referencia | Bemenet és konvenció | Számított értékek / anyag | Rajz és eredmény | Státusz és érintett kód |
|---|---|---|---|---|
| `roof` | Fél fesztáv, emelkedés, vízszintes ereszkiülés, opcionális ülék-/madárszáj-magasság, egész mm; pitch a fél fesztávból | Felső él menti testhossz, ereszhossz, teljes szarufahossz, hajlás, függőleges vágásszög | Sematikus keresztmetszet; nincs Zhitov-féle teljes betűzett/méretezett szarufarajz és nyomtatási lap | A derékszögű geometria **IMPLEMENTED & VERIFIED** (`roofs.ts`, `construction.test.ts`). B (szarufaszélesség) szándékosan nem számítási input; statika, ülék, gyártási vágás **MISSING**. |
| `roof2` | Nyeregtető méretek, opcionális tábla- és fóliaadat, opcionális faanyag-kiosztás; Type 2 csatlakozó tető nincs | Közös síkfelület; geometriai szarufa/léc-vonal; fólia és fedőtábla csak explicit paraméterből; fizikai stock- és hulladéklista nincs | Közös `TechnicalDrawing`, dimenzió- és síkmodell; nincs több nevesített nézet, nyomtatható eredményoldal vagy alkatrész-szám ↔ vágáslista | Geometria, hip/nyereg fedési layout tesztek **IMPLEMENTED & VERIFIED**. Teljes Zhitov-anyagkimenet, Type 2, stock-vágás, mentés/anyaglista/ajánlat **PARTIALLY IMPLEMENTED / MISSING** (`construction-suite.tsx`, `roof-covering-layout.ts`, `roof-underlay.ts`). |
| `roof3` | Félnyeregtető és léc/szarufa/fedés paraméterei | `shed` geometry, faanyag-vonalak és általános táblás layout; alátét a jelenlegi allowlist szerint támogatott; gyártói vásárlási mennyiség nincs | Közös geometriai rajz, nem Zhitov-féle oldalrajz + eredménylap | A domain útvonal **IMPLEMENTED BUT NOT VERIFIED** ebben az auditban élő UI-val. Anyagkiosztás csak geometriai/termékadat-függő; teljes reference-paritás **PARTIAL**. |
| `roof4` | Zhitov Y/Y2/X/C/B helyett explicit `lengthMm`, `widthMm`, `lowerRunMm`, `lowerRiseMm`, `upperRiseMm` | Két hajlású alsó/felső síkok, felület, törésvonal; faanyag és fólia geometriai layout; gyártói fedés csak termékadatból | Közös sík-/élrajz, `break` él; nincs térdfal-csomóponti/gyártási/nyomtatható dokumentum | A saját mansard-modell **IMPLEMENTED & VERIFIED** a `roof-geometry.test.ts` fixture-eivel, de nem a Zhitov kontrollált képletének teljes reprodukciója. Anyag- és eredménydokumentum-paritás **PARTIAL**. |
| `hip_roof` | Szimmetrikus `length > width`, pitch, kontygeometria; nincs Zhitov-féle összes U/W/S/O paraméter egyetlen űrlapon | Közös konty geometry, síkonkénti timber és általános sheet layout; a timber mennyiség geometriai tengely/vonal, nem fizikai elem-darab | Méretezett közös geometry drawing, sematikus fedvények; nincs Zhitov részletes elemnézet/stock packing | Konty geometry és layout **IMPLEMENTED & VERIFIED** célzott tesztekben. Teljes konty-anyaglista, gyártási darabjegyzék és szimmetria-paraméterek **PARTIAL**. |
| `wooden_truss` | Fesztáv, magasság, fél-fesztáv osztásszám; Z/W/P/N jellegű szerkezeti adatok nem kerülnek be | Felsőöv félhossza, talpszög, csomóponti osztás; nincs belső rácsozat, darabjegyzék vagy térfogat | Sematikus háromszög/rácsozat-ikon; nem kapcsolati vagy gyártási rajz | A burkológörbe **IMPLEMENTED & VERIFIED** (`roofs.ts`, `construction.test.ts`). A reference által várt rácsozati elemek, kapcsolatok, vágás és faanyaglista **MISSING**. |

## 5. A 26 pontos specifikáció státusza

| Pontok | Független státusz | Bizonyíték / eltérés |
|---|---|---|
| A1–A3 | **IMPLEMENTED & VERIFIED** | Task/output-alapú címek, több reference egy task alatt, formaválasztó bemenetként (`catalog.ts`, `construction-suite.tsx`). |
| A4 | **IMPLEMENTED BUT NOT VERIFIED** | Kategória- és thumbnail-komponensek/testek léteznek; új live browser rácsellenőrzés nem történt. |
| B1 | **PARTIALLY IMPLEMENTED** | Méretek mm-ben vannak, de a pitch fok, a kimenetek m/m²/db; ez nem teljesen azonos a Zhitov egységkonvencióval. |
| B2 | **MISSING** | Nincs X/Y/C/B/S1–S4/O1/O2/R/L1–L3 betűkód és a rajzzal közös betűlegenda. |
| B3 | **PARTIALLY IMPLEMENTED** | A fa- és fóliapanelek az eredmény alatt lenyithatók, nem egyetlen „Tető anyagok” főűrlap-szakaszban. |
| B4 | **PARTIALLY IMPLEMENTED** | Geometriai mezők többnyire kötelezők; gyártói adatra helyesen nincs kitalált default, ezért a Zhitov „soha nem üres” UX nem teljesül. |
| B5 | **IMPLEMENTED BUT NOT VERIFIED** | Geometry panel és korlát megjelenhet akkor is, ha a fő fedési sor üres; élő UI-ellenőrzés most nem volt. |
| B6 | **IMPLEMENTED & VERIFIED** | Zoom/fit/reset/pan/pinch a `technical-drawing.tsx` és viewport-motorban. |
| B7–B8 | **MISSING** | Nincs fekete-fehér nyomtatási kapcsoló és külön nyomtatható eredményoldal. |
| B9 | **NOT APPLICABLE** | Tetőre nem került ad-hoc ármező; az ár/ajánlat külön domain. |
| C1–C2 | **MISSING** | A construction suite explicit helyi előnézetként jelzi, hogy nem ment, nem küld ügyfélhez/projekthez/ajánlathoz; nincs kötött nyomtatási sorrend. |
| C3 | **IMPLEMENTED & VERIFIED** | „Kiindulási adatok” visszaolvasás a `construction-suite.tsx` eredménypanelben. |
| C4 | **PARTIALLY IMPLEMENTED** | Egy közös rajz és nézetváltás van; nincs Zhitov-szerű több, név szerint nyomtatható nézetkészlet. |
| C5–C6 | **PARTIALLY IMPLEMENTED** | A shared geometry rajz dimenziókat és interakciót tud, de nincs teljes méretszám/alkatrész-sorszám ↔ vágáslista dokumentum; a cutlist csak a timber task eredményében jelenik meg. |
| C7 | **NOT APPLICABLE** | A fél/teljes „11 (22)” konvenciót a specifikáció szándékosan elutasítja. |
| C8 | **MISSING** | Nincs szálhossz-, tekercs- vagy alternatív kiszerelés-kimenet. |
| C9 | **PARTIALLY IMPLEMENTED** | `limitation`, panel-disclaimer és `INCOMPLETE/UNSUPPORTED` állapot létezik, de nincs egységes nyomtatható eredménylapon. |
| D1–D4 | **PARTIALLY IMPLEMENTED** | Rövid `note`, `scope`, `limitation` és panel-súgó van; teljes betűmagyarázat és minden oldali súgóblokk nincs. |
| D5 | **PARTIALLY IMPLEMENTED** | A motorok felfelé kerekített/sávos eredményt adnak, de nincs egységes felhasználói magyarázat a tört sor/darab kezelésére. |
| D6–D7 | **MISSING / NOT APPLICABLE** | Tetőre termékadat nélkül nincs minimális hajlásszög-verdikt; nem került be nem forrásolt szakmai ökölszabály. |
| D8 | **PARTIALLY IMPLEMENTED** | Hulladék, vágási maradék és gyártási korlát több disclaimerben szerepel, de egységes vásárlási emlékeztető nincs. |
| E1 | **PARTIALLY IMPLEMENTED** | A régi roof-calculation és dedikált gable fedések menthetők; a task-alapú construction suite saját dokumentációja szerint nem ment és nem material-list/quotation integrált. |

## 6. Független képlet- és mennyiség-ellenőrzés

### 6.1 Szarufa (`roof`)

A `calculateRafterGeometry` jelenlegi képlete konzisztens:

```text
α = atan2(rise − seatCutHeight, halfSpan)
body = hypot(halfSpan, rise − seatCutHeight)
eave = eaveProjection / cos(α)
total = body + eave
cut = 90° − α
```

A célzott teszt 3 000 / 2 000 / 500 mm esetén külön ellenőrzi a ferde ereszhossz hozzáadását; ez elkerüli a korábbi, ereszt ellaposító hibát. A `B` szarufaszélesség nem geometriai input, így rajzi méretként vagy szerkezeti vágásként nem használható.

Összehasonlításként a redesign-spec által kontrollált `roof` képlete egyezik a fenti modellel; a `roof2`/`roof3` Zhitov-féle zárt alakjai viszont nem kerültek egy az egyben a kódba. A specifikációban rögzített referencia-alak röviden:

```text
roof2: α = atan(Y / (X/2)), rafter = (X/2 + C) / cos(α)
        surface = rafter × B
        rafterCount = floor((B − 2S4) / S3) + 1
        battenRows = ceil(rafter / (O1 + R)), battenStock = ceil(rows × B / 6000)
roof3: α = atan(Y / X), az eresz mindkét végén szerepel
```

Ezek a referencia-formulák a léc-/szarufa-paraméterekkel együtt reprodukálhatók, de a jelenlegi közös engine nem ugyanilyen zárt, forma-specifikus sor- és stock-modellként működik. A fedésnél a saját motor szándékosan nem veszi át a Zhitov terület-osztásos darabszámot és átfedést figyelmen kívül hagyó képletét; helyette síkonkénti polygon-kiosztást ad, vagy `INCOMPLETE`/`UNSUPPORTED` állapotot.

### 6.2 Közös tetőgeometria

`roof-geometry.ts` validált síkpolygonokat, éleket és síkonkénti pitch-et ad. A síkterület a vetületből és a lejtésgradiensből származik. A hip, pyramid, half-hip, L/T és mansard fixture-ek ellenőrzik a területet, éleket, vápákat, törésvonalat és tiltott határokat. Ez geometriabizonyíték, nem Zhitov- vagy gyártói anyagkihozatal-bizonyíték.

### 6.3 Szarufa/léc vonal és térfogat

`calculateRoofTimberLayout` síkpoligonokkal metszi a tengelyeket, a maximum osztást `ceil` után egyenletesen osztja újra, a 3D szakaszokat deduplikálja és explicit keresztmetszetből számol névleges térfogatot. A kimenet minősítése helyesen **verified geometric quantity**; a `count` geometriai tengely/vonal, nem vásárolható fizikai faelem-darabszám. Nincs nyílás, toldás, stock-hossz, maradék-optimalizálás vagy csomóponti levonás.

### 6.4 Alátét

`calculateRoofUnderlayLayout` tényleges síkcsíkokat, oldal- és végtoldást, vágási hosszakat és korlátos 1D tekercs-packing minimumot számol. Ez bizonyíthatóan erősebb az egyszerű terület/tekercs-hányadosnál. A jelenlegi engedélylista: `gable`, `shed`, `hip`, `mansard`; pyramid, halfHip, L és T esetén az alátét **UNSUPPORTED**. Ez a közös material-takeoff kiterjesztett formáinál P1 funkcionális hiány.

### 6.5 Fedőtábla

`calculateRoofCoveringLayout` minden síkot eresz-irányú teljes szélességű oszlopokra bont, az oszlop saját síkpoligonba vágott lejtőhosszából számol tábladarabot. A hip teszt kézi oracle-lel 32 oszlopot és 72 táblát ad, nem puszta területbecslést. A kimenet státusza **geometric-layout-quantity**: a motor nem állít gyártói alkalmasságot, szegélyt, felhajtást, áttörést, szélességi maradékot, hulladékot vagy optimális vásárlási vágást.

### 6.6 Mansard, hip és L/T kockázat

A spec szerint a Zhitov `roof4`, `hip_roof` és `wooden_truss` képleteit nem fejtették vissza kontrollált oracle-lel; a saját, explicit modell ezért tudatos eltérés. A kontymodell szimmetrikus, azonos pitch-es alapeset; a mansard explicit két futás/emelkedésből épül; L/T csak a jelenlegi, ortogonális wing-sémát kezeli. Aszimmetria, változó pitch, tetszőleges polygon, nyílás és gyártói csomópont nincs bemeneti szerződésben. Ezek kockázatok, nem ebben az auditban reprodukált numerikus hibák.

## 7. UI, eredménydokumentum és downstream korlátok

- A `construction-suite.tsx` `independentContent` szövege szerint az eredmény „helyi előnézet”: nem mentődik ügyfélhez, projekthez, felméréshez, anyaglistához, munkanaplóhoz vagy ajánlathoz. Ez közvetlenül kizárja az E2E Zhitov-szintű workflow-paritást a task-suite-ben.
- A meglévő anyaglista- és dedikált fedés-útvonalak elsősorban `roof.gable`, `roof.gable.metal-tile-covering` és kapcsolódó régi azonosítókat keresnek (`src/features/roof-models/*-actions.ts`, `src/domain/material-takeoffs/*`). Nincs ellenőrzött adapter, amely a `roof.material-takeoff` preview-t automatikusan immutable revisionné, material listté és quotation source-szá alakítaná.
- A `src/features/calculators/construction-suite.tsx` `roof.timber-cutlist` definitionje `calculate: () => []`; az érdemi geometriai és vágáslista eredményt a közös geometry/timber panelek adják. Ez működési szempontból érthető, de a katalógus `verified` státusza félreérthető: az engine státuszát jelöli, nem a teljes task készültségét.
- A `ConstructionDrawing` fájlban maradtak régi `roof.mansard`/`roof.shed`/`roof.hip` ágak, miközben az aktuális task-azonosítók már `roof.*-` feladatok és a roof geometry korai visszatérése miatt ezek az ágak a jelenlegi task-flowban elérhetetlenek. Ez nem bizonyított eredményhiba, de karbantartási/kompatibilitási kockázat.
- A `src/features/roof-models/roof-model-data.ts`, `survey-roof-workspace.tsx`, gable fedés-actionök és material-takeoff javaslatok továbbra is shape/legacy ID-ket kezelnek. A Zhitov task-katalógus és a Survey/roof-model adatút közötti alias- vagy migrációs szerződés nincs dokumentáltan lezárva.
- A `TechnicalDrawing` a geometry és drawing model közös outputjából épül, ami jó architekturális konzisztencia. A rajz azonban sematikus geometriai/quantity overlay, nem kivitelezési, statikai vagy gyártási terv.

## 8. Hiányok és prioritások

### P0 — hibás eredmény vagy adatbiztonság

Ebben a célzott auditban **nincs bizonyított P0-hiba**. A korábbi szarufahossz-hiba javítása és tesztje jelenleg helyesnek látszik.

### P1 — hiányzó magfunkciók vagy integráció

1. **Task-suite tartós integrációja.**
   - **Mi hiányzik:** a `roof.material-takeoff` és `roof.timber-cutlist` csak helyi preview; nincs egységes mentés → material list → quotation adapter.
   - **Hol:** `src/features/calculators/construction-suite.tsx`, `src/features/calculations/standalone-persistence.ts`, `src/features/roof-models/*`, `src/domain/material-takeoffs/*`.
   - **Elvárt:** immutable task-revízió, provenance, forrás-revízió és csak minősített mennyiség továbbítása; a geometriai becslés ne legyen verified purchasing quantity.
   - **Miért:** enélkül a reference „anyagok kiszámítása” funkció üzleti workflow-ban nem érhető el.

2. **Legacy/task azonosító-szerződés.**
   - **Mi hiányzik:** alias vagy additív migráció a `roof.gable`/`roof.geometry.*` és az új task ID-k között.
   - **Hol:** `roof-model-data.ts`, `survey-roof-workspace.tsx`, gable covering actions, material-takeoff candidate code, saved calculation readers.
   - **Elvárt:** verziózott aliasolás, régi snapshotok változatlan olvasása, új task outputhoz explicit source/provenance mapping.
   - **Miért:** a katalógus átnevezése önmagában nem biztosítja a mentett számítások és downstream források kompatibilitását.

3. **`roof2`/`roof3`/`roof4` anyag-scope teljesítése.**
   - **Mi hiányzik:** Type 2/összekötő tető, explicit gyártói fedési szabályok, stock/vágási és szükség szerinti alátétkezelés; a nem támogatott topológiák egyértelmű, felhasználó által érthető lezárása.
   - **Hol:** `roof-covering-layout.ts`, `roof-underlay.ts`, `roof-covering-parameters.ts`, konstrukciós suite panelek.
   - **Elvárt:** csak forrásolt termékadatból számolt, státuszolt mennyiség; hiányzó adatnál ne legyen hamis darabszám.
   - **Miért:** az area-only vagy általánosított mennyiség nem azonos a Zhitov anyag- és beszerzési kimenetével.

4. **`wooden_truss` magfunkció.**
   - **Mi hiányzik:** belső oszlopok/merevítők, elemdarabok, vágási hosszak, kapcsolatok és külön korlátozott anyaglista.
   - **Hol:** `src/domain/calculations/construction/roofs.ts`, `construction-suite.tsx`.
   - **Elvárt:** külön, explicit rácsozati szerződés és independent fixture-ek; statikai igazolás továbbra sem következik belőle.
   - **Miért:** a jelenlegi envelope nem teljesíti a reference által várt rácsos tartó elemi kimenetet.

5. **Eredmény- és nyomtatási réteg.**
   - **Mi hiányzik:** rajz → kiindulási adatok → méretek → anyagok kötött sorrendű, nyomtatható eredménylap; rajzi méretszámok, alkatrész-azonosítók, alternatív kiszerelés.
   - **Hol:** `construction-suite.tsx`, `technical-drawing.tsx`, rajzmodellek és a meglévő quotation PDF útvonal közötti adapter.
   - **Elvárt:** a korlátok/provenance a lapon maradjanak, és a rajz ne sugalljon gyártási/statikai tervet.
   - **Miért:** ez a C1–C8 paritás és az önállóan értelmezhető dokumentum feltétele.

### P2 — használhatóság és prezentáció

1. Betűkódos mezők és közös rajzlegenda hozzáadása, a meglévő kattintható mező↔rajz kiemelés megtartásával.
2. A `scope`/`limitation`/súgó egységes, minden taskon látható „Mire való / Mit nem számol / Hogyan kerekíts” blokkká alakítása.
3. A katalógus `status` szétválasztása: geometria ellenőrzött, anyagmennyiség ellenőrzött, downstream integráció kész.
4. A `ConstructionDrawing` elérhetetlen legacy ágainak és a félreérthető `calculate: () => []` task-jelzésnek dokumentált, nem destruktív tisztítása.

## 9. Javasolt megvalósítási sorrend

1. **Szerződés lezárása:** task ID-k, legacy aliasok, revision/provenance és a verified geometric vs purchasing quantity státuszok.
2. **Downstream adapter:** mentett task-revízió → material-list source → quotation source, csak explicit és megfelelően minősített kimenetekkel.
3. **Fedés/alátét scope:** gyártói termékadat-snapshot és topológiai korlátok; először gable/shed/hip/mansard, utána külön fixture-rel más formák.
4. **`wooden_truss` külön szerződés:** rácsozat és vágáslista csak akkor, ha a bemenetek és szakmai korlátok teljesek.
5. **Nyomtatható eredménylap és rajzi annotációk.**
6. **P2 UX és státuszjelölés**, majd új, kontrollált hip/mansard/truss és integrációs browser/DB tesztek.

## 10. Végső minősítés

| Terület | Független státusz |
|---|---|
| Task-alapú katalógus és formabemenet | IMPLEMENTED & VERIFIED forrás- és tesztszinten |
| Szarufa-geometria | IMPLEMENTED & VERIFIED |
| Közös roof geometry | IMPLEMENTED & VERIFIED a deklarált, szimmetrikus/ortogonális scope-ban |
| Faanyag- és alátét-geometria | IMPLEMENTED & VERIFIED / részben UNSUPPORTED formánként |
| Fizikai beszerzési mennyiség, stock/vágás, gyártói megfelelés | PARTIALLY IMPLEMENTED |
| Mentés → anyaglista → ajánlat a task-suite-ből | MISSING / nem bizonyított |
| Zhitov-szerű nyomtatható eredménydokumentum | MISSING |
| Teljes hat-referencia funkcionális paritás | **FAIL — nincs meg** |

Ez a jelentés audit-dokumentumként készült; alkalmazáskódot, adatbázist és meglévő dokumentumokat a jelentésen kívül nem módosítottam.
