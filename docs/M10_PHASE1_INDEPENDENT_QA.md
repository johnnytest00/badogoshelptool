# M10.1 — független geometriai, UI-állapotkezelési és mentési QA

**Dátum:** 2026-10-26  
**Mód:** független, audit-only; alkalmazáskódhoz, tesztekhez és adatbázishoz nem nyúltam.  
**Végső minősítés: FAIL.** Két P1 állapotkezelési/validációs hiba bizonyítható kódszinten. A teljes mentés–friss újranyitás és a viewport/téma QA nem ellenőrizhető a jelenlegi, kijelentkezett helyi munkamenetben.

## 1. Vezetői összefoglaló

- A gable geometriai képlet a megadott tartományon belül matematikailag helyes: a forrás vízszintes fél fesztávja és a HAP-pal csökkentett emelkedés ugyanazt a gable félmetszetet adja, mint a cél `widthMm` és `pitchDegrees` mezői.
- **P1 — forma-váltás után bent marad és számít a gable-ből átvett geometria.** Gable célra megerősített átvétel után a `widthMm` és `pitchDegrees` a közös draftban marad. Hip vagy shed alakra váltva a célkalkulátor ezeket az értékeket már az új forma geometriájaként használja, holott közvetlen átvitelkor a helper helyesen tiltja a geometria átvitelét nem-gable célformára.
- **P1 — a helper 80–90° közötti, cél által elutasított hajlást is átvehetőnek jelöl.** A cél tetőgeometria validátora 80° alatti hajlást vár, a helper viszont csak 90°-nál húz határt. Ilyenkor a preview és a confirm adatot ír, a kalkulátor pedig hibás állapotú lesz.
- **P2 — a preview 0,001°-ra kerekít, a confirm teljes pontosságot ír.** Például a preview `34.019°`, miközben a draft `34.01934998982646` értéket kap. A belső számítás/mentés pontossága megfelelőnek látszik, de a megjelenített érték nem a pontosan megerősített adat.
- A szimmetria-jóváhagyás alapból hamis, a preview és a cancel önmagában nem ír draftot, a confirm és a preview ugyanazt a tiszta mezőleképezést/hívható konverziót használja. A visszavonás csak az átvett kulcsokat állítja vissza és törli a függőben lévő forráskapcsolatot; a többi draftmezőt megőrzi.
- Mentési útvonalon szerveroldali újraszámítás, actor/szervezeti ellenőrzés és forrás-revízió argumentum látható. A tényleges adatbázis-művelet, immutable revízió/dependency, attestáció és friss navigációs újranyitás **NOT VERIFIED**.

## 2. Vizsgált commit és munkafa

- HEAD: `c1759f447d9451a3acbdaf4421663767870b13c7`.
- A vizsgálat kezdetén a `git status --short` üres volt. A jelentésen kívüli munkafájl-változtatás nincs.
- A vizsgálat az M10.1 tervre, implementációs leírásra, Fázis 0 UX/regressziós jelentésre, aktuális domain/UI/mentési kódra és a kapcsolódó tesztekre korlátozódott.

## 3. Geometriai konverzió és független számpéldák

A forrás kalkulátor leírása a fél fesztávot a talpszelemen külső síkjától a gerinctengelyig, a gerincemelkedést pedig a talpszelemen felső síkjától méri (`src/features/calculators/roof-calculator-definitions.ts`, `roof.rafter-cut` definíció). A HAP a talpszelemen fölötti függőleges eltolás. A forrás tényleges szarufa-hajlása `atan2(rise − HAP, halfSpan)` (`src/domain/calculations/construction/roofs.ts:27-38`).

Szimmetrikus nyeregtetőn a cél fél szélessége `width/2`; ezért `width = 2 × halfSpan`, a cél `roofPitchDegrees` pedig ugyanaz a hajlás. A gable motor a megadott szögből `halfSpan × tan(pitch)` emelkedést számol vissza (`src/domain/calculations/gable-roof.ts:77-88`). Az alábbi számokat a képletek közvetlen, külön aritmetikájával számoltam, nem az átviteli helperből:

| Fél fesztáv | Emelkedés | HAP | Effektív emelkedés | Elvárt szélesség | Elvárt hajlás | Célból visszaszámolt emelkedés |
|---:|---:|---:|---:|---:|---:|---:|
| 4000 mm | 2800 mm | 100 mm | 2700 mm | 8000 mm | 34,01934998982646° | 2700 mm |
| 3000 mm | 1500 mm | 0 mm | 1500 mm | 6000 mm | 26,56505117707799° | 1500 mm |
| 5000 mm | 3200 mm | 200 mm | 3000 mm | 10000 mm | 30,96375653207352° | 3000 mm |

**Referenciák és egyezés:** az ereszkiülés célmezője a forrás `eaveProjectionMm` értékét `eaveOverhangMm`-ként kapja (`src/features/calculators/rafter-connection-fields.ts:31-35`). A forrás és a gable cél képlete az ereszt vízszintes távolságként, a fal/talpszelemen külső síkjától méri; az érték nem kerül a gerincemelkedésbe. A HAP csökkenti a szarufa felső élének tényleges emelkedését, nem a fesztávot.

**Karmi-paritás:** forrás- és célútvonalon is a `calculateRafterJoints` közös domainfüggvény számolja a csatlakozási értékeket. A cél a gable sík hajlásából visszaállítja az emelkedést és ugyanazokkal a HAP/half-span értékekkel hívja a függvényt (`src/domain/calculations/construction/plane-birdsmouth.ts:100-143`). Ez azonos képletű, kódszintű paritást mutat, ha a célban ugyanaz a szarufa-keresztmetszet és azonos csatlakozási bemenet áll rendelkezésre. **A két kalkulátort párhuzamosan futtató numerikus Karmi-integrációs tesztet vagy böngészős összehasonlítást nem végeztem**, ezért a tényleges mező- és eredménysor-paritás NOT VERIFIED.

A mezőértékek milliméterben maradnak; a cél UI cm-es beviteli összegzését a meglévő `LengthField` kezeli, a hajlásnál nincs mértékegység-konverzió. A helper egész mm szélességet és 100000 mm-es felső határt kér, összhangban a cél tetődimenzió-sémával.

## 4. Forrás/cél fizikai referenciák

- Fél fesztáv: a talpszelemen külső függővágási síkjától a gerinctengelyig.
- Gerincemelkedés: a talpszelemen felső síkjától a szarufa felső éléig a gerincnél.
- HAP: a szarufa felső élének magassága a talpszelemen fölött; ezért az effektív emelkedés `rise − HAP`.
- Szimmetria: a jóváhagyás csak a két egyenlő vízszintes fél fesztáv feltételezését engedi meg, nem módosítja a forrást.
- Ereszkiülés: vízszintes vetület, amely mindkét számításban a fél fesztávon túl nyúlik.
- Számított hajlás: a forrás `calculateRafterGeometry` és a cél gable motor azonos `atan2`-eredményt ad a fenti bemenetekre.

## 5. Határesetek és nem támogatott formák

A helper forráskódja (`src/domain/calculations/construction/roofs.ts:53-63`) elutasít hiányzó HAP-ot, negatív/nem véges/0 fél fesztávot vagy emelkedést, negatív/nem véges HAP-ot, HAP ≥ emelkedést, nem egész vagy 0/túl nagy szélességet, valamint 0°/90°-os hajlást. A forrás kalkulátor saját Zod-sémája a hosszakat véges, pozitív és legfeljebb 1 000 000 mm-es értékekre korlátozza. A cél általános geometriai mezővalidálása aktív mezőnél fut; a gable számítás szerveroldalon is újra lefut.

### Bizonyított P1: a cél hajlásszög-tartományán túli átvétel

- A közös cél `roofGeometryInputSchema` `pitchDegrees` validátora **80° alatti** pozitív értéket enged (`src/domain/calculations/roof-geometry.ts:3-8`).
- Az átviteli helper csak `pitchDegrees >= 90` esetén utasít el (`src/domain/calculations/construction/roofs.ts:60-63`).
- Reprodukció: fél fesztáv `1000 mm`, emelkedés `6000 mm`, HAP `0 mm` → helpereredmény 2000 mm és `80,537677…°`, `ok: true`; target calculator rejects it. Preview után confirm beírja a szélességet és a hajlást, a számítás hibás/menthetetlen állapotba kerül.
- Hatás: a felhasználó átvehetőnek mutatott, de a cél szerződésével érvénytelen geometriai adatot kap. Ez P1 a feladat explicit célvalidációs követelménye szerint.
- Minimális javaslat: az átviteli helper a tényleges célhajlás-határt is alkalmazza, és sikertelenségkor a geometriai sorokat ne engedje átvenni. Vegyen fel határközeli regressziós esetet 80° alatt/80°-on/fölött.

A HAP=0 és a három megadott példa a cél tartományán belül érvényes. Hiányzó régi HAP nem válik automatikusan nullává; explicit `MISSING_HAP` lesz. Az extrém, de a helper által elfogadott 80° feletti határeset viszont nincs lefedve a meglévő tesztben.

### Nem támogatott célformák

A tiszta mezőleképezés `widthMm`/`pitchDegrees` értéket kizárólag `roofShape === "gable"` és explicit jóváhagyás mellett ad vissza (`src/features/calculators/rafter-connection-fields.ts:49-54`). Shed, hip, pyramid, halfHip, lShape, tShape és mansard közvetlen átvételi confirm nem adja hozzá e két mezőt. A már korábban közös Karmi/eresz mezőinek formánkénti szakmai értelmezését itt csak kódszinten vizsgáltam; az összes forma végrehajtott QA-ja NOT VERIFIED.

## 6. Preview, megerősítés, visszavonás és draft

- Checkbox induló értéke `false`; `useEffect` tetőforma- vagy forrásrevízió-váltáskor visszaállítja (`construction-field-transfer-control.tsx:51-55`).
- Preview a `currentFields` propból készíti a diffet; Cancel csak a preview állapotot zárja.
- Preview és confirm ugyanazt a `rafterCutTransferFields(source, roofShape, symmetryConfirmed)` leképezést használja. Confirm forrásazonosítót is beállít.
- A parent `mergeCalculatorDraft`-ot használ, így nem érintett draftmezők megmaradnak (`construction-suite.tsx:495-500`).
- Undo a confirm előtti, átvitt kulcsokhoz tartozó snapshotot állítja vissza és `null` forrást küld; csak akkor elérhető, ha az átvett kulcsokat nem írta át a felhasználó (`construction-field-transfer-control.tsx:69-82`). Más draftmezők későbbi változtatását ez a kulcsszintű merge nem írja felül.
- A preview és confirm ugyanazon forrás objektumot, tetőforma propot és jóváhagyás state-et olvassa. A megerősített értékek a parent draftba React state-en keresztül kerülnek.

### P1: a megerősített gable-geometria más tetőforma számításába szivárog

- Reprodukció: gable célon jóváhagyni és megerősíteni a 4000/2800/100 mm forrást → a draft `widthMm=8000`, `pitchDegrees=34.01934998982646`; utána váltani `hip` vagy `shed` formára.
- A megerősítés a draftba merge-öli a mezőket, de forma-váltáskor csak a szimmetria-checkbox state resetelődik. A `widthMm`/`pitchDegrees` törlése vagy érvénytelenítése nem történik (`construction-suite.tsx:495-496`; `construction-field-transfer-control.tsx:54-55`).
- A `roofGeometryInputFromFields` hip és shed ága is felhasználja ezeket a kulcsokat, ezért a gable-ből származó értékek az új forma számítását ténylegesen meghatározzák (`src/domain/calculations/roof-calculation-snapshot.ts:9-19`). Például megfelelő tetőhossznál a hip-séma mindkét mezőt érvényesnek fogadhatja, de a szimmetrikus gable-ből származó szélesség/pitch nem bizonyított hip bemenet.
- Hatás: bár a közvetlen hip/shed transfer tiltott, a már megerősített adat rejtett eredetű, átvehető geometria marad a draftban, majd más forma érvényes geometriájaként számítódik/menthető. Ez megsérti a formafüggő geometria bizonyítási követelményét.
- Minimális javaslat: forma-váltáskor a transferből eredő és azóta kézzel nem módosított `widthMm`/`pitchDegrees` értéket érvénytelenítse vagy kérjen explicit döntést; ne töröljön felhasználói kézi módosítást. Tegyen célzott draft/UI regressziót a confirm → hip/shed → számítás/mentés és undo útvonalra.

A preview önmagában nem módosít draftot, és a szimmetria-jóváhagyás a forma-váltás utáni új confirmra nem marad érvényes. A teljes komponensgyors-kattintásos és forrásváltási interakciót automatizált/böngészős teszt nélkül nem tekintem igazoltnak.

## 7. Tetőforma-váltási mátrix — kódszintű megállapítás

| Állapot | Megállapítás |
|---|---|
| Preview előtt: gable→hip, hip→gable, gable→shed | Célforma prop aktuális; preview geometriai sorok csak gable-nél jelennek meg. Élő UI-próba nem történt. |
| Preview nyitva: gable jóváhagyás nélkül→más forma | A geometriai sorok nem-gable-nél eltűnnek; jóváhagyás effecttel resetelődik. |
| Preview nyitva: jóváhagyott gable→hip→gable | Geometriai sorok eltűnnek hip alatt; gable-re visszatérve az effect reseteli a jóváhagyást. Állapotfolyamot nem reprodukáltam böngészőben. |
| Confirm után: gable→hip/shed | **P1:** a draftolt width/pitch megmarad és a hip/shed kalkulátor felhasználja. |
| Confirm után: gable→hip→gable | Draftértékek megmaradnak; az eredetjelzés/visszavonás komponens-state-je is megmarad. |
| Kézi mezőátírás confirm után | Az átvett mezők eltérése elrejti az Undo-t; más, nem átvitt mező módosítása önmagában nem tiltja az Undo-t. Kód alapján; élőben NOT VERIFIED. |
| Undo formaváltás után | Undo snapshotja csak korábban átvitt kulcsokat állít vissza, forráskapcsolatot törli. Forma-váltott célon használhatósága nem igazolt. |

A `widthMm` több célformában látható, a `pitchDegrees` pedig gable/shed/hip stb. mező; a mansardnál a pitch nem aktív, a width igen. A draft teljes formáját a formaváltás nem cseréli le. A rejtett Karmi-mezők egy része formafüggő `visibleWhen`/`shapes` feltételek mögött van; a snapshotban rejtett mezők maradhatnak, bár a számítás csak az adott forma bemenetét építi fel.

## 8. Mentés, újranyitás és revíziós integritás

**Kódszinten megfigyelt:** a mentési Action validálja a bemenetet, ellenőrzi a felhasználó szervezeti tagságát, a kalkulátor/mezőkulcsokat és a forrás-revízió csak a két támogatott célhoz adható meg; ezután a szerveren újrahívja a `computeConstruction`-t, és az újraszámított kimenetet adja a writernek (`src/features/calculations/construction-actions.ts:18-68`). A writer ugyanazon RPC-nek küldi a `sourceCalculationRevisionId`-t (`src/infrastructure/supabase/construction-calculation-writer.ts:4-24`). A forráslista RLS-es, szervezet- és létrehozó-szűrt lekérdezést használ, és az aktuális immutable forrásrevízió snapshotjából olvas (`src/features/calculations/construction-data.ts`, `listRafterCutTransferSources`). Ez architekturális bizonyíték, nem futó DB-bizonyíték.

**NOT VERIFIED / blokkolt:** a Brave helyi `localhost:3000` oldala bejelentkezési képernyőn áll, és sikertelen belépési állapotot mutat. Nem használtam és nem módosítottam hitelesítő adatot. Nem volt bizonyítottan hozzáférhető, engedélyezett DEMO munkamenet, ezért nem hoztam létre tesztadatot és nem végeztem DB-írást. Nem futott végig a kért forrásmentés → célmentés → friss navigációs újranyitás, sem DB read-only ellenőrzés az immutable source revision/dependency/attestation/revíziószámra; a forrás változatlansága és a későbbi V2 melletti célváltozatlanság szintén NOT VERIFIED. A `roof.timber-cutlist` teljes geometriai átadási/mentési folyamata sem futott le.

## 9. Mobil, tájkép, desktop és témák

Nem történt böngészős QA egyik kért nézeten sem: 375×812, 812×375 vagy 1440×900; sem világos, sem sötét témában. A bejelentkezési képernyő nem tartalmazza az átvételi vezérlőt, így a checkbox, táblázatgörgetés, érintési célok, megerősítő/visszavonó gombok és eredményrajz olvashatósága **NOT VERIFIED**. A korábbi M10.1 implementációs jelentés 375×812 mobil nézetről és default témáról állít ellenőrzést, de ez az önálló audithoz nem szolgált friss, itt megismételt bizonyítékként.

## 10. Ténylegesen futtatott ellenőrzések

- `npx vitest run src/domain/calculations/construction/construction.test.ts src/features/calculators/rafter-connection-fields.test.ts src/features/calculators/construction-drafts.test.ts src/features/calculations/construction-data.test.ts src/features/calculations/construction-actions.test.ts src/features/calculations/standalone-persistence.test.ts` — **6 fájl, 48 teszt PASS, 0 FAIL**. A JSON riport összesítése: 18 suite, 48 teszt. Ez a forráskonverzió, mezőleképezés, draft utilitások, Action és persistence unit lefedése; nem UI komponens E2E és nem adatbázis-integráció.
- A fenti számpéldák független aritmetikája (`atan2`, `tan`) közvetlenül futtatva.
- `git diff --check` — **PASS**, nincs whitespace-hiba.
- Nem futott teljes Vitest, lint, typecheck/build, pgTAP, DB-teszt vagy böngészős E2E; az audit során nem találtam okot a teljes regresszió vagy build futtatására.

A meglévő domain unit teszt lefedi a három normál példát, HAP-hiányt, HAP≥rise, negatív HAP-ot, 0/negatív fél fesztávot, nem numerikus fél fesztávot és túl nagy szélességet. Nem fedi a cél 80°-os pitch határát, a 80° feletti, de helper által engedett tartományt, NaN/Infinity szöveges variánsait, tört fél fesztávot, vagy UI preview/confirm/forma-váltás/Undo komponensállapotot.

## 11. Bizonyított hibák és prioritás

1. **P1 — cél által elutasított pitch átvehetőnek látszik.** Részletek és reprodukció: §5. A helper határa 90°, a célé 80°.
2. **P1 — confirm után a forma-váltás más tetőforma számításába viszi a gable-ből származó draftgeometriát.** Részletek és reprodukció: §6. A forma-váltás csak az approval state-et reseteli, a mezőket nem.
3. **P2 — a preview kerekített, confirm teljes pontosságú hajlást állít be.** `construction-field-transfer-control.tsx:93` a preview megjelenített értékét 0,001°-ra kerekíti, de `rafterCutTransferFields` teljes `Number` pontosságú szöveget ad vissza, amit confirm `:69-74` ír draftba. Példa: `34.019°` látható, `34.01934998982646°` kerül be. Nincs bizonyíték blur-kori kerekítésre: a mező numerikus, `step="any"`, a draft nyers stringet tart meg. Minimális javaslat: a previewban a teljes átadott értéket mutassa (lokalizált formázással), vagy ugyanazt a kerekített értéket adja át és azzal számoljon újra; az elfogadott teljes pontosság megtartása mellett az első a legkisebb viselkedésváltozás.
4. **P0:** nem találtam bizonyított P0 hibát. Az audit nem jogosultság- vagy DB-penetrációs vizsgálat.

## 12. Nem ellenőrzött esetek

- Minden élő komponensinterakció és a teljes forma-váltási mátrix böngészőben.
- Mentés–friss navigáció–újranyitás, immutability, dependency és attestation DB-szinten.
- Timber-cutlist cél teljes átvételi E2E.
- 812×375 és 1440×900; világos/sötét téma.
- Tényleges forrás/cél Karmi-eredmény numerikus egymás melletti összehasonlítása.
- M10 Fázis 0 teljes regresszió, teljes tesztkészlet és DB/pgTAP.

## 13. Minimális javítási javaslatok

1. Az átviteli helperben a cél pitch felső korlátját a cél validátorral egyeztesse (`<80°`), és az elutasítást previewban is egyértelműen mutassa; addig ne tegye be a geometriai mezőket a confirm mezőhalmazába.
2. A gable-ből származó, nem kézzel módosított geometriai értékek forma-váltáskor ne maradhassanak észrevétlenül más forma számításában. A módosítás legyen provenance-aware, hogy a későbbi kézi értéket ne törölje.
3. A preview megjelenítése és a confirm által átadott pitch legyen azonos pontosságú/értékű.
4. Célzott React tesztben ellenőrizze: checkbox alapállapot, preview/cancel draft-immutabilitás, confirm és undo, forrásváltás, forma-váltás preview előtt/közben/confirm után, valamint a previewban mutatott pitch és a confirm mezőértéke.
5. A javítás után, hozzáférhető izolált DEMO környezetben végezze el a kért mentés–friss navigációs újranyitás és read-only dependency/revízió ellenőrzést, majd a 3 viewport × két téma mátrixból legalább a megadott nézeteket.

## 14. Végső elfogadási döntés

**Döntés: FAIL — az M10.1 jelen állapotban nem zárható le.** Két bizonyított P1 miatt a kritikus formahatár- és célvalidációs elfogadási feltétel nem teljesül; emellett a mentés–friss újranyitás, revíziós/dependency integritás és a teljes UI-mátrix ezen a munkameneten blokkolt/NOT VERIFIED. A geometriaképlet a három megadott, célon belüli példára helyes.

1. **Helyes-e a geometriai konverzió?** Igen, a szimmetrikus gable matematikai képlete és a fizikai referenciák egyeznek az érvényes cél-tartományban.
2. **Hagyhat-e hibás adatot más forma célkalkulátorában?** Igen. Confirm után hip/shed formára váltva a gable-ből átvitt width/pitch megmarad és számítódik.
3. **Biztonságos-e approval és confirm?** Alapállapot, közös preview/confirm leképezés és cancel/undo kódszinten megfelelő; a más formára váltás utáni draft-szennyezés P1, élő komponens-flow nincs bizonyítva.
4. **Helyes-e teljes pontosság és megjelenítés?** A draft/mentési bemenet teljes pontosságú; a preview 0,001°-ra kerekít, tehát nem ugyanazt az értéket mutatja.
5. **Működik-e mentés és friss újranyitás?** A jelen auditban NOT VERIFIED.
6. **Megmarad-e forrásrevízió és dependency?** A forrás UUID végighalad az Action/writer útvonalon; DB-ben nem ellenőrzött, ezért NOT VERIFIED.
7. **Bizonyított P0/P1?** P0 nem talált; két P1 bizonyított, lásd §5 és §6.
8. **P2/P3 javaslat?** A preview/confirm pontossági eltérése P2; más vizuális P2/P3 megállapítást nem lehetett tenni bejelentkezett UI nélkül.
9. **Lezárható-e M10.1?** Nem, jelenleg FAIL.
10. **Következő mérföldkő:** M10.1.1 célzott regressziós és draftállapot-javítás/QA a két P1-re és a preview pontosságra; utána a blokkolt mentés–újranyitás és DB read-only ellenőrzés. Fázis 2 implementációt nem kezdeményeztem.

**Javasolt Conventional Commit a jelentéshez:** `docs(M10.1.1): add independent geometry and state QA report`
