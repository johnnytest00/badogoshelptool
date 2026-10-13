# F9.6.2.0 — Bádogos szegélyek kalkulátora: domain-terv

**Állapot:** tervezés kész; implementáció, szakmai jóváhagyás és helyi futtatási ellenőrzés nem történt. **Kutatási hozzáférés:** 2026-10-13. A címkék jelentése: **ELLENŐRZÖTT TÉNY** = megvizsgált forrás vagy jelenlegi kód; **MATEMATIKAI FELTEVÉS** = tervezett modell, nem szerelési norma; **GYÁRTÓSPECIFIKUS SZABÁLY** = csak a nevezett termékre/rendszerre; **FELHASZNÁLÓI DÖNTÉS** = explicit helyszíni/szakmai választás; **NEM ELLENŐRZÖTT KÖVETELMÉNY** = megvalósítás vagy szakmai ellenőrzés előtt tisztázandó.

## 1. Szakmai hatókör és kutatási források

**ELLENŐRZÖTT TÉNY:** a vizsgált gyártói dokumentumok külön orom-, eresz-, gerinc- és vápaelemeket, valamint rendszerfüggő csatlakozásokat mutatnak. A szegély típusa önmagában nem határozza meg a profilt, az anyagot, a hajlást, a rögzítést vagy az átfedést. A jelen terv kizárólag vonalhossz- és explicit paraméteralapú mennyiségi becslést céloz. Nem gyártási, hajlítási, vágási, vízzárósági vagy statikai terv.

| Forrás (pontos URL) | Dokumentum dátuma | Ellenőrzött megállapítás és érvényességi határ |
|---|---|---|
| [Lindab SRP Click szerelési útmutató](https://www.lindab.hu/globalassets/commerce/lindabwebproductsdoc/pdf/profile/hu/seamline/lindab_seamline_srp-click_szerelesi-utmutato.pdf?v=1771111103) | 2020/10, PDF záróoldal | **GYÁRTÓSPECIFIKUS SZABÁLY:** a VISRP oromszegély toldási átfedése legalább 100 mm; a gerinc túlnyúlik a tetőlemezek végén. Kizárólag a leírt SRP Click részletre értelmezhető. |
| [Lindab Topline cserepeslemezek szerelési útmutató](https://www.lindab.hu/globalassets/commerce/lindabwebproductsdoc/pdf/profile/hu/topline/lindab_topline_cserepeslemez_szerelesi-utmutato.pdf?v=1771111104) | 2022/08, PDF záróoldal | **GYÁRTÓSPECIFIKUS SZABÁLY:** az íves CTR-S gerincelemnél legalább 100 mm átfedést ír; külön gerinczáró, szellőző és oromszegély-csomópontot mutat. Ez nem általános gerincszegély-szabály. |
| [Lindab OVM-SRP termékoldal](https://www.lindab.hu/termekek/profil/coverline-trapezlemezek/srp-click-elkorcolt-tetoprofil-tartozekok/ovmsrp_p_hun/) | Oldalon nem azonosítható | **GYÁRTÓSPECIFIKUS SZABÁLY:** a pozitív tetőszögtörés SRP Click szegélye standard 2000 mm gyártási hosszú, 0,5 mm vastag; rendeléskor tetőhajlásszöget kérnek. Egyetlen konkrét profil példája, nem alapértelmezés. |
| [Lindab PLX Magestic termékoldal](https://www.lindab.hu/termekek/profil/coverline-trapezlemezek/plx-korcoltlemez-fedes/plx-magestic/) | Oldalon nem azonosítható | **ELLENŐRZÖTT TÉNY:** a korcolható alapanyag 0,6 mm vastagságúként szerepel. Az alapanyag vastagsága nem vezethető le a szegélykategóriából. |
| [PREFA kiselemes fedés szegély- és váparészletei](https://www.prefa.hu/extranet/alkalmazastechnikai-iranyelv/teto/kiselemes-fedesek/tartozekok/parkanyelemek-es-parkanylezarasok/) | Oldalon nem azonosítható | **GYÁRTÓSPECIFIKUS SZABÁLY:** a vápa kialakítása, kiterített szélessége és hossza a termékrendszertől, hajlástól és helyzettől függ; a leírás maximum 3000 mm hajlítási hosszt említ. Nem alkalmazható más váparendszerre. |
| [Ruukki Hyygge installation manual](https://www.ruukki.com/docs/default-source/roofing-documents/export/ruukki_hyygge_installation_manual_eng.pdf?sfvrsn=5637468474943130000) | 2020, 1. kiadás; záróoldal 07.2020 | **ELLENŐRZÖTT TÉNY:** külön verge, eaves, ridge és valley alkatrészek szerepelnek; a termékspecifikáció külön teljes és hasznos méretet, hajláskorlátot és vastagságot ad. A teljes/hasznos méret itt tetőfedő paneladat, nem általános szegélyszál-hasznos hossz. |

Az összes fenti URL-t 2026-10-13-án vizsgáltuk. A PREFA és Ruukki források több termék és csomópont közti eltérést igazolnak; magyar szabványszöveget nem vizsgáltunk. A régebbi útmutatók hatályossága egy konkrét jelenlegi SKU-ra nincs ellenőrizve. **NEM ELLENŐRZÖTT KÖVETELMÉNY:** konkrét gyártó, cikkszám, termékverzió, aktuális szerelési útmutató és szakmai reviewer kiválasztása szükséges bármilyen gyártói megfelelésjelzéshez.

## 2. Kategóriák és geometriai határ

| Kategória | Jelenlegi `roof.gable` lehetséges hosszforrása | Döntési határ |
|---|---|---|
| Oromszegély | Négy külön ferde él, mindegyik `slopeLengthIncludingEaveMm`; két tetősík × első/hátsó vég. | **FELHASZNÁLÓI DÖNTÉS:** melyik élre, milyen profil és végkialakítás kerül. |
| Falszegély | Nincs falcsatlakozási él a modellben. | Csak kézi mérés vagy későbbi ellenőrzött geometria; nem következtethető oromélből. |
| Ereszszegély | Két külön ereszél, egyenként `eachEaveEdgeMm`. | Nem azonos az ereszcsatornával; a kiválasztott eresz(ek) és a profil külön döntés. |
| Gerincszegély | Egy gerincvonal, `ridgeLineMm`. | A gerincszellőzés, lezárás és túlnyúlás külön szakmai döntés. |
| Vápalemez | Nincs vápaél a szimmetrikus téglalap alaprajzú nyeregtetőben. | Csak kézi hossz; `roof.gable` vápa-import tiltott. |
| Egyedi szegélyprofil | Nincs automatikus élmegfeleltetés. | Kézi mérés, címke és profilparaméterek szükségesek. |

**ELLENŐRZÖTT TÉNY:** a `roof.gable` kimenet hosszakat és két sík vertexeit ad, stabil, önálló edge ID-kat nem. Az ereszcsatorna UI ma `${roofModelId}:left-eave` / `:right-eave` javaslat-ID-t képez, a tetőmodell-revíziót külön őrzi. Az új kalkulátor tervezett élkulcsa legyen explicit szemantika (`left-eave`, `right-eave`, `ridge`, `left-front-gable`, `left-rear-gable`, `right-front-gable`, `right-rear-gable`) a tetőmodell- és `roof.gable` kalkulációs revízióazonosítóval együtt; a forráskimenet mezőneve is snapshotba kerüljön. Ez **tervezett**, még nem létező szerződés. A kiválasztás gombnyomásra történjen, semelyik élre ne keletkezzen automatikusan szegély. Félnyeregtető, konty, összetett alaprajz, vápa, falcsatlakozás és áttörés automatikus leképezése nem támogatott.

## 3. Bemenet, kimenet, származás

**MATEMATIKAI FELTEVÉS — javasolt `sheet_metal.flashings.material-estimate` v1 szerződés:** egy projektkalkuláció több független `runs[]` szakaszt tartalmaz. Minden szakasz: stabil helyi ID, kategória, címke, pozitív kanonikus `lengthMm`, `lengthSource` (`geometry` / `site_measurement` / `drawing` / `user_provided` / `demo`), opcionális `roofEdgeRef` (szervezet/projekt ellenőrzött tetőmodell- és kalkulációs revízió, élkulcs, kimenetmező), opcionális mérési megjegyzés. A termékbeállítás: explicit kiválasztott katalógusvariáns vagy külön, eredetjelölt kézi paraméter; `stockLengthMm` (névleges kereskedelmi szál), `connectionMode` (`no_overlap_confirmed` / `explicit_overlap` / `effective_length_supplied` / `unknown`), ehhez pontosan egy `overlapMm` vagy `effectiveAdditionalCoverageMm`. Külön `startExtensionMm`, `endExtensionMm`, `reserveMm`, és kézi tartozékok; nincs automatikus alapátfedés vagy ráhagyás. Rendszerfüggő további feltételek (min/max hossz, hajlásszög, vastagság, profilgeometria, csatlakozási mód) csak forrásolt, alkalmazhatóságában ellenőrzött mezőként értelmezhetők.

**MATEMATIKAI FELTEVÉS — kimenet:** szakaszonként a mért hossz, végkiterjesztések, tervezett fedendő hossz és tartalékkal növelt célhossz `mm` egységben; szálminimum `piece` csak ismert kapcsolati módban; darabszám hiányzó szabály esetén `null` + indok; szükséges kapcsolatok száma `max(n−1,0)`; számítási képlet, paraméterforrások, figyelmeztetések és `preliminary` státusz. Az összegek csak azonos profil/variáns, beszerzési egység és kapcsolati mód mentén csoportosíthatók, miközben a szakaszok darabszáma külön számolódik. A `linear_meter` érték csak explicit `mm / 1000` hosszként jelenhet meg; nem konvertálható automatikusan `piece`, `package`, `square_meter` vagy `kilogram` egységre.

**ELLENŐRZÖTT TÉNY:** a meglévő katalógusban `flashing` és `sheet_metal` kategória, `piece` és `linear_meter` beszerzési egység, `lengthMm`, `thicknessMm`, `technicalSpecs`, valamint `verified` / `user_provided` / `estimated` / `demo` / `missing` provenance van. Egy `verified` jelölés önmagában nem gyártói tanúsítás. A számítási inputban minden felhasznált paraméterhez eredet, pontos katalógusvariáns/forrás URL/dátum és kézi felülírás ténye kell; a kimenetben ezekből változatlan snapshot készül.

## 4. Matematikai modell és hibahatárok

Legyen `L` egyetlen kiválasztott szakasz mért hossza, `E₁` és `E₂` a **felhasználó által megadott** szükséges végkiterjesztés, `R` a külön jelölt tartalék. `D = L + E₁ + E₂` a tervezett lefedendő hossz; `Dᵣ = D + R` a konzervatív beszerzési becslési cél, de a tartalékot nem szabad kész szerelési hosszúságnak címkézni. `S` a kereskedelmi szál névleges hossza. A számítás minden független szakaszon külön fut; két vég közötti közös vágást nem feltételez.

| Kapcsolat adata | Szálminimum az ideális, szabadon vágható és egyenlő típusú szálak **matematikai modelljében** |
|---|---|
| Explicit `O` toldási átfedés, `0 ≤ O < S` | `n(D) = 1`, ha `0 < D ≤ S`; egyébként `n(D) = ceil((D − O) / (S − O))`. Ellenőrző invariáns: `nS − (n−1)O ≥ D` és `n ≥ 1`. Tartalékos becsléshez ugyanaz a képlet `Dᵣ`-rel. |
| Igazoltan átfedés nélküli kapcsolat | `O = 0` eset; csak explicit döntés után, soha nem hiányzó adat helyett. |
| Termékhez igazolt `U` további szálonkénti hasznos fedési hossz | `n(D) = 1`, ha `D ≤ S`; egyébként `1 + ceil((D − S) / U)`, ahol `0 < U ≤ S`. `U` és `O` nem vonható le egyszerre. |
| Ismeretlen kapcsolati mód vagy hiányzó `O`/`U` | `n = null`; csak a `D` hossz adható ki, darabos beszerzési javaslat nem. |

**MATEMATIKAI FELTEVÉS:** a képlet alsó darabszámkorlát, nem validált elemkiosztás. Toldások véghelye, minimális vágható maradék, rögzítési pontok, véglezárás, sarokhajtás, eltérő darabhosszok, vágási veszteség, szállítás és maradékok más szakaszon történő újrahasználata nincs modellezve. Ha bármelyik korlátozás lényeges, `layout_unverified` figyelmeztetés és szakmai jóváhagyás szükséges; a darabszám nem nevezhető végleges megrendelési mennyiségnek. Csak explicit min/max termékhossz esetén végezhető egyszerű határellenőrzés, amely önmagában nem igazol gyárthatóságot.

Validáció: pozitív, véges, biztonságosan ábrázolható `mm` hossz és `S`; nemnegatív véges kiterjesztés/tartalék; egyedi szakasz-ID; azonos kategória és valóban megfelelő termékvariáns explicit kiválasztása; `O < S` vagy `0 < U ≤ S`; a forrásrevízió, élkulcs és importált hossz konzisztenciája. Hiányzó kapcsolati paraméter **nem** nullára helyettesített bemenet. `VALIDATION_ERROR` / `MISSING_REQUIRED_INPUT` hibás bemenetnél; `INVALID_GEOMETRY` téves élkötésnél; `NUMERIC_OVERFLOW` túlfutásnál; `UNSUPPORTED_OPERATION` nem támogatott automatikus geometria vagy beszerzési konverzió esetén. A termékspecifikus hajlás/anyag/kapcsolat egyezése csak pontosan azonosított és aktuális termékszabállyal minősíthető; máskor „nem ellenőrzött”.

## 5. Registry, perzisztencia, katalógus és takeoff

**Tervezett újrahasznosítás:** a tiszta TypeScript `CalculatorDefinition` és Zod input/output schema, verziózott production registry, jelenlegi `calculation_revisions` immutable input/output/provenance snapshot, `calculation_dependencies` tető- és kalkulációs forráskapcsolat, valamint a gutter mintájára aktuális revízió ellenőrzés. Párhuzamos motor vagy külön szegély-revíziótábla nem indokolt. A `docs/DATABASE.md` jelenlegi gutter mentése és draft átadása csak mintául szolgál; az új szegélytípusra külön szűk implementáció és bizonyíték kell.

Mentéskor a szerver ellenőrizze a hitelesített aktív tagságot, azonos szervezetet és projektet, az aktuális forrás-geometriát, az élkulcsot, a kliens által küldött méret helyett a mentett geometriai snapshotot, majd számoljon újra. Egy tranzakcióban rögzítse a számítási és forrásrevíziót; `expectedRevision` és szerializálás védje a konkurens mentést. A történeti snapshotok nem írhatók felül. Manuális mérésnél nincs geometriai igazolás; eredete legyen látható.

Takeoff csak mentett, aktuális, szerveroldalon ellenőrzött szegélyrevízióból és explicit aktív, azonos szervezetű, kategóriában és egységben kompatibilis variánsból készülhet új `draft`-ként. `piece` csak ismert kapcsolati mód és számolt darab esetén ajánlható; `linear_meter` csak az explicit hosszra, a tartalék és a beszerzési értelmezés külön feltüntetésével. Csomag/darab/fm között nincs implicit váltás. Az RPC a mentett snapshotból vezesse le a mennyiséget, tárolja a forrás-, variáns-, műszaki adat-, ár- és provenance-snapshotot, és UUID kéréskulccsal/payload-egyezéssel védje az ismételt és párhuzamos átadást. Approved rekord és forrásazonosítók változatlanok maradnak. Az új útvonalhoz célzott RLS, composite FK, cross-org/cross-project, konkurencia, idempotencia és immutabilitás teszt szükséges a későbbi implementációs fázisban.

## 6. Gyakorlati UI folyamat

1. Kategória kiválasztása; a rendszer csak a kiválasztott típushoz létező, ellenőrzött geometriai éleket ajánlja fel. Az összes többi hossz kézzel vihető be, eredetjelöléssel.
2. A szakember kiválasztja a ténylegesen szegélyezett éleket, vagy több független szakaszt vesz fel; a geometria-import nem hoz létre automatikus tételt.
3. Katalógusvariánst és névleges hosszt, majd a kapcsolati módot/átfedést vagy hasznos hosszt konfigurálja. Hiányzó adatnál a darabszám helyén egyértelmű „nem számítható” jelzés áll. Végkiterjesztés és tartalék külön mező.
4. Az összesítő szakaszonként megjeleníti a `mm`/`m` hosszt, az előzetes `piece` mennyiséget, a toldásszámot, a képletet, a paraméterforrásokat és a nem ellenőrzött kivitelezési feltételeket. A technikai nézet nem minősül szerelési rajznak.
5. Mentés új immutable revízióba; a felület jelzi a mentetlen változást és a forrásgeometria elavulását. Később csak aktuális, mentett revízióból és kompatibilis tételekből hozható létre új draft takeoff.

Újrahasznosítható a gutter projektútvonal/szakaszlista, explicit geometriagomb, mértékegység- és eredetjelzés, revízióválasztó, katalógusvariáns-választó, draft előnézet és action hibaüzenet. **NEM ELLENŐRZÖTT KÖVETELMÉNY:** a mobil terepi használat és az egyes kategóriák szakmai elnevezése valós kivitelezőkkel validálandó.

## 7. Jövőbeli tesztek: kizárólag DEMO matematikai fixture-ök

Az alábbi számok **DEMO matematikai tesztadatok**, nem gyártói méretek, ajánlott átfedések vagy tanúsított szakmai referenciaesetek. Minden példában `E₁=E₂=R=0`, szabad vágás és önálló szakasz az alap, hacsak a sor másként jelzi.

| Eset | Bemenet (`mm`) | Képlet és várt matematikai eredmény | Validáció/feltétel |
|---|---|---|---|
| Pontos szálhatár | `L=2000, S=2000, O=0` | `n=ceil(2000/2000)=1`, kapcsolatok `0`. | `no_overlap_confirmed` explicit; csak ideális modell. |
| Részleges következő szál | `L=2001, S=2000, O=0` | `n=ceil(2001/2000)=2`, kapcsolatok `1`. | A második darab szükséges hossza matematikai 1 mm; gyakorlati vághatóság nem igazolt. |
| Explicit átfedés határa | `L=3900, S=2000, O=100` | `2·2000−1·100=3900`, tehát `n=2`; `L=3901` esetén `n=3`. | A 100 mm kizárólag DEMO paraméter; `0≤O<S`. |
| Több független él | `L₁=L₂=1500, S=2000, O=0` | `ceil(1500/2000)+ceil(1500/2000)=2` darab. | A maradékok közös felhasználása nincs feltételezve. |
| Végkiterjesztés és tartalék | `L=1800, E₁=100, E₂=100, R=150, S=2000, O=0` | `D=2000` → `n(D)=1`; `Dᵣ=2150` → tartalékos `n(Dᵣ)=2`. | A tartalék külön becslés, nem beépített hossz. |
| Hiányzó vagy hibás paraméter | `L=3900, S=2000`, ismeretlen kapcsolat; illetve `O=2000` | Ismeretlen kapcsolat: hossz `3900`, `n=null`; `O=S`: nincs kimenet, validációs hiba. | Hiányzó átfedés nem értelmezhető nullának. |
| Hasznos hossz, dupla levonás nélkül | `L=3900, S=2000, U=1900` | `1+ceil((3900−2000)/1900)=2`. | `U` és `O` együtt nem adható meg ugyanarra a kapcsolatra. |

## 8. Bevezetési fázisok és nyitott döntések

1. **F9.6.2.1:** tiszta, gyártófüggetlen domain és registry; kategóriák, manuális szakaszok, explicit kapcsolat/átfedés, null eredmény hiányzó adatnál, matematikai határtesztek. Nincs adatbázis vagy takeoff ebben a javasolt első szeletben.
2. **F9.6.2.2:** projekt UI, csak megerősített `roof.gable` éljavaslatok és forrásellenőrzött immutable mentés; szervezeti és konkurenciatesztek.
3. **F9.6.2.3:** forrásolt katalógus-kapcsolat és atomi draft takeoff; RLS, idempotencia, approved immutabilitás, célzott böngészős QA.
4. **Későbbi szakmai réteg:** egy kiválasztott gyártó/SKU és aktuális útmutató alkalmazhatóságának szakmai review-ja; csak ezután termékspecifikus korlátellenőrzés.

**FELHASZNÁLÓI DÖNTÉS:** mely szegélytípus/profil az első pilot, milyen csatlakozási mód, mikor számít egy felmért él külön szakasznak, mi a tartalék pontos jelentése, és ki hagyhat jóvá gyártói adatot. **NEM ELLENŐRZÖTT KÖVETELMÉNY:** konkrét termékek hasznos hossza, toldási szabálya, minimális darabhossza, tetőhajlás- és vastagságkorlátja, rögzítési/sarokkialakítási rendje, valamint valós magyar terepi referenciaesetei. Ezekhez forrásolt SKU és szakember szükséges.
