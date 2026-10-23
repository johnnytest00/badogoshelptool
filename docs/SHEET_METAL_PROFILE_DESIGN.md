# F9.6.3.0 — Lemezprofilok és hajtások: kutatás és domain-terv

**Állapot:** COMPLETE (DESIGN), 2026-10-13. Ez tervezési dokumentum: alkalmazáskód, séma, kalkulátor és rajz nem készült. A „VERIFIED TECHNICAL FACT” megvizsgált elsődleges forrást vagy jelenlegi kódot jelent, nem gyártási tanúsítást. A „MATHEMATICAL ASSUMPTION” a javasolt ideális modell; „MACHINE-SPECIFIC PARAMETER” és „MANUFACTURER-SPECIFIC RULE” csak azonosított hatókörben alkalmazható; „USER DECISION” explicit szakmai választás; „UNVERIFIED REQUIREMENT” további mérést vagy jóváhagyást igényel.

## 1. Vezetői összefoglaló

**MATHEMATICAL ASSUMPTION:** az első verzió nyitott, állandó vastagságú, egyenes szakaszokból és köríves hajtásokból álló 2D keresztmetszetet kezeljen. A méretarányos geometria és a terítékszélesség két külön eredmény. A teríték csak minden hajtáshoz explicit, eredettel ellátott hajlítási naddal (`BA`) vagy kalibrált `K` tényezővel számolható; hiány esetén `null`. Az eredmény nem gyárthatósági vagy vízzárósági igazolás. A meglévő szegélyanyag-kalkulátor a tetőél menti hosszt, ez a jövőbeli modul a **keresztirányú** kiterített szélességet tárgyalja; a két dimenzió nem cserélhető fel.

## 2. Magyar bádogos felhasználási esetek

**VERIFIED TECHNICAL FACT:** a Lindab és PREFA útmutatók külön orom-, eresz-, gerinc-, vápa-, falcsatlakozási és párkányrészleteket mutatnak. Az alak, a kapcsolat és a szerelés termékrendszer-függő; egy kategórianév nem profilmetszet. A következő táblázat *lehetséges absztrakt leírás*, nem szabványos profil vagy gyártói méret. Minden sorban a keresztmetszeti egyenesek tényleges tangenciális hossza, előjeles hajtásszög, belső sugár, anyagvastagság, valamint hajtásonkénti `BA`/`K` és eredet szükséges a terítékhez.

| Kategória | Lehetséges 2D reprezentáció és felhasználói adat | Hajlítás/külön feltétel | MVP |
|---|---|---|---|
| Egyszerű L-profil | 2 egyenes + 1 köríves hajtás; teljes keresztmetszeti méretek | 1 hajtás; külső/ belső méretből csak dokumentált konverzióval | Igen, tangensmérettel |
| Egyszerű U-profil | 3 egyenes + 2 hajtás; mindkét perem mérete | Szerszámhozzáférés, hajtási sorrend külön vizsgálandó | Igen, ha nincs önmetszés |
| Egyedi nyitott profil | `n+1` egyenes + `n` hajtás | Irányváltás és közeli perem ütközhet | Igen, korlátozott szegmensszámmal |
| Oromszegély | Gyakran több peremmel leírható nyitott poligonális profil; a konkrét rajzot a felhasználó adja | Visszahajtás/korc és tetőfedésbe akadás lehet | Csak egyszerű, nyitott változat |
| Falszegély | Fal felőli és fedés felőli szár, szükség szerint felhajtás | Falhorony, tömítés és fedési kapcsolat külön | Csak egyszerű keresztmetszet |
| Ereszszegély | Cseppentő és felfekvő szár lehet | Vízorr/visszahajtás külön; szerelési lejtés nem a profilból következik | Csak egyszerű keresztmetszet |
| Gerincszegély | Két oldali, gyakran szimmetrikusnak látszó szár | Tetőhajlás, szellőzés, lezárás külön adat | Igen, ha explicit geometria |
| Ablakpárkány | Felfekvő szár, vízorr, oldalsó lezárás | Oldalsó végzárás 3D/műveleti részlet; cseppentő visszahajtás lehet | Csak hossz mentén állandó 2D metszet; oldalsó lezárás nem |

**USER DECISION:** a szakember adja meg a tényleges profilrajzot és a mérési konvenciót; a kategória címke és az F9.6.2 tetőél-javaslat csak munkakörnyezet. **UNVERIFIED REQUIREMENT:** magyar műhelyek által használt méretezési és gyártási konvenciók terepi validálása.

## 3. Ellenőrzött technikai források

Az alábbi URL-eket **2026-10-13-án** értem el. A forrásállítások kizárólag a megjelölt témát támasztják alá; egyik sem ad univerzális `K` értéket a magyar bádogos gyakorlatra.

| Elsődleges forrás | Ellenőrzött állítás és korlát |
|---|---|
| [SOLIDWORKS K-Factor](https://help.solidworks.com/2022/english/solidworks/sldworks/c_K_Factor.htm) | **VERIFIED TECHNICAL FACT:** `BA = π(R+Kt)·A/180`, ahol `A` az anyag elfordulása fokban, `R` belső sugár, `t` vastagság, `K` a belső felülettől mért semleges réteg távolságának és vastagságnak aránya. CAD-modell, nem gyártói gépbeállítás. |
| [SOLIDWORKS Bend Allowance and Bend Deduction](https://help.solidworks.com/2022/English/SolidWorks/sldworks/c_Bend_Allowance_and_Bend_Deduction.htm) | **VERIFIED TECHNICAL FACT:** tangens egyenesek + `BA`, illetve virtuális külső csúcsból mért méretek − `BD`; a két mérési mód eltér. A `BD`-hez külső setback tartozik. |
| [Autodesk Inventor bend tables](https://help.autodesk.com/cloudhelp/2022/ENU/Inventor-Help/files/GUID-27FD9757-5B40-4528-B361-D9BDFDB2EA4D.htm) | **VERIFIED TECHNICAL FACT:** anyag, vastagság, sugár és szög szerint mért műhelytáblák szolgálhatnak felterítési adatul; a mintatáblák képletalapúak, a valós gép/szerszám kalibrációt mért próbadarab adja. |
| [Autodesk Fusion sheet metal rules](https://help.autodesk.com/cloudhelp/ENU/Fusion-Sheet-Metal/files/SM-RULES-REF.htm) | **VERIFIED TECHNICAL FACT:** a vastagság, belső sugár, hajlítási könnyítés és `K` önálló szabályparaméter. A semleges tengely a belső felülethez viszonyított helyzet. |
| [TRUMPF bending tools](https://www.trumpf.com/en_INT/products/services/services-machines-systems-and-lasers/tools/bending-tools/) és [TRUMPF szerszámkatalógus](https://www.trumpf.com/filestorage/TRUMPF_MX/user_upload/TRUMPF-bending-tools-catalog-EN.pdf) | **MACHINE-SPECIFIC PARAMETER:** szerszámgeometria befolyásolja a sugarat, minimális karimahosszt és visszarugózás kezelését; a katalógus feltételes szerszámadatokat közöl, nem általános korlátot. |
| [AMADA Press Brake Tooling](https://www.amada.com/america/press-brake-tooling) és [AMADA sharp-bend útmutató](https://www.amada.com/america/TEXT%20FILES/When_there_is_no_choice_but_to_bend_sharp.pdf) | **MACHINE-SPECIFIC PARAMETER:** a bélyeg/matrica és a tényleges belső sugár eltérhet a tervezettől; ez a `BA`/`BD` pontosságát is módosítja. A konkrét szerszámjellemzők csak a nevezett AMADA alkalmazásra érvényesek. |
| [RAS bending know-how](https://www.ras-online.de/en/know-how/) | **VERIFIED TECHNICAL FACT:** a lengőhajlítás és az élhajlítás eltérő alátámasztási, sugár- és peremkialakítási eljárás; nyitott/zárt visszahajtás egyes gépeken külön művelet. Nem feltételezhető azonos `K`/szerszámviselkedés. |
| [Lindab Topline szerelési útmutató](https://www.lindab.hu/globalassets/commerce/lindabwebproductsdoc/pdf/profile/hu/topline/lindab_topline_cserepeslemez_szerelesi-utmutato.pdf?v=1771111104) és [PREFA párkány/szegély részletek](https://www.prefa.hu/extranet/alkalmazastechnikai-iranyelv/teto/kiselemes-fedesek/tartozekok/parkanyelemek-es-parkanylezarasok/) | **MANUFACTURER-SPECIFIC RULE:** több, csomóponttól függő szegély/visszahajtás szerepel. Az ábrák nem adnak általános teríték-képletet. Lásd a korábbi [szegélytervet](FLASHING_CALCULATOR_DESIGN.md) a többi tetőelem-forráshoz. |
| [PREFA ablakcsatlakozás](https://www.prefa.hu/extranet/alkalmazastechnikai-iranyelv/homlokzat/kiselemes-fedesek/megmunkalas-es-beepites/ablakcsatlakozas/) | **MANUFACTURER-SPECIFIC RULE:** a párkány szerelése több alkatrészes csomópont; az oldalsó lezárás nem következik egyetlen 2D metszetből. |
| [BSI EN 508-1:2021 ismertető](https://knowledge.bsigroup.com/products/roofing-and-cladding-products-from-metal-sheet-specification-for-self-supporting-products-of-steel-aluminium-or-stainless-steel-sheet-steel) | **VERIFIED TECHNICAL FACT:** az önhordó acél tető- és homlokzati lemeztermék körére vonatkozó termékszabvány. Az ismertető szerint a kapcsolatok/szegélyek kivitelezési követelményeit nem tartalmazza. A teljes fizetős szöveget nem vizsgáltam; ebből hajlítási képlet vagy megfelelőség nem állítható. |

## 4. Profilgeometriai modell

**MATHEMATICAL ASSUMPTION:** a gyártótól független bemenet egy **nyitott** rendezett lánc: `straight[0], bend[0], straight[1], …, bend[n−1], straight[n]`. Egyenes `tangentLengthMm > 0`; hajtás `signedTurnDeg`, `insideRadiusMm > 0`; közös `thicknessMm > 0`. A méretek a *tangenciapontok közötti készállapotú egyenesek* hossza, nem szabad él–virtuális csúcs távolságok. A bal/jobb hajtás előjele csak a síkbeli orientációt változtatja, a `BA` a szög abszolút értékét használja. A profil iránya a lánc elejétől a végéig halad; induló pont `(0,0)` mm, induló tangens `(1,0)`, `x` jobbra, `y` matematikailag felfelé. Az SVG `y` tengelyét kizárólag megjelenítéskor kell megfordítani.

Az elméleti geometriai középfelület sugara `R+t/2`; az inner/outer körív sugara `R`/`R+t`. A `K` szerinti **alakváltozási** semleges ív `R+Kt` sugara a kiterítéshez tartozik, és nem tévesztendő össze a geometriai középfelülettel. A tangens irány a hajtás után `φ_next = φ + signedTurnDeg`; az ív a belépő tangensből és a kör középpontjából épül, nem éles töréssel rajzolandó. Az egyenesek és ívek belső/külső eltolása adja a lemez kontúrját; a végek a keresztmetszetet lezáró vastagsági szakaszok, de a profil topológiája nyitott marad.

Validáció: egyedi elem-ID-k; egyenletes vastagság; véges, pozitív méretek; `0 < |turn| < 180°`; érintési folytonosság; determinisztikus pont- és ívrekonstrukció; a vastagságkontúr nem önmetsző; nem szomszédos ív/szakasz nem érinti és nem metszi egymást (numerikus tolerancia dokumentált). A szándékosan zárt kör/korc, 180°-os visszahajtás, változó vastagság, ívelt vagy kúpos hosszanti forma és 3D sarok nem MVP. Az önmetszés ellenőrzése geometriai érvényesség, **nem** gépi ütközésvizsgálat.

## 5. Hajlítási matematika

Jelölések: `t` lemezvastagság mm, `R` kész belső hajlítási sugár mm, `θ = |signedTurnDeg|·π/180` a pozitív **elfordulási szög radiánban**, `K = d_neutral/t`, ahol `d_neutral` a belső felülettől a semleges tengelyig mért távolság. Ideális köríves, állandó vastagságú hajtásnál **MATHEMATICAL ASSUMPTION**: `BA = θ(R+Kt)`. Fokban ugyanez `BA = π(R+Kt)|turnDeg|/180`. A `K` nem univerzális; explicit, alkalmazható paraméter nélkül `BA=null`. A kiterített szélesség tangensméretekből `W = Σ straight.tangentLengthMm + Σ BA_i`. Minden hajtásra egyszer, azonos mértékegységben és a készalakhoz tartozó tényleges `R`-rel. A hosszanti kész elemhosszból ez önmagában **nem** ad beszerzési darabszámot; névleges téglalap alakú blankterület csak `W × explicit blankLength` mellett, vágási veszteség nélkül számolható.

Alternatív, hajtásonként explicit `BA` mód ugyanebben a tangensméret-szerződésben használható. Külső virtuális csúcsból mért méretek esetén `OSSB = (R+t)tan(θ/2)` a külső setback és `BD = 2·OSSB − BA`. Egyetlen L-profilnál, ha `A_out` és `B_out` a kész **külső éleken**, a két szabad végtől a két elméleti külső tangens metszéséig mért méret, `W = A_out+B_out−BD`. Ez azért azonos a tangensalakú képlettel, mert a két valódi egyenes `A_out−OSSB` és `B_out−OSSB`. Több hajtásnál csak akkor használható `Σ külső virtuális-csúcs szakaszhossz − Σ BD`, ha a külső csúcsokhoz tartozó mérési lánc minden hajtást pontosan egyszer számol, és a két szomszédos setback nem fogyasztja el a köztes egyenest. Vegyes belső/külső méretek és össze nem illő helyi dimenziók ilyen összegbe nem tehetők. Belső virtuális csúcs esetén a setback `R tan(θ/2)`; az ahhoz tartozó korrekció `BA−2R tan(θ/2)`, **nem** a külső `BD`. Első MVP-ben az ilyen méreteket csak teljesen dokumentált tangenskonverzió után szabad elfogadni; automatikus vegyes méretezés nincs.

Az explicit `BD` külön paraméterezési mód lehet később, de kizárólag külső virtuális csúcsméretekkel és alkalmazható szög/tengely-konvencióval. `BA`, `BD` és `K` ugyanarra a hajtásra nem adható össze. Ha többféle forrásérték érkezik, a kiválasztott módszer legyen explicit; eltérésnél konfliktushiba. **VERIFIED TECHNICAL FACT:** a SOLIDWORKS dokumentáció megkülönbözteti a `BA` és `BD` módszert; a fenti `OSSB`/`BD` kapcsolat e terv geometriai levezetése.

## 6. Méret- és szögkonvenció

| Fogalom | Ebben a tervben | Tilos összekeverni ezzel |
|---|---|---|
| `signedTurnDeg` | Az anyag középfelületi tangensének irányváltozása; bal pozitív, jobb negatív; abszolút értéke `0..180°` között | Belső nyílásszög vagy tetőhajlás |
| `includedAngleDeg` | A hajtás konkáv oldalán, a két kész érintő egyenes közötti helyi nyílásszög: `180°−|turnDeg|` | Előjeles fordulás; önmagában nem ad irányt vagy anyagoldalt |
| `θ` | `|turnDeg|·π/180` radián; **csak** ez kerül a radiános képletbe | Fokérték közvetlen behelyettesítése |
| `R` | Kész profil belső felületének sugara | Bélyeg orrsugara vagy külső sugár |
| `straight.tangentLengthMm` | Kész profil egyenes tangenciaponttól tangenciapontig, végszakasznál szabad végtől tangenciapontig | Külső vagy belső virtuális csúcsig mért kar |

90°-os elfordulásnál az egyszerű belső nyílásszög is 90°, ezért ez az eset önmagában **nem** teszteli a konvenciót. F9.6.3.1-ben külön nem derékszögű, előjeles és fok/radián teszt szükséges. `θ→180°` esetén `tan(θ/2)` divergens, ezért a virtuális csúcsos képlet a hem határán nem alkalmazható.

## 7. Anyag- és gépfüggőségek

**MACHINE-SPECIFIC PARAMETER:** tényleges belső sugár, minimális perem, legnagyobb hajlítási szög, szerszámnyílás, bélyeg- és matricaforma, befogási zóna, munkahossz, lemezvastagság-tartomány, korcolási/visszahajtási lehetőség és hajtási sorrend gép- és szerszámazonosítóval együtt értelmezhető. A visszarugózás anyag-, bevonat-, vastagság- és eljárásfüggő; célgeometria és gépi programozási szög külön mező legyen. A tényleges `R` nem feltétlenül a szerszám névleges sugara. A hajtások közötti kölcsönhatás, anyagfolyás és tűrésfelhalmozódás miatt a képlet pontossága nem fizikai pontossági garancia.

Jövőbeli `machineProfile` csak validált, verziózott rekordból adhat korlátot: gép/technológia ID, szerszámkészlet és verzió, anyagminőség/bevonat/vastagság tartomány, hajtási szög/sugár tartomány, mért `BA`/`BD` táblázat vagy kalibrált `K`, kalibrációs próbadarab és dátum, jóváhagyó, forrásdokumentum. Interpoláció csak a forrás által engedett tartományban és módszerrel; extrapoláció tiltott. A gépi eredmény „kalibrált”, nem „tanúsított”. Az általános katalógus `thicknessMm` mezője és szabad szöveges `technicalSpecs` önmagában nem kalibrációs rekord.

## 8. Nem támogatott gyártási szabályok

**UNVERIFIED REQUIREMENT:** minimális hajlítási sugár, maximális szög, minimális karimahossz, szerszám-felfekvés, más hajtás miatti ütközés, hajtási sorrend, gép munkahossza, vastagságkorlát, korc/visszahajtás, visszarugózás kompenzációja és bevonat sérülése. Gépadat nélkül ezekre **nem** adható „megfelel” státusz. Az MVP matematikailag ellenőrizheti a pozitív méretet, szög- és sugár-tartományt, kontúr-önmetszést, tangensek folytonosságát, külső méretből számolt nemnegatív egyeneseket, véges/ábrázolható eredményt. A 2D profilból nem ellenőrizhető vízzárás, rögzítés, hossz menti toldás, anyag teherbírása, szabvány- vagy gyártói megfelelőség. A hem/fold 180° körüli kettőzött rétege és belső rés nem helyettesíthető egyetlen köríves hajtással.

## 9. Javasolt domain bemeneti/kimeneti szerződés

**MATHEMATICAL ASSUMPTION — F9.6.3.1 javaslat, nem létező API:** `sheet_metal.profiles.flat-pattern` / `1.0.0`, külön verziózott Zod input- és output-séma a meglévő `CalculatorDefinition`-ben. A kanonikus hossz `mm`, a szög bemenete név szerint `deg`; számításkor radián. A meglévő `millimeters()` helper csak biztonságos **egész** mm-t fogad, a katalógus vastagsága pedig lehet tört mm: ezért a hajlítási modul saját, véges pozitív **tizedes mm** validátort használjon, egy előre dokumentált pontossági/maximum-határral. Belső számításban nincs köztes egészre kerekítés; kijelzés és export kerekítése külön szabály. `NaN`, végtelen, túl nagy szám és jelentős kerekítési veszteség hiba.

```text
input = {
  schemaVersion, profileId?, label, coordinateConvention:"x-right-y-up",
  dimensionConvention:"finished_tangent",
  thicknessMm, material?: {catalogVariantId?, materialSpec?, provenance},
  straights:[{id,tangentLengthMm,dimensionSource}],
  bends:[{id,signedTurnDeg,insideRadiusMm,
           allowance:{mode:"explicit_ba",baMm,source} |
                     {mode:"k_factor",kFactor,source} |
                     {mode:"unknown"}}],
  formedRunLengthMm?: number, notes?: string[]
}
output = {
  schemaVersion, geometry:{tangentPointsMm[], innerContour[],outerContour[],boundsMm,
                           selfIntersectionStatus},
  bends:[{id,turnDeg,thetaRad,innerRadiusMm,neutralRadiusMm?,
          allowanceMm|null,outsideSetbackMm?,bendDeductionMm?,sourceSnapshot}],
  flatPattern:{widthMm|null, bendLineOffsetsMm[]|null, method|null,
               classification,issues[]},
  classificationByField, issues[],inputSnapshot?, parameterSnapshot?
}
```

`straights.length = bends.length+1`; egyedi ID-k; explicit egység és mérési mód; szög abszolút értéke `(0,180)`, iránya előjeles; pozitív `R,t`; `K` fizikailag `[0,1]` intervallumú helyjelző, de **nincs alapérték**, és a forrás alkalmazhatóságát ettől függetlenül ellenőrizni kell. Explicit `BA>0`; `unknown` nem válik nullás `BA`-vá. Bármelyik hiányzó allowance a teljes `widthMm`-t `null`-ra állítja, de a geometria megmarad. A 2D síkbeli hajtási/teríték-sorrend az input sorrendje; `bendLineOffsetsMm` csak minden `BA` ismeretében számolható. A profil felhasználói elnevezése nem határozza meg automatikusan a geometriát.

Eredményosztályozás **mezőnként**: `GEOMETRICALLY_DETERMINED` az explicit geometriából adódó méretek és kontúr; `PARAMETER_BASED_ESTIMATE` a felhasználó/szállító által adott, de adott műhelyre nem kalibrált `BA`/`K` alapú teríték; `MACHINE_CALIBRATED` csak azonosított, aktuális gép–szerszám–anyag–vastagság–szög/sugár kombinációhoz visszavezethető mért kalibráció esetén; `INCOMPLETE` hiányzó szükséges adatnál; `UNSUPPORTED` modellen túli műveletnél. A matematikailag meghatározott ívhossz sem igazolt gyárthatóság. A számítás sikeres geometriával és `INCOMPLETE` terítékkel is visszatérhet; hibás geometria `INVALID_GEOMETRY`, hibás mező `VALIDATION_ERROR`/`INVALID_DIMENSION`, túlcsordulás `NUMERIC_OVERFLOW`, hem vagy zárt profil `UNSUPPORTED_OPERATION`. Figyelmeztetés: ismeretlen gép, katalógus-eltérés, kalibráció hiánya, stock/blank hiánya. A meglévő `ResultIssue` `code/severity/path` formátum használható.

Minden paraméterhez `source.kind` (`user_provided`, `catalog_snapshot`, `machine_calibration`, `demo`), forrás neve/URL/kiadás/dátum, alkalmazhatósági azonosítók, kézi felülírás és a tényleges érték snapshotja tartozzon. A katalógus `verified` jelzése nem azonos `MACHINE_CALIBRATED` státusszal. Az input és a kimenet sorozatosítható, determinisztikus; domainréteg nem kérdez adatbázist.

## 10. SVG architektúra

**MATHEMATICAL ASSUMPTION:** a tiszta domain geometriai kimenete mm koordinátákat ad; egy külön drawing adapter állít elő `line`/`arc`/`dimension`/`angle` primitíveket. Keresztmetszet: valódi belső/külső körívek `R` és `R+t` sugárral, tangenciális egyenesekkel, színezett hajtási iránnyal, külön vastagság- és sugárjelöléssel. A viewport `scale` és `translate` csak mm→SVG képernyőtranszformáció, a számok az eredmény snapshotjából jönnek; a méretfeliratok nem geometriai koordinátából visszaszámolt értékek. Nincs vizuális kedvért módosított sugár vagy élesre cserélt hajtás. Átfedő annotáció eltolható, a lemez kontúrja nem. Külön kapcsoló jelzi a „méretarányos geometria” és esetleges „sematikus felirat” réteget. Nem számolható terítéknél a flat-pattern panel eredmény nélkül és indokkal jelenik meg. Számolhatónál a szalag x-koordinátája kumulált tangenshossz+`BA`, a hajtáshelyek a modellből származnak; nincs szerszám- vagy vágásrajz állítás.

Újrahasznosítható a [tetőrajz viewport](../src/features/roof-models/drawing-viewport.ts) illesztés/pan/zoom logikája, rétegkapcsoló és akadálymentes címkézés; a korábbi szegély SVG mentett revízióból rajzoló és explicit „séma” jelölése volt ([az F9.59 eltávolítási előzménye](PROGRESS.md#f959--az-f958-audit-negy-megerositett-hibajanak-javitasa)). Ezekből nem vehető át a tetőgeometria vagy a lineáris szegély hosszgeometria profilmetszetként.

## 11. Független matematikai referenciaesetek

**Minden alábbi érték DEMO, kizárólag matematikai fixture, nem anyag- vagy gépajánlás.** A `q` az elkészült profil tangenciapontjai közötti/szabad véghez futó egyenes szakaszok mm-ben, az irány a 4. szakasz szerinti. A várt számok független `python3`/`math.pi` aritmetikával ellenőrizve 2026-10-13-án; a jövőbeli TS kalkulátor még nem futott. Tűrés a javasolt tesztben abszolút `1e-9 mm`, nem gyártási tűrés. Az „ismeretlen gép” minden számszerű sorban fennáll, így a teríték `PARAMETER_BASED_ESTIMATE`.

| Eset | DEMO bemenet és mérési mód | Képlet, elvárt eredmény | Feltétel / korlát |
|---|---|---|---|
| 1. Egy 90°-os hajtás | `q=[30,40]`, `t=1`, `R=1`, `turn=+90°`, `K=0,4`, tangens | `BA=(π/2)(1+0,4)=0,7π`; `W=70+0,7π=72,199114857513 mm` | Nincs gépi kalibráció |
| 2. Két hajtás | `q=[20,30,40]`, két `+90°`, mindkettő `t=1,R=1,K=0,4`, tangens | `W=90+2·0,7π=94,398229715026 mm` | Csak önmetszésmentes elrendezésnél |
| 3. Ellentétes irányok | mint 2., de `+90°,-90°` | `W=90+2·0,7π=94,398229715026 mm`; végső irány ismét 0° | Az előjel nem levonás a `BA`-ból |
| 4. Más vastagság | mint 1., de `t=2`, `K=0,4` | `BA=(π/2)(1+0,8)=0,9π`; `W=70+0,9π=72,827433388231 mm` | Azonos `K` csak DEMO összehasonlítás; fizikailag nem feltételezhető |
| 5. Explicit `BA` | `q=[30,40]`, `turn=+90°`, `R=1,t=1`, `BA=3 mm`, `K` hiányzik | `W=30+40+3=73 mm` | Felhasználói paraméter, nem kalibráció |
| 6. Hiányzó hajlítási adat | mint 1., `allowance.mode=unknown` | geometriai kontúr van; `BA=null`, `W=null`, `INCOMPLETE` | `K` nem helyettesíthető alapértékkel |
| 7. Külső csúcsméretek ellenőrzése | L: `A_out=40`, `B_out=50`, `t=1,R=1,turn=90°,K=0,4` | `OSSB=2`; tangens `38+48`; `BD=4−0,7π=1,800885142487`; `W=90−BD=88,199114857513 mm` | Ez **nem** a `q=[40,50]` tangens bemenet; a konverzió külön teszt |
| 8. Hibás geometria | külső csúcsok közti 1 mm szakasz, két szomszédos 90° hajtás, mindkét oldalon `OSSB=2 mm` | belső tangenshossz `1−2−2=−3 mm`; `INVALID_GEOMETRY`, nincs `W` | Nem javítható nullára csonkolással |
| 9. Numerikus határ | `q=[30,40]`, `t=1,R=1,K=0,4`, `turn=+0,001°` | `BA=1,4π/180000=0,000024434610 mm`; `W=70,000024434610 mm` | Nem nullázható kijelzési kerekítéssel; `turn=0°` elutasítandó |

Az ellenőrző tesztek külön fedjék a nem 90°-os included-angle konverziót, a jobb/bal rajzolást, az önmetszést, a `Number.MAX_SAFE_INTEGER` közeli bemenetet és a nem véges adatot. A gyártási megfelelés egyik fenti számsorból sem következik.

## 12. Kapcsolat a meglévő modulokkal

**VERIFIED TECHNICAL FACT (helyi kód, 2026-10-13):** a [production registry](../src/domain/calculations/registry.ts) kizárólag implementált kalkulátorokat regisztrál; az új azonosító csak F9.6.3.1 után vehető fel. A korábbi flashing domain Zod szerződést, verziót, eredetjelölést és `ResultIssue`-t használt; az érintett modulokat az [F9.59](PROGRESS.md#f959--az-f958-audit-negy-megerositett-hibajanak-javitasa) eltávolította; a [mértékegység-modul](../src/domain/measurements/units.ts) jelenlegi `millimeters` típusában csak egész mm megengedett. A [katalógus](../src/domain/materials/contracts.ts) `sheet_metal`/`flashing` kategóriát, tört `thicknessMm`-t, szabad `technicalSpecs`-et és provenance-t ad, de nem tipizált `K`/`BA`/kalibrációs táblát. A korábbi szegély SVG csak hossz-séma; a [revíziós adatmodell](DATABASE.md#f9622--szegelykalkulacios-perzisztencia) a mentett input/output snapshotot és dependencyt tartja meg.

F9.6.3.1-ben tiszta TS domain + registry; nincs perzisztencia. F9.6.3.3-ban a meglévő szervezet/projekt-kötött `calculations`/`calculation_revisions`/`calculation_dependencies` használata javasolt, külön keretrendszer helyett. A szerver ellenőrizze tagságot, szervezetet, projektet, aktuális revíziót, katalógusvariáns és anyagparaméter alkalmazhatóságát, majd mentéskor saját maga számoljon; expected revision/advisory lock vagy ekvivalens konkurenciavédelem; immutable input/output/source snapshot és stabil dependency. Egy katalógusváltozás új revíziót vagy stale jelzést igényel, történeti eredményt nem írhat felül. A meglevő flashing-mentés és takeoff RPC csak **minta**; a profilkalkulátorhoz külön célzott jogosultsági és konkurenciabizonyíték kell.

F9.6.3.4-ben a névleges keresztirányú blank-szélesség és explicit gyártási hossz alapján előzetes felület számolható, de kihozatal, táblakiosztás, hulladék, tömeg, ár és automatikus `piece`/`linear_meter`/`square_meter` átváltás csak külön forrásolt szabállyal. Az F9.6.2 szegély hosszrevízióját nem szabad automatikusan összekötni egy profillal azonos név alapján; explicit, szervezet/projekt-azonos, aktuális forráskapcsolat kell.

## 13. MVP-határ

**USER DECISION (javaslat):** egy felhasználó által szerkeszthető, nyitott, állandó vastagságú 2D profil; pozitív tangenciális egyenesek; legfeljebb kis, dokumentált elemszám; nem nulla, 180° alatti előjeles köríves hajtások; per-hajtás explicit `BA` vagy `K`, illetve „ismeretlen”; méretarányos keresztmetszet; csak teljes adatnál kiterített szélesség. Egyszerű L, U és önmetszésmentes egyedi profil. A megnevezett tetőszegély-kategóriák csak címkék, sablonméret nélkül. Nem MVP: automatikus külső/belső vegyes méretbevitel, 180° hem/korc, 3D oldalsó lezárás, gépszimuláció, rugózás-számítás, készletkiosztás, tanúsítás.

## 14. Megvalósítási fázisok

| Fázis | Cél és pontos terjedelem | Függőség / elfogadás | Kizárás |
|---|---|---|---|
| F9.6.3.1 | Pure TS geometriai lánc, analitikus körívek/kontúr, önmetszés és `BA`/`K` alapú teríték, Zod, registry, állapotok | A jelen terv méret- és szögkonvenciója lezárt; legalább a 9 DEMO eset + nem 90°/önmetszés/overflow független célzott teszt; determinisztikus output és hiánynál `null` | UI, adatbázis, gépkorlát, hem, takeoff |
| F9.6.3.2 | Profil-editor és méretarányos SVG; explicit tangensméret, hajtásirány/radius, provenance és hiányzó teríték kezelése | F9.6.3.1 stabil geometriai output; akadálymentes címkék, rajzi dimenzió és számítás egyezés, egy fókuszált böngészős smoke | Mentés, gyártási alkalmasság |
| F9.6.3.3 | Szervezet/projekt-kötött mentés, immutable revíziók, katalógusvastagság és paraméter-snapshot, stale jelzés | F9.6.3.2; szerveroldali újraszámítás, RLS/ownership, expected revision konkurencia, forrásalkalmazhatóság, historikus snapshot célzott DB tesztek | Gépi tanúsítás, automatikus anyagkihozatal |
| F9.6.3.4 | Explicit blankhossz és terítékszélesség alapján előzetes takeoff-draft, fókuszált elfogadás | F9.6.3.3; egységazonos katalógusvariáns, forrásrevízió/termékár snapshot, idempotens atomi átadás, approved immutabilitás és szakmai review | Vágásterv, hulladék-optimalizálás, tömeg/ár találgatása |

Ha egy kiválasztott műhely csak külső csúcsméreteket tud megadni, azok bevitelének konverzióját külön szűkített alfeladatként az editor előtt kell specifikálni és bizonyítani; a fázisok nem kapnak hallgatólagos dimenziókonverziót.

## 15. Nyitott műszaki döntések

1. **USER DECISION:** melyik mérési konvenciót tudják a pilot műhelyek ténylegesen mérni/megadni: tangens, külső virtuális csúcs vagy vegyes? Enélkül az editor bemeneti UX-e csak a fenti szűk tangens mód.
2. **USER DECISION:** első célanyag, technológia, gép/szerszám és pilot profil; konkrét kalibrációs adat gyűjtési módja és jóváhagyó személy.
3. **UNVERIFIED REQUIREMENT:** lemezvastagság a hordozó fémre vagy bevonattal együtt értendő-e adott terméknél; a katalógus `thicknessMm` sematikája nem elég egy gépkalibrációhoz.
4. **UNVERIFIED REQUIREMENT:** szakmailag elfogadható számítási/kijelzési pontosság, adatbeviteli tartomány és tolerancia; az `1e-9 mm` csak szoftveres teszttűrés.
5. **UNVERIFIED REQUIREMENT:** a machine table interpolációja, érvényességi idő, anyagbatch és szerszámkopás kezelése; jelenleg nincs adatforrás.
6. **USER DECISION:** a profil és F9.6.2 hosszrevízió összekapcsolása mely munkafolyamatban szükséges; felhasználói megerősítés nélkül nincs automatikus beszerzési tétel.

## 16. Bizonyíték és kutatási korlátok

**Bizonyított:** a fenti elsődleges gyártói/CAD dokumentumok elérhető állításai, a felsorolt helyi fájlok aktuális szerződése, valamint a DEMO képletek független standard Python aritmetikája. A SOLIDWORKS és az egyik PREFA oldal szövegét a kereső indexelt kivonata közölte; közvetlen megnyitásuk ebben a körben hiányos/hibás volt, így az ezeken túli részleteket nem tekintettem ellenőrzöttnek. **Nem futtatott:** Vitest, pgTAP, typecheck, lint, build, böngésző/UI, Docker és Supabase; nem készült alkalmazáskód vagy migráció. **Blokkoló a gyártási pontossághoz:** azonosított anyag–gép–szerszám kalibráció, mért próbadarab, aktív gyártói dokumentum és magyar kivitelezői review hiányzik. A BSI termékszabvány teljes, fizetős szövegét nem olvastam; relevanciája azonosított, részletes előírása nem ellenőrzött. Nem állítunk általános minimális sugarat, karimahosszt, `K` értéket, gyártási tűrést vagy szabványmegfelelést.
