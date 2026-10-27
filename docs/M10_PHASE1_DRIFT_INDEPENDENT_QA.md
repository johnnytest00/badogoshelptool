# M10.1.6 — Független output-drift és regressziós QA

**Dátum:** 2026-10-27
**Git HEAD:** `454a14b42ba92041b3eaf769d3cfac86cf6d3238` (`fix(M10.1.5)`)
**Döntés:** **PASS WITH LIMITATIONS**
**Hatókör:** QA-only. Alkalmazáskód, DB-adat, séma, migráció és immutable revízió nem változott.

## 1. Korábbi DEMO rekordok és adatvesztés

A helyi Supabase futó projektjét `supabase status` read-only ellenőrzése igazolta: a projekt `badogos-helptool`, az API `127.0.0.1:54321`, az adatbázis `127.0.0.1:54322`. A checkout `.env.local` Supabase URL-je is `127.0.0.1:54321`. A projekt [Supabase-konfigurációja](../supabase/config.toml) `badogos-helptool` helyi projektet ír le.

Mindkét korábbi azonosító jelen van ezen a DB-n:

| Cél | Kalkuláció / revízió | Létrehozó | Szervezet | Típus |
|---|---|---|---|---|
| Material-takeoff | `1a78b905-e80a-44fb-b701-1ad75e2171c3` / `88726c44-c605-4fa3-b26b-ecdd3a943976` | `admin1@testadmin.com` (`03e4eb3b-686e-4d77-ba57-9fb1bda8ef13`) | DEMO `00000000-0000-4000-8000-000000000010` | `construction.roof.material-takeoff` |
| Timber-cutlist | `ee5d703f-5c64-4179-9147-d8b776ad2866` / `399f81a0-f6d5-4088-9004-50ca9669c468` | `admin1@testadmin.com` (`03e4eb3b-686e-4d77-ba57-9fb1bda8ef13`) | DEMO `00000000-0000-4000-8000-000000000010` | `construction.roof.timber-cutlist` |

A kalkulációs sor és az aktuális revízió `created_by` mezője is az `admin1@testadmin.com` Auth ID-jára mutat. A `demo.owner@local.test` külön Auth ID (`00000000-0000-4000-8000-000000000001`), ugyanennek a szervezetnek `owner` tagja; az `admin1@testadmin.com` `member`.

A `calculations_select_authorized` RLS policy tagot és a `project` scope-ot **vagy** az aktuális felhasználóval egyező `created_by` értéket követel. Mindkét rekord `standalone` scope-ú, ezért az `admin1` munkamenet látja őket, a külön `demo.owner` munkamenet jogosultan nem látja őket a normál alkalmazáslekérdezésben. Ez magyarázza a látszólagos eltűnést; **adatvesztésre nincs bizonyíték**. A két e-mail címhez tartozó DB-identitást és policyt adatbázis-diagnosztikával olvastam, nem változtattam meg az alkalmazás sessionjét vagy jogosultságait.

A korábbi QA és a mostani böngészőmunkamenet `localhost:3000`-at, a jelenlegi checkout pedig ugyanazt a `badogos-helptool` lokális projektet használja. A Claude által használt `demo.owner` munkamenet idején nem készítettem külön élő hálózati nyomot; az egyező helyi projektet a M10.1.5 riport, a helyi konfiguráció és a megtalált rekordok együtt támasztják alá.

## 2. Drift reprodukció és gyökérok

Az aktuális, már hitelesített Brave munkamenet `admin1@testadmin.com` volt. Mindkét korábbi rekordot teljes oldalletöltéssel nyitottam meg. A material-takeoff és timber-cutlist esetén a mentett V1 betöltődött, a mentett és aktuális input összehasonlítása egyezett, a `construction-suite.output.v1` verzió látszott az adatbázisban, és a UI output-drift figyelmeztetése mindkettőn reprodukálódott.

A fejlesztői `outputDriftDiffPaths` helper mindkét revízióra ugyanazt a három útvonalat jelezte; tömbhossz-, mezőhiány- vagy típuseltérés nem volt:

| JSON-útvonal | Mentett érték → élő érték | Típus |
|---|---:|---|
| `lines[6].value` — Karmi függővágás szöge | `55.98065001017354` → `55.98065001017355` | number → number |
| `lines[7].value` — Karmi ülékvágás szöge | `34.01934998982646` → `34.01934998982645` | number → number |
| `lines[9].value` — Karmi vízszintes ülékhossz | `209.33121517077495` → `209.33121517077498` | number → number |

Az eltérések rendre körülbelül `1.42e-14`, `1.42e-14` és `2.84e-14`. A kalkulátorazonosítók, input-schema (`construction-suite.input.v1`), output-schema (`construction-suite.output.v1`) és implementation-version (`construction-suite.output.v1`) egyeznek. Az output más összehasonlított mezői bitazonosak.

**Bizonyított közvetlen gyökérok:** a drift-döntés a `{lines,takeoff,cutList}` kimenetet `stableJsonStringify`-jal, pontos JSON-számérték szerint hasonlítja. A mentett és élő értékek matematikailag azonos eredményt jelentenek, de a JSON-ba kerülő lebegőpontos double utolsó bitje eltér, ezért a pontos összehasonlítás hamis driftet jelez. A driftvédelem működik; az összehasonlítás túl szigorú a bináris lebegőpontos eredményekhez.

A forráskód-nyomkövetés szerint a Karmi eredmények a tetősík `pitchDegrees` értékéből trigonometrikus számításon keresztül képződnek (`Math.tan`, majd a szarufageometria `Math.atan2`-t használ), így a mentett/szerveroldali és élő böngészős futás utolsó bitekben eltérő eredménye összeegyeztethető a lebegőpontos kerekítéssel. **Nem bizonyított**, hogy kizárólag egy konkrét runtime vagy műveleti sorrend okozza; a stabilan reprodukált bizonyíték a strict JSON-összehasonlítás és az ULP-közeli eltérés. Az implementation-version jelenleg nem azonosít konkrét kód-buildet, ezért önmagában nem zárja ki a régebbi kimenet és az aktuális futás eltérő számítását.

**Minimális javítási javaslat:** a drift-összehasonlítóban csak numerikus eredményeket kanonizálni vagy gépi pontossághoz igazított, skálafüggő toleranciával összevetni; a stringeket, típuskülönbséget, struktúrát és érdemi numerikus változást továbbra is driftként kezelni. A konkrét toleranciát a kalkulátormennyiségek egységei és pontossági szerződése alapján kell megadni. E QA menetben nem módosítottam a driftvédelmet.

## 3. M10.1.5 regressziós ellenőrzések

### P1 — tetőhajlás `<80°`

A célzott tesztek mindkét célkalkulátorra igazolták:

- `79.9°`: számítás és menthetőség elfogadott;
- `80°`: invalid, nincs geometria, nem menthető;
- `81°`: invalid, nincs geometria/eredménysor, nem menthető.

A szerveroldali `saveConstructionCalculationAction` a `computeConstruction` és `isSaveableComputation` függvényeket használja, így ugyanaz a trust boundary védi, mint a kliens előnézetet. A célzott action teszt igazolja, hogy a szerver újraszámolja a kimenetet, és nem fogad el kliens által megadott eredményt. **Ebben a QA menetben nem futtattam külön böngészős 79.9°/80°/81° bevitelt**; a korábbi M10.1.5 riport egy material-takeoff böngészős határpróbát dokumentál, mindkét kalkulátorra pedig most célzott unit-teszt készült.

### P2 — kalkulátoronkénti transfer state

Hitelesített, helyi `admin1` böngészőben, új és nem mentett kalkulációkkal:

- **A → B:** A a `roof.material-takeoff`, B a `roof.timber-cutlist`. B üres mezőket mutatott, és az Adatok átvétele panelben nem jelent meg az A-hoz tartozó „Adatok átvéve” jelzés.
- **B saját átvétele → vissza A-ra:** B saját átvételét a mentett `roof.rafter-cut` V1 forrásból végeztem; visszaváltáskor A szélesség-, hajlás- és HAP-draftja, valamint A forrásjelzése megmaradt.
- **B Undo → A:** a Visszavonás B-re hatott; A eredetjelzése és draftja változatlanul megmaradt.
- **Új kalkuláció:** megerősített új kalkuláció után az átvételi státusz üres volt; a forrás csak választható forrásként maradt elérhető.
- **Mentett source revision ID:** read-only DB-ben mindkét korábbi célrevízió dependency sora a `roof.rafter-cut` `94cab050-2853-45b2-bec5-9457b363cb7e` V1 revíziójára mutatott, a megfelelő `field-transfer:roof.rafter-cut->...` dependency típussal. Új mentést nem végeztem.

### Korábbi P1 — gable → hip/shed invalidáció

A `construction-drafts` célzott tesztjei lefedték a változatlanul átvett geometria törlését, az egyedileg kézzel módosított mező megőrzését, a gable-re visszaváltáskor történő adat-visszaéledés kizárását és az egymást követő parent state transitiont. Böngészős forma-váltást ebben a QA menetben nem ismételtem meg.

## 4. Ténylegesen futtatott ellenőrzések

- Célzott Vitest: `npx vitest run src/features/calculators/construction-computation.test.ts src/features/calculators/construction-save-panel.test.tsx src/features/calculators/construction-drafts.test.ts src/features/calculators/rafter-connection-fields.test.ts src/domain/calculations/roof-geometry.test.ts src/domain/calculations/gable-roof.test.ts src/features/calculations/construction-actions.test.ts` — **107 teszt PASS, 0 fail** (7 megadott fájl).
- Read-only Supabase SQL: a két kalkuláció/revízió tulajdonosa, szervezet, scope, implementation-version, input/output és dependency sorok; Auth user ID-k, tagságok és a két tábla RLS SELECT policyje.
- Hitelesített böngésző: mindkét drift-figyelmeztetés, majd P2 A→B→A, B saját adatátvétele, B Undo és új kalkuláció.
- `git diff --check` — PASS.
- A helyi dev szerver production buildet nem futtatott. A diagnosztikai effect `process.env.NODE_ENV === "production"` esetén azonnal visszatér; production-buildet nem futtattam újra.

## 5. Diagnosztika, korlátok és lezárás

A meglévő diagnosztika fejlesztői módban a revízió ID-ját és az eltérő JSON-útvonalakat naplózta; személyes adatot, Auth adatot vagy kalkulációs értéket nem. Az effect explicit production guard mögött van. A szükséges érték/típus QA-hoz ideiglenesen kibővítettem a dev-only logot, a böngészőben leolvastam az eredményt, majd a fájlt visszaállítottam; a végső `git diff` üres. Az ideiglenes értékek csak a helyi fejlesztői konzolban jelentek meg.

**Fennmaradó kockázat:** a UI a három, gépi pontosságú eltérést továbbra is valódi driftként jelzi; ezért az elfogadási felhasználói felületen hamis figyelmeztetés marad. A kiszámított eredmények gyakorlati értéke és a bemenet nem változik, de a driftjelzés nem tekinthető elfogadott állapotnak a célzott összehasonlító-javítás és regressziós teszt előtt. Nem futott teljes 1217-es suite, lint, typecheck vagy production build; nem váltottam át `demo.owner` tényleges alkalmazás-sessionjére; nem végeztem új DB-írást vagy friss mentési E2E-t. A `.vitest/json/output.json` a feladat megkezdésekor már meglévő, nem követett állományként szerepelt; nem töröltem.

**Végső döntés: PASS WITH LIMITATIONS.** Az M10.1.5 pitch-határ és transfer-state regressziói a célzott tesztekben és a transfer-state böngészős útvonalán PASS. A drift figyelmeztetés gyökéroka szűkült és a false-positive mechanizmus bizonyított, de a figyelmeztetés továbbra is reprodukálható, ezért **az M10.1 teljes lezárását csak a tolerancia/kanonizálás javítása és annak célzott újra-QA-ja után javaslom**.

**Javasolt Conventional Commit:** `docs(M10.1.6): record independent drift root cause and regression QA`
