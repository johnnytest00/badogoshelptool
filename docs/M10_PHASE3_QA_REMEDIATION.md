# M10.3.1 remediation és átvételi QA

Dátum: 2026-10-27  
Döntés: **PASS WITH LIMITATIONS**

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
| E11 — jogosulatlan vagy hiányzó forrás | **NOT VERIFIED** | A mentési útvonal forrás- és revisionazonosságát a meglévő action/RPC szerződés validálja; friss, negatív böngészős esetet a helyi DB elérhetetlensége miatt nem futtattam. A route meglévő auth tesztjei a teljes Vitestben lefutottak. |
| E12 — runtime és duplicate-key konzolhiba | **PASS** | A konzol ürítése után a kalkulátor oldal frissen betöltött. A normál Next/HMR tájékoztatókon kívül nem jelent meg új runtime vagy duplicate-key üzenet. |

### PDF és nézetmátrix

- A PDF-et böngészőben ténylegesen rendereltem és vizuálisan ellenőriztem, nem csak a HTTP-választ. A rövid négysoros változat egy A4 oldalra fért. Többoldalas PDF-et nem készítettem.
- A korábbi független QA 393×852 sötét mobilnézetet nézett. E menetben a kombinált mentési folyamat sötét desktop nézetben futott; 1440×900-at a DevTools mezőivel megbízhatóan újrabeállítani nem sikerült.
- **NOT VERIFIED:** 375×812 világos, 375×812 sötét, 812×375 fekvő, ellenőrzött 1440×900 és többoldalas A4 oldaltörés. A világos témát ebben a menetben nem vizsgáltam.

## Adat, jogosultság, konzisztencia

- A felhasznált szervezet és tételek DEMO adatok; minden kézi egységár mellett DEMO megjegyzés szerepelt. Nincs kitalált adókulcs vagy bruttósítás.
- A regressziós ellenőrzés két további, egyértelműen DEMO címkézett piszkozatot hagyott a helyi szervezetben: material-only V1 és kézi V1. Ezeket nem töröltem.
- A böngészős mentés/újranyitás igazolta a revisionhöz kötött források és a sorok fennmaradását. V1 és V2 külön állapotként jelent meg; a V1 újranyitása nem mutatta a V2 kézi mennyiségváltozását.
- A kód változatlanul az existing standalone quotation actiont, forráslekérő műveleteket, revision snapshotot és provenance-táblákat használja. A kérésben szereplő kombinált migrációhoz és RPC-hez nem adtam új jogosultsági réteget.
- A korábbi független QA riport helyi migráció- és 53 pgTAP assertion eredményt rögzít. Ezt nem állítom friss eredménynek. Saját pgTAP újrafuttatásom blokkolt: `ECONNREFUSED 127.0.0.1:54322`; Supabase adatbázist nem indítottam és nem reseteltem.

## Automatizált ellenőrzés

- Célzott quotation/source/PDF Vitest: **18 teszt PASS**; későbbi PDF/source selector célfutás: **7 teszt PASS**.
- A teljes Vitest első futásakor a standalone PDF route teszt hibásan 500-at kapott, mert a mock Supabase kliens minden táblához ugyanazt a quotation sort adta vissza, és nem modellezte az új, opcionális source lookupokat. A tesztben a két új külső source lekérdezést külön mockoltam; a route viselkedése nem változott.
- Végső `npm test`: **193 fájl PASS / 8 SKIP; 1238 teszt PASS / 19 SKIP**.
- Érintett fájlokra futtatott ESLint: **PASS, nincs hiba**.
- Izolált ellenőrző másolaton futott `npm run typecheck` és `npm run build`: **PASS**. A checkoutban futó dev szerver `.next` könyvtárát nem használtam buildkimenetként.
- PgTAP célfuttatás: **BLOCKED**, mert a helyi Postgres nem futott. Nem futtattam resetet.
- `git diff --check`: a dokumentáció és diff lezárása előtt futtatandó.

## Végső döntés és nyitott pontok

Nem találtam bizonyított nyitott P1 hibát a rövid PDF-ben vagy a kombinált UI-mentésben. A mérföldkő **PASS WITH LIMITATIONS**, nem teljes PASS: E03-nál nincs automatikus duplikációs figyelmeztetés, E11, a pontos viewport-/téma mátrix, a többoldalas PDF és a friss pgTAP ellenőrzés hiányzik. Ezeket a korlátokat nem tekintem bizonyított hibamentességnek.

**Javasolt Conventional Commit:** `fix(M10.3.1): complete combined-source acceptance and PDF provenance`
