# M10.1 — végső független QA

**Dátum:** 2026-10-26  
**Végső státusz (frissítve, 2026-10-26):** **FAIL**  
**Hatókör:** a helyi tesztfiók helyreállítása és az előírt, hitelesített QA kapujának ellenőrzése. A független regressziós és mentés–újranyitás szakasz nem indult el, mert a böngészős belépést a felhasználónak kell befejeznie.

## 1. Git HEAD és munkafa

- HEAD: `c1759f447d9451a3acbdaf4421663767870b13c7`.
- A munka kezdetekor már módosított fájlok: `docs/PROGRESS.md`, `src/domain/calculations/construction/construction.test.ts`, `src/domain/calculations/construction/roofs.ts`, `src/domain/calculations/roof-geometry.ts`, `src/features/calculators/construction-field-transfer-control.tsx`, `src/features/calculators/rafter-connection-fields.test.ts`, `src/features/calculators/rafter-connection-fields.ts`.
- Már korábban létrejött, nem követett dokumentumok: `docs/M10_PHASE1_INDEPENDENT_QA.md`, `docs/M10_PHASE1_P1_REMEDIATION.md`.
- Ezekhez a változásokhoz nem nyúltam. A jelen menet egyetlen fájlmódosítása ez a riport.

## 2. Helyi Auth-környezet

- A projektazonosító a `supabase/config.toml` szerint `badogos-helptool`.
- A Supabase CLI és a Docker a `supabase_db_badogos-helptool` és `supabase_auth_badogos-helptool` helyi konténereket mutatta egészséges állapotúnak; API/DB-végpontok a loopback címeken futnak.
- A `.env.local` Auth URL-je a CLI helyi API-végpontjával egyezett (`127.0.0.1:54321`); a publishable kulcs is egyezett. Kulcsértéket nem írtam ki.
- A 3000-es porton futott a helyi alkalmazás. Nem használtam linkelt, hosted, staging vagy production Supabase projektet.
- A CLI „stopped services” listáján csak az opcionális imgproxy, edge runtime, analytics, vector és pooler szerepelt; az Auth és a DB egészséges volt.

## 3. Tesztfiók helyreállítása

- A kezdeti, helyi, read-only Auth/DB-lekérdezés nem talált `admin1@testadmin.com` fiókot.
- A felhasználó kifejezett kérésére létrehoztam a fiókot a helyi Supabase Auth admin API-ján; megerősített e-mail státuszt kapott a dokumentált helyi tesztfolyam szerint. A jelszó nem került logba, fájlba vagy riportba.
- A meglévő Auth-trigger automatikusan létrehozta a profilt; utólagos read-only lekérdezés ezt igazolta.
- A `DEMO TetőPro Kft.` (`00000000-0000-4000-8000-000000000010`) szervezetben `member` tagságot kapott. Az M10 mentési Action bármely aktív szervezeti tagságot ellenőriz; owner/admin jogosultságot nem állítottam be.
- Utóellenőrzés: `email_confirmed=true`, `has_profile=true`, `demo_roles=member`.

## 4. Bejelentkezés és session

- A helyi alkalmazás bejelentkezési oldala betöltött: `http://127.0.0.1:3000/bejelentkezes`; a képernyőn a várt e-mail- és jelszómező, valamint a „Belépés” gomb jelent meg.
- A jelszót nem írtam be és nem küldtem el. A böngészős credential-handoff szabály megköveteli, hogy ezt a lépést a felhasználó végezze el.
- Ezért az Auth password-login válasza, böngésző-session, frissítés utáni session-megmaradás, szervezetfeloldás, kalkulátormegnyitás és DEMO-mentési jogosultság **NOT VERIFIED**.
- **Kötelező kapu:** amíg a felhasználó nem fejezi be a helyi belépést, a 2. fázis nem kezdhető el.

## 5. P1 — 80°-os hajlásszöghatár

**NOT RUN.** A hitelesített QA-szakasz kapuja nem teljesült. A korábbi `M10_PHASE1_INDEPENDENT_QA.md` a javítás előtti helper és cél-séma eltérését P1-ként rögzítette; a `M10_PHASE1_P1_REMEDIATION.md` a javításról és unit eredményekről számol be. Ezeket ebben a menetben nem ellenőriztem függetlenül.

## 6. P1 — formaváltási React-state audit

**NOT RUN.** Nem végeztem a komponens tényleges state transitionjére, a passive effect időzítésére, kalkulációra vagy mentésre vonatkozó vizsgálatot. A javítás előtti jelentés P1 adatszivárgást rögzített; a remediation riport pure-function teszteket állít, de ez a jelen QA-ban nem független bizonyíték.

## 7. P2 — pontossági megjelenítés

**NOT RUN.** A preview, megerősített célmező, fókusz/blur, szerveroldali mentés és mobilos tördelés böngészőben nem lett ellenőrizve.

## 8. Material-takeoff mentés–újranyitás E2E

**NOT RUN.** Forrás- és célkalkulációt nem hoztam létre, nem mentettem, nem nyitottam újra és nem végeztem hozzá DB-ellenőrzést.

## 9. Timber-cutlist mentés–újranyitás E2E

**NOT RUN.** Nem történt kalkulátor-átvétel, mentés vagy újranyitás.

## 10. Dependency, immutable revision és attestáció

- Bizonyított: az új tesztfiók profilja és minimális DEMO szervezeti tagsága létezik.
- **NOT VERIFIED:** M10 forrás-/célrevízió, dependency, attestáció, revíziószám, változatlan forrás snapshot, illetve V2 forrás utáni célváltozatlanság. Nem hoztam létre M10 kalkulációs rekordot.

## 11. Mobil/desktop vizuális QA

**NOT RUN.** Nem ellenőriztem a 375×812, 812×375 vagy 1440×900 nézeteket, világos/sötét témát, táblázatot, érintési célokat, forma-váltást vagy eredményrajzokat.

## 12. Ténylegesen futtatott ellenőrzések

- Helyi Supabase szolgáltatás-/projektállapot ellenőrzése: Auth és DB konténerek egészségesek; az alkalmazás API-originje egyezik a CLI helyi végpontjával.
- Helyi read-only SQL: kezdetben a kért fiók hiányzott; létrehozás után a megerősített Auth user, profil és `member` DEMO tagság igazolva.
- Helyi login-oldal vizuális/hozzáférhetőségi állapotának megfigyelése: a várt login űrlap megjelent; bejelentkezési interakció nem történt.
- `git diff --check` — **PASS**.
- Vitest, lint, build, typecheck, DB-regresszió és hitelesített böngészős E2E — **nem futott** ebben a menetben.

## 13. Bizonyított hibák

- Ebben a menetben új alkalmazáshibát nem reprodukáltam, mert a független QA a login kapunál megállt.
- A korábbi, javítás előtti QA-riport két P1-t rögzít. A remediation riport a javításukat állítja, de a jelen riport alapján egyik P1 megszűnése sem minősíthető függetlenül igazoltnak.

## 14. Nem ellenőrzött esetek

- Jelszavas alkalmazásbelépés, session és session refresh.
- Minden P1/P2 regresszió és React állapotmátrix.
- Material-takeoff és timber-cutlist mentés–újranyitás.
- DB dependency, immutable revision és attestáció.
- Mobil, tájkép, desktop és témaváltás.
- A célzott M10 Vitest és böngészős regresszió.

## 15. Végső elfogadási döntés

**AUTH BLOCKED — M10.1 nem zárható le.** A helyi tesztfiók létrejött és a szükséges DEMO `member` hozzáféréssel rendelkezik, de a felhasználói bejelentkezés, a független P1/P2 QA és a teljes E2E még nem bizonyított.

**Kódváltoztatás:** csak ez a QA-riport; alkalmazáskódot nem módosítottam.  
**Helyi környezeti változtatás:** egy megerősített Auth felhasználó, automatikus profilrekord és egy DEMO `member` tagság jött létre.  
**Commit:** most nem javaslok mérföldkő-lezáró commitot; az elfogadási feltételek nem teljesültek.


## 16. Független QA folytatása — 2026-10-26

Ez a szakasz frissíti a korábbi checkpointot; a 15. szakaszban rögzített AUTH BLOCKED státuszt a sikeres session után felülírja. A korábbi megállapítások és eredeti állapotmegjelölések megmaradnak auditnyomként.

### 16.1 Session és DEMO hozzáférés

- **Ellenőrizve:** a már megnyitott `http://localhost:3000` munkamenet bejelentkezve maradt a helyi `admin1@testadmin.com` fiókkal. A `DEMO TetőPro Kft.` szervezet kalkulátoroldala betöltött, V1 kalkulációkat mentett és újratöltés után visszaolvasott. A helyi DB igazolta az `email_confirmed=true`, profil-létezés és `member` tagság állapotot.
- **Ellenőrizve:** az alkalmazásoldali save műveletek sikeresek `member` tagsággal. Ebből a szerepkörből nem következtetek admin/owner jogosultságra.
- **Ellenőrizve:** URL maradt a helyi `localhost:3000`; a kapcsolt forrás és kalkulációk helyi DB-ből származnak. Hosted/production környezetet nem használtam.

### 16.2 Kód- és migrációs revízió

- Git HEAD: `c1759f447d9451a3acbdaf4421663767870b13c7` — megegyezik a kezdeti checkpointtal. A munkafa korábbi alkalmazáskód-változásaihoz nem nyúltam.
- A lokális Supabase migrációs nyilvántartásában szerepel a `20261025154642 qa08_rpc_trust_boundary`, `20261026010000 construction_field_transfer`, `20261026020000 construction_field_transfer_dependency_scope` és `20261026030000 construction_field_transfer_attestation`.
- A mentett revíziók `input_schema_version=construction-suite.input.v1` és `calculator_implementation_version=construction-suite.output.v1` értéket tartalmaznak.

### 16.3 Korábbi P1 #1 — célhajlás tartományán kívüli adatátvétel

- **Ellenőrizve forráskóddal és célzott tesztekkel:** az átvételi helper a `roofGeometryInputSchema` által exportált `pitch < 80°` validációt használja; a célzott construction és field-transfer Vitest futás lefedte a 80°/80° feletti elutasítást, valamint az érvényes határ alatti esetet. A parancs `npx vitest run src/domain/calculations/construction/construction.test.ts src/features/calculators/rafter-connection-fields.test.ts`: **2 fájl, 35 teszt PASS**.
- **Nem igazolt:** a 80° feletti forrásgeometriával indított átviteli preview teljes böngészős E2E-je nem futott le. Ezért a javítás független runtime visszautasítását nem állítom.
- **Külön megfigyelés / határ:** a már mentett timber-cutlist kalkulátor sima célbemeneti mezője a böngészőben 80° értéket elfogadott, és a kliensoldali kalkuláció frissült. Ez nem bizonyítja az átviteli helper hibáját, amelynek szabálya szigorúan `<80`; viszont a célmező, cél-séma és a helper közti tartományi egyezés nem tekinthető teljes körűen igazoltnak. A 80°-os, módosítatlan DEMO kalkulációt nem mentettem.

### 16.4 Korábbi P1 #2 — forma-váltás és draft-szennyezés

- **Ellenőrizve böngészőben:** a gable geometria átvétele után, amikor a felhasználó csak a `widthMm` értéket kézzel módosította, gable→hip váltás után a kézi szélesség helyesen megmaradt, de a változatlanul hagyott, átvett `pitchDegrees` is bent maradt, és a hip kalkuláció azt használta. Ez reprodukálható P1: a két geometriai kulcsot a helper együttesen ellenőrzi (`every`); egyetlen kézi módosítás miatt mindkettő resetje elmarad.
- **Ellenőrizve böngészőben:** mindkét átvett geometriai mező kézi módosítása után a hip→gable→shed útvonalon a kézi értékek megmaradtak. Teljesen érintetlen geometria gable→hip váltáskor kiürült, és visszaváltáskor nem éledt újra. Undo a korábbi snapshotot visszaállította. Ezek a sikeres részesetek nem fedik el a részleges-módosítási hibát.
- **Ellenőrizve forráskód sorrendjéből, első render runtime screenshot nélkül:** a szülő komponens `useMemo`-val a `roofShape`/`values` alapján render előtt számítja a kalkulációt és az input snapshotot; a gyermek `ConstructionFieldTransferControl` csak passive `useEffect`-ben reseteli a mezőket. Így forma-váltáskor az első szülő-renderben az új forma és a régi átvett geometria együtt adódhat át számításhoz és mentési snapshothoz.
- **Nem igazolt runtime részlet:** az átmeneti első render látható villanását, illetve azt, hogy a felhasználó a passive effect előtt ténylegesen el tudja-e indítani a mentést, nem sikerült böngészőben frame-szinten megfigyelni. A kód sorrendje igazolja a köztes kalkuláció/snapshot lehetőségét, nem bizonyítja a mentési kattintás időablakát.
- **Ellenőrizve böngészőben:** új kalkuláció indításakor a korábbi transfer státusz címkéje egy ideig látható maradt. A forrásban az új kalkuláció resetje nem törli `transferSource`-t, és a child `applied` állapota is lokális. Nem mentettem ebből az állapotból új revíziót; a címke megtévesztő volta bizonyított, az új kalkuláció dependency payloadba kerülése nem.

### 16.5 Hajlásszög pontossága

- **Ellenőrizve böngészőben:** a preview kerekített `≈34,019°` értéket mutatott, mellette feltüntette a teljes `34.01934998982646°` értéket. A megerősített input és a `Kiindulási adatok` ugyanazt a teljes pontosságú értéket őrizte; a screenshoton a mezőben is minden tizedesjegy látszott (lokalizált vesszővel).
- **Ellenőrizve mentett állapotban:** mindkét célkalkulátor újranyitása után a mező AX float `Value` kerekített volt, de `Details` és az eredmény-adatösszesítő a teljes `34.01934998982646°` értéket mutatta. Az input snapshotokban is pontos string maradt.

### 16.6 Material-takeoff teljes mentés → újranyitás E2E

- **Ellenőrizve böngészőben:** a forrásból átvett, gable material-takeoff cél `DEMO M10.1.3 material-takeoff` néven V1-ként mentődött, `9b13b9a9-71a8-4ca7-84c4-98292a6bc878` számításazonosítóval és `2b5c850f-1141-4dda-9c31-9cb036b861d1` revízióazonosítóval. Teljes újratöltés után ugyanaz a tetőforma, 10000×8000 mm, pontos hajlás, HAP, Karmi és kézi anyagadatok töltődtek vissza; eredményként 36 szarufa / 35 léc, 173,735 m és 350 m geometriai összhossz, valamint 1,737 / 0,525 m³ térfogat jelent meg.
- **Hibajelzés ellenőrizve:** újranyitás után a UI „A mentett V1 eredménye eltér a mostani számítástól” figyelmeztetést mutatott. A figyelmeztetés a komponens szerint inputazonosság mellett a `lines`, `takeoff`, `cutList` strukturális eltéréséből származik. A DB snapshot és a látható fő eredménysorok megegyeztek, de a pontos eltérő mezőt nem azonosítottam; ezért az inputok/eredmények visszaállása igazolt, a mentett és újraszámított output bitpontos egyezése **nem igazolt**, a független E2E elfogadás korlátozott.

### 16.7 Timber-cutlist teljes mentés → újranyitás E2E

- **Ellenőrizve böngészőben:** a `DEMO M10.1.3 timber-cutlist` V1 sikeresen mentődött `67d797ae-b7ac-4626-a1c0-12f243b50006` számításazonosítóval és `e4c1e901-919d-47f5-bfc8-73e90396f392` revízióazonosítóval. Friss oldal-újranyitás után a 10000×8000 mm, 34.01934998982646°, 60/30 cm kiosztás és 5×20/5×3 cm kézi szelvényadatok visszatöltődtek. Vágáslista: 36 darab 4826 mm-es szarufa és 35 darab 10000 mm-es léc. A mentési státusz `Mentve · V1` maradt; drift figyelmeztetést ebben a kalkulátorban nem láttam.
- **Korlát:** ebben a timber-cutlist E2E-ben nem volt adatátvétel, így ehhez a revízióhoz dependency helyesen nem jött létre.

### 16.8 Revízió, dependency, attestáció, konzisztencia és jogosultság

- **Ellenőrizve read-only helyi SQL-lel:** a forrás `roof.rafter-cut` kalkuláció aktuális V1 revíziója `94cab050-2853-45b2-bec5-9457b363cb7e`, inputja 4000 mm félfesztáv / 2800 mm emelkedés / 100 mm HAP. Ez a forrás V1 revízió változatlan maradt.
- **Ellenőrizve read-only helyi SQL-lel:** a material-takeoff cél V1 revízió dependencyje erre a forrás V1-re mutat: `field-transfer:roof.rafter-cut->roof.material-takeoff`. A timber-cutlist V1-nek nincs upstream dependencyje, mert ebben a tesztben nem vett át forrásadatot.
- **Ellenőrizve read-only helyi SQL-lel:** mindhárom mentett revízióhoz (forrás V1, material-takeoff V1, timber-cutlist V1) tartozik belső `construction_revision_attestations` sor ugyanazzal a DEMO szervezettel és tesztfelhasználóval.
- **Ellenőrizve read-only DB katalógussal:** a `calculation_revisions_immutable` trigger engedélyezve van, UPDATE/DELETE előtt `private.prevent_revision_mutation()` fut. Nem próbáltam UPDATE/DELETE műveletet; ezért az elutasítás futásidejű negatív tesztje nem történt meg. A forrás változatlanságát a jelenlegi V1 snapshot újraolvasása igazolta.
- **Nem igazolt:** külön felhasználóval végzett RLS/cross-organization negatív hozzáférési teszt, illetve konkurens mentési konfliktus. A sikeres mentések csak a jelenlegi tag hozzáférését bizonyítják.

### 16.9 Mobil/desktop és téma

- **Ellenőrizve:** egy kb. 1030 px széles, álló desktop böngészőnézetben, sötét témával vizuális megfigyelés készült. A kalkulátorkártyák, űrlap, mértékegység-választók és teljes pontosságú hajlásmező látható volt; a nézet függőlegesen görgethető. Ez nem 1440 px-es desktop QA.
- **Nem ellenőrzött:** 375×812 mobil álló, 812×375 mobil fekvő, 1440×900 desktop, világos téma és téma közti váltás. A jelenlegi appnézetben nem jelent meg elérhető téma-vezérlő, és a böngészőablak viewportját nem módosítottam.

### 16.10 Futott ellenőrzések és végső döntés

- Futtatva: `npx vitest run src/domain/calculations/construction/construction.test.ts src/features/calculators/rafter-connection-fields.test.ts` — **2 fájl, 35 teszt PASS**. Ez célzott teszt, nem teljes regresszió.
- Futtatva: helyi read-only SQL a forrás/cél snapshotokra, dependencykre, attestációkra, aktív immutable triggerre és migrációs nyilvántartásra.
- Futtatva: böngészős login/session, forma-váltás, kézi módosítás, undo, precision, material-takeoff és timber-cutlist mentés–újranyitás.
- Nem futott: teljes Vitest/lint/typecheck/build, külön DB negatív RLS/konkurencia teszt, teljes átviteli overrange E2E, frame-szintű effect/mentés időzítés, mobil/1440 px/light-theme böngészős QA.

**Végső döntés: FAIL — M10.1 nem zárható le.** A belépés, DEMO szervezeti mentés, mentett revíziók, dependency és attestáció bizonyított; az egyik korábbi P1 forma-váltási javítás részleges kézi módosítás után továbbra is hibázik, valamint a material-takeoff újranyitása output-drift figyelmeztetést ad. A viewport/téma és néhány security/konkurencia követelmény is nem igazolt.

**Munkafa:** alkalmazáskódot, adatbázis-sémát vagy migrációt nem módosítottam; csak ezt a QA-riportot frissítettem. Nincs commit, push vagy deploy. A helyi, DEMO jelölésű tesztadatok a read-only QA után megmaradnak.

**Javasolt Conventional Commit (csak ha a későbbi javítás és újra-QA sikerül):** `fix(M10.1.3): invalidate transferred geometry per field`
