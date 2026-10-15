# F7.3.2 állapot

## F9.7.6.6.3.2d — quotation pénzügyi konzisztencia és PDF hardening

Állapot: **PARTIAL**. A konkrét DEMO V1 eltérés oka az opcionális line mezők
`null` reprezentációja volt JSONB snapshotban. A line validator/schema most
normalizálja az opcionális `notes`, `variantId`, `priceId`, `takeoffItemId`
null értékeket; pénzügyi mezőn nincs coercion. A mentett 2 × 12 500 HUF nettó
sor, 25 000 subtotal, totals snapshot és financial contract egyezett. A
readiness ettől megszűnt pénzügyi hibát jelezni, miközben tax/issuer/number/
finalize readiness blokkoló és `canIssue=false` megmaradt.

A GET PDF route üres explicit revision eredményre 404-et ad az eddigi 500 helyett.
Valódi, bejelentkezett lokális HTTP/browser sessionnel az owner PDF-et kapott a
V1 és V2 exact revision ID-ra; V1-ben az eredeti, V2-ben a módosított
DEMO leírás szerepelt. A historical editor revisionváltáskor a V2 lokális
állapotát tartotta meg; a page a selected revision ID-hoz kötött editor key-t
kapott, és a böngészős ismétlés már a kiválasztott V1/V2 mezőket mutatta. Hamis
revision 404 „A kért revízió nem található.”, hibás
quotation ID 404 „Az ajánlat nem található.” választ adott. A lokális snapshot
ellenőrzés a V1/V2 sort és összegét, a `draft` státuszt és V2 current revisiont
igazolta a GET-ek után; numbering nem történt.

Futott: 5 célzott Vitest fájl, 27/27 PASS; ez tartalmazza a project quotation
renderer regressziót és a route mock boundary teszteket. Typecheck, lint és
Next.js 16.4 webpack production build PASS. A valódi HTTP aktív member,
revoked membership és másik szervezet session esete, a valós HTTP cache/header
vizsgálat, projekt-PDF HTTP és mobil QA nem futott; ezért PARTIAL. Hosted DB,
reset, commit és deploy nem történt. Javasolt commit:
`fix(F9.7.6.6.3.2d): align saved quotation financial readiness`.

## F9.7.6.6.3.2d.1 — standalone PDF HTTP security acceptance

Állapot: **COMPLETE (PDF SECURITY)**. A lokális Next route-ot tényleges
Supabase Auth session cookie-val kértem le. Owner: V1 és V2 explicit revízió
HTTP 200 `application/pdf`; a PDF szövegkinyerése a V1/V2 snapshot jelölőket
elkülönítette. Aktív azonos szervezeti tag, visszavont tagságú érvényes Auth
session és másik szervezet felhasználója HTTP 404-et kapott; anonim kérés 401.
Hibás/nem létező ajánlatazonosító és hibás/hamis UUID revízió 404, PDF bájtok és
belső hibaadat nélkül. Paraméter nélküli revision a jelenlegi V2-t adta 200-zal.

A sikeres válasz tényleges fejlécei: `Cache-Control: private, no-store,
max-age=0`, `Content-Type: application/pdf`,
`Content-Disposition: inline; filename="ajanlat-piszkozat-<UUID>.pdf"`,
`X-Content-Type-Options: nosniff`. Elutasítások: `text/plain;charset=UTF-8`,
azonos cache/nosniff védelem és általános üzenet. Minden elutasított válasz
PDF-tartalom nélküli volt. A V2 draft, version/current revision és két mentett
revízió változatlan; numbering sequence nem keletkezett. A korábbi readiness
ellenőrzés szerint `canIssue=false`; issuance továbbra sincs.

VERIFIED: valós HTTP Auth mátrix, header/body ellenőrzés, V1/V2 tartalom és
read-only adatállapot. FAILED: elfogadási eset nem maradt; az első üres tételsorú
fixture HTTP 422-t kapott a helyes nettó pénzügyi sor-kontrakt miatt, ezért az
ellenőrzést konzisztens DEMO sorral végeztem el. Nem változott az alkalmazáskód, ezért új Vitest,
typecheck, lint vagy build nem futott; a d. mérföldkő korábbi 27/27 célzott
Vitestje, typecheckje, lintje és buildje változatlanul az akkori kódállapotra
vonatkozik. `git diff --check` a dokumentálás után fut. Nem futott: hosted,
pgTAP, projekt-PDF HTTP és mobil QA. A helyi fixture-k DEMO jelöléssel a
lokális Supabase-ban maradtak; éles adat vagy reset nem érintett.
`supabase status` leállította az opcionális helyi imgproxy, edge runtime,
analytics, vector és pooler konténereket; a helyi API/DB a HTTP tesztek alatt
elérhető maradt.

Javasolt commit: `test(F9.7.6.6.3.2d.1): verify standalone PDF HTTP security`.

## F9.7.6.5.2 — standalone számítás projektpéldánya (frontend)

Állapot: **PARTIAL**. A támogatott három standalone editorban és a „Mentett számításaim” listában elérhető a projektben használat; csak a betöltött aktuális mentett revízió választható. A bounded, szerveroldali picker aktív műhelytagságot követel, legfeljebb 50 nem archivált/nem DEMO projektet keres név szerint, és csak projektnevet/helyszínt/típust/állapotot/verziót mutat. A megerősítés a pontos source V-számot és célprojektet jeleníti meg. Mentetlen editorváltozásnál explicit választás kell a legutóbbi mentett változathoz; a local edit nem kerül át.

Újrahasznosított architektúra: meglévő `associateStandaloneCalculationAction`, `generateSecureUuid`, session/RLS-s Supabase action és a három projektkalkulátor route. Ugyanaz a műveletazonosító (és profilnál projekt calculation ID) marad hálózati retry során; új picker intent új secure UUID-t generál. A stale forrás/projekt választ frissítésre és ismételt megerősítésre kényszerít. Siker a backend visszaadott kalkuláció- és revízióazonosítójával navigál; az eredeti standalone adat nem változik. Existing takeoff workflow elérhető, de átadás nem automatikus. Association ledger olvasó UI nincs, ezért nem jelenítünk meg kitalált előzményt.

Ellenőrzés: `npx vitest run src/features/calculations/standalone-project-association.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts` — 4 fájl / 22 PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Böngésző inventoryban nem volt tab/auth session; egy workflow és fizikai iPad/iPhone ellenőrzés nem futott. DB contract nem változott, pgTAP/Auth tesztet nem futtattam; ezért PARTIAL. Javasolt commit: `feat(F9.7.6.5.2): integrate standalone project copies`.

## F9.7.6.5.1 — standalone számítás projektkapcsolása (backend)

Állapot: **COMPLETE (BACKEND)**. A tényleges adatszerkezet és kalkulátorcontract alapján a B modellt választottam: az immutable standalone source aktuális revíziójából meglévő project RPC új projekt-revíziót készít, és az append-only association ledger rögzíti az exact source revisiont, creator/org/type adatot és a teljes input/output/validation/provenance snapshotot. A source revízió változatlan marad. Történeti/stale source elutasított; standalone roof geometry nem lép a projekt dependency DAG-ba.

Újrahasznosított architektúra: `getAuthContext`, RLS-s session Supabase kliens, meglévő `executeCalculator` domain engine és projekt gutter/flashing/profile RPC-k. Az association RPC tagságot, source `auth.uid()` owner/scope/org/típust, azonos org projektet, supported aktuális revisiont és snapshot-egyezést validál. Gutter/flashing a projekt meglévő kalkulációs parentjének következő expected revisionje; profil az authoritative, input-only SQL RPC-n át új projekt calculation ID-t kap. A projekt gutter/flashing RPC saját `verified` státusza a meglévő technikai contract része, nem szakemberi jóváhagyás; source status és parameter provenance külön immutable ledger snapshot.

Idempotencia: org + operation UUID unique constraint és advisory lock. Ugyanaz a payload ugyanazt a célrevisiont adja vissza; módosított payload elutasított. Replay előtt a source tulajdonosa és a projekt léte újraellenőrzött. Nem jön létre geometry dependency, takeoff vagy quotation; approved record nem módosul. Frontend még nincs: az action contract explicit source revisiont, stabil operation ID-t, project expected revisiont és profilnál stabil új project calculation ID-t kér.

Ellenőrzés: `supabase migration list --local` a 20261014010000 alap után három új migrációt jelzett; `SUPABASE_TELEMETRY_DISABLED=1 supabase migration up --local` mindhármat reset nélkül alkalmazta. `supabase test db --local ...009... ...011... ...013... ...016... ...017...`: 5 fájl / 118 assertion PASS; a ledger privileged UPDATE/DELETE is elutasított. Külön `supabase test db --local ...010... ...012... ...015...`: 3 downstream takeoff fájl / 94 assertion PASS, approved immutabilityvel. `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 SUPABASE_TELEMETRY_DISABLED=1 npx vitest run src/features/calculations/standalone-actions.local.integration.test.ts`: két valós helyi Auth user, 1/1 PASS (valid association, retry reuse, payload mismatch, nonowner reject). `node scripts/verify-standalone-association-concurrency.mjs`: két független authenticated kapcsolat, egy ledger sor, egy projekt-revízió, egyező cél-ID-k, `reused=false/true`. Célzott TS/domain: 4 fájl / 41 PASS; nem opt-in futásban 1 Auth teszt skip, külön opt-in PASS. `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Browser workflow nincs, a milestone backend-only; hosted DB és reset nem érintett.

Javasolt commit: `feat(F9.7.6.5.1): associate standalone calculations with projects`.

## F9.7.6.4 — standalone calculator frontend

Állapot: **PARTIAL**. A három meglévő eresz-, szegély- és profil-editor standalone módban is az eredeti domainmotort használja, a meglévő authenticated standalone save actionnel. Az új számítások neve opcionális; mentéskor semleges editornevet kapnak. A mentett calculation ID a route-ban marad, a szerveroldali read model visszaállítja a kiválasztott kalkulációt, a standalone lista pedig típus szerint szűrhető és legfeljebb 100 rekordot ad vissza. A történeti revízió külön választható; kiválasztás nem ment, későbbi módosítás új revízióként, expected revisionnel menthető.

Újrahasznosított architektúra: `saveStandaloneCalculationAction`, `listStandaloneCalculations`, `getStandaloneCalculation`, és a három meglévő kalkulátoreditor. A szervezet ID-t a route aktív tagság ellenőrzi; a mentő RPC a tényleges létrehozót az auth sessionből veszi. Listing és olvasás a meglévő owner RLS mellett történik. Standalone módban nincs projekt tetőgeometria; a preview nem menthető, projektkapcsolás nincs.

Ellenőrzés: fókuszált Vitest 5 fájl / 23 PASS; `npm run lint`, `npm run build`, build után külön `npm run typecheck`, `git diff --check` és `git diff --cached --check` PASS. Az opt-in `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 ...vitest run src/features/calculations/standalone-actions.local.integration.test.ts` Docker socket permission denied miatt nem futott (`supabase status --output env` nem éri el a Docker API-t). pgTAP/backend tesztet nem futtattam, backend szerződés nem változott. Hitelesített böngészős teszt UNVERIFIED: a CUA inventoryban nem volt tab vagy elérhető browser auth session. iPhone/iPad fizikai QA sincs.

Korlát: ugyanazon user folyamatában a route-frissítés és editorkomponens állapotát helyi Auth böngészőben még nem bizonyítottam, ezért mérföldkő nem tekinthető COMPLETE-nek. Következő: F9.7.6.5 csak append-only projektkapcsolásra készíthet tervet/implementációt; ez a milestone nem tette lehetővé a társítást. Javasolt commit: `feat(F9.7.6.4): integrate standalone calculator frontend`.

## F9.7.6.3 — standalone calculation persistence

Állapot: **COMPLETE (BACKEND)**. A lokális `20261014010000` migráció a meglévő `calculations` / `calculation_revisions` láncot bővíti explicit `ownership_scope` és `created_by` mezővel; a standalone rekord projekt- és tetőmodell nélkül, a hitelesített létrehozójához és szervezetéhez kötött. A kliens közvetlen standalone parent/revision INSERT/UPDATE/DELETE műveletei tiltottak. A három külön save RPC az eresz, szegély és lemezprofil tényleges registry ID-jét használja; a Server Action meglévő TypeScript kalkulátormotorokkal újraszámol, őrzi az elfogadott normalizált inputot/provenance-t és incomplete BA/K, illetve ismeretlen szegélykapcsolat esetén nem talál ki eredményt. A lista és aktuális/történeti revízió lekérése owner RLS alatt fut. Projektforrású bemenet standalone mentését a route és SQL is tiltja; takeoff nem jön létre.

Újrahasznosított architektúra: meglévő calculation revisions/immutability FK, expected-revision contract, advisory lock mintája, `getAuthContext`, session Supabase kliens és production `executeCalculator` engine. Standalone visibility: csak aktív org tag + `created_by = auth.uid()`; project rekordok korábbi szervezeti láthatósága és RPC-k megmaradtak. A DB-scope és project-regresszió pgTAP bizonyíték, source snapshot a revízión marad; nincs tartós új dependency/takeoff adat.

Ellenőrzés: `supabase migration list --local` legutóbbi előzménye `20261013081700`, új migráció `20261014010000`; incremental `supabase migration up --local`, reset nélkül. `supabase test db --local ...009... ...011... ...013... ...016...` — 4 fájl / 88 assertion PASS. `RUN_LOCAL_SUPABASE_ACTION_TESTS=1 ...vitest run src/features/calculations/standalone-actions.local.integration.test.ts` — két valódi helyi Auth user, 1/1 teszt PASS, beleértve current/historical read és same-org creator isolation. `node scripts/verify-standalone-calculation-concurrency.mjs` — két független authenticated DB session, egy V2, egy stale `40001`, V1 változatlan. Célzott domain/standalone Vitest: 4 fájl / 41 teszt PASS. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Teljes történeti pgTAP suite és böngésző-ellenőrzés nem futott; hosted DB nem érintett. Frontend mentés/lista UX a F9.7.6.4 határa. Javasolt commit: `feat(F9.7.6.3): persist standalone calculations`.

## F9.7.6.2 — standalone ownership és globális tetőgeometria

Állapot: **PARTIAL**. Eldöntött ownership: a project-free számítás műhelytulajdonú, de csak a létrehozója számára látható, aktív szervezeti tagság mellett; ügyfél nincs a standalone szerződésben. Elkészült a `calculations.project_id`-t, kalkulátor RPC-ket, dependency-ket, takeoffokat és quotation forrásokat érintő sématerv és audit a `docs/STANDALONE_WORKFLOWS.md` fájlban. A meglévő `roof.gable` motorból új projekt nélküli, nem mentő nyeregtető-geometriai előnézet nyílik a globális kalkulátor oldalon; ugyanazt a műszaki rajz komponenst használja. Funkcionális tetőfedési/szarufa/léc/fólia kalkulátor nem készült; forrásolt jövőbeli roadmap dokumentált. Nincs migráció, standalone save/reopen, saved list, vagy projekt-hozzárendelés, mert ez a tervben külön `.3`/`.4`/`.5` implementáció; a Supabase CLI sem futott le: a `supabase status` CLI-saját `~/.supabase/telemetry.json` írása sandbox EPERM-mel blokkolt.

Újrahasznosítva a `roof.gable` domainmotor, `TechnicalDrawing`, szervezetválasztó és meglévő kalkulátor-navigation design. Szervezet ID-t a globális route csak membership-ellenőrzésű `getProjectOrganization` után használ. A standalone geometriai preview nem ír üzleti adatot; a projektmód és material takeoff SQL/UI nem változott. A migrated ownership/RLS és RPC-konkurencia ellenőrzése nem történt meg, ezért adatbázis-biztonságra nincs runtime PASS.

Bizonyíték: `npx vitest run src/features/roof-models/standalone-gable-preview.test.ts src/domain/calculations/gable-roof.test.ts src/features/dashboard/dashboard.test.ts` — 3 fájl / 10 PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; `/kalkulatorok/nyeregteto` route megjelent) és `git diff --check` PASS. Egy korábbi tesztfuttatásban hibás szöveges assertion volt; a címke/assertion pontosítása után a célzott suite PASS. `SUPABASE_TELEMETRY_DISABLED=1 supabase test db` — 15 fájl / 434 pgTAP PASS a helyi adatbázison; reset és migráció nem történt. A suite a meglévő projektmód RPC/RLS útvonalakat fedi; a standalone owner/RLS még nincs implementálva és nem volt tesztelhető. Authenticated böngészős workflow nem futott: a CUA leltárban nincs browser tab, a route sessiont és szervezetet igényel; bejelentkezési adat nem volt rendelkezésre bocsátva. Korlát: az önálló persistent workflow és revíziótörténete hiányzik, a projektkapcsolás és standalone tetőmentés nincs kitéve. Javasolt commit: `feat(F9.7.6.2): add global roof geometry preview`.

## F9.7.6.1 — globális navigáció és standalone alapozás

Állapot: **PARTIAL — helyi navigáció és stateless önálló számítás elkészült; böngészős smoke/jogosultsági futás környezetkorlát miatt nincs igazolva.** A dashboard most közvetlenül megnyitja a Projektek, Kalkulátorok, Árajánlatok, Anyagok és Kivitelezés területeket; a nem létező Munkacsomagok és Dokumentumok globális kártya kikerült. A Kalkulátorok oldalról mindhárom kalkulátor projekt nélkül is megnyitható és a meglévő domainmotorral futtatható. Ebben a módban az eredmény csak az oldalon él, frissítéskor elveszik; mentési és anyagkimutatás-átadási vezérlő nincs. A projektmód megtartja a revíziókat, tetőforrásokat és átadást. Az Árajánlatok globális oldal a meglévő projektútvonalakhoz visz, és kimondja a projektfüggést. A Kivitelezés szervezeti oldala csak a tag által látható projektterv címét és dátumát listázza, majd a meglévő, kibontott projekt-kivitelezéshez navigál. A projektoldali „Megnyitás” akciók elérhető modult jeleznek; az execution query-paraméter megőrzi a meglévő alapértelmezett összecsukott állapotot.

Meglévő dashboard/design, `getProjectOrganization`, `getProjectsForOrganization`, projekt-szintű kalkulátor, quotation és execution query/action, Supabase session kliens és RLS újrahasznosítva. Az új execution lista `organization_id` szerint szűr, csak terv-metaadatot olvas, fotót vagy signed URL-t nem. Minden globális link az aktuális szervezetet viszi tovább; route-ok tagság nélkül nem választanak szervezetet automatikusan.

A `docs/STANDALONE_WORKFLOWS.md` rögzíti a kötelező `calculations.project_id`, a kalkulátor RPC/index/dependency-lánc, immutable provenance, valamint a quotation `project_id`, draft RPC, véglegesítés és PDF route konkrét függőségeit; felvázolja a local additív migrációt és a bounded lépéseket. Nincs adatbázis-, RLS-, képlet-, árképzési vagy távoli Supabase-változás. A dokumentum globális listázását a privát, projekt tulajdonlású PDF/fotó-flow jelenleg nem támasztja alá; ezért nem készült dokumentumkártya.

Bizonyíték: `npx vitest run src/features/dashboard/dashboard.test.ts src/features/projects/project-navigation.test.ts src/features/execution/execution-overview.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/flashings/calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts` — 6 fájl / 28 teszt PASS; `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; a `/kalkulatorok`, mindhárom önálló kalkulátor-route, `/ajanlatok` és `/kivitelezes` szerepel a production route-listában), `npm run typecheck` és `git diff --check` PASS. A böngészős smoke nem futott: a CUA leltárban nem volt nyitott hitelesített tab, a korábbi F9.7.4 helyi dev bind `EPERM` hibája miatt nem indítottam újra. Viewport, Auth/RLS adatbázis-viselkedés és teljes regresszió nem futott. Ezért globális tenant-paraméterezés kód/teszt szinten bizonyított, a jogosulatlan DB-hozzáférés böngésző/pgTAP szinten nem ellenőrzött. Javasolt commit: `feat(F9.7.6.1): add global workflow navigation`.

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

## F9.5 — termékérettségi audit

Elkészült a [termékérettségi audit](PRODUCT_READINESS_AUDIT.md), célzott repository- és külső jogi/szakmai/termékkutatással. Ebben a dokumentációs feladatban teszt, build és böngészős ellenőrzés nem futott; a hosted/production és terepi állapot az auditban UNKNOWN.

## F9.5.1 — pilot readiness és üzembiztonság

Állapot: PARTIAL. Elkészült a [pilot readiness és üzembiztonság](PILOT_READINESS.md) leltár G01–G04 állapottal, adatfolyam- és EXIF/GPS-értékeléssel, szervezeti izolációs bizonyítékokkal, backup/restore hiányokkal, checklisttel és go/no-go blokkolókkal. A kimeneti határok terminológiája célzottan pontosítva lett; adatbázis-migráció és történeti adatváltoztatás nem történt. A célzott Vitest 6/6, typecheck, lint és webpack production build sikeres; hosted, restore, cross-org böngészős és terepi ellenőrzés nem bizonyított.

## F9.5.2 — szakmai terepi pilot előkészítés

Állapot: PARTIAL / előkészítve. Elkészült a [pilot tesztterv](PILOT_TEST_PLAN.md) három megvalósított workflow-val, pilot-belépési kapukkal, számítási összevetési módszerrel, mobil iPhone/iPad ellenőrzőlistával, UX/gap-priorizálással és F9.6.1 ereszcsatorna-anyagbecslési előfeltételekkel. Elkészült a [visszajelzési sablon](PILOT_FEEDBACK_TEMPLATE.md). A szakmai pilot még nem történt meg; F9.5.1 hosted, adatvédelmi, restore és izolációs blokkolói változatlanok. Alkalmazáskód, séma és Supabase nem módosult.

## F9.6.1 — ereszcsatorna-anyagbecslés

Állapot: **COMPLETE (LOCAL)**. A dokumentált lokális bizonyíték végig lefedi a mentett tetőgeometria → gutter kalkuláció → immutable gutter-revízió → explicit, egységkompatibilis katalógusvariáns → ugyanazon mentett adatokból épülő technikai SVG → új draft material takeoff láncot. A forrásrevízió- és provenance-snapshotok visszakövethetők; a szervezet-/projektizoláció, konkurens mentés és atomi idempotencia adatbázis- és Server Action szinten ellenőrzött; approved rekordot az átadás nem módosít.

A mennyiségek előzetes `piece` kereskedelmi szál-/tartozékbecslések. Nincs implicit folyóméter-, csomag- vagy gyártói konverzió, hidraulikai méretezés, gyártói megfelelés vagy hitelesített szerelési terv. A lokális lezárás nem jelent production readiness vagy szakmai validációt: nyitott a valós iPhone/iPad ellenőrzés, a szakmai terepi validáció, a gyártóspecifikus szabályok, a hosted környezet ellenőrzése és az operatív backup/restore.

## F9.6.1.1 — ereszcsatorna-kalkulátor alkalmazásintegráció

Állapot: COMPLETE lokális integrációra. Elkészült a projektútvonal és navigáció, az eresz-, lefolyó- és kézi tartozékszerkesztő, a geometry javaslat, a szerveroldali újraszámítás és lokális immutable revision mentés. A mentés szervezet- és projektazonosítást, expected revision ellenőrzést, tranzakciós advisory lockot és tetőmodell-revízió függőséget használ. A célzott egység- és adatbázisteszt, a kétkapcsolatos valódi konkurens RPC-ellenőrzés, valamint a helyi hitelesített mentés/reload/revíziófolyamat sikeres. Hosted adatbázis, backup/restore, dedikált narrow viewport és material takeoff/SVG nem része ennek a lokális integrációs elfogadásnak.

## F9.6.1.1.1 — integráció lezárása és konkurens revízióbiztonság

Állapot: COMPLETE lokális elfogadással. A Supabase CLI hozzáférése szűk, emelt helyi futtatással helyreállt; a `20261013080100` migráció reset nélkül, a korábbi alkalmazott migrációk után került fel. A 21 ellenőrzéses pgTAP suite ellenőrzi a mentési RPC-t, a külön szervezetben lévő felhasználó olvasási/írási elutasítását, keresztprojekt tetőrevízió elutasítását, snapshot-immutabilitást és elavult revízió ütközését. A `scripts/verify-gutter-concurrency.mjs` két független authenticated adatbázis-kapcsolattal, adatbázisban rögzített readiness barrierrel és egyidejű RPC-hívással PASS: pontosan egy revízióírás sikeres, a másik SQLSTATE `40001`, a revíziók `[1,2]`, az eredeti `8000` mm snapshot változatlan, az új `9100` mm érték egyszer szerepel. A teszt végi célzott cleanup eltávolította a saját fixture-t. A hitelesített helyi DEMO böngészőfolyamatban két geometriai eresz, kereskedelmi szálhossz, lefolyó, kézi tartozék mentése, reload, új revízió és a korábbi revízió visszaolvasása igazolt. Szűk képernyős viewport-ellenőrzés a rendelkezésre álló böngészővezérlőben nem volt végrehajtható; hosted izoláció és restore továbbra sem része ennek a lokális elfogadásnak.

## F9.6.1.2 — anyagkatalógus-kapcsolat, draft átadás és technikai séma

Állapot: COMPLETE lokális elfogadással az F9.6.1.2.1 hardening után. A meglévő, szervezethez kötött katalógus aktív variánsai közvetlenül hozzárendelhetők a gutter előzetes szál- és kézi darabtételhez; a termékazonosító, variáns, SKU, technikai paraméterek és provenance snapshotként kerülnek a takeoff tételbe. A kategória- és egységellenőrzés szerveroldali; `piece` nélkül nincs implicit folyóméter-, csomag- vagy gyártói átváltás, a fel nem oldott tétel látható marad.

Az átadási előnézet csak a mentett aktuális, ellenőrzött gutter-revízióból enged új `draft` takeoffot létrehozni. A mennyiségeket a tranzakciós SECURITY INVOKER RPC a mentett input/output snapshotból vezeti le; ugyanabban a tranzakcióban rögzíti a forrásrevíziót, a katalógus- és ár-snapshotot, valamint a provenance mezőket. Az explicit UUID kéréskulcs és a szervezet/projekt/kulcs egyediség atomi idempotenciát ad; ugyanaz a kulcs eltérő payloadhoz nem használható, új kulccsal pedig ugyanazon név és revízió mellett is létrehozható új, szándékos draft.

Az SVG determinisztikus, felülnézeti séma: a konfigurált ereszszakaszokat, hosszt, kereskedelmi szálhatárokat és a kapcsolat nélküli lefolyómeneteket mutatja. Nem állít fel nem tárolt tetőtopológiát vagy kifolyókapcsolatot, és a mentetlen kliensmódosításnál nem jelöl forrásrevíziót.

Az eredeti hitelesített böngészős workflow változatlanul érvényes. Az F9.6.1.2.1 utáni egyetlen fókuszált helyi követő smoke-ban a DEMO `piece` variáns hozzárendelése, az atomi új draft létrehozása, átirányítás és a 3 darabos tétel/forrásrevízió megjelenése PASS; a létrehozott smoke-draftot célzottan eltávolítottuk. A külön 390 px viewport a rendelkezésre álló vezérlőben nem volt beállítható, ezért MOBILE QA UNVERIFIED.

## F9.6.1.2.1 — végső integrációs hardening

Állapot: COMPLETE lokális elfogadással. A `20261013080200` migráció explicit `transfer_request_key` és immutable logikai `transfer_payload` mezőt, egyedi szervezet/projekt/kéréskorlátot és atomi `create_gutter_takeoff_draft` RPC-t vezetett be. A `20261013080300` javította a korábbi takeoff DELETE triggerek `NEW` visszatérési hibáját úgy, hogy a jóváhagyott rekordok immutabilitása megmaradt, a draftok szabályos törlése pedig ismét működik. A `20261013080400` a draft forrásazonosítóit, kéréskulcsát és payloadját közvetlen UPDATE ellen is immutable-lé tette.

Bizonyíték: 29/29 célzott pgTAP; két független authenticated adatbázis-kapcsolatból pontosan egy létrehozás és egy reuse, egy draft és egy tétel; 8/8 A–H valódi Server Action határteszt két ideiglenes, külön szervezethez tartozó bejelentkezett identitással; 8/8 célzott domain/SVG Vitest; teljes Vitest 95 PASS és 8 környezetfüggő teszt szabályosan skip; typecheck, lint és production build PASS. A lokális migrációtörténet `20261013080400`-ig egyezik, minden ideiglenes fixture és segédobjektum eltávolítását nulla darabszám igazolta. Hosted migráció, hosted RLS, backup/restore és terepi mobilvizsgálat nem történt.

## F9.6.2 — Bádogos szegélyek kalkulátora — COMPLETE (LOCAL)

Állapot: **COMPLETE (LOCAL)**. Az F9.6.2.0–F9.6.2.3 alábbi, korábban rögzített bizonyítékai és a [tesztmátrix](TEST_MATRIX.md) alapján a helyi munkafolyamat teljes: aktuális, verified tetőgeometria → szegélyanyag-becslés → változtathatatlan kalkulációs revízió és pontos geometriai forráshivatkozás → explicit, egységazonos katalógusvariáns → mentett revízióból készülő sematikus műszaki SVG → atomi, idempotens új anyagkimutatás-draft. Az F9.6.1 revíziós, függőségi, katalógus- és draft-architektúráját használja újra. A kapcsolat/átfedés felhasználói vagy forrásolt paraméter; hiányakor nincs számolt darabszám. A `piece` és `linear_meter` mennyiség külön, a tartalékkal növelt hossz csak előzetes tervezési cél; a forrás-, műszaki és egységazonos árrevízió-snapshot visszakövethető, hiányzó ár `null`. A helyi bizonyíték kiterjed a tagság, szervezet és projekt ellenőrzésére, az aktuális forrásrevíziókra, a történeti és approved rekordok változatlanságára, valamint a párhuzamos átadás egyszeri létrehozására. Ez dokumentációs elfogadás: az alábbi korábbi Vitest-, pgTAP-, konkurencia-, typecheck-, lint-, build- és böngészős eredményeket ebben a körben nem futtattam újra. Éles üzemkészség, konkrét gyártói megfelelés, terepi szakmai jóváhagyás és fizikai mobilkészülékes QA továbbra sem igazolt.

### F9.6.2.0 — kutatás és domain-terv

Állapot: **COMPLETE (DESIGN)**. Elkészült a [szegélykalkulátor-terv](FLASHING_CALCULATOR_DESIGN.md) célzott Lindab, PREFA és Ruukki gyártói forrásokkal, explicit átfedést kezelő matematikai szerződéssel, a tényleges `roof.gable` élhatárokhoz igazított importjavaslattal, provenance- és takeoff-határokkal, valamint DEMO matematikai tesztesetekkel. Kalkulátor, UI, adatbázis és migráció nem készült; teszt, build, pgTAP és böngészős ellenőrzés nem futott. Konkrét gyártói alkalmazhatóság és terepi szakmai jóváhagyás nyitott.

### F9.6.2.1 — szegélyanyag-becslő domainmotor

Állapot: **COMPLETE (DOMAIN)**. A tiszta `sheet_metal.flashings.material-estimate` kalkulátor bekerült a meglévő production registrybe. Kezeli mind a hat tervezett kategóriát, független futásokat, külön végkiterjesztést/tartalékot, explicit átfedést, explicit hasznos fedési hosszt, ismeretlen kapcsolatot, paraméter-provenance-t, figyelmeztetéseket és kézi darabtételt. A célzott Vitest 15/15 PASS (10 új szegélyteszt és 5 meglévő gutter regressziós teszt); `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. A tesztek lokálisan futottak; adatbázis-, jogosultsági, UI-, böngészős és szakmai/gyártói ellenőrzés nem része ennek a domainfázisnak. Az F9.6.2.2 akkori nyitott státuszának későbbi eredménye alább szerepel.

### F9.6.2.2 — projektintegráció és immutable mentés

Állapot: **COMPLETE (LOCAL)** az F9.6.2.2.1 végső integrációs ellenőrzésével. Elkészült a projekt szegélykalkulátor oldala, a projekt CTA, mind a hat kategória, több független futás, explicit kapcsolatparaméterek, végkiterjesztés/tartalék, azonnali domain eredmény és revízióválasztó. A geometriajavaslatok kizárólag aktuális, verified nyeregtető-revízióból származnak; a pontos modell-, modellrevízió-, kalkuláció- és kalkulációsrevízió-ID-k, az eredeti geometriai hossz és a felülírásjelző megmaradnak. A tört mm-es ferde él eredeti értékét megőrizve a motor egész mm-re felfelé kerekít.

Az `20261013080500` migráció reset nélkül lefutott a már egészséges helyi Supabase adatbázison; a migrációlista egyezik. A célzott `011_flashing_calculation.sql` teszt egy kezdetben túl tág függőség-lekérdezést jelzett, amely a tető-kalkuláció saját upstream élét is számolta; a tesztet a szegélykalkuláció típusára szűkítettem. Utána a teljes helyi pgTAP készlet 329/329 PASS (11 fájl, benne 19 szegélyállítás). A böngészőben a létező verified DEMO jellegű tetőrevízióból él hozzáadása, V1 mentése, 100 mm tartalékkal V2 mentése, reload, V1 visszanyitása PASS. A read-only DB ellenőrzés V1/V2-t, a 6625,00000036 mm eredeti geometriát, 6626 mm számítási hosszt, `lengthOverridden=false` értéket és revíziónként két dependencyt igazolt. A fejlesztői szerver futtatásához a Docker socket hozzáférést engedélyezni kellett; a 3000-es porton már futó projekt-szervert `localhost` címen használtam. Reset, hosted Supabase és valós ügyféladat nem érintett. A böngészős ellenőrzés céljára mentett, explicit DEMO kalkulációs V1/V2 megmaradt a helyi adatbázisban; az F9.6.2.3 későbbi integrációs eredménye alább szerepel.

Helyi célzott domain/edge Vitest 12/12, `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS (az utóbbiak előző F9.6.2.2 végrehajtásból; a végső ellenőrző körben nem futtattam őket újra, mert alkalmazáskód nem változott). A fizikai mobil QA és gyártói/szakmai validáció külön korlát marad. Javasolt commit: `test(F9.6.2.2.1): verify local flashing integration`.

## F9.6.2.3 — anyagkatalógus, atomi draft-átadás és műszaki SVG

Állapot: **COMPLETE (LOCAL)**. A szegélyoldal aktív, műhelyhez tartozó `flashing` és `sheet_metal` kategóriájú variánsokat kínál; a felhasználó explicit módon rendeli hozzá mind a hat szegélykategória valamelyik mentett mennyiségét. Kategória-, termékstátusz- és beszerzési egységellenőrzés történik, profil-/gyártói kompatibilitást a név nem következtet ki. A variáns műszaki paraméter-, forrás- és provenance-adatát, valamint azonos egységű árrevízióját a draft snapshot őrzi. Hiányzó ár esetén `null` marad és látható warning készül.

Az új `create_flashing_takeoff_draft` SECURITY INVOKER RPC az aktuális verified kalkuláció/revíziót, verziót, tagságot, projektet, katalógust és mennyiséget adatbázisoldalon ellenőrzi. A geometry forrásmodell és kalkuláció sorait stabil ID-sorrendben megosztott zárolással tartja, majd ellenőrzi az exact current revíziókat és dependencyt. Egy tranzakcióban új draftot és tételeket hoz létre; az explicit UUID kéréskulcs azonos payloadra reuse-t, eltérő payloadra elutasítást ad. A szálbecslés `piece`, az explicit `planningTargetLengthMm / 1000` `linear_meter`; az utóbbi tartalmazza a tartalékot és nem végleges beszerzési terv. `sectionCount=null` sosem válik nullás darabszámmá.

Az SVG mentett revízió méreteit, kiterjesztéseit, tartalékát, ismert szálhatárait/explicit átfedéseit és forrásazonosítóit sematikusan jeleníti meg; nem állít tetőtopológiát, profilmetszetet vagy szerelési szabályt. A helyi browser DEMO folyamat V2 snapshotból 6,726 fm átadást, exact revíziót és estimated provenance-t igazolt; a kompatibilis egységhez nem volt ár, így nem került át más egység ára. A korábbi approved takeoff változatlan maradt.

Bizonyíték: célzott Vitest 6/6, pgTAP 28/28, valódi kétkapcsolatos authenticated konkurenciateszt (1 create + 1 reuse, azonos draft ID, 1 tétel/4,1 fm), `npm run typecheck`, teljes `npm run lint`, `npm run build` PASS. Egy hitelesített helyi browser workflow PASS; fizikai/narrow viewport és gyártói validáció nem történt. Nincs hosted migráció vagy F9.6.3. Javasolt commit: `feat(F9.6.2.3): integrate flashing materials and SVG`.

## F9.6.3.0 — lemezprofilok és hajtások: kutatás és domain-terv

Állapot: **COMPLETE (DESIGN)**. Elkészült a [lemezprofil- és hajlítási terv](SHEET_METAL_PROFILE_DESIGN.md) elsődleges CAD-, gép-/szerszámgyártói és magyar tetőfedési forrásokra támaszkodva. Rögzíti a tangens-, külső és belső méretkonvenciót, az előjeles hajtás- és nyílásszöget, a `BA`/`BD`/`K` feltételes matematikáját, a nyitott 2D profilmodell és a gyárthatóság határát, a meglévő registry/revízió/katalógus/SVG újrahasznosítását, 9 explicit DEMO referenciaesetet és az F9.6.3.1–.4 fáziskapukat. A referenciaértékeket független Python aritmetika ellenőrizte; Vitest, pgTAP, typecheck, lint, build, böngésző, Docker és Supabase nem futott. Alkalmazáskód, adatbázis és migráció nem változott. Konkrét anyag–gép–szerszám kalibráció és terepi szakmai jóváhagyás hiányzik, ezért gyártási pontosság/megfelelőség nem állítható. Javasolt commit: `docs(F9.6.3.0): design sheet metal profile domain`.

## F9.6.3.1 — lemezprofil-geometria és hajlítási domainmotor

Állapot: **COMPLETE (DOMAIN)**. A `sheet_metal.profiles.flat-pattern` v1 tiszta TypeScript kalkulátor a production registrybe került. Nyitott L/U/többhajtásos profilokat, mindkét hajtásirányt, analitikus belső/külső köríveket, determinisztikus koordinátákat és anyagkontúr-önmetszés ellenőrzést kezel. A készállapotú tangensméret az egyetlen számolható bemeneti konvenció; külső/belső virtuális csúcsméret explicit nem támogatott. Hajtásonkénti explicit `BA` vagy forrásolt `K` alapján kiterített szélességet ad; hiányzó paraméternél a geometria megmarad, a teríték `null`/`INCOMPLETE`. Ellenőrizetlen gépi forrásból nem lesz kalibrált eredmény. A bal/jobb folytonos kontúr és hajtásonkénti belső/külső ív a vegyes hajtásirány miatt váltja a tervezet sematikus globális „inner/outer contour” elnevezését. A meglévő Zod, hibakód- és registry-architektúrát használja; F9.6.2 működését nem módosítja.

Bizonyíték: a célzott `npx vitest run src/domain/calculations/sheet-metal-profile.test.ts` **19/19 PASS**, benne a terv mind a 9 független DEMO referenciaesete, ellenkező irányú hajtás, önmetszés, számtartomány, fok/radián, explicit `BA`, hiányzó paraméter és registry. A meglévő engine + flashing célzott regresszió **15/15 PASS**. `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. A lint első futása egy használatlan értékadást jelzett; javítás után sikeres. Teljes Vitest-regresszió, pgTAP, adatbázis, jogosultsági és böngészős ellenőrzés nem futott; e domainfázisban nincs tartós adatírás. Szerszám-/anyagkalibráció, gyárthatóság, visszarugózás és terepi szakmai jóváhagyás továbbra sem bizonyított. Következő külön feladat: F9.6.3.2. Javasolt commit: `feat(F9.6.3.1): add sheet metal profile domain engine`.

## F9.6.3.2 — interaktív lemezprofil-szerkesztő

Állapot: **COMPLETE (LOCAL UI)**. A projektből elérhető „Lemezprofilok és hajtások” helyi munkavázlat L/U/egyedi nyitott DEMO sablonnal, egyenesek/hajtások hozzáadásával és törlésével, tangenshossz-, szög/irány-, sugár-, vastagság- és BA/K/forrás-szerkesztéssel készült el. A szöveges draft marad az egyetlen szerkeszthető állapot; a meglévő domainkalkulátor és Zod-szerződés élő kimenetéből készül a méretarányos, analitikus íves SVG és a terítékösszegzés. A kijelölés a rajz és a sor között szinkron; zoom, pan, visszaállítás és illesztés elérhető. Hibás bevitel megmarad, rajz nem készül belőle; hiányzó BA/K mellett a geometria megmarad és a szélesség nem kap kitalált nullás értéket. Nincs tartós adatírás, így új jogosultsági/konkurencia-felület sincs; a projektoldal meglévő szervezet- és projektellenőrzését használja. A későbbi mentés/revízió F9.6.3.3 feladat.

Bizonyíték: `npx vitest run src/features/sheet-metal/profile-editor.test.ts src/domain/calculations/sheet-metal-profile.test.ts` **26/26 PASS**; `npm run typecheck`, `npm run lint`, `npm run build`, `git diff --check` PASS. Egy hitelesített helyi böngészős folyamatban projektútvonal, L-hossz/szög és SVG-frissülés, forrásolt BA és 117,5 mm-es teríték, U-váltási figyelmeztetés, kétirányú kijelölés, 125%-os zoom, egérpan, hiányzó BA/K és hibás vastagság igazolt. A 390 px széles nézetben `scrollWidth=390`, egy oszlop és 313 px-es SVG. Fizikai érintés/pinch, teljes regresszió, adatbázis és gyártási alkalmazhatóság nem ellenőrzött; adatbázismódosítás nem történt. Javasolt commit: `feat(F9.6.3.2): add interactive sheet metal profile editor`.

## F9.6.3.3 — lemezprofil-mentés és immutable revíziók

Állapot: **COMPLETE (LOCAL)**. Profilonként külön `calculations` rekord tárolja a `sheet_metal.profiles.flat-pattern` kalkulációt; a `calculation_revisions` minden mentésnél új, immutable snapshotot kap. Az input megőrzi a profil típusát, egyeneseket, hajtásszögeket/irányt, vastagságot, sugarakat, BA/K módot, forrásprovenance-t és a tangens/koordináta-konvenciót. Nincs UI-only állapot a snapshotban. A mentés a szerveren újrafuttatja a production domainmotort; a PostgreSQL input-only RPC ugyanakkor önállóan számítja és tárolja a revízió BA/K összegzését, így kliensoldali outputot nem fogad el.

A SECURITY INVOKER RPC aktív műhelytagságot, ugyanazon szervezet projektjét, kalkulációazonosítót/tulajdonjogot, inputkonvenciót és expected revisiont vizsgál. Profilazonosítónként tranzakciós advisory lock szerializálja az első és későbbi írást. Az `calculation_revisions` meglévő immutable triggere védi a történetet. BA/K hiányakor a profil menthető, a tárolt és újraszámolt terítékszélesség `null` marad. Katalógus-variáns létező `technical_specs` JSON-ja nem definiál profil-kompatibilitási sémát, ezért nincs automatikus vagy terméknévből következtetett társítás; a kifejezett műszaki mapping az F9.6.3.4 nyitott pontja.

Bizonyíték: célzott editor/domain Vitest **27/27 PASS**; helyi pgTAP **19/19 PASS** (cross-project kalkuláció és cross-org revision-read is tiltott), valódi kétkapcsolatos authenticated konkurenciateszt **1 V2 létrehozás + 1 stale konfliktus, V1/V2 megmaradt**; `npm run typecheck`, `npm run lint`, `npm run build` PASS. Egy hitelesített helyi DEMO böngészőmenetben V1 mentés/reload, BA/K-s V2, változatlan V1 visszatöltés, hiányos V3 és a végső input-only RPC-val V4 mentés/reload igazolt; a hiányos revízió terítékszélessége `null`. Nincs teljes Vitest/pgTAP regresszió, fizikai eszközös vagy gyártási ellenőrzés. Javasolt commit: `feat(F9.6.3.3): persist sheet metal profile revisions`.

## F9.6.3.4.1 — profilanyag-mennyiség

Állapot: **COMPLETE (LOCAL)**. Az editor explicit darabhosszt (mm), darabszámot és opcionális anyagspecifikációt kezel; a domainmotor a hiteles terítékszélességből nettó téglalapfelületet számol, hiányzó BA/K esetén `null` eredménnyel és megőrzött geometriával/inputtal. A szerver újraszámol, a helyi adatbázis trigger újraellenőrzi a szélességet és a területet. A katalógusvariáns csak aktív, szervezetazonos, explicit anyagazonosítóval, vastagsággal, `square_meter` egységgel és forrásnévvel rendelhető; az egyezés kizárólag műszaki paraméteregyezés, nem gyártói vagy gépi jóváhagyás. A forrásnév, URL, dátum és mennyiség immutable V1/V2 revízióban marad; a meglévő szervezeti és expected-revision védelem újrahasznált.

Bizonyíték: célzott Vitest **32/32 PASS**; helyi profil pgTAP **40/40 PASS** két fájlban, beleértve a cross-org elutasítást és V1/V2 megőrzést; helyi migrációk reset nélkül alkalmazva; `npm run typecheck`, `npm run lint`, `npm run build` PASS. Egy hitelesített helyi böngészős DEMO V1 mentés/reload után a 103 mm × 2000 mm × 3 = 0,618 m² és az inputok megmaradtak. Teljes regresszió, fizikai eszköz, valós gyártói/gépi alkalmazhatóság és kereskedelmi stockmennyiség nem ellenőrzött. F9.6.3.4.2-ben jöhet külön forrásolt, atomi takeoff-draft átadás. Javasolt commit: `feat(F9.6.3.4.1): add profile net blank area and catalog matching`.

## F9.6.3.4.2 — profilanyag átadása új draftba

Állapot: **COMPLETE (LOCAL)** a helyi alkalmazás és adatbázis munkafolyamatára. Az editor az aktuális, mentett profilrevízióból és az abban rögzített kompatibilis `square_meter` variánsból ad át, külön előnézet és megerősítés után. Nem mentett, történeti vagy hiányos BA/K/terület állapotnál az átadás tiltott. A szerveroldali action a teljes TypeScript domainmotorral újraszámolja a geometriát; a SECURITY INVOKER SQL RPC az aktuális revíziót zárolja, az inputból önállóan újraszámolja a szélességet és a `W × darabhossz × darabszám / 1 000 000` nettó m²-t, majd az aktuális aktív katalógusadatokat is ellenőrzi. Az összes forrás-, BA/K-, termék-, műszaki és egységazonos árprovenance a tételsnapshotba kerül; hiányzó m² ár `null`. A tételsnapshot UPDATE tiltott, a forrásrevízió immutable. Az új draft és tétel egy tranzakcióban készül; UUID kéréskulcs és egyediség adja a konkurens idempotenciát. Jóváhagyott rekordot az átadás nem módosít. Ez előzetes, paraméteralapú nettó blankterület, nem kereskedelmi stock, kihozatal, vágásterv vagy gépi jóváhagyás.

Bizonyíték: helyi `20261013081400`–`20261013081700` migráció reset nélkül; célzott profil pgTAP **37/37 PASS**, eresz/szegély regressziós pgTAP **57/57 PASS**, két független authenticated kapcsolatos konkurenciapróba **1 create + 1 reuse, 1 draft/tétel, 0,618 m²**. Célzott Vitest **32/32 PASS**, a végső action-változtatás után `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Egy hitelesített helyi DEMO böngészőmenetben V1 megnyitás, explicit kompatibilis DEMO m² variáns V2-be mentése, 0,618 m² előnézet és megerősítés, új draft megnyitása, pontos revízió és hiányzó ár megjelenése PASS. Mentett, BA/K nélküli V3-ban az átadás letiltott; a korábbi V2 draft ezután elavult forrásként látszik, de 0,618 m² és a V2/BA/kompatibilitási snapshot változatlan. A korábbi approved rekord a takeoff oldalon változatlanul látható. Hosted adat, teljes regresszió, fizikai eszköz és gyártási validáció nem ellenőrzött. Javasolt commit: `feat(F9.6.3.4.2): transfer profile net area to idempotent takeoff draft`.

## F9.6.3 — végső helyi elfogadás

Állapot: **COMPLETE (LOCAL)**. A dokumentált F9.6.3.0–F9.6.3.4.2 bizonyítékok együtt lefedik a profilgeometriát és hajlítást, az interaktív SVG-szerkesztést, az immutable és visszakövethető mentett revíziót, a nettó blankterületet, az explicit katalógus-kompatibilitást, majd az aktuális mentett revízió atomi átadását új anyagkimutatási draftba. Az ismeretlen BA/K és hiányzó mennyiségi adat `null`/hiányos marad, nem válik nullás területté vagy átadható mennyiséggé; a mennyiség `square_meter`, darabszám és darabhossz szemantikája explicit. A forrásrevízió, BA/K- és katalógusprovenance a snapshotban követhető. A szervezeti/projekt-jogosultság, immutable revízió/tétel, approved rekord változatlansága, tranzakciós atomicitás és idempotens konkurens újrapróbálás dokumentált célzott adatbázis- és authenticated konkurenciabizonyítékkal rendelkezik.

A végső átadási mérföldkőhöz jelentett történeti eredmények: profil Vitest **32/32**, profil pgTAP **37/37**, eresz/szegély regressziós pgTAP **57/57**, konkurens transfer **PASS**, typecheck/lint/build **PASS**, hitelesített helyi browser flow **PASS**. Ezeket ebben az elfogadási körben nem futtattam újra; teljes regresszió sem történt. A TEST_MATRIX megfelelő záró bejegyzése tartalmazza a részleteket.

A státusz kizárólag helyi elfogadás. Nem jelent production readiness-t, géppel kalibrált gyártási pontosságot, gyártói jóváhagyást, szakmai terepi validációt vagy fizikai mobilkészülékes QA-t. A kihozatal, nesting/vágás, hulladék, táblaszám és kereskedelmi beszerzési mennyiség továbbra sem számított. Javasolt következő fázis: **F9.7.0 – Product UX & Workflow Audit**, a három meglévő kalkulátorfolyamat, projekt-navigáció, terminológia, mobilhasználat és használhatósági hiányok projekt-szintű felmérésére; ez az elfogadás nem indítja el annak implementációját. Javasolt commit: `docs(F9.6.3): accept local profile workflow`.

## F9.7.0 — Product UX & Workflow Audit

Állapot: **COMPLETE (AUDIT)**. Elkészült a [termék-UX és workflow audit](PRODUCT_UX_WORKFLOW_AUDIT.md), forráskód alapján összevetve az ereszcsatorna-, szegély- és lemezprofil-kalkulátort, a projektoldali útvonalakat, a takeoff/ajánlat/kivitelezési kapcsolatot, valamint a mobil- és hozzáférhetőségi kockázatokat. Fő javaslat: projektoldali eresz/szegély navigáció, egységes kalkulátor-sorrend és read-only workflow-áttekintés, majd célzott mobil/a11y ellenőrzés. A böngésző tablistája üres volt, így hitelesített walkthrough, viewport-, fizikai eszköz-, kontraszt- és screen-reader teszt nem történt; minden ilyen megállapítás potenciális kockázatként szerepel. Alkalmazáskód, adatbázis, migráció és Supabase nem változott; teszt, build és teljes regresszió nem futott. Javasolt következő fázis: **F9.7.1 — projektoldali kalkulátor-felfedezhetőség**, külön indításként; ez az audit nem implementálja.

## F9.7.1 — projekt-navigáció és összecsukható kivitelezés

Állapot: **PARTIAL (LOCAL UI)**. A projektoldal külön „Kalkulátorok” blokkja mindhárom meglévő útvonalat nyitja meg az aktuális `projectId` és szervezet query-paraméter megtartásával. A projekt áttekintésében a kivitelezés natív, alapból zárt disclosure lett; a Tetőmodellek továbbra is a kivitelezés után, külön szekcióként látható. A kivitelezésen belül a jelentés-előkészítés és fényképdokumentáció egy „Dokumentáció”, az új bejegyzés és idővonal egy külön „Munkanapló” disclosure alá került. A belső nyitottság független; a szülő bezárása visszazárja mindkettőt. A vezérlők natív billentyűzetes disclosure szemantikát, fókuszstílust, mobil töréspontot és reduced-motion kezelést használnak. Üzleti action, adat, jogosultság, dokumentumtárhely, séma és Supabase nem változott.

Bizonyíték: `npx vitest run src/features/projects/project-navigation.test.ts` **3/3 PASS**; `npm run typecheck`, `npm run lint`, `npm run build` PASS. `git diff --check` a dokumentálás után fut. Böngészősmoke és 390 px/tablet viewport ellenőrzés nem futott: a helyi szerver indítása `EPERM` hibával meghiúsult mind `0.0.0.0:3000`, mind `127.0.0.1:3000` címen, üres böngészőtab mellett. Emiatt az elfogadási feltétel teljes, interaktív/reszponzív bizonyítéka hiányzik; státusz PARTIAL. Javasolt következő fázis: **F9.7.2 — kalkulátor-munkafolyamat konzisztencia**, külön indítás után.

## F9.7.1.1 — magyar szakmai UX és valósághűségi audit

Állapot: **COMPLETE (VERIFIED SCOPE)** a 19 tényleges felhasználói útvonal, a hozzájuk tartozó közös UI, visszajelzések és PDF-feliratok forráskódos áttekintésére. A részletes leltár, bizonyítékok, INCORRECT/VERIFIED/UNVERIFIED/NOT APPLICABLE minősítések és következő termékdöntések: [Magyar szakmai UX audit](HUNGARIAN_PROFESSIONAL_UX_AUDIT.md). Javítások: belső fáziskódok és angol UI-szavak eltávolítása; forrás nélküli eresz/lefolyó és új nyeregtető kezdőméretek eltávolítása; anyagkimutatásban magyar, kompatibilis mérési és ár-választék; lefolyótartozékok átadási korlátjának jelzése; szegély/profil mérési és eredményfeliratok pontosítása. Üzleti képlet, szerveroldali szerződés, migráció és jogosultság nem változott. A célzott 10 tesztfájl / 39 teszt, valamint külön 3 fájl / 7 teszt, továbbá typecheck, lint és build PASS; teljes regresszió, adatbázis és böngésző nem futott. A korábbi helyi szerverindítás `EPERM` miatt a hitelesített/mobil megjelenés továbbra sem igazolt. Javasolt commit: `fix(F9.7.1.1): clarify Hungarian professional UX and calculator inputs`.

## F9.7.2 — Egységes projektfolyamat-áttekintő

Állapot: **PARTIAL (LOCAL)**. A read-only projektfolyamat-összefoglaló és a desktop UI-scope elkészült; a megadott keskeny viewport ellenőrzés nem volt végrehajtható, ezért a teljes vizuális elfogadás nyitott. A projektoldal a mentett tetőmodellek, eresz-/szegély-/profilkalkulációk, anyagkimutatások, ajánlatok, kivitelezési tervek, belső naplóbejegyzések és fényképek rövid állapotát, illetve a meglévő modulok projekt- és szervezetkontextusú linkjeit mutatja. Csak a kalkulációk, anyagkimutatások és ajánlatok szervezet+projekt szűrt, kis oszlopszámú listái új lekérdezések; tetőmodellek és kivitelezés meglévő projekt-scope lekérdezéseit használja újra. Nincs írás, új státusz, készültségi százalék vagy üzleti logika módosítás. A szöveg nem minősít szakmailag ellenőrzöttnek kalkulációt, az elfogadott ajánlatot nem nevezi szerződésnek, a naplót belsőként jelöli. A régi, téves „Hamarosan” tetőmodell-kártya kikerült; tetőmodell és kalkulátornavigáció megmaradt, a kivitelezés változatlanul összecsukható.

Bizonyíték: 3 célzott Vitest fájl / 7 teszt, typecheck, lint, build (webpack) és `git diff --check` PASS. Egy hitelesített helyi DEMO projekt smoke PASS: összefoglaló, három kalkulátor-link, valós státuszok, tetőmodellek és csukott kivitelezés megjelent; az előnézeti kalkulációk aktuális/piszkozat/elfogadott különbségei látszottak. Egy ereszkalkulátor read-only bejárása során a mentett magyar mezőcímkék, revízióválasztó, mérési forrás, becslési korlátok és letiltott átadási gomb látszottak; bemenetet nem módosítottam és validációs hibát nem provokáltam. A narrow viewport nem volt elérhető. DB/RLS teszt és teljes regresszió nem futott; adatbázisséma és üzleti adatok nem változtak. **A PRODUCT_UX_WORKFLOW_AUDIT.md 57. sorában jelzett P1 (projekt-szintű read-only áttekintés) megvalósult és a fenti forrás-, teszt- és desktop smoke bizonyítékkal lezárható;** a külön kalkulátorkonzisztencia- és mobil/a11y tételek nem részei ennek a lezárásnak. Javasolt commit: `feat(F9.7.2): add read-only project workflow overview`.

### F9.7.2.1 — reszponzív és akadálymentességi ellenőrzés

Állapot: **PARTIAL**. A hitelesített desktop projektoldalon a billentyűzetes fókusz látható, a Kivitelezés natív `details/summary` vezérlője Space billentyűvel nyitható és zárható; a böngésző akadálymentességi fája névvel mutatja a főcímet, kártyacímeket, egyedi modulhivatkozásokat és összecsukható vezérlőt. Javítva: ismétlődő „Megnyitás” linknevek egyedivé tétele, workflow kártyacímek `h3`-ra emelése, link fókuszjelölése és legalább 44 px magas kattintási cél. A státuszok szövegesek, nem kizárólag színesek. A 390 px és 768 px viewport nem volt emulálható a rendelkezésre álló natív Brave vezérlővel, ezért ezek vizuális viselkedése és túlcsordulása CSS alapján csak előzetesen megítélhető; PASS nem állítható. Képernyőolvasóval és fizikai eszközön nem ellenőriztem. Szervezet/projekt adatszűrést a célzott adatlekérdezés-teszt fedi; a projekt jogosultság-ellenőrzése minden workflow-lekérdezés előtt lefut. Részletek a [tesztmátrixban](TEST_MATRIX.md). F9.7.3 nem indult el.

## F9.7.3 — kalkulátor UX-konzisztencia

Állapot: **PARTIAL (LOCAL UI)**. Az eresz- és szegélykalkulátor állapotjelzése magyarul megkülönbözteti a mentett aktuális, történeti, elavult forrású és nem mentett állapotot; az eresznél a mentés gombja előre jelzi, hogy új V-változat készül. A profil szerkesztő 560 px alatt egy oszlopba rendezi az alapmezőket, hajlítási paramétereket és mentési vezérlőket, hogy keskeny kijelzőn ne zsúfolódjanak össze. A domainmotorok, képletek, mentési/transzfer actionök, DB-séma és jogosultsági szerződések változatlanok.

Bizonyíték: célzott UI Vitest **12/12 PASS** (`gutter-calculator-ux.test.ts`, `calculator-ux.test.ts`, `profile-editor.test.ts`); `npm run typecheck`, `npm run lint`, `npm run build` és `git diff --check` PASS. Böngészősmoke nem történt: a Brave tablista üres, korábbi projektfeljegyzés szerint a helyi szerverindítást `EPERM` blokkolta; a korábban nem támogatott 390/768 px emulációt nem próbáltam ismét. Emiatt a teljes közös workflow, SVG-kezelés, anyagátadási minták, interaktív billentyűzetes állapotok és viewport render nem igazolt; fizikai eszköz QA sem történt. Az elfogadási feltételek még nem teljesek, ezért PARTIAL. Javasolt következő lépés a nyitott mobil és interaktív QA megbízható böngészőkörnyezetben; **F9.7.4 nem indult el**. Javasolt commit: `fix(F9.7.3): clarify calculator revision states and narrow forms`.

## F9.7.3.1 — végső kalkulátor UX-konzisztencia

**F9.7.3 állapot: COMPLETE (LOCAL UI)** a funkcionális felületi körben. A korábbi PARTIAL bejegyzés az előző részeredményt rögzíti. Az eresznél az eredmény után közvetlenül a rajz, majd a katalógus és az átadási előnézet következik. A szegélynél a megnevezés módosítása is mentetlen változásként jelenik meg. A szegélyrajz szerkesztéskor az élő számítást mutatja; érvénytelen bemenetnél nem marad látható régi mentett rajz. A szegély széles SVG-je billentyűzettel fókuszálható, megnevezett görgetési terület. A profil két azonos hatású nézetgombját egy őszintén feliratozott illesztés/alaphelyzet vezérlő váltotta fel; a számítás és figyelmeztetései az átadási blokk elé kerültek. A rajzok műszaki korlátai, a statikus sémák tényleges kezelése és a profil pan/zoom használata szövegesen olvasható.

A három katalógus/átadási felület a mentett forrásváltozatot, az előzetes mennyiséget és egységet, a kompatibilitás/hiányzó hozzárendelés állapotát, az ár rendelkezésre állását ott, ahol az adat adott, és az új piszkozat létrehozását egyértelműen jelzi. A megerősítő gombok és a már meglévő átadási jogosultsági feltételek megmaradtak. A domain-, kompatibilitási, szerveraction-, RPC-, adatbázis- és jogosultsági kód nem változott; a korábbi immutable snapshot, szervezeti izoláció és konkurenciabizonyítékokat ez a UI-kör újrahasználja, nem futtatta újra.

**Bizonyíték:** `npx vitest run src/features/flashings/drawing-preview.test.ts src/features/flashings/calculator-ux.test.ts src/features/gutters/gutter-calculator-ux.test.ts src/features/sheet-metal/profile-editor.test.ts` — 4 fájl / **18 PASS**; névváltozás miatti mentetlen állapot, élő/mentett/hibás rajzforrás kiválasztása, mentett eredmény és SVG, hozzáférhető katalógusválasztók, átadási előnézet, figyelmeztetés és profilrajz vezérlő renderelése. `npm run typecheck`, `npm run lint`, `npm run build` (webpack) és `git diff --check` PASS. Ezek célzott, részben SSR és tiszta állapotlogikai tesztek, nem teljes interaktív regresszió. A korábban üres Brave tablista miatt hitelesített böngészősmoke nem volt elérhető; interaktív böngészős UX **UNVERIFIED**. 390/768 px vizuális és fizikai touch/pinch ellenőrzés az F9.7.4 külön feladata. Javasolt commit: `fix(F9.7.3.1): align calculator drawings and material transfer UX`.

## F9.7.4.1 — iPad runtime és UX korrekciók

Állapot: **PARTIAL (IMPLEMENTATION)**. A három kalkulátor kliensoldali inicializálása közös, biztonságos UUID-segédet használ: előbb a natív `crypto.randomUUID()`, ennek hiányában RFC 4122 v4 bitmintával a `crypto.getRandomValues()`. `Math.random()` nincs; biztonságos forrás hiányakor egyértelmű hiba keletkezik. A gutter/flashing/profil takeoff-kulcsok egy logikai átadáson belül stabilak, retry esetén újrahasználódnak, siker után cserélődnek; a flashing új revízió/hozzárendelésnél új kulcsot kap. A kliensoldali Execution műveletek szintén a közös UUID-segédet használják. Takeoff RPC-szerződés, képletek, jóváhagyási üzleti logika és DB-jogosultság nem változott.

A beolvasott `.env.local` loopback Supabase URL-t (`127.0.0.1:54321`) tartalmazott, ami iPaden az iPad saját loopback címe. A helyi konfiguráció URL-jét a feladatban megadott Mac LAN-címre (`192.168.1.31:54321`) állítottam; a böngésző- és szerverkliens ugyanazt a publikus URL/publishable-key konfigurációt használja, service-role kulcs nincs a `.env.local`-ban. A helyi Supabase API nem válaszolt egyik címről sem; a Docker socket hozzáférése megtagadott, a Supabase CLI státusz a sandbox `~/.supabase/telemetry.json` írási tiltása miatt nem futott le. Emiatt hálózati, hitelesítési és szervezeti jogosultsági futás nem igazolt; a három hiba okát ettől elkülönítve, az HTTP LAN-originon használt secure-context API hiányával azonosítottam.

A projekt áttekintő a meglévő, projekt+szervezet szerint lekért tetőmodellek mentett nyeregtető rajzpaneljeit jeleníti meg egymás alatt, modellnévvel/revízióval, a részletes modell linkjével és az eredeti nézetválasztókkal. A tetőmodell-oldalak rajzai megmaradnak. A jóváhagyás saját, felső térközzel és tördeléssel rendelkező akcióterületet kapott. A globális floating panel négy külön csúszkája: szöveg, vezérlőméret, felületi térköz, műszaki rajz megjelenítése; a meglévő localStorage beállítást bővíti, SSR induló markup változatlan. A fókuszban lévő mezőt a Visual Viewport változásánál csak akkor görgeti középre, ha kilóg a látható területről; az ikon szerkesztés alatt vagy másik fontos vezérlővel való ütközéskor rejtett.

Bizonyíték: 10 célzott Vitest fájl / **30/30 PASS** (UUID API/fallback/idempotency, mindhárom calculator SSR fallback render, rajz asszociáció és több modell, skálázás/persistencia/reset, approval markup, keyboard-viewport és lebegő ikon átfedés ellenőrzése); `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Hitelesített böngésző-smoke nem futott: a tablista üres, a helyi app `0.0.0.0:3000` bindje `EPERM`; iOS billentyűzetet fizikai eszközön nem ellenőriztem. A LAN Supabase elérhetősége, Auth session/persistencia és RLS/authorization böngészős működése ellenőrizetlen marad, ezért ez nem fizikai eszközös vagy végső COMPLETE elfogadás. Következő: F9.7.4 fizikai iPad/iPhone acceptance. Javasolt commit: `fix(F9.7.4.1): stabilize iPad runtime and display UX`.

## F9.7.5 — végső UX-finomságok és interakciós megbízhatóság

Állapot: **PARTIAL (LOCAL UI)**. Az ajánlat szerkesztője látható `role=status` jelzést mutat módosításkor, és böngészőoldal elhagyásakor natív figyelmeztetést kér; sikeres mentéskor a jelzés megszűnik, a meglévő pending gomb tiltja a dupla mentést. Ajánlati mentés, véglegesítés, másolatkészítés, státuszváltás, valamint kivitelezési terv/feladat/napló/fényképkategória hibái közös, magyar, biztonságos üzenetleképezést használnak. A revízióütközés, jogosultsághiány, hiányzó forrás és invalid adat külön helyreállítási útmutatást ad; ismeretlen adatbázis/RPC részlet nem kerül a UI-ba. A meglévő action/domain-adaptereket és revíziószerződéseket újrahasználtam; üzleti logika, adatbázis, migráció, jogosultsági szabály és idempotencia nem változott.

Bizonyíték: célzott Vitest `npx vitest run src/lib/user-facing-action-error.test.ts src/lib/unsaved-changes.test.ts` — konfliktus-, jogosultság-, forráshiány-, validációs és ismeretlen technikai hibaszöveg, valamint dirty/clean unload figyelmeztetés. A SPA-navigáció védelmét és a további modulok loading/empty/error áttekintését az alábbi F9.7.5.1 folytatta.

## F9.7.5.1 — maradék UX-megbízhatósági javítások

Állapot: **PARTIAL (LOCAL UI)**. Az ajánlatszerkesztő módosításait az eredeti űrlapállapottal hasonlítja össze, így visszaállított értékeknél megszűnik a dirty jelzés. A projektoldalra visszatérő, szerkesztőn belüli útvonal megerősítést kér csak valódi módosításnál; Mégse esetén az editor nyitva marad, megerősítéskor navigál, mentéskor pedig megerősítés nélkül navigál a siker után. Mentés közben a mezők letiltottak, és az editor alatti ajánlatnavigáció rejtett, ezzel elkerülve versenyhelyzetet és megkerülhető linkeket. Böngészőoldal-elhagyást a korábbi natív figyelmeztetés kezeli. Browser Back / más, editoron kívüli navigáció nincs elfogva; nincs globális link/history intercept.

Az alkalmazás gyökér `loading.tsx` állapota érthető betöltésjelzést, `error.tsx` pedig technikai részletet nem felfedő, újrapróbálást adó hibafelületet biztosít. A bounded forrásáttekintés: projektek/ügyfelek (üres lista elkülönül, query hiba dob); nyeregtető (query hibák dobva); eresz/szegély/profil kalkulátorok (több lekérdezési hiba korábban üres/null értéket adott, most dob és hibafelületre jut); anyagkimutatás (fő- és kapcsolódó query hibái dobva); ajánlat (ügyfél, jóváhagyott forrás, revízió és státusztörténet hibái elkülönítve dobva); kivitelezés (fő workspace query hibái dobva). A jóváhagyás következménye — a kimutatás és tételei utána nem módosíthatók — látható. Anyagtétel és jóváhagyás gomb pending alatt tiltja a duplikált beküldést. Nincs üzleti, adatbázis-, RPC-, jogosultság-, revízió- vagy idempotencia-szerződés-változás.

Bizonyíték: célzott Vitest — 5 megadott fájl / **13 PASS** (dirty/cancel/confirm, hibás kontra üres adat, loading/error markup, pending gomb, biztonságos hibaüzenetek); `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. A build után a generált `next-env.d.ts` módosítását visszaállítottam. Böngészős smoke nem futott: korábban üres Brave tablista és dev bind `EPERM`; nem ismételtem. Browser Back / más editoron kívüli útvonal továbbra is képes mentetlen állapotot elhagyni, ezért a teljes adatvesztési kockázat nem zárható le és a státusz PARTIAL. Authenticated browser, Supabase/RLS, fizikai iPad/iPhone és teljes regresszió nem futott. Következő: F9.7.5 lezárása előtt döntsünk a browser-history navigáció termékszintű kezeléséről; **F9.8 nem kezdhető el**. Javasolt commit: `fix(F9.7.5.1): complete UX reliability safeguards`.

## F9.7.5.2 — ajánlatpiszkozat helyreállítása navigáció után

Állapot: **COMPLETE (VERIFIED LOCAL FUNCTIONALITY)**. Az ajánlatszerkesztő a jelentős mentetlen űrlapállapotot csak az aktuális böngészőlap `sessionStorage`-ában őrzi, user/org/project/quotation szerint elkülönítve. Visszatéréskor a felhasználó külön választhat visszaállítást vagy elvetést. Meglévő ajánlatnál a forrás `version` és `currentRevisionId` eltérését ellenőrzi; eltéréskor csak elvetés lehetséges. Sikeres mentés és explicit elvetés törli a piszkozatot. Fiókváltás azonos munkameneten belül törli a másik user adatait. A mentési action/revíziószemantika változatlan; a Next 16.4 `Link.onNavigate` kezeli a saját visszalink kliensnavigációját. Browser Back általános blokkolását nem állítjuk.

Bizonyíték: `npx vitest run src/features/quotations/quotation-draft-recovery.test.ts src/lib/unsaved-changes.test.ts` — 2 fájl / **6 PASS**; user/org/project izoláció, forrásrevízió-egyezés, accountváltás-invalidation, hibás adat törlése és meglévő navigációs guard. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack), `git diff --check` PASS. Böngésző Back és interaktív helyreállítás nem ellenőrzött: nem volt elérhető hitelesített browser tab, a korábbi helyi dev bind `EPERM` hibáját nem próbáltam újra. Nincs adatbázis/RPC/action payload változás, recovery adat nem jut külső rendszerbe. Korlát: lapbezárás/tab munkamenet vége vagy tiltott/kvótán túli sessionStorage esetén a helyreállítás elveszhet; külső/history navigációt nem blokkoljuk, visszatéréskor kérünk döntést. F9.8 nincs elkezdve. Javasolt commit: `fix(F9.7.5.2): recover unsaved quotation drafts`.
# F9.7.6.6.1 — standalone quotation backend

Állapot: **PARTIAL — implementációs munkafa elkészült, kritikus DB/Auth/concurrency bizonyíték blokkolt**. A közös quotations/revisions sémához `ownership_scope` került tervezve, projekt nélküli rekordnál nullable FK-val és scope CHECK-kel; a standalone owner `auth.uid()` és org tagság, a project quote tag-láthatósága megmarad. Új standalone save/read RPC és append-only idempotency ledger kezeli a draft/revíziót; manual LABOR/OTHER, authorized MATERIAL, katalogus-ár snapshot/manual override provenance és DB oldali HUF összesítés implementálva. Finalization/lifecycle és PDF project route-hoz kötve marad.

Új migráció: `20261014030000_standalone_quotations.sql`; pgTAP: `018_standalone_quotations.sql`; server actions: `src/features/quotations/standalone-quotation-actions.ts`. A specifikációs gyökér `PROJECT_BLUEPRINT.md` megvolt, de a briefben említett `docs/PROJECT_BLUEPRINT.md` útvonal nincs; a gyökér specifikáció F0/F8 pénzügyi szabályait és tényleges F8 implementációt használtam.

Bizonyíték: `npx vitest run src/domain/quotations/standalone.test.ts src/domain/quotations/money.test.ts src/domain/quotations/status.test.ts` — 3 fájl / 10 PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; existing project routes változatlan listával), `git diff --check` mind PASS. A `supabase migration list --local` telemetry kikapcsolása után `127.0.0.1:54322 ECONNREFUSED`-dal jelezte, hogy a local DB nem fut; a `supabase start` a Docker socket permission denied hibáján állt meg. Nem ismételtem. Migration apply, pgTAP, valós Auth/RLS és két-session concurrency ellenőrzés nem futott; reset/remote művelet nem volt.

Ismert korlát: egységek jelenlegi sémája szabad szöveg, elfogadott egység-registry nincs, így csak hiányzó/túl hosszú egységet lehet elutasítani, szakmailag támogatott unit-listát nem lehet kitalálni. Standalone finalization, PDF, UI és project-association nincs ebben a fázisban.

Javasolt commit: `feat(F9.7.6.6.1): add standalone quotation backend`.

## F9.7.6.6.1a — backend-validációs kör

Állapot: **PARTIAL**. A kezdeti sandboxos Docker diagnosztika socket permission
hibát adott; a szűkített, csak helyi státusz/migráció olvasásra és local DB
tesztekre kért Docker-hozzáférés után `docker info` Docker 29.8.0-t,
`supabase status` helyi DB/API-t és `linked_project=null` állapotot mutatott.
`supabase migration list --local`: DB 20261014020200-nál állt, 030000 unapplied;
quotations/revisions sorok: 2/3, a teszt DEMO termékazonosítója nem ütközött,
authenticated/anon nem kapott `public CREATE` jogot.

Statikus vizsgálat talált egy jogosultsági hibát: a kliens saját maga is
beállíthatja a `app.standalone_quotation_writer` custom GUC-t, és az eredeti
authenticated write policy / ledger INSERT grant mellett megkerülhette a
triggert, illetve hamis ledger sort készíthetett. Mivel a 030000 bizonyítottan
unapplied volt, a javítás közvetlenül a migrációba került: standalone save
SECURITY DEFINER, explicit actor/org ellenőrzés, rögzített `pg_catalog, public`
search_path; authenticated közvetlen parent/revision insert/update project
scope-ra korlátozva; ledger INSERT visszavonva. A 030000 migráció reset nélkül
sikeresen alkalmazva. A pgTAP terv 33 assertion, hamis GUC-s közvetlen
íráspróbákkal; a teszt 33/33 PASS.

`RUN_LOCAL_STANDALONE_QUOTATION_VALIDATION=1 SUPABASE_TELEMETRY_DISABLED=1 node
scripts/verify-standalone-quotation-backend.mjs`: 43/43 PASS, két valós helyi
Supabase Auth user JWT-vel. Két backend session egyidejű lock-waitjét mértük:
retry egy quote+revision, párhuzamos V2-ből egy siker + egy `40001`, V1 snapshot
változatlan. Tulajdonos/lista/történeti olvasás, same-org és cross-org deny,
hamis creator/direct write/ledger tiltás, catalog ár snapshot/manual override,
HUF kerekítés/negative/missing unit/precision/large input, project create/V2,
tag-láthatóság és egy létező accepted project quotation/revízió tiltott
módosítási próbája futott, snapshot változatlan maradt. `supabase test db --local`
002–004: 27/27 PASS. Fókuszált Vitest ezen körben 3 fájl/10 PASS; a SQL/UI
rétegén kívüli typecheck/build korábbi körből reused, a lint és
`git diff --check` ebben a körben PASS. A teljes project PDF/takeoff/finalize/status
transition és minden RLS életciklus regresszió még nem lefedett; a harness
által létrehozott DEMO userek/adatok a local DB-ben maradnak.
Javasolt commit: `fix(F9.7.6.6.1a): secure standalone quotation writes`.

## F9.7.6.6.1b — final standalone quotation backend acceptance

Állapot: **COMPLETE (DRAFT BACKEND)**. A korábban bizonyított DB/RLS/concurrency
szerződés változatlan; az 1a kör 33/33 pgTAP, 27/27 project pgTAP és 43/43
valós local Auth/concurrency eredményét nem ismételtem.

Valós Next.js Server Action runtime-ot ellenőriztem helyi, valódi Supabase Auth
sessionnel. Az ideiglenes acceptance actionön keresztül a produkciós standalone
create/read/list/catalog/save action függvények a Next SSR cookie-kból kapott
identitással futottak: 15 tulajdonosi assertion PASS, köztük manual MATERIAL és
LABOR mentés, saját lista, immutable V1/V2, stale `CONFLICT`, invalid ID,
hamisított organization ID, safe error, HUF nettó subtotal `vatAmount` nélkül,
kevert net/gross `VALIDATION` és standalone finalize elutasítása. Külön aktív
tag JWT-je más creator ajánlatára `NOT_FOUND`; visszavont tagságú Auth user
list/mentés kísérlete `FORBIDDEN` lett.

Meglévő project action regressziója: approved takeoff-forrással draft és V2
mentés PASS; accepted project quotation módosítása tiltott. A produkciós action
utak SSR sessiont használtak; privileged client csak a lokális DEMO Auth és
katalógus-fixtúrák létrehozásához kellett. Az ideiglenes acceptance route és
fixture script eltávolítva. A tesztadatok a helyi DB-ben maradnak.

Ellenőrzések: fókuszált Vitest 3 fájl/10 teszt, `npm run typecheck`,
`npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check`
PASS. A build által generált `next-env.d.ts` útvonalváltást visszaállítottam az
e kör előtti, már módosított tartalomra; az előzetes munkafa-eltérést megőriztem.

**VERIFIED DATABASE:** a fenti 1a eredmények. **VERIFIED APPLICATION:** a
Server Action/Auth/session és projekt regressziók fent. **NOT YET IMPLEMENTED
IN FRONTEND:** standalone ajánlatszerkesztő és PDF. **NOT YET BROWSER VERIFIED:**
termék quotation UI nincs, ezért azt nem lehetett tesztelni; browser smoke csak
az ideiglenes action fixture-re történt. VAT engine, standalone finalize és
implicit project handoff nincs implementálva.

Javasolt commit: `fix(F9.7.6.6.1b): verify standalone quotation actions`.

## F9.7.6.6.2 — standalone quotation frontend

Állapot: **PARTIAL — a standalone áttekintő és szerkesztő implementálva; a
hitelesített end-to-end browser workflow még nincs igazolva.** A globális
`/ajanlatok` oldal új önálló ajánlat gombot, creator-scoped standalone draft
listát és RLS-szel látható projektajánlat listát ad. Az overview mindkét scope
esetén jelzi a 100 soros határt. Az `/ajanlatok/uj` önálló szerkesztőt nyit,
az `/ajanlatok/[quotationId]` pedig aktuális vagy immutable történeti
revíziót jelenít meg.

Újrahasznosított architektúra: F9.7.6.6.1 standalone Server Actionök, trusted
katalógus-feloldás, auth/org helper, owner-szűrt RPC/RLS, expected-version és
idempotency contract; a projektajánlat route/action/editor/PDF útvonal
változatlan. A session recovery meglévő quotation helperére épül. Kézi
MATERIAL, LABOR és OTHER tételek, katalógusvariáns, ellenőrzött nettó HUF ár,
kézi ár-felülírás, stabil kliensoldali sor-azonosító és sorrendmódosítás
támogatott. Történeti revízió kiválasztása olvasási művelet; standalone
véglegesítés/elfogadás/ÁFA/hivatalos PDF/kivitelezési terv vezérlő nincs.

Adatkonzisztencia/jogosultság: a UI nem küld creator vagy projektadatot;
standalone mentés a meglévő auth és aktív szervezeti tagság ellenőrzésű
action/RPC-n át fut. A katalógusárat a meglévő trusted action validálja, a
mentett pénzügyi eredmény szerver oldali HUF nettó subtotal. A kliensbecslés
explicit nem mentett becslésként szerepel. Revízió snapshotja nem módosítható.

Ellenőrzés: `npx vitest run
src/features/quotations/standalone-quotation-ui-state.test.ts
src/features/quotations/quotation-draft-recovery.test.ts
src/domain/quotations/standalone.test.ts src/domain/quotations/money.test.ts
src/lib/secure-uuid.test.ts` — 5 fájl / 18 PASS. `npm run typecheck` és
`npm run lint` PASS. Végső `npm run build` és `git diff --check` PASS.
DB/pgTAP/concurrency nem futott újra, quotation backend contract nem
változott. A történetlista csak igazolt standalone quotation azonosítóhoz ad
revíziót. Browser create/reopen/V1–V2/history és project regresszió
**UNVERIFIED**.

Korlát: overview scope-onként maximum 100 sort mutat és a korlátot közli;
további lapozás nincs bekötve. Böngészőn ellenőrizendő a catalog picker,
HTTP-LAN secure UUID runtime, mobil billentyűzet és a teljes Server Action
workflow.

### F9.7.6.6.2a — standalone quotation E2E acceptance

Állapot: **PARTIAL — a teljes authenticated browser acceptance nem bizonyított.**
2026-10-14-én az aktív helyi, hitelesített DEMO sessionben a `/ajanlatok`
betöltött; az üres standalone lista és a meglévő projektajánlatok listája
látható volt. Az „Új árajánlat” link az `/ajanlatok/uj` editorra navigált,
ahol a csak-piszkozat státusz és nettó HUF tájékoztató megjelent. A korábbi
helyi, nem mentett recovery-t elvetettük. Mielőtt az első új DEMO ajánlat
elmentésére sor került volna, a Brave fókusza másik privát ablakra váltott,
egy Google belépési kihívással; a TetőPro ablak visszaválasztása közben az app
újra fókuszt váltott. A belépési kihívást nem kezeltük és hitelesítést nem
kerültünk meg. Nem ismert, hogy az editor mezőibe írási próbálkozás befejeződött-e;
quote vagy revízió mentését nem állítjuk.

Nem bizonyított: V1 mentés/visszaadott ID, reload és újranyitás, anyag- és
munkadíjtételek tartóssága, katalógussor, szerverösszeg, V2, történeti V1,
globális listába visszatérés, projektajánlat megnyitása, konfliktus/pending
viselkedés. Kódhiba nem reprodukálódott, ezért kódmódosítás nem történt;
statikus ellenőrzéseket és backend teszteket nem futtattunk újra. Nincs új
adatbázis-változás.

Javasolt acceptance: nyissuk meg újra a meglévő authenticated helyi DEMO
sessiont, és egyetlen, `DEMO F9.7.6.6.2a E2E` nevű drafton hajtsuk végre a
V1 → reload → V2 → V1 read-only → V2 workflow-t; a kézi ár fiktív DEMO adat,
nettó HUF-ként legyen jelölve.

Javasolt commit: `test(F9.7.6.6.2a): document standalone browser acceptance`.

Javasolt commit: `feat(F9.7.6.6.2): add standalone quotation editor`.

## F9.7.6.6.3.1 — standalone véglegesítés és PDF architektúra

Állapot: **COMPLETE (DESIGN)**. Az aktuális projekt PDF renderer, project
`finalize_quotation`, lifecycle statusok, quotation/revision snapshot, org és
client séma alapján elkészült a végrehajtható F9.7.6.6.3.2 terv a
`docs/QUOTATION_FINALIZATION_DESIGN.md` fájlban. A terv közös React-PDF
renderert, immutable standalone issuance snapshotot, owner/org/scope védett,
expected-version és idempotens finalize RPC-t, valamint on-demand,
`private/no-store` PDF route-ot javasol; a projektútvonal változatlan marad.

Bizonyított: a jelenlegi scope-kötött draft, immutable revision, HUF net/gross
class, server-side `NUMERIC(20,2)` half-up line totals, project finalized
revision pointer és private PDF route. Nem létezik tax rate/category/amount,
issuer address/tax identity, standalone recipient snapshot, human quotation
number vagy validity mező. A `net/gross` nem tax treatment; tax profile és
kiállíthatóság addig blokkolt, amíg könyvelő/adótanácsadó nem erősíti meg a
szabályt. Sem kód, sem migráció, sem PDF/finalize viselkedés nem változott.

Ellenőrzés: releváns workflow/database/progress/test docs, F8.1/F8.3.1/F8.3.2
migráció, Server Action, React-PDF document/adapter és PDF route célzott
ellenőrzése; `git diff --check` PASS. Vitest, typecheck, lint, build, pgTAP,
browser nem futott (docs-only). Nyitott döntés: kibocsátói és címzettminimum,
adóprofil és kerekítés, ajánlatszámozás, érvényességi policy, byte-pontos PDF
archiválási elvárás.

Javasolt commit: `docs(F9.7.6.6.3.1): design standalone quotation issuance`.

## F9.7.6.6.3.2a — quotation document data & issuance foundation

Állapot: **COMPLETE (DOCUMENT FOUNDATION)**. A `20261014040000` additív,
helyi migrációban organization-scoped kibocsátói név/cím/elérhetőség/adóazonosító
mezők és a jövőbeli kiállítási számlálótábla készültek. A draft mentési RPC
server-derived issuer snapshotot, kézi vagy same-org ügyfélből származó
címzett-snapshotot és opcionális referencia/lejárat/megjegyzés/feltétel adatot
ment az immutable revision `input_snapshot.document` mezőjébe. A régi RPC
aláírás delegáló wrapperrel megmaradt. A standalone editorban owner/admin
kibocsátói profil-módosítás, recipient forrásválasztás, dokumentum-adatok és
hitelesített szerveroldali readiness ellenőrzés érhető el; nincs finalize/PDF.

Adatkonzisztencia/jogosultság: issuer oszlopgrant + meglévő owner/admin RLS;
ügyfél részletei kizárólag azonos szervezetből szerveroldalon olvashatók;
kézi címzett nincs `clients` rekordként létrehozva. Issuer és ügyfél módosítása
nem ír át régi revision snapshotot. A sequences táblához auth direct grant
nincs, és draft mentés nem allokál számot. A `canIssue` mindig false; az adó,
finalizálás és számkiosztás konkrét blokkoló marad.

Ellenőrzés: local Supabase migration up 040000/040100/040200 reset nélkül;
célzott 018 + 019 pgTAP 62/62 PASS; `verify-quotation-document-auth.mjs`
helyi valódi Auth 9/9 PASS; érintett Vitest 6 fájl / 25 teszt PASS; typecheck,
lint, Next.js 16.4 webpack build és `git diff --check` PASS. Egy authenticated
Brave smoke-ban a `/ajanlatok/uj` útvonalon mentett `DEMO F9.7.6.6.3.2a UI alap`
V1 azonosítója `ea895051-f0b0-4e21-a833-f40c8a001703` lett; reload után a kézi
címzett és megjegyzés megmaradt, az ajánlat a globális listában látszott, és egy
meglévő projektajánlat szerkesztője is megnyílt. A szerveroldali readiness
ellenőrzés visszajelzett; kiállíthatóságot nem állított. Hosted Supabase, reset,
commit, push és deploy nem történt.

Ismert határ: a 100 elemű recipient selector nem lapoz; nagy ügyfélállományban
bővítendő. A dokumentumszámláló csak szervezetenkénti állapotmező; atomikus
kiállítási művelet, egyedi issuance-szám és stabil issuance rekord még nincs.
Az adókezelés, jogilag kötelező mezők és végleges PDF továbbra is nyitott.

Javasolt commit: `feat(F9.7.6.6.3.2a): persist quotation document snapshots`.

## F9.7.6.6.3.2b — pénzügyi contract, adóalap és kiállítási readiness

Állapot: **COMPLETE (FINANCIAL FOUNDATION)**. A blueprinthez és a designhoz
ellenőrzött dokumentációban nincs könyvelő/adótanácsadó által jóváhagyott
tax-treatment. Ezért nincs kulcs, AAM, fordított adózás vagy mentességszámítás;
az adókezelés explicit unresolved, ismeretlen treatment ID unsupported.

Új lokális `20261014040300` migráció adta a `quotation_revisions` új
`financial_contract` JSONB oszlopát. INSERT trigger a szerveroldali HUF
`price_class`/subtotal alapján rögzíti a source versiont, NET/GROSS input
árbesorolást, besorolástól függő összeget, null tax/null payable mezőt és a
meglévő 6 quantity / 2 HUF scale, line half-up szabályt. Nincs történeti
backfill; meglévő immutability és standalone/project lifecycle RPC-k változatlanok.
Issuer adóazonosító mező továbbra is leíró; nincs tax-default vagy UI-ban
választható, nem végrehajtható mód.

A domain bigint contract megtartja a NET összeget, GROSS inputból nem származtat
NET-et/adót; readiness hitelesített creator + org + standalone quote current
revision, mentett dokumentumsnapshot, line completeness és subtotal egyezést
ellenőriz. Mindenképp `canIssue: false`; tax, sorszám és finalization blocker.
Draft mentés működik, draft/readiness nem incrementál számlálót. Nincs új issuer
adókonfigurációs írható útvonal, SECURITY DEFINER finalize vagy kiadott PDF.

Bizonyíték: lokális migráció `20261014040300` reset nélkül; 018 pgTAP 38/38,
019 pgTAP 29/29 és projekt lifecycle 003+004 pgTAP 19/19 PASS; local Auth JWT issuer owner/member, creator scope,
immutable revisions, no-number checks 9/9 PASS; érintett Vitest 4 fájl/21 teszt
PASS; typecheck, lint, Next 16.4 webpack production build, diff-check PASS. Egy
browser smoke új standalone editoron magyar readiness blokkolókat mutatott, majd
server readiness action elvégezte az ellenőrzést és mentetlen snapshot blockerrel
zárult; piszkozat mentés látható volt. Teljes regresszió és korábbi project PDF
workflow nem futott újra. A Auth szkript kilenc `DEMO` fixture-t hagy a lokális
DB-ben; hosted DB, reset, commit, push, deploy nem történt.

Nyitott accounting döntések: joghatóság és issuer státusz; támogatott tax
treatment ID-k, paraméterek, kulcs/formula, nettó/bruttó árértelmezés és
kerekítés; kötelező issuer/recipient mezők; treatment időbeli hatálya; emberi
ajánlatszám-formátum és érvényességi szabály. F9.7.6.6.3.2c előtt ezek és
atomikus/idempotens issuance + immutable issue snapshot + number allocation
teszt szükséges. Javasolt commit: `feat(F9.7.6.6.3.2b): add tax-neutral quotation financial contract`.

## F9.7.6.6.3.2c — authenticated standalone draft PDF preview

Állapot: **COMPLETE (DRAFT PDF)**. Új, dinamikus `GET
/api/ajanlatok/[quotationId]/pdf?revision=...` route készít on-demand preview-t
az explicit mentett standalone revisionből. Az auth session, aktív org-tagság,
`created_by` és exact revision read ellenőrzött; owner/org/scope mismatch nem
árulja el a quote létezését. `private, no-store`; nincs service role, storage,
migráció, státusz-/revision-/számlálóírás.

A meglévő `renderQuotationPdf` adapter és Noto Sans/A4/React-PDF infrastruktúra
új standalone-draft ágat kapott. Project `QuotationPdfDocument` és route
változatlan. Saved issuer/recipient/document snapshot, exact revision number,
line `unitPrice`/`lineTotal` és DB subtotal jelenik meg; régi customer/catalog
adat nincs olvasva. Csak HUF/net, financial contract/totals/line összegegyezéssel
renderelhető. Minden oldalon látható draft jelölés és rövid tájékoztatás; nincs
VAT, gross/payable, issue date vagy number. Történeti revízió ID explicit.

Bizonyíték: fókuszált Vitest 2 fájl / 9 teszt PASS (PDF contract/render, route
creator/session/org/revision/cache/hiba esetei); 70 soros tényleges PDF 5 A4
oldal, `pdfinfo` és `pdftotext` igazolta a draft notice-t mind az öt oldalon,
a net labels/tételek/összesen tartalmat, valamint a VAT/gross/payable feliratok
hiányát. Authenticated Brave smoke-ban egy fictional DEMO V1 25 000 HUF net
LABOR sort mentettünk, PDF megnyílt, issuer/recipient/item/totals látszott,
szerkesztőhöz visszatérve továbbra is v1/draft. Editor readiness panelje ezen a
DEMO adaton financial completeness/consistency blokkolót mutatott; PDF backend
ugyanakkor a mentett snapshotot elfogadta és renderelte. Ez eltérő readiness
útvonal korlát; `canIssue` mindenképp false. iPad/iPhone és valós Supabase Auth
route integration nem futott (security route mock + authenticated UI smoke).

Futott: `npx vitest run src/features/quotations/standalone-quotation-pdf.test.ts src/app/api/ajanlatok/standalone-pdf-route.test.ts` 8/8; `npm run lint`,
`npm run typecheck`, `npm run build` (Next.js 16.4 webpack). DB/Auth/pgTAP nem
futott, séma nem változott. `git diff --check` dokumentációval együtt fut még.
Hosted Supabase, reset, commit, push, deploy nem történt.

Fennmarad: issuance `canIssue=false`; adójóváhagyás/engine, atomikus finalize,
hivatalos szám és issued PDF nincs. Readiness/UI összegellenőrzés eltérését
külön vizsgálni kell, mielőtt kiállítási feladat indul. Javasolt commit:
`feat(F9.7.6.6.3.2c): preview saved standalone quotation PDFs`.
## F9.7.7.1 — trapézlemez-fedés mennyiségi előnézet

Állapot: **PARTIAL**. Elkészült a tiszta nyeregtető-fedési
motor, a kézi adatokat használó panel, a projektgeometria-editorba és a globális
standalone nyeregtető-előnézetbe illesztve, valamint a sematikus SVG-rács.
Nem készült mentés, gyártói adatmapping, vágási/rendelési terv vagy statikai
funkció. Célzott domain teszt, typecheck, lint, build és diff check sikeres.
UI-komponens teszt és böngészős smoke nem futott, ezért az acceptance nincs teljesen
bizonyítva. Részletes állapot a TEST_MATRIX-ben.


## F9.7.7.2a — trapézlemez-fedés mentési backend

Állapot: **PARTIAL**. Elkészült a project/standalone save action, current/historical read és authorized list backend; a közös immutable calculation revision modellhez és `calculation_dependencies` táblához csatlakozik. A standalone forrás a normalizált kézi geometria; projektforrás egy konkrét ellenőrzött roof-model revision és hozzárendelt `roof.gable` calculation revision. A TypeScript szerver action újraszámol, a read model pedig visszaolvasáskor ellenőrzi a tárolt outputot. `INVALID` és `UNSUPPORTED` nem menthető, `INCOMPLETE` megkülönböztetett `user_provided` státuszt kap.

Új additív migráció tartalmaz expected-version RPC-t és operation-ID idempotencia-ledgert; a konkurencia és RLS Auth-integráció azonban nincs adatbázisban bizonyítva. További kritikus korlát, hogy a DB RPC nem reprodukálja a covering numerikus képleteket: authenticated direkt RPC hívással az output meghamisítható, ezért a kért DB-határ még nem szerverautoritatív. A migrációlista és local Supabase állapot egyszeri vizsgálata Docker socket permission hibát adott; nem próbáltam resetet vagy ismételt Docker-hozzáférést. Frontend mentés, takeoff, hosted DB, böngésző, valódi kétkapcsolatos concurrency ellenőrzés nem futott.

Célzott Vitest: 2 fájl / 9 teszt PASS (domain és mentési szerződés); `npm run typecheck`, `npm run lint`, `npm run build` és célzott ESLint PASS. Ez nem DB/Auth/regressziós bizonyíték. Következő technikai kapu: formula-duplikáció nélküli authenticated DB boundary megoldás és valódi local pgTAP/Auth/two-connection tesztek; ezt követheti F9.7.7.2b UI.

Javasolt commit: `feat(F9.7.7.2a): persist trapezoidal roof covering revisions`.

## F9.7.7.2a.1 — secure persistence completion

Állapot: **COMPLETE (BACKEND)** a helyi környezetben. A még nem alkalmazott `20261014050000` migrációt a biztonságos írási határral javítottuk, majd helyben alkalmaztuk. A szerveroldali TypeScript számolás után csak a külön DB login hívhatja az író RPC-t; az `authenticated` direkt RPC és covering táblamutáció tiltott. A DB actor tagságot, standalone creatort, projekt orgot és pontos roof revision + roof.gable dependencyt ellenőriz. A meglévő immutable calculation revision modell, expected revision és operation ledger újrahasznosítva.

Bizonyíték: célzott pgTAP 1 fájl / 9 teszt PASS; valós helyi Supabase Auth/RLS integráció 2 teszt PASS, benne szerver action projekt- és standalone mentés, közvetlen hamis numerikus RPC `42501` és nulla hamis rekord, cross-org/creator/revoked tag elutasítás, V1/V2 történet, history mutáció elutasítás, idempotencia. Két külön bejelentkezett DB kapcsolat lock alatt ténylegesen átfedett: egyik V2 mentés sikeres, másik `40001`; azonos operation ID két párhuzamos hívása egy V3-at adott (`reused=false/true`). Domain és érintett workflow Vitest: 6 fájl / 20 teszt PASS. Typecheck, lint, production build és diff-check PASS; a célzott tesztek nem teljes regressziók. Hosted migráció és frontend UI nem része ennek a mérföldkőnek. A helyi teszt DEMO fixture-eket hagyott a helyi DB-ben.

Javasolt commit: `fix(F9.7.7.2a.1): secure covering persistence and verify revisions`.

## F9.7.7.2b — trapézlemez-fedés mentés és revízió UX

Állapot: **COMPLETE (FRONTEND IMPLEMENTATION)**. A közös fedési panel standalone és projekt módban a meglévő, biztonságos Server Actiont használja. Elkészült V1/V2 mentés, URL-alapú újranyitás, projekt tetőmodellhez kapcsolt lista, történeti input/eredmény/SVG, módosítási állapot, revízióváltási figyelmeztetés, elavult forrás és kifejezett legfrissebb tetőrevíziós újraszámítás. A globális `Mentett számításaim` lista a tényleges registry ID-t és szűrőt használja. A forrásválasztás hibáját javítottuk: vegyes dependency-k esetén a `roof.gable` számítást keresi. Az architektúra a meglévő calculation/revision/dependency és creator-scoped RLS modellt használja, közvetlen böngészős DB írás nincs.

Helyi, hitelesített Brave smoke: standalone DEMO V1 mentés, oldalfrissítés, V2 mentés, V1 input/20 db/SVG és V2/40 db visszaváltás, lista/szűrő; projekt DEMO V1 mentés és újratöltés, pontos V4 tetőforrás; nem mentett módosítás figyelmeztetésének megszakítása és visszatöltése PASS. Helyi DB read-only vizsgálat: a projekt snapshot roof revision, dependency upstream roof revision és `roof.gable` calculation revision azonos forrásláncot alkot. iPad/iPhone Safari, valódi hálózati megszakítás és konkurens böngészőmunkamenet UI-ellenőrzése nem futott. Hosted Supabase, migráció, reset, commit, push és deploy nem történt. A fedési anyagkimutatás-átadás és gyártói igazolás későbbi fázis.

Javasolt commit: `feat(F9.7.7.2b): add trapezoidal covering save and revision UX`.

## F9.7.7.3a — projekt fedésből takeoff piszkozat

Állapot: **COMPLETE (TAKEOFF BACKEND)** a támogatott egyszerű kiosztásra. A
hitelesített szerver action a felhasználó által megadott pontos projekt,
fedési calculation/revision és katalógusvariáns alapján a szerver által mentett
snapshotból képez egy új draft takeoffot. A kliens nem ad mennyiséget vagy
snapshotot; a DB transaction ellenőrzi a tagságot, projektet, revisiont,
roof modelt és `roof.gable` függőséget. Az operation ID retry ugyanazt a draftot
és sort adja; payload-eltérés elutasított. Nincs automatikus jóváhagyás vagy
ajánlatkészítés. A source item snapshotja immutable.

Mennyiség: `piece` (db), a mentett teljes lemezszám. Teljes hosszú, egy sor/sík
kiosztás támogatott. A 110 m² példa névleges lemezterülete csak technikai adat,
nem rendelési mennyiség/veszteség. Csak aktív orgbeli `roof_covering` vagy
`sheet_metal` darabárus variáns fogadható; ismert méretek egyeznek, hiányos
variánsméret kézi felhasználói társításként jelölt. Ár nincs hozzárendelve.
Többsoros, toldott/átlapolt vagy kétértelmű darabjegyzék nem támogatott.

Az exact fedési revízió, tetőmodell/revízió, geometry calculation revision,
input/output és katalógussnapshot eltárolódik. Elavult tetőnél a történeti forrás
megmarad, stale állapot látható. Nincs külön takeoff revision tábla a meglévő
sémában; az új átadás új draft takeoff ID, a meglévő approval/version életciklus
használatával.

Helyi additív migráció `20261014060000` reset nélkül alkalmazva. 021 pgTAP
33/33 PASS, beleértve explicit approval utáni idempotens retryt és annak
ellenőrzését, hogy külön átadás új piszkozatot hoz létre, az approved takeoffot
pedig érintetlenül hagyja. Valós helyi Auth/RLS action teszt 3/3 PASS; az unauthorized org,
direct authenticated RPC és historical V1 transfer eseteit ellenőrizte.
Két writer kapcsolat ugyanazon operation key lockjára egyszerre várt; az
eredmény egy takeoff ID és egy item ID, create/reuse `true/false`. Domain,
action, read model és korábbi takeoff regression, typecheck/lint/build/diff
ellenőrzések eredménye a TEST_MATRIX-ben. Frontend választó UI nincs ebben a
feladatban. Hosted DB, reset, commit, push és deploy nem történt.

Javasolt commit: `feat(F9.7.7.3a): create takeoff drafts from saved roof covering`.

## F9.7.7.3b — trapézlemez-fedés anyagkimutatás UX

Állapot: **COMPLETE (LOCAL UX SCOPE).** A projekt
tetőmodell mentett fedési revíziójából megnyitható az új piszkozat megerősítő
ablaka. A felület a kiválasztott pontos fedési és tetőrevíziót, a mentett
darabszámot és méreteket, a források eredetét, a stale állapotot, a kompatibilis
aktív műhely katalógusvariánsokat, azok méretadatait, provenance-át és
ár-elérhetőségét mutatja. Csak `roof_covering`/`sheet_metal`, `piece` variáns
ajánlható fel; ismert méreteltérés nem választható.

Nem mentett tető- vagy fedésmódosításnál a párbeszédablak kimondja, hogy a
kiosztás a mentett revízióból készül, és kifejezett választást kér; a mentési
gombra fókuszáló út is elérhető. A kliens nem számol mennyiséget: a meglévő,
szervezetet, projektet, exact forrásrevíziót és variánst ellenőrző Server Action
kapja meg az azonosítót/nevet/variánst, az adatbázis a mentett snapshotból hozza
létre az új draftot. A biztonságos operation ID kétértelmű hálózati retrykor és
azonos payloadnál megmarad; forrás- vagy választásváltás új műveletet jelent.
Siker után a létrejött takeoff pontos útvonala nyílik meg. Jóváhagyás, ajánlat,
korábbi takeoff módosítása és adatbázisséma-változás nem része a felületnek.

Újrahasznosított architektúra: a 3a action/RPC és takeoff route, a 2b mentett
fedési revision/read model, a meglévő szervezeti RLS katalógusolvasás és a
`generateSecureUuid`. A DB/RLS/action/idempotencia bizonyíték változatlanul a
3a mérföldkőben rögzített helyi teszt; ebben a UI körben DB nem változott.

Ellenőrzés: célzott Vitest 4 fájl / 15 teszt PASS; `npm run typecheck`,
`npm run lint`, `npm run build` és `git diff --check` PASS. Egy helyi hitelesített
workflow-ban a V1 / 26 db / 7000 mm fedésből DEMO `piece` variánssal új draft
keletkezett, a felület a pontos `?takeoff=922e2bd4-e8a9-468f-8a1c-989e12dda677`
takeoff URL-re navigált; a státusz draft, a forrásadat és a hiányzó ár látható.
Az eltérő hosszú, 6500 mm-es DEMO variáns a megerősítő választóban nem jelent meg.
A helyi katalógusban DEMO termék/variáns és egy új DEMO draft maradt. DB/RLS/
idempotencia külön nem futott újra, mert séma nem változott; ezek a 3a bizonyítékai.
Ez nem teljes regresszió. Hosted DB, commit, push és deploy nem történt.

Javasolt commit: `feat(F9.7.7.3b): add covering to takeoff creation UX`.

## F9.7.7.4a — cserepeslemez-fedés motor és előnézet

Állapot: **COMPLETE (ENGINE + PREVIEW)**. Elkészült a tiszta, determinisztikus `roof.gable.metal-tile-covering` számítás domain-regisztrációval; a bemenet a valós `roof.gable` inputot és külön termékadat-snapshotot fogad. A motor kezeli a két azonos tetősík felületét, effective szélességből számított egész oszlopokat, teljes lemezszámot, fizikai lemezből képzett névleges területet, külön effective fedési hosszt, explicit végi ráhagyást, gyártói hosszkorlátot és modulkompatibilitást. Toldott/többsoros vagy elégtelen teljeshosszú kiosztás nem kap darabszámot.

A projekt tetőszerkesztő élő, aktuális `roof.gable` geometriával mutatja az előnézetet, a `/kalkulatorok/cserepeslemez` útvonal pedig kézi tetőinputból ugyanazt a motort használja. A közös felület jelzi a geometriát és termékadat eredetét, a státuszt és a feltételes mennyiséget; a sematikus SVG csak VALID állapotot rajzol, az explicit oszlopokat és modulvonalakat jeleníti meg. A felület nem ment, nem ír DB-t, és nem állít gyártói vagy szerkezeti megfelelőséget.

Bizonyíték: `npx vitest run src/domain/calculations/gable-metal-tile-covering.test.ts src/features/roof-models/gable-metal-tile-covering-preview.test.ts` — 2 fájl / 11 teszt PASS; `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack; `/kalkulatorok/cserepeslemez` route megjelent) és `git diff --check` PASS; a diff csak a célzott motor, preview, navigáció és dokumentáció fájljait érinti. Hitelesített böngészős smoke: UNVERIFIED, a CUA böngészőleltárban nem volt nyitott tab/session, ezért meglévő hitelesített munkafolyamat nem volt elérhető. DB/RLS/pgTAP nem alkalmazható, nincs adatváltozás. Korlát: aszimmetrikus/törött tető, nyílások, több lemezsor, toldás, gyártói/terhelési/telepítési igazolás, mentés és anyagkimutatás nincs támogatva.

Javasolt commit: `feat(F9.7.7.4a): add metal tile covering engine and preview`.

## F9.7.7.4b.1 — cserepeslemez perzisztencia

Állapot: **COMPLETE (BACKEND)**. Az új, `roof.gable.metal-tile-covering` mentési szerződés a meglévő immutable calculation/revision/dependency táblákat és külön idempotencia-ledgert használja. A szerver minden kérést normalizál és újraszámol; csak `VALID` eredmény menthető. Standalone mentés creator-scoped kézi geometriát tárol. Project mentés a kliensgeometriát figyelmen kívül hagyja, és az exact verified roof-model revision, hozzá kötött `roof.gable` calculation/revision és az input snapshot alapján számol. A revision rögzíti a termék- és modulparamétereket, a fizikai/effective lemezhosszt, adatforrását, outputot és provenance-t. Katalógus, gyártói profil, ügyfél vagy ajánlat nem szükséges; név hiányakor a szerver általános kalkulátorcímet ad.

Biztonság: új migráció `20261015050000_gable_metal_tile_covering_persistence.sql` forward-only és reset nélkül alkalmazva a lokális Supabase-en. Új RPC-t csak a meglévő `tetopro_covering_writer` hívhatja, közvetlen táblajog nélkül; `authenticated` direct RPC és írás tiltott. Az RPC actor membershipet, standalone creatort, projektet és exact forrás-dependencyt tranzakcióban ellenőriz; a shared revision immutability változatlan. A műveleti ledger és expected-revision lock az idempotens retryt és versengő módosítást rendezi.

Ellenőrzés: `npx supabase test db --local supabase/tests/database/022_gable_metal_tile_covering.sql` — 1 fájl / 12 teszt PASS. `RUN_LOCAL_METAL_TILE_TESTS=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run src/domain/calculations/gable-metal-tile-covering.test.ts src/features/roof-models/gable-metal-tile-covering-preview.test.ts src/features/roof-models/gable-metal-tile-covering-persistence.test.ts src/features/roof-models/gable-metal-tile-covering.local.integration.test.ts` — 4 fájl / 18 teszt PASS; benne valódi helyi Auth/RLS és két külön PostgreSQL kapcsolatos konkurenciateszt. Egy első integrációs futás egy túl szigorú RLS UPDATE assertiont talált; javítás után az integráció 3/3 és az összesített suite 18/18 PASS. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Hosted DB, reset, frontend UX, commit, push, deploy nem futott. A random azonosítós, DEMO tesztfixture-k a helyi adatbázisban maradtak.

Javasolt commit: `feat(F9.7.7.4b.1): persist metal tile covering revisions`.

## F9.7.7.4b.2 — cserepeslemez mentési és revíziós UX

Állapot: **COMPLETE (FRONTEND IMPLEMENTATION)**. A meglévő panelhez calculation ID-s standalone újranyitás, mentett számításlistás szűrés/link, immutable V1/V2 előzményválasztó, aktuális revízióra visszalépés, stale projektforrás-jelzés, explicit aktuális forrásválasztás és nem mentett standalone kilépési figyelmeztetés készült. A kötelező fedési hossz, eresz-/gerincvégi ráhagyás és átlapolás jól jelzett adat; csak a határértékek és modulparaméterek kerültek a részletek közé. A mentés az authenticated Server Actiont használja.

Ellenőrzés: 5 célzott preview Vitest PASS (revízió saját geometriája/eredménye/SVG-je és változatlan operation ID retry); typecheck, lint, Next.js 16.4.0 production build és `git diff --check` PASS. Valós local Auth munkamenetben standalone V1 → reload → V2 → V1 → V2 és mentett lista → direkt újranyitás PASS. Projekt tetőmodellhez V1/V2 mentés, reload, V1 történeti visszaolvasás PASS; read-only DB ellenőrzés igazolta a `roofModelRevisionId` exact mentett forrását, V2 hasznos szélességét és szerveroldali 28-as darabszámát. Backend/RLS/concurrency nem változott; a 4b.1 valós local Auth/RLS és két PostgreSQL-kapcsolatos bizonyítéka érvényes, DB suite nem futott újra. Külön iPad/iPhone QA nem futott. Helyi DEMO rekordok maradtak.

Javasolt commit: `feat(F9.7.7.4b.2): simplify metal tile save and revisions`.

## F9.7.7.4c.1 — cserepeslemez → anyagkimutatás backend

Állapot: **COMPLETE (TAKEOFF BACKEND)**. A projekt cserepeslemez mentett revíziójából új takeoff draft készül a meglévő trapézlemez restricted-writer/lifecycle mintáján. A transfer validator az exact source snapshotot a TypeScript motorral újraszámolja; az RPC külön ellenőrzi project/org tagságot, saved source/dependencyt, teljes egysoros darabszámot, fizikai/effective méretet, katalógusegyezést és modul-szerződést. A `piece` mennyiség `totalSheetCount`; area-to-piece átváltás nincs. Az item snapshot immutable, ár/approval automatikus hozzárendelése nincs. A takeoff read model részletezi a hosszak, modulok és provenance adatait; új UI nem készült.

Bizonyíték: `20261015060000_gable_metal_tile_takeoff_draft.sql` reset nélkül alkalmazva a helyi Supabase-en. A `022_gable_metal_tile_takeoff.sql` 33/33 és a meglévő `021_gable_covering_takeoff.sql` 33/33 pgTAP assertion PASS; a két független DB-kapcsolatos race 1 create + 1 retry/reuse eredményt és 28 db-ot adott. 5 célzott Vitest fájl / 22 teszt PASS. Typecheck, lint, production build és `git diff --check` PASS. A race teszt a korábban létrehozott helyi projektforrást használja; pgTAP valós local Auth subject/RLS role-t vizsgál. Hosted, reset, commit/push/deploy nem történt.

Korlát: anyagkimutatás UX, standalone → projekt konverzió, több sor/toldás, gyártói kompatibilitási tanúsítás és ár továbbra sincs. A helyi DB-ben a pgTAP fixture-ek tranzakciója rollbackelt; a kétkapcsolatos teszt DEMO katalógusadatát és draftját eltávolította.

Javasolt commit: `feat(F9.7.7.4c.1): transfer metal tile sheets to takeoffs`.

## F9.7.7.4c.2 — cserepeslemez takeoff egyszerűsített UX

Állapot: **COMPLETE (TAKEOFF FRONTEND)**. A projekt cserepeslemez-előnézetéből egy művelettel nyitható draft-készítő párbeszéd készült. Megjeleníti a mentett forrásrevisiont, a szerveroldali mennyiséget, lemezméreteket, moduladatot, termékeredetet és ár-elérhetőséget. Mentetlen tetőgeometriánál explicit megerősítést kér a mentett snapshot használatára. Az aktív `piece` termékvariánsok szűrése az ismert szélesség-, hossz- és moduladatokat veti össze. A meglévő transfer Server Action ment, siker után megnyitja a projekt anyagkimutatását. Az ár nélküli és nem gyártó által igazolt DEMO provenance látható marad; a draft nem kap automatikus jóváhagyást.

Bizonyíték: célzott Vitest 5 fájl / 19 teszt PASS, benne trapéz UI regresszió, exact forrásrevision, darabszám, termékkompatibilitás, retry ID és dialogtartalom. `npm run typecheck`, `npm run lint`, `npm run build` (Next.js 16.4.0 webpack) és `git diff --check` PASS. Hitelesített helyi böngészőben a projekt `1340d579-d1b1-496c-a3c5-1f7e75019413` fedési V2 revisionje (`15d60e59-b0a9-461d-92e0-3111ba3bff4d`) exact roof V4 (`d11e0843-91bb-4089-b245-ad0879fbfb4b`) alapján 28 db-ot mutatott; az ár nélküli DEMO variánssal draft `2dc9db5c-ba1a-40dc-af91-927cffc04b25` jött létre és megnyílt a takeoff oldalon. A helyi DEMO termék/variáns és draft megmaradt. A backend nem változott, ezért a 4c.1 valós local Auth/RLS és két DB-kapcsolatos bizonyítékát használjuk; hosted DB, reset, commit, push, deploy nem futott.

Javasolt commit: `feat(F9.7.7.4c.2): simplify metal tile takeoff UX`.

## F9.7.8.1 — helyszíni felmérés MVP

Állapot: **COMPLETE (FIELD SURVEY MVP; LOCAL AUTH/RLS + BROWSER)**. Elkészült a
standalone vagy opcionálisan projekthez kötött felmérés lista, új felmérés és
újranyitható szerkesztője. A négy kezdő munkatípushoz szerkeszthető mérési
sablonok vannak; több sor, explicit egység, opcionális megjegyzés és nagy,
mobilra tördelődő vezérlők használhatók. A mentés V1/V2 verziózást alkalmaz,
dupla küldést blokkol, dirty állapotot és mentési/hibajelzést mutat, stale
mentésnél pedig konfliktust jelez. A projekt egy mentés után immutable link.
Mérési adatok nem lesznek automatikusan kalkulátoradatok.

Biztonság: a `20261015070000_field_surveys.sql` migrációt helyi Supabase-re
reset nélkül alkalmaztam. A felhasználói szerep csak RLS-szűrt SELECT-et kap;
írás kizárólag a `save_field_survey` RPC-n keresztül, actor/org/project és
szerveroldali mérésegység-validációval történik. Standalone hozzáférés creator
scope-os, projektre szervezeti tagság szükséges. Várható verzióval a párhuzamos
szerkesztés stale írását visszautasítjuk.

Bizonyíték: local pgTAP `023_field_surveys.sql` 24/24; két külön DB sessionből
végrehajtott versenyben 1 update sikerült és 1 stale konfliktust kapott.
Önálló authenticated Brave smoke: `93b3e45b-f86b-433e-a01e-16727d9c64e9`,
V1 → refresh/reopen → edit → V2, majd refresh; 9.1 m, 4.2 m és DEMO megjegyzés
megmaradt. Projekt smoke: `dd2f7790-0ed6-460e-8ba5-4371a91d7742`, projekt
`1340d579-d1b1-496c-a3c5-1f7e75019413`, V1 után refresh/reopen; 6.8 m,
3.4 m és DEMO megjegyzés megmaradt, a kapcsolt projekt látható. A Vitest,
typecheck, lint és webpack production build eredményét a tesztmátrix rögzíti.

Korlát: fizikai iPhone/iPad vizsgálat, kamera/fotó, offline működés, kalkulátor-
átadás és hosted Supabase nem része/ellenőrzése ennek a mérföldkőnek. Helyi DEMO
felmérések megmaradtak. Javasolt commit: `feat(F9.7.8.1): add field survey MVP`.

## F9.7.8.2 — felmérési fotók és kalkulátor-átadás

Állapot: **COMPLETE (FIELD SURVEY PHOTOS & HANDOFF, LOCAL)**. Elkészült a
privát, többképes feltöltés opcionális leírással, előnézettel, újrapróbálással
és visszavonható eltávolítással. A fotóműveletek immutable survey revisiont
hoznak létre, a korábbi fotóhivatkozás megmarad. A felmérésből kézi
megfeleltetéssel nyitható a meglévő eresz-, nyeregtető- és szegélykalkulátor;
csak szemantikai típus/egység alapján ad át adatot, üres mezőt nem tölt ki
feltételezéssel. Forrásfelmérés és verzió jelölve, az eredeti felmérés
változatlan.

Biztonság: négy előrehaladó, helyi migráció reset nélkül; privát Storage
bucket, creator-scope standalone és aktív tagságú projekt-hozzáférés, RLS,
korlátozott restricted-writer RPC-k, fájlsignatúra és méretellenőrzés,
expected-version konfliktus. A közvetlen kliens-metaadatírás és író RPC
hívás tiltott. A tárolási INSERT policy a helyi Supabase metadata-context
eltérés miatt a szerveroldali pending foglalást és actor/survey/org kapcsolatot
ellenőrzi; MIME/méret ellenőrzés a bucket és API feladata.

Bizonyíték: `024_field_survey_photos_handoff.sql` + `023_field_surveys.sql`
55/55 pgTAP PASS; két független DB-session versenyben egy update és egy stale
konfliktus. Fókuszált Vitest 6 fájl/27 teszt PASS; typecheck, lint, production
build és diff-check PASS. Hitelesített helyi böngésző: eresz DEMO V1→V5,
fotófeltöltés és frissítés utáni visszaolvasás, mentett V2 adatból 3 ereszszál;
tető DEMO V1-ből 100 m² és 36,87°. Cross-org GET 403. Hibás PNG-tartalom
elutasított. Egy eltávolított fotó revision-története megmaradt.

Korlát: legacy survey-k korábbi historyja nem rekonstruálható; HEIC nincs
támogatva (JPEG/PNG/WebP, max 10 MB). Fizikai iPhone/iPad QA és hosted DB nem
futott. DEMO Auth és survey adatok, valamint lokális képek megmaradtak; hosted,
reset, commit/push/deploy nem történt. Javasolt commit:
`feat(F9.7.8.2): add survey photos and calculator handoff`.

## F9.7.8.3 — helyszíni felmérés mobil használhatósága

Állapot: **COMPLETE (MOBILE READINESS IMPLEMENTATION, LOCAL)**. A mobil űrlap
érintésre méretezett mezőket, numerikus billentyűzetet, magyar tizedesvesszőt,
összecsukott opcionális részleteket és jól látható mentést kapott. A fotópanel
feltöltési állapotot, várakozó fájlokat, újrapróbálást és elvetést mutat; a
mentetlen mérések és folyamatban lévő műveletek navigációja védett. A korábbi
felmérésverzió saját mérését, megjegyzését és fotóját jeleníti meg, pontos
verziójú kalkulátorátadással. A JPEG/PNG/WebP képet a szerver valódi tartalom
alapján dekódolja és EXIF nélkül újrakódolja, legfeljebb 40 megapixel és
10 MB tárolt méret mellett. A helyi Sharp nem dekódol iPhone HEIC-et;
az alkalmazás ezt elutasítja, és JPEG-exportot javasol.

A `20261015110000_field_survey_save_retry.sql` előremenő helyi migráció
stabil, kliens által választott UUID-t és azonos tartalmú V1/V2 válaszvesztés
utáni idempotens ismétlést ad. Eltérő payloadra megmarad a konfliktus.
RLS, privát Storage és restricted writer változatlan.

Bizonyíték: `023`–`025` helyi pgTAP 68/68; két független DB-kapcsolatos
konkurenciateszt PASS. Fókuszált Vitest 10 fájl/42 teszt, typecheck, lint,
production build és diff-check PASS. Hitelesített helyi Brave DevTools
iPhone 16 Pro Max 440×956: standalone DEMO felmérés
`2a4b7f08-4218-44d8-b52a-3d256599a171`, V1 8,7 m, JPEG V2, reload,
9,1 m-es V3, reload, V3 kalkulátorátadás 9100 mm; iPad Mini 768×1024
kalkulátornézet. Egy korábbi DEMO felmérés V2-ben képet, V3-ban üres
fotóállapotot mutatott. Fizikai Safari/iPhone/iPad: **UNVERIFIED**.
Kézi elfogadás: valódi iPhone-on JPEG kamerakép, HEIC útmutatás, megszakított
mobiladat-feltöltés/újrapróbálás és V1/V2 fotóváltás; iPaden szerkesztés és
kalkulátorátadás. Offline működés és hosted Supabase nem ellenőrzött.
Javasolt commit: `feat(F9.7.8.3): harden mobile field surveys`.

## F9.7.9 — egységes helyszíni felmérési munkafelület

Állapot: **COMPLETE (UNIFIED SURVEY WORKSPACE, LOCAL)**.

Megvalósult: kiemelt Új felmérés és legutóbbi felmérések a dashboardon;
egyazon survey alatt több elnevezhető/rendezhető/eltávolítható tető-, eresz-,
szegély- és egyéb munkaszakasz. Szakaszonkénti mérések, megjegyzések,
engedélyezett fotókapcsolatok, kitöltetlen értékek veszteségmentes mentése.
A helybeni kalkulátorpanel az adott pontos survey snapshotot használja;
átvett/kézzel módosított érték, hiányzó adat, előnézet és mentett eredmény
megkülönböztetett. Az összesítő lezárás nélkül elérhető, ismert egységű
mentett eredményeket, régi forrást és hiányokat mutat. Projekt és ajánlat
külön vagy együtt választható, meglévő jogosult projekt is kapcsolható.
A projekt nélküli ajánlat tényleges standalone DRAFT, a közös út projekt-DRAFT.
Üres projektajánlat a szerkesztőben sem mutat megtévesztő 0 HUF összesítést.

Újrahasznosítás: eredeti survey/fotó/immutable revision; meglévő
gutter/flashing/roof.gable/trapézlemez/cserepeslemez motorok, kalkulátor-
komponensek és secure save actionök; eredeti projektmodell, standalone és
projekt quotation RPC-k és szerkesztők. Nincs párhuzamos kalkulátor-,
pénzügyi vagy ajánlatszerkesztő-architektúra és nincs mesterséges tetőmodell.
A geometria önállóan előnézet marad; a támogatott fedési eredmény menthető.

Adatkonzisztencia/jogosultság: forward-only nullable `sections` bővítés;
legacy és history nincs átírva. A flat mérések és szakaszok egyezése constraint.
Exact calculation revision és explicit append-only followup kapcsolatok;
original survey/project ownership változatlan, régi eredmény nem frissül
csendben. Creator-scope, aktív tagság, cross-org izoláció, forrásrevízió-párok,
privilegizált írás tiltása helyben bizonyított. Survey sorzár és természetes
idempotencia akadályozza a dupla projekt/ajánlat/link létrehozást. A projekt
sikerét későbbi ajánlathiba nem törli; az action részleges eredményt ad és
ismételve folytatja. Session-szintű user/org/survey draft recovery, pending/
error/conflict kezelés; fotólista nem emeli csendben az expected versiont.

Bizonyíték: célzott regresszió 44 fájl/196 PASS; utolsó érintett futás
9 fájl/38 PASS. Külön opt-in valós helyi Auth/Storage/action/read-model
integráció 3/3 PASS; végleges új pgTAP 41/41 és 223 változatlan DB-regressziós
assertion PASS. Öt monitorral igazolt kétkapcsolatos lock contention PASS.
Typecheck, lint, production build és diff-check PASS. Egy hitelesített helyi
Brave workflow több szakasz, reload, ereszszámítás mentés/link, összesítő,
projekt+ajánlat, retry és ajánlat-újranyitás; Back utáni 11 m draft recovery,
V2 szerkesztés és régi V1 számítás/ajánlat megőrzés. A konkrét rekordokat
SQL-lel is visszaolvastuk; azonosítók és pontos parancsok a TEST_MATRIX-ben.

Korlátok: ez célzott, helyi elfogadás; teljes repóregresszió, fizikai mobil,
Safari és hosted környezet nem ellenőrzött. Nincs automatikus pénzügyi vagy
anyagtétel-import mérésből, önálló geometriarevízió-mentés, offline sync vagy
ajánlatkiállítás. Ezek elkülönített támogatási határok. A helyi DEMO fixture-ek
megmaradtak. Hosted módosítás, reset, commit, push, deploy nem történt;
`.DS_Store` érintetlen.

Következő ajánlás: fizikai iPhone/iPad helyszíni próba JPEG-feltöltéssel,
megszakított hálózattal és a két fedési kalkulátor felhasználói elfogadásával.
Javasolt commit: `feat(F9.7.9): unify field survey workspace`.

## F9.7.10 — valós helyszíni munkafolyamat és mobil UX

Állapot: **COMPLETE (LOCAL WORKFLOW HARDENING)**; fizikai iPhone/iPad elfogadás külön **UNVERIFIED**.

Hitelesített, helyi Brave production workflow: fiktív **DEMO** tetőfelújítás; tető 10×6 m és 4 m emelkedés, eresz 8,5 m/4000 mm-es választott szál, szegély 10 m, privát DEMO PNG. A tetőkalkulátor a hiányzó három túlnyúlást jelezte; eredményt nem találtunk ki. A helybeni ereszbecslés 3 szálat adott; a szegélybecslésnél a 2000 mm kézi DEMO szálhossz mellett ismeretlen toldási kapcsolat miatt darabszám nélkül, figyelmeztetéssel mentettünk. Mindkét számítás újranyílt. Az összesítőből projekt és üres, ár nélküli projektajánlat-piszkozat jött létre, újranyílt, majd frissítés után is megmaradt. A tető 11 m-es V4 módosítása után a számítások és followupok változatlanul a pontos V3 forráshoz kötődtek. SQL-visszaolvasás: felmérés `185aa689-134e-4852-988b-3a7a67abe5c6`, V3 revízió `d79571ee-2ca2-4d68-9d9b-22853baefdca`; eresz `a867e8dd-0fd3-4d6e-99b5-1e8f02e8bb14`, szegély `e64a4ff1-fd6f-49ae-89e3-3452f472c9dc`; projekt `4f56501f-a8ba-432e-9b8e-e4369fe6165c`, ajánlat `23617226-2c02-47d5-ad9d-d365f1ae6d14`, 0 tétel és `subtotal=null`. Ismételt létrehozási kattintás után is 1 projekt/1 ajánlat maradt.

Megfigyelt és javított UX: a szegélysablon első, irreleváns üres szélességmérése helyett a szakaszhossz indul; az új szakasz egy kattintással felvehető, a mérésérték előtérben, a ritka beállítások csukva. Az üres opcionális kalkulátorrészek nem fedik el a fő bemenetet. A fotó feltöltés után automatikusan az aktív szakaszhoz jelölődik, külön mentési CTA mutatja a tényleges kapcsolási lépést, és a kis fájl mérete olvasható. Az összesítő közvetlen újranyitást ad, az exact forrásazonosítók részletekben maradnak, elkészült projekt/ajánlat esetén nincs ismételt létrehozási választó. Reprodukált első mentés utáni tetőre ugrás: a `section` URL-paraméter javításával a szegély aktív maradt az új DEMO V1 mentés és reload után. Reprodukált V1 utáni nem mentett draftvesztés: a recovery kulcs most a tényleges mentett survey ID-hoz kötődik; böngészős reload után a 11 m visszaállítható volt.

Meglévő survey/fotó/immutable revision, kalkulátormotorok, projekt/ajánlat actionök, RLS és idempotencia újrahasznosítva; DB-séma és backend szerződés nem változott. Az új DEMO szegély-felmérés `872e7a5e-fbdd-4e9e-a571-9f2c9274752a` V1→V3 útján a fotófeltöltés V2-je után a kapcsolási CTA V3-at mentett; reload a szegélyt és 1 fotót mutatott. A nem mentett kalkulátor bezárása figyelmeztetett. Mobil Brave-emuláció: iPhone SE 375×667, iPad Mini portré 768×1024 és tájkép 1024×768, asztali 932 px; oldalszélesség = viewport. Az iPhone SVG 720 px-es rajza 267 px-es saját görgetőben maradt. Érintő célok és mentés/fotófeltöltés iPhone-on 52–53 px; összesítő és kapcsolt akciók láthatók. Ez Chromium-emuláció, nem fizikai Safari.

Fókuszált Vitest 10 fájl/44 PASS, lint, production build, külön typecheck és diff-check PASS; pontos parancsok a TEST_MATRIX-ban. Auth/RLS/konkurencia szerződés változatlan, ezért a F9.7.9 bizonyítékát hivatkozzuk, nem nevezzük új futásnak. Brave offline mód mellett egy fotó POST-ja hálózati hibával megszakadt, a kép sorban maradt és az újrapróbálás gomb megjelent. Visszakapcsolt hálózaton a retry egyetlen új JPEG-et töltött fel (V4), a kapcsolási CTA V5-öt mentett; reload után a szegély és mindkét kép megmaradt. A nyers angol `Failed to fetch` helyett magyar, teendőt jelző hibaüzenet jelent meg a friss production build külön böngészős offline próbájában is; a várakozó kép elvetése után figyelmeztetés nélküli reload megőrizte V5-öt. Fizikai billentyűzet/kamera és helyszíni elfogadás nyitott.

Fizikai iPhone/iPad checklist: Safari portré/tájkép navigáció és érintőcélok; magyar tizedesvessző és numerikus billentyűzet fel-le; kamera JPEG feltöltés, kapcsolás és reload; mobiladat-megszakítás/újrapróbálás; SVG vízszintes görgetés, sticky mentés; összesítőből projekt/ajánlat és mentett számítás újranyitása. Hosted változtatás, reset, commit, push, deploy nem történt; `.DS_Store` érintetlen. Javasolt commit: `fix(F9.7.10): harden mobile field survey workflow`.

## F9.8 — anyagkimutatás és ajánlat-előkészítés

Állapot: **COMPLETE (LOCAL WORKFLOW HARDENING)**. A kijelölt, jóváhagyott
anyagkimutatások kompatibilis tételei pontos decimális összegzéssel kerülnek
a meglévő ajánlatpiszkozatba. Méret, termékváltozat, egység vagy specifikáció
eltérése külön sort tart; ismétlődő forrástétel nem dupláz. Az ár eredetét,
hiányát vagy keveredését a felület jelzi; hiányzó árhoz nem készül összeg.
Revízió- és forrás-snapshot változatlanul visszakövethető. Szerveroldali
ellenőrzés érvényesíti a jóváhagyást, projektet, mennyiséget és forrásokat.
Az ajánlatlétrehozás műveletkulcsa idempotens; azonos kulcsú eltérő tartalom
konfliktus.

Hitelesített helyi DEMO workflow: jóváhagyott Anyagkimutatás V2 két
forrástételéből 171,875 + 2,5 = 174,375 m²; a snapshotban szereplő
15 000 HUF/m² nettó ár változatlanul került át. Az egysoros projekt-DRAFT
2 615 625 HUF nettó összeggel mentés után frissítést és újranyitást is túlélt.
SQL-visszaolvasás: ajánlat `e02eccb3-1813-4058-b7ca-dc6db2f6f0da`, `draft`,
1. revízió; az azonos műveletkulcs megismétlése után is 1 ajánlat/1 revízió.
Mindkét forrástétel és a pontos kalkulációs revízió megmaradt. A régi
forrásrevizió stale állapota látható.

Javított súrlódás: korábbi snapshotmezők miatt a termék és változat
„ismeretlenként” jelent meg; a read model most a DEMO katalógusból olvasható
címkét ad, de az eredeti snapshot marad a bizonyító forrás. Az ajánlati
mértékegység magyar feliratot kapott, a forrás részletekben nyitható, az üres
ár nem jelenik meg nullaként, hiányzó kötelező árnál a mentés tiltott.
Kis nézetben egyoszlopos beviteli űrlap és könnyen elérhető mentés jelenik
meg; klienszár és DB-műveletkulcs védi az ismételt küldést.

Automatizált bizonyíték: teljes Vitest 87 fájl/334 PASS, 18 SKIP; fókuszált
aggregáció 5/5; helyi pgTAP `027` 15/15 (összeg, forrás, retry, konfliktus,
jogosultság, immutabilitás); typecheck, lint, production build és diff-check
PASS. Adatbázis-reset nem történt.

Hitelesített Brave-emuláció: iPhone 16 393×852, iPad Mini portré 768×1024 és
tájkép 1024×768, valamint desktop; a nézetek használhatók, vízszintes
oldaltúlcsordulás nélkül. Frissítés utáni ajánlatnyitás működött. Ez
Chromium-emuláció, nem fizikai eszközteszt. Fizikai checklist: Safari
portré/tájkép és billentyűzet; numerikus mezők/tizedesbevitel; kamera JPEG;
megszakított mobilhálózat és újrapróbálás; forrás, számítás és ajánlat
újranyitása. Fizikai iPhone/iPad: **UNVERIFIED**. Hosted DB és offline sync
nem tesztelt. Hosted változás, reset, commit, push, deploy nem történt.
`.DS_Store` érintetlen. Javasolt commit:
`feat(F9.8): prepare takeoff materials for quotation drafts`.
