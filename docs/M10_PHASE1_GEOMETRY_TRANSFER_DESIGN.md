# M10 Fázis 1 — tetőgeometriai adatátadás szakmai és technikai terve

**Állapot:** design-only, read-only felmérés alapján; implementáció és futtatott teszt nem történt.

**Hatókör:** mentett roof.rafter-cut revízióból roof.material-takeoff és roof.timber-cutlist célokba történő, explicit geometriai mezőátvétel.

## 1. Vezetői összefoglaló

A roof.rafter-cut egyetlen, gerincig futó szarufametszetet ír le; nem tárol tetőformát, teljes tetőhosszt, ellenoldali szarufát vagy összetett tetőrészleteket. Emiatt egyik cél teljes tetőgeometriája sem állítható elő önmagában a forrásból.

Az első biztonságosan megvalósítható bővítés a már létező, mentett revíziót használó, előnézetes adatátvétel kiterjesztése: kizárólag akkor, ha a felhasználó gable célt választott, a forrásmérések érvényesek és elfogadja a szimmetrikus nyeregtető-feltevést, számítsa ki a cél widthMm = 2 × horizontalHalfSpanMm és pitchDegrees = atan2(riseMm − seatCutHeightMm, horizontalHalfSpanMm) értékeit. Az eaveProjectionMm → eaveOverhangMm már implementált, közvetlen másolása megmarad. A tetőhosszt és a gable homlokzati kiüléseit a felhasználó adja meg; ezeket nem szabad becsülni.

 Shed esetén az ereszkiülés mezője átvehető, ha a cél alacsony ereszvége ugyanazt a forrásbeli talpszelemen-referenciát jelenti. A fél fesztáv nem képezhető át automatikusan a widthMm-re: a forrás gerinctengelyt, a shed cél egyetlen lejtős sík két végét modellezi. A többi forma legfeljebb feltételes, részleges adatátadást kaphat későbbi, formánkénti bizonyítás után; teljes geometria egyiknél sem következik az egy metszetből.

Nincs szükség új geometriamotora vagy adatbázis-sémamódosításra az MVP mezőkitöltéséhez. A meglévő dependency rögzíti a forrásrevíziót, a cél immutable snapshotja a végül elmentett mezőket. Ez a kettő nem tárolja a mezőnkénti konverziót és a későbbi kézi felülírást; tartós, mezőszintű provenance igény esetén külön snapshot/provenance-döntés szükséges.

## 2. A jelenlegi implementáció és a kész ereszkiülés-leképezés

- A roof.rafter-cut inputjai és mértékegységei a [roof-calculator-definitions.ts](../src/features/calculators/roof-calculator-definitions.ts) definitions["roof.rafter-cut"] mezőlistájában vannak. A horizontalHalfSpanMm, riseMm, eaveProjectionMm, seatCutHeightMm mind mm; az ereszkiülés és a HAP kezdeti értéke 0.
- A [roofs.ts](../src/domain/calculations/construction/roofs.ts) rafterGeometryInputSchema hosszakra pozitív, véges, legfeljebb 100 000 mm értéket vár; az ereszkiülés és HAP nemnegatív, legfeljebb 100 000 mm. A HAP kisebb kell legyen a riseMm-nél. A hiányzó HAP-et a számítás 0-ként kezeli.
- A célkalkulátorok tényleges mezőregisztere szintén a [roof-calculator-definitions.ts](../src/features/calculators/roof-calculator-definitions.ts) roofShapeFields listája. A támogatott roofShape értékek: gable, shed, hip, pyramid, halfHip, lShape, tShape, mansard. A lengthMm, widthMm, pitchDegrees jelenléte formafüggő; a manzárd külön futás/emelkedés adatokat használ.
- Az ereszkiülés közvetlen leképezése [rafter-connection-fields.ts](../src/features/calculators/rafter-connection-fields.ts) RAFTER_JOINT_TRANSFER_FIELD_MAP táblájában már eaveProjectionMm → eaveOverhangMm. Ezt a [roofs.ts](../src/domain/calculations/construction/roofs.ts) horizontalHalfSpanMm + eaveProjectionMm és a [gable-roof.ts](../src/domain/calculations/gable-roof.ts) buildingWidthMm / 2 + eaveOverhangMm képlete, valamint az ereszkiülés vízszintes definíciója támasztja alá. A célmező csak gable/shed formán aktív; más célformában rejtett, fel nem használt érték maradhat a draftban, ezért az új átviteli UI-nál forma szerint kell szűrni.
- A kétlépéses UI a [construction-field-transfer-control.tsx](../src/features/calculators/construction-field-transfer-control.tsx), forráslista/revízió-lekérdezés a [construction-data.ts](../src/features/calculations/construction-data.ts) listRafterCutTransferSources, mentés és szerveroldali újraszámítás a [construction-actions.ts](../src/features/calculations/construction-actions.ts). A cél a [construction-suite.tsx](../src/features/calculators/construction-suite.tsx) draftjába kerül, majd a meglévő mentési útvonalon halad.

## 3. A három kalkulátor geometriai bemeneti szerződése

| Kalkulátor és mező | Mértékegység, fizikai jelentés és referencia | Kötelező/forma | Hatás |
|---|---|---|---|
| roof.rafter-cut: horizontalHalfSpanMm | mm; vízszintes táv a talpszelemen külső síkjától (Karmi függővágása) a gerinctengelyig. | Kötelező, pozitív, max. 100 000. | Testhossz, hajlás, függővágási szög alapfutása. |
| roof.rafter-cut: riseMm | mm; függőleges táv a talpszelemen felső síkjától a szarufa felső éléig a gerincnél. | Kötelező, pozitív, max. 100 000. | HAP-pal együtt effektív emelkedés; hossz és hajlás. |
| roof.rafter-cut: seatCutHeightMm (HAP) | mm; szarufa felső élének magassága a talpszelemen felett, a külső függővágási síkban. | Domain sémában opcionális, UI-alapértéke 0; nemnegatív és kisebb riseMm-nél. | Levonódik az effektív emelkedésből; a Karmi-csomópont geometriájába is bemegy. |
| roof.rafter-cut: eaveProjectionMm | mm; vízszintes túlnyúlás a fal/talpszelemen külső függővágási referenciájától az eresz széléig. | 0 vagy pozitív, max. 100 000; UI-alapérték 0. | Vízszintes és lejtős ereszhossz; nem változtatja a hajlás alapfutását. |
| roof.material-takeoff: roofShape, lengthMm/widthMm vagy sideMm, pitchDegrees | A [roof-geometry.ts](../src/domain/calculations/roof-geometry.ts) normalizált geometriájába kerül. Gable külön buildingLengthMm/buildingWidthMm bemenetet használ; más formáknál többnyire lengthMm/widthMm; shed szélessége a teljes egyoldali lejtős futás. | Forma szerinti méretek pozitív egész mm, max. 100 000; nem-gable pitch pozitív és <80°, gable input <90°. További formafüggő ellenőrzések vannak. | Tetősíkok, élek, területek, anyagkimutatás, opcionális Karmi. |
| roof.timber-cutlist: ugyanazok + faanyag/kiosztás | Azonos roof geometry input, faanyag specifikációval és kiosztással. | Fenti feltételek és vágáslistához szükséges kiosztás. | Szarufa- és lécszegmensek, mennyiségek és vágáslista. |

A cél pitchDegrees a tetősík meredekségét adja, nem közvetlenül a forrás riseMm-et. A cél roof geometry nem kér HAP-et a tetősík előállításához; a HAP a cél csatlakozási/Karmi mezőiben szerepel. A rafterDepthMm és plateWidthMm forrásmezőknek nincs megfelelő általános tetőgeometriai célmezője; utóbbi Karmi-ellenőrző mezőként létezik.

## 4. Mérési referenciák és matematikai konverziók

### 4.1 HAP és tetőhajlás

A [roofs.ts](../src/domain/calculations/construction/roofs.ts) pontos képlete:

    effectiveRiseMm = riseMm − (seatCutHeightMm ?? 0)
    pitchRadians = atan2(effectiveRiseMm, horizontalHalfSpanMm)
    pitchDegrees = pitchRadians × 180 / π

Ez a szarufa felső élének esését adja a falnál mért HAP-ponttól a gerincig. A cél roof plane faloldali pontja a cél koordinátarendszer Z=0 referenciasíkja; ezért az átadott hajlás a lejtős sík meredekségét őrzi meg, nem az abszolút gerincmagasságot a talpszelemen felső síkja fölött. A cél Karmi számára a HAP külön, azonos mm értékként vehető át. HAP nélkül a production helper jelenleg 0-val számol, de az adatátviteli szerződésben hiányzó snapshot mező csak akkor tekinthető 0-nak, ha a mentett forrás verziója és mező-alapérték szerződése ezt bizonyítja; különben a konverzió MISSING_HAP hibával álljon meg.

### 4.2 Szélesség és fél fesztáv

- Gable: a [gable-roof.ts](../src/domain/calculations/gable-roof.ts) halfSpanMm = buildingWidthMm / 2 képlete bizonyítja a widthMm = 2 × horizontalHalfSpanMm összefüggést a szimmetrikus nyeregtető célmodellben. A forrás egyetlen oldalt ír le; az ellenoldali szimmetriát maga nem bizonyítja. Csak felhasználó által választott gable célalak és kifejezett szimmetria-jóváhagyás mellett vihető át.
- Shed: a [roof-geometry.ts](../src/domain/calculations/roof-geometry.ts) shed felülete y=0…widthMm között fut; ez egyetlen teljes lejtős szakasz. A forrásmező gerinctengelyig mért fél fesztáv, nem shed felső élként azonosított végpont. Nincs kódbeli bizonyíték, hogy horizontalHalfSpanMm = shed widthMm; a nyeregtető kétszerezése sem alkalmazható. Automatikus width/pitch átadás tilos, amíg a mérési végpontok azonosságát nem rögzítik.
- Hip, halfHip, lShape, tShape: szimmetrikus keresztmetszetnél a főtető fél szélessége a fő gerincig érhet, de a forrás nem rögzíti, hogy a kiválasztott szarufa a főtető oldaláról származik-e, és nem hordozza a hosszt, konty-/szárnygeometriát vagy félkonty ereszmagasságát. Width csak azonosított síkhoz kötött feltételes mező lehet, teljes modell nem.
- Pyramid: a cél négyzet oldala és középső csúcsa más topológia, mint a forrás gerinctengelye; sem sideMm = 2 × halfspan, sem azonos sík nem bizonyított.
- Mansard: két külön meredekség és töréspont szükséges (lowerRunMm, lowerRiseMm, upperRiseMm). Egyetlen forrás-szarufaszakasz ezekből egyiket sem azonosítja; pitchDegrees-re sem lapítható veszteség nélkül.

### 4.3 Független számpéldák

Az értékek a fenti képletből, külön trigonometrikus számolással adódnak; a kijelzési kerekítés nem visszatáplálandó bemenet.

| Fél fesztáv | Gerincemelkedés | HAP | Effektív emelkedés | Cél hajlás | Gable widthMm | Ellenőrzés |
|---:|---:|---:|---:|---:|---:|---|
| 4000 mm | 2800 mm | 100 mm | 2700 mm | atan(2700/4000) = **34,019°** | 8000 mm | 4000 × tan(34,019°) ≈ 2700 mm. |
| 3000 mm | 1500 mm | 0 mm | 1500 mm | atan(1500/3000) = **26,565°** | 6000 mm | Azonos, nulla HAP eset. |
| 5000 mm | 3200 mm | 200 mm | 3000 mm | atan(3000/5000) = **30,964°** | 10 000 mm | 5000 × tan(30,964°) ≈ 3000 mm. |

Az első eset HAP nélküli, hibás konverziója atan(2800/4000) ≈ **34,992°**, ami nem egyezik a forrás hajlásával.

### 4.4 Pontosság, határérték, hiba

- A helper belső értéke teljes JavaScript number pontosságú fok/mm legyen; a fok↔radián váltás a π/180 és 180/π képlettel történjen. Számított pitchDegrees legyen a célérték, ne kerekített UI-string.
- Előnézeten legfeljebb 3 tizedes fokot jelenítsen meg; a cél inputba a belső szám kerüljön megfelelő decimal stringként. A célmező és szerveroldali újraszámítás legyen a kanonikus eredmény.
- horizontalHalfSpanMm <= 0 vagy riseMm <= 0, negatív/nem véges bemenet: INVALID_SOURCE_GEOMETRY; HAP < 0 vagy HAP >= riseMm: INVALID_HAP; hiányzó/érvénytelen HAP: MISSING_HAP/INVALID_HAP; widthMm > 100 000 vagy célforma pitch-határának túllépése: TARGET_RANGE. A cél max. 100 000 mm-es egész bemenete miatt 50 000 mm-nél nagyobb félfesztáv kétszerezése nem vihető át.
- atan2 tartománya elérheti a cél által engedett szögtartományon kívüli értéket. A cél validator határa mérvadó; ne csonkoljon, ne kerekítsen valid tartományba.
- Oda-vissza teszt-tűrés javaslat: abs(recoveredRise − effectiveRise) ≤ 0,01 mm, abs(recoveredPitch − sourcePitch) ≤ 0,000001°. Ez nem helyettesíti a formakompatibilitás és schema ellenőrzését.

## 5. Tetőforma-kompatibilitási mátrix

„Teljes geometria” azt jelenti, hogy a cél összes kötelező alakparamétere rendelkezésre áll, és a forrás az egész modellt egyértelműen meghatározza. Egyetlen jelenlegi rafter-cut snapshot sem felel meg ennek.

| roofShape | Teljes geometria átvitele | Részleges adatátadás | Döntés, feltétel és hiányzó forrásadat |
|---|---|---|---|
| gable | **PARTIAL** | **SAFE WITH CONDITIONS**: widthMm=2×halfspan, HAP-pal számított pitchDegrees, eaveOverhangMm. | A cél szimmetrikus, a forrás egy oldalt mér; a felhasználó választott gable alakja és szimmetria-jóváhagyása kell. Hiányzik buildingLengthMm, frontGableOverhangMm és rearGableOverhangMm. |
| shed | **PARTIAL** | **PARTIAL**: ereszkiülés másolható, ha a forrás talpszelemen-vége a cél alacsony ereszével egyezik. | widthMm a teljes egyoldali lejtőfutás; a forrás végpontja gerinctengely. Félfesztáv→width/pitch automatikus leképezés **nem bizonyított**. Hossz és végpont-azonosítás hiányzik. |
| hip | **PARTIAL** | **PARTIAL**: HAP/csomóponti mezők; fő tetősík megjelölése után lehet pitch és feltételes width. | Főtető-metszethez width=2×halfspan feltevés lehetséges, de az azonosított forrásoldal nem biztos. Hossz és végi kontyok geometriája hiányzik. |
| pyramid | **UNSUPPORTED** | **NOT VERIFIED**: csak HAP/csomóponti értékek; geometriai width/pitch nincs átadva. | Square apex célmodell, ridge-axis forrásmetszet; csúcs-, oldal- és szimmetria-referencia nincs bizonyítva. |
| halfHip | **PARTIAL** | **PARTIAL**: fősíki adatok csak explicit főszarufa-azonosítással; HAP/csomóponti mezők. | Hiányzik tetőhossz, hipEaveHeightMm, valamint a forrás főtető-síkjának és a törésnek bizonyítéka. |
| lShape | **UNSUPPORTED** | **PARTIAL**: közös csomóponti mezők; eresz feltételesen. | wingWidthMm, wingProjectionMm, tájolás és főtetősík-azonosítás hiányzik; egy keresztmetszet nem kódolja a völgyet/szárnyat. |
| tShape | **UNSUPPORTED** | **PARTIAL**: közös csomóponti mezők; eresz feltételesen. | Szárnyméretek, tájolás, főtetősík-azonosítás és hossz hiányzik; egy metszet nem reprezentálja a völgyeket/szárnyat. |
| mansard | **UNSUPPORTED** | **PARTIAL**: HAP/csomóponti mezők; egyetlen pitch átadása tilos. | Két szakasz meredeksége és töréspontja kell: lowerRunMm, lowerRiseMm, upperRiseMm. |

A nyolc forma egyikénél se szabad a cél default roofShape="gable" értékét úgy kezelni, mintha az a forrás tetőformáját bizonyítaná. A választott célforma a felhasználó célmodellje; az adatátvétel nem választ formát helyette.

## 6. Forrás→cél mezőleképezési mátrix

| Forrásmező | Célmező | Konverzió | Előfeltétel | Hibakezelés |
|---|---|---|---|---|
| eaveProjectionMm | eaveOverhangMm | Közvetlen mm másolás, jelenleg implementált. | Cél gable; vagy shed, ha annak alacsony ereszvége a forrás talpszelemen-vége. Formát previewkor és confirmkor ellenőrizni kell. | Rejtett/inaktív mezőre ne írjon; célalakváltás invalidálja az előnézetet. |
| horizontalHalfSpanMm | widthMm (gable) | ×2, egész mm marad. | Célformaként gable kiválasztva; szimmetrikus kétoldali modell elfogadva; célhatáron belül. | TARGET_SHAPE_MISMATCH, SYMMETRY_NOT_CONFIRMED, TARGET_RANGE; becslés nincs. |
| riseMm, seatCutHeightMm | pitchDegrees | (rise−HAP)/halfspan, atan2, radián→fok. | Csak gable feltételekkel; HAP értelmezhető, effektív emelkedés pozitív, cél pitch tartományán belül. | MISSING_HAP, INVALID_SOURCE_GEOMETRY, TARGET_RANGE; sikertelen sort ne ajánljon átvenni. |
| seatCutHeightMm | seatCutHeightMm | Közvetlen mm másolás, M10 Fázis 0. | Cél Karmi mező aktív; birdsmouth bekapcsolásának meglévő szabálya megmarad. | Opcionális hiánynál ne írjon üres/zero értéket; jelezze, hogy nincs adat. |
| ridgeJoint, ridgeBoardThicknessMm, ridgePurlinWidthMm, ridgePurlinTopMm, purlinFaceMm, purlinTopMm | Azonos kulcsú célmező | Közvetlen másolás csak létező, aktív mezőre; Fázis 0 szerződés szerint. | Csatlakozási mód/mező aktív; cél tetősík kompatibilis. Nem L/T szárny vagy félkonty eltérő oldala. | Inaktív kulcs kihagyása, ok megjelenítése. |
| rafterDepthMm | — | Nem vihető át. | Megfelelő célmező nincs. | Ne jelenjen meg írható sorként. |
| plateWidthMm | plateWidthMm csak Karmi-kiegészítésként | Nem tetőgeometria, ne keveredjen a widthMm tetőszélességgel. | Csak ha aktív cél Karmi mező létezik. | Ne használja roof width helyettesítésére. |
| tetőhossz, homlokzati kiülések, szárny/konty/manzárd paraméterei | — | Nem származtatható a forrásból. | Nincs ilyen forrásmező. | A cél üres/korábbi értéke marad; szükséges méretet a felhasználó adja meg. |

Az új map explicit és célformát is kapó tiszta helper legyen, ne generikus „hasonló nevű mezőket másol” logika. A formától függő vagy sikertelenül konvertált mező ne jelenjen meg átvehető értékként.

## 7. HAP, gerincemelkedés és hajlásszög kezelése

- A HAP önálló adat: azonos mérési jelentésű cél Karmi mezőre mm-ben másolható. A HAP nem gerincemelkedés, ezért a szögszámítás előtt le kell vonni a riseMm-ből.
- A riseMm önmagában nem vihető cél pitchDegrees mezőbe, és nem tehető cél tetőmagassággá: a lejtős vízszintes futás nélkül a cél nem tud azonos geometriát adni.
- Gable cél widthMm csak a félfesztáv kétszerezésével állítható elő, ha a cél szimmetriáját a felhasználó elfogadta. A tetőhossz továbbra is hiányzik.
- A cél gable sík hajlása a gerinctengely és faloldali támaszvonal közti effektív emelkedést őrzi meg. A cél abszolút Z=0 és a forrás talpszelemen-felső-sík referenciája nem azonos globális magassági origó; abszolút gerincmagasság nem származtatható az átadott pitchből.
- Tiltott: HAP nélküli rise/halfspan hajlás, riseMm → pitchDegrees egyszerű másolás, kerekített UI-fokból visszaszámolt kanonikus emelkedés, shed width feltételezése, hip konty-szög, pyramid apex, mansard egyetlen pitch-ként, L/T szárny- vagy aszimmetriaadat.

## 8. Tetőforma-váltás és hiányos adatok kezelése

1. **Átvétel előtt más forma:** csak az aktuális formához igazolt mezők jelenjenek meg. Geometriai MVP csak gable esetén ajánlja fel width/pitch származtatását. Más formánál csak kompatibilis Karmi mezők; eresz gable vagy feltételes shed esetén.
2. **Forma váltás előnézet után:** az előnézet az induló roofShape-hoz kötődjön. Confirm előtt eltérésellenőrzés; formaeltéréskor preview invalidálódik és újra kell nyitni.
3. **Forma váltás megerősítés után:** draftértékek maradjanak; ne történjen sync. Jelezze, hogy az átvétel korábbi forma alapján történt, és tegye érvénytelenné az eredetfüggő állítást. Célforma validációja mentés előtt kötelező.
4. **Kézi mezőmódosítás átvétel után:** kézi érték maradjon; újraszinkronizálás ne legyen. Az érintett mező eredete váljon „kézzel módosítottá” vagy az átvételi jelzés részlegessé.
5. **Más forrásrevízió:** új preview induljon a konkrét immutable revisionId snapshotból; confirmig draft változatlan. Új forrás felülírása csak előnézett diff alapján történjen.
6. **Korábbi célrevízió megnyitása:** cél saját input snapshotja jelenjen meg. A forrásfrissítés nem tölt rá automatikusan; új átvétel külön felhasználói döntés.
7. **Forrás új revíziót kap:** korábban kiválasztott revízió továbbra is érvényes. Stale jelölés megengedett, de cél nem frissül; új revízióhoz új preview+confirm kell.

A jelenlegi preview csak meződiffet és Karmi bekapcsolását mutatja; confirm a source.fields értékeket írja. Geometry preview mutassa a forrásméreteket, a képletet/rövid magyarázatot, számított értékeket és kihagyott mezők okát. A jelenlegi komponensnek nincs forma-váltási invalidációs szerződése; azt hozzá kell adni.

## 9. Dependency, snapshot és provenance

- A [construction-data.ts](../src/features/calculations/construction-data.ts) a bejelentkezett felhasználó műhelyén belüli roof.rafter-cut kalkulációk aktuális revízióját olvassa, max. 20; a felhasználó konkrét revisiont választ. Mentéskor sourceCalculationRevisionId kerül a meglévő save requestbe.
- A cél [construction-actions.ts](../src/features/calculations/construction-actions.ts) útvonalon szerveroldalon újraszámolódik, immutable input/output revíziót és QA08/QA09 attestációkat kap, majd revision-level calculation_dependencies kapcsolatot rögzít. Szervezeti jogosultság és restricted writer útvonal változatlanul szükséges; a kliens preview nem hiteles számítás.
- A calculation_dependencies az upstream/downstream revíziót, szervezetet és dependency_type-ot tárolja, nem mezőket vagy konverziót. Elég az MVP forráskapcsolatához, de nem bizonyítja mely mező került át, milyen képlettel, vagy mit módosított kézzel a felhasználó.
- A construction-suite.input.v1 snapshot a végül megadott célmezőket menti; nincs transfer provenance blokkja. A RoofCalculationSnapshot in-memory only. A végső érték és forrásrevízió visszakereshető, a mezőszintű transzformációs történet nem.
- **MVP döntés:** ne változzon dependency-, SQL-, input/output snapshot- vagy attestációs szerződés. Preview mutassa a transzformációt; kézi felülírás után a UI ne állítson téves mezőeredetet. Mentett revízióban a dependency csak azt jelenti, hogy a felhasználó ezt a forrásrevíziót használta.
- **Külön termékdöntés szükséges**, ha mezőszintű provenance auditálása kell. Új verziózott, szigorúan validált provenance blokk vagy külön célrevízióhoz kötött tábla rögzítse a forrásrevíziót, transferkori targetShape-ot, mezőnként source/target kulcsot, módszert, inputokat, eredményt, elfogadást és kézi eltérést. Ez snapshot/SQL/writer/attestáció kompatibilitási tervet igényel; ne kerüljön be észrevétlenül.

## 10. Javasolt MVP és implementációs lépések

**Forrás/cél:** csak mentett roof.rafter-cut revízió → roof.material-takeoff vagy roof.timber-cutlist, geometriai konverzióval kizárólag gable célban. Ez a létező adatátvitelt bővíti; roof.gable, roof.truss-members és projektoldali roof.geometry.* kívül marad, mert más input/mentési szerződésük van.

1. Bővítsd a [rafter-connection-fields.ts](../src/features/calculators/rafter-connection-fields.ts) körüli átviteli logikát explicit gable geometry converterrel. Input: forrássnapshot mezői, cél roofShape, symmetricGableConfirmed. Eredmény: {ok:true, fields, derivedFields} vagy {ok:false, reason, availableFields}. Validálja a véges/pozitív mm-t, HAP/rise összefüggést és cél width/pitch határokat; a target schema legyen a végső gate.
2. Csak gable és explicit szimmetria-elfogadás mellett adjon widthMm, pitchDegrees és meglévő eaveOverhangMm mezőt. Hiányzó buildingLengthMm/homlokzati kiülés ne kapjon defaultot; a cél kitöltésig hiányos marad.
3. Bővítsd a [construction-data.ts](../src/features/calculations/construction-data.ts) transzfer payloadját úgy, hogy a helper csak ellenőrzött, szükséges forrásmezőket kapjon, ne teljes szűretlen snapshotot.
4. A [construction-field-transfer-control.tsx](../src/features/calculators/construction-field-transfer-control.tsx) preview különböztesse meg a másolt és számított sorokat. Példa: „Tetőhajlás — a gerincemelkedésből és a HAP-ból számítva”. Mutassa a forrásadatokat, célformát, szimmetria-feltételt és kihagyási okokat. Confirm csak változatlan célforma és preview mellett legyen aktív.
5. A [construction-suite.tsx](../src/features/calculators/construction-suite.tsx) adja át a cél roofShape-et; forma váltás invalidálja a previewt. Kézi mezőmódosítás tartsa meg a user értékét; sync ne legyen.
6. Mentési action/writer maradjon a meglévő szerveroldali újraszámítási és jogosultsági úton. Cél mezőcontract validációja kötelező; hiányzó lengthMm miatt a cél nem saveable. Dependency csak megerősített forrásrevízióval kerüljön rögzítésre.

Nem része: shed width/pitch, összetett formák, teljes geometria-egyesítés, automatikus sync, új adatbázis-entitás, mezőszintű tartós provenance, új adatátviteli rendszer.

## 11. Célzott tesztmátrix

| Szint | Minimális bizonyíték |
|---|---|
| Domain helper unit | Független kézi expected a 4.3 három példájára; eltérő spanek/hajlások; HAP=0 és pozitív HAP; hiányzó HAP (régi snapshot), negatív/0/nem finite értékek; HAP≥rise; target width határ és pitch-limit; gable-jóváhagyás nélkül elutasítás; shed/hip/pyramid/halfHip/L/T/mansard width/pitch ne legyen automatikusan átadható. |
| Mezőszerződés regresszió | Meglévő eaveProjectionMm→eaveOverhangMm és HAP/Karmi map marad; halfspan/rise nem másolódik nyersen; inaktív mező kihagyása; ismeretlen roofShape transzferkor nem válik gable fallbackká; célmező üres, egyező és eltérő értékei. |
| Draft/preview UI | Forrás, számított jelölés, képlet és érték látható; preview/cancel nem ír draftot; confirm csak változatlan shape/preview esetén; hibánál ok látható és nincs becslés; egyező/eltérő célértékek jól jelöltek; módosult céladat a preview megnyitása óta blokkolja a régi diff megerősítését. |
| Forma váltási regresszió | Preview után gable→shed váltás confirmot blokkol/previewt invalidál; confirm után forma váltás nem syncel, nem tüntet el csendben eredetjelölt geometriát. Nem reprezentálható aszimmetriát vagy mérési referenciát expliciten kihagyja. |
| Mentés/revízió integráció | Forrásrevision ID a jóváhagyott revízió; szerveroldali számítás previewval paritásban; hiányzó lengthMm blokkolja mentést; forrás új revíziója nem módosít céldraftot/snapshotot; revision conflict és rollback regressziók változatlanok; meglévő QA08/QA09, jogosultsági és org-határtesztek megmaradnak. |
| Böngészős workflow E2E | Mentett forrás választása → preview → cancel → preview → confirm → hossz kézi kitöltése → mentés → újranyitás; forrás dependency, immutable revízió és cél snapshot olvasással igazolt; forrás új revíziója nem ír át. Azonos fizikai geometrián pitch, vízszintes futás/kiülés és számítható Karmi paritás; nem kapcsolódó mező nem változik. |
| Mobil | Preview táblázat, számított/másolt jelölés, cancel/confirm ellenőrzése 375 px szélességen, világos/sötét témában. |

Ne duplikálja a Fázis 0 regressziókat; a már létező transfer tesztek bővítése indokolt. Ehhez a design-only felméréshez teljes teszt/build/böngészős futtatás nem történt.

## 12. Kockázatok, kizárások és nyitott döntések

- **Geometriai kockázat:** a rafter-cut metszet nem azonosít tetőformát vagy ellenoldali szarufát. Gable width kétszerezése szimmetria-feltevés, csak célforma-választás és user jóváhagyás engedheti.
- **Tetőhossz hiánya:** teljes célmodellhez lengthMm/buildingLengthMm kell. Nem használható feltételezett hossz.
- **Eresz hidden draft:** jelenlegi map célformától függetlenül írhat eaveOverhangMm-et, pedig csak gable/shed esetén aktív. Új UI szűrje forma szerint, hogy későbbi formaváltás ne jelenítsen meg félrevezető értéket.
- **Provenance:** a dependency nem mezőszintű. Döntés kell arról, elég-e a revíziószintű eredet; ha nem, külön snapshot/provenance mérföldkő kell.
- **HAP hiánya:** UI-ban 0 az alapérték, de historikus snapshot hiányos lehet. Csak bizonyított sémaszerződés normalizálja 0-ra; egyébként blokkolás.
- **Nyitott döntések:** a szimmetria-elfogadás preview checkbox vagy explicit megerősítő mondat legyen-e; kell-e mezőnkénti transzformációt menteni; hogyan azonosítható később explicit módon a shed forrásvégpontja. Ezek lezárásáig csak a fenti feltételes gable MVP implementálható.

### Elfogadási feltételek

1. Csak mentett roof.rafter-cut revízióból indul; preview nem ír draftot vagy tárolt adatot.
2. Gable width/pitch csak választott és szimmetriára jóváhagyott gable célra számítódik; képlet és forrásértékek látszanak.
3. HAP levonása kötelező; határokat a szerveroldali cél-schema is ellenőrzi; invalid/hiányos adatot nem becsül.
4. Nem kerül át tetőhossz, homlokzati kiülés, shed/hip/összetett forma-paraméter vagy nem megfelelő csatlakozásmező.
5. Preview utáni forma váltás invalidálja a confirmot; későbbi kézi módosítás és új forrásrevízió nem ír át automatikusan.
6. Mentés a meglévő szerveroldali újraszámítást, immutable revíziót, attestációt, szervezeti/jogosultsági ellenőrzést, concurrency/rollback kezelést és dependencyt használja.
7. Unit, draft/preview, mentési/revíziós és böngészős tesztek igazolják az implementált kör feltételeit; célzott teszt nem teljes regresszió.

**Következő mérföldkő javasolt Conventional Commit:** feat(M10.1): transfer validated gable geometry from saved rafter cuts
