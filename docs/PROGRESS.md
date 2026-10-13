# F7.3.2 állapot

## F8.1 — ajánlati piszkozatok (kész)

- Elkészült a projekt alatti `/projektek/[projectId]/ajanlatok` magyar,
  mobilbarát szerkesztő: anyag, munkadíj és egyéb sor, ügyfél, kézi vagy
  katalógusár, approved takeoff-forrás, mentés és újranyitás.
- A `quotations` / `quotation_revisions` migration és az atomikus,
  optimistic-concurrency `save_quotation_draft` RPC megőrzi az immutable
  bemeneti, anyag- és ársnapshotokat; nettó/bruttó keverés tiltott.
- A fixpontos HUF domain-referenciaesetek 4/4 PASS. Az F8.1.1 lokális
  migration-replay, 180/180 pgTAP és browser-flow sikeres; a browser során
  talált idempotencia-snapshot hibát javítottam, így a valódi tételmódosítás új
  revíziót készít, azonos mentés továbbra is idempotens.
- A browser-flow-ban a jóváhagyott `171,875 square_meter` takeoff-tétel
  kontrolláltan kiválasztható volt; történeti takeoff-adatot nem módosítottam.

### F8.1 korlátok

Nincs PDF vagy jogilag végleges dokumentum, VAT-motor, küldés, elfogadás,
számlázás vagy automatikus árképzés.

## F8.2 — professzionális PDF-ajánlat (kész)

- Az immutable ajánlati revíziókból szerveroldali, Node runtime-os
  `@react-pdf/renderer` pipeline készít A4-es, többoldalas PDF-et; a magyar
  karaktereket beágyazott Noto Sans font biztosítja.
- Az F8.1 mentés dokumentum-meta snapshotot is őriz (projekt és ügyfél
  adatai), valamint kategória-összesítőket. A PDF nem számol újra pénzügyi
  értéket, a revízió saját sortételeit és mentett összegét használja.
- A projekt ajánlati oldalán minden revízióhoz elérhető a PDF előnézet,
  letöltés és natív böngészős nyomtatás. A történeti revízió külön ID alapján
  nyitható meg, a route hitelesítést, szervezeti tagságot és projekt/ajánlat/
  revízió tulajdonlást ellenőriz.
- A dokumentum nettó/bruttó besorolást, hiányos piszkozat-figyelmeztetést,
  kategória szerinti részösszegeket, biztonságos fájlnevet és oldalszámot
  jelenít meg; ÁFA-kulcsot vagy számlázási állítást nem talál ki.
- Ellenőrzés: 20 Vitest fájl / 77 teszt PASS, typecheck PASS, lint PASS,
  production build PASS; a helyi browser-flow-ban a PDF előnézet 200-as
  választ, magyar ékezeteket, többoldalas-kompatibilis A4 elrendezést és a
  mentett 27 498,50 HUF összeget mutatta.

### F8.2 ismert korlátok

Az F8.1-ben létrejött régi revíziók nem tartalmaznak dokumentum-meta snapshotot;
ezeknél a PDF ezt az adatot hiányzóként kezeli, nem örököl utólagos mutable
ügyfél/projekt adatot. Automatikus küldés, számla és jogi adózási minősítés nem
készült.

## F8.3.1 — ajánlatkezelés és véglegesítés (kész)

- Elkészült az ajánlati projektoldal szervezett listája, referencia/ügyfél
  keresése, állapotszűrése, revízió- és összegmegjelenítése.
- A draft és finalized állapotot új, lokálisan alkalmazott migráció kezeli;
  a véglegesítés szerveroldali tagság-, projekt-, revízió-, ügyfél-, tétel- és
  pénzügyi ellenőrzéseket végez.
- A finalize_quotation SECURITY INVOKER RPC sorzárolással és expected versionnel
  védi a stale/concurrent finalize eseteket; a lezárt ajánlatot trigger és RPC
  is immutable-ként kezeli.
- A lezárt ajánlat rögzíti a pontos revíziót, időpontot és felhasználót. PDF-je
  mindig ehhez a revízióhoz kötődik; duplikálás új, szerkeszthető piszkozatot
  hoz létre, az eredeti változatlan marad.
- Ellenőrzés: célzott pgTAP 8/8 PASS, Vitest 20 fájl/77 teszt PASS,
  typecheck/lint/build PASS; browser-flow: lista → review → finalize → locked
  állapot → PDF előnézet → új piszkozat duplikálása.

### F8.3.1 korlátok

Nem készült küldés, elfogadás, számlázás, további üzleti státusz, ÁFA-motor vagy
F8.3.2 funkció. A helyi smoke-flow a meglévő DEMO-jelölt fejlesztési adatokkal
futott; távoli Supabase-változás nem történt.

## F8.3.2 — ajánlati életciklus és státusztörténet (kész)

- Az ajánlatok életciklusa: piszkozat, véglegesített, elküldött, elfogadott,
  elutasított. Az engedélyezett átmenetek: draft → finalized → sent →
  accepted/rejected; az elfogadott és elutasított állapot terminális.
- Elkészült az append-only quotation_status_events tábla, szervezeti RLS,
  immutable jogosultsági modell és tranzakciós státuszesemény-trigger.
- A transition_quotation_status SECURITY INVOKER RPC tagságot, projekt- és
  ajánlattulajdonlást, aktuális állapotot, expected versiont és finalized
  revízió-konzisztenciát ellenőriz; a párhuzamos döntések közül csak az első
  sikeres.
- A felület magyar státuszszűrőt, állapotfüggő műveleteket, manuális
  elküldöttnek jelölést, ügyféldöntés-megerősítést, opcionális megjegyzést és
  valós státusztimeline-t mutat. Automatikus e-mail, kézbesítési bizonyíték,
  elektronikus aláírás, számla vagy szerződés nem készül.
- A PDF- és pénzügyi snapshot változatlan marad; a finalized/sent/accepted/
  rejected státuszok ugyanahhoz a rögzített revízióhoz kötődnek.
- Ellenőrzés: Vitest 21 fájl/79 teszt PASS, typecheck/lint/build PASS,
  célzott pgTAP 19/19 PASS, browser smoke finalized → sent → accepted →
  timeline → PDF → terminális műveletek PASS.

## Katalógushoz kötött, verziózott lemezkiosztás

- Az aktuális szervezet aktív lemez-/tetőfedés terméke és variánsa választható; a server action, RLS és összetett FK tiltja a keresztszervezeti hivatkozást.
- Csak explicit katalógusmezők és dokumentált műszaki kulcsok képezhetők le. A hasznos szélesség soha nem következtethető a névlegesből; hiányzó adat kézzel, `user_provided` provenance-szel adható meg.
- A `covering.metal-sheets.layout` a meglévő `calculations` / immutable `calculation_revisions` láncot használja. Minden verzió konkrét tetőrevízióhoz, `roof.gable` revízióhoz és anyagvariánshoz kötött.
- A szerver újrafuttatja a kalkulátort; a SECURITY INVOKER mentés atomikus, expected revisionnel védett és azonos snapshotnál idempotens.
- A történeti input/output, anyagspecifikáció és forrásgeometria visszanyitható. A felület külön jelzi a geometriai és releváns katalógus-stale állapotot; árverzió önmagában nem invalidál geometriát.
- Anyagkimutatásba csak aktuális, mentett layout adható át. Automatikus javaslat kizárólag `square_meter` egységnél, ellenőrzött tetőfelületből és explicit ráhagyással készül; más egység kézi workflow-t igényel. A cél mindig draft, soha nem approved.
- Az F7.3.1 SVG és a fizikai iPhone-on igazolt pan/pinch/pointer kód változatlan; történeti layout a saját történeti nyeregtető-outputjával rajzolódik.
- Ellenőrzés: 19 Vitest fájl / 73 teszt PASS, 172/172 pgTAP PASS, typecheck és lint PASS. A teljes migrációlánc eldobható Supabase shadow DB-n lefutott, a sémadiff üres.
- Böngészős flow: DEMO variáns, kézi 1000 mm → V1/26 sáv, 1250 mm → V2/20 sáv, V1 visszanyitás, tető V4 után stale jelzés, friss layout V3, majd 164,0625 m² draft; automatikus jóváhagyás nem történt.

## F7.3.2 korlátok

- Nincs gyártóspecifikus szerelési szabály, automatikus darabolás/toldás, csavarszámítás, beszerzés, ÁFA vagy ajánlat.
- Darab-, folyóméter- és csomagegységhez nincs kitalált automatikus átváltás; ezek a meglévő kézi anyagkimutatási folyamatot használják.

---

# F7.3.1 állapot

## Tetőlemez-kiosztás és ideiglenes SVG-előnézet

- Elkészült a tiszta, determinisztikus `covering.metal-sheets.layout` kalkulátor, és bekerült a production Calculator Registrybe.
- A számítás az F5 kimenetéből kapott hosszanti tetőkezdő-/végpontot és ferde hosszt használja. Nem duplikál nyeregtető-geometriát.
- Támogatott a felhasználó által megadott hasznos fedési szélesség, külön opcionális névleges szélesség, bal/jobb indulás, minimum/maximum hossz és végoldali ráhagyás.
- A kimenet tetősíkonkénti és összes sávszámot, teljes és részleges fedési intervallumot, determinisztikus X-koordinátákat, geometriai és ideiglenes lemezhosszt, valamint gyártási korlátjelzést ad. Fizikai vágási szélességet, átfedést, árat vagy gyártói jóváhagyást nem következtet.
- Referenciaeredmények: 12 500 mm tetőhossznál 1000 mm → 13/26 sáv és 500 mm szélső sáv; 1250 mm → 10/20 sáv, részleges sáv nélkül; 800 mm → 16/32 sáv és 500 mm szélső sáv.
- A legfeljebb 400 sáv/tetősík renderbiztonsági határ strukturált `UNSUPPORTED_OPERATION` hibát ad; a mennyiséget nem csonkolja.
- A meglévő SVG-rendszer új, alapból kikapcsolt `Lemezkiosztás` réteget kapott. Felülnézetben mindkét tetősík valós kalkulált sávkoordinátáit, váltakozó sávokat, részleges szélső sávot és olvasható esetben indexeket mutat.
- A meglévő F7.2.4 zoom/pan/pointer logika változatlan. A mobil súgó szövege: „Egy ujjal a rajz vonala mentén húzva mozgathatod, két ujjal nagyíthatod.”
- A kalkulátorban mobilbarát, élő paraméterpanel és eredményösszesítő készült. A kiosztás egyértelműen ideiglenes, nem mentett előnézet; revíziót, anyagkimutatást és adatbázist nem módosít.
- Ellenőrzés: 18 Vitest fájl / 69 teszt PASS; typecheck, lint és webpack production build PASS. Egy fókuszált helyi browser-flow-ban 1000 mm szélesség → 26 SVG-sáv, 2 részleges sáv, irányváltás és 320 px overflow-mentesség igazolt.

## F7.3.1 ismert határok és F7.3.2

- Csak szimmetrikus, két téglalap síkú nyeregtető, egy darabból eresztől gerincig futó sávok, keresztirányú toldás nélkül.
- Gyárthatóság kizárólag a felhasználó által megadott hosszkorlátokhoz viszonyított előzetes jelzés; nincs gyártói szerelési terv.
- F7.3.2-ben elkészült a verziózott kiosztás-perzisztencia és az explicit katalógusvariáns-kapcsolat. Jóváhagyott anyagkimutatás automatikus módosítása továbbra sem megengedett.

---

# F7.2 állapot

## Jelenlegi fázis

F7.2 — Forrásrevízióhoz kötött anyagkimutatás és jóváhagyott anyagválasztás.

## F7.2 elkészült

- Elkészült a tiszta `material-takeoffs` domain: terület-, vonalhossz- és kézi mennyiség, explicit egységkompatibilitás, ráhagyás és kézi korrekció-indok.
- Elkészült a `material_takeoffs` és `material_takeoff_items` lokális Supabase séma, szervezeti összetett FK-kal, draft/approved állapottal és snapshot mezőkkel.
- A kimutatás kizárólag ellenőrzött, mentett `roof.gable` kalkulációs revízióból hozható létre; az implementáció- és input-séma-verzió szerveroldalon validált.
- Az anyagtétel a kiválasztott variáns és opcionális konkrét F7.1 árrekord snapshotját őrzi; hiányzó ár nem lesz nullából vagy legfrissebb mutable rekordból pótolva.
- Elkészült a szerveroldali újraszámítás, egységkompatibilitás, stale-forrás tiltás, admin/tulajdonosi atomikus jóváhagyás és approved snapshot immutabilitás.
- A projekt részletező oldaláról elérhető a `/projektek/[projectId]/anyagkimutatas` útvonal.

## F7.2 ellenőrzés

- Helyi migrációk: `20261012050000_material_takeoffs.sql`, trigger-hardening és approval-policy migráció sikeresen alkalmazva; távoli Supabase nem érintett.
- Helyi pgTAP: 146/146 PASS, beleértve táblák, RLS, szervezeti izoláció, forrásrevízió, approval és approved immutabilitás ellenőrzéseit.
- Vitest: 17 fájl / 56 teszt PASS; a referenciaeset 140,625 m² + 10% = 154,6875 m², gerinc 12,5 m, eresz 25 m és piece-kompatibilitás külön tesztelt.
- `npm run db:types`, typecheck, lint és webpack production build PASS.
- F7.2.1 böngészős QA: helyi DEMO login → meglévő projekt → rev. 2 forrás → draft → területi tétel → reload → approval → rev. 3 forrásmódosítás → stale figyelmeztetés → új draft → logout ellenőrizve.
- A lokális projekt tényleges geometriai értéke 156,25 m² volt, ezért a böngészős 10%-os DEMO területi eredmény 171,875 m²; a 140,625 m² → 154,6875 m² referencia külön domain/Vitest tesztben igazolt.
- F7.2.1 javítások: szerver action hibák látható `useActionState` visszajelzést kaptak; kijelentkezett takeoff-route most loginra irányít `returnTo` paraméterrel.
- Read-only DB ellenőrzésben az approved tételek és a konkrét 15 000 HUF ár snapshotja megmaradt.
- F7.2.2 helyi DEMO lineáris variáns készült: `linear_meter`, ár/gyártó/műszaki specifikáció nélkül; távoli Supabase nem érintett.
- F7.2.2 pozitív browser-flow: a gerinc 12,5 m-es értéke mentés és reload után `12,5 linear_meter` formában, a lokális DB-ben `12.500000` értékkel megmaradt.
- F7.2.2 valódi concurrency: két külön PostgreSQL-kapcsolat ugyanazt a draftot hagyta jóvá párhuzamosan; pontosan egy kérés lett approved, a másik verzió/státusz hibával elutasult. A jóváhagyott tétel immutable maradt.
- F7.2.2 responsive QA: a dashboard, projektoldal, nyeregtető-kalkulátor/SVG és anyagkimutatás 320/375/390/430 px viewporton ellenőrizve. Két overflow-regresszió javítva, újratesztelve mindegyik céloldal overflow-mentes.
- A `supabase/config.toml` már `[local_smtp]` szekciót használ; deprecated `[inbucket]` szekció nincs jelen.

## F7.2.3 mobil UX és SVG stabilizálás

- A mobil kontrasztprobléma oka a túl halvány `--muted` token, illetve a feliratok és keresőmezők örökölt szín-/flex-szabályainak ütközése volt. A javítás szemantikus világos/sötét téma-tokenekkel készült; a projektlista, projektkártyák, státuszok, űrlapok és keresőmezők tényleges hátterükön olvashatók.
- A projektkezelési oldalakon új, újrahasznosítható `BackNavigation` vezérlő jelent meg: determinisztikus szülőútvonal, nyíl, felület/border, fókuszállapot és mobil touch target.
- A projektkereső egyetlen, vízszintesen rendezett kontroll lett; az ikon az inputon belül marad, a 320–1440 px ellenőrzéseken nincs dokumentum-overflow.
- A saját SVG viewport megoldás maradt. A `react-zoom-pan-pinch` kompatibilitását és képességeit áttekintettem, de új függőség nélkül, kisebb kockázattal javítható volt a meglévő TypeScript megoldás.
- A viewport most külön kezeli a nagyítást, illesztést és visszaállítást: `Fit` a rajz és annotációk bounds-a alapján számol, `Reset` a dokumentált 100%-os kezdőnézetet állítja vissza. Az egyujjas pan, kétujjas pinch, fókuszpont-megtartás, pointer cancel/release és view-váltási újraillesztés stabilizálva lett.
- A rajzvezérlők magyar akadálymentes neveket, tooltipet, zoom százalékot és csoportosított toolbart kaptak; a hat réteg kapcsolója megmaradt.
- Explicit böngészős viewport-ellenőrzés: 320×700, 375×812, 390×844, 430×932, 768×1024 és 1440×900. A projektlista keresője egy soros, a rajznézetek és rétegek elérhetők, `scrollWidth === clientWidth` minden vizsgált méreten. Fizikai iPhone multi-touch végrehajtása ebben a környezetben továbbra sem történt.
- F7.2.3 tesztállapot: 17 Vitest fájl / 58 teszt PASS; typecheck, lint és webpack production build PASS. Adatbázis- és migrációs kód nem változott.

## F7.2.4 touch pan finomhangolás

- Az egyujjas pan pontatlanságának oka az volt, hogy a pointer-delta közvetlenül viewBox-egységként került a pan állapotba; ez zoomnál nem adott 1:1 képernyőkövetést, és a preserveAspectRatio letterbox-területét sem vette figyelembe.
- A klienspont → viewBox leképezés most a tényleges SVG-renderelt területet és középre igazítást veszi figyelembe. A pan delta zoom-kompenzált, threshold nélkül indul, és az első néhány pixeltől követi a pointert.
- Pointer release/cancel után a megmaradó egyujjas gesztus újraalapozódik; pinch → pan átmenetnél nincs korábbi kezdőpontból eredő ugrás. A rajzon kívüli oldal-scroll, zoom, fit, reset és rétegek kódja változatlan maradt.
- Célzott viewport ellenőrzés: 1 fájl / 7 teszt PASS; typecheck és lint PASS. A felhasználó ezt követően fizikai iPhone-on sikeresen ellenőrizte a touch pan működését.

## F7.2 nyitott korlátok

- Az eldobható concurrency draft jóváhagyás után az immutable trigger miatt nem törölhető megkerülés nélkül; az azonosított DEMO rekord a lokális DB-ben maradt, távoli adatot nem érint.
- `npm audit` továbbra sem verifikálható az npm registry DNS-hibája miatt.

## Következő fázis

F7.3 — csak külön jóváhagyással; ajánlat, készlet, ÁFA és rendeléslogika nem készült.

---

# F7.1 állapot

## Jelenlegi fázis

F7.1 — Szervezetileg izolált anyagkatalógus, termékvariánsok és árhistorika.

## F7.1 elkészült

- Elkészült a `material_manufacturers`, `material_products`, `material_variants` és `material_prices` lokális Supabase sémája.
- Az új migrációk UUID-ket, szervezeti összetett FK-kat, indexeket, timestamp triggereket, RLS-t és explicit authenticated grantokat használnak.
- A katalógus támogatja a tetőfedés, lemez, ereszcsatorna, szegély/bádog, szigetelés, faanyag, kiegészítő és egyéb kategóriákat.
- Elkészült a gyártó létrehozása, listázása és szerkesztése; valódi gyártói adat nem került seedbe.
- Elkészült a termék létrehozása, listázása, keresése, kategória- és archivált-szűrése, szerkesztése, archiválása és visszaállítása.
- Elkészültek a termékvariánsok opcionális méretmezőkkel, purchasing unit-tal, SKU-val, JSON technikai adatokkal és provenance mezőkkel.
- Az árak HUF NUMERIC mezőben, külön immutable árrekordként tárolódnak; az árhistorika nem írható felül vagy törölhető.
- A latest price szabály determinisztikus: `effective_date DESC`, `recorded_at DESC`, `id DESC`.
- Elkészült a `/anyagok`, `/anyagok/uj` és `/anyagok/[productId]` authenticated UI.
- A Dashboard „Anyagok” eleme működő, szervezethez kötött link lett; a Scaling Bubble nem került be az anyagkatalógus oldalakra.
- A szerver actionök külön hitelesítést és szervezeti tagságot ellenőriznek; a böngészőből érkező organization ID önmagában nem jogosít.
- A Supabase típusok lokális sémából újragenerálva.

## F7.1 ellenőrzés

- Helyi pgTAP: 127/127 PASS.
- Vitest: 16 fájl / 53 teszt PASS.
- Typecheck, lint és production build PASS.
- Böngészőben lokális admin belépés, gyártó, termék, variáns, két árverzió, árhistorika, keresés/szűrés, archiválás és visszaállítás ellenőrizve.
- Távoli Supabase, import, scraping, mennyiségszámítás, ÁFA- és ajánlatlogika nem készült.

## F7.1 nyitott korlátok

- Dedikált 320–1440 px viewport-emuláció és fizikai mobil multi-touch továbbra is az F6.1 környezeti korlátja.
- Több-session concurrency terhelésteszt nincs megvalósítva.
- `npm audit` csak npm registry DNS-hiba esetén próbálható; sikeres audit nem állítható.

## Következő fázis

F7.2 — csak külön jóváhagyással; anyagmennyiség-számítás és automatikus vásárlási lista F7.1-ben nem készült.

---

# Korábbi F6.1 állapot

## Jelenlegi fázis

F6.1 — Mobil QA és interaktív rajzstabilizálás.

## F6.1 ellenőrzés

- A rendelkezésre álló Codex in-app browserben a lokális, hitelesített F5 útvonal újraellenőrizve; a négy nézet, zoom/reset, layer controls és live preview működik.
- Az in-app browser nem ad viewport-emulációs capability-t. Playwright/Puppeteer projektfüggőség nincs telepítve; a helyi Playwright Chromium bináris megtalálható, de hozzá tartozó runner nincs elérhető.
- A jelenlegi browser smoke DOM-mérése `clientWidth=1002`, `scrollWidth=1002` értéket adott; véletlen teljes dokumentum-vízszintes túlcsordulás ezen a felületen nincs.
- A viewport-kezelés kétpointeres pinch támogatást kapott: aktív pointerek, fókuszpont-megtartás, zoom clamp, pointer cancel/release és egyujjas pan átmenet.
- A pinch matematika és a zoom-határok külön Vitest teszteket kaptak.
- Kötelező 320/375/390/430/768/1440 px vizuális viewport-ellenőrzés és fizikai eszközös multi-touch továbbra sem bizonyított.

## F6 elkészült

- Elkészült az infrastruktúrafüggetlen `src/domain/drawings/gable-drawing.ts` rajzmodell; nem duplikál F5-képleteket, közvetlenül a `GableRoofOutput` vertexeiből vetít.
- Elkészült a négy magyar nézet: Felülnézet, Oromoldal, Keresztmetszet és Oldalnézet.
- Az X/Y/Z → SVG vetítés és az Y-inverzió központosított; a 8000×12000×3000 mm referencia geometriai rajzkerete numerikusan igazolt.
- Elkészült a méret-, hossz- és szögannotáció modell valós F5-forrásértékekkel, magyar mértékegység-formázással és segédvonalakkal.
- Elkészült a rétegvezérlés: Tetősíkok, Tetőkontúrok, Gerinc és ereszek, Méretvonalak, Hajlásszögek, Segédvonalak.
- Elkészült a natív, React által létrehozott SVG-renderer; nincs unsafe SVG/HTML betöltés, nincs új rajz- vagy adatbázisfüggőség.
- Elkészült a helyi zoom, reset/fit és pointeres pan állapot; a globális rajzskála a meglévő Scaling Providerrel külön marad.
- A rajz a valós F5 kalkulátor `Rajzok` szakaszába került; a mentett revízió és az élő, nem mentett előnézet külön állapotjelzést kap.
- Az SVG cím/description, tablist, layer checkboxok, fókuszállapotok és szöveges eredményszakasz akadálymentesítési alapot adnak.
- Nem került be anyag-, ár-, statikai, rafter-, export-, 3D- vagy távoli Supabase-funkció.

## F6 ellenőrzés

F6 domain és UI ellenőrzés: 14 Vitest fájl / 48 teszt, typecheck, lint és webpack production build sikeres. A helyi F5 útvonalon böngészőben ellenőrizve a nézetváltás, layer toggle, zoom, élő geometria-frissülés és a nem mentett előnézet jelzése.

## F6 ismert korlátok

- A rendelkezésre álló in-app böngészővezérlő nem ad dedikált 320/375/390/430 px viewport-emulációt; a mobil CSS/reflow és accessibility tree ellenőrzött, külön keskeny screenshot nem készült.
- Kétujjas pinch gesztus külön eszközszintű tesztje nem volt elérhető; a canvas natív pointer/touch eseményekkel működik, a gombos és görgős zoom ellenőrzött.
- Anime.js nincs a projekt függőségei között, ezért F6 nem vezetett be bizonytalan animációs függőséget; a rajz statikus és reduced-motion kompatibilis.

## Következő fázis

F7 — csak külön jóváhagyással; F6-on belül anyag-, statikai vagy komplex tetőfunkció nem indul.

---

# Korábbi fázisok állapota

## Jelenlegi fázis

F5 — Production-grade nyeregtető geometriai kalkulátor.

## Elkészült

- Next.js 16.4.0 App Router + React 19.3.0 + TypeScript 5.9.3 + `src/` + `@/*` alias.
- Tailwind CSS 4.3.3 PostCSS-alap és központosított minimális design tokenek.
- shadcn/ui `components.json` konfiguráció és Lucide ikonfüggőség.
- Magyar, mobil-first dashboard: üdvözlés, tabos Funkciók/Aktuális munkák nézet és DEMO projektelőnézetek.
- Szigorú typecheck, ESLint, Vitest smoke teszt, dokumentáció és `.env.example`.
- Git `main` ág és `origin` remote ellenőrizve; commit/push nem történt.
- Szemantikus design tokenek, felület-/elevációs minták, fókusz- és reduced-motion állapotok.
- `system` / `light` / `dark` témaalap, perzisztencia, rendszer-téma figyelése és villanásmentes inicializálás.
- Újrafelhasználható `ThemeProvider` és következő módot jelző `ThemeToggle`.
- Vitest tesztek a téma mód-ciklusra, feloldásra, címkére és validációra.
- Next.js 16.4.0, Vitest 5.0.3 és ESLint TypeScript flat config biztonsági frissítések.
- Újrafelhasználható dashboard header, function launcher, projektelőnézet és üres állapot komponensek.
- Billentyűzetes, szemantikus tab navigáció és reduced-motion kompatibilis, visszafogott CSS-animáció.
- Verziózott, validált és lokálisan perzisztált skálázási motor három független értékkel: szöveg 80–200%, UI 90–150%, rajz 50–250%.
- Inline inicializálás a helytelen méretvillanás csökkentésére; CSS custom property alapú, transform/zoom nélküli skálázás.
- Közös `ScalingProvider`, `ScalingControls` és globális dashboard-beállítás panel.
- Fix, safe-area-t figyelembe vevő Scaling Bubble csak a `/demo/meretezes` oldalon; Escape- és click-outside-zárással.
- DEMO SVG nyeregtető-rajz változatlan viewBox-szal és külön rajzmegjelenítési skálával.
- Demo útvonal: `/demo/meretezes`, minta mezőkkel, SVG-vel és élő skálázással.
- Verziózott `supabase/config.toml`, migráció és lokális, DEMO-only seed.
- Öt kezdeti üzleti tábla: profilok, szervezetek, tagságok, ügyfelek, projektek.
- Összetett projekt–ügyfél idegen kulcs, timestamp/version mezők és szervezeti indexek.
- Deny-by-default RLS/grant alap, saját profil- és tagsági ellenőrzés, privát helper függvények.
- pgTAP biztonsági tesztcsomag a séma és a tenant-izoláció ellenőrzésére.
- DB workflow és architekturális korlátok dokumentálva a `docs/DATABASE.md` fájlban.
- Supabase CLI 2.120.0-val a lokális migrációs replay kétszer sikeresen lefutott.
- A 29 pgTAP adatbázisteszt sikeres; mind az öt tábla és mind az öt RLS-beállítás lokálisan ellenőrizve.
- A Supabase CLI által generált `src/infrastructure/supabase/database.types.ts` elkészült.
- A deprecated `[inbucket]` konfiguráció `[local_smtp]` szekcióra lett frissítve.
- Helyi, típusos `@supabase/supabase-js` és `@supabase/ssr` browser/server adapterek készültek.
- Next.js 16 `src/proxy.ts` session-refresh proxy készült, `getClaims()` ellenőrzéssel és cookie-szinkronizációval.
- Elkészült a magyar, meghívásos `/bejelentkezes` login: validáció, loading/error állapot, akadálymentes jelszómegjelenítés és kijelentkezés.
- A `/` és `/demo/meretezes` útvonalak hitelesítést és szervezeti tagságot ellenőriznek; több szervezet esetén nincs csendes automatikus választás.
- Elkészült a biztonságos, csak helyi bootstrap: `npm run db:local-env` és `npm run db:local-auth`; a jelszó nincs forráskódban vagy tracked fájlban.
- A böngészős helyi integráció sikeres: hibás login-hiba, sikeres login, reload utáni session, védett DEMO-oldal és logout ellenőrizve.
- Elkészült az öt új, szervezetileg izolált F2.3 tábla: `roof_models`, `roof_model_revisions`, `calculations`, `calculation_revisions`, `calculation_dependencies`.
- A tetőmodellek több modellenként kapcsolódhatnak egy projekthez; a kalkuláció opcionális tetőmodell-hivatkozással önálló projektmunkát is támogat.
- A geometriai és kalkulációs revíziók JSONB snapshotokat, séma-/implementációs verziót és explicit provenance/validation állapotot tárolnak.
- A revíziók adatbázis-triggerek miatt immutable-ok; revíziószámuk szülőnként egyedi, a current revision pointerek összetett FK-val integritásvédettek.
- A revision-level dependency gráf ugyanazon projektre és szervezetre korlátozott; önhivatkozás, ciklus és keresztprojekt-hivatkozás adatbázis-triggerrel tiltott.
- A lokális DEMO seed most reprezentatív projekt → tetőmodell → geometriai revízió → kalkuláció → kalkulációs revízió → dependency láncot tartalmaz.
- Az F2.3 pgTAP csomag 60 assertionre bővült, beleértve RLS-t, constraint-eket, immutable revíziókat, cross-org/cross-project tiltást és DAG-ciklusvédelmet.
- A generált Supabase TypeScript típusok frissültek; külön Zod domain-kontraktusok készültek kalkulációs input/output és provenance számára, matematika nélkül.
- A revízió-konkurencia védelme PostgreSQL egyedi constrainttel igazolt; valódi több-session terheléses teszt még technikai adósság.
- Elkészült a valós, szerveroldali projeklista és ügyféllista; a dashboard Aktuális munkák nézete már nem DEMO-kártyákat jelenít meg.
- Projektfunkciók: létrehozás, részletek, szerkesztés, keresés, állapot/munkatípus szűrés, módosítás szerinti rendezés, duplikálás, archiválás és visszaállítás.
- Ügyfélfunkciók: létrehozás, keresés, részletek és szerkesztés; ügyfél projektből is gyorsan létrehozható és hozzárendelhető.
- Az archiválás előtti státuszt a `projects.previous_status` migráció tárolja; visszaállításkor a szerver ezt az adatbázisból olvassa.
- Optimistic concurrency védelem készült a `projects.version` mezőre építve; stale mentés konfliktusüzenetet ad, néma felülírás nincs.
- A végleges projekt- és ügyféltörlés authenticated grantja visszavonva; F3 csak nem destruktív archiválást enged.
- A projekt részletező anyag-, ajánlat- és dokumentum-moduljai szándékosan „Hamarosan” állapotúak; F5 csak a nyeregtető geometriát tartalmazza.
- Elkészült a tiszta, infrastruktúrafüggetlen F4 domain-réteg: mm-alapú mértékegységek, explicit konverziók, safe-integer határok és szögek.
- Elkészültek a Point2D/3D, Vector2D/3D, szakasz- és sokszög-primitívek; a geometriai műveletek és a degenerált/önmetsző bemenetek validációja determinisztikus.
- Elkészültek a közös matematikai műveletek: 3–4–5 derékszögű háromszög, téglalap-/háromszögterület, explicit tolerancia, kerekítés és overflow-védelem.
- Elkészült a verziózott `CalculatorDefinition`, strukturált siker/hiba eredmény, Zod bemeneti- és kimeneti validáció, valamint az explicit, duplikációt tiltó `CalculatorRegistry`.
- Az F4 lezárásakor a registry még nem állított működőnek tető- vagy anyagkalkulátort; a matematikai DEMO téglalap-terület fixture teszt-only maradt.
- Az F4 technikai szerződései és pontossági szabályai a `docs/CALCULATION_ENGINE.md` fájlban dokumentáltak; F5 ezeket változtatás nélkül használja.
- Elkészült a `roof.gable` production domain kalkulátor F4 engine-re és registry-re építve, verziózott Zod input/output szerződéssel.
- A kalkulátor kezeli a magasság- és szög-alapú bemenetet, a mm-alapú méreteket, eresz- és oromfal-túlnyúlást, sík-/összterületet, vetületet, gerinc- és élhosszakat, valamint a koordinátás tetősík-vertexeket.
- A független referenciaeset igazolt: 8000 × 12000 mm, 3000 mm emelkedés, 500/250/250 mm túlnyúlás → 36,86989765°, 5625 mm ferde hossz, 140,625 m² összterület, 112,5 m² vetület.
- Az F5 lokális, atomic `save_gable_roof_calculation` SECURITY INVOKER RPC-ja egy tranzakcióban ment tetőmodell- és kalkulációs immutable revíziót, valamint a roof-model dependency élt; stale revíziót elutasít.
- Elkészült a project-linked `/projektek/[projectId]/tetomodellek/uj` és `/[roofModelId]` UI magyar, mobil-first formmal, élő számítással, magasság/szög váltással, mentéssel, reload utáni revízióbetöltéssel és meglévő Scaling Bubble integrációval.
- Az F5 mérföldkő idején a projekt részletező oldal valós tetőmodelleket és aktuális revízióeredményt mutatott; a műszaki rajzréteg az F6-ban került be.

## Szándékosan nincs benne

Hip- és shed-kalkulátor, anyag- és árkalkuláció, statikai tervezés, ajánlat, 3D és teljes rétegezett SVG-rajz. A gable eredmények geometriai értékek, nem szerkezeti vágáslisták. Távoli Supabase-projekt továbbra sincs használva.

## Következő fázis

F6 — SVG-alapú tetőrajz és következő jóváhagyott geometriai kiterjesztések, csak külön jóváhagyással.

## Ismert hiányok

- A Next 16 alapértelmezett Turbopack buildje ebben a környezetben portkötési hibával elhasalt; a dokumentált `npm run build` webpack módban sikeres.
- A `vite` közvetlenül a fejlesztési függőségek között maradt; production üzleti runtime-függőség nem került be.
- A kalkulációs matematika, anyagkatalógus, ajánlat és dokumentum-export továbbra sincs implementálva.
- Az `npm audit --audit-level=moderate` ebben a futtatásban hálózati DNS-hiba miatt nem tudott az npm registryhez kapcsolódni; ez nem módosította a függőségeket.
- A projektlista lekérdezése 100 rekordra korlátozott; lapozás nagyobb adatállományhoz későbbi optimalizálási feladat.
- Külön 320/375/390/430 px viewport-emulációt a rendelkezésre álló böngészővezérlő nem támogatott; a mobil reflow CSS- és accessibility-felmérése, valamint desktop böngészős smoke megtörtént.
- Az F4 nem oldotta meg a valódi több-session adatbázis-revízió concurrency teszt technikai adósságát; az F4 domain önmagában nem perzisztál.

## F5 ellenőrzés állapota

F5 Checkpoint A/B/C teljesült a dokumentált lokális és böngészős ellenőrzésekkel. Az F5 nem tartalmazott rajzrenderelőt, anyagkalkulációt, árképzést vagy statikai modult; az F6 kizárólag a műszaki rajzréteget adta hozzá.

Javasolt, nem végrehajtott commit: `feat(F5): add project-linked gable roof calculator`.
# F9.1 — Kivitelezési tervek alapja

Állapot: implementálva és ellenőrizve.

- A projektoldalon külön `execution_plans` és `execution_tasks` operatív objektum készült.
- Az elfogadott ajánlat csak a pontos véglegesített revízióra mutató, szerveroldalon ellenőrzött forrás; az ajánlat és státusztörténete nem módosul.
- Kézi feladatok: teendő / folyamatban / kész, alacsony / normál / magas prioritás, opcionális határidő, optimista verzióvédelem és idempotens kéréskulcs.
- Több kivitelezési terv hivatkozhat ugyanarra az elfogadott ajánlatra; nincs indokolatlan egy-terv/ajánlat korlátozás.
- Korlátok: nincs automatikus tétel→feladat átalakítás, ütemezés, függőség, erőforráskezelés, naptár vagy ERP-integráció.
- Bizonyíték: `npm run typecheck`, `npm run lint`, `npm run test` (21 fájl / 79 teszt), `npm run build` és `supabase test db` (5 fájl / 209 teszt) PASS; egy végső browser smoke flow PASS.

# F9.1.1 — Professzionális SVG műszaki rajzfinomítás

Állapot: implementálva és ellenőrizve.

- A gyökérok a rendererben közvetlenül képernyőtérben használt, világméretnek megfelelő dimenzió-offset volt; a 650–900-as értékek emiatt túl hosszú segédvonalakat adtak.
- A méretvonalak most kompakt, skála-független képernyőtérbeli eltolást, rövid geometriai hézagot és közeli feliratot használnak. Az aligned méretvonal saját normálirányt kap.
- A kezdeti illesztés és reset a látható geometria, annotációk és rétegek bounds-aiból számol; a rejtett segédgeometria nem kicsinyíti le a rajzot.
- A hajlásszög-jelölés egy tetősík és a vízszintes referencia közötti kompakt ívként jelenik meg; az F5 számított fokértéke változatlan.
- A négy vetület, lemezkiosztási réteg, zoom/pan/pinch és pointer-kezelés változatlan szerkezettel működik.
- Bizonyíték: 22 Vitest-fájl / 82 teszt, typecheck, lint, `git diff --check`, production build PASS; egy browser smoke a négy vetülettel, fit/reset és méretvonal-réteg kapcsolással PASS.
# F9.2 — Munkanapló és feladatesemények

Állapot: implementálva és ellenőrizve.

- Az F9.1 kivitelezési tervén belül létrejött a mobilbarát Munkanapló: munkavégzési dátum, kategória, tartalom, kapcsolódó feladat, problémák és következő lépések.
- A munkavégzés dátuma külön jelenik meg a bejegyzés rögzítési időpontjától; a dátumot szerveroldali `date` érték őrzi, nincs UTC-napeltolás.
- A feladat státuszváltozásait adatbázis-trigger rögzíti append-only `execution_task_events` táblába; változatlan státuszhoz nem készül esemény.
- A terv idővonalán a naplóbejegyzések és feladatesemények determinisztikusan, munkadátum/rögzítési idő/azonosító szerint rendezve jelennek meg.
- Védelem: szervezeti és terv/feladat composite FK, RLS, explicit authenticated REVOKE az immutable táblákon, request-key idempotencia és tranzakciós trigger.
- Bizonyíték: typecheck, lint, 22 Vitest-fájl / 82 teszt, production build PASS; lokális pgTAP 6 fájl / 223 teszt PASS; egy browser smoke PASS: bejegyzés, feladatkapcsolat, státusz-esemény és reload.

# F9.3.1 — Biztonságos kivitelezési fényképdokumentáció

Állapot: COMPLETE — a lokális, hitelesített böngészős feltöltési smoke sikeresen lefutott.

- Az `execution-photos` külön, privát Supabase Storage bucket; a bináris kép nem kerül PostgreSQL-be. A bucket 10 MB/kép méretkorlátot és JPEG/PNG/WebP MIME-listát kapott; HEIC/HEIF jelenleg tudatosan nem támogatott, ezt a magyar UI egyértelműen jelzi.
- Az `execution_photos` csak szervezeti, projekt-, terv-, opcionális feladat- és opcionális naplóhivatkozást, biztonságos fájlnevet, MIME-t, méretet, feltöltőt, időpontot, captiont és object key-t tárol. Composite FK-k és trigger zárják ki az eltérő terv-, projekt- vagy szervezeti hivatkozást.
- A szerveroldali action tagságot, fájlméretet, MIME-t és JPEG/PNG/WebP magic byte aláírást ellenőriz; az object key véletlen UUID-alapú, nem írható felül. A Storage feltöltés és a metadata-mentés nem hamisítottan atomi: metadata-hiba esetén kompenzáló object cleanup fut.
- A Storage olvasás csak metadata-sorral és aktív tagsággal engedett; a felület 5 perces signed URL-t használ, nincs permanens public URL vagy service-role böngészőben. A napló append-only marad, a UI külön mutatja a „Bejegyzés dátuma” és „Fénykép feltöltve” értékeket.
- A projekt tervpaneljében mobilbarát többfájlos feltöltés, feladat-/naplókapcsolat, lazy thumbnail galéria, billentyűzettel bezárható nagy nézet és kapcsolati metaadatok készültek. Törlési workflow és AI-feldolgozás nem része ennek a mérföldkőnek.
- Bizonyíték: a korábbi automatizált kapuk változatlanul érvényesek (250/250 pgTAP, 22 Vitest-fájl / 82 teszt, typecheck, lint, `git diff --check`, webpack production build PASS). Egyetlen hitelesített Brave smoke-ban a lokális DEMO PNG feltöltése sikeres volt; a galériakártya és a feladat-/naplókapcsolat megjelent, a nagy nézetben a kép ténylegesen kirajzolódott privát signed URL-ről, majd újratöltés után is elérhető maradt. A korábbi kliensoldali `event.currentTarget.reset()` TypeError-t minimálisan javítottam a form-hivatkozás előzetes rögzítésével. Cross-organization jogosulatlan Storage-hozzáférést böngészőben nem teszteltem.

# F9.3.2 — Haladó kivitelezési fényképdokumentáció

Állapot: COMPLETE — a kategorizálás, szűrés, feladatonkénti csoportosítás és az előtte/utána összehasonlító lokálisan, hitelesített böngészős smoke-ban ellenőrizve.

- A fotók kézzel választható kategóriája: „Munka előtt”, „Munkavégzés közben”, „Munka után”, „Nincs kategorizálva”. A feltöltési időpont nem kategorizál automatikusan.
- A meglévő, legfeljebb 100 fotós, tervhez kötött galéria kategória-, feladat- és feltöltési dátumszűrést, újabb/régebbi sorrendet és feladatonkénti darabszámot kapott; a feladathoz nem kötött fotók láthatók maradnak.
- Az előtte/utána nézet ideiglenes felhasználói kiválasztást használ, egymás mellett mutatja a két képet, megtartja az arányokat, és jelzi, ha a fotók eltérő feladathoz tartoznak. Mindkét kép a meglévő rövid életű signed URL-ről töltődik.
- A kategória külön, módosítható mező; az upload-időpont, feltöltő, object key, projekt/terv- és naplóhivatkozás továbbra is védett. A napló append-only és a feladat státusza változatlan marad.
- Bizonyíték: célzott typecheck, lint, production build, 10/10 F9.3.2 pgTAP és 2/2 F9.3.2 Vitest PASS. Egyetlen hitelesített Brave smoke: két DEMO fotó kategorizálása, kategóriaszűrés, feladatcsoportosítás, két kép tényleges betöltése az összehasonlítóban, választás felcserélése és reload utáni perzisztencia PASS. Cross-organization jogosulatlan Storage-hozzáférést böngészőben nem teszteltem.

# F9.4.1 — Professzionális projektáttekintés

Állapot: COMPLETE — a meglévő kivitelezési adatokból képzett áttekintő lokálisan és hitelesített böngészős smoke-ban ellenőrizve.

- A projektoldalon megjelent a „Kivitelezési áttekintés”: projekt/ügyfél/helyszín kontextus, kiválasztott kivitelezési terv, feladatdarabszámok, determinisztikus teljesítési százalék, figyelmi tételek, legutóbbi idővonal, fotóelőnézetek és kapcsolódó elfogadott ajánlat.
- A read-model nem hoz létre új üzleti táblát; az F9.1–F9.3.2 meglévő, szerveroldalon szervezet- és projekt szerint szűrt rekordjaiból származik. A feladat teljesítése kizárólag kész feladat / összes feladat, fizikai kivitelezési százalékot nem állít.
- Figyelmi tételek csak ténylegesen tárolt adatokból készülnek: nyitott vagy folyamatban lévő feladat, érvényes és múltbeli határidő, illetve `problem` kategóriájú naplóbejegyzés. Hiányzó határidő nem számít lejártnak.
- A fotók ugyanazon privát signed URL-lel jelennek meg korlátozott előnézetként; az ajánlat linkje a meglévő F8.3.2 oldalra mutat. Az ajánlati státusz jogi szerződésigazolásként nincs állítva.
- Bizonyíték: célzott overview Vitest 2/2 PASS, teljes Vitest 24 fájl / 86 teszt PASS, typecheck, lint és webpack production build PASS. Egyetlen hitelesített lokális böngészős smoke-ban az áttekintő, task/progress, napló- és feladatesemény, fotóelőnézet, valamint kapcsolódó ajánlati oldal megnyitása ellenőrzött.

# F9.4.2 — Professzionális kivitelezési dokumentáció PDF

Állapot: COMPLETE — a lokális, hitelesített PDF-előkészítő és szerveroldali PDF-generálás működik, a célzott layout-stabilizálás reprezentatív DEMO-PDF-en vizuálisan ellenőrzött.

- A kiválasztott kivitelezési tervhez megjelent a „Dokumentáció készítése” konfigurátor: fejezetválasztás, legfeljebb 8 fotó kiválasztása, PDF előnézet, letöltés és nyomtatási megnyitás.
- Az A4 portré PDF az aktuális projekt-, terv-, feladat-, napló-, esemény-, fotó- és elfogadott ajánlati adatokból készül. A feladat-százalék a meglévő `kész / összes` szabályt használja, a munka- és rögzítési időpontok külön maradnak.
- A PDF pipeline az F8.2 meglévő `@react-pdf/renderer` rétegét és közös Noto Sans fontregisztrációját használja. A jelentés nem immutable snapshot és nem jogilag hiteles elektronikus építési napló.
- A route minden fotót szerveroldalon, ellenőrzött tervhez tartozó object key alapján tölt le a privát Storage-ból; böngészőből küldött URL-t nem fogad el. JPEG/PNG támogatott, WebP esetén egyértelmű kizárási hiba jelenik meg. A korlát 8 kép, képenként 4 MB, összesen 12 MB.
- Bizonyíték: célzott PDF-render teszt 3/3 PASS, teljes Vitest 25 fájl / 87 teszt PASS, typecheck, lint és webpack production build PASS. Egyetlen hitelesített lokális browser/PDF smoke-ban a fejezetválasztó, két DEMO fotó kiválasztása, PDF preview route és a preview/download/print linkek ellenőrzöttek. A PDF közvetlenül renderelt reprezentatív DEMO-oldalképe: egy A4 oldal, mindkét kép, magyar karakterek, státuszjel, revíziószám és footer látható.

F9.4.2.1 célzott stabilizálás: elkészült a kapcsolódó ajánlat szakaszának egyben tartása, a feladatesemények háromoszlopos flex elrendezése, a megbízható külön grafikai státuszjel, a rendelkezésre álló emberi revíziószám megjelenítése a belső UUID mellett, valamint a metaadatok olvashatóbb méretezése. A reprezentatív PDF egy A4 oldalon maradt, nem tartalmazott orphan címsort vagy üres második oldalt; a két DEMO-kép, ékezetek és footer vizuálisan ellenőrzött. Hosszabb riportoknál az általános A4 tördelés továbbra is több oldalra oszthat.
