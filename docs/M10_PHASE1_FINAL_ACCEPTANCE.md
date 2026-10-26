# M10.1 — végső független elfogadási QA

**Dátum:** 2026-10-26  
**Git HEAD:** `649b3ba5e775d127c1c9c1072c7754861f54cb9e`  
**Végső döntés:** **FAIL — az M10.1 nem zárható le biztonságosan.**  
**Hatókör:** M10.1.3 két P1 javításának független regressziója, célkalkulátorok átviteles mentés–újranyitása, drift-figyelmeztetés, vizuális QA és izolált build. Ez QA-only menet volt; alkalmazáskódot nem módosítottam.

## Döntést meghatározó megállapítások

1. A korábban bizonyított forma-váltási P1-et a friss, hitelesített böngészőmunkamenetben nem reprodukáltam. A két mező önálló invalidációja és a Gable → hip → gable adat-visszaéledés elleni viselkedése működött a felsorolt forgatókönyvekben.
2. **Új P1:** a célkalkulátor (`roof.timber-cutlist`) szerkeszthető `pitchDegrees` mezője 80°-ot és 81°-ot is elfogadott, és teljes számítást adott. 81°-nál a kiindulási adatok és a geometria is „81°”-ot mutatott. A közös `<80°` séma ezért nem védi a közvetlen célkalkulációs/mentési útvonalat.
3. A mentett material-takeoff és timber-cutlist revíziók átvitellel elmentődtek, a forrásfüggőség és attestáció read-only DB-lekérdezéssel igazolt. Mindkét kalkulátor friss újranyitásakor megjelent a mentett V1 output-eltérés figyelmeztetése; a figyelmeztetés okát nem sikerült a futó UI-objektumok pontos JSON-útvonaláig feloldani.
4. Kalkulátorváltás után az előző forrás „Adatok átvéve” jelzése az új célkalkulátor adatátvételi paneljében is megmaradt, üres célmezők mellett. Ez P2-es eredet-/állapotjelzési hiba.

## Korábbi bizonyítékok megőrzése

A korábbi, auth-blokkolt checkpoint és a javítás előtti P1 reprodukciók változatlanul olvashatók a [`M10_PHASE1_FINAL_INDEPENDENT_QA.md`](M10_PHASE1_FINAL_INDEPENDENT_QA.md) dokumentumban, különösen a §16.3–16.10 szakaszokban. Az M10.1.3 javítás állítása és a korábbi, DB-snapshotból tisztán újraszámított drift-eredmény a [`M10_PHASE1_P1_FINAL_REMEDIATION.md`](M10_PHASE1_P1_FINAL_REMEDIATION.md) dokumentumban marad. Ez a riport új, független futtatási eredmény; nem írja át a történeti megállapításokat.

## Munkamenet és környezet

- **Ellenőrizve:** a már bejelentkezett `localhost:3000` munkamenet aktív volt; a felhasználó `admin1@testadmin.com`, a szervezet `DEMO TetőPro Kft.` (`00000000-0000-4000-8000-000000000010`), a tagság `member`. Külső/staging/production környezetet nem használtam.
- **Ellenőrizve:** a jelenlegi checkout HEAD-je `649b3ba5e775d127c1c9c1072c7754861f54cb9e`. A futó dev szerver checkoutin belül volt; build külön, izolált másolatban futott.
- **Ellenőrizve:** a 80°/81° próba csak nem mentett, helyi draft volt; próba végén az „Új kalkuláció” művelettel elvetettem. Két, kifejezetten DEMO jelölt, átviteles E2E kalkulációt korábban elmentettem az engedélyezett helyi DEMO szervezetbe; ezek a QA rekordok megmaradtak.
- **Nem ellenőrzött:** külön taggal végzett RLS/cross-organization negatív teszt, konkurens mentés, trigger UPDATE/DELETE negatív futtatása. Nem végeztem DB-resetet, migrációt vagy jogosultságváltoztatást.

## P1 — React-state és geometriai adatátvétel

### Kódútvonal és atomosság

- **Ellenőrizve forráskóddal:** a `ConstructionCalculatorSuite.updateValue` a `construction-drafts.ts` `applyFieldChange` függvényét hívja. A tetőforma új értéke és az érintetlen, átvett gable `widthMm`/`pitchDegrees` mezők resetje egy `mergeCalculatorDraft` hívásba kerül; az `applied`-ból megmaradó mezőállapotot ugyanaz a függvény számolja ki. A parent két eredményt egy szinkron eseménykezelőben állítja be (`setDrafts`, szükség esetén `setTransferApplied`). Nincs `ConstructionFieldTransferControl` forma-váltó passive effectje.
- **Ellenőrizve forráskóddal:** a kalkuláció és `snapshotInput` a parent aktuális `values` állapotából származik; a mentési panel ezt a snapshotot és a `liveOutput`-ot kapja. A forrásból ténylegesen átvett mentések DB `input_snapshot` értékei a böngészőben látott 10000×8000 mm-es méreteket, a teljes `34.01934998982646°` hajlást, valamint az anyag-/kiosztási mezőket tartalmazták.
- **Korlát:** az eseménykezelő atomosságát a kód és az utána megfigyelt React állapot támasztja alá. Nem készült frame-szintű instrumentáció vagy komponensintegrációs teszt, amely a köztes render lehetetlenségét közvetlenül mintavételezné; gyors egymás utáni váltás csak a meglévő parent/helper Vitest esetekben szerepel.

### Böngészős P1-esetek

Mindegyik esetben friss böngészőbetöltés után indultam, és az aktuális célmezőket, kalkulációs teljességet/eredményt vizsgáltam; nem csak az előnézetet.

| Eset | Tényleges megfigyelés | Eredmény |
|---|---|---|
| Átvett gable → csak width kézi módosítása → hip | A kézi 9500 mm szélesség megmaradt; a pitch üres lett; a hip számítás hiányos maradt, pitch-et nem használt. | **PASS** |
| Átvett gable → csak pitch kézi módosítása → shed | A kézi 40° pitch megmaradt; a width üres lett; a shed számítás hiányos maradt, width-et nem használt. | **PASS** |
| Mindkét mező érintetlen → hip | Width és pitch törlődött; a hip eredmény hiányos, mindkettőt kéri. | **PASS** |
| Mindkét mező kézi módosítása → hip | A 9500 mm és 40° érték bent maradt; a számítás lefutott, a hip geometria 124,01 m² felületet adott. | **PASS** |
| Gable → hip → gable | Mindkét forma-váltás után width/pitch üres maradt; visszatéréskor egyik érték sem éledt fel; a gable eredmény hiányos és nem menthető volt. | **PASS** |
| Forma-váltás → Undo | Az Undo az átvétel előtti mezőértékeket állította vissza; az érvénytelenített geometria üres maradt, nem minősült az új formához igazolt geometriának. | **PASS** |
| Új kalkuláció indítása korábbi átvétel után | A megerősített „Új kalkuláció” után az „Adatok átvéve” státusz eltűnt. | **PASS** |
| Forma-váltás megerősítés előtt | Az előnézet nyitva tartása közben váltott forma után a szimmetria-jóváhagyás visszaállt; az átvétel nem történt meg. | **PASS** |

### P1 — `<80°` validáció: FAIL

- **Ellenőrizve forráskóddal és célzott tesztekkel:** a közös `roofGeometryInputSchema` `pitch` mezője véges, pozitív és szigorúan `.lt(80)`; az átviteli helper ezt használja. A Vitest tartalmaz `80°` és 80° feletti elutasítási, illetve határ alatti elfogadási eseteket.
- **Ellenőrizve böngészőben — FAIL:** a `roof.timber-cutlist` célkalkulátor pitch stepperje 80°-ot és 81°-ot is elfogadott. A kalkuláció teljes lett, 81°-ot írt a kiindulási adatok és a geometria eredményére; a 81°-os próbában 511,40 m² felületet és 25 570 mm-es szarufát számított, a „Kalkuláció mentése” gomb engedélyezett volt. A próbát nem mentettem.
- **Következtetés:** a közös séma helyes az átviteli validációban, de nincs bekötve a célkalkulátor közvetlen mező-/számítási trust boundary-jébe. Ez P1, mert érvénytelen, szélsőséges geometria teljes kalkulációs eredményként és potenciálisan menthetőként jelenik meg. Nem történt kódjavítás.

## P2 — anyagkalkulátor output-drift: NOT REPRODUCED a JSON eltérés, figyelmeztetés reprodukálva

- **Pontos összehasonlító logika:** `construction-save-panel.tsx` `comparableOutput` függvénye a `stableJsonStringify({ lines, takeoff, cutList })` kifejezést használja. Az `outputDrift` akkor igaz, ha megnyitott revíziónál a normalizált bemeneti snapshot stabil JSON-ja egyezik az aktuális `inputJson`-nal, de a mentett és élő output fenti kivonata eltér. Az összehasonlítás nem veszi figyelembe az `implementation_version`-t.
- **Input/revízió-normalizálás:** a DB `input_snapshot` revíziós normalizálója a definíció mezőiből rendezi/építi újra az inputot és az alapértékeket; a `output_snapshot` a mentett revízióból kerül összevetésre. A független recompute a DB inputból a jelenlegi kalkulátordefinícióval, `materialStateFromSnapshot`-tal, `computeConstruction`-nel és `constructionOutputSnapshot`-tel készült. A kódutasítás tehát azonos bemeneti snapshotot és jelenlegi számítási implementációt használ, de a figyelmeztetés nem hasonlít implementációverziót.
- **Figyelmeztetés reprodukálva:** a korábbi `roof.material-takeoff` revízió friss betöltésekor a figyelmeztetés megjelent. A jelen QA-ban átvitellel mentett új DEMO material-takeoff és timber-cutlist rekord mentéskor/újranyitáskor is ugyanazt a V1 output-eltérés figyelmeztetést adta. A friss oldalbetöltés nem tüntette el.
- **Önálló strukturális diff:** a valós, korábbi material-takeoff V1 DB input/output alapján újraszámítottam a `{lines,takeoff,cutList}` kivonatot és összevetettem a mentett kivonattal. Az eredmény bit-pontosan egyezett: **`DRIFT_PATHS=[]`, `mismatchCount=0`**; a mentett és újraszámított schema `construction-suite.output.v1`, összevetett kulcsok `lines`, `takeoff`, `cutList`. Ezzel összeegyeztethető a korábbi „tiszta recompute egyezik” eredmény, de **nem** magyarázza a most is reprodukált UI-figyelmeztetést.
- **Nem azonosított eltérési útvonal:** az élő React `liveOutput` objektumot nem sikerült a figyelmeztetés pillanatában rögzíteni, ezért a UI által jelzett DB-mentett és élő érték különbségének pontos útvonalai **NOT ESTABLISHED**. A DB-s független rekonstrukcióban nincs eltérő útvonal; ebből nem következtetek bizonyított okra (átmeneti állapot, referencia vagy szerializáció). Toleranciát nem változtattam, figyelmeztetést nem kapcsoltam ki.
- **Státusz:** UI figyelmeztetés **REPRODUCED**; DB snapshot → aktuális tiszta recompute strukturális eltérés **NOT REPRODUCED**; gyökérok **UNKNOWN**. Nyitott P2, elfogadást korlátoz.

## Átviteles mentés → friss újranyitás E2E

Mindkét kalkulátorba a mentett `roof.rafter-cut` forrásból, előnézet → szimmetria-jóváhagyás → megerősítés útvonalon vittem át adatot. Ez eltér a korábbi, forrásadat nélküli timber-cutlist E2E-től.

| Célkalkulátor | Mentett célrevízió | Forrás / dependency | Eredmény friss újranyitáskor |
|---|---|---|---|
| `roof.material-takeoff` | calculation `1a78b905-e80a-44fb-b701-1ad75e2171c3`, V1 revision `88726c44-c605-4fa3-b26b-ecdd3a943976` | `roof.rafter-cut` V1 `94cab050-2853-45b2-bec5-9457b363cb7e`; `field-transfer:roof.rafter-cut->roof.material-takeoff` | Bemenetek és eredmények visszatöltődtek; mentve V1-ként; output-drift figyelmeztetés látszott. |
| `roof.timber-cutlist` | calculation `ee5d703f-5c64-4179-9147-d8b776ad2866`, V1 revision `399f81a0-f6d5-4088-9004-50ca9669c468` | `roof.rafter-cut` V1 `94cab050-2853-45b2-bec5-9457b363cb7e`; `field-transfer:roof.rafter-cut->roof.timber-cutlist` | Bemenetek és vágáslista visszatöltődtek; mentve V1-ként; output-drift figyelmeztetés látszott. |

- Mindkét cél input `construction-suite.input.v1`, implementációs revízió `construction-suite.output.v1`; a kimeneti schema `construction-suite.output.v1`.
- **Read-only DB-vel ellenőrizve:** pontos forrás- és célrevízió, kalkulátorazonosítók, dependency irány és típus, V1 szám, DEMO organization, létrehozó tag és célrevíziónként egy attestáció. A forrás V1 snapshot azonos maradt. Nem végeztem revízió UPDATE/DELETE próbát.
- **A mentés/reopen E2E állapota:** mentés és friss újranyitás mindkét célon működött és az átviteli inputok megmaradtak; a reprodukált drift-figyelmeztetés miatt a mentett output bit-pontos egyezése nem fogadható el bizonyítottnak.

## P2 — kalkulátorváltás és transfer eredetjelzés

- **Ellenőrizve böngészőben:** a material-takeoffból timber-cutlistre váltás után a timber mezők üresek és a számítás hiányos volt, azonban az Adatok átvétele panel megnyitásakor a korábbi „DEMO M10.1.3 forrás … · V1” átvételi státusz megjelent.
- **Ellenőrizve forráskóddal:** `transferApplied` és `transferSource` parent szintű állapot, kalkulátorváltáskor a `selectCalculator` csak `selectedId`-t és fókusz/nézet állapotot állít; `transferApplied` törlése vagy célazonosító szerinti leképezése nem látszik. A `transferSource` mentési panel felé már célazonosítóval van guardolva, az eredetjelzés viszont nem.
- **Értékelés:** legalább P2: a felhasználó hibás célkalkulátort/mezőhalmazt láthat forrásként, és az állapot kalkulátorok között osztott. A jelen menetben nem bizonyítottam, hogy e jelzés mellett hibás geometria vagy dependency kerülne adatbázisba; nem is mentettem ilyen állapotot.

## Pontosság, undo, megerősítési előnézet

- **Ellenőrizve böngészőben:** a forrásból számított hajlás teljes `34.01934998982646°` pontossággal megmaradt a célmezőben és a számítás bemeneteiben; a formázott összefoglaló kerekítve jelenik meg. A preview teljes pontosságú értéket külön jelöl.
- **Ellenőrizve böngészőben:** tetőforma-váltáskor a szimmetria-elfogadás resetelődik; megerősítés nélkül nem történik gable geometria-átvétel.
- **Ellenőrizve böngészőben:** Undo az eredeti, átvétel előtti mezőértékeket hozza vissza; az azóta invalidált geometria nem lett automatikus, másik formára igazolt adat.
- **Nem ellenőrzött:** a teljes pontosság adatbázis-visszaolvasása az új célrevisionekből mezőnként összevetve; a korábbi mentett pontosságot és az új böngészős eredményt külön igazoltam.

## Vizuális QA

- **Ellenőrizve böngészőben:** 375×812 álló nézet, sötét és világos téma; 812×375 fekvő, sötét téma; 1440×900 desktop, sötét téma. A kalkulátorállapotot és az eredményeket hozzáférhetőségi nézetből is ellenőriztem.
- 375 px-en a kalkulátor egyoszloposra rendeződik; a hajlás mező teljes pontosságú értéke elérhető, a számítási összefoglaló kerekített. Az adatátvételi táblázat vízszintesen görgethető; a keskeny képernyőn az „Eredet” oszlop kezdetben csak részben látható, a vízszintes görgetést használni kell.
- A 812×375 nézetben a rövid viewport miatt a tartalom függőleges görgetést igényel; a desktopon kétoszlopos kalkulátor-elrendezés látszott. Ez vizuális spot check volt, nem minden kalkulátorkártya/hibaállapot teljes accessibility auditja.
- Ellenőrzés után a téma és viewport visszaállt a munkamenet korábbi (sötét/eredeti méretű) állapotára.

## Tesztek és build

- **Célzott Vitest, friss futtatás:** `rtk bypass npx vitest run src/features/calculators/construction-drafts.test.ts src/features/calculators/rafter-connection-fields.test.ts src/domain/calculations/construction/construction.test.ts` — **3 fájl, 46 teszt PASS**. Lefedi a parent `applyFieldChange` átmeneteket, per-mező invalidációt, visszaváltást, valamint a `<80°` sémahatárt. Ez nem teljes regresszió; nem írja felül a browser P1-et.
- **Isolated production build:** `npm run build` a HEAD `git archive` másolatán, saját `/private/tmp/tetopro-m1014-build.Uu9E4B` könyvtárban, a repo `node_modules` és `.env.local` read-only symlinkjeivel. Next 16.4.2 webpack build, TypeScript, 32 static pages és build trace **PASS**. A futó dev szerver checkout `.next` kimenetét nem használtam.
- Teljes Vitest, lint és külön typecheck nem futott; a build TypeScript szakasza sikeres.

## Megállapítások prioritás szerint

### P1

- **P1 — nyitott, reprodukálva:** `roof.timber-cutlist` a közvetlen célmezőből 80° és 81° hajlással is teljes, menthető kalkulációt számol; a közös `<80°` validátor nincs a cél számítási határán érvényesítve. Nem mentettem az érvénytelen próbadraftot.
- **Korábbi P1 — nem reprodukált ebben a menetben:** az egyetlen mező kézi módosításakor a másik átvett geometry mező bennragadása. Friss session után mindkét külön mezős eset sikeresen invalidálódott és az új forma nem használta a másik változatlanul átvett értéket. A javítás strukturális frame-szintű atomicitása külön instrumentálva nem lett.

### P2

- **P2 — nyitott, reprodukálva:** material-takeoff és timber-cutlist friss újranyitáskor output-drift figyelmeztetést ad; DB-ből történő független újraszámítás az összehasonlított mezőket bit-pontosan egyezőnek mutatta. A futó UI-eltérés pontos JSON-útvonala és gyökéroka nem ismert.
- **P2 — nyitott, reprodukálva:** a forrásból átvett státusz kalkulátorváltás után is átöröklődik a következő kalkulátor paneljébe. Hibás mentett dependency-t nem bizonyítottam.
- **P2 — használhatósági korlát:** mobilon az átviteli táblázat vízszintes görgetése szükséges az összes oszlophoz.

### P3 / egyéb

- Nem azonosítottam új P3 hibát a lefedett képernyő- és állapotmintákban.
- A megjelenített 80°/81°-os extrém geometria további eredményeit nem értékeltem szakmai tervezési megfelelőségként; a QA a határvalidáció hiányát bizonyítja.

## Nem igazolt / kihagyott esetek

- A futó böngésző `liveOutput` pontos JSON-jának capture-je a drift jelzés pillanatában, az eltérő kulcsútvonal, és annak gyökéroka.
- Frame-szintű render/mentés interleaving-mérés, `transferApplied` több kalkulátorra izolálásának célzott regressziója, gyors forma-klikkelés böngészős időzítése.
- `roof.material-takeoff` közvetlen mezőben végzett 80°/81° pitch-próba. A P1-et a másik célkalkulátoron bizonyítottam; a közös schema/átviteli unit-tesztek mindkettőre nem helyettesítik ezt a próbát.
- Külön fiókos jogosultság-negatív teszt, konkurens mentés, negatív immutable trigger próba, teljes tesztkészlet és lint.

## Végső elfogadás

**Döntés: FAIL. Az M10.1 nem zárható le biztonságosan.**

A M10.1.3 két korábbi P1-javítása közül a geometria mezőnkénti invalidációja a nyolc előírt böngészős esetben helyesen viselkedett; az új tulajdonosi transition tesztek is sikeresek. A lezárást azonban blokkolja az élő böngészőben reprodukált új P1: 80°/81°-kal teljes kalkuláció készül a célkalkulátorban a közös `<80°` szabály ellenére. Emellett mindkét cél újranyitásakor fennmarad a feloldatlan output-drift figyelmeztetés és kalkulátorváltáskor hibás eredetjelzés látható. A build, célzott tesztek, DEMO mentések és DB attestációk nem ellensúlyozzák ezeket az adatérvényességi/eredetbizalmi hibákat.

**Biztonságos újraértékeléshez szükséges bizonyíték:** célkalkulációs útvonalon 80° és 80° felett az elutasítás, drift UI-összehasonlítás strukturális feloldása vagy bizonyítható egyezése, továbbá calculator switch utáni transfer státusz izolálása; ezután a kapcsolódó böngészős regresszió és átviteles mentés–újranyitás újrafuttatása.

**Változások:** ez a riport az egyetlen szándékos repo fájlváltozás. Alkalmazáskód, DB-séma, migráció és jogosultság nem változott; nincs commit, push vagy deploy.  
**Javasolt későbbi Conventional Commit:** `fix(M10.1.4): enforce roof pitch bounds in construction calculators`
