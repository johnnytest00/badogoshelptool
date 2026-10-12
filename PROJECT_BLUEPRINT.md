# TetőPro — projektalapú tetőfedő és bádogos kalkulációs rendszer

> **Státusz:** jóváhagyott V1 alaparchitektúra, **tervezési specifikáció**, nem megvalósult funkciólista.  
> **Dátum:** 2026-10-12  
> **Elsődleges nyelv/piac:** magyar (hu-HU), HUF; később bővíthető.  
> **Célközönség:** elsőként egy magyar tetőfedő/bádogos kivitelező, később több vállalkozás.  
> **Fejlesztés kezdete:** a dokumentum alapján, szakaszosan, Codexszel.  
> **Projekt neve:** a „TetőPro” munkanév, később szabadon cserélhető.

## 0. A dokumentum használata

Ez a fájl a projekt **irányadó követelmény- és architektúradokumentuma**. Új feladat előtt a fejlesztő/Codex olvassa el a releváns fejezeteit; az érintett kódrészek állapotát mindig vizsgálja meg, mielőtt változtat. **Nem jogosít fel az összes felsorolt funkció azonnali megépítésére.**

**Állapotjelölések:**
- **Elfogadott döntés:** a termék vagy architektúra tervezett működése.
- **DEMO / példa:** szemléltető, nem gyártói normatív vagy valós szakmai adat.
- **Későbbi fázis:** szándékosan nincs benne az első demóban.
- **Nyitott szakmai kérdés:** após / szakember, gyártói útmutató vagy más ellenőrzött forrás jóváhagyása szükséges.

**Nem kitalálható:** anyagnormák, veszteségi arányok, gyártói átfedések, rögzítési kiosztások, lefolyó méretezési alkalmasság, statikai méretezés, áfa-/jogi minősítések, termékárak. Hiány esetén kérjen adatot, vagy egyértelműen DEMO/becslés jelöléssel működjön; ne adja el igazoltnak.

## 1. Termékvízió és hatókör

Mobilon elsősorban használt, modern webalkalmazás, ahol a kivitelező **egy projekten belül** felmérést, tetőgeometriai kalkulációkat, részletes anyagszükségletet, munkadíjakat és árajánlatot állít össze, és mindegyikről külön nyomtatható, menthető összegzést kap.

### Fő munkafolyamat

1. Belépés → Dashboard: **Funkciók / Aktuális munkák** váltó.
2. Projekt létrehozása vagy folytatása, opcionális ügyfél; külön projekt másolható.
3. Projektben tetőmodell(ek) / önálló munka (pl. kizárólag csatornázás).
4. Kalkulátor kiválasztása; meglévő projektadatok átvétele és felülírása kontrolláltan.
5. Geometriai eredmények → anyagmennyiségek → beszerzési mennyiségek → munkadíj és ajánlat.
6. Külön **műszaki számítási lap**, **anyagbeszerzési lista**, **belső költségkimutatás**, **ügyfélárajánlat**, opcionális későbbi **munkalap**.
7. Mentés, szerkesztés, előzmények/ajánlatverziók, PDF/PNG/SVG export és natív nyomtatás.

**Első demo cél:** működő végponttól végpontig folyamat valóságosnak tűnő, de szükség szerint **DEMO** jelölésű adatokkal; a geometriai képletek ellenőrzöttek, az anyagprofilok nem téveszthetők össze hiteles gyártói adatokkal.

**Tudatos nem-célok az első demóban:** teljes SaaS billing, előfizetés, fizetés, AI/műholdas tetőfelismerés, összetett 2D tetőszerkesztő, kapcsolható 3D modell, statikai méretezés, automatikus hidraulikai megfelelőség igazolása, általános párkány/homlokzati/egyedi hajlításos bádogos modulok, teljes offline szinkron.

## 2. Első demo kalkulátor-készlet és ütemezés

| Prioritás | Funkció | Elvárt szint |
|---|---|---|
| P0 | Nyeregtető és félnyeregtető | Ellenőrzött geometria, megadott túlnyúlások; SVG rajznézetek |
| P0 | Szarufák és lécezés | Geometriai hossz, darabszám/kiosztás megadott paraméterek alapján; **nem statikai igazolás** |
| P0 | Betoncserép, kerámiacserép | Számítás megadott gyártói/DEMO fedési paraméterekből |
| P0 | Cserepeslemez | Hasznos fedési szélesség, hossz, darabszám, kiosztás, korlátozások; szükség szerint DEMO |
| P0 | Fólia, alap bádogszegélyek | Paraméterezett szükséglet és ráhagyás |
| P0 | Ereszcsatorna | Ereszszakaszok, csatornák, lefolyók és idomok megadott rendszerparaméterekből; nem automatikus hidraulikai minősítés |
| P0 | Anyagkatalógus, munkacsomagok, munkadíj, ajánlat | Valóban használható CRUD / adatkapcsolatok, elkülönített ajánlat és belső költségek |
| P0 | Rajzrétegek, nézetek, dokumentumok | Felülnézet, oldalnézet, keresztmetszet, releváns kiosztási rajzok; PDF + kép + nyomtatás |
| P1 | Kontytető, sátortető, trapézlemez, korcolt lemez | Geometriai és termékspecifikus kiterjesztés |
| P2 | Csonkakonty, L/T tetők, zsindely, síklemez | Összetett modulok |
| P3 | Manzárd, lapostető, interaktív tetőszerkesztő, 3D | Külön későbbi projektek |
| Később | Általános bádogos feladatok | Párkány, homlokzati burkolat, egyedi hajlítás stb. |

**Három demonstrációs munkafolyamat:** (1) nyeregtetős családi ház teljes, cserepes tetőfelújítása, (2) nyeregtetős cserepeslemez-felújítás lemezkiosztással, (3) önálló ereszcsatorna-csere teljes tetőmodell nélkül.

## 3. UI/UX és akadálymentesség — mobil az első

### 3.1 Dashboard és navigáció

- Prémium, letisztult, **dashboard-szerű** kezdőoldal; igényes Lucide ikonok, érthető magyar feliratok. Nem kötelező klasszikus kártya-design.
- Üdvözlés alatt **két széles, fekvő váltó:** `Funkciók` | `Aktuális munkák`; **mindkét nézetben látható** marad. Váltáskor az alatta lévő tartalom változik.
- Funkciók, kalkulátorok és több projekt **vizuális, jól elkülönülő rácsban**: mobilon **maximum 2 oszlop**, megnövelt méretnél szükség szerint **1 oszlop**; felirat nem vágható le.
- `Aktuális munkák`: projektek, státusz, utolsó módosítás, gyors folytatás; keresés/szűrés lehet későbbi iteráció.
- Vissza gomb indokolt helyeken **fent**. Gyakori műveletek kényelmesen elérhetők, de **a kalkulátorban kizárólag a méretezés gombja mindig képernyőhöz rögzített**; Mentés/Nyomtatás/Rajzok/Eredmények nem kötelezően sticky.
- Kalkulátor mobilon: `Adatok`, `Rajzok`, `Eredmények` nézetek; asztali kijelzőn párhuzamos panelek is lehetnek.

### 3.2 Világos/sötét mód

- Dashboard tetején a Beállítások mellett gyors **téma-váltógomb**.
- Alapértelmezés **rendszer szerint** (`prefers-color-scheme`), a rendszer változására reagál; kézi beállítás megmarad a későbbi megnyitásokkor.
- **A gomb a következő választható módot írja ki:** sötét megjelenésben `Világos`, világosban `Sötét` (megfelelő ikon).
- Beállításokban: `Rendszer szerint`, `Világos`, `Sötét`; inicializáláskor ne villanjon rossz téma.

### 3.3 Független, élő megjelenítés-méretezés

- Kalkulátorban jobb alsó sarokhoz, safe area figyelembevételével rögzített, görgetés közben is látható méretező gomb.
- Kinyitáskor **nem teljes képernyős**, **nem blur-ölt**, lehetőleg nem sötétített háttér; kisebb, **felfelé felúszó bubble/popup panelek**; mögöttük élőben látszik a változás. Az alatta lévő gombokat a lebegő vezérlő szükség esetén takarhatja.
- Három független vezérlő: **szövegméret**, **UI-elemek mérete**, **rajzok megjelenítési nagyítása**. `Normál`, `Kényelmes`, `Extra nagy`, `Egyéni` profil + alaphelyzetbe állítás.
- A böngésző/operációs rendszer gyári nagyításának **pontos értékét nem kell kiolvasni**. A saját beállítás ezt egészíti ki, nem helyettesíti a reszponzív megjelenést vagy a böngésző zoomját.
- Nagyított szövegnél megfelelő reflow, teljes feliratok, használható űrlapok, megfelelő érintési célok és billentyűzetkezelés.
- Beállítások per böngésző helyben megőrzendők; bejelentkezett felhasználónál később profilhoz szinkronizálhatók.
- Az SVG képernyős zoomja/pan-je nem változtathatja a fizikai tetőméreteket.
- Animációk `prefers-reduced-motion` esetén csökkentendők vagy kikapcsolandók. Animáció soha nem blokkolhatja az adatbevitelt.

### 3.4 Adatbevitel és visszajelzés

- Magyar számformátum: vessző/pont elfogadása; numerikus mobil billentyűzet; jól látható mértékegység, súgók.
- Mező eredete: `kézi`, `geometriából`, `másik kalkulátorból`, `katalógusból`, `becsült`, `DEMO`. A kézi felülírás jelölt és visszaállítható; automatikus újraszámítás nem írhatja felül némán.
- Azonnali, de nem zavaró ellenőrzés; mezőszintű hibák és összesített „Hiányzó adatok” navigálható lista.
- Eredményállapot: `naprakész`, `újraszámítandó`, `hibás/hiányos`; figyelmeztetések külön. A DEMO/becsült eredmények egyértelmű jelölést kapnak.
- Automatikus **piszkozatmentés** állapotjelzővel; sikertelen mentés nem mutatható sikeresnek. Offline adatvesztés-csökkentés később külön fejleszthető.

## 4. Technológiai stack és döntési elvek

| Terület | Választás | Szabály |
|---|---|---|
| Alkalmazás | Next.js App Router, React, **TypeScript** | Egyetlen moduláris monolit; minimális route-fájlok |
| UI | Tailwind CSS, shadcn/ui, Lucide | Design tokenek, akadálymentesség, mobil-first |
| Animáció | Anime.js | Interakció/látvány, **nem geometriai számítás** |
| Rajz | React + SVG | Vektoros, méretezett, rétegezett megjelenítés |
| Rajz pan/zoom | `react-zoom-pan-pinch` **jelölt** | Integráció és csomagfrissesség ellenőrzése megvalósítás előtt |
| Későbbi 3D | Three.js + React Three Fiber | Csak későbbi, kapcsolható funkció |
| Űrlapok | React Hook Form + Zod | Szerveroldali újravalidálással |
| Adatbázis | Supabase PostgreSQL | Relációs entitások + indokolt verziózott JSONB |
| Hitelesítés | Supabase Auth | Szerveren is jogosultságellenőrzés |
| Tárolás | Privát Supabase Storage | Projekthez kötött hozzáférési szabályok |
| PDF | `@react-pdf/renderer` **jelölt** | Ékezetek, oldaltörések, grafika tesztelendő |
| Kép | SVG → PNG export; SVG is menthető | Export és nyomtatás a **végleges** számítási állapotból |
| Nyomtatás | Saját előnézet → böngésző/OS **natív** print | A natív dialógus nem írható felül megbízhatóan |
| Tesztek | Vitest; Playwright mérföldköveknél | Célzott tesztek, nem minden apró feladatnál teljes E2E |

**Verziószabály:** implementáció előtt ellenőrizni az aktuális hivatalos dokumentációt, kompatibilitást, karbantartottságot és biztonsági státuszt. A **racionálisan korszerű és bizonyított** megoldás a cél, nem a legfrissebb pusztán azért, mert új. Felesleges függőséget ne telepítsünk.

## 5. Logikai architektúra

**Moduláris monolit / négy réteg:**
1. **Presentation:** Next.js oldalak, React-űrlapok, dashboard, SVG-megjelenítés és animáció.
2. **Application:** use case-ek, projektek, kalkulációk összekapcsolása, tranzakciók, mentés, jogosultság.
3. **Domain:** tiszta, determinisztikus, keretrendszerfüggetlen TypeScript geometria, mennyiség- és árazási logika.
4. **Infrastructure:** Supabase adapterek, repository-k, storage, PDF-generálás, külső integrációk.

**Függőségi irány:** UI → alkalmazási műveletek → domain-interfészek; infrastruktúra implementálja a domain/application által szükséges portokat. Domain **nem importálhat** `next`, React, Supabase, Anime.js, Tailwind kódot. A számítási motor a kliens és a szerver között megosztott kód; érzékeny mentést/finalizálást szerveroldalon újra kell ellenőrizni.

Nincs korai microservice, külön FastAPI backend, összetett monorepo vagy általános plugin platform. Csak akkor külön csomag, amikor bizonyított igény indokolja.

## 6. Adatmodell — célállapot, nem F0 migrációs lista

**Alapelv:** első körben **egy szervezet, egy elsődleges felhasználó**, de minden üzleti adat szervezethez kötött; későbbi SaaS-izoláció a kezdetektől tervezett. A tábla- és mezőnevek javaslatok; tényleges SQL részletesen F2-ben, tesztekkel.

| Tábla | Fő felelősség / fontos mezők |
|---|---|
| `profiles` | `id` (= Auth user), megjelenítési adatok |
| `organizations` | `id`, név, céges alapadatok |
| `organization_members` | `organization_id`, `user_id`, `role`, tagsági állapot; egyedi kapcsolat |
| `organization_settings` | cégszintű pénznem, dokumentum, kalkulációs alapbeállítások |
| `user_preferences` | téma `system/light/dark`, szöveg/UI/rajz méret, nyelv |
| `clients` | `organization_id`, név, elérhetőség, számlázási adatok opcionálisan |
| `projects` | `organization_id`, opcionális `client_id`, név, cím/helyszín, típus, státusz, `version`, időbélyegek |
| `project_attachments` | fotó/rajz/egyéb, privát storage-útvonal, hozzáférés, metaadat |
| `roof_models` | `project_id`, típus, cím, aktuális geometriai revízió |
| `roof_model_revisions` | **immutable** verziózott geometriai bemenet JSONB, sémaverzió, szerző/idő |
| `calculations` | `project_id`, kalkulátortípus, aktív változat, állapot |
| `calculation_revisions` | **immutable** bemenet-/eredmény-pillanatkép, motor- és sémaazonosító, figyelmeztetések, bemeneti hash |
| `calculation_dependencies` | konkrét projektkalkulációk vagy revíziók közötti hivatkozások |
| `material_categories` | szervezeti kategória, rendezés |
| `materials` | katalógus alaptermék, gyártó, kategória, termékkód, provenance |
| `material_variants` | konkrét változat, típus-specifikus **validált** műszaki adatok JSONB |
| `material_prices` | árverziók: vétel/eladás, pénznem, egység, érvényesség |
| `work_packages` | előre definiálható munkacsomag-sablon |
| `work_package_items` | sablonba tartozó kalkulációk/munkafolyamatok |
| `project_work_packages` | projektben alkalmazott, szerkeszthető csomagpéldány |
| `quotes` | projekt, státusz, aktuális verzió, ügyfélkapcsolat |
| `quote_versions` | **véglegesítés után immutable** ajánlati pillanatkép, verziószám, kalkulációs hivatkozások |
| `quote_lines` | megnevezés, mennyiség, egység, egységár, adóbeállítás, sorösszeg, felülírási eredet |
| `documents` | típus, projekt/ajánlat/revízió hivatkozás, privát storage objektum, állapot |

**Relációs szabályok:**
- `client_id` lehet null: gyors munkák ügyfél nélküli elindítása is lehetséges.
- `roof_model` lehet null: önálló csatornázási projekt is érvényes.
- Id-k és `organization_id` kapcsolatok megszorításai kizárják a **keresztvállalkozásos referenciákat** (ahol kell összetett idegen kulcs vagy szerveroldali konzisztenciaellenőrzés).
- Minden releváns `organization_id`, `project_id`, `created_at`, FK és gyakori szűrő indexelendő a tényleges lekérdezések szerint; fölösleges indexeket ne hozzunk létre.
- JSONB csak **verziózott, típusfüggő bemeneti/eredmény adatokra**; ügyfelek, árak, tagok, projektek, árajánlatok relációsak.
- Migrációk verziókövetetten a `supabase/migrations/` alatt; seed adat **egyértelműen DEMO**, nem valós üzleti adat.
- RLS minden üzleti táblán és Storage szabályok; a kliens közvetlen DB-hívásai és szerveroldali actionök is korlátozottak. Service-role titok **soha** nem kerül böngészőbe.

### 6.1. Árajánlatverziók és 7 napos szabály

Az elfogadott irány: új ajánlatverziónál a régi elavultnak jelölhető; a felhasználó **kb. 7 napos automatikus eltávolítást** szeretne a korábbi verziókra. **A pontos törlési feltételek még nincsenek véglegesítve.** Biztonságos alapértelmezés: első demóban **nincs visszafordíthatatlan automatikus törlés**; archivált, visszaállítható elavult **piszkozat**, 7 napos megtartási koncepció. Kiküldött, elfogadott, jogi/számviteli célból megőrzendő verzió ne törlődjön automatikusan. A cron/purge csak külön jóváhagyással és tesztelve készüljön el.

### 6.2. Pénzügyi és szakmai adatok

- PostgreSQL `numeric` / TypeScript decimális számítás a pénznél; pénznem és egység explicit; kerekítés szabályozott, a kijelzőre kerekített értékből nem folytatunk számítást.
- Ár nem egyenlő a véglegesített ajánlati árral: **ajánlatsor snapshot** tárolja az akkori árakat, egységeket, mennyiségeket, áfa-/adóbeállítást.
- Beszerzési és eladási ár külön; belső haszonkulcsot/költséget ne jelenítsük meg ügyfélnek szánt dokumentumban.
- Adózási beállítás konfigurálható, **nem automatikus jogi minősítés**. Valós bevezetés előtt könyvelői/szakértői egyeztetés.
- Anyagprofilnál adat eredete és hitelességi státusza: `manufacturer_verified`, `professional`, `estimate`, `demo`, `missing`; a gyártói ellenőrzés forrása és időpontja lehet metaadat.

## 7. Számítási motor részletes terv

### 7.1. Egy kalkuláció pipeline-ja

`input → Zod validáció → egységnormalizálás → geometria / domain számítás → mennyiség → kiszerelés / rendelési mennyiség → árképzés (külön modul) → ellenőrzött eredmény + warnings → rajz / dokumentum`.

- **Tiszta, determinisztikus** függvények; nincsenek hálózati/mellékhatásos műveletek a domain-képletekben.
- Számított értékek: géppel feldolgozható típus, mértékegység, pontosság, adatforrás, figyelmeztetés.
- `CalculatedResult` és `ResultIssue` sztenderd típussal; számítás csak érvényes bemenettel, a hiányos részeredmény nem jelenhet meg hitelesnek.
- Verziózott `calculatorId`, `calculatorVersion`, `inputSchemaVersion`, `resultSchemaVersion`, bemeneti referencia-azonosítók/hashes.

### 7.2. Egységes geometriai primitívek

`Point2D`, `Point3D`, `Vector`, `LineSegment`, `Polygon`, `RoofPlane`, `RoofEdge`, `RoofModel`.

Tetőélek típusa: `eave`, `ridge`, `valley`, `hip`, `gable`, `wall_abutment` stb. A koordinátarendszer, tájolás, képletek előjeles konvenciói dokumentáltak. Szerkezeti méretadatok egységesen például **mm**, szögek **fok** külső API-n / szükség szerint **radián** belül, területek **mm²/m²** explicit konverzióval.

A nyeregtető és félnyeregtető specifikus bemeneteiből közös tetősík/él modellek állnak elő; innen lépünk később kontytető és összetett tetők felé. **A geometriai kalkuláció nem statikai teherbírás-ellenőrzés.**

### 7.3. Kalkulátor-azonosító és registry

Példák (célállapot, nem F0):
- `roof.gable`, `roof.shed`, később `roof.hip`;
- `timber.rafters`, `timber.battens`;
- `covering.tiles`, `covering.metal_sheets`;
- `insulation.membrane`;
- `sheet_metal.flashings`, `gutters.standard`.

Minden modulnak típusellenőrzött **bemeneti sémája**, tiszta `calculate`, **kimeneti sémája**, verziószáma, dokumentált feltételezései és egységtesztjei vannak. A registry az elérhető kalkulátorokat és a függőségeket teszi felismerhetővé; ne készítsünk túlméretezett futásidejű plugin-betöltőt.

### 7.4. Függőségi gráf és felülírás

- A modulok deklarálják, milyen adatot igényelnek és szolgáltatnak; a projekten belüli konkrét kapcsolatok irányított, **körmentes gráfként (DAG)** modellezhetők.
- Geometria módosítása → közvetlen/közvetett érintett számítások `stale` → topológiai sorrendű újraszámítás → mennyiségek/ajánlat-tervezet jelzése.
- Állapotok: `current`, `stale`, `invalid`; `running`/`saving` lehet UI-folyamatállapot.
- Kézi értékfelülírás **explicit** és megőrzött, visszakapcsolható automatikusra; automatikus frissítés ne változtassa meg némán a manuális adatot.
- Mentett, lezárt árajánlat-pillanatkép **nem** változik automatikusan upstream számításfrissítésre.
- Kliensoldali élő számítás gyors UX-hez; szerveren ellenőrzött mentés, finalizálás és export.

### 7.5. Referencia- és regressziós tesztelés

- Geometriai referenciaesetek: külön ellenőrzött méretek, vetületek, hajlásszögek, területek, élek; először egyszerű tetők.
- Határértékek: 0/negatív, irreális, hiányzó, eltérő szög/magasság, túlcsordulás, pontos kerekítés.
- Mértékegységtesztek, invariánsok (pl. területek összege), elvárt hibák, manuális override és függőségek.
- Gyártóspecifikus termékadatból jövő számításokhoz ellenőrzött termékadat és jóváhagyott szabály; nélküle látható DEMO/becslés.

## 8. Műszaki rajzok, 3D és dokumentumok

- A rajz **ugyanabból a közös számítási eredményből** épül, mint az anyagkimutatás; nincs külön rajzos geometriai képlet.
- SVG rétegek: alapgeometria, méretvonalak, szarufák, lécek, fedőlemezek, rögzítések, szegélyek, ereszek. Csak valóban rendelkezésre álló adat jelenjen meg; hiányhoz jelzés.
- Választható nézetek: felül-, oldal-, keresztmetszet; szarufa-, léc- és lemezkiosztás.
- Pan/zoom/fit-to-view különálló UI-transzformáció; a méretezés-központ és a kétujjas zoom szabályait koordinálni kell.
- SVG precizitás: dokumentált koordinátatranszformációk, rajzi mértékegységek, felirat-/méretütközés-kezelés.
- Anime.js: animációs komponens, `reduced-motion` támogatás, nem befolyásolhatja a numerikus kimeneteket.
- Kapcsolható 3D később: React Three Fiber / Three.js, ugyanabból a tetőmodellből.
- Dokumentumfajták: műszaki lap, anyagbeszerzési lista, **belső** költségkimutatás, **ügyfélnek** ajánlat; később munkalap.
- PDF mellett kiváló minőségű PNG és lehetőség szerint SVG; többoldalas dokumentum képexportja oldalanként. Exportnál ékezetes magyar szöveg, A4 oldaltörés, hosszú táblák, mobil előnézet külön tesztelendő.
- Nyomtatás: animált saját előnézet és megerősítés → **natív** OS/böngésző nyomtatási párbeszédablak.
- Végleges dokumentumon DEMO / becslés / hiányzó szakmai ellenőrzés egyértelműen látszik; nem készült hiteles anyagterv vagy ajánlat ellenőrizetlen bemenettel.

## 9. Biztonság, adatvédelmi és működési elvek

- Auth + szerepkör/tenancy ellenőrzés minden privát lekérdezésen és Server Actionön.
- RLS **deny-by-default** a szervezetfüggő táblákon; idegen szervezethez tartozó FK-t ne lehessen megadni.
- Storage privát, signed URL megfelelő jogosultsággal és időkorláttal; érzékeny kulcs és privát ügyféladat nem kerül kliens bundle-be.
- Minimális adatkezelés, naplózás személyes adatok kiszivárgása nélkül; fájlfeltöltési típus-/méretellenőrzés.
- Biztonsági mentés és visszaállítási eljárás kialakítása a valós bevezetésig; ingyenes hosting nem garantál automatikus hosszú távú megőrzést.
- Piszkozatmentés, mentési hiba és verzióütközés kezelése; nincs némán felülírt többes szerkesztés.
- Supabase-ről későbbi költözés: domain és alkalmazási logika ne függjön közvetlenül a szolgáltatástól.

## 10. Végső irányadó könyvtárstruktúra

A következő **célstruktúra**, **nem azonnal létrehozandó összes üres mappa**. Csak az aktuálisan használt modulok kapjanak fájlokat.

```text
roof-platform/
├── public/                   # nyilvános ikonok és nem érzékeny képek
├── src/
│   ├── app/                  # App Router oldalak, layouts, API route-ok
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── projektek/[projectId]/
│   │   │   ├── kalkulatorok/
│   │   │   ├── anyagok/
│   │   │   ├── ajanlatok/
│   │   │   ├── munkacsomagok/
│   │   │   └── beallitasok/
│   │   └── api/exports/
│   ├── components/           # ui/ (shadcn), layout/, shared/
│   ├── features/             # felhasználói funkciók: UI, use-case, forms
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── clients/
│   │   ├── calculators/
│   │   ├── materials/
│   │   ├── work-packages/
│   │   ├── estimates/
│   │   ├── documents/
│   │   └── preferences/
│   ├── domain/               # PURE TypeScript, React/Next/Supabase import NÉLKÜL
│   │   ├── geometry/         # primitives/, operations/, roof-models/, validators/
│   │   ├── calculations/
│   │   │   ├── contracts/
│   │   │   ├── engine/
│   │   │   ├── registry/
│   │   │   └── modules/
│   │   │       ├── roofs/gable/
│   │   │       ├── roofs/shed/
│   │   │       ├── timber/rafters/
│   │   │       ├── timber/battens/
│   │   │       ├── covering/tiles/
│   │   │       ├── covering/metal-sheets/
│   │   │       ├── insulation/
│   │   │       ├── sheet-metal/
│   │   │       └── gutters/
│   │   ├── materials/
│   │   ├── pricing/
│   │   ├── quantities/
│   │   └── units/
│   ├── drawings/             # SVG: components/, layers/, annotations/, transforms/, exports/
│   ├── infrastructure/       # supabase/, repositories/, storage/, pdf/
│   ├── lib/                  # formatting/, validation/, utils/
│   ├── config/
│   └── types/
├── supabase/                  # migrations/, tests/, seed.sql (F2-től)
├── tests/                     # integration/, e2e/, fixtures/
├── docs/                      # architecture/, calculations/, database/, decisions/, testing/
├── scripts/
├── PROJECT_BLUEPRINT.md
├── AGENTS.md                   # F0-ban létrehozható rövid Codex-szabályzat
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

**Helyi modulminta (csak ha szükséges):**

```text
src/domain/calculations/modules/roofs/gable/
├── gable.types.ts
├── gable.schema.ts
├── gable.calculator.ts
├── gable.geometry.ts
├── gable.quantities.ts
├── gable.fixtures.ts
└── gable.test.ts
```

Ne legyen indokolatlan fájlszétaprózás: kis, összetartozó dolgok együtt maradhatnak. Ne legyen 1000 soros „mindent tudó” komponens sem. `app/` csak route-összeállítás, nem domain képletek. Közös modulba csak valódi közös tudás kerül.

## 11. Fejlesztési fázisterv

| Fázis | Hatókör | Fő elfogadási feltétel |
|---|---|---|
| **F0** | Projekt inicializálása, TypeScript/Next/Tailwind/shadcn, minimális minőségkapuk | Friss projekt indul, typecheck/lint/build célzottan sikeres; nincs üzleti funkció |
| **F1** | Design system, dashboard, theme, skálázás alapjai | Mobil max. 2 oszlop; tabok, téma-inverz gomb és bubble méretezés bizonyított |
| **F2** | Supabase Auth + minimális DB migrációk + RLS | Első felhasználó/szervezet, izolációs tesztek |
| **F3** | Ügyfél és projektkezelés | Projektek CRUD, másolás, piszkozatmentés, státuszok |
| **F4** | Domain alapmotor, mértékegységek, kalkulátor-regiszter | Referenciatesztek és adatszerződés |
| **F5** | Nyeregtető és félnyeregtető | Ellenőrzött geometriai képletek és hibás adatok kezelése |
| **F6** | SVG nézetek és kapcsolható rétegek | Mobil zoom/pan; rajz-egyezőség az eredményekkel |
| **F7** | Anyagkatalógus + verziózott árak | DEMO/valós forrás különbsége, ár-előzmény |
| **F8** | Cserép/lemez/fólia/lécezés anyagkalkuláció | Paraméterezett, tesztelt mennyiségek |
| **F9** | Alap szegélyezés és csatornázás | Önálló csatorna projekt is működik |
| **F10** | Munkacsomagok, munkadíjak, árajánlat | Eredmény → ajánlat; immutable verziók |
| **F11** | Dokumentum- és képexport, natív print | Magyar ékezetek, PNG/PDF, rétegek, elkülönített belső/ügyfél dokumentum |
| **F12** | 3 reprezentatív DEMO projekt | Teljes E2E folyamat ellenőrizhető |
| **F13** | Stabilizálás, akadálymentesség, teljesítmény, biztonság | Dokumentált ellenőrzési mátrix |

Fázisonként kis, ellenőrizhető alfeladatokra bontani. A szakmai szabályok/após visszajelzései a demo alap után pontosíthatók. **Nem kell az első promptban az összes fázist implementálni.**

## 12. Kötelező Codex-munkamódszer és elfogadási kapuk

MINDEN feladatban:

1. **Állapotfelmérés:** repo/git állapot, releváns fájlok, függőségek, már meglévő konvenciók és tesztek. A létező munkát nem írhatja felül indokolatlanul.
2. **Mini-terv:** csak a szükséges módosítások, érintett rétegek/fájlok, kockázatok.
3. **Implementáció:** kis, típushelyes, moduláris változás; új függőség csak indokoltan; nincs felesleges refaktor.
4. **Ellenőrzés:** típusellenőrzés, kapcsolódó egységteszt, szükség esetén lint/build, releváns manuális vagy böngészős teszt. E2E csak mérföldkőnél vagy indokolt esetben, ne pazarolja a tokent/erőforrást.
5. **Bizonyíték:** pontos parancs + tényleges eredmény; a sikert nem lehet pusztán kijelenteni. Ami nem futott, az **nem tesztelt**.
6. **Dokumentáció:** érintett műszaki döntések, haladás és tesztmátrix rövid frissítése (csak a releváns részek).
7. **Lezárás:** módosított fájlok, eredmények, ismert hiányosságok, következő lépés. `Kész` csak bizonyított megfelelés esetén; máskor `részben kész`/`ellenőrzésre vár`.

**Tiltások:** nincs kitalált mérési/gyártói adat, nincs bizonyítatlan állítás, nincs indokolatlan teljes repo-olvasás, nincs felesleges eszközhasználat, nincs automatikus commit/push/deploy/migráció-élesítés vagy destruktív adatkezelés külön engedély nélkül.

**Tesztelési hangsúly:** precíz domain unit tesztek minden geometriai/mennyiségi képlethez; DB/RLS integrációs tesztek; Playwright böngészős ellenőrzések fő UX mérföldköveknél; 100%, 125%, 150%, 200% megjelenítési skálázási variánsok, keskeny mobil, iOS/Android viselkedés lehetőség szerint; reduced motion; árajánlat pillanatképek megőrzése.

## 13. Nyitott szakmai kérdések — később apósoddal egyeztetendők

- Használt fedőanyag-gyártók/termékcsaládok és valós technikai adatlapjaik.
- Valós cserepeslemez-, cserép-, trapézlemez-, fólia- és csatornaparaméterek.
- Átfedések, hulladék, vágás/száloptimalizálás, csavarok/kapcsok kiosztása.
- Csatorna lefolyó-kapacitás és hidraulikai méretezés alkalmazandó szabályai.
- Kivitelezési munkasorrend, ács-/tetőfedő-/bádogos munkakatalógus.
- Valós díjazási és adózási logika, ügyféldokumentumok, opcionális munkalap.
- Régi héjazat/bontás (különösen gyanított azbeszt) figyelmeztetési/kezelési követelmények.
- Árajánlatok elavult piszkozatainak **pontos 7 napos** törlési/archiválási politikája.
- Későbbi komplex tető, 2D szerkesztő, 3D, további általános bádogos munkák.

## 14. Jóváhagyási megjegyzés

A felhasználó **2026-10-12-én jóváhagyta** az itt összefoglalt V1 architektúra irányát. A dokumentum célja, hogy az első Codex-feladattól azonos elvek mentén épüljön a rendszer. A konkrét implementáció, az SQL-séma, a geometriai képletek és a gyártói normák **még nem tekinthetők késznek vagy szakmailag jóváhagyottnak**.
