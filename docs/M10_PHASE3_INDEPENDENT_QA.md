# M10.3 független QA riport

## Döntés

**FAIL — az M10.3 jelen állapotában nem zárható le.**

**Lezárható-e az M10.3? Nem.** A kombinált mentés és a két forrás tartós, revízióhoz kötött rögzítése működött. A kötelező PDF-ellenőrzés viszont tényleges ügyféloldali megjelenítési hibákat talált; az ajánlaton látható tételszámláló is eltért a megjelenített tételek számától. A normál felületi belépési útvonalat és a kért teljes viewport-/témamátrixot nem sikerült teljesen bizonyítani.

## Környezet és munkafa

- HEAD: `9965dd5938ccdba1741b2bbe25a3cdcadefea875`, branch: `feat/m1-length-input`, a branch a vizsgálat indulásakor 14 commit-tal előrébb járt.
- A vizsgálat előtt már módosítottként látszott: `docs/PROGRESS.md`, az új ajánlat oldala, a PDF route és dokumentumok, quotation action/test fájlok, valamint `database.types.ts`. Már meglévő, untracked elemek: `.vitest/`, az M10.3 migráció és a `063` pgTAP teszt. Ezeket a riport kivételével nem módosítottam.
- Az alkalmazáskódhoz, migrációkhoz és adatbázissémához nem nyúltam. Helyi, hitelesített DEMO szervezetben egy anyaglista V2-t és egy ajánlat V1/V2-t mentettem, a feladat kifejezett engedélye szerint. Nem történt reset, commit, push vagy deploy.

## Meglévő rendszer és M10.3 határa

Az M10.3 a már meglévő `quotations` / `quotation_revisions` standalone ajánlati rendszert és annak szerveroldali mentését használja; nem találtam második ajánlatrendszert. A munkanaplóhoz kötött és a standalone ajánlat ownership-scope-ja külön maradt. A PDF-routon keresztül csak draft ajánlat készült, a dokumentum maga is „PISZKOZAT / NEM VÉGLEGES AJÁNLAT” jelzést kapott.

Az új migráció `save_standalone_quotation_from_material_list_and_calculation` függvénye a meglévő draft mentő RPC-t hívja, majd mindkét forráskapcsolatot ugyanahhoz a mentett quotation revisionhöz köti. A kalkuláció és az anyaglista külön mentett revízióazonosítóval követhető. Az ajánlatsorok kézi szerkesztése nem írta át a források revízióit.

## DB / RPC trust boundary

- A `supabase migration list --local` szerint a `20261027030000_quotation_combined_source.sql` ténylegesen alkalmazva volt a helyi adatbázisra.
- Az RPC SECURITY DEFINER; `search_path` üresre állított. A tényleges ACL-lekérdezés szerint az `authenticated` szerepnek van EXECUTE joga, `anon` és `public` szerepnek nincs.
- A migráció forráskódjában az actor–organization tagságot, standalone ownership-scope-ot, ajánlat/lajta/kalkuláció szervezeti kötését, creator/execution-plan scope-ot, konkrét anyaglista- és kalkulációs revisiont, kalkulátor-típust, valamint a forráskulcsok formátumát ellenőrzi. A hibák nem adják vissza a jogosulatlan forrás adatait. A forrás- és quotation-revíziók kapcsolatát FK-k és immutability triggerek támasztják alá. A számítási forrás sorát `FOR SHARE` lockkal olvassa.
- A mentés egy tranzakcióban történik; a meglévő draft writer kezeli az optimista revízióverziót, az új wrapper a source request key-ket és meglévő forráskapcsolatokat ellenőrzi. PgTAP-ban az idempotens retry nem hozott létre duplikált provenance-t.
- A tényleges helyi E2E mentés után read-only lekérdezés igazolta, hogy V1-en és V2-n is pontosan egy anyaglista- és egy kalkulációs provenance sor van, mindkettő ugyanarra az ajánlatrevízióra és változatlan forrásrevision ID-kre mutat.
- A kombinált teszt a sikeres mentést, a konkrét revision-kötést, retryt és az azonos line index ütközését fedi. A kért negatív jogosultsági mátrix (nem létező/idegen szervezetű/hamisított revision, actor- és scope-eltérés, hibás forrástípus, vegyes szervezet) nem szerepel mind külön új kombinált pgTAP-esetként; ezekre csak a függvénykódot ellenőriztem. Két külön forrásból jövő részleges hiba és konkurens kétkéréses RPC-próba nem futott.

## PgTAP és pénzügyi ellenőrzés

Helyi adatbázis, reset nélkül futtatott parancs:

```text
supabase test db --local supabase/tests/database/063_quotation_combined_source.sql supabase/tests/database/033_quotation_material_list_sources.sql supabase/tests/database/058_quotation_calculation_sources.sql supabase/tests/database/062_construction_field_transfer_rollback_and_quotation_source.sql
```

**PASS: 4 fájl, összesen 53 pgTAP ellenőrzés.** Minden teszt rollbackkel zárult. A korábbi fejlesztő által közölt 1362 pgTAP / 1236 Vitest, lint, typecheck és build eredményeket nem tekintettem saját, frissen megszerzett bizonyítéknak.

A célzott Vitest futás **PASS: 8 fájl, 39 teszt** volt: `standalone-quotation-calculation-source.test.ts`, `calculation-quotation-source.test.ts`, `material-list-quotation-import.test.ts`, `material-list-quotation-actions.test.ts`, domain `money`, `standalone`, `financial-contract`, valamint `standalone-quotation-pdf`. `git diff --check` **PASS** volt.

A forráskód és tesztpéldák szerint mennyiség és egységár skálázott egész pénzértékkel számol; a DB mentés soronként számol, majd a sorösszegeket adja össze. Példák: 36 × 3 000 = 108 000 Ft; 120 × 1 000 = 120 000 Ft; 35 × 2 500 = 87 500 Ft; 8 × 5 000 = 40 000 Ft. V1 anyag részösszeg 315 500 Ft, munkadíj 40 000 Ft, teljes nettó HUF összeg 355 500 Ft. V2-ben a munkadíj mennyisége 9-re változott: 45 000 Ft munkadíj, összesen 360 500 Ft. A DB snapshot és a UI ugyanezeket az összegeket mutatta.

A vizsgált ajánlat mindegyik ára DEMO-ként volt beírva; az explicit sormegjegyzés a fő sorokon „DEMO nettó ár, nem piaci adat”. A modell egységes nettó HUF-ot mentett. ÁFA-kezelés, bruttó összeg és fizetendő végösszeg null maradt; adókulcsot a rendszer nem talált ki. Hiányzó árnál a szerkesztő nem végleges ajánlatként jelölte a részösszeget. Egységkonverzió nem történt. A kalkuláció 36 db szarufa sora és az anyaglistában lévő 35 db szarufa külön sor maradt; mindkettő eredetét a szerkesztő címkézte, és az összeg mindkettőt tartalmazta. Automatikus egyezés-, kihagyás- vagy egyesítési figyelmeztetést nem láttam.

## Böngészős E2E

A helyi auth session és DEMO szervezet azonosítása után a mentett anyaglistán V2 készült (120 m² tetőfedő anyag és 36 db szarufa). A mentett roof material takeoff V1 négy felvehető eredményt mutatott, köztük 36 db szarufát. A kombinált `/ajanlatok/uj` útvonalat mindkét konkrét forrás- és revízióazonosítóval nyitottam meg; mindkét forráskártya és az anyaglista két sora látszott. A kalkuláció 36 db-os sort a forrásjelölt gombbal vettem fel; a duplikált szarufa sorok külön maradtak.

A mentés után az ajánlatot teljes oldalú URL-navigációval újranyitottam. Az ajánlat sora, a munkadíj, az árak, a nettó HUF összeg és mindkét forráskártya megmaradt. Ezután kézi mennyiségmódosítással V2 keletkezett; a V1 továbbra is külön, kiválasztható revisionként szerepelt. Read-only DB lekérdezés mindkét ajánlatrevisionhez ugyanazt az anyaglista V2 és kalkuláció V1 forrásrevisiont mutatta.

Az alternatív belépési útvonalat a mentett kalkuláció felületéről is megnyitottam: az „Árajánlat készítése a V1 revízióból” link a helyes kalkulációs revisionnel nyitotta az új draft ajánlatot. A kalkulációs forrás a szerkesztőben megmaradt. Az Árajánlatok felületről történő, mindkét forrásra kiterjedő normál kiválasztófolyamatot nem tudtam bizonyítani: a kombinált E2E-hez a két source paraméterrel összeállított útvonalat nyitottam meg, a szerkesztőben nem találtam mindkét forrásra közös kiválasztót.

## PDF / nyomtatás

A mentett V1 PDF-előnézete ténylegesen betöltött, **egy A4 oldalra** fért; a draft státusz, négy sor, munkadíj és 355 500 Ft összeg megjelent. Belső UUID-t a PDF dokumentumtörzsében nem láttam. Az összegek megegyeztek a mentett snapshotokkal.

Az előnézet két konkrét megjelenítési hibát mutatott:

1. Az anyaglistából átvett `square_meter` és `piece` belső egységkódok PDF-re kerültek `m²` / `db` helyett. A `square_meter` szöveg ráadásul a mennyiséggel összefolyva, sortöréssel tört meg. Ez ügyfélnek szánt dokumentumban félreérthető mértékegységet eredményez.
2. A kalkulációs forrás neve és típusa látszott, de a `v1` revisionjelölés helyén hibás karakter jelent meg (`v�`). Az anyaglista eredete nem jelenik meg külön a PDF-en, így a dokumentum nem különbözteti meg, mely sor származik az egyes forrásból.

A PDF egyoldalas A4 törése ebben a négysoros mintában rendben volt; hosszú dokumentum, többoldalas táblázat és nyomtató párbeszéd nem volt vizsgálva. A jelenlegi draft státuszt a dokumentum nem tüntette fel végleges ajánlatként.

## UI / konzol

- Sötét témában, desktopon ellenőriztem a kombinált ajánlatot, a forrásjelöléseket, a mennyiségeket, az árbevitelt, az összesítést és a mentést. A DevTools alap responsive mérete 1440×900 volt.
- iPhone 16 emulációban 393×852 méretű álló nézetet vizuálisan megtekintettem. A kártyák egy oszlopban jelentek meg, az űrlap használható volt; a rögzített alsó mentősáv a kártya tartalmára ráfed, ezért az alsó tartalom görgetést igényel. A pontos 375×812 méretet és a kért 812×375 fekvő nézetet az emulátor dimenziómezőinek hibás kezelése miatt nem sikerült beállítani; ezeket nem minősítem PASS-nak. A világos témát nem ellenőriztem.
- DevTools konzolban a kalkulációs oldalon 10 ismételt React figyelmeztetés jelent meg: duplikált key `Szarufa · Névleges keresztmetszeti térfogat`. A konkrét 36 db-os forrássor kiválasztása a próbán működött, de a figyelmeztetés lehetséges ismétlődő/kihagyott elemekre utal; az eredetét nem lokalizáltam az M10.3 diffhez.

## Megállapítások

- **P1 — PDF egységkódjai nem ügyfélbarátak.** `square_meter` és `piece` kerül a dokumentumba, az előbbi vizuálisan össze is törik a mennyiséggel. Minimális javaslat: a PDF megjelenítési réteg használja ugyanazt az egységcímke-megfeleltetést, mint az ajánlatszerkesztő; a mentett forrásértéket ne alakítsa át.
- **P2 — a kalkulációs revision jelölése sérült, az anyaglista eredete hiányzik a PDF-ről.** A dokumentumban a `v1` hibás glyphként jelent meg, és a két forrásból származó tételek ügyfélnek szóló eredetjelzése hiányzik. Minimális javaslat: validált revision számot renderelni és a PDF-ben olvasható forrásnevet/revíziót megjeleníteni, UUID nélkül.
- **P2 — tételszámláló eltérés.** Az ajánlatszerkesztő fejlécében „Tételek 3” szerepelt, miközben négy sor volt látható és mind a négy az összegbe került.
- **P2 — kombinált forrásválasztó nem bizonyított.** A combined route működött, de a két forrás együttes kiválasztását nem a normál Árajánlatok UI-ból végeztem; a vizsgált útvonalat URL-paraméterekkel kellett összeállítanom.
- **P2 — ismételt React duplicate-key figyelmeztetés.** 10 azonos figyelmeztetés jelent meg a kalkuláció felületén. M10.3 kapcsolata nem igazolt, de a kiválasztó UI-biztonságára vizsgálatot igényel.

## Nem ellenőrzött esetek és korlátozások

Nem futott teljes Vitest, lint, typecheck vagy production build. Nem futott negatív, jogosultsági esetek teljes RPC-mátrixa, konkurens mentési próba, forrásrevízió közbeni versenyhelyzet vagy hosszú/többoldalas PDF. Nem ellenőriztem világos témát, pontos 375×812 és 812×375 viewportot, illetve a nyomtatási párbeszédet és többoldalas oldaltörést. A korábbi fejlesztő által közölt teljes tesztfuttatásokat nem tekintettem függetlenül megismételt bizonyítéknak.
