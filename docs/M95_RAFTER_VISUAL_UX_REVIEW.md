# TetőPro M9.5: szarufarajzok vizuális és használhatósági auditja

**Audit dátuma:** 2026-10-25  
**Audit státusza:** COMPLETE, a javaslat elkészült; alkalmazáskód nem változott  
**Vizsgált állapot:** a jelenlegi, nem commitolt M9.5 munkafa  
**Hatókör:** `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`  
**Kimenet:** UX-audit és megvalósítási terv, implementáció nélkül

## 1. Vezetői döntés

A jelenlegi első megjelenítés azért nem megfelelő, mert a HAP segédábra a `Szarufa kiszabása` alapmezői között teljes rácsszélességű elemként jelenik meg. Üres vagy részleges űrlapnál ez lesz a képernyő legerősebb vizuális eleme, miközben még nincs számított szarufa. A felhasználó elsődleges célja ezzel szemben a számított geometria és a kiszabási méretek megtekintése.

**Döntési javaslat:**

- A HAP pontos címkéje és egy mondatos mérési definíciója maradjon közvetlenül a mezőnél.
- A HAP-ábra kerüljön alapból csukott, billentyűzettel is kezelhető `HAP mérési segédlet` disclosure-ba.
- Ne legyen kizárólag lebegő tooltip vagy ikon mögé rejtve. Telefonon a hover nem használható, a szakmai referencia pedig túl fontos egy csak hoverre épülő mintához.
- Az ábra megnyitva is másodlagos maradjon. Ne legyen nagyobb vizuális súlya, mint a számított szarufarajznak.
- A számított szarufa áttekintője legyen az első rajz. A kiválasztott talp-, derék- vagy gerinccsatlakozás részlete kövesse. A kiosztási és térbeli nézetek csak azután jelenjenek meg.
- A `RafterDetailDrawing` térbeli közeli nézet ne legyen alapból nyitott. Nem mutat bevágási kontúrt, és több adatot megismétel a tetősík-layoutból.

Ez megőrzi a CRR-01 biztonsági javítását, de visszaadja a helyes prioritást: **adatok megadása, számított szarufa, kiszabási méretek, részletes segítség**.

## 2. Vizsgálati módszer és bizonyíték

### 2.1 Függetlenül ellenőrzött

- A munkafa nem tiszta. A meglévő M9.5 módosításokat és az új `hap-figure.tsx` fájlt változatlanul megőriztem.
- A jelenlegi komponenssorrendet és CSS-t közvetlenül a forrásból ellenőriztem.
- A felhasználó által küldött, 3420 × 2214 képpontos sötét témájú képernyőképet vizuálisan ellenőriztem.
- A védett helyi alkalmazást a meglévő hitelesített Brave munkamenetben megnyitottam. Széles desktop, sötét téma és üres űrlap mellett mindhárom kalkulátorra átváltottam, majd az eredeti `Szarufa kiszabása` nézetet visszaállítottam.
- A böngészőben az üres állapotoknál látható sorrend egyezett a forrás sorrendjével. A HAP ábra a `Szarufa kiszabása` nézetben az opcionális mezők és a hiányos állapot előtt jelent meg.
- A friss [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) releváns elveit ellenőriztem: szemantikus disclosure, látható fókusz, 44 px körüli érintési célok, mobilon elsődleges tartalom előre, nem csak hoverrel elérhető segítség.

### 2.2 Forrásból bizonyított

| Tény | Bizonyíték |
|---|---|
| A HAP-ábra közvetlenül a HAP mező után renderelődik | `src/features/calculators/construction-suite.tsx:281-290` |
| A HAP-ábra a teljes űrlaprácsot átfogja | `src/app/globals.css:5176`, `grid-column: 1 / -1` |
| A `Szarufa kiszabása` nem a közös `RoofWorkspace` sorrendjét használja | `src/features/calculators/construction-suite.tsx:403-405` |
| Ebben a kalkulátorban az eredmények a fő rajz előtt renderelődnek | `src/features/calculators/construction-suite.tsx:405` |
| A két anyagos kalkulátorban a rajz az eredmények előtt van | `src/features/roof-models/roof-workspace.tsx:23-27` |
| Az anyagos rajzcsomag jelenlegi sorrendje: közös metszet, tetősík-layout, térbeli közeli nézet, általános tetőrajz | `src/features/calculators/construction-suite.tsx:338-347` |
| A HAP szakmai definíciója közös és egyértelmű | `src/domain/calculations/construction/rafter-joints.ts:27-29` |
| A közös metszet tartalmaz áttekintőt, jelölési listát, csatlakozásválasztót, részletrajzot és kiszabási lépéseket | `src/features/calculators/rafter-joint-drawing.tsx:379-441` |
| A tetősík-layout külön megismétli a hossz-, hajlás-, darab- és végvágási adatokat | `src/features/calculators/rafter-layout-drawing.tsx:79-129` |
| A térbeli közeli nézet nem rajzol csomóponti bevágást | `src/features/calculators/rafter-detail-drawing.tsx:20`, `125-158` |

### 2.3 Nem függetlenül újrafuttatott

- A szabályozható in-app böngészőben a védett oldal hitelesített tartalma nem volt elérhető, ezért a 375 × 812, 812 × 375 és körülbelül 1440 px kontrollált viewportokat ebben az auditban nem futtattam újra.
- Világos témára nem váltottam át, mert ez a felhasználó jelenlegi megjelenítési beállítását módosította volna.
- Teljesen kitöltött adatállapotot nem hoztam létre a felhasználó munkamenetében, ezért nem állítom, hogy a kész rajzokat ebben a munkamenetben minden állapotban böngészőből igazoltam.
- A `docs/PROGRESS.md` M9.5 szakasza 375 × 812, landscape, desktop, világos és sötét ellenőrzést jelent. Ez hasznos korábbi bizonyíték, de ebben az auditban nem tekintem független újrafuttatásnak.

## 3. Design read és célkarakter

**Értelmezés:** helyszíni és műhelyi B2B számítási felület tetőfedő és ács szakembereknek, visszafogott műszaki CAD vizuális nyelvvel, `ENERGY 1 / RHYTHM 2 / MOTION 1` beállítással.

| Döntés | Egy mondatos indok |
|---|---|
| Egyetlen elsődleges rajz | A felhasználónak egyértelmű belépési pont kell a számított geometriához. |
| Sötét és világos téma megtartása | A projekt már mindkét témát támogatja, a helyszíni fényviszonyok eltérnek. |
| Meglévő narancs márkaakcentus és műszaki kék kiemelés megtartása | Az akcentusok már jelentést hordoznak, új színrendszer nem szükséges. |
| Nyugodt, tömör tipográfia | A méretek gyors leolvasása fontosabb, mint a dekoratív karakter. |
| Szerkezeti térközök, kevés nyitott panel | A görgetési hossz és az információs zaj csökken, miközben a szakmai részletek elérhetők maradnak. |
| Kártya csak önálló funkcionális egységhez | A sok egymásba ágyazott felület helyett a rajz, a méretlista és a kiválasztó kap külön szerepet. |
| HAP-ábra disclosure-ban | A mérési referencia megmarad, de nem versenyez a számított eredménnyel. |
| Minimális mozgás | Csak disclosure-, kiválasztás- és fókuszállapot kell; dekoratív animáció nem segíti a kiszabást. |

## 4. A jelenlegi első megjelenítés elemzése

### 4.1 Mi működik jól

- A HAP címkéje, rövid magyarázata és ábrája szakmailag ugyanazt a referenciát közli.
- A mezőhöz tartozó segítség `aria-describedby` kapcsolattal elérhető.
- A fő rajzok számított domaingeometriából készülnek, nem kézzel duplikált számokból.
- A részletválasztók szemantikus gombok, `aria-pressed` állapottal.
- A rajzok billentyűzettel nagyíthatók és mozgathatók, a fókusz látható.
- Hiányzó vagy érvénytelen geometria esetén nem készül megtévesztő vágási rajz.
- A szakmai korlátozások szövegként is megjelennek, nem csak színnel.

### 4.2 Miért túl hangsúlyos a HAP-ábra

1. A `HapFigure` az alapadat-rács teljes szélességét elfoglalja, noha az SVG legfeljebb 22 rem széles.
2. A magas, fekvő ábra és a felirat együtt önálló tartalmi szakasznak látszik, nem mezősegítségnek.
3. A képernyőképen az ábra nagyobb területet kap, mint az összes alapmező együtt.
4. Üres űrlapnál a felhasználó még nem kap eredményt, mégis hosszú szakmai magyarázatot kell átgörgetnie.
5. Ugyanaz az információ háromszor jelenik meg: a mező hosszú címkéjében, a mező alatti helpben és a képaláírásban.
6. A valóban fontos eredmény a `Szarufa kiszabása` esetén később következik: állapot, visszaírt inputok, eredménytáblák, csomópontpanel, majd a fő rajz.

### 4.3 Mobilhatás

Forrás alapján a HAP-ábra mobilon is teljes sort kap. A rajzok saját vásznai 15 és 26 rem közötti magasságot is elfoglalhatnak. Ha egymás után több rajz nyitott, a felhasználó hosszú görgetés után jut a kiválasztott csatlakozás bevágási adataihoz.

Mobilon ezért nem egy kisebb, állandó HAP-ábra kell, hanem ugyanaz a rövid szöveg és egy 44 px magas, teljes szélességű disclosure. Megnyitva az ábra teljes tartalomszélességen jelenhet meg, de természetes oldalgörgetéssel és belső vízszintes scroll nélkül.

### 4.4 Desktop-hatás

Desktopon a szélesség jelenleg nem oldja meg a prioritási problémát. Az ábra ugyan csak 22 rem széles, de a teljes rácssort lefoglalja, miközben a jobb oldali tér üres marad. A kívánt desktop-elrendezés a fő rajzot és a legfontosabb méretlistát használja egymás mellett, nem a HAP-segédletet nagyítja fel.

## 5. Kalkulátoronkénti rajzi leltár

### 5.1 Szarufa kiszabása

**Jelenlegi elemek:**

1. Alapmezők.
2. Teljes szélességű HAP-ábra.
3. Opcionális csomópontmezők.
4. Állapot, input-visszanézet, fő eredmények és `Csomópontok` panel.
5. `RafterJointDrawing`:
   - teljes szarufa áttekintő;
   - jelölési helyek listája;
   - talp-, derék- és gerinccsatlakozás választó;
   - kiválasztott részletrajz;
   - bevágási számok és kijelölési lépések;
   - összes méret és szög disclosure;
   - jelmagyarázat és akadálymentes összefoglaló.
6. Mentés és revízió.

**Értékelés:** a fő rajz szakmailag jó alap, de túl későn jelenik meg. A `Csomópontok` panel és a részletrajz alatti méretlista több helyen ugyanazokat az értékeket mutatja.

**Ajánlott rajzi sorrend:**

1. `RafterJointDrawing` teljes szarufa áttekintő.
2. Mellette vagy alatta rövid fő méretlista.
3. Csatlakozásválasztó és a kiválasztott részletrajz.
4. `Ennyit kell bevágni` és kijelölési lépések.
5. Összes csomópontadat, szakmai korlátok és mentés.
6. HAP-ábra csak a mezőnél nyitható segédletként.

### 5.2 Tetőanyag-kimutatás

**Jelenlegi rajzi elemek szarufaanyag és számítható geometria esetén:**

1. `RoofJointDrawing`: egy vagy két tetőoldal közös metszete, csatlakozásokkal.
2. `RafterLayoutDrawing`: tetősíkonkénti kiterített geometriai szarufavonalak.
3. `RafterDetailDrawing`: 2 vagy 3 tengely térbeli közeli nézete, bevágási kontúr nélkül.
4. `ConstructionDrawing`: általános tetőgeometriai rajz.

**Értékelés:** a HAP-probléma itt csak a `Részletes számítás` megnyitása és a csatlakozásszámítás bekapcsolása után jelenik meg, tehát kisebb, de ugyanaz a teljes szélességű komponens. A négy nyitott rajz közül a térbeli közeli nézet adja a legkevesebb új kiszabási információt.

**Ajánlott rajzi sorrend:**

1. Anyagkimutatás fő eredményei.
2. `RoofJointDrawing`, ha csatlakozásszámítás aktív.
3. `RafterLayoutDrawing`, ha szarufaanyag aktív.
4. Kiválasztott csatlakozás részlete.
5. `További nézetek` disclosure-ban a `RafterDetailDrawing` és az általános `ConstructionDrawing`.

Az anyagkimutatás elsődleges célja a mennyiség. A rajz itt ellenőrző és értelmező eszköz, nem előzheti meg a legfontosabb anyageredményt.

### 5.3 Tetőszerkezet faanyag és vágáslista

**Jelenlegi rajzi elemek:** ugyanaz a négy komponens, mint az anyagkimutatásban. A faanyag-kiosztás miatt ezek alapvetőbbek, de a térbeli közeli nézet továbbra is részben ismétlés.

**Ajánlott rajzi sorrend:**

1. Vágáslista és a kritikus hiányok rövid összefoglalója.
2. `RoofJointDrawing`, ha csatlakozásszámítás aktív.
3. `RafterLayoutDrawing` a darab-, osztás- és hosszcsoportokkal.
4. Kiválasztott csatlakozás részlete és kijelölési lépései.
5. `További nézetek` disclosure-ban a térbeli közeli és az általános tetőrajz.

Itt a vágáslista és a rajz egy közös elsődleges eredményblokk lehet. Desktopon a lista és az áttekintő egymás mellett, mobilon a lista után az áttekintő jelenjen meg.

## 6. Vizuális redundancia és összevonási döntések

| Elem | Döntés | Indok |
|---|---|---|
| `HapFigure` | Megtartani, alapból összecsukni | CRR-01 miatt szükséges, de nem elsődleges eredmény. |
| HAP mező alatti `HAP_HELP` | Megtartani | Ez a leggyorsabb és képernyőolvasóval is elérhető referencia. |
| `RafterJointDrawing` áttekintő | Megtartani és előre hozni | Ez mutatja a tényleges számított szarufát, támaszokat, hosszakat és vágási helyeket. |
| `RoofJointDrawing` kétoldali metszet | Megtartani elsődleges tetős rajzként | Nyeregnél egy képen mutatja a két szemközti oldalt, duplikált címkék nélkül. |
| Csatlakozás részletrajz | Megtartani, egy kiválasztott részlettel | A nagyított vágáskontúr és a bevágási méretek helyszíni értéket adnak. |
| `RafterLayoutDrawing` | Megtartani másodlagos rajzként | Más kérdésre válaszol: hány vonal, milyen osztás és hosszcsoport. |
| `RafterDetailDrawing` | Alapból összecsukni | Bevágási kontúrt nem mutat, a hossz és osztás a layoutban is szerepel. |
| Általános `ConstructionDrawing` | `Tetőforma és síkok` néven összecsukni | Hasznos inputellenőrzés, de nem a kiszabás elsődleges rajza. |
| `RafterJointsPanel` | Rövidíteni vagy disclosure-ba tenni | Értékei megismétlik a rajz alatti részletes méreteket. A mentett adat- és állapotjelentést meg kell őrizni. |

Az összevonás nem domainadatok törlését jelenti. Ugyanaz a számított érték maradjon egyetlen forrásból elérhető, de alapnézetben csak egy helyen kapjon erős vizuális hangsúlyt.

## 7. Ideális információs hierarchia

Minden kalkulátor ugyanazt a magas szintű sorrendet kövesse:

1. **Kontextus:** cím és egy rövid mondat a kalkulátor céljáról.
2. **Alapadatok:** a számításhoz szükséges mezők.
3. **Opcionális szakmai adatok:** szelemenek, gerinckapcsolat, anyagprofil, csukott disclosure-ban.
4. **Számítási állapot:** hiány vagy hiba esetén közvetlen, javítható lista; teljes állapotnál tömör státusz.
5. **Elsődleges eredmény:** a kalkulátor célja szerinti fő táblázat és rajz.
6. **Kiválasztott részlet:** egyetlen csatlakozás nagyított nézete.
7. **Kiszabási lépések:** csak a kiválasztott csatlakozáshoz.
8. **Részletes számok és további nézetek:** disclosure-ban.
9. **Szakmai korlátozások:** mindig látható rövid összefoglaló, részletes lista szükség szerint.
10. **Mentés és revízió:** az eredmény és korlátozások után.

### Állapot szerinti viselkedés

| Állapot | Alapból látható |
|---|---|
| Üres | Alapmezők, rövid HAP-definíció, hiányzó kötelező mezők tömör listája. Nincs üres rajzkeret. |
| Részleges | Azonnali, mezőhöz köthető hiányjelzés. A HAP-ábra továbbra is csukott. |
| Teljes | Fő eredmény és elsődleges rajz kerül előre. A teljes státuszüzenet egy soros. |
| Érvénytelen | Rajz helyett konkrét ok és javítási irány. Mentés tiltva marad. |
| Nem támogatott rész | A támogatott eredmény látható, a korlát a rajz és a mentés közelében is megmarad. |

## 8. Javasolt mobil elrendezés

```text
[Cím + rövid cél]
[Alapmezők, egy oszlop]
[HAP rövid definíció]
[HAP mérési segédlet ▾]
[Opcionális csatlakozási adatok ▾]
[Állapot / javítandó mezők]

[Elsődleges eredmény]
[Teljes szarufarajz]
[Fő méretek]

[Tetőoldal, ha van]
[Talpszelemen] [Derékszelemen] [Gerinc]
[Kiválasztott részletrajz]
[Ennyit kell bevágni]
[Kijelölési lépések]

[További méretek és nézetek ▾]
[Korlátozások]
[Mentés és revízió]
```

Mobil követelmények:

- Egyetlen függőleges dokumentumscroll legyen, beágyazott görgetős rajzlista nélkül.
- Egyujjas mozdulat mindig az oldalt görgesse. Kétujjas nagyítás és a meglévő gombok maradhatnak.
- A csatlakozásválasztók legalább 44 px magasak maradjanak, és törjenek több sorba.
- A rajzfeliratok ne legyenek kisebbek a jelenlegi olvasható műszaki minimumuknál. A hosszú értékek a rajz melletti listába kerüljenek, ne egymásra a vásznon.
- A kiválasztott részlet legyen az egyetlen nyitott nagyított rajz.
- A HAP-ábra megnyitása ne tolja oldalra a tartalmat és ne hozzon létre vízszintes scrollt.

## 9. Javasolt desktop elrendezés

```text
[Cím és rövid cél]
[Alapadatok két oszlopban] [Opcionális adatok ▾]
[Állapot]

[Elsődleges szarufarajz      ][Fő méretek és jelölési helyek]
[Tetőoldal és csatlakozásválasztó teljes szélességben]
[Kiválasztott részletrajz    ][Bevágási számok és lépések]

[További méretek és nézetek ▾]
[Korlátozások]
[Mentés és revízió]
```

Desktop követelmények:

- A fő rajz kapja a nagyobb, körülbelül 60-65 százalékos oszlopot; a méretlista a kisebb oldalsávot.
- A HAP-segédlet ne foglaljon teljes rácssort alapállapotban.
- A rajz és a hozzá tartozó méretek ugyanabban a vizuális blokkban maradjanak.
- A pontmintás globális háttér a műszaki rajz közvetlen vászna alatt legyen tompítva vagy fedve egyszínű felülettel. A méretvonalaknak és szaggatásoknak tiszta háttér kell.
- Az általános tetőrajz és a térbeli közeli nézet ne versenyezzen a fő keresztmetszettel.

## 10. A HAP-segédlet pontos célkialakítása

### Alapállapot

```text
HAP: szarufa felső élének magassága a talpszelemen felett
[érték] [mm | cm | m]
Függőlegesen mérd a talpszelemen felső síkjától a szarufa felső éléig,
a külső függővágási síkban. Nem a bevágás mélysége.
[HAP mérési segédlet ▾]
```

### Nyitott állapot

- A jelenlegi `HapFigure` rajz maradjon.
- A négy referencia maradjon félreérthetetlen: talpszelemen felső síkja, külső függővágási sík, szarufa felső éle, függőleges HAP.
- A `Vázlat, nem méretarányos` közlés maradjon.
- Az ábra és a képaláírás ne ismételje szó szerint a teljes mezőhelp szövegét. A képaláírás csak a nem méretarányos jelleget és a referenciapontot foglalja össze.
- A disclosure összefoglalója legyen szöveges. Ha ikon is van, dekoratív legyen vagy kapjon megfelelő akadálymentes nevet.
- Hibás vagy hiányos HAP esetén a mező hibája ne a disclosure belsejében legyen. A segítség opcionálisan automatikusan kinyitható, de a hibajavítás ne függjön tőle.

### Azonos megoldás mindhárom kalkulátorban

- `Szarufa kiszabása`: a HAP mező alapadat, a disclosure alapból csukott.
- `Tetőanyag-kimutatás`: a HAP mező továbbra is a bekapcsolt csatlakozásszámítás alatt jelenik meg, a belső HAP disclosure csukott.
- `Faanyag és vágáslista`: ugyanaz, mint az anyagkimutatásban.

Külön desktop és mobil komponens nem szükséges. Ugyanaz a szemantikus szerkezet kapjon eltérő CSS-rácsot.

## 11. Megtartandó architektúra

- `calculateRafterJoints` maradjon az S1, S2 és S3 számok közös forrása.
- `createRafterJointDrawingModel` és `roofSectionViews` maradjon a rajzi geometria forrása.
- `mirrorRafterJointDrawingModel` maradjon a kétoldali nyeregtető-áttekintőhöz.
- `RafterJointDrawing` és `RoofJointDrawing` maradjon a fő keresztmetszet és részlet alapja.
- `RafterLayoutDrawing` maradjon a tetősíkonkénti vonal-, osztás- és hosszcsoport-ábra.
- `CutGuide` maradjon a kijelölési sorrend és a három fő bevágási szám megjelenítője.
- A közös hosszformázás, egységváltás, kamera, zoom, pan, pinch és billentyűzetes működés maradjon.
- A teljességi státusz, `jointStatus` provenance, immutable revízió, szervezeti jogosultság és konkurenciakezelés nem változhat.

Nem indokolt új rajzmotor, canvas-könyvtár, diagramcsomag vagy külön design rendszer bevezetése.

## 12. Prioritások

### P1: első megjelenítés és szakmai fókusz

1. A HAP-ábra kerüljön alapból csukott disclosure-ba, a rövid mérési definíció maradjon a mezőnél.
2. A `Szarufa kiszabása` fő rajza kerüljön a részletes eredménypanelek elé.
3. A `RoofJointDrawing` legyen az első nyitott szarufarajz a két anyagos kalkulátorban, amikor csatlakozási adat elérhető.
4. A kiválasztott csatlakozás részlete és az `Ennyit kell bevágni` blokk közvetlenül kapcsolódjon a fő rajzhoz.

### P2: redundancia és görgetési hossz

5. A `RafterDetailDrawing` és az általános tetőrajz kerüljön közös `További nézetek` disclosure-ba.
6. A `Csomópontok` panel teljes kártyalistája kerüljön a fő rajz után, összecsukható részletes adatként, vagy olvadjon a jobb oldali méretlistába.
7. A HAP mezőhelp és képaláírás szöveges ismétlését csökkenteni kell a szakmai jelentés megtartásával.
8. Mobilon egyszerre csak egy nagyított csatlakozási rajz legyen nyitott.

### P3: vizuális tisztaság

9. A műszaki rajz vászna kapjon nyugodt, egyszínű közvetlen hátteret a globális pontminta fölött.
10. A rajzra csak geometriai tájékozódáshoz szükséges felirat kerüljön. A hosszú szakmai szöveg és az összes szám a mellette vagy alatta lévő listába kerüljön.
11. A desktop rács használja ki a szélességet a rajz és méretlista párhuzamos megjelenítésére.

## 13. Szakmai és biztonsági korlátok

A vizuális egyszerűsítés nem rejtheti el az alábbiakat:

- A HAP függőleges mérés a talpszelemen felső síkja és a szarufa felső éle között, a külső függővágási síkban.
- A rajz geometriai számítás, nem statikai, gyártási vagy kivitelezési jóváhagyás.
- A kontyél- és vápaszarufa nincs a jelenlegi layoutban, összetett vágásuk nem számított.
- A nem modellezett szelemenméret és kapcsolati adat vázlatos marad.
- Érvénytelen vagy hiányos geometria nem jelenhet meg kész vágási rajzként.
- A talpszelemenre illeszkedés geometriai ellenőrzés, nem teherbírási vagy megengedett bevágási döntés.
- A mentett eredménynek továbbra is őriznie kell a forrás-inputot, a `jointStatus` okát, a revíziót és a korlátozásokat.
- A státusz nem közölhető kizárólag színnel.
- A disclosure és a csatlakozásválasztó billentyűzettel, látható fókuszállapottal használható maradjon.

## 14. Minimális végrehajtási terv Claude számára

### Hatókör

Csak prezentációs sorrend és megjelenítés változhat. Nem része a feladatnak:

- domainképlet vagy kerekítés módosítása;
- mező- vagy snapshot-szerződés módosítása;
- adatbázis, migráció, RLS vagy mentési RPC módosítása;
- új rajztípus vagy új csomag bevezetése;
- tetőszerkezeti framing logika bővítése;
- kontyél-, vápaszarufa- vagy manzárdcsomópont számítása.

### Javasolt megvalósítási lépések

1. **Komponens-tesztek először:** rögzítsék a HAP rövid definícióját, a csukott segédletet, a számított rajz és részletes eredmények DOM-sorrendjét, valamint a három kalkulátor eltérő elsődleges eredményét.
2. **HAP progresszív feltárás:** a jelenlegi `HapFigure` kerüljön a meglévő `GlassDisclosure` vagy szemantikus `details` alá. A `HAP_LABEL` és `HAP_HELP` maradjon közös forrás.
3. **Szarufa-kiszabási sorrend:** a `RafterJointDrawing` kerüljön a fő eredmények és a teljes `RafterJointsPanel` elé. A legfontosabb méretek maradjanak a rajzzal egy blokkban.
4. **Anyagos rajzcsomag:** a `RoofJointDrawing` és `RafterLayoutDrawing` maradjon nyitott, a `RafterDetailDrawing` és `ConstructionDrawing` kerüljön `További nézetek` disclosure-ba.
5. **Duplikáció csökkentése:** a `RafterJointsPanel` alapnézete csak állapotot és korlátozást mutasson, a teljes értéklista csukott részbe kerüljön. A `CutGuide` három fő bevágási számát ne duplikálja még egy nyitott kártyasor.
6. **Reszponzív CSS:** mobilon egy oszlop, desktopon fő rajz és méretlista két oszlop. A HAP disclosure teljes szélességű gomb, de az ábra csak nyitva foglaljon sort.
7. **Célzott ellenőrzés:** a meglévő komponens- és domain-tesztek után 375 × 812, 812 × 375 és körülbelül 1440 px viewport, világos és sötét téma, üres, részleges és teljes állapot, S1, S2, S3, kétoldali nyereg. Ellenőrizni kell a DOM-sorrendet, a fókuszt, az egyujjas oldalgörgetést, a 44 px érintési célokat, a feliratütközést és a vízszintes túlcsordulást.

### Elfogadási feltételek

- Alapállapotban egyik kalkulátorban sem látható nagy HAP-ábra.
- A HAP pontos egy mondatos definíciója mindig látható a mezőnél.
- A HAP disclosure billentyűzettel nyitható, és megnyitva tartalmazza mind a négy mérési referenciát.
- Teljes számításnál az első nyitott szarufarajz a tényleges számított áttekintő.
- A kiválasztott csatlakozás vágáskontúrja és bevágási számai közvetlenül egymás mellett vagy egymás alatt jelennek meg.
- A térbeli közeli nézet és az általános tetőrajz nem nyitott alapból.
- 375 px-en nincs vízszintes túlcsordulás, és a rajzról egy ujjal tovább lehet görgetni az oldalt.
- Világos és sötét témában a szöveg, a vágásél, a méretvonal és a fókuszjelzés kontrasztja megmarad.
- A számítás, mentett snapshot, jogosultság, revízió és szakmai korlátozás változatlan.

## 15. Rövid átadási összefoglaló

Az M9.5 rajzi motorját és számításait nem kell újratervezni. A fő probléma prezentációs: túl korán és túl nagy méretben jelenik meg a HAP-segédlet, miközben a számított szarufarajz későre kerül, az anyagos kalkulátorok pedig túl sok nyitott rajzot sorolnak egymás után.

A legkisebb teljes javítás a meglévő komponensek átrendezése és progresszív feltárása:

1. HAP-ábra disclosure-ba.
2. Számított szarufa előre.
3. Egy kiválasztott csatlakozási részlet nyitva.
4. Térbeli és általános nézetek összecsukva.
5. Duplikált méretkártyák rövidítve.

Ezzel a CRR-01 biztonsági tartalma megmarad, miközben a felület egyszerűbb, rövidebb, mobilon könnyebben görgethető és műszaki szempontból fókuszáltabb lesz.
