# M10.3.2 — Keresztforrásos tételátfedés: implementáció és célzott QA

Dátum: 2026-10-27
Döntés: **PASS WITH LIMITATIONS**

Az M10.3.1 riportjában dokumentált E03 UX-javaslat megvalósult: a kombinált standalone ajánlat pontosan egyező, normalizált megnevezésű és egységű anyaglista- és kalkulációs sorainál nem blokkoló, akadálymentes státuszjelzés jelenik meg. A jelzés a forrás nevét és revízióját, valamint az eredeti mennyiséget/egységet mutatja. Az összes eredeti sort külön hagyja; sem összevonás, sem automatikus mennyiségi vagy pénzügyi változtatás nincs. A jelzés az aktuális revízió tételeiből származik, így egy későbbi revízió szerkesztése nem változtatja meg a történeti pillanatképet. A PDF és a mentési/adózási szerződés változatlan.

| Terület | Státusz | Bizonyíték |
|---|---|---|
| E03 átfedés és adatmegőrzés | **PASS** | Négy domain teszt a pontos egyezésről, egység-normalizálásról, eltérő specifikációk/kategóriák kizárásáról, több csoportról és bemenet mutációmentességéről; két szervermarkup teszt a státusz és a forrás/revízió megjelenítéséről. Böngészőben a DEMO ajánlat V1 jelezte a 36 db-os `Szarufa` két forrását (anyaglista V2 és kalkuláció V1). A név módosítása után V2 nem jelzett; a változatlan történeti V1 újbóli megnyitásakor a jelzés visszatért. |
| Megjelenítés és konzol | **PASS WITH LIMITATIONS** | 375×812 világos/sötét és 1440×900 világos/sötét Chromium-emulációban a figyelmeztetés olvasható és tördelődik; 375 és 1440 px-en a dokumentum szélessége megegyezett a viewporttal. Alkalmazáshiba nem látszott a konzolban. Ez nem valódi mobilkészülék-teszt. |
| Teszt és kódminőség | **PASS** | `rtk bypass npm exec vitest run src/features/quotations`: 15 fájl / 57 teszt PASS; érintett fájlokra ESLint PASS; izolált másolaton `npm run typecheck` PASS és `npm run build` PASS. |
| E11, DB, PDF és pénzügyi szerződés | **NOT RE-RUN / UNCHANGED** | Ebben a célzott, csak megjelenítést érintő változásban nem módosult forrásfeloldás, mentési RPC, jogosultság, séma/migráció, PDF vagy pénzügyi/adólogika; az M10.3.1 riport E11/PDF/pgTAP bizonyítéka történeti bizonyíték marad, nem új M10.3.2 futás. A PDF-et nem rendereltem újra. A QA DEMO sorai árazatlanok, ezért pénzügyi paritást ez a böngészős eset nem igazol. |

**E03 UX-határ:** a figyelmeztetés csak normalizált, pontos név- és ismert egység-egyezést vizsgál, kizárólag egy anyaglista-eredetű és egy kalkulációs eredetű `MATERIAL` sor között. Nem állítja, hogy a sorok valódi duplikátumok; nem blokkol, nem von össze, és nem számít át mennyiséget. Fuzzy/specifikációs összehasonlítás nem része ennek a mérföldkőnek.

A kizárólag DEMO-ból létrehozott próbaajánlat ID-ja `e3308e98-cfb1-402e-af38-ac844dd4ae71`; V1 `6f4f8259-8fb4-4de7-9175-5ee3484a8ef3`, V2 `9dd0fa42-3536-4ec8-95a0-6e7dfb587752`. A V1/V2 piszkozatok és az adatbázis változatlanul megmaradtak; ár nélküli sorok miatt az összeg `0,00 Ft`, nem pénzügyi ellenőrzési eredmény. A változás javasolt commitja: `feat(M10.3.2): warn about potential cross-source quotation item overlaps`.

# M10.3.1 remediation és átvételi QA

Dátum: 2026-10-27  
Döntés: **PASS WITH LIMITATIONS**

## Végső QA-zárás (2026-10-27)

Ez a szakasz felülírja az alábbi korábbi „NOT VERIFIED/BLOCKED” jelöléseket a most ténylegesen lefuttatott ellenőrzések alapján.

| Terület | Státusz | Bizonyíték |
|---|---|---|
| E11 jogosultság és forrásintegritás | **PASS** | A `063_quotation_combined_source.sql` 18/18 assertionje lefedi a hiányzó forrás/revízió, eltérő lista–revízió, idegen szervezet, jogosulatlan azonos szervezeti tag és a hibás mentés utáni teljes rollback esetét. A hibaüzenetek általánosak, idegen forrásadatot nem tartalmaznak. A `033`, `058`, `062` tesztekkel együtt 61/61 pgTAP assertion futott sikeresen a helyi Supabase-en. |
| Többoldalas PDF és UI-pénzügy | **PASS** | A helyi, egyértelműen DEMO jelölt 36 soros piszkozat PDF-je ténylegesen renderelődött 4 A4 álló oldalra. A sorok oldalhatáron belül maradtak; az első oldal forrásai és V2/V1 revíziói, a `m²`, `db`, `óra` egységek, az utolsó oldal nettó 366 200 HUF összesenje olvasható. Az UI ugyanazt a 366 200 Ft nettó értéket mutatja. ÁFA/bruttó érték nincs kitalálva. |
| Reszponzív nézet és konzol | **PASS WITH LIMITATION** | 375×812 világos és sötét, 812×375 fekvő és 1440×900 desktop Chromium responsive-emulációban ellenőrizve. A 375 és 812 px nézetekben a DOM `scrollWidth` megegyezett a `clientWidth` értékével; a desktop vizuálisan nem lógott túl. Hosszú ajánlat-/forráscímek tördelődnek, a kombinált létrehozó két forrásválasztója 375 px szélességen látható. Görgetés szükséges; az alsó navigáció és mentési sáv rögzített, keskeny/landscape nézetben csökkenti az egyszerre látható szerkesztőteret. A frissített oldalak konzoljában alkalmazáshiba nem jelent meg. Az emuláció nem helyettesít valódi mobil eszköztesztet. |
| E03 átfedő tételek | **PASS WITH LIMITATION** | Az eredeti sorok, mennyiségek és forrásjelölések külön maradnak; a két azonosnak látszó 36 db-os szarufasor nem olvad össze és mindkettő beleszámít. Automatikus korrekció nincs. UX-javaslat lent. |
| Automatizált ellenőrzés | **PASS** | `npm exec vitest run src/features/quotations`: 26 tesztfájl, 51/51 teszt PASS; célzott ESLint: nincs hiba. Izolált másolaton a `npm run typecheck` és `npm run build` sikeres. A teljes Vitest-regressziót ebben a záró menetben nem futtattam újra. |

**E03 UX-javaslat (nem implementált):** nem blokkoló, megerősítést nem igénylő „Lehetséges átfedés” jelzés jelenjen meg, ha külön forrásokból egyező normalizált megnevezés és mértékegység kerül az ajánlatba. A jelzés mutassa meg az érintett sorokat és forrásokat, de hagyja meg mindet, és ne változtasson mennyiséget vagy összeget. Az egyezés önmagában nem bizonyít duplikációt; ezért a felhasználó dönthessen a sorok megtartásáról. Jóváhagyás nélkül üzleti szabály nem készült.

Az ellenőrző ajánlatot a helyi adatbázis meglévő mentési RPC-jével hoztam létre, majd böngészőben nyitottam meg; helyi DEMO-piszkozat maradt, neve: `DEMO M10.3.1 többoldalas PDF QA` (ID: `23cc45af-cc56-4e2d-a784-c94b9deb2b97`). A 32 új oldalazási sor egyenként `DEMO` megjegyzést és kizárólag QA célú 100 Ft nettó egységárat kapott. Az adatot nem töröltem. A pénzügyi/ÁFA-szerződés és migráció nem változott.

## Átvétel és állapot

A `KARMI-kiszabás szakmai véglegesítése` Claude session elérhető projektlogját megtaláltam. A látható transcript alapján a munkamenet az M10.3.1 körüli munkánál, a használati limit elérésekor szakadt meg. A döntéseket a transcript, a working tree, az [M10.3 független QA](M10_PHASE3_INDEPENDENT_QA.md), az aktuális kód és a tesztek alapján rekonstruáltam; rejtett gondolatmenetet nem rekonstruáltam.

A checkout `feat/m1-length-input` ágon, `9965dd5` HEAD-en állt, 14 helyi commit előnnyel. A megkezdett módosításokat, migrációt, pgTAP tesztet és `.vitest/` kimenetet megőriztem; nem használtam resetet vagy clean-t. Az eredeti DB/RPC implementációt és pénzügyi/geometriai számítást nem építettem újra és nem változtattam. A helyi dev szerver `.next` könyvtárát nem írtam: a typecheck és production build ellenőrzése izolált másolaton történt.

## Nyitott hibák és javítások

| Terület | Eredeti állapot | Remediáció | Bizonyíték |
|---|---|---|---|
| PDF egységek | Belső `square_meter` / `piece` kódok kerültek a PDF-be. | A meglévő közös egységformázó jelenik meg a PDF-ben; az adatbázisban tárolt egységkód nem változik. | Renderelt PDF-ben `m²` és `db` látható. |
| PDF forrás és revízió | Hiányzó anyaglista-eredet és sérült revízióglyph. | Mindkét forrás neve és validált revíziója megjelenik; a revízió előre formázott `Vn` felirat, belső UUID nélkül. | A V1 PDF-ben az anyaglista `V2`, a kalkuláció `V1`; a dokumentum megnyílt és egy A4 oldalra fért. |
| Tételszám | Négy sor mellett 3-at mutatott. | A fejléc a tényleges `lines.length` értéket mutatja. | A mentett kombinált ajánlat 4 sora és a fejléc összeillett. |
| Kombinált forrás UI | Mindkét forrást csak URL-paraméterrel lehetett előkészíteni. | Két külön revízióválasztó került a normál `/ajanlatok/uj` felületre; mindkettő egyidejűleg használható. | Böngészőben mindkét lista feltöltött, kiválasztás után a két forrás és pontos revízió megjelent. |
| React duplicate-key | Ismétlődő eredménycímkékből azonos listakulcs keletkezett. | Az érintett eredménylisták kulcsa címke + index; üzleti sor nem került eltávolításra vagy összevonásra. | Konzol törlése és kalkulátoroldal újratöltése után nem jelent meg duplicate-key/runtime hiba. |

A normál választó kiválasztott értéke a forrásrekord és revízió azonosítóját hordozza, így a későbbi forrásmódosítás nem cseréli le észrevétlenül a kiválasztott snapshotot. A forrásból érkező azonos vagy átfedő tételsorok külön sorok maradtak, forrásjelöléssel; nem került be nem specifikált automatikus deduplikálás. A vizsgált DEMO ajánlatban mindkét 36 db-os szarufa sor külön látszott és külön számított az összegbe.

## E01–E12 böngészős elfogadás

| Eset | Státusz | Eredmény |
|---|---|---|
| E01 — normál UI-ból új ajánlat | **PASS** | `/ajanlatok/uj` felületet használtam; nem kézzel szerkesztett URL-paraméterrel állítottam be a forrásokat. |
| E02 — két forrás egyidejű választása | **PASS** | Anyaglista V2 és kalkuláció V1 együtt kiválasztva, mindkét kártya megjelent. |
| E03 — átfedő tételek | **PASS WITH LIMITATION** | Az azonos 36 db szarufa sorok külön, forráscímkével maradtak. A rendszer nem egyesítette és nem rejtette el őket; mindkettő benne van az összegben. Automatikus duplikációs figyelmeztetés nincs. |
| E04 — kézi mennyiségmódosítás és végösszeg | **PASS** | A munkadíj mennyisége 8-ról 9-re változott; nettó összeg 358 000 Ft-ról 363 000 Ft-ra nőtt. |
| E05 — egységár és munkadíj | **PASS** | A tesztárak kézzel beírt DEMO nettó árak voltak; 120×1 000, 36×2 500, 36×3 000, illetve munkadíj 8×5 000 Ft. Nem piaci adatként kerültek be. |
| E06 — V1 mentése és teljes újranyitása | **PASS** | A V1 új navigációval újranyitva négy sort, mindkét forrást és 358 000 Ft nettó összeget mutatott. |
| E07 — V2 és V1 megőrzése | **PASS** | V2 363 000 Ft lett; V1 továbbra is külön választható volt. A V1-et újranyitva a korábbi 8 órás mennyiség és 358 000 Ft maradt. |
| E08 — PDF tartalma | **PASS** | A renderelt V1 PDF egy A4 oldalra fért; `m²`, `db`, forrásnevek és V2/V1 látszott, belső UUID és hibás revision glyph nélkül. Draft jelölés megmaradt. |
| E09 — PDF/UI pénzügyi paritás | **PASS** | A PDF és a mentett V1 UI összege 358 000 Ft nettó HUF; V2 UI összege 363 000 Ft. Adókezelés nem lett kitalálva. |
| E10 — egyforrásos és kézi ajánlat regresszió | **PASS** | Külön, normál felületi DEMO próbában egy csak anyaglista-forrású V1 210 000 Ft-tal mentődött és teljes újratöltés után 2 sort mutatott. Egy teljesen kézi V1 szintén mentődött, újratöltés után 1 sorral és 2 000 Ft-tal jelent meg. |
| E11 — jogosulatlan vagy hiányzó forrás | **PASS (pgTAP)** | A végső, soros helyi DB regresszió 18/18 combined-source, 13/13 material-list-source, 16/16 calculation-source és 14/14 save/rollback assertionnel futott. A negatív E11 esetek adatbázis-RPC szinten bizonyítottak; külön böngészős, jogosulatlan mentési próbát nem futtattam. |
| E12 — runtime és duplicate-key konzolhiba | **PASS** | A konzol ürítése után a kalkulátor oldal frissen betöltött. A normál Next/HMR tájékoztatókon kívül nem jelent meg új runtime vagy duplicate-key üzenet. |

### PDF és nézetmátrix — korábbi futás

- A korábbi négy soros változat egy A4 oldalra fért. A végső, 36 soros piszkozat és a pontos nézetmátrix bizonyítéka a jelen riport „Végső QA-zárás” szakaszában van.

## Adat, jogosultság, konzisztencia

- A felhasznált szervezet és tételek DEMO adatok; minden kézi egységár mellett DEMO megjegyzés szerepelt. Nincs kitalált adókulcs vagy bruttósítás.
- A korábbi regressziós ellenőrzés két további, egyértelműen DEMO címkézett piszkozatot hagyott a helyi szervezetben: material-only V1 és kézi V1. A végső PDF QA további egy 36 soros DEMO piszkozatot hozott létre. Ezeket nem töröltem.
- A böngészős mentés/újranyitás igazolta a revisionhöz kötött források és a sorok fennmaradását. V1 és V2 külön állapotként jelent meg; a V1 újranyitása nem mutatta a V2 kézi mennyiségváltozását.
- A kód változatlanul az existing standalone quotation actiont, forráslekérő műveleteket, revision snapshotot és provenance-táblákat használja. A kérésben szereplő kombinált migrációhoz és RPC-hez nem adtam új jogosultsági réteget.
- A végső pgTAP-futtatás helyi Supabase-en történt, reset nélkül: a 063, 033, 058 és 062 fájl soros futtatása 61/61 assertiont adott. A hibafecskendezés és rollback teszt azonos tranzakcióban futott.

## Automatizált ellenőrzés

- Célzott quotation/source/PDF Vitest: **18 teszt PASS**; későbbi PDF/source selector célfutás: **7 teszt PASS**.
- A teljes Vitest első futásakor a standalone PDF route teszt hibásan 500-at kapott, mert a mock Supabase kliens minden táblához ugyanazt a quotation sort adta vissza, és nem modellezte az új, opcionális source lookupokat. A tesztben a két új külső source lekérdezést külön mockoltam; a route viselkedése nem változott.
- Végső `npm test`: **193 fájl PASS / 8 SKIP; 1238 teszt PASS / 19 SKIP**.
- Érintett fájlokra futtatott ESLint: **PASS, nincs hiba**. A záró quotation suite: 26 fájl / 51 teszt **PASS**.
- Izolált ellenőrző másolaton futott `npm run typecheck` és `npm run build`: **PASS**. A checkoutban futó dev szerver `.next` könyvtárát nem használtam buildkimenetként.
- Záró Vitest-futtatás célzott volt, nem teljes regresszió: 26 quotation tesztfájl / 51 teszt PASS. A teljes `npm test` korábbi futásának számai történeti eredményként maradnak a fenti szakaszban.
- `git diff --check`: **PASS** a végleges diffen.

## Végső döntés és nyitott pontok

Nem találtam bizonyított nyitott P1 hibát. A mérföldkő **PASS WITH LIMITATIONS**: az E11 RPC-negatív esetek, a 4 oldalas A4 PDF, az UI/PDF nettó paritás, a kért emulált nézetmátrix, a célzott Vitest/Lint, az izolált typecheck/build és a helyi pgTAP mind bizonyítottak. Korlát: a teljes Vitest-regressziót nem futtattam újra; a responsive teszt Chromium emuláció, nem fizikai készülék; E03 figyelmeztetés csak UX-javaslat maradt, üzleti szabály jóváhagyására vár.

**Javasolt Conventional Commit:** `fix(M10.3.1): complete combined-source acceptance and PDF provenance`
