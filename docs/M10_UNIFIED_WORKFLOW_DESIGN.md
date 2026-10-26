# M10 — Egységes munkafolyamat és adatátadás terv

**Dátuma:** 2026-10-26
**Típus:** DESIGN-ONLY. Nincs alkalmazáskód-, UI- vagy adatbázis-módosítás ebben a mérföldkőben.
**Alap:** [docs/CURRENT_SYSTEM_AND_WORKFLOW_AUDIT.md](CURRENT_SYSTEM_AND_WORKFLOW_AUDIT.md) (2026-10-26) + célzott forráskód-ellenőrzés (lásd Forrásjegyzék).

Jelölés a teljes dokumentumban: **[IMPL]** jelenleg implementált és bizonyított; **[ÚJ]** újonnan javasolt, nem implementált; **[ELLENŐRZENDŐ]** további vizsgálatot igényel megvalósítás előtt.

## 1. Vezetői összefoglaló

A rendszer ma kalkulátor-központú: a Kalkulátorok [IMPL] a fő belépési pont, a Munkanapló és a Projekt/Ügyfél modulok léteznek és működnek, de az önálló kalkuláció nem kapcsolódik automatikusan hozzájuk, és a kalkulátorok között nincs adatátadás. A fő súrlódás nem hiányzó modul, hanem **hiányzó összekötés**: azonos tetőgeometriát többször kell begépelni, és az önálló munka csak külön, utólagos lépésben köthető munkanaplóhoz vagy projekthez.

A terv **nem vezet be új munkafolyamat-kényszert**: a gyors önálló kalkuláció kötelező lépései nem nőnek. Két meglévő, bizonyítottan működő mintát terjesztünk ki:

1. **Explicit adatátvétel** — a `calculation_dependencies` tábla [IMPL] és a mentési panel mintája [IMPL] alapján egy új, de minimális "Adatok átvétele" vezérlő, amely a `ExecutionPlanLinkControl` [IMPL] mintáját követi: forrás kiválasztása, mezőleképezés megjelenítése, explicit megerősítés, eredet-jelölés a kitöltött mezőkön.
2. **Opcionális, utólagos kontextus-kapcsolás** — a meglévő munkanapló-link [IMPL] mintát (`execution_plan_document_links`) kiterjesztjük projekt/ügyfél irányba is, de **nem** tesszük kötelezővé a gyors kalkulációnál.

Javasolt első MVP (9. és 10. fejezet): **egy kalkulátorpár (roof.rafter-cut → roof.material-takeoff / roof.timber-cutlist) közötti explicit geometriaátvétel**, a meglévő `calculation_dependencies` táblára építve, új UI-vezérlővel, írás nélkül a célmezőkbe automatikusan — csak javaslatként, megerősítés után.

## 2. Tervezési alapelvek (rögzített követelmények)

Ezek nem vita tárgyát képezik ebben a tervben, a feladatkiírás szerint:

1. Nincs visszahozott külön Felmérés modul.
2. Önálló kalkuláció indítása marad lehetőség, kötelező előfeltétel nélkül.
3. Munkanapló opcionális marad.
4. A Projekt modul megmarad, nem nevezzük át, nem töröljük.
5. Mobil, helyszíni, gyors adatbevitel az elsődleges használati mód.
6. Egyszer megadott adatot ne kelljen újra begépelni, ahol ésszerűen lehetséges.
7. Mentett revíziók, snapshotok, forráshivatkozások megbízhatósága nem sérülhet.
8. Nincs indokolatlan új adatmodell vagy párhuzamos funkció.
9. A rendszer maradjon egyszerű, de szakmailag pontos.

Ezekből következik a tervezési döntés: **adatátadás = explicit, naplózott, megerősítést igénylő másolás**, nem élő szinkronizáció vagy automatikus felülírás. Ez összhangban van a meglévő revízió-architektúrával (7. elv) és a `calculation_dependencies` tervezési szándékával [IMPL], amely már ma is upstream/downstream kapcsolatot rögzít stale-jelzéssel, de **nem** ír át korábbi snapshotot.

## 3. Javasolt felhasználói munkafolyamatok

### 3.1 Gyors, önálló kalkuláció — [IMPL], változatlan

Honnan indul: Kalkulátorok (`/kalkulatorok`). Lépések, láthatóság, kötelező mezők: lásd audit 4/A. **Nem változik.** Nincs kötelező ügyfél/projekt/napló. A 4 menthető tetőkalkulátor (`roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist`, `roof.truss-members`) [IMPL] marad a mentési kör; a mentési lefedettség bővítése külön döntés (lásd 9. fejezet, P2).

**[ÚJ], opcionális lépés:** ha van a szervezetben kompatibilis, korábban mentett tetőgeometriai forrás, a kitöltetlen űrlap tetején egy halk, nem kötelező sáv jelenik meg: "Adatok átvétele mentett számításból". Elutasítható, alapértelmezés szerint nem akadályozza a gyors indítást.

### 3.2 Több, azonos tetőhöz kapcsolódó kalkuláció

**Ma [IMPL]:** a `roof.rafter-cut` mentett eredménye nem tölti fel a `roof.material-takeoff` vagy `roof.timber-cutlist` mezőit (audit 4/B). Közös domainkód van, de nincs felhasználói adatátadás.

**[ÚJ]:** a kompatibilis forrás kiválasztása után (lásd 5. fejezet mátrix) a rendszer:
- Honnan indul: bármelyik roof.* kalkulátor üres vagy részben kitöltött űrlapja.
- Lépés: "Adatok átvétele" → forrás-választó (szervezeten belüli, mentett, kompatibilis revíziók listája, legújabb elöl) → mezőleképezés előnézete (mi töltődik ki, mi marad kézi) → megerősítés.
- Mit lát: minden átvett mező mellett kis "eredet" jelző (forrás kalkulátor neve, revízió száma, dátum), ahogy a mentési panel ma is jelzi a revíziót [IMPL].
- Mit kell megadnia: csak a cél kalkulátor saját, nem átvehető mezőit (pl. anyagspecifikáció a material-takeoff-nál).
- Mi menthető: a cél kalkuláció a megszokott módon, saját revízióként; az átvétel ténye (forrás calculation_revision_id) `calculation_dependencies`-ben rögzül.
- Mi opcionális: az átvétel maga; kézi kitöltés mindig lehetséges marad.

### 3.3 Mentett kalkuláció folytatása — [IMPL], változatlan

Audit 4/E szerint működik: revízió-választás, ütközés-ellenőrzés, csendes felülírás nélkül. Nincs tervezett változás.

### 3.4 Kalkuláció munkanaplóhoz kapcsolása — [IMPL], kiterjesztés [ÚJ]

**Ma:** a mentési panelből a `ExecutionPlanLinkControl` segítségével pontos revízió köthető egy munkanaplóhoz [IMPL], `execution_plan_document_links` táblán keresztül.

**[ÚJ], ugyanaz a minta, projekt irányban:** ha a kalkuláció projekthez tartozik (roof_model forrásból vagy választott projektből), a projekt neve/ügyfele olvasható legyen ugyanazon a panelen, link nélküli, puszta kontextusként — nem új kapcsolati tábla, hanem a már létező `calculations.project_id` és `projects.client_id` felolvasása.

### 3.5 Anyagkimutatásból anyaglista és ajánlat — [IMPL], változatlan

Audit szerint működik (jóváhagyás → anyaglista → ajánlat, forrás-pillanatkép megmarad). Nincs tervezett változás.

### 3.6 Ügyfélhez kapcsolódó munka

**Ma [IMPL]:** ügyfél → projekt → ajánlat/napló lánc működik, de önálló kalkuláció nem örökli automatikusan (audit 4/D).

**[ÚJ], opcionális, utólagos:** a mentési panelen egy második, a munkanapló-linkkel azonos UI-mintájú, de projektre mutató választó ("Hozzárendelés projekthez"), amely a kalkuláció `project_id` mezőjét tölti ki — ez a mező már létezik és nullable (`ownership_scope = 'standalone'` esetén null) [IMPL]. Ez **nem** új tábla, csak egy meglévő, már nullable oszlop utólagos, felhasználó-kezdeményezett kitöltése egy action-nel. Nem kötelező, nem automatikus.

## 4. Kalkulátorok közötti adatátadási mátrix

### 4.1 Mely kalkulátorok között értelmes az átvétel

| Forrás | Cél | Értelmes? | Indoklás |
|---|---|---|---|
| roof.rafter-cut | roof.material-takeoff | Igen | Közös tetőgeometriai alapmezők (fél fesztáv, emelkedés, ereszkiülés, HAP). |
| roof.rafter-cut | roof.timber-cutlist | Igen | Azonos geometriai családot használ (audit 4/B). |
| roof.material-takeoff | roof.timber-cutlist | Igen | Mindkettő a tetőforma/méretek mezőit használja. |
| roof.material-takeoff / roof.timber-cutlist | roof.rafter-cut | Részleges | A visszafelé irány csak akkor értelmes, ha a cél mezői (fél fesztáv, emelkedés) azonos definícióval szerepeltek a forrásban; ellenőrzendő eset. |
| Önálló tetőgeometria (roof.gable/roof.geometry.*) | roof.rafter-cut / material-takeoff / timber-cutlist | Igen, de **[ELLENŐRZENDŐ]** | Az audit szerint ("A bemeneteket a külön űrlapok nem szinkronizálják általánosan") a mezőnevek és referenciapontok nem igazoltan azonosak; implementáció előtt mezőszintű egyeztetés kell. |
| Projekt tetőmodell (roof_models) | cserepeslemez/trapézlemez fedés | **Már működik [IMPL]** | Nem új igény, a meglévő projektági forrás-mechanizmust kell megtartani, nem duplikálni. |
| roof.truss-members | bármely másik | Nem | Eltérő geometriai modell (rácsos tartó, nem szarufás tető); nincs közös mező. |
| stair.*, concrete.* | bármi | Nem | Más szakterület, nincs közös mező a tetős kalkulátorokkal. |

### 4.2 Ténylegesen kompatibilis mezők (forráskód-ellenőrzéssel igazolva)

A `roof-calculator-definitions.ts` [IMPL] alapján a mezőnevek **kalkulátoronként eltérnek**, még azonos jelentés esetén is:

| Jelentés | roof.rafter-cut mező | Más roof.* kalkulátor mező | Megjegyzés |
|---|---|---|---|
| Fél fesztáv | `horizontalHalfSpanMm` | — (ellenőrzendő anyagkimutatásnál) | Azonos referenciapont: talpszelemen külső síkja → gerinctengely. |
| Gerincemelkedés | `riseMm` | — | Talpszelemen felső síkjától a felső élig. |
| Vízszintes ereszkiülés | `eaveProjectionMm` (rafter-cut) | `eaveOverhangMm` (material-takeoff családban) | **Más mezőnév, de a help-szöveg szerint azonos vízszintes referencia** — leképezés szükséges, nem egyszerű névegyezés. |
| HAP (talpszelemen feletti magasság) | `seatCutHeightMm` | `seatCutHeightMm` | Azonos mezőnév és `HAP_HELP`/`HAP_INPUT_LABEL` konstans mindkét definícióban — **ez a legbiztonsabb, egyből átvehető mező.** |
| Gerinckapcsolat, gerincdeszka/szelemen adatok | `ridgeJoint`, `ridgeBoardThicknessMm`, stb. | ugyanazok a kulcsok (a kód kommentje szerint: "Same keys and meaning as roof.rafter-cut") | Közvetlenül átvehető, forráskód-kommenttel megerősítve. |

**Következtetés:** nincs olyan mezőpár, ahol azonos névre lehetne névleges leképezés nélkül támaszkodni, kivéve a HAP- és csomóponti mezőket. **Minden átvételi szabályt explicit, kalkulátorpáronkénti leképezési táblaként kell kódolni** (forrás mező → cél mező, mértékegység-ellenőrzéssel), nem generikus "azonos nevű mező = azonos adat" logikával. Ez validálja a feladatkiírás figyelmeztetését.

### 4.3 Mely adatokhoz kell geometriai átszámítás

- **Vízszintes ereszkiülés névváltozatai** (`eaveProjectionMm` ↔ `eaveOverhangMm`): a help-szövegek alapján azonos vízszintes referenciasík, tehát **nincs szükség átszámításra**, csak mezőnév-leképezésre. Ezt implementáció előtt egy célzott egységteszttel kell megerősíteni (két kalkulátor help-szövegének és definíciójának összevetése), mert a jelenlegi audit csak a forráskód szövegére, nem futtatott viselkedésre támaszkodik.
- **Tetőhajlás vs gerincemelkedés:** a feladatkiírás kifejezetten figyelmeztet erre. A `roof.rafter-cut` `riseMm`-et használ (abszolút emelkedés mm-ben), míg más modulokban elvben hajlásszög (fok) is előfordulhat — ezt **[ELLENŐRZENDŐ]**, mert a jelenlegi grep csak a rafter-cut és rafter-joint családot vizsgálta, nem a teljes `roof.gable`/`roof.geometry.*` mezőkészletet. Átszámítás (emelkedés ↔ hajlásszög, félfesztáv ismeretében) szükséges lehet, és **csak akkor automatizálható, ha mindkét oldal referenciapontja igazoltan azonos**; ellenkező esetben az átvétel ezt a mezőt nem ajánlja fel, és kézi bevitelt kér.
- **Karmi/HAP:** a `seatCutHeightMm` már igazoltan azonos definíciójú — nincs átszámítás, csak másolás.

### 4.4 Hiányzó vagy ellentmondásos érték kezelése

- Ha a forrásban egy mező hiányzik (pl. opcionális Karmi-adat nincs kitöltve): a cél mezője üresen marad, nincs alapértelmezett kitalálás.
- Ha a forrás és a cél mezője **névleg** megfeleltethető, de a referenciapont nem igazolt azonosnak (pl. ereszkiülés-változatok, amíg a 4.3 pont ellenőrzése nem történt meg): a rendszer **nem ajánlja fel automatikus kitöltésre**, csak információként mutatja a forrásértéket, kézi átvétellel.
- Mértékegység-eltérés esetén (jelenleg nem azonosítva, de jövőbeli kalkulátoroknál előfordulhat): az átvétel blokkolva, hibaüzenettel, nem csendes konverzióval.

### 4.5 Az átvétel eredetének láthatósága

Minta: a mentési panel már ma is jelez forrás-revíziót és "nem frissül csendben" állapotot (audit 6. fejezet, "Kanonikus adatok és stale kezelés"). Az új vezérlő ugyanezt a mintát követi:
- Minden átvett mező mellett kompakt jelző: forrás kalkulátor neve + revízió száma.
- A kitöltés pillanatában másolt érték, nem élő referencia — ez a 7. alapelv (revízió-megbízhatóság) közvetlen következménye.

### 4.6 Mit tegyen a rendszer, ha a forrás később módosul

A forrás egy **konkrét calculation_revision_id**-re mutat, nem a kalkuláció "jelenlegi" állapotára. Ha a forrás revíziója frissül (új revízió jön létre), a már átvett cél-kalkuláció **nem** frissül automatikusan — ugyanaz a parity, amit a `calculation_dependencies`-re épülő projektági fedési modulok már ma betartanak ("stale forrás jelezhető, nem írja át csendben", audit 6. és 7. fejezet). Az átvétel UI-ja megjelenítheti, ha a forrás-revízió már nem a legfrissebb (ugyanaz a stale-jelző logika, amit a projektes takeoff-ágakhoz már megírtak), de ez a megjelenítés **[ELLENŐRZENDŐ]** a jelenlegi stale-jelző pontos implementációjának újrahasznosíthatóságára nézve.

### 4.7 Már mentett revíziók változatlansága

Garantált a jelenlegi snapshot-architektúra által: az átvétel csak a **célkalkuláció még nem mentett, aktuális munkamenet-állapotát** tölti ki. A forrás-revízió és minden korábban mentett cél-revízió érintetlen marad — nincs visszamenőleges írás.

### 4.8 Kell-e új adatmodell?

**Nem.** A `calculation_dependencies` tábla [IMPL] már támogatja `upstream_calculation_revision_id → downstream_calculation_revision_id` kapcsolatot, `dependency_type` szabad szöveggel (pl. `"field-transfer:roof.rafter-cut->roof.material-takeoff"`), szervezeti elkülönítéssel és egyedi indexszel az ismételt rögzítés ellen. **A meglévő tábla elegendő** az eredetrögzítéshez; új táblára csak akkor lenne szükség, ha mezőszintű (nem revízió-szintű) naplózást kellene tárolni — ez a mai igényhez nem indokolt (8. alapelv).

Amire **igen** szükség van, új, kis kódként:
- Egy kalkulátorpáronkénti, kódban rögzített mezőleképezési táblázat (nem adatbázis-tábla, hanem domain-konstans, hasonlóan a `catalog.ts` regiszteréhez).
- Egy UI-vezérlő ("Adatok átvétele"), a `ExecutionPlanLinkControl` mintájára.
- Egy server action, amely a kiválasztott forrás-revízió `input_snapshot`-jából a leképezett mezőket kiolvassa és visszaadja a kliensnek kitöltésre (nem ír adatbázisba, amíg a felhasználó nem menti a cél-kalkulációt).

## 5. Munkanapló / Projekt / Ügyfél kapcsolat

### 5.1 Munkanapló szerepe

Marad **opcionális munkakonténer**, nem kötelező kiindulópont (2. alapelv). Jelenlegi képessége (feladat, napi bejegyzés, fotó, kalkuláció-link) megfelelő; nincs indoklás a szerepkör bővítésére ebben a mérföldkőben.

### 5.2 Mentett kalkulációk kapcsolódása

Változatlan: a mentési panelből, pontos revízióval, `execution_plan_document_links`-en keresztül [IMPL].

### 5.3 Projekt modul újrahasznosítása

A `calculations.project_id` (nullable, `ownership_scope` mezővel kezelt [IMPL]) már ma is támogatja mind a projekthez kötött, mind az önálló kalkulációt. **Nincs szükség új kapcsolati táblára**: egy meglévő önálló kalkuláció utólagos projekthez rendelése a `project_id` és `ownership_scope` mezők update-je egy dedikált action-nel, ugyanazon jogosultsági szabályok mellett, mint a projekt-kalkulációk létrehozása.

### 5.4 Ügyfélkapcsolat helye

Marad a Projekt modulban (ügyfél → projekt), nincs tervezett közvetlen ügyfél-kalkuláció kapcsolat — a feladatkiírás 4. elve szerint a Projekt modult kell felhasználni, nem megkerülni.

### 5.5 Kalkuláció/anyaglista/ajánlat/kivitelezési dokumentáció kapcsolódása

Változatlan, a meglévő lánc (audit 6. fejezet, Adatkapcsolati térkép) megfelelő; nincs azonosított hiányosság, amit ez a mérföldkő orvosolna.

### 5.6 Kettős adminisztráció elkerülése

A fő kockázat ma nem a modulduplikáció, hanem a **mezőismétlés kalkulátorok között** — ezt a 4. fejezet adatátadási mechanizmusa célozza. A projekt/ügyfél/napló szintű adminisztráció jelenleg nem duplikált (egy projekt egy helyen létezik); nincs azonosított szükséglet architekturális változásra ezen a szinten.

## 6. Architekturális alternatívák és választás

**A alternatíva — Explicit, revízió-alapú adatátvétel (javasolt).** A `calculation_dependencies` és a meglévő snapshot-architektúra kiterjesztése kis UI- és server-action réteggel. Költség: alacsony (nincs új tábla, nincs séma-migráció a core adatmodellben, csak a dependency_type konvenció bővítése). Kompatibilitás: teljes, mert additív. Felhasználói egyszerűség: magas, mert a minta (`ExecutionPlanLinkControl`) már ismert a felhasználóknak.

**B alternatíva — Közös "munka-munkaterület" (work session) entitás**, amely egy helyszíni munkát egyetlen rekordként fogna össze (geometria + ügyfél + napló + kalkulációk), és minden kalkulátor ebből a közös objektumból olvasna/írna élő referenciával. Költség: magas (új tábla, migrációs terv a meglévő `calculations`/`roof_models` kapcsolatokhoz, RLS újratervezés). Kompatibilitási kockázat: magas, mert élő referencia sérti a 7. alapelvet (revízió-megbízhatóság) — egy közös, élő tetőadat módosítása visszamenőleg érintené a már mentett kalkulációkat, hacsak nem vezetünk be egy második snapshot-réteget a snapshot-réteg felett, ami ellentmond a 8. alapelvnek (nincs indokolatlan párhuzamos funkció).

**Választás: A alternatíva.** A B alternatíva elvi szinten kényelmesebb élményt adna, de a jelenlegi revízió- és snapshot-garanciák (audit 6-7. fejezet) elleni legnagyobb kockázatot ez jelentené, és a termékalapelvek (7., 8.) kifejezetten ez ellen szólnak. Az A alternatíva a meglévő architektúrára épít, kis, tesztelhető lépésekben vezethető be, és bármikor visszavonható UI-szinten.

## 7. Mobil-first UI/UX terv

Meglévő minták újrahasznosítása: Liquid Glass komponensek, `GlassDisclosure` (fokozatos feltárás) [IMPL], a mentési panel státuszjelzései [IMPL].

| Művelet | Képernyő/elem | Megjegyzés |
|---|---|---|
| Kalkuláció indítása | Változatlan `/kalkulatorok` választó | Nincs új kötelező lépés. |
| Korábbi adatok átvétele | **[ÚJ]** Halk, elutasítható sáv az űrlap tetején, csak ha van kompatibilis forrás; megnyitva egy `GlassDisclosure` panel forrás-listával és mezőleképezés-előnézettel. | Mobilon egy képernyőn, görgethető lista; nem modal, hogy a visszalépés ne vesszen el. |
| Számítás megtekintése | Változatlan élő előnézet + rajz. | — |
| Mentés és újranyitás | Változatlan mentési panel. | Az átvett mezők mellett eredet-jelző chip. |
| Munkanaplóhoz rendelés | Változatlan `ExecutionPlanLinkControl`. | — |
| **[ÚJ]** Projekthez rendelés | Ugyanazon panelen, a munkanapló-link alatt, azonos vizuális minta (választó + státusz). | Opcionális, összecsukható alapértelmezésben. |
| Következő kapcsolódó művelet | **[ÚJ]**, kis javaslat-sáv mentés után: "Ebből a tetőgeometriából indítható: anyagkimutatás / vágáslista", ha van kompatibilis cél-kalkulátor. | Csak javaslat, nem navigációs kényszer. |

A cél üzenet minden képernyőn olvasható marad: *Mit számolok most* (kalkulátor neve és státusz), *honnan származnak az adataim* (eredet-chipek), *mit csinálhatok az eredménnyel* (mentés, link, javasolt következő lépés).

## 8. Fázisokra bontott megvalósítási terv

### Fázis 0 — MVP: roof.rafter-cut → roof.material-takeoff/timber-cutlist HAP és gerinckapcsolati mezőinek átvétele

- **Cél:** bizonyítani az explicit átvétel mechanizmust a legbiztonságosabb mezőkörön (HAP, gerinckapcsolat — igazoltan azonos definíció, 4.2 pont).
- **Érintett modulok:** `construction-save-panel.tsx` (UI-belépés), új server action a `construction-actions.ts` mellett, `calculation_dependencies` tábla (meglévő, nincs migráció).
- **Adatmodell-változás:** nincs. Legfeljebb egy rögzített `dependency_type` érték-konvenció dokumentálása.
- **Fő UI/UX módosítás:** "Adatok átvétele" vezérlő egy kalkulátorpárra korlátozva.
- **Kompatibilitási kockázat:** alacsony — új, opcionális UI-ág, nem érinti a meglévő mentési/validációs logikát.
- **Teszt/elfogadás:** egységteszt a mezőleképezésre (forrás input_snapshot → cél mezőérték), célzott komponensteszt az átvétel UI-ra, kézi smoke-teszt mobil nézetben.
- **Függőség:** nincs.

### Fázis 1 — Mátrix bővítése a teljes roof.* körre, beleértve a tetőgeometria-ellenőrzött mezőket

- **Cél:** a 4.1-4.3 pontban "[ELLENŐRZENDŐ]"-ként jelölt mezők (ereszkiülés-névváltozat, hajlás/emelkedés referenciapont) tisztázása és leképezése, miután a tényleges `roof.gable`/`roof.geometry.*` mezőkészlet forráskód-szintű ellenőrzése megtörtént.
- **Érintett modulok:** ugyanazok, bővített leképezési táblázattal.
- **Kompatibilitási kockázat:** közepes — rossz referenciapont-feltételezés hibás geometriát eredményezhetne; ezért minden új mezőpárhoz explicit egységteszt kell a help-szövegek/referenciapontok alapján, nem vizuális ellenőrzéssel.
- **Függőség:** Fázis 0 mechanizmusára épül.

### Fázis 2 — Projekthez utólagos rendelés az önálló kalkulációból

- **Cél:** 3.6/5.3 pont szerinti opcionális projekt-hozzárendelés.
- **Érintett modulok:** mentési panel, egy új, kis server action a `project_id`/`ownership_scope` frissítésére, a meglévő jogosultsági szabályok mellett.
- **Adatmodell-változás:** nincs (meglévő, nullable oszlopok kitöltése).
- **Kompatibilitási kockázat:** alacsony, de **[ELLENŐRZENDŐ]**: a `ownership_scope` constraint pontos viselkedése frissítéskor (lásd `20261014010000_standalone_calculation_persistence.sql` check constraint) — implementáció előtt meg kell vizsgálni, hogy a meglévő check constraint enged-e `standalone → project` átmenetet update-tel, vagy csak insertkor érvényesített.
- **Függőség:** független Fázis 0/1-től, párhuzamosítható.

### Fázis 3 — Stale-jelzés az átvett mezőkhöz

- **Cél:** 4.6 pont szerinti, "forrás később módosult" jelzés az átvételi UI-ban.
- **Érintett modulok:** átvételi vezérlő, a projektági fedési modulok már meglévő stale-jelző logikájának újrahasznosításával.
- **Kompatibilitási kockázat:** alacsony, pusztán olvasási/megjelenítési réteg.
- **Függőség:** Fázis 0-1 után, mert stale-jelzéshez már léteznie kell a dependency-rekordnak.

## 9. Kockázatok és nyitott döntések

- **[ELLENŐRZENDŐ]** A `roof.gable`/`roof.geometry.*` és a fedési kalkulátorok (cserepeslemez, trapézlemez) teljes mezőkészlete nem lett soronként összevetve ebben a tervben a rafter-cut családdal; ez a Fázis 1 előfeltétele.
- **[ELLENŐRZENDŐ]** A hajlásszög vs. gerincemelkedés referenciapont-azonossága — amíg nincs igazolva, a rendszernek **nem szabad** automatikus átszámítást felajánlania ezekre a mezőkre.
- **Nyitott döntés (P2 az auditból):** a 27 nem-tetős suite kalkulátor mentési lefedettségének bővítése nem része ennek a tervnek; külön döntés kell, hogy szükséges-e egyáltalán.
- **Nyitott döntés:** a gutter/flashing kalkulátorok UI-elérhetősége (audit P2) nem része ennek a tervnek.
- **Kockázat:** ha a leképezési táblázatot túl általánosan (generikus "azonos névre illesztés") implementálnánk, az sértené a 4.2 pontban igazolt eltérő mezőnév-konvenciókat — a tervben rögzített explicit, kalkulátorpáronkénti leképezés ezt kizárja, de fejlesztéskor be kell tartani.
- **Kockázat:** a `calculation_dependencies` egyedi indexe (`downstream, upstream_calculation_revision_id`) egy downstream-hez csak egy adott upstream-revízióból enged egy kapcsolatot; ha egy cél-kalkuláció több forrásból vesz át mezőket (pl. geometria egyik kalkulátorból, anyagspecifikáció másikból), ez több dependency-sort jelent — ez **nem ütközik** a sémával (a unique index nem egy downstreamre korlátoz egy sort), de implementáció előtt egy célzott teszttel kell megerősíteni.

## 10. Ajánlott első MVP

**Fázis 0** (8. fejezet): a `roof.rafter-cut` HAP és gerinckapcsolati mezőinek (`seatCutHeightMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`) explicit átvétele a `roof.material-takeoff` és `roof.timber-cutlist` kalkulátorokba, a meglévő `calculation_dependencies` táblára építve, új "Adatok átvétele" UI-vezérlővel a mentési panel mintájára. Ez valódi felhasználói értéket ad (a leggyakrabban ismételt, legbiztonsabban leképezhető mezőkör), minimális kockázattal (nincs sématömb-változás, nincs automatikus felülírás), és bizonyítja a mechanizmust a további fázisokhoz.

## Forrásjegyzék

- Audit: [docs/CURRENT_SYSTEM_AND_WORKFLOW_AUDIT.md](CURRENT_SYSTEM_AND_WORKFLOW_AUDIT.md)
- Meződefiníciók: [src/features/calculators/roof-calculator-definitions.ts](../src/features/calculators/roof-calculator-definitions.ts)
- Menthető kalkulátorok: [src/features/calculators/construction-computation.ts:175](../src/features/calculators/construction-computation.ts)
- Mentési panel és munkanapló-link minta: [src/features/calculators/construction-save-panel.tsx](../src/features/calculators/construction-save-panel.tsx), [src/features/execution/execution-plan-link-control.tsx](../src/features/execution/execution-plan-link-control.tsx)
- Kalkuláció-napló kapcsolat: [src/features/execution/execution-calculation-links.ts](../src/features/execution/execution-calculation-links.ts)
- Séma: [supabase/migrations/20261012010000_versioned_calculation_architecture.sql](../supabase/migrations/20261012010000_versioned_calculation_architecture.sql) (calculation_dependencies, calculations.project_id, roof_models), [supabase/migrations/20261014010000_standalone_calculation_persistence.sql](../supabase/migrations/20261014010000_standalone_calculation_persistence.sql) (ownership_scope, project_id nullable)

---

**Javasolt Conventional Commit:** `docs(M10): add unified workflow and cross-calculator data transfer design`

## Összefoglalás

A tervezett megoldás nem új modult vezet be, hanem a már működő revízió- és függőségi (`calculation_dependencies`) architektúrára építve egy explicit, megerősítést igénylő "Adatok átvétele" mechanizmust ad a kalkulátorok közé, és a meglévő, már nullable projekt-kapcsolatot teszi utólag, opcionálisan kitölthetővé. Az első javasolt lépés egy kis, önállóan tesztelhető MVP: a `roof.rafter-cut` HAP/gerinckapcsolati mezőinek átvétele a tetőanyag- és vágáslista-kalkulátorokba, mert ez a legbiztonsabban igazolt, azonos jelentésű mezőkör, és valódi, azonnali ismétlésmentesítést ad a felhasználónak kockázat nélkül.
