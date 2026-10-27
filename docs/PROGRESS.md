# Fejlesztési előrehaladás és bizonyítékok

## M10.1.7 — Output-drift tolerancia és M10.1 lezárása (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. A független M10.1.6 QA ([`M10_PHASE1_DRIFT_INDEPENDENT_QA.md`](M10_PHASE1_DRIFT_INDEPENDENT_QA.md)) által bizonyított egyetlen nyitott P2-t javítottam: a mentett vs. élő output-összehasonlítás eddig pontos JSON-string egyezést követelt, ezért a Karmi trigonometrikus eredmények gépi pontosságú (`~1e-14`) utolsó-bit eltérése hamis drift-figyelmeztetést okozott. Az összehasonlítás mostantól egy rekurzív, strukturális `outputsEquivalent` függvény (`construction-save-panel.tsx`), amely csak `number`–`number` pár között enged szűk (`1e-9` abszolút + relatív) toleranciát; struktúra, típus, string, hiányzó/`null` mező és minden érdemi numerikus/darabszám-eltérés továbbra is driftet jelez. Az M10.1.5 ideiglenes dev-only drift-logoló `useEffect`/`console.debug` eltávolítva; a `outputDriftDiffPaths` diagnosztikai helper tiszta, tesztelt utilityként megmaradt. Részletek: [M10.1.7 javítási riport](M10_PHASE1_DRIFT_FIX_AND_CLOSURE.md).

- **Ellenőrzés:** célzott `construction-save-panel.test.tsx` 13/13 PASS (2 új teszt); 7 fájlos célzott regressziós kör 109/109 PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1219 teszt PASS/19 SKIP; ESLint PASS; izolált (`git worktree`) typecheck és production build PASS; `git diff --check` PASS. Böngészős E2E a két korábbi DEMO revízión **NEM VERIFIKÁLT** — az `admin1@testadmin.com` munkamenet nem volt elérhető ebben a menetben, és jelszó nélkül nem kíséreltem bejelentkezést.
- **Javasolt Conventional Commit:** `fix(M10.1.7): tolerate machine-precision output-drift noise and drop the dev-only drift logger`.

## M10.1.5 — Célvalidáció, output-drift diagnosztika és transfer-state javítás (2026-10-27)

Státusz: **PASS WITH LIMITATIONS**. A végső független QA ([`M10_PHASE1_FINAL_ACCEPTANCE.md`](M10_PHASE1_FINAL_ACCEPTANCE.md), FAIL) egy új P1-jét és két P2-jét vizsgáltam. **P1 javítva:** a célkalkulátor (`roof.material-takeoff`/`roof.timber-cutlist`) `pitchDegrees` mezője 80°/81°-ot is elfogadott gable formánál, mert a gable-geometria saját, régebbi motorja `<90°`-ot enged, míg a többi tetőforma a megosztott `<80°` sémát használja. A gyökérok az eltérő, dokumentálatlan forma-specifikus séma volt. A tényleges javítás a célkalkulátor közös trust boundary-jében (`fieldContractIssues`, `construction-computation.ts`) történt — ugyanazt a `pitch` (`<80°`) sémát futtatja a nyers mezőn, kliens és szerveroldali mentő Action egyaránt (ugyanaz a `computeConstruction` hívás), és érvénytelen mezőnél soha nem készül teljes geometria/eredmény. **P2 (transfer-state szivárgás kalkulátorváltáskor) javítva:** `transferSource`/`transferApplied` kalkulátoranként tárolt map lett, a már meglévő `drafts`/`materialByCalculator`/`sessions` mintázatot követve — kalkulátorváltás nem mutat idegen eredetjelzést, visszaváltáskor a még nem mentett átvétel megmarad. **P2 (output-drift) nyitva maradt:** a jelen DEMO szervezetben a korábbi QA-ban mentett átviteles rekordok már nem léteznek, a pontos reprodukciós lépéssor ebben a menetben nem volt újrajátszható, ezért gyökérokot nem azonosítottam és nem alkalmaztam feltételezett javítást; helyette egy ideiglenes, dev-only strukturális diff-helper (`outputDriftDiffPaths`) készült a következő menethez. Részletek: [M10.1.5 riport](M10_PHASE1_VALIDATION_AND_DRIFT_REMEDIATION.md).

- **Ellenőrzés:** célzott Vitest (construction-computation/save-panel/drafts + roof-geometry/gable-roof/construction domain) 26 fájl/298 teszt PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1217 teszt PASS/19 SKIP; ESLint PASS; `npm run typecheck` PASS; izolált production build (rsync-elt másolat, symlinkelt `node_modules`/`.env.local`) PASS; `git diff --check` PASS; élő böngészős E2E a helyi hitelesített `demo.owner@local.test` DEMO-munkamenetben: 79,9°/80°/81° pitch határeset mindkét célkalkulátoron, A→B→A kalkulátorváltás transfer-state konzisztencia.
- **Javasolt Conventional Commit:** `fix(M10.1.5): enforce the shared pitch bound on the direct calculator field, scope transfer state per calculator, add output-drift diagnostics`.

## M10.1.3 — Mezőnkénti geometriai invalidáció és atomi forma-váltás (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A végső független QA ([`M10_PHASE1_FINAL_INDEPENDENT_QA.md`](M10_PHASE1_FINAL_INDEPENDENT_QA.md) §16.4, FAIL) által élőben bizonyított P1-et javítottam: `invalidateGableGeometryOnShapeChange` eddig a `widthMm`/`pitchDegrees` mezőt egyetlen `.every()`-vel kezelte, ezért csak az egyik kézi módosítása után a másik (változatlan) mező is bent maradt forma-váltás után. A javítás mezőnként, egymástól függetlenül dönt. Architekturálisan a forma-váltás és az invalidáció egyetlen atomi draft-frissítéssé lett (`applyFieldChange`, `construction-drafts.ts`), a tulajdonos (`ConstructionCalculatorSuite.updateValue`) hívja; az átvétel-nyomkövetés (`applied`) a szülőbe került, a gyermek `ConstructionFieldTransferControl` már nem végez saját, render utáni korrekciót. A material-takeoff output-drift (§16.6) gyökérokát egy valódi, a helyi DB-ben megmaradt mentett revízión vizsgáltam: a mentés/visszaolvasás snapshot-logikája a jelenlegi kóddal bit-pontosan reprodukálja a mentett eredményt — a snapshot-matematikában nincs hiba; az élő, pillanatnyi előfordulás nem reprodukálható újra, nyitott kockázatként dokumentálva. Részletek: [M10.1.3 végső javítási riport](M10_PHASE1_P1_FINAL_REMEDIATION.md).

- **Ellenőrzés:** célzott `rafter-connection-fields.test.ts` 18/18 PASS, új `construction-drafts.test.ts` tulajdonos-szintű állapotátmenet-tesztek 8/8 PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1210 teszt PASS/19 SKIP; ESLint PASS; `tsc --noEmit` PASS; `git diff --check` PASS; élő böngészős QA a helyi hitelesített DEMO session-ben (gable átvétel → csak `widthMm` kézi módosítás → gable→hip váltás → `widthMm` megmaradt, `pitchDegrees` resetelt; hip→gable nem éleszt újra; „Új kalkuláció” törli az átvétel-feliratot) PASS. Production build nem futott (aktív `next dev` a fő checkoutban, izolált build nem volt elérhető ebben a menetben); mobil/tájkép/desktop vizuális mátrix ebben a menetben nem futott újra.
- **Javasolt Conventional Commit:** `fix(M10.1.3): invalidate transferred gable geometry per field, make the shape-change draft update atomic in the owner`.

## M10.1.2 — Független QA P1/P2 javítás (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A független audit ([`M10_PHASE1_INDEPENDENT_QA.md`](M10_PHASE1_INDEPENDENT_QA.md), FAIL) két P1 és egy P2 hibáját javítottam: (1) a gable-transfer helper mostantól a cél tényleges `<80°` validátorát hívja újra a korábbi, tőle eltérő `>=90°` határ helyett; (2) tetőforma-váltáskor (gable → hip/shed) az átvételből származó, azóta kézzel nem módosított `widthMm`/`pitchDegrees` automatikusan visszaáll az átvétel előtti értékre, hogy ne szennyezze más tetőforma számítását — a Karmi-mezőket és a kézi módosítást nem érinti; (3) a preview mostantól „≈” jelöléssel és a teljes pontosságú értékkel együtt mutatja a kerekített hajlásszöget. Részletek: [M10.1.2 javítási riport](M10_PHASE1_P1_REMEDIATION.md).

- **Ellenőrzés:** célzott `construction.test.ts`+`rafter-connection-fields.test.ts` 2 fájl/35 teszt PASS; kiterjesztett célzott kör 8 fájl/87 teszt PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1201 teszt PASS/19 SKIP; ESLint PASS; izolált git worktree-ben typecheck és build PASS; `git diff --check` PASS. Mentés–újranyitás E2E és vizuális mátrix a blokkolt helyi bejelentkezés miatt NOT VERIFIED.
- **Javasolt Conventional Commit:** `fix(M10.1.2): align gable pitch bound with target schema, stop cross-shape geometry leak, clarify rounded preview`.

## M10.1 — Nyeregtető geometriai adatátadás (Fázis 1, 2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. Mentett `roof.rafter-cut` revízióból, kizárólag gable célformánál és a felhasználó explicit szimmetria-jóváhagyása mellett, a `widthMm`/`pitchDegrees` mezők matematikai konverzióval (`widthMm = 2 × horizontalHalfSpanMm`, HAP-pal csökkentett `pitchDegrees = atan2(rise − HAP, halfSpan)`) átvehetők a meglévő „Adatok átvétele” vezérlőn keresztül. A jóváhagyás nélkül csak a már bizonyított csatlakozási/eresz mezők vehetők át; nem-gable formáknál a geometriai szekció meg sem jelenik. Hiányzó/érvénytelen/tartományon kívüli forrásgeometria explicit hibakóddal (`MISSING_HAP`/`INVALID_HAP`/`INVALID_SOURCE_GEOMETRY`/`TARGET_RANGE`) utasítja el az átvételt, becslés nélkül. Élő böngészős E2E-vel igazolva (4000/2800/100 mm forrás → 8000 mm / 34,01934998982646° pontos átvétel, Visszavonás, tetőforma-váltás utáni azonnali geometriai szekció-eltűnés, mobil 375×812 nézet). Részletek: [M10 Fázis 1 gable geometria riport](M10_PHASE1_GABLE_GEOMETRY_IMPLEMENTATION.md).

- **Ellenőrzés:** célzott `construction.test.ts` + `rafter-connection-fields.test.ts` 29/29 PASS; teljes Vitest 192 fájl PASS/8 SKIP, 1195 teszt PASS/19 SKIP; ESLint PASS; izolált typecheck és build PASS; `git diff --check` PASS.
- **Javasolt Conventional Commit:** `feat(M10.1): transfer validated gable geometry from saved rafter cuts`.

## M10.1 — Vízszintes ereszkiülés mezőleképezés (Fázis 1, 2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A tervdokumentum `[ELLENŐRZENDŐ]` ereszkiülés-névváltozat kérdését (`roof.rafter-cut` `eaveProjectionMm` vs. a geometriai kalkulátorok `eaveOverhangMm`-je) forráskód-szinten (nem csak szöveg alapján) igazoltam azonosnak — mindkettő ugyanarra a fél fesztávra rakódik rá vízszintesen, ugyanazzal a `halfSpan = width/2` és `atan2(rise, halfSpan)` képlettel. A mezőleképezés explicit kulcstáblázattá alakítva (`RAFTER_JOINT_TRANSFER_FIELD_MAP`), az ereszkiülés mostantól átvehető a meglévő "Adatok átvétele" vezérlőn keresztül. Élő böngészős próbával igazolva (0 mm → 500 mm előnézet és tényleges kitöltés). Szándékosan **nem** valósult meg a fél fesztáv/emelkedés ↔ szélesség/hajlásszög leképezés, mert a `halfSpan = width/2` összefüggés csak nyereg-/félnyeregtetőre igazolt, a többi (kontytető, sátortető, stb.) formára nem — ez a tervdokumentum saját tiltása szerint külön, formánkénti igazolást igénylő, önálló feladat. Részletek: [M10 Fázis 1 riport](M10_PHASE1_EAVE_OVERHANG_MAPPING.md).

- **Ellenőrzés:** célzott `rafter-connection-fields.test.ts` 8/8 PASS; teljes Vitest izolált worktree-ben 192 fájl PASS/8 SKIP, 1189 teszt PASS/19 SKIP; ESLint PASS; izolált typecheck és build PASS; `git diff --check` PASS.
- **Javasolt Conventional Commit:** `feat(M10.1): map the eave-overhang field between rafter-cut and the geometry-based roof calculators`.

## M10.0.3 — Adatátvételi UX, DB-regresszió és TypeScript-kompatibilitás véglegesítése (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. Az M10 mezőátvételi felület kétlépésessé vált (előnézet mezőnkénti jelenlegi/új érték összehasonlítással, csak megerősítés után ír draftot), rövid, konfliktusbiztos visszavonást kapott, és a forráslista mostantól megkülönbözteti a betöltési hibát a valódi üres állapottól. Két hiányzó pgTAP-regresszió pótolva és lefuttatva (dependency-hiba utáni teljes rollback; M10 célrevízió sikeres ajánlatforrás-kapcsolása) — **Files=6, Tests=112, PASS**. A `database.types.ts` szinkronizálva a tényleges 10 paraméteres RPC-vel (egyetlen releváns sornyi diff). Teljes Vitest (1187/1187 PASS), lint, izolált típusellenőrzés és production build mind PASS. A helyi `tetopro_covering_writer` DB-writer `28P01` hitelesítési hibáját diagnosztizáltam (a szerepkörnek jelszó nélküli, friss migráció-állapota volt) és a dokumentált helyi eljárással, kizárólag ezt az egy, saját elkülönített fejlesztői szerepkört érintve javítottam. Ezután élő böngészős E2E mindkét célkalkulátoron: DEMO forrás mentése, előnézet (egyező/változó mező helyes megkülönböztetése), Mégse (draft változatlan), megerősítés, Visszavonás (draft-visszaállítás), ismételt megerősítés, mentés, friss navigációval újranyitás (érték perzisztál), dependency és attestáció közvetlen DB-ellenőrzése — mind **PASS**. 375×812 világos/sötét téma PASS. NOT VERIFIED maradt: 812×375 tájfekvés, a teljes 8 mezős mátrix egyszerre, és a kézi-módosítás-utáni Visszavonás-eltűnés élő reprodukciója. Részletek: [M10 Fázis 0.3 riport](M10_PHASE0_UX_AND_REGRESSION_FINALIZATION.md).

- **Javasolt Conventional Commit:** `feat(M10.0.3): add field-transfer preview/undo UX, two pgTAP regressions and type sync`.

## M9.16 — Karmi-kiszabás szakmai és használhatósági véglegesítése (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A „Vízszintes ereszkiülés” mező korábbi, lejtésirányú megfogalmazása ("Ereszkiülés a lejtés irányában") javítva mindhárom kalkulátorban (közös definíció, `eaveOverhangMm`); a domainkód bizonyítottan vízszintes vetületi távolságként kezeli ezt az értéket. HAP, derékszelemen és gerinckapcsolat mezői felülvizsgálva: már korábban pontosak, nem módosítottam. Felhasználói jóváhagyás után helyi teszt-bejelentkezéssel (`demo.owner@local.test`) élő böngészős workflow-QA mindhárom kalkulátoron: Karmi-only, anyag-only, kombinált, kontytető-fallback és mentés–újranyitás E2E mind PASS, a 88,00 m² vízszintes vetületi terület pontosan igazolja az ereszkiülés-javítást. Derékszelemen disclosure élő tesztje nem reprodukálta a korábban dokumentált korlátot. NOT VERIFIED maradt: teljes nézetméret×téma mátrix, fizikai telefonteszt, régi snapshotok kompatibilitása. Részletek: [M9.16 QA riport](M916_KARMI_PROFESSIONAL_WORKFLOW_QA.md).

- **Ellenőrzés:** célzott `npx vitest run src/features/calculators` 16 fájl/90 teszt PASS; teljes `npm test` 192 fájl PASS/8 SKIP, 1184 teszt PASS/19 SKIP; `npm run lint` PASS; izolált git worktree-ben `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS.
- **Javasolt Conventional Commit:** `fix(M9.16): correct the horizontal eave-overhang label and finalize Karmi terminology QA`.

## M9.15 — Karmi workflow és szarufatermék-választó (2026-10-26)

Státusz: **PARTIAL / célzott UI-változás ellenőrizve; a teljes elfogadási mátrix nincs bizonyítva.** A három tetőkalkulátorban a Karmi- és csatlakozási beállítások önálló, „Szarufák és bevágások” nevű blokkba kerültek, a generikus opcionális számítások disclosure-ja mellől. Az anyagkimutatás és a faanyag-vágáslista meglévő bekapcsolója indítja a progresszív mezősort: szarufa-keresztmetszet → talpszelemen/szarufa → derékszelemen → gerinckapcsolat. A közös szarufatermék/kézi keresztmetszet-szerkesztő ebben a szekcióban használható; ugyanaz a state táplálja a bevágásszámítást és a faanyagkalkulátort, duplikált szerkesztő nélkül. A szarufa-kiszabás HAP mezője az alapgeometriában marad.

- **HAP terminológia:** a UI mezőcíme most „Szarufa felső élének magassága a talpszelemen felett (HAP)”. A magyar tetőfedő mesteroktatási jegyzet a „kármi” szót kivágásként használja, de nem ad külön magyar nevet ennek a függőleges bemeneti méretnek. A forrás és geometriai összevetés: [M9.15 riport](M915_KARMI_WORKFLOW_UX.md). A kód és az input adapter mindhárom kalkulátorban ugyanazt a `seatCutHeightMm` bemenetet használja.
- **Rajz és adat:** a meglévő méretezett áttekintő, csatlakozásválasztó és részletrajz változatlan domain-eredményekből épül. A képletek, snapshotkulcsok, domainazonosítók, mentési validáció és jogosultsági/DB-határok nem változtak. A HAP domain eredménysorának stabil régi címkéje megmaradt; csak a beviteli mező elnevezése változott.
- **Ellenőrzés:** TDD RED/GREEN a mezőbesorolásra és a közös szarufaspecifikáció-szerkesztőre; célzott tesztek **8 fájl / 73 teszt PASS**. Teljes `npm test` → **192 fájl PASS / 8 SKIP; 1173 teszt PASS / 19 SKIP**. `npm run lint` → **PASS**; izolált, `/private/tmp` másolatban `npm run typecheck` és `npm run build` → **PASS**; `git diff --check` → **PASS**. Helyi Brave-ben rafter-cut blokkot képernyőképpel/AX-állapottal, mindhárom kalkulátor megnyitását, a material/timber bekapcsolót, a szarufatermék-szerkesztőt, a duplikáció hiányát és a gerincdeszka mezőt ellenőriztem.
- **Még nem ellenőrzött / korlát:** az új `roof.material-takeoff` és `roof.timber-cutlist` teljes adatbeviteles böngészős workflow-ja, 375 px/812 px/tablet viewportok és téma/szövegméret mátrix, valamint a részleges/hibás csatlakozás-rajz nincs bizonyítva. Nincs új derékszelemen jelenlét-választó vagy új rajzinterakció; a mezők opcionális csoportban vannak, és a már létező csatlakozásválasztó/részletrajz viselkedés maradt. Valódi ácsszakmai peer review nem történt.
- **Javasolt Conventional Commit:** `feat(M9.15): surface the rafter joint workflow across roof calculators`.

## M9.13 — Karmi terminológiai egységesítés és tető workflow QA (2026-10-26)

Státusz: **PASS WITH LIMITATIONS**. A felhasználói felületen és az aktív kalkulátor-szövegekben a korábbi „madárszáj” megnevezés egységesen **Karmi** lett; a belső `birdsmouth*` típusok, property-k, kulcsok, snapshotok, RPC-k, migrációk és történeti bizonyítékok változatlanok. A célzott terminológiai teszt, az érintett kalkulátortesztje és a kitöltött helyi böngészős workflow-k PASS állapotot adtak. A részletes bemeneteket, eredményeket, korlátokat és a teljes verifikációs naplót a [Karmi terminológia és tető workflow QA riport](KARMI_TERMINOLOGY_AND_ROOF_WORKFLOW_QA.md) tartalmazza.

- **Aktív felület:** `roof.rafter-cut`, `roof.material-takeoff` és `roof.timber-cutlist` látható szövegei, HAP-/csomópont-segédek, eredménysorok és rajzfeliratok Karmi-t használnak.
- **Böngészős bizonyíték:** helyi, hitelesített DEMO Brave munkamenetben mentés nélkül ellenőrizve: kitöltött szarufa-kiszabás Karmi-részletrajzzal; teljes nyereg tetőanyag-kimutatás kézi, `DEMO` forrású alátét- és fedőtábla-adatokkal; kitöltött faanyag-vágáslista; konty- és sátortető geometriai smoke, dokumentált nem támogatott felsővágásokkal.
- **Adatbiztonság:** DB-migráció, mentés, éles Supabase-művelet, commit és deploy nem történt. A kézi anyagadatok csak helyi előnézetben szerepeltek, gyártói vagy áradatként nem lettek bemutatva.
- **Korlát:** a gyártói termékkatalógusos fedés workflow nem volt igazolható kiválasztott termékkel; a rendszer ezt helyesen hiányzó specifikációként jelzi. A mobil/tablet nézet e mérföldkőben nem kapott külön viewport-szintű újramérést.
- **Javasolt Conventional Commit:** `feat(M9.13): standardize Karmi terminology and verify roof workflows`.

## M9.12 — Egymást fedő csomópont-buborékok javítása a szarufarajzokon (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (csak prezentációs javítás; a számított geometria, szerződés és mentés nem változott). Felhasználói képernyőkép: erősen ránagyított „Szarufák és támaszok · áttekintő” rajzon a „Talpszelemen” és „Derékszelemen” csomópont-buborék egymásra csúszva, olvashatatlanul jelent meg.

- **Gyökérok:** a `SectionView` ([rafter-joint-drawing.tsx](../src/features/calculators/rafter-joint-drawing.tsx)) a buborékok helyét a támasz vetített pontjából számolja, a vászon aljához és széléhez klippelve (`Math.min(size.height-16, ...)`). Ha két támasz vetített pontja a vászon alsó szélén kívülre esik (nagy nagyításnál, elpanorázva), mindkét buborék ugyanarra a klippelt sorra kerül — ugyanazzal a bal szélű x-klippel is —, és pontosan fedésbe kerülnek. A buborékok eddig csak a méretcímkéknek számítottak akadálynak (M9.7), egymásnak nem.
- **Javítás:** minden buborék néhány függőleges eltolást próbál ki (közelebbit előbb, mindkét irányban), és az elsőt választja, amely nem fedi a már elhelyezett buborékokat — a vászon méretein belül maradva. Ha egyik eltolás sem szabad, az eredeti (klippelt) pozíció marad, ugyanazzal az elfogadott kompromisszummal, mint amit a `nudgeOffSegments` már a méretcímkéknél is használ. A megoldás a fájlban már meglévő `hitsAny`/`LabelBox` dobozütközés-ellenőrzést használja újra (korábban csak méretcímkéknél volt bevetve), nem vezet be új mechanizmust.
- **Ellenőrzés:** `npx eslint` PASS; izolált worktree-ben `npm run typecheck` PASS (a nem commitolt változással lefuttatva, a futó dev szerver `.next`-je érintetlen); `npx vitest run src/features/calculators src/domain/drawings` **19 fájl / 111 teszt PASS**. Böngésző (helyi dev, mentés nélkül), `roof.rafter-cut`-on a hibát pontosan reprodukáló bemenettel (fél fesztáv 600 cm, HAP 20 cm, derékszelemen 15/5 cm, 4×nagyítás): javítás előtt mérve a „Talpszelemen” és „Derékszelemen” buborék pontosan fedésben (mindkettő 386–410 px, bal szél 2 px); javítás után a két buborék külön sorban, fedés nélkül, mindkettő a 414 px magas vásznon belül. Ugyanez 375 px-es mobil nézetben is fedés nélkül. A `RoofJointDrawing` (a képernyőképen szereplő, két oldalas áttekintő) ugyanazt a `SectionView`-t használja, külön kóduttal nem rendelkezik. Konzolhiba nem jelent meg.
- **Nem változott:** a csomópontok geometriája, a `calculateRafterJoints`/`createRafterJointDrawingModel` kimenete, a méretcímkék (`nudgeOffSegments`) elhelyezési logikája.
- **Nem ellenőrzött / korlát:** a hiba automatizált, determinisztikus regressziós teszttel nem fedett — a kamera (nagyítás/pan) állapota nem elérhető propon keresztül a `RafterJointDrawing`/`RoofJointDrawing` nyilvános API-jából, ezért `renderToStaticMarkup`-pal nem reprodukálható kamera-szimuláció nélkül; a böngészős reprodukció és javítás-ellenőrzés szolgál bizonyítékul, ugyanúgy, mint a hasonló M9.7 címke-ütközési javításoknál. Teljes Vitest-regresszió és `npm run build` nem futott.
- **Javasolt Conventional Commit:** `fix(M9.12): keep overview joint badges from overlapping when clamped to the same edge`.

## M9.11 — Szarufa/léc keresztmetszet megadás egyszerűsítése (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (prezentációs egyszerűsítés; a termékválasztás, a kézi felülírás, a mentett szerződés és a számítás nem változott). Felhasználói képernyőkép és jelzés alapján: a `MaterialSpecEditor` ([material-spec-editor.tsx](../src/features/calculators/material-spec-editor.tsx)) „Termék” módban mindig egyszerre mutatta a termékválasztót és a nyers szélesség/magasság mezőket kitöltve — ugyanazt a két értéket két helyen.

- **Vizsgálat:** a `MaterialSpecEditor`/`RoofMaterialInputs` már ma is egységes mind a négy anyagcsoportra (szarufa, léc, alátét, fedőtábla) és mindkét kalkulátorra (`roof.material-takeoff`, `roof.timber-cutlist`); az eltérés nem a kalkulátorok között volt, hanem a `roof.rafter-cut` eltérő, egyszerű mezője (nincs anyagmennyiség-kontextusa) és a termék-mód belső zsúfoltsága között. **Döntés:** a `roof.rafter-cut` sima „Szarufa magassága” mezőjét szándékosan nem alakítottam termékválasztóssá — ott nincs anyagmennyiség-számítás, a termékkatalógus-UI indokolatlan többletkomplexitás lenne egy ma egyszerű kalkulátorban.
- **Rejtett kettős szerep felszínre hozva:** amikor a „Szarufacsatlakozások számítása” be van kapcsolva `roof.material-takeoff`-ban vagy `roof.timber-cutlist`-ben, a szarufa keresztmetszet magassága adja a bevágás-számítás bemenetét is ([plane-birdsmouth.ts:119](../src/domain/calculations/construction/plane-birdsmouth.ts:119)). Ez eddig láthatatlan volt; most a szekció tetején megjelenik: „A magasság adja a szarufacsatlakozások (madárszáj, szelemenek) bevágás-számításának »Szarufa magassága (keresztmetszet)« bemenetét is.” — a két eltérő mezőnév (itt „Keresztmetszet magassága”, a hiányzó-adat üzenetben „Szarufa magassága (keresztmetszet)”) között hidat képezve, kódváltoztatás nélkül.
- **Tömörítés termék módban:** ha termék van kiválasztva és nincs hiányzó/hibás adat, a nyers mezők helyett egy sortömör összegzés látszik (pl. „Keresztmetszet szélessége: 80 mm · Keresztmetszet magassága: 200 mm”), a szerkeszthető mezőrács pedig egy „Érték felülírása” `GlassDisclosure` mögé kerül — csukva, ha nincs felülírás, nyitva, ha már van. Hiányzó vagy hibás adatnál (`spec.issues`/`spec.missingKeys`), illetve kézi módban a mezők továbbra is közvetlenül, nyitva látszanak — semmi, ami figyelmet igényel, nincs panel mögé rejtve.
- **Ellenőrzés:** `npx eslint` PASS az érintett fájlokra; izolált worktree-ben `npm run typecheck` PASS (a nem commitolt változásokkal lefuttatva, a futó dev szerver `.next`-je érintetlen); `npx vitest run src/features/calculators src/domain/calculations` **41 fájl / 431 teszt PASS**. Böngésző (helyi dev, mentés nélkül): `roof.material-takeoff`-ban DEMO szarufa-termék kiválasztása után a tömör összegzés és a csukott „Érték felülírása” panel megjelent (mért magasság: csukva 45 px, az eredeti `construction-suite-advanced` mintával azonos viselkedés), kinyitva a DEMO termék · badge-es mezők láthatók; a „Léc keresztmetszet” (nincs kiválasztott termék) és `roof.timber-cutlist` változatlanul a nyers mezőket mutatja. Szarufacsatlakozás bekapcsolása után a hídszöveg megjelent, kikapcsolva nem. 375 px-en vízszintes túlcsordulás 0, az „Érték felülírása” gomb 44,8 px. Konzolhiba nem jelent meg.
- **Nem változott:** `resolveMaterialSpec`, `setSpecEntry`, `restoreProductValues`, `switchSpecMode`, a mentett input/output szerződés, a `roofMaterialTakeoff`/`calculateRafterJoints` bemenetei.
- **Nem ellenőrzött / korlát:** valódi (nem DEMO) Anyagkezelő-termékkel, tabletnézetben és sötét témában külön nem futtattam vizuális összevetést; teljes Vitest-regresszió és `npm run build` nem futott.
- **Javasolt Conventional Commit:** `feat(M9.11): collapse resolved product values behind an override disclosure`.

## M9.10 — Derékszelemen mérési segédlet a szarufacsatlakozásos kalkulátorokban (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (csak mérési segédlet és mezőleírás; számítás, szerződés, snapshot, mentés és DB változatlan). Felhasználói jelzés alapján: a derékszelemen (közbenső felfekvés) két mezője — `purlinFaceMm`, `purlinTopMm` — eddig a HAP-pal ellentétben sem mezőleírást (`help`), sem mérési vázlatot (`figure`) nem kapott, holott a bevágása ugyanazt a `notchValues` függvényt használja (`rafter-joints.ts`), mint a talpszelemen.

- **Szakmai ellenőrzés:** a `purlinFaceMm` a talpszelemen külső függővágási síkjától (x = 0) **vízszintesen**, a `purlinTopMm` a talpszelemen felső síkjától (y = 0) **függőlegesen** mért érték — ugyanaz az origó, mint a HAP-nál (`rafter-joints.ts` `notch()`/`notchValues()`, és a már meglévő `ROOF_ADVANCED_HELP` szöveg is ezt írja le). Ez a vonatkoztatás szakmailag konzisztens volt a kódban, csak a felületen nem volt megjelenítve. A gerincszelemen (`ridgePurlinTopMm`) **nem** kapott segédletet: annak vízszintes helye a gerinctengelytől (nem a talpszelemen síkjától) származik, ezért más vázlat kellene — ennek bevezetése külön jóváhagyást igényel.
- **Új elemek:** `PURLIN_FACE_HELP`/`PURLIN_TOP_HELP` szöveg a `rafter-joints.ts`-ben (HAP_HELP mintájára); `PurlinFigure`/`PurlinMeasuringHelp` ([purlin-figure.tsx](../src/features/calculators/purlin-figure.tsx)) — a HAP-vázlattal azonos origóból, a valós `notch()` képletekkel (nem kitalált arányokkal) felépített, csukva induló séma, amely a talpszelemen- és a derékszelemen-bevágást is mutatja. A `Field.figure` unió `"hap" | "purlin"`-re bővült, a `construction-suite.tsx` `renderField` megjeleníti a `purlinTopMm` mezőnél.
- **Hatókör:** mindhárom kalkulátor, ahol a derékszelemen mező ténylegesen megjelenik — `roof.rafter-cut` (saját mezőlista) és a közös `birdsmouthFields` tömbön keresztül `roof.material-takeoff`, `roof.timber-cutlist`. Más kalkulátorban a mező nem létezik, ezért nem is kapott segédletet.
- **Ellenőrzés:** `npx eslint` PASS az érintett fájlokra; izolált worktree-ben `npm run typecheck` PASS (a worktree a nem commitolt változásokkal is lefuttatva, a futó dev szerver `.next`-je érintetlen); `npx vitest run src/features/calculators src/domain/calculations/construction` **21 fájl / 233 teszt PASS**. Böngésző (helyi dev, mentés nélkül): mindhárom kalkulátoron bekapcsolt szarufacsatlakozásokkal a mező, a mezőleírás és a „Derékszelemen mérési segédlet” csukva jelenik meg; kinyitva a vázlat két felfekvést rajzol ugyanabból az origóból (programozott DOM-ellenőrzéssel igazolva: `polygon` pontjai, két `rect.purlin-plate`, hat `text` felirat). 375 px-en vízszintes túlcsordulás 0, az összegző gomb érintési célmérete 44,8 px. Konzolhiba nem jelent meg.
- **Nem változott:** `calculateRafterJoints`, `notchValues`, mentett input/output szerződés, a már létező, élő `RafterJointDrawing`/`RoofJointDrawing` részletrajz.
- **Nem ellenőrzött / korlát:** valós ácsszakmai (nem csak geometriai) peer review nem történt; a sötét/világos téma vizuális összevetése és a teljes Vitest-regresszió/`npm run build` nem futott.
- **Javasolt Conventional Commit:** `feat(M9.10): add a purlin measuring-help sketch to the rafter-joint calculators`.

## M9.9 — Kalkulátor UI/UX modernizáció, 1. fázis: progresszív korlátlista (2026-10-26)

Státusz: **PASS WITH LIMITATIONS** (szándékosan szűk hatókör; a teljes 31 kalkulátoros modernizáció nincs elvégezve). Egy nagy hatókörű UI/UX modernizációs kérés érkezett az összes kalkulátorra; a projekt „ne kezdj általános alkalmazás-refaktorba” szabálya és a lazy-dev elv miatt a felhasználóval egyeztetve a hatókört egy megosztott komponensre és egy reprezentatív kalkulátoron (`roof.rafter-cut`, illetve ellenőrzésképp `roof.timber-cutlist` kontytetővel) való igazolásra szűkítettem. A fennmaradó 30 kalkulátor egyedi átvizsgálása és a teljes design-rendszer audit külön, jóváhagyott menetet igényel.

- **Probléma:** a `ConstructionCalculatorSuite` állapot-/korlátblokkja (`statusContent` a `construction-suite.tsx`-ben) a nem alkalmazható/nem támogatott csatlakozások listáját mindig nyitva, a `.form-message` elemen belül, elkülönítés nélkül jelenítette meg — hosszabb listánál egybefüggő szövegfalként.
- **Javítás:** a nem blokkoló `limitations` lista (amely csak a `complete` státuszú, dokumentált korláttal járó eredménynél jelenik meg) a már meglévő `GlassDisclosure` mintába került (`Nem alkalmazható vagy nem támogatott csatlakozás · N tétel`), ugyanúgy, ahogy a `RoofMaterialTakeoffSummary` „Korlátok és feltételezések” blokkja már működik. A mentésblokkoló `completeness.reasons` lista változatlanul mindig látható marad (biztonsági/blokkoló információ nem rejthető el). A `.form-message` megosztott osztály `display:grid; gap:.5rem`-et kapott, a benne lévő `ul` pedig saját térközt, hogy a cím, a leírás és a listák vizuálisan elkülönüljenek.
- **Nem változott:** `completeness` domain-logika, státuszok, menthetőség, a `limitations`/`reasons` tartalma és sorrendje, számítási eredmény, DB, szerződés.
- **Ellenőrzés:** `npx eslint` PASS az érintett fájlra; izolált worktree-ben `npm run typecheck` (next typegen + tsc) PASS a futó dev szerver `.next`-jét érintetlenül hagyva; `npx vitest run src/features/calculators` **13 fájl / 76 teszt PASS**. Böngésző (helyi dev, mentés nélkül): `roof.rafter-cut` alapállapotban („Teljes kalkulációs eredmény”), `roof.timber-cutlist` kontytetővel (2 tételes, nem támogatott gerinccsatlakozás) — a diszkloszúr csukva helyesen összegez, kinyitva pontosan a korábbi listatartalmat adja vissza; `roof.timber-cutlist` hiányos bemenettel a blokkoló okok lista nyitva maradt. 375 px-en mért vízszintes túlcsordulás 0, a diszkloszúr-fejléc érintési célmérete 44,8 px. Konzolhiba nem jelent meg.
- **Nem ellenőrzött / korlát:** a másik 30 kalkulátor, a lépcső- és betonkalkulátorok egyedi felülete, a tablet/landscape nézetek, a sötét/világos téma vizuális összevetése, a teljes Vitest-regresszió és `npm run build` nem futott (a módosítás a meglévő, már tesztelt `GlassDisclosure`/`form-message` primitíveket használja újra, nem igényelt új komponenst vagy sémát). A teljes „Liquid Glass” tipográfiai/térköz-token revízió, a kalkulátorválasztó navigáció és a rajzok/toolbar modernizálása a briefben leírtak szerint nem történt meg.
- **Javasolt Conventional Commit:** `fix(M9.9): collapse non-blocking joint limitations into a disclosure`.

## M9.8 — Váltható tetőrajz-nézetek és soha nem néma szarufa-vágásrajz (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (csak prezentáció és navigáció; számítás, szerződés, snapshot, mentés és DB változatlan).

- **Probléma:** a `roof.material-takeoff` és a `roof.timber-cutlist` rajzai egymás alá voltak halmozva, a térbeli részlet és a tetőforma pedig zárt „További nézetek” disclosure-ben; a szarufa-vágásrajz ráadásul **némán hiányzott**, ha a „Szarufacsatlakozások számítása” jelölő (a „Részletes számítás” alatt, `advanced`) ki volt kapcsolva — `planeBirdsmouthsFor` ilyenkor `null`-t ad. A felhasználó így kitöltött tetőformával sem látta, hol kell vágni.
- **Váltható nézetek:** a `RoofDrawingStack` helyére `RoofDrawingViews` lépett: Liquid Glass pirulaváltó (`GlassToolbar` + `aria-pressed` kapcsológombok, a rajz saját oldal- és csomópontválasztójával azonos minta), egyszerre egy nézet, fölötte a nézet egymondatos leírása. Négy nézet: Szarufa vágásai · Szarufaosztás · Térbeli részlet · Tetőforma. Egyetlen nézetnél nincs váltó.
- **Nincs néma hiány:** ha a csatlakozások nincsenek bekapcsolva, a „Szarufa vágásai” nézet a `RafterJointsInvitation` panelt mutatja: megnevezi a két hiányzó adatot (szarufa keresztmetszet-magassága, HAP), és a gombja bekapcsolja a jelölőt, kinyitja a „Részletes számítás” panelt és a HAP mezőre fókuszál.
- **Reszponzív:** a váltó asztalon kitölti a sort, 560 px alatt vízszintesen görgethető (a levágott következő pirula jelzi a görgethetőséget), minden gomb 44 px magas; `prefers-reduced-motion` esetén nincs átmenet.
- **Ellenőrzés:** `npx tsc --noEmit` PASS, `eslint` PASS, teljes Vitest **189 fájl PASS / 8 SKIP, 1170 PASS / 19 SKIP** (2 új teszt: a váltó csak az aktív nézetet rendereli, és a bekapcsoló panel tartalma). Böngésző (helyi dev, mentés nélkül), a felhasználó bemenetével (nyeregtető 1200×600 cm, 35°, eresz 0, osztás 25/50 cm): mindkét tetős kalkulátorban négy nézet, váltás mind a négyre ellenőrizve; a bekapcsoló gomb bepipálja a jelölőt, megnyitja a panelt és fókuszálja a HAP-ot (mérve); HAP 20 cm és 10×20 cm keresztmetszet megadása után a vágásrajz kirajzolódik. 375×812: gombok 44 px, a váltó görgethető (491/321 px), vízszintes oldaltúlcsordulás nincs. Világos és sötét témában ellenőrizve.
- **Nem változott:** a `roof.rafter-cut` eredménysorrendje (`RafterCutFlow`), a rajzok belső vezérlői és a `technical-drawing` saját „Nézetek és rétegek” panelje.
- **Korlát:** a nézetválasztás nem őrződik meg újratöltés vagy kalkulátorváltás után (munkamenetbeli állapot). `npm run build` nem futott.
- **Javasolt Conventional Commit:** `feat(M9.8): switchable roof drawing views with a guided rafter-cut entry`.

## M9.7 — Szarufarajz E2E vizuális audit és P1 javítások (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (audit + három P1 rajzi javítás; számítási eredmény, snapshot, mentés, szerződés és DB változatlan). Teljes audit: [M9.7 rajzi E2E audit](M97_ROOF_DRAWING_E2E_VISUAL_AUDIT.md).

- **Audit:** 17 tételes ellenőrzés a `roof.rafter-cut` és a `roof.timber-cutlist` szarufarajzain (kattintás-kiválasztás, zoom/pan/reset/billentyű, tetősík- és szelemenválasztók, tetőformák, mobil és sötét téma), PASS/FAIL/PARTIAL/FEATURE GAP/NOT VERIFIED besorolással és mért bizonyítékkal. A megszakadt Codex-futásból csak 5 képernyőkép maradt, ebből kettő „dark” néven világos témában készült — ez dokumentálva, a sötét téma pótolva.
- **F-03 javítva:** egyetlen érvénytelen **derékszelemen** többé nem tünteti el az egész rajzot. A `drawing` csak akkor marad el, ha a talpszelemen vagy a gerinc érvénytelen (ezek rögzítik a 0-pontot és a felső véget); az érvénytelen derékszelemen csak a saját támaszát veszíti el, és „nem számítható” státusszal, indokkal jelenik meg. Kívánt mellékhatás: a manzárd alsó tetősíkjai mostantól rajzot kapnak (síkonként egyet).
- **F-01 javítva:** a csomópont-buborékok a címkeelhelyezés elé kerültek, befoglalóik akadályok (`labelObstacles`), így a méretcímkék **elmozdulnak** róluk; a közös ütközéslista a vászon mindkét tetőoldalára érvényes. A korábban mért 88×20 px-es `Talpszelemen` × `magasság 20` átfedés megszűnt.
- **F-02 javítva:** a tükrözött tetőoldal saját buborékokat kap, így mindkét oldal kattintható, és a kiválasztás a rajzon is látszik. Telefonszélességű vásznon (< 600 px) a tükrözött oldal csak a kiválasztott buborékot mutatja; minden csatlakozás elérhető marad a gombsorból.
- **Ellenőrzés:** `npx tsc --noEmit` PASS, `eslint` PASS az érintett fájlokra, teljes Vitest **189 fájl PASS / 8 SKIP, 1169 PASS / 19 SKIP**. Böngésző (helyi dev, mentés nélkül): `roof.rafter-cut` és `roof.timber-cutlist` 1440×900 és 375×812, illesztett és nagyított nézetben **0 mért címkeátfedés**; jobb oldali buborék kattintása a részletet, az oldalgombot és a kiemelést együtt váltja; az F-03 reprodukciós bemenet (derékszelemen felső síkja 140 cm) rajzot ad. Bizonyítékképek: `docs/evidence/m97/`.
- **F-04 javítva:** a `notchValues` reason-szövegei már nem ismétlik a csomópont nevét (a `prefix` paraméter megszűnt); minden megjelenítési és mentési hely külön is megnevezi a csomópontot. `Derékszelemen: Derékszelemen: …` → cím `Derékszelemen · nem számítható` + `A támasz felső síkja eléri a szarufa felső élét.`
- **F-06 javítva:** a buborékok 44 px magas, átlátszó találati területet kaptak (a látható pirula marad 24 px), és 600 px-nél keskenyebb vásznon a leghosszabb név a megkülönböztető szavára rövidül (`Szembefutó szarufák` → `Szembefutó`; a teljes név megmarad az akadálymentes névben, a gombsorban és a részlet címében). Mérve 375×812-n: legnagyobb buborékszélesség a vászon 51% → 29%-a.
- **Nyitott / korlát:** F-05 rétegkapcsolók a szarufarajzon (FEATURE GAP, P3; új funkció, jóváhagyás kell). Zsúfolt nézetben néhány méretcímke szövege eltűnik (az érték a rajz alatti listában van, nagyításra visszajön). Valódi érintéses gesztus, fókuszgyűrű és a tetőmodell műszaki rajza nem ellenőrzött; `npm run build` nem futott.
- **Javasolt Conventional Commit:** `fix(M9.7): draw proven rafter joints and make drawing badges readable`.

## M9.6 — Szarufarajzok UI/UX finomítása (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (csak prezentáció; számítás, snapshot, mentés, teljességi státusz, DB változatlan). Forrás: [M9.5 vizuális UX-audit](M95_RAFTER_VISUAL_UX_REVIEW.md) (változatlanul megőrizve).

- **HAP-segédlet:** a pontos címke és az egymondatos mérési definíció a mező alatt marad (`aria-describedby`); a `HapFigure` alapból zárt „HAP mérési segédlet” `GlassDisclosure`-ba került (natív `details`, 44,8 px-es összefoglaló, látható fókusz) mindhárom kalkulátorban. Az ábra négy referenciája változatlan; a képaláírás már nem ismétli a mezőhelpet („Vázlat, nem méretarányos. A mérés helye a külső függővágási sík (x = 0).”).
- **Szarufa kiszabása:** új sorrend (`RafterCutFlow`): állapot → méretezett szarufa-áttekintő + „Mit hol jelölj” lista → csatlakozásválasztó → kiválasztott részletrajz + „Ennyit kell bevágni” → fő eredmények → „Csomópontok · állapot és szakmai korlátok” → zárt „Részletes eredmények és kiindulási adatok” → mentés. A `RafterJointsPanel` állapotot és D-korlátokat nyitva mutat, az összes A/B értéket zárt „Csomópontok összes értéke” listában (adat nem törlődött).
- **Tetőanyag-kimutatás és faanyag-vágáslista:** az eredmények (anyagösszesítő, illetve vágáslista és kritikus hiányok) a rajzok elé kerültek (`RoofDrawingStack`): közös szarufa-metszet a hozzá tartozó részlettel → geometriai szarufavonalak → zárt „További nézetek” (térbeli szarufarészlet és általános tetőrajz). Eltérés a briefhez képest: a kiválasztott csatlakozás részlete az audit P1.4 pontja szerint közvetlenül a közös metszet alatt maradt, nem a szarufavonalak után.
- **Rajz:** a rajz és méretlistája, illetve a részletrajz és a bevágási blokk egy csoportban, ≥ 45 rem széles rajzszekciónál (container query) egymás mellett, mobilon egy oszlopban. A rajzvásznak opak háttere eltakarja a globális pontmintát. A részletrajz lépésszámai akadályként szerepelnek a feliratelhelyezésben, így a „2” már nem fedi az „ülék” értéket. Zoom/pan/csippentés/billentyű/reset és tetőoldalválasztás változatlan.
- **Ellenőrzés:** új `rafter-result-flow.test.tsx` (5): HAP-disclosure zárt + négy referencia + mindhárom kalkulátor mezőszerződése, kiszabási és tetős DOM-sorrend, zárt további nézetek, panelben minden érték megvan zárt listában, lépésszám–felirat ütközésmentesség (a javítás nélkül piros, vele zöld). Teljes Vitest **189 fájl PASS / 8 SKIP, 1169 PASS / 19 SKIP**; `npm run lint` PASS; izolált másolatban `npm run typecheck` és `npm run build` PASS (a futó dev szerver `.next`-je érintetlen); `git diff --check` PASS. Böngésző (helyi dev, mentés nélkül; szimulált viewport): 375×812 sötét (üres, hiányos, teljes kiszabás; vágáslista és anyagkimutatás teljesen), 812×375, 1440×900 világos; HAP-disclosure nyitás/zárás, vízszintes túlcsordulás 0, DOM-sorrend mindhárom kalkulátorban, „További nézetek” megnyitva rajzol, érvénytelen HAP → nincs vágási rajz. Szimulált pointer: egyujjas touch nem mozgat, kétujjas pinch 100→200%, „0” reset.
- **Nem ellenőrzött / korlát:** valódi érintőképernyős natív görgetés és pinch (csak szimulált pointer és számított `touch-action`); hitelesített mentés nem futott. 1440 px-es desktopon a rajzszekció a menük miatt kb. 740 px, ezért a kétoszlopos rajz kb. 465 px széles. Anyagkimutatásban szarufa nélkül az általános tetőrajz is a zárt „További nézetek” alatt van, így a mérésfókusz-kiemelése csak megnyitva látszik. A konzolban a köztes szerkesztés HMR parse-hibái maradtak naplóban; a végleges kód fordul.
- **Javasolt Conventional Commit:** `feat(M9.6): reorder rafter calculators around the dimensioned drawing`.

## M9.5 — Közös szarufa-áttekintő, szelemen- és gerinccsatlakozás a tetős kalkulátorokban (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [független audit](CLAUDE_ROOF_ENGINEERING_REVIEW.md) CRR-01–CRR-09 megállapításait kezeli (az audit szövege változatlan; CRR-10 history-átírás nélkül marad).

- **Inputmodell (döntés, tartós szerződésváltozás nélkül):** a `roof.material-takeoff` és `roof.timber-cutlist` előre deklarált lapos mezőket kapott, a `roof.rafter-cut`-tal azonos kulccsal és jelentéssel (`purlinFaceMm`, `purlinTopMm`, `ridgeJoint`, `ridgeBoardThicknessMm`, `ridgePurlinWidthMm`, `ridgePurlinTopMm`), progresszívan: Talpszelemen + HAP → opcionális Derékszelemen → gerinckapcsolat → csak a választott típus adatai (`visibleWhen` több feltétellel, gerincmezők csak gerincet adó formáknál). Az adatok a fő tetőoldal saját függőleges metszetében értendők; csak az azonos hajlású és futású, eresszel párhuzamos gerincre futó síkokra alkalmazzuk, minden más síkon explicit `unsupported` okkal. `construction-suite.input.v1`/`output.v1` marad; DB-migráció nincs (a restricted writer RPC tetszőleges további output-kulcsot elfogad). Régi M9.3/M9.4 revízió: az új kulcsok `initial`/üres értékkel hidratálódnak, nem lesz hamis „módosított” (teszt).
- **Domain:** `plane-birdsmouth.ts` per-plane adapter lett: minden S1/S2/S3 érték továbbra is a `calculateRafterJoints`-ból jön (új képlet nincs). Új `RafterJointResult` állapotok: `not-applicable`, `unsupported` (csak az adapter adja). `planeJointStatuses` (mentett `jointStatus` provenance) és `roofSectionViews` (két szemközti, azonos metszetű sík közös keresztmetszete). Közös megnevezés: `jointName`/`RIDGE_JOINT_NAME` (Talpszelemen, Derékszelemen, Szembefutó szarufák, Gerincdeszka, Gerincszelemen, ill. „Felső vég” nem modellezett felső végnél); az S1–S3 csak belső azonosító. Gerincdeszka 0 vastagság → `invalid` (korábban hiányzónak számított).
- **Támogatottság (táblavezérelt teszt, 8 forma):** nyereg: mindkét sík S1/S2/S3; félnyereg: S1/S2, felső vég `unsupported` (felső támasz nincs modellezve); konty: főtetősíkok S1/S2/S3, kontyos vég síkjai S3 `unsupported` (gerinc végpontja); sátor: S3 mindenütt `unsupported` (kontyél); félkonty: fősíkok teljes, félkonty-vég síkok S2/S3 `unsupported` (eltérő futás); L/T: fősíkok teljes, szárnyak S2/S3 `unsupported`; manzárd: alsó sík S1 (S2 a futáson belül), felső vég `unsupported` (törésvonal), felső síkok `not-applicable`. Kontyél- és vápaszarufa nincs a layoutban, rájuk vágás nem készül.
- **Számítás/mentés:** `computeConstruction` közös mezőszerződése (`fieldContractIssues`, CRR-07) kliensen és Server Actionben is: megadott, de nem szám / negatív / tiltott 0 / 1 000 000 mm feletti / nem választható érték → `invalid`, nem menthető (az action az első okot adja vissza). `completeness.limitations` (CRR-03): `not-applicable` és `unsupported` nem blokkol, de a státusz „Teljes eredmény a támogatott csatlakozásokra · dokumentált korláttal”, és az output `jointStatus` síkonként/csatlakozásonként megőrzi okkal. `isCompleteConstructionOutput` elutasítja a hiányos/hibás `jointStatus`-t, régi outputot változatlanul elfogad. Mentett sorok: `Madárszáj · …` (változatlan), új `Derékszelemen · …`, `Gerincszelemen/Gerincdeszka · …` (hajlásonként egyszer).
- **Rajz:** új „Szarufák és támaszok · áttekintő” (`RoofJointDrawing`) a tetős kalkulátorokban: nyeregnél a bal sík és a tükrözött jobb sík egy keresztmetszetben, mindkettő a saját `calculateRafterJoints` eredményéből (`mirrorRafterJointDrawingModel`); egyező értékű jobb oldalon a méretek/címkék nem duplikálódnak; több metszetnél tetőoldal-választó. Alatta „Mit hol jelölj · a szarufa alsó végétől” lista és közvetlenül „Szarufa- és szelemenkapcsolat · részlet” (oldal- és csatlakozásválasztó gombok `aria-pressed`-del, valódi vágáskontúr, „Ennyit kell bevágni · …”). A korábbi kompakt madárszáj-blokk a szarufavonal-nézetből ide költözött. Látható keret: geometriai szarufavonalak, nem framing terv + `physicalLayout.reason`, konty/vápa figyelmeztetés, nem alkalmazható síkok és nem támogatott csatlakozások listája.
- **CRR-01 HAP:** címke „HAP · szarufa felső élének magassága a talpszelemen felett”, mérési definíció a mező alatt (`aria-describedby`), vázlatos referenciaábra (talpszelemen felső sík, külső függővágási sík, felső él, függőleges HAP) mindhárom kalkulátorban; a mentett input „Kiindulási adatok” visszanézetében is megjelenik.
- **CRR-02/09:** „Geometriai szarufavonalak · tetősíkonként” cím, „vonal” darabnyelv, `physicalLayout.reason` mindig látható; felső élcímke csak homogén végcsoportnál, különben „vegyes felső végek – lásd a listát”. Az M8 rajz címe „Szarufatengelyek · térbeli közeli nézet”.
- **CRR-04/05/08:** egyujjas érintés a rajzon mindig oldalgörgetés (`touch-action: pan-y`, egyujjas touch nem mozgatja a kamerát), két ujjal pan + pinch; egér húzás/görgő, billentyűk, reset változatlan. `useFontSize` `MutationObserver`-rel követi a `--tp-text-scale` élő váltását. Akadálymentes összefoglaló állapotfüggő: fit / no-fit / nincs szélesség és minden csatlakozás állapota. Az áttekintőn az egymást takaró érték felirata elmarad (a vonal marad), az érték a rajz alatti listában szerepel.
- **Ellenőrzés:** célzott Vitest: `plane-birdsmouth` 17 (3-4-5 és 45° független kézi értékek, 8 formás mátrix, párosítás, gerincdeszka/nevek/sorok), `construction-computation` 31 (S2/S3 nyeregen független képlettel, hiányos/hibás pár, manzárd/félnyereg korlát + `jointStatus`, mezőláthatóság, régi revízió nem dirty, 7 manipulált mezőeset, output-guard), `construction-actions` 5 (manipulált kérés nem ír), rajzok 9 + 3 + domain tükrözés. Teljes Vitest **188 fájl PASS / 8 SKIP, 1164 PASS / 19 SKIP**; `npm run lint` PASS; izolált másolatban `npm run typecheck` és `npm run build` (Next 16.4.2 webpack) PASS (a futó dev szerver `.next`-je érintetlen); `git diff --check` PASS. Böngésző (helyi dev, mentés nélkül): 375×812 sötét/világos, 812×375, desktop: HAP-ábra, nyereg mindhárom csatlakozással (bal/jobb, derékszelemen 8,3/9,9/6,3 cm = kézi érték), konty és manzárd korlátlista, vízszintes túlcsordulás 0, konzolhiba 0; szintetikus pointer: egyujjas touch nem mozgat, egér húzás mozgat, kétujjas pinch 100→200%, billentyű +/0, reset; `--tp-text-scale` 1,3 → felirat 13 → 16,9 px újramount nélkül.
- **Nem ellenőrzött / korlát:** valódi érintőképernyős natív oldalgörgetés (csak számított `touch-action` és szintetikus pointer); hitelesített mentés böngészőben és DB E2E nem futott (`npm run db:test` a korábbi helyi migrációs állapot miatt nem futtatva). Eltérő bal/jobb hajlás a jelenlegi tetőbemenetből nem adható meg, ezért párosítás csak azonos metszetnél van. Statikai megfelelőség, megengedett bevágás, kontyél-/vápaszarufa és manzárd-töréscsomópont nincs; ács/statikus szakmai review nem történt.
- **Javasolt Conventional Commit:** `feat(M9.5): unify rafter overview and purlin joint details`.

## M9.4 — Madárszáj a tetős kalkulátorokban, 1. fázis (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. Jóváhagyott döntések: **D1** a tetősík a szarufa felső éle, a tető szélességének széle (nyereg/félnyereg: a kiülés nélkül) a talpszelemen külső síkja; **D2** új mező „Madárszáj vízszintes vágásának magassága”; **D3** más tetőformán nincs új ereszkiülés-mező; **D4** opcionális „Talpszelemen szélessége · ellenőrzéshez” mindhárom kalkulátorban; **D5** gerinc-/derékszelemen a tetős kalkulátorokban későbbi fázis. Skill: `test-driven-development` (minden új viselkedés RED → GREEN).

- **Domain:** új `plane-birdsmouth.ts`: tetősíkonként az eresznél kezdődő leghosszabb szarufából a vízszintes futás és a kiülés (`−z / tanα`), majd a meglévő `calculateRafterJoints` talp-csomópontja (új képlet nincs; a madárszáj csak α, h és HAP függvénye, így a konty rövid szarufáira is ugyanaz). Ereszen nem kezdődő sík (manzárd felső) → „nem értelmezett”. `plateFitOf` (rafter-joints): ülék ≤ talpszelemen-szélesség, csak geometriai. `edgeKindAt` a számítási rétegbe költözött (`roof-geometry-edges.ts`).
- **Kalkulátorok:** `roof.material-takeoff` és `roof.timber-cutlist` új mezői (Részletes számítás): „Madárszáj számítása a szarufákhoz” jelölő, alatta a madárszáj magassága és a talpszelemen szélessége. A szarufa magassága a szarufa-keresztmetszetből jön. Csak bekapcsolt jelölő + kért szarufaszámítás esetén számol; hiány → „Hiányos” konkrét listával, érvénytelen → „Nem számítható” (QA-04 szabály). Mentett sorok: „Madárszáj · {hajlás}° · …” hajlásonként egyszer. A „Szarufa kiszabása” kapott talpszelemen-szélesség mezőt (sor nélkül, csak kijelzés).
- **Kijelzés:** a Szarufa-elrendezésben a kiválasztott tetősík alatt „Madárszáj ezen a tetősíkon”: a meglévő részletrajz (S1, lépésszámokkal) és „Ennyit kell bevágni” doboz; az 1. lépés a szarufa alsó végétől mér (kiülés / cosα), a 0-pont itt rejtve; talpszelemen-ellenőrzés („ráfér” / „nem fér rá, X cm-rel túlnyúlik”). Az eresz-végvágás szövege erre mutat.
- **Mentés/adat:** DB-migráció nincs — a `private.is_complete_construction_snapshot` tetszőleges `fields` objektumot és számszerű sorokat fogad. Régi revízió: a `comparableConstructionInput` az új kulcsokat üresen pótolja, így nem lesz „Mentetlen módosítás” (teszt), és madárszáj-sor sem keletkezik.
- **Ellenőrzés:** új Vitest: tetősík-madárszáj 6 (3-4-5 kézi érték 150/200/120/80 = kiszabás-kalkulátor, konty 45° minden síkon 182,84, manzárd felső sík nem értelmezett, hiány/HAP 0, talpszelemen ráfér/túlnyúlik, sorok hajlásonként), kalkulátor-integráció 4 (teljes, hiányos, kikapcsolt = változatlan sorok + régi revízió, takeoff szarufa nélkül), rafter-joints 1, komponens 3. Teljes Vitest **188 PASS / 8 SKIP fájl, 1133 PASS / 19 SKIP teszt**; `eslint .`, `tsc` PASS; `npm run typecheck` + `next build --webpack` ideiglenes másolatban PASS. Böngésző 375 px sötét: faanyag-vágáslista nyereg 10×6 m, 45°, 60 cm, 8×20 cm: jelölő → „Hiányos · Madárszáj vízszintes vágásának magassága”; 10 cm → „Teljes”, 18,3 / 18,3 / 12,9 cm, 7,1 cm marad (= 200/cos45 − 100 stb.), talpszelemen 15 cm → „nem fér rá, 3,3 cm-rel túlnyúlik”; konty 3. sík ugyanígy; túlcsordulás 0.
- **Nem futott / korlát:** tényleges mentés hitelesített böngészőben nem futott (a szerver ugyanazt a `computeConstruction` utat használja; DB-ellenőrzés nem kellett). Konty/sátor/félkonty/L/T/manzárd: nincs ereszkiülés (D3), ezért a madárszáj a szarufa alsó végén van. Kontyél-/vápaszarufa és a rövid szarufák felső vágása, félnyereg felső támasza, gerinc-/derékszelemen a tetős kalkulátorokban (D5): nem része.
- **Javasolt Conventional Commit:** `feat(M9.4): per-plane birdsmouth in roof takeoff and timber cut list`.

## M9.3 — Szarufa-elrendezés és kijelölési lépések minden szarufás kalkulátorban (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (megjelenítés; számítás, kiosztómotor, mentés, DB változatlan). Skill: `test-driven-development` (RED → GREEN mindhárom új viselkedésre).

- **Szarufa kiszabása:** a részletrajzon 1–4 lépésszám ott, ahol a lépés történik (1 jelölés a felső élen, 2 függővonal, 3 bevágás sarka, 4 ülék), egyezik az „Ennyit kell bevágni” doboz számozott lépéseivel.
- **Tetőanyag-kimutatás (bepipált szarufával) és faanyag-vágáslista:** új „Szarufa-elrendezés · kiosztási terv” (`rafter-layout.ts` + `RafterLayoutDrawing`) az M8-részlet előtt: a választott tetősík valós méretben (kiterítve), számozott szarufák, osztás (1–2), teljes szélesség (1–n), leghosszabb szarufa hossza, cm alapértelmezés; tetősík-választó; lista: darabszám, tényleges osztás, hajlás, „n db × hossz” csoportok, végek vágása, összecsukható „Szarufák helye az 1. szarufától”. Végvágás: gerinc/felső él → függővágás 90° − hajlás a szarufa éléhez; eresz → madárszáj, méretei a „Szarufa kiszabása” kalkulátorban (talpszelemen- és madárszáj-adat kell); kontyél/vápa → „ferde (kettős) vágás, a rendszer nem számolja”. Forrás kizárólag a meglévő `RoofTimberLayout` szakaszok és a tetőgeometria élei (M8 `edgeKindAt` újrahasznosítva).
- **Ellenőrzés:** új Vitest: elrendezés-modell 4 (18 szarufa, 588,24 mm, 0…10 000 mm, 5000 mm, valós méret 10 000 × 5000, gerinc 36,87°, eresz érték nélkül; konty: kontyél-végű jack szarufák, több hosszcsoport, darabösszeg; síkválasztás, null), komponens 2, lépésszám 1. Teljes Vitest **187 PASS / 8 SKIP fájl, 1119 PASS / 19 SKIP teszt**; `eslint .`, `tsc` PASS; `npm run typecheck` + `next build --webpack` ideiglenes másolatban PASS (fő `.next` érintetlen). Böngésző 375 px sötét: faanyag-vágáslista nyereg 10×6 m, 45°, 60 cm → 18 db, 58,8 cm, 1–18: 1000 cm, 18 × 424,3 cm; konty: 4 tetősík (16/16/9/9), 3. sík 1 × 424,3, 2 × 339,4, 2 × 254,6, 2 × 169,7, 2 × 84,9 cm, 8 kontyél-végű; szarufa kiszabása: 4 lépésszám; túlcsordulás 0.
- **Korlát:** a konty háromszög síkjának középső szarufája a gerinc végpontjába fut, ezért „gerinc” függővágásként jelenik meg — szakmailag ellenőrizendő. Az elrendezésben a madárszáj méretei nem számolhatók (talpszelemen, madárszáj-magasság és a tetősík ↔ szarufa felső él viszonya nem bemenet), ezért nincs automatikus átadás a „Szarufa kiszabása” kalkulátorba. Valódi érintőképernyő nem tesztelt.
- **Javasolt Conventional Commit:** `feat(M9.3): rafter layout plan and marking steps across rafter calculators`.

## M9.2 — Szarufarajzok cm-ben, egyszerűbb leolvasás (2026-10-25)

Státusz: **PASS** (csak megjelenítés; számítás, mentett eredménysorok és a „Csomópontok” táblázat változatlan, mm).

- **cm alapértelmezés:** a szarufa-kiszabási rajz és az M8 axonometrikus szarufa-részlet is cm-ben indul (mm/m választható). A cm 0,1 cm-re (= 1 mm) kerekít, közös `formatDrawingLength` mindkét rajzban; a rajz sarkában „méretek: cm”.
- **Egyszerűsítés:** a rajzon szavas rövid feliratok („függő 15”, „ülék 20”, „bevágás 12”, „marad 8”, „teljes hossz 550”, szög csak „53,1°”) a ↕/↔/⊥/∠ jelek helyett; az „O” helyett „0” pont; az A/B/C/M betűk és a pontlista elhagyva. A rajz alatt „Mit hol jelölj a szarufán” lista (teljes hossz, magasság, ereszvég / S1–S3 / gerincvég a 0-ponttól), a részlet alatt teljes nevű sorok (pl. „Bevágás mélysége · a szarufára merőlegesen”), színes jelmagyarázat („Itt kell vágni”, „Ez a rész esik ki”, „Jelölővonal”, „Méret (cm)”), rövid figyelmeztető szöveg. Rajzfelirat 13 px × szövegskála.
- **Ellenőrzés:** célzott Vitest 34/34 (cm: 2468,75 mm → 246,9 cm; M8: 500 cm, 58,8 cm); teljes Vitest **185 PASS / 8 SKIP fájl, 1113 PASS / 19 SKIP teszt**; `eslint .` és `tsc --noEmit` PASS (typegen/build nem futott, a fő `.next` érintetlen). Böngésző 375×812 sötét és világos: főrajz, lista, S1 részlet, jelmagyarázat; vízszintes túlcsordulás 0.
- **Finomítás (olvashatóság):** a méret- és szögértékek kitöltött címkén („pill”) állnak, így nem futnak rá a fára, sraffozásra és méretvonalakra; a 0-pont kiemelt címke; széles (≥ 600 px) vásznon 1,2× betűméret; „Méretek: cm” az eszköztárban (nem takarja a rajzot); a listák széles képernyőn több oszlopba tördelnek, hangsúlyosabb értékkel. Teljes Vitest **185 PASS / 8 SKIP fájl, 1113 PASS / 19 SKIP**; `eslint .`, `tsc` PASS; böngésző: desktop világos és 375 px sötét, túlcsordulás 0.
- **„Mennyit kell bevágni” (kijelölési útmutató):** a kiválasztott csatlakozás részletrajza alatt kiemelt doboz a három fő számmal (függővágás az alsó éltől a függővonalon, ülék a sarokból merőlegesen, bevágás mélysége + megmaradó magasság), és az ácsok kijelölési sorrendjében 5 számozott lépés: hely a 0-ponttól → függővonal a felső éllel bezárt szöggel (eresz felőli oldalon, 90° − α) → függővágás felmérése az alsó éltől → ülék merőlegesen a gerinc felé → kivágás és ellenőrzés a megmaradó magassággal. Végvágásnál / bevágás nélküli felfekvésnél rövidített lépések. A részletes méretlista „Összes méret és szög” alá csukva. Csak a meglévő csomópontértékek; a bevágás megengedett mértékéről (pl. gyakorlati 1/3-os ökölszabály) a rendszer továbbra sem dönt.
- **Javasolt Conventional Commit:** `feat(M9.2): show rafter drawings in cm with plain-language labels`.

## M9.1 — Szarufa-kiszabási rajz és vágásjelölések (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (a meglévő M9 rajz finomítása; számítási szerződés, snapshot, DB változatlan).

- **Főrajz:** a szarufa kontúrja (felső él, alsó él a bevágásokkal) mellett külön kiemelt vágásélek: mindhárom bevágás függő- és ülékvágása, ereszvég és (gerincszelemennél) gerincvég függővágása; sraffozott kivágandó rész; „felső él / alsó él” felirat; **O** közös mérési kiindulópont = az S1 függővágás jelölővonala a felső élen; lánc O-tól, h ⊥ keresztmetszet és L. A rajz alatt mindig látható „Kiszabási méretek” lista: teljes hossz, h, ereszvég / S1 / S2 / S3 / gerincvég helye O-tól a felső él mentén és a láncméretek — a rajzon helyhiány miatt elhagyott felirat itt megvan.
- **Részletrajz:** A (függővágás az alsó élen), B (függő- és ülékvágás metszéspontja), C (ülék vége), M (jelölőpont a felső élen; S1-nél M = O) pontok; jelölővonal B→M; ↕ függőleges, ↔ vízszintes, ⊥ merőleges méret, ∠ vágási szög a szarufa tengelyéhez (az ív a vágásban, az érték mutatóvonallal a csúcson túl). „Hely: O → M” sor. Gerincdeszka / szembefutó gerincnél csak végvágás, kitalált bevágás nélkül. Feliratok: a meglévő ütközésfeloldás + új `nudgeOffSegments` (felirat nem kerül vágásélre), vásznon tartás.
- **Zoom:** a fő- és részletrajz közös `InteractiveCanvas` vásznon (zoom gomb/görgő/csippentés/húzás/billentyűk); a részlet saját „Részlet visszaállítása” gombot kapott, csatlakozásváltáskor a saját alapnézetére áll. Kezdőnézet: a geometria befoglalója + a betűmérethez kötött feliratsáv. Dupla koppintás a fő rajzon a csatlakozást egy szarufamagasságnyi környezettel mutatja (a 3-4-5 adatnál 454%, korábban 862%), felső korlát 14×. Mértékegység: mm (táblázattal azonos kerekítés), cm, m ugyanabból a 0,1 mm-re kerekített értékből.
- **Domain:** `rafter-joint-drawing.ts` csak a meglévő pontokat rendezi: `cut` (kivágandó háromszög, vágásélek, jelölővonal, A/B/C/M), `positionMm`, `origin`, `endCuts`, `stations`, `depthMm`; kisebb fókuszmargó. Új geometriai képlet nincs; S2 helye a táblázat „Felfekvés távolsága” értéke, S3/gerincvég helye x/cosα.
- **Ellenőrzés:** új/bővített Vitest (domain 9, komponens 3): kontúr ↔ méretpontok azonossága, függő/ülék él iránya és hossza, ⊥ mélység + ⊥ maradék = h, ⊥ ≠ ↕, O → M távolság = hely, láncösszeg = L, 10° és 70° hajlás, 2 mm-es bevágás, gerincdeszka/szembefutó végvágás, felirat-eltolás vágásélről, mm/cm/m. Teljes Vitest **185 PASS / 8 SKIP fájl, 1113 PASS / 19 SKIP teszt**; `eslint .` PASS; `tsc --noEmit` PASS; `npm run typecheck` és `next build --webpack` csak ideiglenes másolatban (a fő `.next` és `next-env.d.ts` érintetlen).
- **Böngésző (helyi, mentés nélkül):** 375×812 sötét: főrajz, lista, S1/S2/S3 részlet; részlet-csippentés 200%, S-váltás → 100%, + → 125%, visszaállítás 100%; dupla koppintás S2 → 454% és S2 kiválasztva; vízszintes túlcsordulás 0. Desktop világos: S1 részlet. cm/m váltás (550 cm, 5,5 m; 15/20/12/8 cm). Szembefutó gerinc, gerincdeszka (O → M 4968,8 mm), hiányzó szarufa-magasság (rajz tiltva, hiánylista).
- **ConstructionSavePanel konzolhiba:** szervezeti URL-lel, mentett faanyag-revízióból, kalkulátorváltással és újrakitöltéssel sem reprodukálódott; a konzolban csak az M9 alatti, HMR-időszaki egyetlen bejegyzés látszik. Kód szerint a `definition` a suite-ban mindig objektum, undefined csak a dinamikusan betöltött definíciómodul hiányos állapotából eredhet (valószínűleg HMR). Nem javítva, külön megfigyelés.
- **Korlát:** a talp- és derékszelemen szélessége, a szelemenmagasság és a gerincdeszka magassága nem bemenet: az ülék felfekvése nem ellenőrzött, a szelemenek vázlatosak. Kis bevágásnál (pl. 50 mm a 200 mm-es szarufán) a részlet alapnézete a teljes keresztmetszetet mutatja, a bevágás nagyításhoz a részletzoom kell; helyhiánynál a szögív elmarad (érték a listában). Valódi érintőképernyő nem tesztelt. Az ereszvég végvágása függőleges (meglévő modell).
- **Javasolt Conventional Commit:** `feat(M9.1): rafter cutting drawing with cut edges, marking points and detail zoom`.

## M9 — Méretezett szarufarajz a három szelemen-csatlakozással (2026-10-25)

Státusz: **PASS WITH LIMITATIONS** (a „Szarufa kiszabása” kalkulátor rajza kész; az anyagos kalkulátorok M8-as axonometrikus részlete változatlan, ott a csomópontadat továbbra sem bemenet).

- **Működés:** a `roof.rafter-cut` rajzterületén a korábbi „a/b/L” sematikus háromszög és a „Csomópontok” panel méret nélküli metszete helyett `RafterJointDrawing`. Forrás kizárólag a `calculateRafterJoints` kimenete (`src/domain/drawings/rafter-joint-drawing.ts`): a pontok a meglévő körvonalból és támaszokból, minden felirat a csomópont-táblázat ugyanazon értéke (vagy két modellpont távolsága a felső él mentén). S1 talpszelemen, S2 derékszelemen, S3 gerincszelemen / gerincdeszka / szembefutó gerinc; hiányzó derékszelemen „nincs megadva”, gerincszelemen nélkül nincs kitalált S3-bevágás. Fő rajz: felső él menti lánc (eresz–S1–S2–S3–gerinc) és teljes hossz; részletnézet: függővágás, ülékhossz, ⊥ bevágási mélység, ⊥ megmaradó magasság, függő- és ülékvágás szöge a szarufa tengelyéhez (nem a tetőhajlás). A támasz nem bemenet-kiterjedése (talp-/derékszelemen szélessége, magasság) szaggatott, vázlatos. Hiányzó szarufa-magasságnál vagy érvénytelen csomópontnál nincs metszet, csak a konkrét hiány/ok. Minimális adatbővítés: a `RafterJointDrawing` típus `rafterDepthMm`, `ridgeAxisXMm`, `ridgeJoint` mezőt kapott (nem perzisztált; a mentett eredménysorok változatlanok).
- **Nézet:** px-alapú SVG (ResizeObserver), a feliratok nagyításkor nem skálázódnak, `--tp-text-scale`-t követnek; a kezdő kamera a három csatlakozás befoglaló dobozát illeszti a tényleges vászonra, a „Teljes rajz” a teljes szarufát. Zoom gombok/görgő/csippentés, húzás, nyilak/+/−/0, dupla koppintás → legközelebbi csatlakozás fókusza és kiválasztása. Kézi nézet megmarad inputváltozáskor, a csatlakozás-szerkezet (támaszok, gerinctípus) változásakor visszaáll. Feliratütközés: a meglévő `resolveAnnotationLabelPositions`; vásznon kívüli méretvonal felirata nem jelenik meg, a képernyőn túl rövid méret és a hely nélküli szögív kimarad (érték a jelmagyarázatban).
- **Ellenőrzés:** új Vitest: modell 5 (független 3-4-5 kézi értékek: S1 150/200/120/80, S2 ⊥40, S3 60/80; minden méretvonal geometriai hossza = felirata; lánc 500 + 2500 + 2400 + 100 = 5500 = `calculateRafterGeometry` teljes hossz; gerincdeszka 5500 − 31,25; hiányzó/érvénytelen → nincs metszet; kamera illesztés/zoom-fixpont/pan), komponens 2. Teljes Vitest **185 fájl PASS / 8 SKIP, 1108 PASS / 19 SKIP**; `npm run lint` (egy nem használt konstans javítása után a módosított fájlokra újrafuttatva), `npm run typecheck` és utána `tsc --noEmit` PASS; izolált `next build --webpack` ideiglenes másolatban PASS. DB-változás nincs, pgTAP nem futott.
- **Böngésző (helyi, mentés nélkül):** 375×812 sötét és világos, desktop sötét. Mindhárom szelemennel: fő rajz 500/2500/2400/L = 5500, S1/S2/S3 részlet a táblázattal azonos értékekkel; zoom gomb 125% megmarad S-váltáskor; dupla koppintás S2-re → 862% és S2 kiválasztva; „Teljes rajz” 94%, visszaállítás 100%; szintetikus kétujjas csippentés 60 → 180 px = 300%. Szembefutó gerinc + derékszelemen nélkül: S2 „nincs megadva”, S3 függővágás 53,1°. Gerincdeszka 50 mm: L = 5468,8. Szarufa-magasság nélkül: „A méretezett szarufarajz nem készíthető” + hiánylista, nincs körvonal. Vízszintes túlcsordulás 0 (scrollWidth = 375).
- **Nem ellenőrzött / korlát:** valódi érintőképernyő (csak szintetikus pointer); a részletnézet statikus illesztett nézet (nem nagyítható külön); a ResizeObserver nélküli környezet 360×280-as tartalékmérettel rajzol. A talp- és derékszelemen szélessége nem bemenet (ülék ráférése nem ellenőrzött), az eresz végvágása továbbra is függőleges. Az anyagos kalkulátorok axonometrikus részletéhez nincs csomópontadat, ezért ott S-bevágás nem jelenik meg. A futó dev szerver mellett az `npm run typecheck` `next typegen` lépése a fő `.next` típusait írta (nem izoláltan); az általa átírt `next-env.d.ts` visszaállítva. Egy `ConstructionSavePanel` konzolhiba (`definition` undefined) HMR közben egyszer megjelent, friss betöltés és újrakitöltés után nem ismétlődött; a komponens nem változott.
- **Javasolt Conventional Commit:** `feat(M9): dimensioned rafter drawing with S1–S3 purlin joint details`.

## QA-10 — Staging migration, multi-user Auth/RLS és release gate (2026-10-25)

Státusz: **PREFLIGHT BLOCKED; STAGING/PRODUCTION NOT MODIFIED**. A [részletes preflight](QA10_STAGING_RELEASE_VALIDATION.md) szerint a checkout nincs Supabase-projekthez linkelve, a lokális env csak `127.0.0.1` célpontokat tartalmaz, a CLI-hez nincs access token, a Supabase MCP projektleltár pedig nem érhető el. Emiatt az elkülönített staging célpont, remote migration history/sémadrift, backup/PITR, backfill, writer credential és staging app-verzió nem bizonyítható; a kötelező döntési kapu előtt megálltam.

- Nem történt staging- vagy fő helyi DB-írás, migráció, linkelés, reset/repair, fixture, credential-módosítás, deploy, commit vagy push.
- A forrás 119 migrációt tartalmaz, utolsóként a `20261025154642_qa08_rpc_trust_boundary.sql` fájlt. A távoli hiánylista nem ismert, ezért nem állítható, hogy kizárólag ez az egy migráció vár alkalmazásra.
- Backup/restore és többfelhasználós Auth/RLS E2E nem futott. A következő kapuhoz exact staging project ref, read-only hozzáférés, staging app SHA és bizonyított backup/PITR + elkülönített restore-próba szükséges; a migrációhoz ezután is külön konkrét jóváhagyás kell.
- Javasolt Conventional Commit: `docs(QA-10): record blocked staging release preflight`.

## QA-09 — RPC migrációintegráció, Auth E2E és release readiness (2026-10-25)

Státusz: **COMPLETE az elkülönített helyi hatókörre; READY FOR CONTROLLED STAGING ROLLOUT; fő helyi/hostolt DB NOT APPLIED**. A [részletes bizonyíték](QA09_MIGRATION_INTEGRATION_READINESS.md) szerint a teljes 119 migrációs lánc, a restricted writer, a privát attesztáció, a downstream guardok és a tényleges Next.js + Supabase Auth workflow egy külön helyi Supabase-projektben működik. A fő helyi DB továbbra is `20261025140000`, attesztációs tábla nélkül; a meglévő dev szerver nem állt le.

- TDD-ben bizonyított backfill-hiba: a korábbi `server_recomputed` metaadat + struktúra egy ledger nélküli hamis fixture-t is attesztált (**5/5**). A migráció most csak pontos immutable revízió ↔ korábbi restricted-writer operation-ledger egyezést fogad; GREEN: **4 legitim, 0 hamisított, 0 mismatch**. Az új globális pgTAP állítás miatt a teljes DB suite **62 fájl / 1319 PASS**.
- Valódi authenticated böngészős E2E: hiányos mentés tiltott; szarufa V1→V2→történeti V1→V3; új munkanapló és pontos V3-link; vágáslista V1-ből forráskulcsos ajánlati sor, mentés és újranyitás. DB-bizonyíték: **4/4 E2E revízió attesztált + ledgerelt, 1 munkanapló-link, 1 ajánlatforrás, 0 attesztáció/ledger eltérés**.
- Régi upgrade-snapshot: 4/4 korábbi writer-revízió backfillelt; régi revízió authenticated olvasása/új linkje és aktív történeti kapcsolat leválasztása rollbackelt tranzakcióban sikeres. Teljes Vitest **183 PASS / 8 SKIP fájl, 1101 PASS / 19 SKIP teszt**; lint, izolált typecheck és Next 16.4.2 webpack build PASS; DB lint 0 error, korábbi független warningokkal.
- Hostolt rollout továbbra is blokkolt a backfill dry-run kézi jóváhagyásáig, igazolt backup/PITR restore-ig, szerveroldali writer credential preflightig és többtagú staging Auth/RLS smoke-ig. A rollback nem tekinthető veszteségmentesnek; fail-closed + roll-forward az elsődleges recovery.
- Javasolt Conventional Commit: `fix(QA-09): harden RPC backfill and prove release readiness`.

## QA08-RPC-01 — Calculation RPC trust boundary (2026-10-25)

Státusz: **COMPLETE a helyi forrásra és izolált DB-bizonyítékra; hostolt/megosztott migráció NOT APPLIED**. A [részletes bizonyíték](QA08_RPC01_TRUST_BOUNDARY.md) szerint a tényleges rés nem a már korlátozott konstrukciós writer közvetlen hívhatósága, hanem a downstream `authenticated` RPC-k eredetellenőrzés nélküli bizalma volt. A restricted writer most csak strukturálisan teljes snapshotot fogad el, atomikus privát attesztációt készít, a munkanapló- és ajánlatforrás-guard pedig kizárólag ilyen pontos org/kalkuláció/revízió hármast fogad el.

- A böngésző továbbra is csak inputot küld; a Server Action meglévő TypeScript motorja újraszámít és teljességet ellenőriz. Az `authenticated` és `service_role` nem hívhatja a writert; kizárólag a minimális `tetopro_covering_writer` szerepkör. RLS-lazítás, service-role általánosítás és SQL-ben újraírt geometriai motor nincs.
- TDD RED: **10/26 FAIL** a régi sémán, rollbackelve. GREEN az eldobható DB-klónon: célzott pgTAP `057/058/060` **63/63 PASS**, teljes pgTAP **62 fájl / 1318 PASS**. Két párhuzamos V2 mentésből pontosan egy sikerült, a másik `40001`; 2 revízióhoz 2 attesztáció tartozott.
- Célzott Vitest **24/24 PASS**; teljes Vitest **183 PASS / 8 SKIP fájl, 1101 PASS / 19 SKIP teszt**; lint és Next typegen + TypeScript PASS. Alkalmazáskód nem változott, ezért production build nem futott. A régi immutable snapshotok nem változtak; a későbbi QA-09 hardening a backfillt pontos restricted-writer operation-ledger egyezéshez kötötte, mert a `server_recomputed` metaadat önmagában nem bizonyult elégségesnek.
- Új migráció: `20261025154642_qa08_rpc_trust_boundary.sql`; hostolt és megosztott helyi adatbázisra nem alkalmazva. Javasolt Conventional Commit: `fix(QA08-RPC-01): attest trusted calculation revisions`.

## QA-08 — Teljes end-to-end és integrációs ellenőrzés (2026-10-25)

Státusz: **PASS WITH LIMITATIONS; az akkori P2 integritási finding helyi follow-upban lezárva**. A [részletes QA-08 bizonyíték](QA08_FULL_E2E_VERIFICATION.md) szerint a helyi teljes Vitest **183 fájl PASS / 8 SKIP, 1101 PASS / 19 SKIP teszt**, a helyi pgTAP **61 fájl / 1292 PASS**, lint, typecheck, izolált webpack build és a célzott PDF/kalkulátor suite (**5 fájl / 28 teszt**) zöld. Hitelesített helyi Brave-ban a 31 kalkulátor-katalógus 4/17/10 kategóriás selector-mátrixa, mentett kalkuláció, munkanapló, ajánlat, anyaglista és anyagkezelő olvasási útvonala ellenőrzött.

- Teljes tartós A–F E2E nem minősíthető COMPLETE-nek: nem volt igazoltan elkülönített eldobható auth/fixture; új mentés, fotófeltöltés, PDF-generálás, 101/201/525/51/125-ös böngészős adatmennyiség és mobil viewport-mátrix nem futott.
- A közvetlen authenticated `link_execution_plan_document` RPC tranzakciós próbája üres konstrukciós `output_snapshot`-ot **`created: true`** eredménnyel elfogadott; a `ROLLBACK` után a fixture és link 0/0 maradt. Ez nyitotta a QA08-RPC-01 findingot; a későbbi célzott javítás helyi forrásban és izolált DB-klónon **lezárta**, de hostolt/megosztott migráció nélkül ott még nem aktív.
- Nincs adatbázis-, RLS-, kalkulációs-, mentési- vagy történeti snapshot-módosítás. Javasolt Conventional Commit: `docs(QA-08): record full end-to-end integration verification`.

## QA-07 — Munkanapló-üresállapot és navigációs konzisztencia (2026-10-25)

Státusz: **COMPLETE a QA-07 célzott mérföldkőre**. A munkanapló-lista és a dashboard üres munkanapló-állapota már nem ígér felmérésből indított, kivezetett létrehozási folyamatot. Az új szöveg: „Munkanaplót önállóan vagy mentett kalkulációból indíthatsz.”

- Az „Új munkanapló” CTA továbbra is a tényleges `/kivitelezes/uj?organization=…` útvonalra mutat; a nem üres lista meglévő `/kivitelezes/:planId?organization=…` navigációja változatlan.
- Célzott red→green UI-regresszió: üres és nem üres `ExecutionIndexPage`, dashboard-üresállapot, régi „felmérésből” szöveg hiánya és CTA-célútvonalak: **8/8 PASS**.
- Nincs adatbázis-, RLS-, kalkulációs-, mentési- vagy történeti felmérés-snapshot módosítás. A történeti felmérés-olvasók és a meglévő felmérés→munkanapló kapcsolási útvonalak érintetlenek.
- Javasolt Conventional Commit: `fix(QA-07): align worklog empty-state navigation copy`.

## QA-06 — Teljes kalkulációs revíziótörténet és lapozás (2026-10-25)

Státusz: **COMPLETE a QA-06 célzott mérföldkőre**. A [részletes bizonyíték](QA06_CALCULATION_REVISION_HISTORY.md) szerint a korábbi 50-es lekérdezési korlát helyett 50-es szerveroldali oldalak és látható „Régebbi revíziók betöltése” vezérlő működik. Az első oldal 51 sort kér a további oldal detektálásához; V51/V125 és a legrégebbi snapshot kurzorozott lapon érhető el.

- A revíziók `revision_number DESC, id DESC` sorrendben, szervezet + kalkuláció szűréssel töltődnek; a lapok rekord-ID szerint deduplikálva, async elavulásvédelemmel kerülnek a munkamenetbe. A direkt revízióforrás-olvasás nem függ az első oldaltól.
- Célzott adat/action/panel: **21/21 PASS**; teljes Vitest **182 fájl PASS / 8 SKIP, 1098 PASS / 19 SKIP teszt**; lint, typecheck, izolált webpack build, `git diff --check` PASS; helyi pgTAP **61 fájl / 1292 PASS**. Hitelesített browser E2E nem futott: nem volt futó helyi szerver és 51/125-ös tartós fixture.
- Nincs séma-, RLS-, snapshot-, formula- vagy migrációmódosítás. Javasolt Conventional Commit: `fix(QA-06): paginate complete calculation revision history`.

## QA-04 — Kalkulációteljesség és biztonságos továbbadás (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA04_CALCULATION_COMPLETENESS.md) szerint a menthetőség most a kért eredmény teljességéből következik, nem pusztán az érvényes tetőgeometriából. A teljes, hiányos, érvénytelen és nem támogatott állapot külön kezelt; a kliens és a szerver ugyanazzal a domain-szabállyal dönt. Történeti hiányos revízió megnyitható, de az alkalmazás normál szerveres útvonalán nem adható tovább ajánlatba vagy új munkanapló-kapcsolatba.

- Hitelesített helyi Brave: faanyag-kalkulátor kiosztás nélkül „Hiányos”, konkrét hiánylistával és tiltott mentéssel; 80 cm szarufakiosztás után „Teljes” és engedélyezett mentés. Desktop és DevTools iPhone SE 375×667; tartós mentés nélkül.
- Végső célzott regresszió **11 fájl / 61 PASS**; teljes Vitest **181 PASS / 8 SKIP fájl, 1085 PASS / 19 SKIP teszt**; lint, közvetlen tsc, izolált `npm run typecheck`/`npm run build`, teljes helyi pgTAP **61 fájl / 1292 PASS** és `git diff --check` PASS. Nincs migráció, RLS-változás vagy képletmódosítás.
- Korlát: tartós piszkozat külön migrációt és teljes RPC/downstream státuszszerződést igényel, ezért csak a QA-03 munkamenet-draft maradt. A QA-04 idején a downstream RPC-k közvetlen hívása még nem ismerte a teljességi szabályt; ezt a QA08-RPC-01 helyi follow-up attesztációs kapuval lezárta, hostolt/megosztott migráció nélkül ott még nem aktív. Javasolt commit: `fix(QA-04): gate calculation saving and downstream use on completeness`.

## QA-03.1 — Történeti revízió és browser back/forward (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**; mindkét hiba helyben reprodukálva és javítva. A [részletes bizonyíték](QA03_1_COMPATIBILITY_NAVIGATION.md) szerint a régi DEMO szarufa V2 változatlan megnyitáskor „Mentve · V2”, a tényleges szerkesztés dirty. A mentett snapshot változatlan; ismeretlen régi mező explicit inkompatibilitási állapot. A kliensoldali browser back/forward felhasználó-, szervezet- és számításkulcsos munkamenetmemóriából visszaállítja a draftot, a kifejezett elvetés törli azt.

- Hitelesített helyi Brave: V2 200→210 cm, back→forward után 210 cm; „Kilépés mentés nélkül” után 200 cm; új kalkuláció 300 cm back→forward és A→B→A után megmaradt. Puszta 200 cm→2 m egységváltás nem kérdezett rá. Teljes dokumentumos backnél a `beforeunload` figyelmeztetés megszakítható volt.
- Teljes Vitest **180 PASS / 8 SKIP fájl, 1074 PASS / 19 SKIP teszt**; lint, közvetlen tsc, izolált `npm run typecheck`/`npm run build` és `git diff --check` PASS. DB-séma, RLS és mentett adat nem változott.
- Korlát: teljes újratöltés/lapbezárás böngészőfüggő `beforeunload`; élő második szervezet és tartós böngészős revíziómentés nem tesztelt. Javasolt commit: `fix(QA-03.1): compare historical snapshots and retain navigation drafts`.

## QA-03 — Kalkulátor-draft megőrzése és biztonságos váltás (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA03_CALCULATOR_DRAFT_PRESERVATION.md) szerint a kalkulátoronkénti, csak memóriában élő mező- és mértékegység-draft A→B→C→A/B váltáskor megmarad; azonos választás nem töröl. A mentett revízió explicit felülírása és az új kalkuláció megerősített, a szervezeti kontextus új munkateret kap. A számítás és rajz a visszaállított kanonikus mm-adatból számolódik.

- Hitelesített asztali és 375×667 mobil DEMO: 400/300 cm szarufa → visszaváltás után 5000 mm; részleges B és opcionális A értékek, 4 m kijelzés megmaradt; új kalkuláció törlése/cancel és V2→V1 revízióválasztás ellenőrzött, tartós írás nélkül.
- Teljes Vitest **179 PASS / 8 SKIP fájl, 1070 PASS / 19 SKIP teszt**; lint, közvetlen tsc, izolált typecheck/build és `git diff --check` PASS. DB-séma/RLS/migráció nem változott.
- Korlát: a meglévő guard nem védi a SPA browser back/forward eseményt; valódi érintőkészülék és élő szervezeti váltás nem tesztelt. Régi DEMO M2 V2 snapshot megnyitáskor már dirty státuszt mutat, külön történeti kompatibilitási vizsgálat kell. Javasolt commit: `fix(QA-03): preserve calculator drafts across in-session switching`.

## QA-05 — pgTAP tesztizoláció és teljes helyi regresszió (2026-10-25)

Státusz: **COMPLETE a helyi QA-05 mérföldkőre**. A [részletes bizonyíték](QA05_PGTAP_TEST_ISOLATION.md) szerint a `040` teszt korábbi, teljes táblát számláló negatív RLS-állítása helyett kizárólag a saját két privát link-ID-jét ellenőrzi. Új pozitív állítás bizonyítja, hogy a létrehozó mindkét helyes fixture-rekordot látja. A korábban hibát okozó, M3 szerint jogszerű aktív kalkulációs kapcsolat továbbra is látható a szervezeti tagnak.

- Red→green: eredeti `040` **23/24 PASS, 1 FAIL**; javított `040` **25/25 PASS**. M3 `057`-tel együtt mindkét sorrendben **46/46 PASS**; teljes `npm run db:test` két egymást követő futásban **61 fájl / 1292 PASS**.
- `npm test` **178 PASS / 8 SKIP fájl, 1067 PASS / 19 SKIP teszt**; lint és `git diff --check` PASS. SQL-teszten és dokumentáción kívül nincs módosítás; typecheck/build ezért nem futott. Nincs migráció, reset, hosted DB-művelet vagy tartós tesztadat.
- Javasolt Conventional Commit: `test(QA-05): scope document-link RLS assertions to owned fixtures`.

## QA-02 — Anyagkatalógus teljessége és közvetlen termékmegnyitás (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA02_MATERIAL_CATALOG_COMPLETENESS.md) szerint a termékrészlet pontos, szervezetre szűrt ID-lekérdezést használ; az Anyagkezelő 50-es szerveroldali lapokat és keresést kapott. Az ajánlat/anyaglista induláskor 50 terméket és a mentett variánsokat tölti, a közös kiválasztó kereséssel és további oldalakkal minden aktív termékhez hozzáfér. A teljes katalógust igénylő kimutatás/kalkulátor/szerverfogyasztó ellenőrzött lapozást használ; az árverziók sem csonkolódnak.

- Red→green mock-regresszió: 0/1/199/200/201/525 termék, direkt ID és szervezeti izoláció, archivált hozzáférés, 11. oldal, keresés/rendezési tie-breaker, 201. kalkulátorprofil és tetőfedési opció, 1101 árverzió. Az 525 elemű szintetikus fixture-ben az első katalógusoldal 200 helyett 50 terméksort küld (terméksor-JSON: 77 939 → 19 489 byte); valós DB-mérés nem történt.
- Célzott tesztek PASS; teljes Vitest **178 PASS / 8 SKIP fájl, 1067 PASS / 19 SKIP teszt**; lint PASS; izolált typecheck/build PASS; `git diff --check` PASS. DB-migráció és tartós adatírás nincs.
- Korlát: élő, autentikált 201+ termékes böngészős E2E és production teljesítménymérés nem futott; a helyi dev oldal betöltőhéjnál maradt. A korábban ismert QA-05 pgTAP hibát nem érintettük.
- Javasolt Conventional Commit: `fix(QA-02): page complete material catalog and open products by exact ID`.

## QA-01 — Munkanapló és PDF teljes adatbetöltése (2026-10-25)

Státusz: **PASS WITH LIMITATIONS**. A [részletes bizonyíték](QA01_EXECUTION_DATA_COMPLETENESS.md) szerint a közös munkanapló-loader globális 100-as napló/esemény/fotó limitje helyett ellenőrzött, 100 soros lapozás működik; a terv és feladat is teljesen lapozott. A PDF a kért tervet olvassa, hiányos adatnál 502-t ad dokumentum helyett. A szándékosan limitált áttekintő lista nem változott.

- Red→green, kétterves 0/1/100/101/275 rekordos azonosító-, sorrend- és kapcsolatteszt; második laphiba, `42501`, duplikált lap, megváltozott számlálás és 40 soros szerverlimit. A PDF-route 101 ID-t ad a renderelőnek; a valódi renderer 101 bejegyzésből többoldalas PDF-et készít. Signed URL-kérések legfeljebb 16 párhuzamos hívásban.
- Teljes Vitest **176 PASS / 8 SKIP fájl, 1053 PASS / 19 SKIP teszt**; lint PASS; izolált `npm run typecheck` és `npm run build` PASS. DB-migráció, tartós adatírás nincs.
- Nem futott: élő 101+ rekordos DB/browser E2E, hostolt RLS és teljes pgTAP; a QA-05 miatt korábban ismert pgTAP FAIL továbbra sincs kijavítva. Párhuzamos adatváltozásnál nincs több HTTP-queryre kiterjedő tranzakciós snapshot.
- Javasolt Conventional Commit: `fix(QA-01): load complete execution history for work logs and PDF`.

## QA-2026.10 — Teljes rendszer QA audit (2026-10-25)

Státusz: **PARTIAL / javítást igényel**. A [részletes audit](FULL_SYSTEM_QA_AUDIT.md) 31 kalkulátort és 10 fő funkciócsoportot leltároz; 2 kalkulátoron történt nem mentő böngészős részpróba. P0: 0, P1: 2, P2: 4, P3: 1. Fő hibák: munkanapló/PDF csendes 100 soros csonkolása, anyagkatalógus 200-as korlátja miatti elérhetetlen termék, kalkulátorváltáskori mentetlenadat-vesztés. Az alkalmazáskód és a DB nem változott.

- Friss ellenőrzések: teljes Vitest **175 PASS / 8 SKIP fájl, 1039 PASS / 19 SKIP teszt**; ESLint PASS; közvetlen `tsc` PASS; elkülönített Next.js production build PASS; `git diff --check` az audit elején és a dokumentációs módosítás után PASS.
- Helyi pgTAP **61 fájl / 1291 állítás / 1 FAIL** (`040`, 13. állítás). A teszt az egész táblát számolja, és egy korábbi, M3 szerint látható aktív kalkulációs link miatt bukik; a két saját privát link másik tag számára nem látszott. Ideiglenes, saját rekordokra szűkített diagnosztikai másolat 24/24 PASS. Az eredeti teljes DB suite **nem PASS**.
- Nem igazolt: teljes A–E E2E mentés/újranyitás, mobil viewportok, hostolt Supabase/Storage, exportok képi paritása és production teljesítmény. Tartós tesztírást az elkülönített tesztadat hiánya miatt nem végeztünk.
- Javasolt Conventional Commit: `docs(QA-2026.10): record full-system audit findings and verification gaps`.

## M8 — Szarufa-részletrajz a két anyagos kalkulátorban

Státusz: **PASS WITH LIMITATIONS** (kiosztási nézet kész; csomóponti bevágás nem, szakmai adat/döntés hiányában).

- **Működés:** a „Tetőanyag-kimutatás” (ha a szarufa és léc kért) és a „Tetőszerkezet faanyag és vágáslista” rajzterületén a teljes tetőrajz *előtt* automatikusan megjelenik a „Szarufa-részlet · közeli nézet”. Forrás: `RoofTimberLayout.rafters.segments` változatlanul (`src/domain/drawings/rafter-detail.ts`); a legtöbb szarufát tartalmazó tetősík középső 2–3 szarufája, egy kijelölve. Ortografikus axonometria (60° forgatás, 25° dőlés); a feliratok (hossz, tényleges osztás, hajlás) domainértékek, nem vetített hosszak. Helyi mm/cm/m kijelzés `formatLength`-del. Zoom/pan/csippentés/görgő a meglévő `drawing-viewport.ts` függvényekkel, nyilak/+/−/0 billentyűk, „Nézet visszaállítása” a közeli alapnézetre; azonos szarufa-geometriájú újraszámolás (pl. léctávolság) nem állítja vissza a nézetet, új szarufa-kiosztás igen. Hiányzó/érvénytelen osztásnál magyarázó állapot.
- **Referenciatérkép (döntés):** a kiosztás vonalai a tetősíkban futnak (z = 0 a falsík vonalában); a `rafter-joints.ts` metszete a talpszelemen külső síkjától és a madárszájjal süllyesztett felső éltől mér. Ezek az anyagos kalkulátorokban nem adottak, és az sem rögzített, hogy a tetősík a szarufa felső éle. Ezért **minden csomópont C**: alsó felfekvés és gerinc „További adat szükséges” a hiányzó paraméterek listájával; kontyél/vápa/törésvonal/oromél végnél „a 2D csomópontmodell nem alkalmazható”. Bevágási sokszög, vágási szög, gerendatest nincs rajzolva; a keresztmetszet csak szövegesen. Derékszelemen nincs megadva, nem rajzolt. D-szöveg: bevágás, gyengítés, statika, faanyagminőség, jóváhagyott csomópont szakemberi döntés.
- **Ellenőrzés:** új Vitest: modell 7 (független kézi érték: 6 m / 4 m nyeregtető → 5000 mm szarufa, 10 000/17 osztás; szegmens-azonosság a kiosztással; vetítés linearitása és pont-paritás; 2 szarufás eset; C-állapotok, keresztmetszet-függés; konty: eresz→gerinc, sátor: kontyél → nem alkalmazható; szarufa nélkül null), komponens 1 (statikus render: 3 tengely, domain-feliratok, nincs vágási sokszög). Teljes Vitest **175 fájl PASS / 8 SKIP, 1039 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. DB-változás nincs, pgTAP nem futott; izolált build nem futott (fut a dev szerver).
- **Böngésző (helyi DEMO):** 375×812 sötét és világos, 812×375 sötét. Faanyag: 10×6 m, 45°, 60 cm → 3/18 szarufa, 4242,6 mm, 588,2 mm; sorrend: részlet → teljes rajz. 2 szarufás eset; zoom gomb, egérhúzás, szintetikus kétujjas érintés (267%), billentyűk, visszaállítás; mm/cm/m paritás; vízszintes túlcsordulás 0. Tetőanyag: kontytető, faanyag ki → nincs részlet; be, osztás nélkül → magyarázó állapot; 60 cm → hosszú tetősík közös szarufái (eresz → gerinc). Mentett faanyag V1 újranyitva „Mentve · V1”-ként: 4883,1 mm (= 4000 / cos 35°), vágáslista 26 × 4883 mm változatlan. Konzol: csak a meglévő beforeunload-figyelmeztetés.
- **Nem ellenőrzött / korlát:** valódi érintőképernyő (csak szintetikus pointer-esemény); nagy tető válaszideje nincs mérve (a modell csak a kiválasztott sík elemeit rendereli); L/T, félkonty, manzárd böngészőben nem nézve (modell: élfajta szerinti C-állapot); csomópont-bemenet mentése nem készült (új szakmai bemenet és snapshot-szerződés kellene). A rajz kezelőlogikája részben a `TechnicalDrawing`-éval párhuzamos (közös hook nem készült, hogy a meglévő rajz változatlan maradjon).
- **Javasolt Conventional Commit:** `feat(M8): axonometric rafter detail view from the computed timber layout`.

## M7.1 — Lépcsőhajlás és hajlásvonal javítása

Státusz: **PASS.** A kalkulátor-átnézés talált szakmai hibája: az egyenes (fa és fém), a csiga-, a húzott fokos és a betonlépcső a hajlást a teljes emelkedés / vízszintes futás arányából számolta, pedig a fokok száma eggyel kevesebb a fellépésekénél; így a hajlás túl nagy volt (például 175/280 mm-nél 33,69° a helyes 32,005° helyett), és eltért a pihenős lépcső értékétől.

- **Javítás:** minden lépcsőtípusnál a hajlás = atan(fellépő / belépő) (csiga- és húzott fokos lépcsőnél a járóvonal-belépővel). A hossz az első fokéltől a felső szint éléig tartó hajlásvonal: fokszám × √(fellépő² + belépő²); a pihenős lépcső karjainál ugyanez karonként. A „Pofafa/tartó tengelyének geometriai hossza” és a „ferde vetületi hossz” felirat helyett „Hajlásvonal hossza · első fokéltől a felső szint éléig”; az egyenes lépcső leírása kimondja, hogy ez nem a pofafa szabási hossza. A rajzon a hajlásvonal és a szögjel a fokéleken fut. A betonék térfogata nem változott (kézzel ellenőrizve egyenlő a fokos tömör test térfogatával).
- **Ellenőrzés:** független kézi értékek: 15 × √(175² + 280²) = 4952,84 mm; pihenős kar 7 fok × (187,5 / 250) → 3-4-5 háromszög, 2187,5 mm; új teszt: azonos fokméretnél az egyenes, a beton- és a pihenős lépcső ugyanazt a hajlást adja. Teljes Vitest **173 fájl PASS / 8 SKIP, 1031 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. Böngésző (mobil): egyenes 32,005° / 4952,84 mm, beton 32,005° / 5,88 m³, pihenős 36,87° / 2187,5 mm, csiga 36,927°, húzott fokos 28,62° / 5427,97 mm, mind egyezik a kézi számítással.
- **Korlát:** a pofafa tényleges szabási hossza (pofafa szélessége, csatlakozás) továbbra sem számított. Mentett lépcső-kalkuláció nincs (a lépcsők nem menthetők), így régi eredmény nem változik.
- **Javasolt Conventional Commit:** `fix(M7.1): use riser/going pitch and pitch-line length for all stair types`.

## M7 — Integráció, teljes ellenőrzés, dokumentáció

Státusz: **PASS WITH LIMITATIONS.** A kalkulátor-központú munkafolyamat (Kalkulátor → mentett revízió → munkanapló / árajánlat) helyben végig működik.

- **Javítás 1 (M6-regresszió):** a 0 peremsávval, de explicit `…InsetMm: 0` kulcsokkal mentett régi faanyag-revízió megnyitáskor „Mentetlen módosítás”-t mutatott, és letiltotta a munkanapló- és ajánlat-gombot. A mentett bemenet olvasáskor normalizálva (`normalizedConstructionInput`, `construction-data.ts`); a DB-ben tárolt snapshot változatlan. Új teszt.
- **Javítás 2 (M5-maradvány):** a munkanaplóban üres „Csatolt felmérések · 0” szakasz és egy már nem igaz útmutatás („Felmérésből … csatolható”) jelent meg. Kapcsolt felmérés nélkül a szakasz nem jelenik meg; hibás vagy elérhetetlen kapcsolat figyelmeztetése megmaradt. Új teszt.
- **Ellenőrzés:** `eslint .` PASS; `tsc` PASS; teljes Vitest **173 fájl PASS / 8 SKIP, 1030 PASS / 19 SKIP**; teljes pgTAP **61 fájl / 1291 PASS** (helyi); izolált `next build --webpack` PASS (a munkakönyvtár másolatában, a futó dev szerver `.next`-jét nem érintve), a javítások után újrafuttatva.
- **Böngésző (helyi DEMO):** mobil 375×812: dashboard (Kalkulátorok elöl, alsó sáv öt elemmel), mentett lista, faanyag-revízió újranyitása „Mentve · V1”-ként, szarufa-kalkuláció csomópontokkal → új munkanapló létrehozása és kapcsolása → a naplóban a V1 eredmény a csomópont-értékekkel. Tablet 768×1024: faanyag V1 → „Árajánlat készítése” → kalkulációs forráspanel 3 átvihető mennyiséggel (26 db, 126,960557 m, 26 × 4883 mm). Desktop: oldalsáv-navigáció, csomópont-szekció és metszeti rajz. Konzolhiba nincs (csak a böngésző beforeunload-figyelmeztetése).
- **Nem ellenőrzött / korlát:** hostolt adatbázis és deploy; világos téma ebben a körben nem nézve; ajánlatpiszkozat mentése ebben a körben nem futott (M4-ben igen); a nyitott döntések (12/3, 12/4, 12/11) és a belső felmérés-kód eltávolítása külön kapu.
- **Javasolt Conventional Commit:** `fix(M7): keep pre-M6 revisions unmodified on reopen and hide empty retired survey section`.

## M6 — Peremsáv-szabály és szarufa-csomópontok

Státusz: **PASS WITH LIMITATIONS.** Döntések: 12/1 — „A”: a peremsáv mindig 0, a lécre is; 12/2 — mindhárom csomópont, mérési referencia a szarufa felső éle (mai modell: a madárszáj magassága csökkenti a hatásos emelkedést, így a hajlást is).

- **Peremsáv:** a `roof.material-takeoff` és `roof.timber-cutlist` kiosztási mezői közül a négy peremsáv-mező kikerült; a suite bemenete a régi kulcsokat eldobja (`withoutEdgeStrips`), a `roofTimberInputFromParameters` hiányzó peremsávot 0-nak vesz. Történeti snapshot (felmérés, projekt-kalkuláció) a saját tárolt peremsávjával számol tovább. Az eredmény feltételezései kiírják, hogy a szélső szarufa a (kiülést tartalmazó) tetősík határán áll. A helyi mentett faanyag-revízió eleve 0 peremsávval készült, így eltérés nincs.
- **Csomópontok:** új `src/domain/calculations/construction/rafter-joints.ts`. Koordináták: x vízszintesen a talpszelemen külső síkjától (madárszáj függővágása), y függőlegesen a talpszelemen felső síkjától; felső él `y = HAP + x·tanα`. Alsó felfekvés: függő- és ülékvágás szöge (A); szarufa-magassággal függővágás-magasság, ülékhossz, merőleges bevágási mélység, megmaradó magasság (B). Derékszelemen: felfekvés távolsága a felső él mentén és bevágás vagy alátétezési hézag a szelemen helyéből és magasságából (B). Gerinc: szembefutó (A), gerincdeszka `(t/2)/cosα` hosszcsökkenés (B), gerincszelemen bevágás (B). Hiányzó bemenet: C-lista; bevágás megengedhetősége, méretezés, kapcsolóelemek: D-szöveg, a rendszer nem dönt. A táblázat és a metszeti SVG ugyanabból a kimenetből készül. A B-értékek a mentett revízió eredménysoraiba kerülnek; csomópont-bemenet nélkül a sorok változatlanok (régi revízió nem jelez eltérést).
- **Ellenőrzés:** új Vitest: csomópontok (6, független kézi trigonometria: 3-4-5 háromszög, HAP 100, h 200 → függővágás 150, ülék 200, mélység 120, maradék 80; derékszelemen 50/66,7/40, felfekvés 2500; gerincdeszka 31,25; gerincszelemen 60/80), suite (2: peremsáv-eldobás, sorstabilitás). Teljes Vitest **173 fájl PASS / 8 SKIP, 1029 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. Adatbázis-változás nincs, pgTAP nem futott.
- **Böngésző (helyi DEMO, 375×812):** a kézi tesztadatok mind a négy csomópont-esetben pontosan ugyanazokat az értékeket adták; a metszeti rajz a két bevágással megjelent; a gerinctípus-váltó a releváns mezőket mutatja; a faanyag-kalkulátorban nincs peremsáv-mező. Valódi mentés: V1 a szerveren újraszámolva, a csomópont-értékek az eredményben (helyi DB).
- **Korlát / nem ellenőrzött:** a tesztadat független kézi számítás, nem CAD- vagy szakemberi ellenőrzés. A talpszelemen szélessége nem bemenet (az ülék ráférése nem ellenőrzött); az eresz végvágása függőlegesnek rajzolt. A visszavont felmérés-szerkesztő peremsáv-mezői változatlanok (UI-ból nem érhető el). Izolált build nem futott (fut a dev szerver; M7).
- **Javasolt Conventional Commit:** `feat(M6): zero edge strip layout and classified rafter joint geometry`.

## M5 — Felmérések kivezetése, kalkulátor-központú navigáció

Státusz: **PASS WITH LIMITATIONS.** Döntések: 12/5 — a meglévő felmérésekre nincs szükség (mind DEMO), ezért nem készült csak olvasható nézet; az adatok törlés nélkül megmaradnak. 12/10 — mobil alsó sáv: Műhely, Kalkulátorok, Munkanaplók, Árajánlatok, Anyaglisták.

- **Navigáció:** a Felmérések kikerült a dashboardról és a menüből; a Kalkulátorok az első funkció; a dashboard felmérés-piszkozat értesítője eltűnt. A `/felmeresek`, `/felmeresek/uj`, `/felmeresek/[surveyId]` és a régi kalkulátor-átadó útvonal a `/kalkulatorok`-ra irányít (`retired-survey-route.ts`).
- **Új felmérés tiltása:** a `saveFieldSurveyAction` új felmérésnél adatbázis-hívás nélkül elutasít; DB-szinten BEFORE INSERT trigger (`docs/DATABASE.md` M5). A munkanaplóban és az anyaglistában a „felmérés megnyitása” linkek kikerültek, a kapcsolt felmérési adatok és azonosítók továbbra is inline látszanak.
- **Ellenőrzés:** teljes Vitest **172 fájl PASS / 8 SKIP, 1021 PASS / 19 SKIP** (a felmérés-action, dashboard, útvonal és anyaglista tesztek az új viselkedéshez igazítva, új teszt a tiltásra); `eslint .` PASS; `tsc` PASS. pgTAP `059` 4/4, teljes **61 fájl / 1291 PASS** (helyi). Helyi PostgREST-hívás helyben aláírt teszt-JWT-vel: `save_field_survey` → `55000`, a felmérések száma 39 maradt.
- **Böngésző (helyi DEMO, 375×812):** alsó sáv: Műhely · Kalkulátorok · Munkanaplók · Árajánlatok · Anyaglisták (Anyagkezelő csak széles nézetben); a dashboard funkciói Kalkulátorokkal kezdődnek, felmérés nélkül; `/felmeresek/uj` és egy felmérés-részletoldal valódi navigációval a `/kalkulatorok`-ra jut. A dev szerver a munka közben leállt, a `launch.json` `tetopro-dev` konfigurációjával indítottam újra.
- **Korlát / nem ellenőrzött:** a belső felmérés-kód (szerkesztő, actionök, fotó-API, felmérésből indított munkanapló/ajánlat/anyaglista actionök) a helyén maradt, UI-ból nem érhető el; végleges eltávolítása és bármilyen adattörlés külön jóváhagyás. A trigger csak az új felmérést tiltja, a meglévők módosítását nem. Az `execution-linked-surveys.tsx` módosítása a commitolatlan F9.73.1 fájlban történt (vegyes fájl). Hosted DB.
- **Javasolt Conventional Commit:** `feat(M5): retire field survey creation and make calculators the primary entry`.

## M4 — Kalkulációból árajánlat

Státusz: **PASS WITH LIMITATIONS.** Mentett suite-kalkulációból közvetlenül ajánlatpiszkozat indítható, munkanapló és anyaglista nélkül. Döntések: 12/8 — ajánlati mennyiségként csak kiosztási (LAYOUT) mennyiség és vágáslista-sor vihető át, minden más tájékoztató; 12/9 — marad a nettó HUF, ÁFA nélkül.

- **Működés:** a kalkulátor mentés-sávjában „Árajánlat készítése a Vn revízióból” (mentetlen módosításnál tiltva). Az ajánlatszerkesztő „Kalkulációs forrás” panele listázza az átvihető mennyiségeket és a tájékoztató eredményeket; sort nem tölt elő automatikusan (a faanyagnál ugyanaz a 26 szarufa kiosztásként és vágáslistaként is szerepel, az automatikus felvétel duplázna). Felvett sor: kézi anyag, hiányzó ár, szerkeszthető mennyiség, a meglévő katalógus- és árválasztóval árazható; a sor forrásjelölése mutatja az eredeti mennyiséget, a mennyiség- vagy egységeltérést. Újranyitáskor a forrás visszaáll.
- **Újrahasznosítás:** meglévő standalone mentés (wrapper, a közös sor-szerződés változatlan: a forráskulcsot az action leválasztja), `WorkflowMaterialProductPicker`, árforrás-választás, PDF-útvonal, anyaglista-forrás mintája.
- **M3-javítás menet közben:** a teljes pgTAP-ban a `040` elbukott: a böngészős próbából maradt *leválasztott* kalkulációs linket a többi tag is látta. Új migráció korlátozza (aktív link: tagok; leválasztott: csak létrehozó); `057` kiegészítve.
- **Ellenőrzés:** új Vitest: forrásjelölt-építés (4), action-útválasztás (4); teljes Vitest **172 fájl PASS / 8 SKIP, 1020 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. pgTAP `058` 16/16, teljes **60 fájl / 1287 PASS** (helyi). DB-típusok újragenerálva.
- **Böngésző (helyi DEMO, 375×812):** faanyag V1 → ajánlat: panel 3 átvihető mennyiséggel (26 db, 126,960557 m, vágáslista 26 db × 4883 mm), tájékoztató eredmények külön; vágáslista-sor felvétele → „Hiányzó egységár”, gomb „Felvéve”; mentés → v1. DB: forrás a pontos V1-re, SQL-ből rögzített címke/mennyiség, projekt nélküli ajánlat, a sor-snapshotban nincs új mező. Újranyitás: forrásjelölés és „Felvéve” visszaállt.
- **Utólag javítva (M4.1):** (1) mobilon az alsó navigáció eltakarta a „Piszkozat mentése” gombot — a `.quotation-savebar` ragadó alsó távolsága nem számolt a fix alsó navigációval; most `max(--app-nav-bar + .5rem, safe-area)`. Böngészőben 375×812: ragadó állapotban 19 px hely a navigáció fölött, a gomb közepe a gombot találja, valódi kattintás ment (változatlan tartalomnál új revízió nélkül); 1280×800: változatlan 8 px. (2) Újranyitott önálló ajánlatnál a JSONB `null` mezők felülírták a szerkesztő üres alapértékeit (`textarea` `null` figyelmeztetés); betöltéskor a `null` mezők kimaradnak. Jelölővel ellenőrizve: újratöltés és sorkinyitás után nincs figyelmeztetés. Ajánlat-tesztek 12 fájl / 46 PASS, lint és typecheck PASS. Más ragadó mentés-sávok (pl. `.preparation-save-bar`) azonos mintáját nem vizsgáltam.
- **Nem ellenőrzött / korlát:** módosított mennyiségű újramentés böngészőben (pgTAP fedi); PDF-ben a kalkulációs forrás nem jelenik meg külön; egy ajánlati revízió egyszerre csak egy forrásból (anyaglista vagy kalkuláció) vehet át mennyiséget; a `040` pgTAP az összes látható linket számolja, aktív helyi kalkulációs link mellett szándékoltan elbukhat; hosted DB/RLS.
- **Javasolt Conventional Commit:** `feat(M4): start standalone quotations from verified calculation quantities`.

## M3 — Kalkulációból munkanapló

Státusz: **PASS WITH LIMITATIONS.** Mentett suite-kalkulációból új munkanapló hozható létre, vagy meglévőhöz kapcsolható; a kapcsolat a pontos revízióra mutat. A munkanapló opcionális marad, a kalkuláció a kapcsolástól nem változik. Döntés (12/6): a napló látói csak olvashatják a kapcsolt revíziót; szerkeszteni, új revíziót menteni és leválasztani a létrehozó tud.

- **Újrahasznosítás:** meglévő `execution_plan_document_links` + link/unlink RPC (bővítve), `ExecutionPlanLinkControl` (új `calculation` típus, revíziócímke, mentetlen módosításnál tiltott kapcsolás), a meglévő kétlépcsős „létrehozás és kapcsolás” action (mindkét lépés request-key idempotens; részleges hibánál a napló megmarad, és ugyanazzal a gombbal duplikátum nélkül újrapróbálható). Új: `execution-calculation-links.ts` olvasó és `ExecutionPlanCalculations` panel a munkanaplón (hibaizolált szekció, hiányzó/eltérő revízió `unavailable`, nem csendes).
- **Ellenőrzés:** új Vitest: link-olvasó (4), mentés-sáv kapcsolási állapotok (1), link-action kalkulációs ág (1); teljes Vitest **170 fájl PASS / 8 SKIP, 1012 PASS / 19 SKIP**; `eslint .` PASS; `tsc` PASS. pgTAP `057` 20/20, teljes **59 fájl / 1270 PASS** (helyi). DB-típusok újragenerálva.
- **Böngésző (helyi DEMO, 375×812):** mentett szarufa V2 → „Új munkanapló · DEMO M3 tetőfelújítás” → kalkulátorban „DEMO M3 tetőfelújítás · V2”; DB: `calculation`, pontos V2, projekt nélküli napló, revíziószám változatlan (2). Munkanaplón „Kapcsolt kalkulációk · 1”, V2 eredménysorai, „Megnyitás a kalkulátorban”; megerősített leválasztás → 0, DB audit-bélyeg. Közben javítva: a név/típus és az eredménysorok mobilos tördelése. Konzolhiba nincs.
- **Nem ellenőrzött:** másik műhelytag olvasási nézete böngészőben (pgTAP igazolja: tag olvas, kívülálló nem, leválasztás után nincs hozzáférés); meglévő naplóhoz kapcsolás böngészőben (ugyanaz az RPC, unit-teszt); hálózati/részleges hiba böngészőben; hosted DB/RLS. A munkanapló nem hivatalos e-építési napló.
- **Javasolt Conventional Commit:** `feat(M3): link saved calculation revisions to work logs`.

## M2 — Kalkulátor-suite mentése, újranyitása, revíziói (első kör: 4 tetős kalkulátor)

Státusz: **PASS WITH LIMITATIONS.** A `roof.rafter-cut`, `roof.material-takeoff`, `roof.timber-cutlist` és `roof.truss-members` menthető, projekt/felmérés nélkül. Mentés nélkül továbbra is számol; a nem mentett eredmény „Nincs mentve · helyi előnézet” jelölést kap.

- **Architektúra:** a suite számítása közös, keretrendszer-független modulba került (`src/features/calculators/construction-computation.ts`): ugyanaz a függvény adja a böngészős előnézetet és a szerveroldali újraszámítást. A böngésző csak az input-snapshotot küldi (kanonikus mm mezők + anyagos kalkulátornál kért csoportok, kiosztás, specifikációs szándék); a `saveConstructionCalculationAction` friss katalógussal újraszámol, és a korlátozott íróval menti (`src/infrastructure/supabase/construction-calculation-writer.ts`). Részletek: `docs/DATABASE.md` M2.
- **UI:** `ConstructionSavePanel` — név, állapot (nincs mentve / mentve Vn / mentetlen módosítás / korábbi Vk megnyitva), „Új revízió mentése · Vn+1”, ütközésnél „Aktuális változat betöltése”, revíziólista, eltérésjelzés, ha a mentett kimenet nem egyezik a mostani számítással (pl. katalógusváltozás). Mentetlen módosításra a meglévő navigációs védelem figyelmeztet. A `/kalkulatorok?calculation=` újranyit, a `/kalkulatorok/mentett` listázza az új típusokat.
- **Ellenőrzés:** új Vitest: számítás/snapshot (7), mentés-sáv (4), server action (3); teljes Vitest **169 fájl PASS / 8 SKIP, 1006 PASS / 19 SKIP**; `eslint .` PASS; `tsc --noEmit -p tsconfig.typecheck.json` PASS. pgTAP `056` 17/17, teljes pgTAP **58 fájl / 1250 PASS** (helyi). DB-típusok újragenerálva (csak hozzáadás). `next typegen`/build nem futott (aktív dev szerver a közös `.next`-en).
- **Böngésző (helyi DEMO, 375×812):** szarufa 300/200/50 cm → V1 mentve, DB-ben `construction.roof.rafter-cut`, standalone, projekt nélkül, 3000 mm input, 4206,476 mm szerveroldali output; módosítás → „Mentetlen módosítás”, V2 mentve; újratöltés után V2 értékei és neve (4326,662 mm, kézi számítással egyező); V1 megnyitása → „V1 megnyitva (korábbi) · mentéskor új V3 készül”. Faanyag-vágáslista mentése és újratöltése: kiosztás 90 cm, 26 db, 4883 mm, „Mentve · V1” (az anyagállapot snapshotja stabil). Mentett lista → megnyitás. Konzolhiba nincs. Közben a dev szerver egy régi lefordított modult szolgált ki; tartalomváltozás után helyreállt, kódhiba nem volt.
- **Nem ellenőrzött / korlát:** `roof.material-takeoff` és `roof.truss-members` mentése böngészőben (domain- és action-teszt fedi); ütközés és hálózati hiba böngészőben; hosted DB/RLS; a többi 27 suite-kalkulátor (12/7 döntés szerint későbbi kör). Munkanapló/ajánlat kapcsolat az M3/M4 része.
- **Javasolt Conventional Commit:** `feat(M2): save, reopen and revise roof suite calculations`.

## M1.2 — Hosszbevitel a dedikált tető-, fedés- és profilűrlapokon

Státusz: **PASS WITH LIMITATIONS.** A közös `LengthField` (cm alapértelmezés, mm/cm/m) bekerült: nyeregtető- és többsíkú tetőmodell-űrlap (`gable-roof-form`, `multi-roof-form`), standalone nyeregtető (`standalone-gable-preview`), faanyag- és alátétpanel (projekt, kalkulátor és felmérési tetőszakasz közösen), trapézlemez- és cserepeslemez-termékadatok, cserepeslemez-geometria, profilszerkesztő tangens- és darabhossz, felmérési tetőrészletek szélesség/magasság mezői.

- **Pontosság a mezők saját szerződése szerint:** tetőgeometria, faanyag, alátét, felmérési részletek egész mm; fedési termékadat és profilhossz 0,01 mm (a domain és a DB nem kerekít, így a meglévő tört mentett érték sem válik érvénytelenné). A `LengthField` opciója `integerMm` helyett `mmDecimals`; a `formatLength` most bármely mentett tizedes értéket pontosan jelenít meg (korábban tized mm-re kerekített volna).
- **Szándékosan mm-ben maradt (JÓVÁHAGYÁST IGÉNYEL):** profil anyagvastagság, belső sugár, hajlítási pótlék — tized mm alatti anyag-/gyártási paraméterek, nem elhelyezési hosszak.
- **Nem került bekötésre:** a felmérési mérések (`measurements`) — a mentett `{value, unit}` párt a `private.valid_field_survey_measurements` csak `mm`/`m` egységgel fogadja el; cm-hez migráció kellene egy kivezetendő (M5) funkcióban. A meglévő mm/m váltó marad. A `roofDetails.lengthM` (m-ben tárolt) és darabszám mezők változatlanok.
- **Tesztek:** 3 meglévő teszt elvárása mm-megjelenítésről cm-re pontosítva (szándékuk megmaradt; a „nincs gomb” állítás a mentő-/akciógombokra szűkült). Új: hiba/leíró/disabled, tört mentett érték pontos megjelenítése, mezőnkénti pontosság. Teljes Vitest **166 fájl PASS / 8 SKIP, 992 PASS / 19 SKIP**; `eslint .` PASS; `tsc --noEmit -p tsconfig.typecheck.json` PASS. `next typegen`/build nem futott (aktív dev szerver a közös `.next`-en).
- **Böngésző (helyi DEMO, 375×812):** nyeregtető 1000×800/300/50 cm → 112,50 m², 36,9°, 5,00/5,63 m (kézi számítással egyező); cserepeslemez 118,25 cm névleges szélesség → 120,615 m² névleges felület (1182,5 mm pontosan átment), 20 db; profil 7,25 cm → rajzon „S1: 72,5 mm”, mm-re váltva „72,5”. Nincs vízszintes túlcsordulás. Konzol: csak dev szerver HMR WebSocket-hiba. **Nem futott:** trapézlemez-panel és felmérési tetőrészletek böngészőben, tablet/desktop, fizikai eszköz.
- **Javasolt Conventional Commit:** `feat(M1.2): extend mm/cm/m length input to roof, covering and profile forms`.

## M1 — Egységes hosszbevitel (cm alapértelmezés, mm/cm/m)

Státusz: **PASS WITH LIMITATIONS.** A kalkulátor-központú terv ([0. fázis](CALCULATOR_FIRST_PHASE0_AUDIT.md)) első mérföldköve. Új `src/domain/measurements/length-input.ts`: pontos, decimális-szöveges mm/cm/m → mm konverzió (`1,001 m = 1001 mm` drift nélkül), tizedesvessző és pont, üres/köztes/érvénytelen állapot, egész-mm mezőn tört mm elutasítása (nincs csendes kerekítés), egyéb mezőn legfeljebb 0,1 mm. Új közös `src/components/ui/length-field.tsx`: alapértelmezés cm, mezőnkénti 44 px-es mm/cm/m váltó; érvényes értéknél a váltás a fizikai méretet megtartja, a szülő és a domain csak kanonikus mm-t kap.

- **Bekötve:** a `/kalkulatorok` suite minden `unit: "mm"` mezője (a meglévő `integer` jelölés szerint egész mm vagy 0,1 mm), a faanyag-kiosztás és az anyagspecifikáció mm-mezői (egész mm). Szög, darab, %, terület, térfogat, tömeg, ár változatlan. Számítási motor, mentési szerződés, DB nem változott; az eredmény- és bemenet-visszhang továbbra is mm-ben jelenik meg (12/4. döntés nyitott).
- **Nincs még bekötve:** dedikált tetőmodell-, trapéz-/cserepeslemez-, profil- és felmérési űrlapok (M1 második kör). A nem használt `units.ts` `mToMm`/`cmToMm` lebegőpontos korlátja változatlan; a bevitel nem azt használja.
- **Ellenőrzés:** új tesztek 2 fájl / 14 PASS (köztük 0–20 000 mm minden egységpárra oda-vissza driftmentesség); érintett mappák 38 fájl / 371 PASS; teljes Vitest 166 fájl PASS / 8 SKIP, 989 PASS / 19 SKIP; `eslint .` PASS; `tsc --noEmit -p tsconfig.typecheck.json` PASS. A `next typegen` és a build nem futott, mert aktív dev szerver használja a közös `.next`-et.
- **Böngésző (helyi, authenticated DEMO, 375×812 sötét/világos és 320 px): PASS.** `roof.rafter-cut`: 300/200/50 cm → 3605,551 / 600,925 / 4206,476 mm, 33,69° (független számítással egyező); cm→m→mm→cm váltás 300→3→3000→300, eredmény változatlan; `2,001 m` → 2001 mm; `2,3,4` → hibaüzenet, `aria-invalid`, eredmény elrejtve. `roof.timber-cutlist`: `12,34 cm` egész-mm mezőn elutasítva; 1000×800 cm, 35°, 90 cm osztás → 26 szarufa, 4883 mm, 126,961 m; a kiosztási mezőn 90 cm→900 mm→0,9 m mellett is azonos eredmény. 44 px-es egységgombok, vízszintes túlcsordulás nincs; konzolhiba és React-figyelmeztetés nincs. Az ellenőrzés során talált gyenge sötét témás kiemelést (csak színkülönbség) kerettel javítottam. Tablet/desktop és fizikai eszköz nem futott.
- **Javasolt Conventional Commit:** `feat(M1): add mm/cm/m length input with cm default to calculators`.

## F9.73.1 — Munkanapló betöltési hibáinak izolálása

Státusz: **PASS WITH LIMITATIONS.** Az anyaglista, a kapcsolt dokumentumtípusok és az önálló ajánlatjelöltek hibája a saját panelt/forrást érinti; az egymástól független munkanapló-részek tovább használhatók. A jogosultsági hiba külön állapot; hiányzó cél, current revision vagy exact felmérésforrás nem lesz üres/teljes adatként vagy másik revízióval bemutatva. A kötelező workspace- és immutable ajánlatforrás hard failure maradt.

- **Ellenőrzés:** célzott 6 fájl / 44 teszt PASS; lint PASS; teljes Vitest 164 fájl PASS / 8 SKIP, 975 PASS / 19 SKIP; izolált typecheck és Next.js 16.4.2 Webpack build PASS (32 statikus oldal); `git diff --check` PASS.
- Authenticated DEMO browser smoke: az első betöltés error boundary állapotot adott; manuális reload után az üres anyaglista-panel és két kapcsolt dokumentum betöltött. Az első hiba oka ismeretlen. Hosted DB/RLS és böngészős hibaszcenárió nem futott.
- Ismert, e körön kívüli blokkoló lehetőség: a projekt-metaadat ugyanabban a page-level `Promise.all`-ban maradt. Részletes határok, tesztmátrix és bizonyíték: [`WORKSPACE_FAULT_ISOLATION_F9.73.1.md`](WORKSPACE_FAULT_ISOLATION_F9.73.1.md).
- **Javasolt Conventional Commit:** `fix(F9.73.1): isolate optional workspace read failures`.

## F9.73 — Workspace betöltés és kapcsolt rekordok hibatűrése

Státusz: **PASS WITH LIMITATIONS.** A hibás vagy hiányzó kapcsolt felmérési revízió már nem állítja le a munkanapló oldalát: a helyes testvérrekordok megmaradnak, a hiányos forrás külön figyelmeztetést kap. A felmérési olvasási hiba, jogosultság-megtagadás és valóban üres kapcsolat külön állapot. A felmérési fotó aláírási hibája csak a fotót érinti. Az immutable ajánlati forrás exact quotation/revision olvasási vagy párosítási hibája hard failure marad; így az oldal/PDF nem mutat hiányos forrást teljesként.

- A lekérdezések szervezeti szűrése, exact revision matching, read-only F9.70.1 kompatibilitás és migrációs FK/RLS-szerződés megmaradt; adatbázis- vagy hostolt RLS-változás nem történt.
- Célzott execution tesztek: **7 fájl / 30 PASS**; teljes Vitest: **161 fájl PASS / 8 SKIP, 949 PASS / 19 SKIP**; lint PASS; izolált typecheck PASS; izolált Next.js 16.4.2 Webpack build PASS (32 statikus oldal).
- Helyi, authenticated DEMO böngészősmoke: munkanaplólista és egy exact linked survey card megjelent a részletoldalon. Hibaállapotok tesztkomponenssel ellenőrizve; hosted DB/RLS és storage-hiba nem futott. `git diff --check` PASS; az új, még nem tracked szövegfájlokban sincs záró whitespace.
- Ismert korlát: az execution részlet shared `Promise.all`-jában az anyaglista-, kapcsoltdokumentum- és ajánlatjelölt-betöltés hibája továbbra is blokkolhatja az oldalt. Részletes besorolás és bizonyíték: [`WORKSPACE_RELIABILITY_F9.73.md`](WORKSPACE_RELIABILITY_F9.73.md).
- **Javasolt Conventional Commit:** `fix(F9.73): isolate related workspace failures`.

## F9.70.1 — Történeti felmérési pillanatképek kompatibilitása

Státusz: **PASS WITH LIMITATIONS.** A F9.70 utáni reader megerősített regresszióját javítottam: a migrációk által érvényesnek tekintett, `semanticType` nélküli régi mérés most explicit `custom` alapértéket kap kizárólag az execution olvasási határán. A hiányzó/nullable `sections` flat fallbackje, a pontos revízió és a szervezeti szűrés megmaradt. A teljes `surveySectionsSchema` most az üres/hibás section-listát is elutasítja; az immutable forrásadatot nem módosítja.

- Az érintett fogyasztó a `/kivitelezes/[planId]` kapcsolt felmérés panelje; a kivitelezési PDF nem olvas felmérési sectionöket. A sérült linked revision explicit reader-hibát okoz, és a lap közös `Promise.all` betöltése miatt továbbra is blokkolhatja a teljes tervoldalt; az app error boundary újrapróbálást ad.
- **Ellenőrzések:** execution **6 fájl / 22 PASS**; lint PASS; teljes Vitest **160 fájl PASS / 8 SKIP, 941 PASS / 19 SKIP**; izolált `npm run typecheck` PASS; izolált `npm run build` PASS (Next.js 16.4.2 Webpack, 32 statikus oldal); `git diff --check` PASS.
- Az aktív Next.js szerverfolyamat ellenőrzését a rendszer megtagadta (`ps` permission denied), ezért typegen és build ideiglenes, külön `.next` kimenetű másolaton futott. DB/pgTAP, hosted RLS/Storage és böngésző nem futott; hosted adatot nem érintettem.
- Részletes szerződés-összevetés, előtte/utána viselkedés és nem igazolt régi formátumok: [`HISTORICAL_SNAPSHOT_COMPATIBILITY_F9.70.1.md`](HISTORICAL_SNAPSHOT_COMPATIBILITY_F9.70.1.md).
- **Javasolt Conventional Commit:** `fix(F9.70.1): preserve historical survey snapshots`.

## F9.72.2 — AI fejlesztői útmutatók pontosítása

Státusz: **dokumentáció-only módosítás kész.** Az `AGENTS.md` pontosítja a mérföldkő-hatókört, az implementáció bizonyítékait, a közös `.next` védelem feltételeit és a kockázatalapú böngészőellenőrzést. A `CLAUDE.md` készségválasztási szabálya rugalmasabb, az útmutatók közös részei az `AGENTS.md`-re támaszkodnak.

- Ellenőrizve: csomagparancsok, dokumentumhivatkozások, kritikus biztonsági szabályok és a Next.js által generált blokk hash-e. `git diff --check` PASS.
- Aktív Next.js folyamatlista nem volt lekérdezhető (`sysmond` nem elérhető); build, typegen és alkalmazásteszt nem futott.

Javasolt Conventional Commit: `docs(F9.72.2): harden agent development guidance`.

## F9.72.1 — Dokumentációs kontextus és duplikáció ellenőrzése

Státusz: **célzott docs-konszolidáció kész.** A megerősített ismétléseket rövidítettem az `AGENTS.md`/`CLAUDE.md` között, és pontosítottam, hogy csak az aktuális összefoglaló és a releváns `PROGRESS.md`-rész olvasandó. A kontextusmérést, betöltési bizonyítékokat és korlátokat a [`DOCUMENTATION_CONTEXT_REVIEW_F9.72.1.md`](DOCUMENTATION_CONTEXT_REVIEW_F9.72.1.md) rögzíti; történeti és biztonsági tartalom megmaradt.

Javasolt Conventional Commit: `docs(F9.72.1): reduce duplicated agent guidance`.


## F9.72 — Dokumentációs audit és konszolidáció

Státusz: **dokumentációs-only cleanup; forráskód és adat nem változott.** Az aktív napló F9.63.1–F9.71 részletei megmaradtak; a 217 korábbi teljes bejegyzés az [`archive/PROGRESS_HISTORY.md`](archive/PROGRESS_HISTORY.md)-be került, régi anchorokhoz aktív címsor-indexszel. Az [`README.md`](README.md) adja a dokumentációs útmutatót, a részletes audit és teljes fájlleltár a [`DOCUMENTATION_CLEANUP_F9.72.md`](DOCUMENTATION_CLEANUP_F9.72.md) alatt található.

- Javítva a pilot-, projekt- és átadódokumentumok fotó-EXIF/GPS-állítása, az eltávolított gutter/flashing útvonalak térképe és két F9.59 után törött forráslink. Hosted ingress, régi fotók/retention és F9.70 történeti snapshot-kompatibilitás továbbra is nyitott.
- Nem töröltem vagy vontam össze bizonytalan/egyedi bizonyítékot tartalmazó auditot.
- Futtatott ellenőrzések és mérőszámok: F9.72 auditjelentés.

Javasolt Conventional Commit: `docs(F9.72): consolidate project documentation`.

## Jelenlegi állapot — 2026-10-23

- Az utolsó befejezett mérföldkő az F9.71 URL-architektúra-audit; az alkalmazáskódban nem talált igazolt, hardcode-olt production app-origin hibát.
- Az alkalmazás URL-stratégiája azonos hosthoz relatív; hosted Auth, proxy/CDN, deployment és pilot-ready működés továbbra sincs igazolva.
- A felmérési fotó feltöltés Sharp segítségével újrakódolja a képet, ezért az EXIF/GPS metaadatok eltávolításra kerülnek. Az alkalmazási méretkorlát bizonyított (10 MiB/fájl, 11 MiB/kérés), a hosting ingress korlátja nem.
- Az F9.70.1 igazolta és javította a régi, `semanticType` nélküli felmérési mérések olvasását. A hibás linked section teljes oldalt blokkoló hibáját az F9.73 izolálta; hosted snapshotok és további, nem bizonyított történeti alakok továbbra sem voltak ellenőrizve.
- Pilotblokkolók: hosted környezet, cross-org staging, backup/restore, RPO/RTO, adatvédelmi és retention döntések, valamint szakmai/jogi review. Lásd [pilot readiness](PILOT_READINESS.md).

A legutóbbi mérföldkövek teljes, ellenőrzési részletekkel ellátott bejegyzései alább maradnak. A korábbi teljes bejegyzések változatlan tartalommal az [archívumban](archive/PROGRESS_HISTORY.md); a fejezetcímek megmaradtak, hogy a meglévő hivatkozások továbbra is oda navigáljanak.

## F9.71 — URL-architektúra és production-readiness audit

Státusz: **audit complete; igazolt production URL-hiba nincs.** 39 loopback URL-találat helyi tesztet, segédscriptet vagy Supabase Auth-konfigurációt szolgál; két `192.168.1.31` hivatkozás a meglévő LAN-fejlesztői beállítás. 177 alkalmazáskódbeli URL-/navigációs kifejezést vizsgáltam: a belső útvonalak relatívak, Supabase-origin külön konfigurált, alkalmazás-`APP_URL` jelenleg nem szükséges. A hostolt Auth és proxy/CDN konfiguráció nem volt hozzáférhető, ezért ellenőrizetlen.

- **Módosítás:** csak ez az előrehaladási bejegyzés és az új [`URL_ARCHITECTURE_AUDIT_F9.71.md`](URL_ARCHITECTURE_AUDIT_F9.71.md); kód, route, környezeti fájl, külső beállítás és adat nem változott.
- **Ellenőrzés:** célzott Auth/API tesztek **3 fájl / 19 PASS**; `git diff --check` PASS. Teljes regresszió, lint, typecheck, build, DB és browser nem futott; csak dokumentáció változott.
- **Javasolt Conventional Commit:** `docs: F9.71 record URL architecture audit`

## F9.70 — Execution Data Layer Type Safety & Mapping Optimization

Státusz: **a `LooseClient`/`any` határ megszűnt; a lekérdezések a generált Supabase sémából tipizáltak, a tervkapcsolatok egyszeri indexeléssel készülnek.** Az overview/workspace queryk, oszlopok, explicit organization szűrők, RLS-t használó SSR kliens, signed URL-ek, sorrendek és limitek nem változtak. Az export route addigi típuscastjai eltűntek; a subtotal alkalmazási típusa a DB-sémában tárolt számot tükrözi.

- **Paritás és mock mérés:** a régi implementáción előre futtatott, majd az új kódon változatlanul futtatott tesztek a workspace/overview/survey export-kimenetet, üres állapotot, nullable/hiányzó kapcsolásokat és cross-org/unrelated sorokat fednek. Ugyanazon 21-futásos mock medián 1/50/200 tervnél **0.020/0.392/4.349 ms → 0.019/0.154/0.737 ms**; mindegyiknél 7 DB-kérés maradt. Ez nem production vagy hálózati gyorsulási bizonyíték.
- **Ellenőrzések:** 5 célzott teszt PASS; izolált `npm run lint`, `npm run typecheck`, teljes `npm test` **160 fájl / 938 PASS / 8 fájl és 19 teszt SKIP**, `npm run build` (Next.js 16.4.2 Webpack, 32 statikus oldal) PASS. A typegen/build a 3000-es fejlesztői szerver fő `.next` könyvtárát nem érintő másolaton futott. `git diff --check` a végső diff áttekintés után.
- **Korlát:** élő Supabase/pgTAP, hosted RLS/Storage és böngészős ellenőrzés nem futott; memóriahasználatot nem mértem. A survey JSON snapshot szakaszai meglévő domain sémával validálódnak; hibás vagy a sémától eltérő történeti JSON esetén az új, szűk típusos határ hibát adhat a korábbi loose cast továbbadásával szemben. DB/migration/RLS/auth/RPC/írási út és történeti adat nem változott.
- Részletes bizonyíték és mérési korlátok: [`EXECUTION_DATA_REFACTOR_F9.70.md`](EXECUTION_DATA_REFACTOR_F9.70.md).
- **Javasolt Conventional Commit:** `refactor: F9.70 type execution data mappings`

## F9.69 — Biztonságos fotófeltöltési határ és erőforrás-védelem

Státusz: **az alkalmazási multipart parser előtti korlát megvalósítva; a hosted ingress-korlát és teljes DoS-védelem nem igazolt.** A Route Handler auth után 11 MiB teljes body-t olvas streamből, 10 MiB kép + 1 MiB multipart/mező többletkerettel; hiányzó vagy kisebbre mondott `Content-Length` mellett is számlál. A túllépés parser előtt 413, írási mellékhatás nélkül. A meglévő 10 MiB/kép szerződés, MIME/magic-byte, Sharp/EXIF, auth/org, reservation/attach/retry és privát Storage út változatlan.

- **Ellenőrzések:** fókuszteszt 1 fájl / 12 PASS; lint PASS; teljes Vitest 159 fájl PASS / 8 SKIP, 933 PASS / 19 SKIP; izolált `npm run typecheck` és `npm run build` PASS; `git diff --check` PASS. HTTP/hosted ingress, DB/pgTAP és browser teszt nem futott.
- **Nyitott rollout-kapu:** repositoryban nincs igazolt deployment platform vagy pre-parser ingress-limit. Hoszt tulajdonosa erősítse meg legalább 11 MiB teljes kérés kompatibilitását; a handler korlátja nem ingress vagy konkurencia-limit.
- Részletes adatút, kockázat, host-kompatibilitási döntés, tesztmátrix és korlátozások: [`PHOTO_UPLOAD_SECURITY_F9.69.md`](PHOTO_UPLOAD_SECURITY_F9.69.md).
- **Javasolt Conventional Commit:** `fix: F9.69 bound survey photo request bodies`

## F9.68 — Mérnöki architektúra-, kódminőség- és működési audit

Státusz: **AUDIT COMPLETE — nincs igazolt P0/P1 kódhiba; 4 P2 finding és 2 hosted/operációs rollout-kapu dokumentálva.** Audit-only: alkalmazáskód, konfiguráció, adatbázis és build cache nem változott. A munkafa induláskor tiszta volt; a lokális `main` egy commit-tal előrébb állt az `origin/main`-nél, és a 3000-es dev szervert érintetlenül hagytam.

- **Fő findings:** munkanapló adatlekérő loose `any`/cast határa és ismételt sor-keresése; survey photo multipart fájlméret-ellenőrzése csak `request.formData()` után; a fotó EXIF/GPS-stripping tényleges működése eltér a pilot dokumentációjától; `.next` 6.2 GB, ebből 2.9 GB Next 16.4.0-s verzióspecifikus Turbopack cache és 1.8 GB külön Webpack build cache. Nem állítok production runtime lassulást a cache-méretből.
- **Megőrzendő:** feature/domain/infrastructure határok, auth/org + RLS/RPC ellenőrzés, immutable revision/snapshot, expected-version és idempotens retry; a vizsgált új survey ID és retry szerződés megfelelő. Hosted cross-org/Storage, backup-restore, RPO/RTO, monitoring és mobil terepi ellenőrzés nincs bizonyítva, ezért széles SaaS rollout előtt kapu marad.
- **Ellenőrzések:** `npm test` **159 fájl PASS / 8 SKIP; 924 teszt PASS / 19 SKIP; 4,13 s**. `npm run lint` **PASS**, ESLint: no issues. A typecheck/build nem futott, mert a 3000-es aktív dev szerver mellett `next typegen` és build ugyanazt a `.next` területet érintheti. DB/pgTAP és browser/hosted teszt nem futott.
- Részletes bizonyíték, lefedettségi korlát, maturity matrix, cache-bontás és roadmap: [`ENGINEERING_EXCELLENCE_AUDIT_F9.68.md`](ENGINEERING_EXCELLENCE_AUDIT_F9.68.md). A következő javasolt implementációs milestone: F9.69 — a fotó API hosting/ingress request-body korlátjának ellenőrzése, és ha hiányzik, a legkisebb platformszintű védelem.
- **Javasolt Conventional Commit:** `docs: F9.68 record engineering excellence audit`

## F9.67 — Safe Snapshot JSON Helper Deduplication

Státusz: **a három viselkedésazonos kulcsrendező helper egy közös TypeScript függvénybe került; snapshot/revízió/persistence contract változatlan.** A két saved-covering reader összehasonlításra használja, a trapezoidal panel pedig dirty state és edit-signature meghatározásra. A helper JSON.stringify replacere rekurzívan `localeCompare` szerint rendezi az objektumkulcsokat, a tömbök sorrendjét megtartja; sem decode, sem adatírás nem történik.

- **TDD / parity:** a két régi loader tesztben előbb rögzítettem a nested, eltérő kulcssorrendű historikus output elfogadását és az input változatlanságát; ezek a régi kóddal 7/7 PASS voltak. Ezután a közös `stableJsonStringify` négy tesztje rögzíti az objektum/tömb sorrendet, null/undefined, IEEE-754 JSON-kimenetet, fagyasztott bemenetet, BigInt `TypeError`-t és a ciklikus input korábbi `RangeError`-át.
- **Érintett kód/teszt:** `src/features/roof-models/stable-json.ts`; a két covering data reader és a `gable-trapezoidal-covering-panel.tsx`; a dedikált helper, két reader és meglévő UX/persistence tesztek.
- **Ellenőrzés:** fókuszteszt 6 fájl / 22 PASS; `npm run lint`, `npm run typecheck`, teljes `npm test` (159 fájl / 924 PASS, 8 fájl és 19 teszt SKIP), `npm run build` (Next.js 16.4.2 webpack, 32 statikus oldal) PASS. `git diff --check` végleges dokumentáció után.
- **Adatintegritás:** nincs schema/migration, revision ID, képlet, snapshot formátum, mentett adat vagy Supabase-művelet változás. Böngésző- és DB-teszt nem futott; csak strukturális összehasonlítás és UI dirty-state kód érintett.
- **Javasolt Conventional Commit:** `refactor: F9.67 share stable snapshot JSON serialization`

## F9.66 — Safe Dependency Cleanup & Dead-Code Verification

Státusz: **az igazoltan nem használt `liquid-glass-react@1.1.1` eltávolítva; további törlés nincs bizonyítva.** A kód/config/dinamikus belépők, tesztek, SSR/runtime oldalhatások, npm dependency graph és F9.39.1 kompatibilitási előzmény ellenőrizve. A saját CSS-tokenes Liquid Glass rendszer változatlan. Egy három helyen ismétlődő snapshot-JSON helper külön, kis hasznú deduplikációs jelölt; a legacy `/kalkulatorok/epitesi` redirect és minden migration/route megmaradt.

- **Footprint:** runtime dependency 12→11; lock package rekord 350→349; telepített csomag 208 KiB volt; npm diff csak a package deklarációt és az egyetlen 14 soros lockbejegyzést távolította el.
- **Ellenőrzés:** célzott Liquid Glass teszt 2 fájl / 8 PASS; lint, typecheck, teljes Vitest (158 fájl / 918 PASS, 8 fájl és 19 teszt SKIP), Next.js 16.4.2 webpack build PASS. `git diff --check` a végleges dokumentumok után újrafuttatva.
- **Korlát:** böngésző smoke és DB teszt nem indokolt/nem futott, DB és üzleti adat nem változott. Knip nincs telepítve; teljes exported-symbol dead-code gráf ezért nem igazolt. Részletes jelöltek és evidence: [`CODE_CLEANUP_F9.66.md`](CODE_CLEANUP_F9.66.md).
- **Javasolt Conventional Commit:** `chore: F9.66 remove unused liquid-glass dependency`

## F9.65 — Anyagkatalógus- és kalkulátor-adatbetöltés optimalizálása

Státusz: **megvalósítva és lokálisan ellenőrizve**. A kalkulátor hub dedikált profilreadje már nem tölti le az árverziókat és az Anyagkezelő számára szükséges mezőket. A takeoff két kategóriánkénti, legfeljebb 200 termékes rendezett olvasása megmarad, a gyártó/kategória/variáns/ár kapcsolati betöltő viszont csak egyszer fut. A Material Manager általános loaderje, ár-historyje, auth/RLS, snapshotok és számítási eredmények nem változtak.

- **Azonos fixture, deterministic Supabase mock:** kalkulátor 6→4 kérés, 7→4 visszaadott sor, **2458→580 B** tömörítetlen JSON-válasz (**−76%**); üres katalógus 3→1 kérés. A kalkulátor profilok teljes kimenete megegyezik a régi teljes katalógus + domain profilépítő eredményével. Az új read csak a szükséges termék/gyártó/kategória/variáns mezőket választja ki, árat nem.
- **Takeoff mock összevetés:** két nem üres kategórián 12→7 kérés (**−42%**), 13→10 visszaadott sor, **3052→2534 B** mock JSON-válasz (**−17%**); üres kategóriákon 6→2 kérés. A tetőfedés/lemez sorrend, piece variáns, műszaki adat, provenance, teljes ár-historyből származó effective latest price és `latestPrice` szabály megmaradt. A két külön termékkérés szándékos, hogy mindkét kategória saját 200-as limitje és rendezése változatlan legyen.
- **Adatvédelem/konzisztencia:** minden új query explicit `organization_id` szűrésű és a meglévő SSR Supabase klienst/RLS-t használja; nincs privilegizált kliens, cache vagy árazási logika duplikálása. Külön szervezet és nem kért kategória fixture sora nem kerül az eredménybe. A történeti snapshot/írási kód érintetlen.
- **Ellenőrzések:** RED→GREEN regressziós tesztek; célzott 2 fájl / 5 teszt PASS; `npm run lint` PASS; `npm run typecheck` PASS; teljes `npm test` **158 fájl, 918 PASS, 19 skip**; izolált Next 16.4.2 webpack `npm run build` PASS (32 statikus oldal); `git diff --check` PASS. Böngészős smoke és élő DB/RLS timing nem futott: a kliensoldali viselkedés változatlan, a mock mérések nem mutatnak valódi hálózati vagy adatbázis-időt.
- **Mérési korlát:** a bájtok a tesztfixture kiválasztott JSON sorainak tömörítetlen méretei; nem tartalmaznak HTTP overheadet, compressiont vagy Postgres időt. A kalkulátor régi/új rekord- és byte-összehasonlítása ugyanazon, kisméretű DEMO-jellegű fixture-en történt. Production hatás nem állítható.
- **Javasolt következő mérföldkő:** ha valós felhasználói méret mellett továbbra is lassú a katalógus, külön, RLS alatti request/timing mérés reprezentatív több gyártós/árverziós lokális fixture-rel; indexet vagy cache-t csak ilyen bizonyíték után mérlegeljünk.
- **Javasolt Conventional Commit:** `perf: F9.65 narrow calculator and takeoff catalog reads`

## F9.64 — Backend-, adatbázis- és renderelési teljesítményaudit

Státusz: **AUDIT COMPLETE — PASS WITH FINDINGS**. Kód- és migrációváltozás nélkül, külön production builden és helyi authenticated DEMO sessionben készült. Három read-only RLS `EXPLAIN (ANALYZE, BUFFERS)` terv lokálisan lefutott; a minimális adatmennyiség nem alkalmas production következtetésre. Két material/takeoff többletolvasási minta forrásból igazolt, runtime hatásuk nyitott. A böngészőben vizsgált dashboard, felmérés, kalkulátor és anyagkeresés működött; mért renderköltség nem igazolt szűk keresztmetszetet. CSS/GPU, mobil, quote/worklog runtime, memory-trend és szerveroldali route query-count nincs teljesen ellenőrizve.

- **Mérés:** dashboard 49 request, 293 670 B átvitel; DCL 179 ms, Load 330 ms. Survey input labor-INP 72 ms, CLS 0; kalkulátor eredmény és SVG helyesen frissült. Izolált build CSS: 553 474 B raw / 76 855 B gzip. Ezek egyetlen lokális DEMO session mérési adatai, nem production becslések.
- **Ajánlás:** külön F9.65 read-model optimalizálás a kalkulátor profil-only és takeoff kategória betöltéshez, előtte/utána azonos RLS alatt mért query/byte/idő adatokkal. Részlet/takeoff snapshot fallback optimalizálás külön követendő. Auth/cache, index és CSS módosításra nincs bizonyíték.
- **Ellenőrzés:** izolált `npm run build` PASS; 3 lokális read-only RLS query plan; célzott böngészős workflow-k. Teszt/lint/typecheck nem futott, adatbázis- vagy termékkód nem módosult. Részletes evidence, finding-kockázatok, tesztterv és mérési korlátok: [`docs/PERFORMANCE_AUDIT_F9.64.md`](PERFORMANCE_AUDIT_F9.64.md).
- **Skills/eszközök:** `ponytail`, `supabase`, `supabase-postgres-best-practices`, `build-web-apps:react-best-practices`, `build-web-apps:frontend-testing-debugging`; helyi Postgres read-only query plan, külön production build, Brave DevTools. Nincs telepítés vagy új plugin.
- **Javasolt Conventional Commit:** `docs: F9.64 record backend and rendering performance audit`

## F9.63.4 — Production kalkulátorbetöltés és lazy-loading megbízhatóság

Státusz: **PASS WITH FINDINGS**. Külön temp munkafán futtatott Next 16.4.2 webpack production build és 3100-as helyi szerver; a meglévő 3000-es dev szerver és annak `.next` könyvtára érintetlen maradt. Bejelentkezett helyi DEMO Brave sessionben a `/kalkulatorok`, kategóriachunkok, rajz betöltése, 375×812 deep link és 3G gyors kategóriaváltás működött. Egy concrete chunk DevTools blokkolása a kiválasztást megtartó, újrapróbálható hibaállapotot adott; a tiltás feloldása után 200-as válasszal helyreállt. Megerősített regressziót nem találtam.

- **Cold cache / production Network:** 1440px route load: 16 JS / 51 kérés; **233 906 B (~234 kB) JS** / **623 260 B** összes átvitel; DCL 179 ms, Load 297 ms. Stair: két chunk, 7 491 B átvitel; concrete definíció: 4 951 B; első rajz a teljesen cold 375×812 cölöp deep linken két chunk, 21 335 B. Ezek átviteli adatok, nem parse/execute idő és nem F9.63.2 manifest-gzip közvetlen összevetés.
- **3G + retry:** 5,75 s DCL / 17,51 s Load / 24,86 s hálózati Finish. Stair→concrete váltás alatt mindkét chunk pending volt; a kiválasztott concrete kalkulátor maradt aktív. Visszaváltáskor nem történt új chunkkérés. Blokkolt `7708…js`: UI `alert` + Retry, a szabály levétele után 200 OK és betöltött form; Console-ban csak az irányított blokkolás warningja volt.
- **Ellenőrzés:** izolált `npm run build` PASS; `npm test -- src/features/calculators/construction-calculator-loading.test.ts` PASS (1 fájl / 3 teszt); `git diff --check` a dokumentáció véglegesítése után. Teljes suite/lint/typecheck, CPU/Performance trace, INP/CLS, light theme és exact pending-request unmount race nem ellenőrzött. Részletes mátrix, forrás-review, korlátok és F9.63.2 baseline: [`docs/PERFORMANCE_VALIDATION_F9.63.4.md`](PERFORMANCE_VALIDATION_F9.63.4.md).
- **Döntés:** F9.63 kódszétválasztás funkcionális és hibatűrő elfogadása lezárható **PASS WITH FINDINGS** státusszal; runtime sebességelőny nem állítható. Következő ajánlott lépés: **F9.64 — RLS/query-plan és CSS/GPU audit, valós felhasználói mérés**; nem indítottam el.
- **Javasolt Conventional Commit:** `test: F9.63.4 validate production calculator loading`

## F9.63.3 — Kalkulátor runtime és betöltési validáció

Státusz: **PASS WITH FINDINGS**. A három kalkulátorkategóriát és a `concrete.pile` deep linket valós, hitelesített helyi DEMO-munkamenetben, Brave-ben ellenőriztem. Reprezentatív tető-, lépcső- és betoneredmények, rajzbetöltés, kategória- és history-navigáció, 375/768/1440 px-es reszponzív nézet és billentyűzetes kategóriaváltás működött; megerősített regressziót nem találtam.

- **Network (meleg cache, Next 16.4.2 dev/Turbopack, throttling nélkül):** `/kalkulatorok` 45 kérés / 24 JS, 25 131 B átvitel / 6 912 370 B erőforrás; a tető modul az induló naplóban jelent meg. Stair és concrete kiválasztás külön JS chunkkérést adott hozzá; ismételt stair-választás nem kért új chunkot. Érvényes cölöpbemenet után jelent meg a 309 kB-os fejlesztői rajzchunk. A 304-es válaszok és disk cache miatt ez nem cold vagy production átviteli mérés.
- **Forrás és ellenőrzés:** async ID-őr, kiválasztott kalkulátorhoz kötött betöltés és státusz/hiba/retry UI kódból ellenőrizve. `npm test -- src/features/calculators/construction-calculator-loading.test.ts`: 1 fájl / 3 teszt PASS; Console: 0 üzenet. Teljes teszt/lint/typecheck/build ebben a mérföldkőben nem futott.
- **Nem ellenőrzött:** production runtime/cold cache, lassított hálózatú race, chunkhiba és retry, teljes invalid input mátrix, kalkulátor input módosításának újraszámítása, React Profiler/long task/CLS/INP. Részletes környezet, Network értékek, mátrix, besorolás és követés: [`docs/PERFORMANCE_VALIDATION_F9.63.3.md`](PERFORMANCE_VALIDATION_F9.63.3.md).
- **Javasolt Conventional Commit:** `test: F9.63.3 validate calculator runtime loading`

## F9.63.2 — Kalkulátormotorok kategória szerinti lusta betöltése

Státusz: **megvalósítva és build-artifactokkal, valamint Vitesttel ellenőrizve**; a tényleges böngészős interakciót nem sikerült igazolni. A képletek, eredmények, azonosítók, katalógus, mentési/adatbázis-szerződések nem változtak. Nincs commit; az F9.63.1 és a korábbi munkafa-módosítások megmaradtak.

- **Előtte:** a `construction-suite.tsx` kliensmodul statikusan importálta mind a 31 kalkulátor definícióját/motorját, valamint a lépcső- és betonrajzokat. A kiválasztás szinkron `definitions[item.id]` lookup volt.
- **Utána:** a könnyű katalógus maradt a választó forrása; a tető, lépcső, illetve beton/segéd kategória definíciója külön dinamikus modulként, csak kiválasztáskor töltődik be. Az import eredményét a kijelölt azonosítóhoz kötjük; gyors váltásnál az elavult válasz nem írhatja felül az aktuálisat. A betöltésnek elérhető, újrapróbálható állapota van, amely `clamp(24rem, 58vh, 40rem)` minimális munkaterület-magassággal mérsékli az elrendezés-ugrást. A thumbnail közvetlenül a könnyű modulból érkezik, a lépcső- és betonrajzok csak a számított nézetnél töltődnek.
- **Build-artifact mérés, azonos `npm run build` / `next build --webpack` mód:** a Next client-reference manifest `construction-suite.tsx` bejegyzésének egyedi, statikusan hozzárendelt chunkjait a Node `zlib.gzipSync` mérte. A suite statikus chunkkészlete **359 264 B / 94 023 B gzip → 257 155 B / 78 218 B gzip**, azaz **−28,4% nyers / −16,8% gzip**. A route-specifikus chunk **204 604 / 54 876 → 105 864 / 30 472 B**, **−48,3% / −44,5%**; a hozzá rendelt megosztott chunkok együtt **154 660 / 49 147 → 151 291 / 47 746 B**. Ez manifest szerinti artifactméret, nem böngészőben mért hálózati átvitel, parse/execute idő vagy felhasználói sebesség.
- **Késleltetett chunkok:** tető definíció **5 282 / 1 879 B gzip**; lépcső definíció **24 993 / 6 894 B gzip** két szükséges chunkon; beton/segéd definíció **17 434 / 4 621 B gzip**. A rajzmodul további **76 939 / 20 719 B gzip** (a lépcső/beton rajzhoz közös chunkokkal), és csak a rajz megjelenítésekor kérődik le. A statikus suite chunklistában egyik kategóriadefiníció chunkja sincs benne; a buildelt route-loader ezeket kategóriánként aszinkron chunkként hivatkozza. A katalógus metaadatai továbbra is a kezdeti útvonal részei.
- **Szerződés/regresszió:** a 31 ellenőrzött katalógus-ID mindegyike a saját kategóriadefiníciójához oldódik; az invalid/default ID a korábbi `roof.rafter-cut` alapértelmezést használja. A mező-alapértékek és `advanced` jelölések, anyagállapot ID szerinti megőrzése, rajz- és számítási motorok változatlanok. Új reprezentatív szarufa- és cölöperedmény-paritásteszt. Két korábbi statikus HTML teszt most a mezőmetaadatot és a szerveroldali loading shellt ellenőrzi, mert a definíció csak kliensoldali aszinkron betöltés után áll rendelkezésre.
- **Ellenőrzések:** fókuszált 4 fájl / **115 teszt PASS**; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` **156 fájl PASS / 8 skip, 913 PASS / 19 skip** (a kiinduló 910 PASS-hoz képest 3 új); `npm run build` PASS; `git diff --check` a lezáró ellenőrzésben. A lokális production szerver elindult. Az IAB böngészőben a `/kalkulatorok` csak üres háttérrel és hozzáférési híddal jelent meg, kalkulátor DOM nélkül, ezért mobil/desktop, kategóriaváltás és Network/CPU runtime smoke **nem igazolt**; nem következtetek ennek okára.
- **Skill-ek:** `ponytail`, `build-web-apps:react-best-practices` (dinamikus import/splitting útmutató), `build-web-apps:frontend-testing-debugging` (a böngészőellenőrzés megkísérlése), `test-driven-development`, `verification-before-completion`, továbbá a telepített Next 16.4 lazy-loading útmutató. Külön böngésző-plugin nem volt az aktív eszközleltárban; új eszköz vagy függőség nem került telepítésre.
- **Korlát/következő lépés:** az induló UI a betöltés idejére rövid loading panelt mutat; a tényleges késleltetés és váltási élmény böngészőben még mérendő, a teljes matek/render kompatibilitást pedig nem bizonyítja kizárólag a loader teszt. Javasolt következő mérföldkő: **F9.63.3 — böngészős betöltési és navigációs mérés**.
- **Javasolt Conventional Commit:** `perf: F9.63.2 lazy-load calculator categories`

## F9.63.1 — Backend N+1 lekérdezések megszüntetése

Státusz: **implementálva és lokálisan ellenőrizve**. A két mentett fedéslista kalkulációazonosítók szerint batchben tölti a revíziókat, 1000 soros oldalazással, majd kalkulációnként a legfrissebb 100-at validálja és adja vissza. A felmérés nyeregtető-ellenőrzése három önállóan szervezeti hatókörű, legfeljebb 100 ID-s batchben olvassa a modellrevíziót, kalkulációs revíziót és dependency sort; az exact model–revision–calculation párosítás és az eredmény újraszámítása megmaradt. A dependency-kérdés explicit `organization_id` szűrést is kapott.

- **Lekérdezésszám (forráskódból számolt előtte, mockolt Supabase utána; nem DB-időmérés):** két számításnál a revíziókérés **2 → 1** (teljes lista a számításlistával együtt **3 → 2**); két jelölt modellnél az ellenőrzési hármas **6 → 3**. 1001 revíziónál a fedéslista két 1000-es oldalt kér le, és továbbra is pontosan a legfrissebb 100-at adja vissza. A lokális `max_rows = 1000` API-beállításhoz igazodik az oldalhatár.
- **Szerződés és biztonság:** a szervezet- és verziószűrés, validációs függvények, current revision ID kiválasztása, sorrend, 100/revízió limit és hiányzó/invalid/mismatch kizárás megmaradt. Nincs séma-, jogosultsági policy-, adat- vagy képletváltozás; snapshothoz nem ír.
- **Ellenőrzések:** célzott 6 fájl / 23 teszt PASS; `npm run lint` PASS; `npm run typecheck` PASS; `npm test` PASS (**155 fájl / 910 PASS / 19 skip**, 8 további fájl skip); `npm run build` PASS; `git diff --check` PASS.
- **Skill-ek:** `ponytail` a minimális megvalósításhoz, `supabase` / `supabase-postgres-best-practices` a batch és org/RLS határokhoz, `test-driven-development` a regressziós tesztek piros-zöld ciklusához, `verification-before-completion` a lezáró ellenőrzéshez. Az aktív leltárt a `docs/AI_TOOLING.md` alapján ellenőriztem; további plugin vagy külső adatbázis-kapcsolat nem kellett.
- **Korlát:** nem futott valódi DB/RLS-integráció vagy production query-plan/időmérés; a query-count állításokat teszt-double-ok igazolják, nem valós Supabase-forgalom. Javasolt következő mérföldkő: **F9.63.2 calculator bundle splitting**.
- **Javasolt Conventional Commit:** `perf: F9.63.1 batch roof revision reads`

## Korábbi mérföldkövek — teljes bejegyzések az archívumban

## F9.59 — Az F9.58 audit négy megerősített hibájának javítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-000).

## F9.57 — Mennyiség-formázás és asztali oldalbelsők a navigációs héjhoz

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-001).

## F9.56 — Alkalmazás-héj: navigáció, PWA-telepíthetőség és designrendszer-egységesítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-002).

## F9.55 — UI/UX újraértékelés és célzott finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-003).

## F9.54 — Felmérés 2.0 záró felületi ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-004).

## F9.53 — Felmérés 2.0 felületfinomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-005).

## F9.52 — Felmérés 2.0: meglévő tetőrészletek + mérési eredet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-006).

## F9.50.5.1 — Univerzális kereshető terméválasztó

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-007).

## F9.50.5 — Anyagkezelő ↔ tető-kalkulátor integráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-008).

## F9.50.4 — Faanyag-érvényesség és látható korlátok (F9.50.3 Codex-visszajelzés után)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-009).

## F9.50.3 — Kalkulátor-integritás javítások (F9.50.2 Codex FAIL után)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-010).

## F9.50.2 — Intelligens kalkulátor-bemenet (termék vagy kézi specifikáció)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-011).

## F9.50 — Nyereg- és félnyeregtető anyag-kimutatás lezárása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-012).

## F9.49 — Általános tetőfedés-kiosztás minden tetőformára

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-013).

## F9.48 — Manzárdtető a közös tetőgeometria-motorban

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-014).

## F9.47 — Tetőkalkulátorok feladat-alapú átalakítása (zhitov-elv)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-015).

## F9.46.1 — „Bádogos elemek hozzáadása” eltávolítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-016).

## F9.46 — Kontyolt/sátor/félkonty/L/T tetők egységes felmérés-felülete

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-017).

## F9.45.4 — Egységes felmérés-munkaterület és UX-finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-018).

## F9.45.3 — Felmérés-felület egyszerűsítése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-019).

## F9.45.2 — Láthatatlan, böngészőlokális felmérés-piszkozat (QA-javítva)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-020).

## F9.45.1 — Félnyeregtető: gyors mérés és QA-javítások

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-021).

## F9.44.6 — Felmérés-felület egységesítése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-022).

## F9.44.5 — Részletes nyeregtetőmérés és egyszerűbb felmérés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-023).

## F9.44.4 — Mérési eredet és duplikátum-felismerés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-024).

## F9.44.3 — Moduláris bádogos munkaelemek egy felmérésben

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-025).

## F9.44.2 — Gyors mérés → ellenőrzött forrás → anyaglista → ajánlat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-026).

## F9.44.1 — Moduláris felmérés: gyors tetőmérés (nyeregtető) — 1. fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-027).

## F9.43.2 — Termékoldal, műszaki rajz és felmérési mentősáv finomítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-028).

## F9.43.1 — Egységes árszerkesztő és Liquid Glass finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-029).

## F9.43 — Beszállítói áropciók és központosított munkadíj-szerkesztés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-030).

## F9.42.16 — Migráció-reprodukálhatóság és típusbiztonság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-031).

## F9.42.15 — Lemezprofil → anyagkimutatás → anyaglista → ajánlat-piszkozat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-032).

## F9.42.14 — Önálló lemezprofil → anyagkimutatás munkafolyamat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-033).

## F9.42.13 — Régi Project UI kivezetése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-034).

## F9.42.11 — Ereszcsatorna/szegély kalkulátorok és elavult fixture-ök kivezetése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-035).

## F9.42.10 — Helyi DEMO takarítás, felmérési ereszcsatorna/szegély kivezetése, minimális DEMO adatkészlet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-036).

## F9.42.8 — Többtetőformás munkafolyamat böngészős ellenőrzése és tesztstabilizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-037).

## F9.42 — Felmérés → anyaglista → ajánlatpiszkozat → munkanapló

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-038).

## F9.41.1 — Célzott Liquid Glass finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-039).

## F9.41 — Liquid Glass rendszer-egységesítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-040).

## F9.40.7 — Mobil UI/UX optimalizálás (U10 lezárva)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-041).

## F9.40.6 — Felmérés-szerkesztő elrendezés finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-042).

## F9.40.5 — UI/UX audit lezárás és munkafolyamat-ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-043).

## F9.40.4 — Ajánlat-szerkesztő UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-044).

## F9.40.3 — Globális tipográfia és akadálymentesség

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-045).

## F9.40.2 — Felmérés-szerkesztő UX véglegesítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-046).

## F9.40.1 — Felmérés-szerkesztő UX (mentés, mérőmezők, rajz)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-047).

## F9.39.1 — Elrendezési ritmus, Liquid Glass konszolidáció, horgonyzott beállításpanel

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-048).

## F9.39 — Precision Liquid Glass UI/UX modernizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-049).

## 2026-10-18 — Fejlécikon és favicon csere

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-050).

## F9.38.6 — Zhitov-referenciaszellemű, saját 2.5D kalkulátorikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-051).

## F9.38.5 — Geometriahű kalkulátorikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-052).

## F9.38.4 — Prémium minimalista műszaki ikonfinomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-053).

## F9.38.3 — Profi kalkulátorválasztó-ikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-054).

## F9.38.2 — Reszponzív kalkulátorikonok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-055).

## F9.37.4 — Claude Code fejlesztői projektátadás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-056).

## F9.38 — Lépcső- és betonozási kalkulátorok eredmény-lefedettsége

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-057).

## F9.38.1 — Bemenetek egyszerűsítése és műszaki rajzok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-058).

## F9.37.3 — Háttér finomítása és Safari React script-hiba javítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-059).

## F9.37.2 — Premium ambient dot-grid globális háttér

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-060).

## F9.37 — Premium Liquid Glass globális háttér

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-061).

## F9.31 — legacy kalkulátorfüggőségek és biztonságos mentésjavítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-062).

## F9.30 — Survey geometry különálló kalkulátoroktól

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-063).

## F9.29 — Architecture Audit & Workflow Rationalization

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-064).

## F9.27.2 — Anyaglista szerkesztő UX-stabilizálása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-065).

## F9.27 — Felmérésből szerkeszthető anyaglista

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-066).

## F9.27.1 — Felmérés-anyaglista provenance visszaállítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-067).

## F9.27 — ajánlati termékpanel és új tétel elhelyezése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-068).

## F9.26 — Regression repair és workflow-stabilizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-069).

## F9.26 — Kategóriás ajánlati termékválasztó

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-070).

## F9.25 — Egységes Liquid Glass felületszín

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-071).

## F9.25 — Kalkulátor-konszolidáció és napi workflow UX-audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-072).

## F9.24 — Tetőkalkulátorok előtérben és árva fájlok takarítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-073).

## F9.24.1 — Független építési kalkulátorcsomag

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-074).

## F9.23.1 — Árajánlat-szerkesztő UX és katalóguskapcsolat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-075).

## F9.22 — termék-UX és Anyagkezelő

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-076).

## F9.22.1 — Globális Vanta.NET teljesítmény és Liquid Glass alapfedettség

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-077).

## F9.23 — Anyagkezelő navigáció és kategóriás termékválasztó

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-078).

## F9.22.2 — Világos témájú Liquid Glass világosítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-079).

## F9.18 — iOS hibajavítások és mobil UX-megerősítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-080).

## F9.18.1 — Mérési UX és globális információhierarchia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-081).

## F9.18.3 — Globális oldalcímek és tetőelőnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-082).

## F9.18.2 — iOS rajzstabilitás és interakció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-083).

## F9.17 — Globális Liquid Glass interakció és visszajelzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-084).

## F9.16 — Mobile Acceptance & Closed Beta Readiness

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-085).

## F9.15.3 — Unified Liquid Glass Project Workspace

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-086).

## F9.15.1 — Project UX & Mobile Navigation Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-087).

## F9.15.0 — Settings UX, Mobile Header & Brand Identity

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-088).

## F9.7.6.6.3.2d — quotation pénzügyi konzisztencia és PDF hardening

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-089).

## F9.7.6.6.3.2d.1 — standalone PDF HTTP security acceptance

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-090).

## F9.7.6.5.2 — standalone számítás projektpéldánya (frontend)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-091).

## F9.7.6.5.1 — standalone számítás projektkapcsolása (backend)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-092).

## F9.7.6.4 — standalone calculator frontend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-093).

## F9.7.6.3 — standalone calculation persistence

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-094).

## F9.7.6.2 — standalone ownership és globális tetőgeometria

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-095).

## F9.7.6.1 — globális navigáció és standalone alapozás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-096).

## F8.1 — ajánlati piszkozatok (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-097).

## F8.2 — professzionális PDF-ajánlat (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-098).

## F8.3.1 — ajánlatkezelés és véglegesítés (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-099).

## F8.3.2 — ajánlati életciklus és státusztörténet (kész)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-100).

## Katalógushoz kötött, verziózott lemezkiosztás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-101).

## F7.3.2 korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-102).

## Tetőlemez-kiosztás és ideiglenes SVG-előnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-103).

## F7.3.1 ismert határok és F7.3.2

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-104).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-105).

## F7.2 elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-106).

## F7.2 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-107).

## F7.2.3 mobil UX és SVG stabilizálás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-108).

## F7.2.4 touch pan finomhangolás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-109).

## F7.2 nyitott korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-110).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-111).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-112).

## F7.1 elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-113).

## F7.1 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-114).

## F7.1 nyitott korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-115).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-116).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-117).

## F6.1 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-118).

## F6 elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-119).

## F6 ellenőrzés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-120).

## F6 ismert korlátok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-121).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-122).

## Jelenlegi fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-123).

## Elkészült

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-124).

## Szándékosan nincs benne

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-125).

## Következő fázis

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-126).

## Ismert hiányok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-127).

## F5 ellenőrzés állapota

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-128).

## F9.5 — termékérettségi audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-129).

## F9.5.1 — pilot readiness és üzembiztonság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-130).

## F9.5.2 — szakmai terepi pilot előkészítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-131).

## F9.6.1 — ereszcsatorna-anyagbecslés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-132).

## F9.6.1.1 — ereszcsatorna-kalkulátor alkalmazásintegráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-133).

## F9.6.1.1.1 — integráció lezárása és konkurens revízióbiztonság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-134).

## F9.6.1.2 — anyagkatalógus-kapcsolat, draft átadás és technikai séma

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-135).

## F9.6.1.2.1 — végső integrációs hardening

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-136).

## F9.6.2 — Bádogos szegélyek kalkulátora — COMPLETE (LOCAL)

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-137).

## F9.6.2.3 — anyagkatalógus, atomi draft-átadás és műszaki SVG

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-138).

## F9.6.3.0 — lemezprofilok és hajtások: kutatás és domain-terv

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-139).

## F9.6.3.1 — lemezprofil-geometria és hajlítási domainmotor

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-140).

## F9.6.3.2 — interaktív lemezprofil-szerkesztő

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-141).

## F9.6.3.3 — lemezprofil-mentés és immutable revíziók

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-142).

## F9.6.3.4.1 — profilanyag-mennyiség

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-143).

## F9.6.3.4.2 — profilanyag átadása új draftba

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-144).

## F9.6.3 — végső helyi elfogadás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-145).

## F9.7.0 — Product UX & Workflow Audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-146).

## F9.7.1 — projekt-navigáció és összecsukható kivitelezés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-147).

## F9.7.1.1 — magyar szakmai UX és valósághűségi audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-148).

## F9.7.2 — Egységes projektfolyamat-áttekintő

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-149).

## F9.7.3 — kalkulátor UX-konzisztencia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-150).

## F9.7.3.1 — végső kalkulátor UX-konzisztencia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-151).

## F9.7.4.1 — iPad runtime és UX korrekciók

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-152).

## F9.7.5 — végső UX-finomságok és interakciós megbízhatóság

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-153).

## F9.7.5.1 — maradék UX-megbízhatósági javítások

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-154).

## F9.7.5.2 — ajánlatpiszkozat helyreállítása navigáció után

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-155).

## F9.7.6.6.1a — backend-validációs kör

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-156).

## F9.7.6.6.1b — final standalone quotation backend acceptance

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-157).

## F9.7.6.6.2 — standalone quotation frontend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-158).

## F9.7.6.6.3.1 — standalone véglegesítés és PDF architektúra

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-159).

## F9.7.6.6.3.2a — quotation document data & issuance foundation

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-160).

## F9.7.6.6.3.2b — pénzügyi contract, adóalap és kiállítási readiness

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-161).

## F9.7.6.6.3.2c — authenticated standalone draft PDF preview

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-162).

## F9.7.7.1 — trapézlemez-fedés mennyiségi előnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-163).

## F9.7.7.2a — trapézlemez-fedés mentési backend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-164).

## F9.7.7.2a.1 — secure persistence completion

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-165).

## F9.7.7.2b — trapézlemez-fedés mentés és revízió UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-166).

## F9.7.7.3a — projekt fedésből takeoff piszkozat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-167).

## F9.7.7.3b — trapézlemez-fedés anyagkimutatás UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-168).

## F9.7.7.4a — cserepeslemez-fedés motor és előnézet

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-169).

## F9.7.7.4b.1 — cserepeslemez perzisztencia

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-170).

## F9.7.7.4b.2 — cserepeslemez mentési és revíziós UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-171).

## F9.7.7.4c.1 — cserepeslemez → anyagkimutatás backend

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-172).

## F9.7.7.4c.2 — cserepeslemez takeoff egyszerűsített UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-173).

## F9.7.8.1 — helyszíni felmérés MVP

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-174).

## F9.7.8.2 — felmérési fotók és kalkulátor-átadás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-175).

## F9.7.8.3 — helyszíni felmérés mobil használhatósága

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-176).

## F9.7.9 — egységes helyszíni felmérési munkafelület

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-177).

## F9.7.10 — valós helyszíni munkafolyamat és mobil UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-178).

## F9.8 — anyagkimutatás és ajánlat-előkészítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-179).

## F9.8.1 — beszerzési és műhely-előkészítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-180).

## F9.9 — okos tetőgeometria és kapcsolt munkafolyamatok

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-181).

## F9.10 — többtetős geometria és vizuális tetőválasztás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-182).

## F9.10.1 — navigáció és tetőválasztás UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-183).

## F9.10.2 — professzionális tetőválasztó és teljes integráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-184).

## F9.11 — professzionális tetőmérés és intelligens UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-185).

## F9.12 — product integration és workflow hardening

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-186).

## F9.12.1 — dashboard kártyarács javítása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-187).

## F9.13 — valós munkafolyamatok célzott keményítése

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-188).

## F9.13.1 — napi workflow acceptance lezárása

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-189).

## F9.14 — független mérnöki számítási audit

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-190).

## F9.14.1 — kompakt, interaktív tetőmérési UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-191).

## F9.14.2 — globális Liquid Glass UX és egységes munkaterület

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-192).

## F9.14.3 — Liquid Glass vizuális audit és UX finomítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-193).

## F9.14.4 — fluid Liquid Glass UI átalakítás

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-194).

## F9.14.5 — Global Fluid Liquid Glass & Application Recovery

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-195).

## F9.14.6 — Product UI Architecture & Visual Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-196).

## F9.14.7 — Final Interface & Workflow Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-197).

## F9.14.8 — Project & Calculator UI Refinement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-198).

## F9.14.9 — Settings, Account Management & Mobile Quick Scaling

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-199).

## F9.19 — Workflow egyszerűsítés

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-200).

## F9.19 folytatás — Liquid Glass és régi gyűjtőoldalak

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-201).

## F9.20 — Globális Liquid Glass és munkanapló

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-202).

## F9.20.1 — Felmérési munkafelület és térközök

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-203).

## F9.20.2 — Felmérés folytatása, mentett számítások és önálló ajánlat

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-204).

## F9.20.2 — Globális Vanta.NET háttér

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-205).

## F9.21 — Globális Liquid Glass React-integráció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-206).

## F9.24.2 — Lépcsők professzionális rajzai és vizuális navigáció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-207).

## F9.24.3 — Pihenős lépcsők és betonlépcső szűkített geometriája

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-208).

## F9.24.4 — Húzott fokú lépcsők ellenőrzött geometriája

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-209).

## F9.24.5 — Beton- és alapozási műszaki rajzrendszer

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-210).

## F9.28 — Architektúra-leltár, anyagválasztó és felmérés→kalkuláció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-211).

## F9.32 — Daily workflow E2E validáció

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-212).

## F9.33 — Comprehensive Roof Calculation Enhancement

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-213).

## F9.34 — Complete Roof Geometry Coverage & UX

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-214).

## F9.35 — Szarufa, lécezés és faanyag-mennyiségek

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-215).

## F9.36.1 — tető alátétfólia és fedési mennyiségi alap

Részletes történeti bejegyzés: [archívum](archive/PROGRESS_HISTORY.md#history-216).

- M9.15.1 (PARTIAL): a „Szarufa vágásai” Karmi-rajz a „Szarufa és léc” kiosztás nélkül is megjelenik (megjelenítési előnézet, számítás/mentés változatlan). Részletek: `docs/M9151_KARMI_WORKFLOW_FINALIZATION.md`.
- M9.15.2 (PARTIAL): a Karmi-előnézet bizonyított előfeltételhez kötött (téglalap síkok: nyereg/félnyereg), kapcsolócsempés „Karmi és csatlakozások” / „Anyagszükséglet” UI. Részletek: `docs/M9152_KARMI_PREVIEW_VERIFICATION.md`.
- M9.15.3 (PARTIAL): a Karmi-előnézet kiosztás nélkül, a kanonikus tetősíkokból számol (nyereg/félnyereg bizonyítva), külön Karmi- és anyagállapot. Részletek: `docs/M9153_KARMI_GEOMETRY_AND_UX_FINALIZATION.md`.
