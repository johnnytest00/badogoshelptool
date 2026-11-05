# TetőPro P3.4 – szakmai munkafolyamat-hatékonysági E2E DEMO

**Mérés dátuma:** 2026-11-04  
**Környezet:** helyi fejlesztői alkalmazás, hitelesített `admin1@testadmin.com`, `DEMO TetőPro Kft.`, kizárólag DEMO-adatok  
**Fixture:** `tests/fixtures/drawings/roof-workflow-p31-demo.pdf`  
**Elsődleges viewport:** 375×812  
**Végső minősítés:** **PARTIALLY IMPROVED**

## A. Vezetői összefoglaló

A vizsgált nyeregtetőn a P3.3 fejlesztések **kevesebb bizonytalan navigációval és a visszatérő munkánál lényegesen kevesebb kézi adatbevitellel** vezettek el a referenciaazonos anyagkimutatásig. Az egyszeri, kézi anyagbeállításos A út azonban csak mérsékelten lett rövidebb: a P3.1 legalább 40 vezérlőaktiválásához képest 39 aktiválást mértünk, miközben a 16 összehasonlítható üzleti mezőszerkesztés nem csökkent. A fő javulás itt a legalább hét távoli navigációs szakasz kiváltása négy célzott ugrással.

A legnagyobb felhasználói értéket a **P3.3c anyagadat-újrahasználat** adta: 14 numerikus anyagmező és a forrásmegnevezés ismételt szerkesztése megszűnt. Az A és B közötti összehasonlítható kézi mezőszerkesztés 16-ról 1-re csökkent (−15; −93,8%), az anyagfázis összes megfigyelhető interakciója 24-ről 8-ra csökkent (−16; −66,7%).

Az előny jelenleg nem teljes értékű: az azonos típusú, P3.1-es `roof.material-takeoff` forrásból átvett B kalkuláció **nem menthető**. Az élő felület engedi és helyesen végrehajtja az átvételt, de a mentési RPC forrás–cél pármátrixa elutasítja az azonos kalkulátortípust. Két idempotens mentési kísérlet ugyanazzal a 42501 hibával bukott. Az A · V1 mentés ettől függetlenül sikeres, visszanyitható és változatlan maradt.

A B forrását használat előtt ellenőriztük: `Tetőanyag-kimutatás – szarufa, léc, alátét, fedés · DEMO - teljes nyeregtető · V1`, revíziódátum 2026-10-31. Az előnézet a jelen jelentés E szakaszában felsorolt 14 numerikus anyagparamétert, a fektetési irányt és a DEMO-forrást mutatta; az aktuális felhasználó forráslistájából választottuk.

A rajzos út ismétlődő, feliratozott terv és újrahasználható anyagprofil esetén ad valós előnyt. Egyszeri, egyszerű nyeregtetőn, kézi anyagbevitellel továbbra sem bizonyult egyértelműen gyorsabbnak a hagyományos kalkulátoros útnál.

## B. Összehasonlító mérési tábla

| Mutató | P3.1 baseline | P3.4/A – kézi anyagadatok | P3.4/B – újrahasznált anyagadatok |
|---|---:|---:|---:|
| Vezérlőaktiválások | ≥40 | **39** V1 mentésig | **38** első mentési kísérletig; V1 BLOCKED |
| Távoli navigáció | ≥7 | **0**; 4 célzott ugrás | **1**; 4 célzott ugrás |
| Hosszú, helyi űrlap/panel bejárása | nincs külön mérve | 1, anyagűrlap | 1, anyagátvételi előnézet |
| Kézi mezőszerkesztések, P3.1-kompatibilis üzleti definíció | 16 | **16** | **1** |
| Tényleges mezőbeírás a fő úton, a két kalibrációs hosszal együtt | NOT RECORDED | **18** | **3** |
| Numerikus anyagparaméter-bevitelek | 14 | **14** | **0** |
| Biztonsági jóváhagyások | nincs külön mérve | **3** | **4** |
| Anyagkimutatás | 85,45 m²; 28; 27; 2; 40 | **egyezik** | **egyezik** |
| Mentési állapot | P3.1 · V1 | **PASS: A · V1 mentve és visszanyitva** | **BLOCKED: 42501 az átvett forrás mentésekor** |

### Két külön hatás

- **P3.1 → P3.4/A:** a baseline alsó korlátjához képest legalább 1 vezérlőaktiválással kevesebb; az összehasonlítható kézi mezőszerkesztés változatlanul 16. A legalább 7 távoli navigáció 0-ra csökkent, de a fizikai swipe-ok száma böngészőautomatizálással nem mérhető hitelesen.
- **P3.4/A → P3.4/B:** 39 → 38 vezérlőaktiválás (−1; −2,6%), 16 → 1 összehasonlítható mezőszerkesztés (−15; −93,8%). A vezérlőaktiválás és üzleti mezőszerkesztés együtt 55 → 39 (−16; −29,1%).
- **Csak az anyagfázis:** A = 9 aktiválás + 15 mezőszerkesztés = 24 interakció; B = 8 aktiválás + 0 mezőszerkesztés = 8 interakció. Nyereség: −16, azaz −66,7%.

A P3.1 `≥40` és `≥7` értékei alsó korlátok, ezért ezekből nem képezhető pontos százalékos javulás. A B 38-as értéke a sikertelen első mentési kísérletet tartalmazza, nem sikeres V1-et.

## C. Részletes folyamatmérés

Az alábbi mezőszám a tényleges beírásokat tartalmazza, így a két ismert kalibrációs hossz is szerepel benne. Az automatizálási hibakeresés, DOM-lekérdezés, képernyőkép, javító kattintás és mentési újrapróbálás nincs a pozitív útba számítva. A natív fájlválasztót az automatizálás kezelte, de a felhasználó által szükséges fájlkiválasztást egy aktiválásként számoltuk.

| Fázis | A aktiválás | B aktiválás | A / B mezőbevitel | A / B távoli navigáció | A / B jóváhagyás | Eredmény |
|---|---:|---:|---:|---:|---:|---|
| A. Belépés és lapellenőrzés | 7 | 7 | 0 / 0 | 0 / 0 | 0 / 0 | PDF, 1. lap Tetőterv, 2. lap Alaprajz, vissza az 1. lapra |
| B. Tetőszakasz és hatókör | 5 | 5 | 1 / 1 | 0 / 0 | 1 / 1 | kijelölés, fedettség, teljes tető scope |
| C. Kalibráció és geometriai átvitel | 14 | 14 | 2 / 2 | 0 / 0; 1-1 célzott ugrás | 1 / 1 | két független referencia; A: 0,30%, B: 0,00% eltérés; 10 000 / 6 000 / 35° / 500 mm |
| D. Vezetett alapértékek | 1 | 1 | 0 / 0 | 0 / 0 | 1 / 1 | 3 látható érték egy atomi művelettel |
| E. Anyagok | 9 | 8 | 15 / 0 | 0 / 1; 1-1 hosszú helyi bejárás; 1-1 célzott ugrás | 0 / 1 | A: kézi; B: P3.1 V1 forrás, explicit material approval |
| F. Eredmény | 1 | 1 | 0 / 0 | 0 / 0; 1-1 célzott ugrás | 0 / 0 | teljes eredmény elérhető, referenciaazonos |
| G. Mentés | 2 | 2 | 0 / 0 | 0 / 0; 1-1 célzott ugrás | 0 / 0 | A PASS; B BLOCKED |
| **Összesen** | **39** | **38** | **18 / 3** | **0 / 1** | **3 / 4** | A teljes; B számítás teljes, mentés blokkolt |

### Navigációs megfigyelés

A négy célzott ugrás mindkét úton: **Lépték**, **Anyagadatok**, **Teljes eredmény**, **Mentés**. A P3.4/A-ban nem kellett távoli panelt keresni. A B-ben az anyagbeviteli résztől a lap alján lévő `Adatok átvétele` panelhez egy logikai távoli átmenet maradt; az előnézet áttekintése hosszú, de egy panelen belüli folyamatos bejárás. A locátorok automatikus görgetése miatt a fizikai swipe-szám **NOT TESTED**.

### Jóváhagyások

- A: meglévő 0 mm ereszkiülés felülírása; három látható alapérték atomi elfogadása; teljes tető hatókör.
- B: az A három jóváhagyása + az anyagadatok külön átvételi jóváhagyása.
- A fedettség választása jelenleg külön megerősítés nélkül `coverageConfirmed` állapotot hoz létre; ezt nem számoltuk külön biztonsági jóváhagyásnak.

## D. P3.3 fejlesztések hatásvizsgálata

| Fejlesztés | Státusz | Mért hatás és használati érték | Mellékhatás / biztonság |
|---|---|---|---|
| P3.3a – élő eredménysáv | **PASS** | A és B alatt 85,45 m² / 28 / 27 / 6 / 40 azonnal látható; `Teljes eredmény` célzott ugrás. Hossz törlésekor a sáv eltűnt és a mentés hiányossá vált; visszaállításkor újraszámolt. | Az `Alátétfólia 6 db` csíkot jelent, miközben a szakmai fő mennyiség 2 tekercs; a kompakt jelölés félreérthető. |
| P3.3b – fekvő mobilnézet | **PASS** | 812×375: alkalmazásnav 0 px, hasznos viewport 375 px, előnézet 296,23 px, canvas 294,23 px; nincs vízszintes overflow. | Böngészőemuláció, fizikai érintés nincs bizonyítva. |
| P3.3c – anyagadat-újrahasználat | **PARTIAL / E2E FAIL** | 14/14 numerikus paraméter, fektetési irány, forrásmegnevezés és 2 kiosztási paraméter átkerült; 15 kézi szerkesztés megszűnt; `requested` csoportok helyesen nem másolódtak; provenance/DEMO-jelölés megmaradt. | Azonos típusú forrás után a mentés 42501-gyel blokkolt. Az élő E2E így nem fejezhető be. |
| P3.3d/d.1 – lépéssáv | **PASS** | 375×812: 160,95 px; 812×375: 92,80 px. A következő lépés látható, a részletes státusz elérhető, az anyag és mentés megtalálható. | A B anyagforrás-panelhez nincs közvetlen ugrás. |
| P3.3e – mentési tájékoztató | **PASS** | A mentési panel helyben, egyértelműen közli: a kalkulációs revízió mezőket és anyagadatokat ment, a PDF/szakasz/kalibráció nem része; ezekhez külön `Munkaállapot mentése` kell. | A B valódi mentési hibaüzenete túl általános, és jogosultsági problémát sugall szerződésütközés helyett. |
| P3.3f – atomi alapérték-jóváhagyás | **PASS** | A valós 500 mm ereszkiülés megadása után pontosan a három látható érték maradt, és egy aktiválással elfogadható volt. A valós érték megadási útja megmaradt. | A jóváhagyási kör nem bővült rejtett értékre. |

### Reszponzív smoke

| Nézet | Eredmény |
|---|---|
| 375×812 | `scrollWidth=375`; lépéssáv 160,95 px; PDF-előnézet 210,63 px; canvas 208,63 px. A rajz használható, de az anyagátvételi előnézet hosszú. |
| 812×375 | `scrollWidth=812`; lépéssáv 92,80 px; PDF-előnézet 296,23 px; canvas 294,23 px. A P3.3b nyeresége megmaradt. |
| 1440×900 | `scrollWidth=1440`; stabil desktop elrendezés, vízszintes túlcsordulás nélkül. |

Fizikai érintéses működés, mobil billentyűzet és valódi eszközfókusz **NOT TESTED**; emulált nézetben reprodukálható fókusz- vagy vízszintes túlcsordulási hiba nem jelentkezett.

## E. Szakmai eredmények

| Eredmény | P3.1 referencia | P3.4/A | P3.4/B | Minősítés |
|---|---:|---:|---:|---|
| Teljes tetősíkfelület | 85,45 m² | 85,45 m² | 85,45 m² | PASS |
| Szarufák | 28 db | 28 db / 119,636 m | 28 db / 119,636 m | PASS |
| Lécsorok | 27 db | 27 db / 270 m | 27 db / 270 m | PASS |
| Fóliatekercsek | 2 db | 2 db; 6 csík / 60 m / 90 m² | 2 db; 6 csík / 60 m / 90 m² | PASS |
| Fedőtáblák | 40 db | 40 db; 20 oszlop / 176 m² névleges | 40 db; 20 oszlop / 176 m² névleges | PASS |

Az A és B bemenetei azonosak: 10 000 × 6 000 mm, 35°, 500 mm oldalsó ereszkiülés, 0/0 mm homlokzati kiülés, nyeregtető; 800/350 mm kiosztás; 80×200 és 50×30 mm fa keresztmetszet; 1500×50 000 mm fólia 100/100 mm átfedéssel; 1100/1000 és 4000/3900 mm fedőtábla. A kimenet geometriai/kiosztási eredmény, nem statikai igazolás és nem végleges beszerzési mennyiség.

## F. Biztonsági regresszió

| Ellenőrzés | Eredmény | Bizonyíték |
|---|---|---|
| P3.2 negatív 1: `0,50 m ereszkiülés` → `Tető szélessége` | **PASS** | A 6000 mm szélesség nem változott; szemantikai ellentmondásra explicit figyelmeztetés és jóváhagyási kapu jelent meg, majd visszavonás történt. |
| P3.2 negatív 2: aktív kalibrált mérés + `10,00 m`, korábbi hátsó kiülés cél | **PASS** | A mérés prioritást kapott, a gyors cél törlődött, gyorsátvitel nem történt; a felirat csak mérési összevetésre lett kijelölve. |
| Meglévő 0 mm felülírása | **PASS** | 0 → 500 mm csak `Jóváhagyás és átvitel` után. |
| Atomi alapértékek scope-ja | **PASS** | A kártya a jóváhagyás előtt pontosan 3 értéket mutatott; csak ezek kerültek elfogadásra. |
| Forrás és mértékegység visszakövethetősége | **PASS** | A gyorsátvitel forrásszövege, egysége és előző értéke látható; az anyagadatok `Kézi` és DEMO provenance címkéje megmaradt. |
| Alaprajzi scope | **PASS, korlátozott** | A 2. lap `Alaprajz` besorolást kapott, és onnan automatikus tetőméret-átvitel nem történt. Külön adversariális falméret-kattintást nem ismételtünk. |
| Érvénytelen bemenet és mentési kapu | **PASS** | Hossz törlésekor az élő eredmény eltűnt, a mentés hiányos lett; visszaállítás után regenerálódott. |
| Kalkulátorspecifikus anyagadat | **PASS** | `Szarufa kiszabása` nézetben az anyagkimutatási sáv és az alátétfólia-vezérlő eltűnt; visszaváltáskor a takeoff állapot helyreállt. |
| B forrásfüggőség mentése | **FAIL** | Azonos típusú forrásnál az RPC pármátrixa 42501-et ad; a felület ezt nem előzi meg. |

Az aktuális forráslista csak az aktuális felhasználó számára elérhető DEMO-elemekkel lett használva. Valódi cross-user/cross-org RLS-próba **NOT TESTED**; ez továbbra is külön, célzott DB-integrációs feladat. A mockolt jogosultsági teszt nem tekinthető valódi RLS-bizonyítéknak.

### Célzott automatizált ellenőrzés

A rajzi eredménysáv, lépéssáv, gyorsátvitel, tervátvitel, anyagátvitel, mentési panel, kalkulátorváltás és construction action célzott készlete: **32 suite / 113 teszt PASS, 0 bukás**. A teljes 1534-es regresszió, TypeScript, ESLint és production build nem futott újra, mert alkalmazáskód nem változott. A célzott készlet nem használ valódi DB-integrációt, ezért a P3.3c mentési szerződésütközését nem észlelte.

## G. UX problémák és akadályok

### 1. P1: Az újrahasznált, azonos típusú anyagprofil nem menthető

- **Reprodukció:** új `roof.material-takeoff` → P3.1 `DEMO - teljes nyeregtető · V1` előnézet → anyagadatok explicit jóváhagyása → teljes eredmény → mentés.
- **Tényleges eredmény:** két idempotens próbán `A számítás vagy a műhely nem érhető el...`; nincs B · V1.
- **Gyökérok:** a UI engedi a same-type forrást, de `supabase/migrations/20261027020000_construction_field_transfer_source_guard.sql:59-66` a `v_source_calculator_type is distinct from p_calculator_type` feltétellel elutasítja. A `src/features/calculations/construction-actions.ts:83-85` ezt általános 42501 üzenetre fordítja.
- **Felhasználói hatás:** a 15 mezőnyi nyereség után a munkát nem lehet lezárni; bizalomvesztő, mert a hiba csak mentéskor derül ki.
- **Javaslat:** a UI- és DB-pármátrix egységesítése, majd valódi DB-integrációs teszt same-type material transfer → save → reopen útvonalra.

### 2. P2: Az anyagátvétel belépési pontja távol van az Anyag lépéstől

- **Reprodukció:** `Anyagadatok megadása` → requested kapcsolók → a hosszú anyagűrlap és eredmények után az `Adatok átvétele` panel keresése.
- **Felhasználói hatás:** egy távoli átmenet és egy hosszú előnézet-bejárás marad; mobilon az átvétel felfedezhetősége gyenge.
- **Javaslat:** az Anyag lépésnél közvetlen `Mentett anyagadatok átvétele` belépési pont, rövid összegzés és mobilon elérhető/sticky jóváhagyó művelet.

### 3. P2: A kompakt fóliaeredmény mértékegysége félreérthető

- **Reprodukció:** teljes kimutatásnál az élő sáv `Alátétfólia 6 db` értéket mutat.
- **Felhasználói hatás:** a 6 a csíkok száma, miközben a beszerzéshez közelebb álló mennyiség 2 tekercs; a `db` önmagában félreérthető.
- **Javaslat:** `6 csík · 2 tekercs`, vagy a kompakt főértékben `2 tekercs`.

### 4. P2: A fedettség kiválasztása külön scope-megerősítés nélkül igazolttá válik

- **Reprodukció:** `Fedettség = Tetővel fedett` kiválasztása után a rendszer külön checkbox nélkül megerősítettként kezeli a scope-ot.
- **Felhasználói hatás:** a felhasználó kevésbé érzékeli, hogy szakmai hatókört igazol, nem pusztán címkét választ.
- **Javaslat:** külön, jól szövegezett megerősítés vagy a választóban egyértelmű jóváhagyási jelentés; a teljes tető checkbox maradjon külön.

### 5. P3: A mentési hibaüzenet nem a tényleges problémát mondja

- **Reprodukció:** a P1 hiba mentési kísérlete.
- **Felhasználói hatás:** szervezeti/jogosultsági hibát sugall, miközben a forrás–cél szerződés tiltása a kiváltó ok; nincs javítható következő lépés.
- **Javaslat:** biztonságos, de cselekvésre alkalmas forráshiba-szöveg és korai kompatibilitás-ellenőrzés az előnézetben.

## H. Következő fejlesztési prioritások

### 1. Same-type anyagátvétel mentési szerződésének javítása

- **Miért fontos:** nélküle a P3.3c fő visszatérő-szakember use case nem zárható le.
- **Várt érték:** a már mért 15 mezőnyi, illetve 16 interakciónyi megtakarítás ténylegesen menthetővé és visszanyithatóvá válik.
- **Regressziós kockázat:** dependency provenance, RLS/ownership és engedélyezett forrás–cél pármátrix.
- **Termékdöntés:** nem; a felület és a P3.3c dokumentált ígérete már engedi ezt az utat. Technikai szerződésjavítás és DB-integrációs bizonyítás kell.

### 2. Anyagátvétel közvetlen elérése az Anyag lépésből

- **Miért fontos:** a B egyetlen megmaradt távoli navigációját és a funkció felfedezési költségét csökkenti.
- **Várt érték:** 1 → 0 távoli átmenet; jó esetben a korábbi 4 átvételi aktiválás 3-ra csökkenthető a biztonsági checkbox megtartásával.
- **Regressziós kockázat:** ne másolja automatikusan a `requested` csoportokat, és ne kerülje meg az explicit anyag-jóváhagyást.
- **Termékdöntés:** igen, az elhelyezés és mobil összegzés módja UX-döntés.

### 3. Kompakt eredménysáv szakmai egységeinek pontosítása

- **Miért fontos:** a csík és a tekercs eltérő munkaszervezési/beszerzési jelentésű.
- **Várt érték:** kevesebb félreolvasás és kevesebb felesleges teljeseredmény-ellenőrzés.
- **Regressziós kockázat:** mobil helyigény és az előnézeti eredmény beszerzési mennyiségként való félreértelmezése.
- **Termékdöntés:** igen, melyik mennyiség legyen elsődleges a szakmai célcsoport számára.

## I. Végső minősítés

**PARTIALLY IMPROVED**

Az A út igazolta a navigáció és a státuszvezetés javulását, de az egyszeri kézi munkát alig rövidítette. A B út számításig erős, mérhető nyereséget adott: 15 összehasonlítható mezőszerkesztés és 16 anyagfázis-interakció szűnt meg, a szakmai eredmény változatlan maradt. A B V1 mentését azonban a same-type forrás mentési szerződésütközése blokkolja, ezért az **EFFICIENCY IMPROVED – VERIFIED** minősítés még nem indokolt.

### Alkalmazhatóság és korlátok

- A vizsgált DEMO nyeregtetőn a geometriai és anyagkimenet helyes és reprodukálható.
- A mérés nem bizonyít statikai megfelelőséget, végleges beszerzési mennyiséget, más tetőformák hatékonyságát, fizikai érintéses működést vagy valós cross-user/cross-org RLS-szigetelést.
- Valós szakemberi időmérés nem történt; automatizálási futási időt nem kezeltünk munkavégzési időként.
- A jelentés készítése során alkalmazáskód, adatbázisséma, Auth/RLS és számítási képlet nem változott; commit, push és deploy nem történt.

---

## Utólagos javítási megjegyzés (P3.4.1, 2026-11-04)

A fenti mérés, a G.1 FAIL és az I. szakasz **PARTIALLY IMPROVED** minősítése történeti állapot, változatlan.

A G.1 gyökérok igazolódott a tényleges SQL-en, és javítva lett a `supabase/migrations/20261104120000_construction_field_transfer_same_type.sql` forward-only migrációval: a pármátrixból kikerült a típus-különbözőségi feltétel, helyére explicit önhivatkozási guard került. Az azonos típusú anyagátvétel mentése, a provenance, az attestáció és az anyagállapot újranyitása valódi helyi adatbázis-integrációval bizonyított (`supabase/tests/database/065_construction_field_transfer_same_type.sql`, 14/14 PASS), a cross-user/cross-org/önhivatkozási negatív esetekkel együtt.

A **G.1 blokkolt útvonala utólag lefutott**: ugyanabból a forrásból (`DEMO - teljes nyeregtető · V1`) a B kalkuláció elmenthető lett (`DEMO P3.4.1/B - same-type anyagátvétel`, V1), a 14 anyagparaméter és a kiosztás átkerült, a `requested` csoportok nem, az eredmény pontosan a referencia (85,45 m² · 28 · 27 · 2 · 40), és az újranyitás hű. A G.1 javaslata ezzel teljesült; a fenti mérés minősítése azonban **nem** lett átírva, mert a P3.4 hatékonysági mérését nem játszottuk újra. Részletek: [`PROGRESS.md` P3.4.1](PROGRESS.md).
