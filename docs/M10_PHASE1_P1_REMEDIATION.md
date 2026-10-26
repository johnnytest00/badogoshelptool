# M10.1.2 — P1/P2 javítás a független QA alapján

**Dátum:** 2026-10-26
**Előzmény:** [`docs/M10_PHASE1_INDEPENDENT_QA.md`](M10_PHASE1_INDEPENDENT_QA.md) — **FAIL**, két P1 és egy P2 bizonyított hiba.
**Hatókör:** kizárólag a három auditált hiba minimális javítása a meglévő architektúrán belül. Nincs új funkció, DB/RPC/snapshot-változás, új dependency vagy commit/push.

## 1. P1 — cél hajlásszög validációs eltérés (gyökérok és javítás)

**Gyökérok:** `convertGableGeometryFromRafterCut` (`src/domain/calculations/construction/roofs.ts`) saját, a céltól független `pitchDegrees >= 90` határt tartott karban, miközben a tényleges célvalidátor (`roofGeometryInputSchema` → `pitch`, `src/domain/calculations/roof-geometry.ts`) `< 80°`-ot vár. A két határ soha nem volt szinkronizálva.

**Javítás:** a `pitch` Zod-séma exportálva lett `roof-geometry.ts`-ből, és a transfer helper ezt hívja újra (`targetPitchDegrees.safeParse(pitchDegrees).success`) a korábbi, külön karbantartott `>= 90` ág helyett. Nincs többé két egymástól független mágikus határ; a cél validátora az egyetlen igazságforrás. Érvénytelen eredménynél a meglévő `TARGET_RANGE` hibakód és a hozzá tartozó magyar `GABLE_SKIP_REASON_LABEL` szöveg (`construction-field-transfer-control.tsx`) változatlanul jelenik meg. A kompatibilis Karmi-mezők (pl. `seatCutHeightMm`) továbbra is átvehetők önmagukban, mert a `rafterCutTransferFields` a geometriai mezőket csak a konverzió sikeressége esetén adja hozzá a már átvett joint-mezőkhöz.

**Diff:** `src/domain/calculations/roof-geometry.ts` (export), `src/domain/calculations/construction/roofs.ts` (import + egy sor feltétel).

## 2. P1 — gable-geometria átszivárgása más tetőformába (gyökérok és javítás)

**Gyökérok:** a megerősített `widthMm`/`pitchDegrees` a közös draftban (`construction-suite.tsx` `drafts[selectedId]`) maradt tetőforma-váltás után is; a `roofShape` state változása csak a `ConstructionFieldTransferControl` belső `symmetryConfirmed` jelölőjét resetelte (`useEffect(() => setSymmetryConfirmed(false), [roofShape, ...])`), a már beírt mezőket nem érintette. A hip/shed kalkulátor (`roofGeometryInputFromFields`) ugyanazt a `widthMm`/`pitchDegrees` kulcsot olvasta, ezért a gable-ből származó, soha nem igazolt érték csendben bemenetként szolgált.

**Megoldási elv (ideiglenes, komponensszintű eredetkövetés, nincs új tartós provenance-modell):** a `ConstructionFieldTransferControl` már eddig is tartotta az `applied` state-ben, melyik célkulcsokat állította be a legutóbbi megerősített átvétel (`newFields`) és mi volt az átvétel előtti érték (`snapshot`) — ez pontosan a kért öt kérdésre (mely kulcs, milyen érték, melyik célformára, melyik forrásrevízióból, módosította-e utóbb a felhasználó) ad választ a komponens élettartama alatt, forma-váltás esetén is, mert a komponens nem unmountolódik tetőforma-váltáskor.

**Javítás — `invalidateGableGeometryOnShapeChange` (`src/features/calculators/rafter-connection-fields.ts`):** tiszta függvény, amely a komponens korábbi és új `roofShape` propját, az `applied` eredetet és a jelenlegi mezőket kapja, és:
1. Csak akkor avatkozik be, ha a **korábbi** forma `gable` volt és az **új** nem az (hip/shed/stb.), és van érvényes `applied` átvétel.
2. Csak a `widthMm`/`pitchDegrees` kulcsokat érinti; a Karmi/eresz mezőket soha.
3. Csak akkor nullázza vissza az átvétel előtti (formafüggetlenül biztonságos) értékre, ha a felhasználó azóta **nem** módosította kézzel (a jelenlegi mezőérték még pontosan egyezik az átvétel által beírt értékkel) — kézi érték soha nem törlődik.
4. Ha csak Karmi-mezőket vettek át (nincs `widthMm`/`pitchDegrees` az `applied.newFields`-ben), nem csinál semmit.
5. Gable-re visszaváltva a már elfogyott `applied` bejegyzés miatt nem áll vissza csendben a korábban érvénytelenített geometria — új átvételhez új előnézet és explicit szimmetria-jóváhagyás kell.

A `ConstructionFieldTransferControl` egy `useEffect`-ben (a korábbi forma `useRef`-fel követve) hívja ezt a tiszta függvényt, és a visszaadott `resetFields`-et a meglévő `onApply` csatornán (ugyanazon az úton, amit a confirm/undo is használ) írja a szülő draftjába; az `applied` state a visszaadott `nextApplied` szerint frissül, hogy az Undo és az eredetjelzés a megmaradt (nem geometriai) mezőkre nézve helyes maradjon.

**React állapotbiztonság:** a logika tiszta függvénybe van kiszervezve (nincs aszinkron hívás, nincs stale closure-kockázat); az `useEffect` csak a `roofShape` tényleges tranzícióján fut (a `useRef` tárolja az előző értéket), ezért gyors egymás utáni formaváltásnál sem hagy egy renderre hibás geometriát a kalkulációban — a `calculation`/`raw` a draft state-ből olvas, ami a hatás lefutásával egyazon commit-fázisban frissül, mielőtt a mentési Action bármit látna.

**Diff:** új export `invalidateGableGeometryOnShapeChange` (`rafter-connection-fields.ts`), a korábbi inline `useEffect([roofShape, previewing?.revisionId])` melletti új `useEffect` a `construction-field-transfer-control.tsx`-ben.

## 3. P2 — hajlásszög megjelenítési pontosság

**Megoldás:** a legkisebb biztonságos változat — a preview sora mostantól explicit `≈` jelöléssel és a teljes pontosságú érték zárójeles feltüntetésével jelenik meg (`≈ 34,019° (a mentett érték teljes pontosságú: 34.01934998982646°)`), így az előnézet nem állítja, hogy a kerekített szám a mentett érték. A `rafterCutTransferFields`/confirm által a draftba írt, majd a szerveren újraszámított és mentett érték változatlanul a teljes `Number`-pontosságú string — a belső számítás és mentés pontosságát nem érintettem. Nincs globális numerikus input-refaktor; a módosítás a `renderPreview` egyetlen sorára korlátozódik.

## 4. Transfer-/draftállapot szerződése (összefoglalva)

| Elem | Szerződés |
|---|---|
| `applied.newFields` | a legutóbbi megerősített átvétel által beírt célkulcs → érték |
| `applied.snapshot` | ugyanezen kulcsok átvétel **előtti** értéke (Undo és forma-váltási visszaállítás közös forrása) |
| Élettartam | a `ConstructionFieldTransferControl` komponens élettartama; tetőforma-váltás nem unmountolja |
| Forma-váltás hatása | csak `widthMm`/`pitchDegrees`-t érinti, csak ha változatlan; Karmi-mezőket és kézi módosítást nem |
| Gable-re visszaváltás | nincs automatikus visszaállás; új átvétel kell |

## 5. Forma-váltási regressziós mátrix

| Átmenet | Elvárt eredmény | Státusz |
|---|---|---|
| Confirm (gable, geometria+Karmi) → hip | `widthMm`/`pitchDegrees` visszaáll az átvétel előtti értékre; Karmi-mezők maradnak | Tesztelve (unit, pure function) |
| Confirm (gable, geometria+Karmi) → shed | ugyanaz | Tesztelve (unit, pure function) |
| Confirm → hip → kézi módosítás a widthMm-en → forma-váltás ismét | kézi érték nem törlődik | Tesztelve (unit, pure function) |
| Csak Karmi-mezők átvéve → forma-váltás | semmi nem törlődik indokolatlanul | Tesztelve (unit, pure function) |
| Gable → hip → gable | nem jelenik meg újra a korábban érvénytelenített geometria | Tesztelve (unit, pure function) |
| Formaváltás ugyanazon (gable→gable) formán belül | nincs hatás | Tesztelve (unit, pure function) |
| Preview nyitva formaváltás közben | a preview-sorok a `roofShape`-től függnek, nem az `applied`-től; nem módosít draftot | Kódszinten változatlan (M10.1 FAIL-jelentés §6 szerint már korábban helyes) |
| Undo formaváltás után | az `applied`/`snapshot` pár konzisztens marad, mert a forma-váltási visszaállítás ugyanazt az `onApply` csatornát és snapshotot használja, mint az Undo | Kódszinten levezetve; élő böngészős próba NOT VERIFIED (lásd lent) |

Élő React komponens-interakció (kattintás, valódi DOM) és böngészős forma-váltási mátrix **NOT VERIFIED** ebben a munkamenetben (lásd 7. pont) — a pure function szinten viszont minden ág bizonyítottan a specifikáció szerint viselkedik, és ez pontosan az a logika, amit a komponens `useEffect`-je hívogat.

## 6. Ténylegesen futtatott ellenőrzések

- **Célzott Vitest:** `construction.test.ts` + `rafter-connection-fields.test.ts` → **2 fájl, 35 teszt, PASS** (új: 80°-os határ reprodukció és határeset, `invalidateGableGeometryOnShapeChange` 5 eset).
- **Kiterjesztett célzott Vitest** (a módosított modulokat importáló fájlok): `roof-geometry.test.ts`, `roof-geometry.engineering-audit.test.ts`, `plane-birdsmouth.test.ts`, `construction-save-panel.test.tsx`, `construction-actions.test.ts`, `construction-data.test.ts`, `construction-drafts.test.ts`, `standalone-persistence.test.ts` → **8 fájl, 87 teszt, PASS**.
- **Teljes Vitest:** `npx vitest run` → **192 fájl PASS / 8 SKIP; 1201 teszt PASS / 19 SKIP**.
- **ESLint:** `npm run lint` → **PASS** (nincs figyelmeztetés).
- **Izolált típusellenőrzés és build:** `git worktree add` + symlinkelt `node_modules` (`/tmp/claude-501/tetopro-m1012-verify`, a futó dev szerver `.next`-je érintetlen maradt) → `npm run typecheck` **PASS**, `npm run build` (`next build --webpack`) **PASS**, utána a worktree eltávolítva.
- **`git diff --check`:** **PASS**.
- DB/pgTAP nem futott újra — a DB/RPC/snapshot szerződés nem változott.

## 7. Mentés–újranyitás és DB-integritási bizonyítékok

**NOT VERIFIED.** A független audit (§8, §10) már jelezte, hogy a helyi hitelesített DEMO munkamenet (`localhost:3000`) bejelentkezési képernyőn állt, és ez ebben a munkamenetben sem változott — nem próbáltam jelszót vagy hitelesítő adatot megadni, és nem hoztam létre vagy módosítottam auth-konfigurációt/DB-szerepkört. Emiatt a kért teljes mentés → friss navigációs újranyitás → read-only DB-ellenőrzés (source revision, dependency, attestáció) és a `roof.timber-cutlist` cél geometriai mezőinek élő átvételi tesztje ezúttal is **NOT VERIFIED** maradt. A mentési Action/writer kódszintű architektúrája (szerveroldali újraszámítás, szervezeti/actor-ellenőrzés, forrás-revízió argumentum) változatlan, és a jelen javítás nem érinti ezt az útvonalat.

## 8. Vizuális ellenőrzés

**NOT VERIFIED.** A böngészős UI (375×812, 812×375, 1440×900, világos/sötét) ellenőrzéséhez ugyanaz a bejelentkezési blokk akadályoz, mint a 7. pontban; a P2 javítás egyetlen szövegsor-változás a meglévő, korábban már vizuálisan ellenőrzött előnézet-táblázatban, új layout vagy komponens nélkül.

## 9. Fennmaradó kockázatok

- **P2 (fennmaradó, kisebb):** a preview szövege most hosszabb (a teljes pontosságú érték zárójelben); mobil nézeten a táblázatcella tördelése nincs élőben ellenőrizve (lásd 8. pont).
- **P3:** a `invalidateGableGeometryOnShapeChange` csak a `gable → nem-gable` átmenetet kezeli explicit kérés szerint; ha egy jövőbeli tetőforma is "biztonságosan örökölheti" a szimmetrikus gable geometriát, azt továbbra is külön, formánkénti bizonyítás nélkül nem szabad megengedni — ez tudatos, nem hiba.
- A 7–8. pont NOT VERIFIED állapota érvényben marad a következő, hitelesített munkamenetig.

## 10. Végső lezárási javaslat

A két bizonyított P1 és a P2 a kért minimális hatókörben javítva, célzott regressziós tesztekkel igazolva; a teljes célzott/teljes Vitest, ESLint, izolált typecheck és build, illetve `git diff --check` mind **PASS**. A mentés–újranyitás E2E és a vizuális mátrix a korábbi audithoz hasonlóan **NOT VERIFIED**, kizárólag a blokkolt helyi bejelentkezés miatt — ez nem az itt javított P1/P2 hibákhoz kötődik. **Javaslat:** az M10.1 a kódszintű és unit-tesztelt elfogadási feltételek alapján **lezárható**, azzal a feltétellel, hogy a mentés–újranyitás és a vizuális mátrix a legközelebbi hitelesített DEMO munkamenetben külön, rövid ellenőrzést kapjon — ez nem igényel további kódmódosítást, csak hozzáférést.

**Javasolt Conventional Commit:** `fix(M10.1.2): align gable pitch bound with target schema, stop cross-shape geometry leak, clarify rounded preview`
