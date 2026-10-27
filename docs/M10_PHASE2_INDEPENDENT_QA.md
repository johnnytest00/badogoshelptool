# M10.2 — független geometriai, adatkapcsolati és DB-integritási QA

**Döntés: FAIL — az M10.2 jelenleg nem zárható le.** A helyi pgTAP-ban egy forrás-jogosultsági negatív eset nem a szerződés szerinti korai `42501` hibával bukik el, a négy új kapcsolat teljes mentés–újranyitás E2E-je pedig nem futott le. Alkalmazáskódot és migrációt nem módosítottam.

## Vizsgálati keret

- Vizsgált HEAD: `277d81082faf2cb7c27c6e2b7b92653a7a1231eb`.
- Kezdő munkafa: tracked fájlokon tiszta; már létezett egy nem követett `.vitest/json/output.json`, amelyet a célzott Vitest futás frissített. Más alkalmazásfájlt nem módosítottam.
- Helyi `supabase migration list --local`: a `20261027010000` migráció alkalmazott állapotban volt. DB-resetet és schema-módosítást nem végeztem.
- A böngészős ellenőrzéshez egy helyi DEMO `roof.material-takeoff` V1-et mentettem: `DEMO M10.2 QA material source 8000-35-HAP60`, szélesség 8000 mm, hossz 10000 mm, 35°, HAP 60 mm, 0 mm ereszkiülés. A mentett revízió UI-ban megjelent; ez DEMO adat, kézi keresztmetszettel, nem gyártói vagy szakmai referencia.

## Forrás–cél mátrix és mezőszemantika

| Forrás → cél | Eredmény és bizonyíték |
|---|---|
| `roof.material-takeoff` → `roof.timber-cutlist` | A migráció pármátrixa engedi; rollbackelt pgTAP RPC-ellenőrzés sikerült. A forrás és cél meződeklarációja azonos közös mezőtömböt használ. |
| `roof.timber-cutlist` → `roof.material-takeoff` | Engedélyezett; rollbackelt pgTAP sikerült. |
| `roof.material-takeoff` → `roof.rafter-cut` | Engedélyezett; rollbackelt pgTAP sikerült. A gable geometria csak külön szimmetria-jóváhagyással számítható. |
| `roof.timber-cutlist` → `roof.rafter-cut` | Engedélyezett; rollbackelt pgTAP sikerült. |
| `roof.rafter-cut` → `roof.material-takeoff` | Meglévő M10.1 kapcsolatként a DB-pármátrix engedi; célzott geometria- és kalkulációs tesztek futottak. Új élő E2E-t ebben a QA-ban nem végeztem. |
| `roof.rafter-cut` → `roof.timber-cutlist` | Meglévő M10.1 kapcsolatként a DB-pármátrix engedi; célzott tesztek futottak. Új élő E2E-t ebben a QA-ban nem végeztem. |

A sibling mezők azonos `roofShapeFields` és `birdsmouthFields` tömbökből épülnek, és a transfer komponens a sibling forrás teljes `fields` objektumát másolja. Ez bizonyítja a kulcsok/sémadefiníciók azonosságát, de a fizikai mezőjelentések teljes, mezőnkénti független szakmai validálását nem. A közös, tetőforma-függő mezők mind átmennek, a rejtett mezőket is beleértve; ez alkalmas a másik kalkulátor korábbi állapotának megőrzésére, de élő UI-próba nélkül a rejtett/inaktív értékek céloldali láthatósága és hatása nincs igazolva.

A `roof.truss-members` más mezőmodellt használ, és a migráció célként is kizárja, forrásként pedig nem kerül a megengedett forráslistába. Ezt kódvizsgálat támasztja alá; célzott DB negatív pgTAP ebben a menetben nem készült.

## Fordított nyeregtető-geometria és Karmi

A képlet kódja: `halfSpan = width / 2`, `rise = HAP + halfSpan × tan(pitch)`, `eaveProjection = eaveOverhang`. Független aritmetikával 8000 mm, 35° és 60 mm HAP esetén:

- fél fesztáv: **4000 mm**;
- gerincemelkedés: **2860.830152838839 mm**;
- visszaszámolt tetőhajlás a forward formula segítségével: **35°**.

Az `eaveOverhangMm → eaveProjectionMm` leképezés mezőszinten egyezik. A fordított függvény a HAP hiányát `MISSING_HAP`, negatív/nem numerikus értékét `INVALID_HAP`, a nem megfelelő pitch-et/geometriát pedig hibaként kezeli; a cél `rafterGeometryInputSchema` tartományellenőrzése a végső kapu. A pitch `80°` elutasított. A HAP=0 elfogadható a képletben, de a `rafterGeometryInputSchema` egyéb korlátai ettől még érvényesek. A nem-gable geometria átvételét a forrás tetőformája tiltja; csak formafüggetlen csatlakozási mezők vihetők át. `rafterDepthMm` nem része a forrásnak, kézzel megadandó.

Futtatott domain tesztek lefedik a nullás és hiányzó HAP-ot, hibás HAP-ot, 80°-ot és tartományon kívüli eredményt. A Karmi-mezők átviteli térképe az M10.1 map inverzeként van definiálva; az egyes mezők teljes fizikai referenciaparitását külön műhelyi vagy gyártói adatok nélkül nem tudtam függetlenül igazolni. A kézi 50×150 mm keresztmetszet a DEMO forrás része volt; adatforrása felhasználói kézi adat, nem gyártói ellenőrzött.

## UI és állapotkezelés

Forráskód-vizsgálat alapján az előnézet draftot nem ír, `Mégse` lezárja az előnézetet, a megerősítés tárolja az alkalmazott értékeket és forrásrevíziót, az Undo csak addig érhető el, amíg az érintett mezőket nem módosították. A preview külön jelöli az átvett és számított mezőket; gable geometriánál szimmetria-checkbox kell. A kiválasztott kalkulátorhoz külön `transferSourceByCalculator` és `transferAppliedByCalculator` állapot tartozik.

Ezeket a viselkedéseket nem sikerült valódi böngészős interakcióval végigpróbálni, ezért az alábbiak **nem élőben igazoltak**: preview/Mégse, confirm/Undo, kézi módosításvédelem, tetőforma-váltás, A→B→A, új kalkuláció, másik revízió választása, stale/inkompatibilis forrás, hibás forráslista kezelése.

## Migráció, RPC és DB-bizonyíték

A `20261027010000_construction_field_transfer_pairs.sql` `SECURITY DEFINER` RPC `search_path=''` beállítással, szerveroldali kalkulátor/pár-ellenőrzéssel, `organization_members` tagságvizsgálattal, standalone és létrehozó ellenőrzéssel, szerveroldali teljes snapshot kapuval, kalkuláció/revízió zárolással, idempotencia-ledgerrel, revízió-attestációval és dependency-triggerrel dolgozik. A mentés a dependency beszúrásával egy tranzakcióban van; triggerhiba a teljes mentést visszagörgeti. A forrás revíziót a dependency pontos revízióazonosítóként hivatkozza, a meglévő forrásadatot nem írja át.

Tényleges, már alkalmazott helyi migráción lefuttatva:

- `supabase test db --local 060 061 062`: **58/59 assertion PASS**, 1 FAIL. A 060 és 062 teljesen PASS; a 061-ben 1/17 negatív jogosultsági assertion bukott.
- rollbackelt célzott pármátrix pgTAP: **8/8 PASS** a négy új forrás–cél pár és a hozzájuk tartozó dependency-típus/irány ellenőrzésére.
- A vizsgálat tranzakciós tesztműveletei rollbackkel zárultak.

**P2 — hibás korai elutasítás/error code az idegen létrehozójú forrásnál.** Reprodukció: a `061` teszt meglévő fixture-jeivel hívd a mentési RPC-t olyan standalone `p_source_calculation_revision_id`-val, amely ugyanabban az organization scope-ban van, de másik felhasználó készítette. A forráslekérdezés létrehozó-szűrése miatt `v_source_calculator_type` NULL; az `IF NOT ( ... )` feltétel is NULL, így az explicit `42501` guard nem fut le. A dependency beszúrás későbbi triggerhibája `P0001`-gyel szakítja meg a tranzakciót. A teszt tehát nem mutatott ki adat-hozzáférési vagy tartós írási megkerülést, de az RPC nem a tervezett őrzési ponton és nem a várt SQLSTATE-tel utasítja el a hívást. Minimális javaslat: a pár-ellenőrzés előtt külön `v_source_calculator_type IS NULL` ellenőrzés `42501`-gyel, vagy a mátrix feltétel NULL-biztosra alakítása. Nem javítottam.

Source/target org-, forged revision, dependency rollback, attestáció és legacy RPC regressziók közül a futtatott 060–062 pgTAP assertions releváns részei bizonyítékot adnak, de a fenti egy teszthiba miatt a suite összesített státusza FAIL. A pármátrix új irányainak pgTAP-ja nem helyettesíti a négy teljes UI E2E-t. Konkurens mentési versenyhelyzetet ebben a QA-ban nem szimuláltam.

## Mentés–újranyitás E2E és böngészős méretek

| Új kapcsolat | V1 forrás → preview → confirm → cél V1 → teljes oldalú újranyitás |
|---|---|
| material-takeoff → timber-cutlist | Nem futott le. |
| timber-cutlist → material-takeoff | Nem futott le. |
| material-takeoff → rafter-cut | Nem futott le. |
| timber-cutlist → rafter-cut | Nem futott le. |

A DEMO material forrás V1 mentése és mentett URL-jének megjelenése ellenőrizve, de ez nem transfer E2E. Így a bemenetek céloldali újranyitás utáni megmaradása, a pontos dependency revision ID, a forrás változatlansága, a cél-attestáció és output-drift egyik új iránynál sincs böngészőből igazolva. A két M10.1 irányon ebben a menetben csak célzott forrás-/domain tesztek futottak, élő regressziós mentés–újranyitás nem.

375×812 világos/sötét, 812×375 és 1440×900 nézetmátrix nem futott. Böngészős interakciós automatizálás ebben a sessionben nem volt megbízhatóan vezérelhető; ezért nem állítok vizuális vagy interakciós PASS-t.

## Pontosan futtatott ellenőrzések

- `supabase migration list --local` — migráció `20261027010000` helyben alkalmazva.
- `supabase test db --local 060 061 062` — 58/59 PASS, 1 FAIL (fent részletezve).
- Rollbackelt célzott pgTAP a négy új párra — 8/8 PASS.
- `npx vitest run src/domain/calculations/construction/construction.test.ts src/features/calculators/rafter-connection-fields.test.ts src/features/calculations/construction-data.test.ts` — **3 fájl, 60 teszt PASS**.
- `git diff --check` — futtatva; a tracked fájlokra és külön az új, még nem követett QA dokumentumra is tiszta.

Nem futtattam teljes Vitestet, teljes buildet, lintet, tsc-t, adatbázis-resetet vagy éles DB műveletet. A P2 guardhiba és a négy nem végigjátszott új E2E a lezárást blokkolja.

## Javasolt következő lépés

Először a NULL-biztos forrásguard javítása és a 061 teljes PASS-a szükséges; utána a négy irány valós DEMO mentés–teljes újranyitás E2E-je dependency/attestáció ellenőrzéssel, majd a kért viewport-mátrix. **Javasolt commit:** `docs(M10.2): record independent QA findings`.
