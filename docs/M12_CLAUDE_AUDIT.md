# TetőPro M12 – független szakmai, architekturális és UI/UX audit

**Készítette:** Claude Code (Claude Opus 5.5), független felülvizsgálat
**Dátum:** 2026-10-30
**Vizsgált állapot:** `main` ág, HEAD `bb6270d` + a nem commitolt M12.0–M12.9 munkafa (lásd `git status`)
**Jelleg:** csak olvasási audit. Alkalmazáskód, adatbázis, Auth/RLS, konfiguráció és korábbi dokumentáció nem módosult; commit/push nem történt.
**M12.2 OCR-kapu:** továbbra is **BLOCKED**.

---

## 0. Bizonyítékszintek ebben a dokumentumban

Minden megállapítás mellett szerepel, milyen szintű bizonyíték támasztja alá. A szintek nem keverhetők.

| Jel | Jelentés |
|---|---|
| **[FUTTATVA]** | Ebben az auditban ténylegesen lefuttatott ellenőrzéssel igazolva. |
| **[KÓD-BIZONYÍTOTT]** | A viselkedés a forráskódból determinisztikusan, egyértelműen következik (nincs futási feltétel, amely megváltoztathatná). Futtatással nem reprodukáltam. |
| **[KÓDBÓL LEVEZETETT]** | A forráskód és a keretrendszer dokumentált szemantikája alapján nagy biztonsággal következik, de futási környezettől (böngésző, React-renderelés) függ; böngészőben **nem reprodukáltam**. |
| **[NEM TESZTELT]** | Sem én, sem a dokumentált korábbi QA nem ellenőrizte. |
| **[FELTÉTELEZÉS]** | Szakmai vagy technikai következtetés, hipotézis; méréssel/korpusszal igazolandó. |
| **[DOKUMENTÁLT]** | A korábbi handoff/PROGRESS állítja; ebben az auditban nem ellenőriztem újra. |

### Ebben az auditban ténylegesen futtatott ellenőrzések

- `git status --short`, `git diff` a módosított, követett fájlokra. **[FUTTATVA]**
- `npx vitest run src/features/calculators/drawing-*.test.ts src/features/calculators/construction-workspace-memory.test.ts src/components/ui/length-field.test.tsx` → **8 fájl, 87 teszt, mind PASS**. **[FUTTATVA]** Ez célzott helper-szintű teszt, nem teljes regresszió.
- Böngésző: a futó helyi dev szerver `/kalkulatorok?calculator=roof.material-takeoff` oldala bejelentkezés nélkül üres maradt (konzolhiba nélkül). Fiókba nem léptem be, ezért **semmilyen böngészős állítás nincs ebben az auditban igazolva**.
- Teljes Vitest, lint, typecheck, build: **nem futtattam** (nem volt szükséges konkrét állításhoz).

### Fontos tesztlefedettségi tény

- `PlanFieldTransfer`-re (`src/features/calculators/plan-field-transfer.tsx`) **nincs komponensteszt**. A repóban nincs `jsdom`/`happy-dom` és `@testing-library`, a `vitest.config` nem állít DOM-környezetet. A 87 M12-teszt kizárólag tiszta helperfüggvényeket fed le (`drawing-field-transfer.ts`, `drawing-value-suggestion.ts`, `drawing-roof-section(s).ts`, `drawing-roof-work-session.ts`, stb.). **[FUTTATVA – grep és config alapján]**
- Következmény: szakaszváltás, szakasztörlés, fedettség-visszavonás, fájlcsere, import/export UI-szinten teszteletlen. **[NEM TESZTELT]**

---

## I. Vezetői összefoglaló

**Kérdés:** ha ma egy gyakorló bádogos kezébe adnánk, gyorsabban készítene tető-anyagszükségletet?
**Válasz:** **nem.** **[KÓD-BIZONYÍTOTT a lépésszámra; FELTÉTELEZÉS az időre]**

Egy méret rajzból kalkulátorba vitele a „Tetőanyag-kalkuláció” kalkulátorban 8–10 interakció (lásd IV.1), míg ugyanennek a mezőbe gépelése 2. Egy nyeregtetőhöz 3–5 szám kell, amelyeket a bádogos ránézésre leolvas. A panel ma a **forrás-visszakövethetőséget** adja, nem időmegtakarítást.

### Az öt legfontosabb megállapítás

1. **Rossz szűk keresztmetszetet céloztunk.** **[FELTÉTELEZÉS – szakmai következtetés]** A bádogos ideje nem a számok leolvasására megy el, hanem a tetőforma értelmezésére, az anyagadatok ismételt beírására, a tagolt tető összesítésére és a munka elvesztésére. M12 a legtöbb erőforrást a leolvasásra (OCR, címkeszabályok, jóváhagyási kapuk) fordította.
2. **Valószínű P0 regresszió minden kalkulátorban:** a nem commitolt `construction-suite.tsx:335` a mező aktuális értékét a React `key`-be tette, így minden leütés után a mező újramountol és **elveszti a fókuszt**; telefonon a billentyűzet bezáródik. **[KÓDBÓL LEVEZETETT, böngészőben nem reprodukált]**
3. **Többszakaszos munka nem menthető a normál mentési úton**, és a JSON-export is elutasít minden félkész (érvénytelen mezőt tartalmazó) állapotot, illetve képforrásnál nem érhető el. **[KÓD-BIZONYÍTOTT]**
4. **Már meglévő, kihasználatlan értékek:** típus szerinti élhosszak (eresz, orom, gerinc, él, vápa – `src/domain/calculations/roof-geometry-results.ts`), L/T alakú tető vápákkal (`roof-geometry.ts`), és a saját anyaglistából (Anyagkezelő) kiolvasott profilok (`roof-material-catalog.ts`). A bádogos legfontosabb kimenete – a szegély- és csatornahosszak – a geometriában megvan, de anyaglistává nem válik. **[KÓD-BIZONYÍTOTT]**
5. **Az OCR-irány a jelenlegi fázisban nem térül meg.** A PDF.js szövegréteg jó alap; szkennelt tervhez a nagyítható rajz + emberi koppintás + kézi beírás többet ér, mint OCR-hangolás. M12.2 maradjon **BLOCKED**. **[FELTÉTELEZÉS – benchmark nélkül]**

### Egyetlen következő lépés (részletesen X. fejezet)

**P0-javítások (T1, T2), majd a koppintásos adatátvitel (P1-1) egy mért időfeladattal.**

---

## II. Eredeti cél kontra jelenlegi állapot

### II.1 Forrásrétegek elkülönítése

| Réteg | Forrás | Megjegyzés |
|---|---|---|
| Eredeti felhasználói igény | Szó szerinti idézet a handoff 2. fejezetében | Az egyetlen közvetlen eredeti célmondat. |
| Későbbi fejlesztési utasítások | Handoff 2. fejezet rövid idézetei (M12.3C.1, M12.4, M12.8, M12.8.1, M12.9) | A teljes specifikációk mellékletként érkeztek, itt nem hozzáférhetők. |
| Codex által implementált | Jelenlegi kód (`src/features/calculators/*`, `src/infrastructure/drawings/*`) | Ebben az auditban olvasva. |
| Dokumentált eredmény | `docs/M12_CLAUDE_REVIEW_HANDOFF.md`, `docs/PROGRESS.md` | **[DOKUMENTÁLT]**, nem ismételtem meg. |
| Saját következtetés | Ez a dokumentum | Jelölve **[FELTÉTELEZÉS]**-ként, ahol nem kódtény. |

### II.2 Az eredeti mondat elemei

| Az eredeti igény eleme | Állapot | Bizonyíték |
|---|---|---|
| „pdf ről leolvasni azokat az adatokat” | **Részleges.** PDF.js kiolvassa a feliratokat és koordinátájukat. Automatikus mezőjavaslat csak 3 címkére, kizárólag a `roof.rafter-cut` kalkulátorban (`drawing-field-transfer.ts`, `suggestRafterCutField` – `calculatorId !== "roof.rafter-cut"` esetén `null`). A fő `roof.material-takeoff` folyamatban nincs javaslat. | [KÓD-BIZONYÍTOTT] |
| „megtudja határozni mekkora a tető” | **Nem teljesül.** A tetőméretet a felhasználó értelmezi és adja meg; a téglalap-kijelölés csak vizuális (`drawing-roof-section.ts`). | [KÓD-BIZONYÍTOTT] |
| „bekérje a hiányzó adatokat” | **Részleges.** Van hiányzó-mező lista (`missingRequiredDrawingFields`), de nincs egyenként kérdező, vezetett folyamat; a panel görgetőgombokkal a kalkulátorűrlapra irányít (`plan-field-transfer.tsx:372`, `:375`). | [KÓD-BIZONYÍTOTT] |
| „bekérje a hajlás szöget” | Kézi mező. A %-os lejtés fokként való átvitelét helyesen tiltja (`isPercentSlopeForPitch`), de átváltást/alternatív megadást (emelkedés, %) nem kínál. | [KÓD-BIZONYÍTOTT] |
| „mekkora szarufákat akar használni az anyaglistából” | **Teljesül.** Katalógusprofil (Anyagkezelő) vagy kézi keresztmetszet (`roof-material-catalog.ts`, `catalogProfilesFromProducts`). A tengelytávolság mindig kézi. | [KÓD-BIZONYÍTOTT] |
| „hogy tudjon számolni szarufát mindent” | **Részleges.** Szarufa, léc, alátétfólia, fedőtábla van (`roof-material-takeoff.ts`). Nincs: ellenléc, szegélyek, ereszcsatorna, lefolyó, gerincelem, élgerinc-, vápaelem. | [KÓD-BIZONYÍTOTT] |

### II.3 Mely mérföldkövek adtak közvetlen felhasználói értéket?

| Mérföldkő | Értékelés |
|---|---|
| M12.0–M12.2 | Technikai előkészítés. PDF.js: szükséges alap. OCR: jelenleg érték nélkül (kapu BLOCKED). |
| M12.3A–C | Biztonságos, de lassú adatátvitel; a mértékegység-védelem szakmailag helyes. |
| M12.4 | Valós építészeti rajzon gyakorlatilag nem fut le (ilyen „címke: érték egység” felirat tervrajzon nem szokásos). **[FELTÉTELEZÉS – korpusz nélkül]** |
| M12.5 | Helyes szakmai védelem (alaprajz ≠ tetőterv), de túl sok ismételt megerősítést okoz. |
| M12.6 | **Értékes:** igazolta, hogy a rajz → meglévő motor lánc működik. |
| M12.7–M12.8 | Részleges érték: szakaszok vannak, de összesítés, közös anyag és mentés nélkül. |
| M12.9 | Szükséges, de a JSON-fájlkezelés a végfelhasználónak nehézkes; a félkész munkát nem menti. |

---

## III. Független technikai audit

### III.1 Hibák – bizonyítékszint szerint

| # | Javasolt prioritás | Hely | Hiba | Bizonyíték |
|---|---|---|---|---|
| **T1** | **P0** | `src/features/calculators/construction-suite.tsx:335` (`renderField`) | A mezőt csomagoló `Fragment` kulcsa: `` `${selectedId}:${draftEpoch}:${field.key}:${values[field.key] ?? ""}` ``. Minden értékváltozásra a kulcs változik → a `<label>`, a natív `<input>` és a `LengthField` teljes DOM-csomópontja újra létrejön → a fókusz elvész. A `LengthField` minden olyan leütésnél hívja az `onChange`-t, amely új kanonikus mm-értéket ad (`length-field.tsx`, `update()`); a natív szám-inputok `onChange`-e is minden leütésnél frissíti a `values`-t. A `LengthField` már önmagában követi a külső értékváltozást (`if (value !== state.synced) setState(...)`), tehát az érték a kulcsban **fölösleges és káros**. Hatókör: **minden** kalkulátor, amely a közös `renderField`-et használja, nem csak a rajzpanel. | **[KÓDBÓL LEVEZETETT]** – React kulcs-szemantika szerint determinisztikus; böngészőben **nem reprodukált** (auth). Megjegyzés: a Playwright `fill()` a teljes értéket egyszerre írja, ezért a korábbi böngészős QA ezt nem foghatta meg. |
| **T2** | **P0 (adatvesztés)** | `plan-field-transfer.tsx:348–350` | „Aktív szakasz törlése” megerősítés és visszavonás nélkül eltávolítja a szakasz teljes geometriáját, anyagadatát és jóváhagyásait; közvetlenül a „+ Tetőszakasz” gomb mellett áll. | **[KÓD-BIZONYÍTOTT]** |
| **T3** | P1 (akadálymentesség) | `plan-field-transfer.tsx:322–327` | Billentyűzetes szakaszkijelölésnél mindkét sarok `pagePointFromViewport({ x: 0.5, y: 0.5 })` → nulla területű téglalap → `hasPageArea` hamis. A billentyűzetes kijelölés így nem működik. | **[KÓD-BIZONYÍTOTT]** |
| **T4** | P1 | `plan-field-transfer.tsx:376`; `drawing-field-transfer.ts:9–11` (`canSaveDrawingTakeoff`); `construction-suite.tsx:545` (`saveable`) | Ha a tetőanyag-kalkulátorban rajz van betöltve (`takeoffScopeActive`), a normál mentéshez `wholeRoofConfirmed` szükséges. A jelölőnégyzet csak `sections.length === 1` esetén jelenik meg → **2+ szakasznál a normál mentés tartósan tiltott**. Egy szakasznál is csak „ez a teljes tető” állítással menthető; szakaszonkénti részeredmény nem menthető. | **[KÓD-BIZONYÍTOTT]** |
| **T5** | P1 (adatvesztési kockázat) | `drawing-roof-work-session.ts` (`validateSection` → `fieldContractIssues`), `plan-field-transfer.tsx:221–230`, `:298` | (a) Ha bármely szakasz bármely mezője érvénytelen (pl. hajlás 85°, nulla pozitív mezőben), a `createRoofWorkSessionJson` általános „ismeretlen vagy érvénytelen” hibát dob → a félkész munka nem menthető. (b) Képforrásnál (`image/*`) `workSessionSource` `null` → az export gomb tiltott; képből indított munka egyáltalán nem menthető. (c) Importált munkamenet után kép választásakor szintén `null` lesz a forrás. | **[KÓD-BIZONYÍTOTT]** |
| **T6** | P2 | `plan-field-transfer.tsx:277–289` (`rotatePreview`); `drawing-text-source.ts:24` | A 90°-os forgatás a teljes PDF-et újra feldolgozza (`processPdfDocument`, max. 100 oldal), és új véletlen `sourceDocumentId`-t generál. Ugyanannak a dokumentumnak két azonosítója lesz (a szakaszok a régit, a forgatás utáni jóváhagyások az újat hordozzák). Mobilon fölösleges CPU/memória. | **[KÓD-BIZONYÍTOTT]** (teljesítményhatás: **[NEM MÉRT]**) |
| **T7** | P2 | `plan-field-transfer.tsx:107–113` (`activateSection`) | Szakaszváltáskor a még nem jóváhagyott `entries` szó nélkül elvesznek. | **[KÓD-BIZONYÍTOTT]** |
| **T8** | P2 | `plan-field-transfer.tsx:89–90` | Tetőanyag-kalkulátorban minden geometriamező átviteléhez kötelező a „nem a teljes alaprajzi külső méret” megerősítés akkor is, ha a rajz tetőterv (`requiresRoofGeometryConfirmation(definition, "ground-floor-plan", fieldKey)` fixen). Ez túlzott, ismételt jóváhagyás. | **[KÓD-BIZONYÍTOTT]** |
| **T9** | P2 | `plan-field-transfer.tsx:343–347` | Új szakasz `initialMaterials`-szal és üres mezőkkel indul → a szarufa, léc, fedés, fólia adatait és a hajlást szakaszonként újra be kell vinni. | **[KÓD-BIZONYÍTOTT]** |

### III.2 Architekturális kockázatok

| Kockázat | Leírás | Bizonyíték |
|---|---|---|
| Kettős állapottulajdonlás | A szakasz `fields`/`materials`/`lengthDrafts` adata egyszerre él a suite állapotában (`drafts`, `materialByCalculator`, `lengthDrafts`) és a szakasz `data`-jában; a `snapshot()` (`plan-field-transfer.tsx:102`) és az `onSectionActivate` másol oda-vissza. Az M12.3C-s `LengthField`-szinkronhiba és a T1-et okozó „javítás” is ebből a mintából fakad. | [KÓD-BIZONYÍTOTT szerkezet; a hibaosztály-kapcsolat FELTÉTELEZÉS] |
| Túlterhelt komponens | `plan-field-transfer.tsx`: ~44 KB, 27 `useState`; fájlkezelés, renderelés, OCR, javaslat-szerkesztő, szakaszok, import/export és vezetett folyamat egy komponensben. | [KÓD-BIZONYÍTOTT] |
| `window.confirm` mint döntési pont | 7 helyen; mobilon rossz élmény, automatizáltan nehezen tesztelhető. | [KÓD-BIZONYÍTOTT] |
| Komponens tesztelhetetlen | Nincs DOM-tesztkörnyezet; a kritikus invariánsok (szakaszváltás, fájlcsere, import) csak böngészőben ellenőrizhetők, ott pedig csak részlegesen történt meg. | [FUTTATVA – config/grep] |
| Mobil memória/CPU | 32 MiB PDF, 100 oldal, 8 MP canvas, OCR worker – valós eszközön nincs mérés. | [NEM TESZTELT] |
| Csak memóriabeli munka | `construction-workspace-memory.ts` modulszintű `Map`; lapbezárás/újratöltés = adatvesztés, ha nem volt explicit export. | [KÓD-BIZONYÍTOTT] |

### III.3 Megmaradt teszthiányok

- `PlanFieldTransfer` komponens: szakasz hozzáadás/váltás/törlés, fedettség-visszavonás, fájlcsere, import (azonos/eltérő hash), export. **[NEM TESZTELT]**
- Billentyűnkénti gépelés bármely kalkulátormezőben (T1). **[NEM TESZTELT]**
- M12.9 export/import böngészőben. **[NEM TESZTELT]** (handoff szerint is)
- Fizikai iPhone/Android: billentyűzet, tájolás, memória, érintési pontosság. **[NEM TESZTELT]**

### III.4 Refaktor-javaslat (csak az indokolt mérték)

1. **Probléma:** a szakaszadat kettős tulajdonlása (T1, M12.3C hibaosztály) és a tesztelhetetlen komponens.
2. **Megoldás:** egyetlen tiszta `useReducer` a forrás- és szakaszállapotra (`source`, `sections`, `activeSectionId`, eseményei: `addSection`, `activate`, `remove`, `undoRemove`, `setCoverage`, `applyDrawingValue`, `undoDrawingValue`, `replaceSource`, `importSession`). A szakaszadat egyetlen tulajdonosa a reducer; a suite onnan olvas.
3. **Miért jobb:** megszűnik a `snapshot()`-másolás; az invariánsok tiszta függvényként, DOM nélkül Vitestben tesztelhetők.
4. **Kockázat:** közepes (a suite és a panel határát érinti).
5. **Regressziós tesztek:** szakaszizoláció, törlés+visszavonás, fedettség-visszavonás, fájlcsere azonos/eltérő hash-sel, import → újraszámítás, kalkulátorváltás draft-izolációja, `LengthField` kijelzés külső értékváltozáskor.
6. **Fokozatosság:** igen – először a reducer a meglévő viselkedéssel, utána a P1 UX-átírás. **Önálló refaktorként nem javaslom**, csak a P1-1/P1-2 munkával együtt.

---

## IV. UI/UX audit

### IV.1 Jelenlegi folyamat egy méretre (tetőanyag-kalkulátor, földszinti alaprajz)

**Egyszeri előfeltételek szakaszonként:** szakasznév → „Szakasz kijelölése a rajzon” → 2 koppintás a sarkokra → Fedettség = „Tetővel fedett” → fedettségi jelölőnégyzet.

**Méretenként:**
1. Koppintás a feliratra (kis érintési cél).
2. Mértékegység választása (egység nélküli feliratnál minden egyes feliratnál újra).
3. Kalkulátormező választása legördülőből.
4. (Az érték automatikusan kitöltődik.)
5. „Ellenőriztem, hogy ez a méret a ténylegesen lefedett tetőszakaszhoz tartozik…” jelölőnégyzet (T8: mindig).
6. Ha már volt érték: felülírás-jelölőnégyzet.
7. „Javaslat hozzáadása”.
8. „Ellenőriztem a terven a kijelölt feliratokat…” jelölőnégyzet.
9. „Jóváhagyás és átvitel a kalkulátorba”.

→ **8–10 interakció / méret**, szemben a gépelés **2** interakciójával. **[KÓD-BIZONYÍTOTT]**

A mentéshez ezen felül: egy szakasznál „teljes épület” jelölőnégyzet; több szakasznál nincs lehetőség (T4).

### IV.2 Mobil-first problémák

| Probléma | Részlet | Bizonyíték |
|---|---|---|
| Olvashatatlan méretfeliratok | A3 fekvő lap (~1190 pt) telefonon ~340 px szélességre fér; max. zoom 2× (`plan-field-transfer.tsx:312`) → ~0,55 px/pt. Egy 2–2,5 mm-es (≈5–7 pt) méretszám ~3–4 CSS px magas. | Számítás **[FELTÉTELEZÉS – nem mért]** |
| Nincs húzás/két ujjas nagyítás a rajzon | Csak +/− gomb, 0,5–2× tartomány; a konténer `overflow: auto`. | [KÓD-BIZONYÍTOTT] |
| Kicsi, átfedő érintési célok | Hit-gomb mérete a felirat befoglalója, min. 1,25 rem (20 px) (`globals.css`, `.plan-field-transfer-hit`); méretláncban egymásra kerülnek; nincs egyértelműsítés. | [KÓD-BIZONYÍTOTT]; érintési pontosság [NEM TESZTELT] |
| Szűretlen feliratlista | `plan-field-transfer-sources` minden spant gombként listáz (E-01: 467 span), szűrés/keresés nélkül; emellett a „Kiolvasható méretek” lista is. | [KÓD-BIZONYÍTOTT] |
| Rajz és mező soha nem látszik együtt | A panel a mérési mezők felett van (`construction-suite.tsx`, `context` slot); a „Tetőforma és méretek megadása” gomb elgörget a rajztól. | [KÓD-BIZONYÍTOTT] |
| Információs túlterhelés | ≥10 állandó magyarázó/figyelmeztető bekezdés, ugyanaz az üzenet („csak forrásjelölt”, „nem mér területet”) többféleképpen. | [KÓD-BIZONYÍTOTT] |
| `window.confirm` | Rendszerdialógusok mobilon, nincs visszavonás. | [KÓD-BIZONYÍTOTT] |
| Billentyűzet | T1 miatt minden számjegy után bezáródhat. | [KÓDBÓL LEVEZETETT] |
| Álló/fekvő tájolás | A korábbi QA 375×812 és 812×375 emulációban overflow-mentességet dokumentált; fizikai eszközön nem. | [DOKUMENTÁLT] / [NEM TESZTELT] |

### IV.3 Fölösleges megerősítések – mi maradjon, mi menjen

| Jelenlegi megerősítés | Javaslat |
|---|---|
| „Javaslat hozzáadása” + „Ellenőriztem…” + „Jóváhagyás és átvitel” | **Elhagyni** → koppintás = átvitel + visszavonható chip (V. fejezet, koppintásos átvitel). |
| Méretenkénti „nem a teljes alaprajzi méret” jelölőnégyzet | **Egyszer, dokumentum/szakasz szinten** tett kérdéssé alakítani („A méretek fal- vagy ereszkontúrra vonatkoznak?”), és csak alaprajznál. |
| Felülírás-jelölőnégyzet | **Elhagyni** → a chip mutatja a korábbi értéket és visszavonható. |
| Fedettségi jelölőnégyzet + „teljes tető” jelölőnégyzet | **Áthelyezni** egy záró „Összesítés” lapra: mely szakaszok szerepelnek, mi maradt ki. Mentést ne blokkoljon; csak a „teljes tető” címkét. |
| Mértékegység feliratonként | **Dokumentumszintre** emelni; explicit egységű felirat felülírja. |
| `window.confirm` a törlésnél, fájlcserénél | **Undo-toast**-ra cserélni, ahol visszavonható; valódi adatvesztésnél (pl. munka elvetése mentés nélkül) maradjon megerősítés, de saját dialógusban. |
| %-os lejtés → fok tiltás | **Megtartani**, de átváltást kínálni („4% = 2,29° – ez valóban a tetőhajlás?”). |

---

## V. Koppintásos adatátvitel – javasolt pontos működés

Cél: rajzból vett érték bevitele **ne legyen lassabb, mint gépelni**, miközben a téves méret- és mezőhozzárendelés kockázata nem nő.

### V.1 Alapelv

**A mezőt mindig az ember választja ki, mielőtt a rajzra koppint.** A rendszer sosem találja ki, hogy egy felirat melyik mezőhöz tartozik. A koppintás maga a hozzárendelés megerősítése; utólagos jóváhagyási lánc nincs, helyette azonnali, egyérintéses visszavonás van.

### V.2 Folyamat

1. **Dokumentumszintű mértékegység** – rajz betöltésekor egyszer: „Ezen a rajzon a méretek: m / cm / mm”. Ha a szövegrétegben többségében explicit egység szerepel, a rendszer ezt **előre kijelölheti, de a felhasználónak meg kell érintenie** (nem némán alkalmazott). Az explicit egységű felirat (pl. `8,20 m`) mindig a saját egységét használja.
2. **Célmező „élesítése”** – a felhasználó megérinti a kalkulátor egy mezőjét vagy a rajz alatti, rögzített sávban („Most kitöltendő: **Tető hossza (m)**”) választ. A sáv mindig látszik a rajz mellett.
3. **Koppintás a feliratra** – a találati terület a felirat befoglalója, de **legalább 44×44 CSS px** érintési sugárral.
4. **Értelmezés** a meglévő szigorú szabályokkal (`drawing-value-suggestion.ts`, `measurementFromText`):
   - pontosan egy szám; összetett (`30x50`, `17/14`), előjeles, több számot tartalmazó felirat → elutasítás;
   - `%`, `m²`, `db` hosszmezőbe → elutasítás; `°` csak szögmezőbe; `%` szögmezőbe → nem fokként, hanem átváltási kérdéssel.
5. **Beírás** – az érték a mező draftjába kerül (kanonikus mm), mellette chip: „📐 17,00 → 17 000 mm · 1. oldal · Visszavonás”.
6. **Automatikus továbblépés** (opcionális): a célmező a vezetett sorrend következő hiányzó mezőjére ugrik.

### V.3 Védelem téves hozzárendelés ellen

| Kockázat | Védelem |
|---|---|
| Rossz feliratot talál el (sűrű méretlánc) | Ha az érintési sugárban ≥ 2 felirat van, **nincs automatikus választás**: felugró lista nagyított jelöltekkel; a felhasználó választ. |
| Rossz mező | A mező a koppintás előtt látható, kiemelt; a chip a mező mellett jelenik meg; egy érintéssel visszavonható, és a korábbi érték visszaáll. |
| Rossz mértékegység | Dokumentumszintű egység mindig látszik a sávban; egységváltáskor minden egység nélküli feliratból származó érték „újraellenőrzendő” jelölést kap (újraszámítva, nem némán). |
| Érvénytelen érték | A meglévő mezőszerződés (`fieldContractIssues`, `roofGeometryInputSchema`) azonnal jelez; nem kerül csendben elfogadásra. **Új, kitalált plauzibilitási küszöb nincs.** Csak a sémában már létező feltételek (pl. hajlás < 80°, szárny < főtető) jelezhetnek. |
| Alaprajzi méret tetőméretként | Alaprajz esetén (`classifyDrawingPlan`) **szakaszonként egyszer** feltett kérdés: „A hossz/szélesség a fal külső síkjára vagy az ereszkontúrra vonatkozik?” A válasz meghatározza, hogy az ereszkiülést külön kérdezzük-e. Nem méretenkénti jelölőnégyzet. |
| Felülírás | Megengedett, de a chip „korábban: 16 500 mm · Visszavonás” formában megmutatja. |
| OCR-forrás | OCR-felirat **nem írhat közvetlenül** mezőbe (M12.2 BLOCKED): a koppintás egy előtöltött szerkesztőt nyit, a felhasználó a számot ellenőrzi és Enterrel/gombbal rögzíti. |
| Kézi módosítás utólag | Ha a felhasználó átírja a rajzból jött értéket, a forrás „kézi (rajzból módosítva)” lesz. |
| Forráscsere | Másik PDF-nél az értékek megmaradnak, a chipek „forrás nem elérhető” állapotba kerülnek; azonos SHA-256 esetén visszaköthetők (meglévő `rebindRoofWorkSessionSource`). |

### V.4 Visszakövethetőség (megmarad)

Mezőnként: forrásszöveg, oldal, `bounds`, dokumentum SHA-256, egység eredete (`pdf`/`user`), módszer (`pdf-text`/`ocr`), időbélyeg. Ez a meglévő `Entry` típus egyszerűsítése, nem új modell.

### V.5 Elfogadási feltételek

- Időmért feladat: szintetikus nyeregtető (hossz, szélesség rajzból; hajlás, kiülés kézzel) **rajzból nem tart tovább, mint tisztán gépeléssel**, telefonon (álló) és asztali gépen is.
- Billentyűnkénti gépelés minden mezőben fókuszvesztés nélkül (T1 javítás után).
- Negatív esetek: összetett felirat, `%` hosszmezőbe, `m²`, két átfedő felirat, egység nélküli felirat dokumentumegység nélkül → egyik sem ír mezőt.
- Visszavonás visszaállítja a korábbi értéket és a `LengthField` kijelzését.
- Fizikai eszközön: legalább egy iOS Safari és egy Android Chrome próba.

---

## VI. Rajzfelismerés és tetőgeometria

### VI.1 PDF.js szövegréteg

- **Megfelelő kiindulás** CAD-exportált PDF-hez (E-01: 467 span **[DOKUMENTÁLT]**). Helyben fut, nem küld adatot.
- **Hibázási esetek** **[FELTÉTELEZÉS – korpusszal mérendő]:**
  - méretlánc elemei külön spanokban vagy egy spanba olvadva;
  - elforgatott (függőleges) méretek;
  - AutoCAD SHX-betűkészlet exportnál a szöveg vonalakká alakul → nincs szövegréteg;
  - a szám és a méretvonal kapcsolata a szövegrétegben nincs meg.
- **A címkeszabályok korlátja:** a `Fél fesztáv: 5,00 m` típusú felirat építészeti terven nem szokásos, ezért az M12.4 valós rajzon várhatóan közel nulla lefedettséget ad. **[FELTÉTELEZÉS]**

### VI.2 Determinisztikus lehetőségek

| Lehetőség | Megítélés |
|---|---|
| **Léptékkalibráció ember által** – két végpont a rajzon + ismert méret (pl. 17,00 m) → lépték; egy második ismert méret ellenőrzi. | **Javasolt (P2).** Takeoff-szoftverekben bevett. Nem sérti a „pixelből nem következtetünk” elvet, mert ember kalibrál és van ellenőrző méret. Utána a rajzon mért sokszög mm-ben adható meg. |
| **Felirat–méretvonal párosítás** a PDF.js `getOperatorList` vektorvonalaiból (párhuzamos szakasz, középen elhelyezett szám, a hossz × lépték ≈ felirat). | Lehetséges, és a léptéket is igazolhatja több méret egyezéséből. **Csak javaslatként**, annotált korpuszon mért pontosság után. **[FELTÉTELEZÉS]** |
| Automatikus tetőforma-felismerés alaprajzból | **Nem javasolt.** Az alaprajz nem tartalmazza a tetőformát, a hajlást, a fedett részeket. |

### VI.3 OCR (M12.2)

- Kapu **BLOCKED** marad. A 0/15 szó szerinti egyezés **[DOKUMENTÁLT]** nem oldható meg pusztán normalizálással.
- Alternatívák (pl. PP-OCR ONNX-modell böngészőben): pontosság, memória, modellméret, licenc **nem mért** → most nem javasolt.
- Szkennelt tervhez a nagyítható rajz + koppintás utáni kézi számrögzítés (V.3) a reális út.
- A kapu újranyitásának feltétele: jogszerűen használható, szakember által span/oldal/egység szinten annotált korpusz; előre rögzített téves-javaslat küszöb; minden téves javaslat egyedi elemzése. (Handoff 13/5 – egyetértek.)

### VI.4 Tetőformák állapota (`src/domain/calculations/roof-geometry.ts`)

| Forma | Állapot | Megjegyzés |
|---|---|---|
| Nyeregtető (`gable`) | Ereszkiülés + homlokzati kiülés | [KÓD-BIZONYÍTOTT] |
| Félnyereg (`shed`) | Ereszkiülés | [KÓD-BIZONYÍTOTT] |
| Konty (`hip`), sátor (`pyramid`), félkonty (`halfHip`) | **Nincs ereszkiülés mező** (`roof-calculator-definitions.ts:37`: `shapes: ["gable", "shed"]`). Egyenletes kiülésnél a helyes eredményhez az **ereszkontúr** méretét kell megadni, de a címke („Tető hossza / szélessége”) ezt nem mondja ki. | [KÓD-BIZONYÍTOTT]; nem képlethiba, hanem címke/UX-hiány |
| L / T (`lShape`, `tShape`) | Nyeregszárny, egy hajlás, egy ereszmagasság, vápákkal; kiülés nélkül. Kontyolt L nincs. | [KÓD-BIZONYÍTOTT] |
| Manzárd | Két hajlás, törésvonal; kiülés nélkül. | [KÓD-BIZONYÍTOTT] |
| Élosztályozás | `eave`, `rake`, `ridge`, `hip`, `valley`, `break`, `upper` – típusonkénti összhossz `summarizeRoofGeometry`-ben. | [KÓD-BIZONYÍTOTT] |

### VI.5 Több tetőszakasz – javasolt kezelés

1. **Először sablon:** „Ráillik-e L/T/konty formára?” – a tagolt családi házak jelentős része **[FELTÉTELEZÉS]** egyetlen L/T modellel, vápákkal együtt számolható; ez pontosabb, mint két összefüggéstelen szakasz.
2. **Ha nem:** szakaszok **közös anyagsablonnal és közös hajlás-alapértékkel**.
3. **Összesíthető** (ha a felhasználó kijelenti, hogy a szakaszok nem fedik egymást): tetőfelület, szarufa- és lécvonalak, fólia, fedőtábla – síkonként számoltak, tehát összeadhatók.
4. **Élfüggő tételek** (eresz, orom, vápa, falcsatlakozás): a csatlakozásnál az élek típusa megváltozik (pl. orom → vápa). Ezeket csak szakaszonként **kézzel megadott csatlakozási típussal** („Mihez csatlakozik? vápa / falcsatlakozás / nem csatlakozik”) szabad korrigálni; addig „ellenőrizendő” jelöléssel listázandók. **Automatikus metszési képlet nincs.**
5. **Blokkolni kell** az összesítést, ha a felhasználó átfedést jelez, vagy a szakaszok viszonya ismeretlen.
6. **Hosszabb távon (P2):** alaprajzi körvonal (sokszög) + egyenletes hajlás → **egyenes váz (straight skeleton)** algoritmus pontos kontytetőt ad tetszőleges derékszögű alaprajzra, automatikus él/vápa/gerinc besorolással. Regressziós orákulum: téglalapra egyezzen a `hip` modellel; L alakra a vápahosszakkal. Oromzatos végekhez súlyozott változat kell (nagyobb munka). **[FELTÉTELEZÉS – megvalósíthatóság; nincs prototípus]**

---

## VII. Kalkulációs és anyagkigyűjtési audit

### VII.1 Ami jó és megtartandó

- `QuantityMeaning` (`GEOMETRIC`/`LAYOUT`/`NOMINAL`/`PROCUREMENT`) – a `PROCUREMENT` helyesen fenntartott, semmi nem promotálódik beszerzésivé (`roof-material-takeoff.ts`). [KÓD-BIZONYÍTOTT]
- Hiányzó adat → `INCOMPLETE`, nincs kitalált alapérték. [KÓD-BIZONYÍTOTT]
- Szarufa/léc: darab, geometriai összhossz, névleges m³ (csak teljes keresztmetszetnél) – `roof-timber-layout.ts`. [KÓD-BIZONYÍTOTT]
- Katalógusprofilok: csak a ténylegesen meglévő, validált értékek kerülnek át (`catalogProfilesFromProducts`, `valuesFor`). [KÓD-BIZONYÍTOTT]
- Statika és mennyiség szétválasztása: „A faanyag nem statikai igazolás.” állandó figyelmeztetés (`roofTakeoffCriticalWarnings`). [KÓD-BIZONYÍTOTT]

### VII.2 Mit vár a motor, mi jöhet profilból, mit kérünk fölöslegesen újra

| Adat | Honnan jön ma | Megjegyzés |
|---|---|---|
| Szarufa/léc keresztmetszet | Profil (`section_width_mm`, `section_height_mm`) vagy kézi | Rendben. |
| Szarufa/léc tengelytávolság | Mindig kézi | A katalógus tárolhatna ajánlott értéket – **csak forrással**, kitalált érték nélkül. |
| Fedés szélesség/hossz/hasznos fedés | Profil (lemez/fedés kategória) vagy kézi | Rendben. |
| Fólia tekercs, átfedések, irány | Profil vagy kézi | Rendben. |
| **Minden anyagadat új szakasznál** | Újra kézi (T9) | **Fölösleges ismétlés** → anyagsablon. |
| **Hajlás új szakasznál** | Újra kézi | Közös alapérték, szakaszonként felülírható. |

### VII.3 Hiányzó képességek bádogos szemmel

| Hiány | Mi szükséges hozzá | Mit nem szabad |
|---|---|---|
| **Szegély- és csatornalista** (eresz-, oromszegély, gerinc, élgerinc, vápa, ereszcsatorna) | A geometriában megvan a típusonkénti élhossz → méterben (`GEOMETRIC`) kiadható. Darabszámhoz a katalógusban hasznos elemhossz és átfedés kell. Szakmai jóváhagyás: melyik éltípushoz milyen elem tartozik. | Darabszámot átfedés/elemhossz nélkül; hulladékszázalékot kitalálni. |
| Ellenléc | Szarufavonalakból számítható; keresztmetszet az anyaglistából. | Szarufa-kiosztás nélkül feltételezni. |
| Lefolyó | Darabszám tervezői/szakmai szabály (lefolyónkénti tetőfelület) – **nincs ellenőrzött forrás**. | Kitalált szabály. |
| Beszerzési lista | Csak katalógusban rögzített csomagolási egységre kerekítés, **külön oszlopban** a névlegestől. | Veszteségszázalék forrás nélkül. |
| Vágási terv, toldás, fizikai darabszám | Most nincs; a motor helyesen `physicalLayout: unsupported`. | Nem ígérni. |

### VII.4 Javasolt anyagválasztási munkafolyamat

1. **Anyagsablon** (felhasználó vagy szervezet szintjén, első körben helyi tárolással): „Szokásos rétegrendem” = szarufa-profil + tengelytáv, léc-profil + tengelytáv, ellenléc, fólia-profil, fedés-profil, szegélyek.
2. Egy érintéssel alkalmazható a teljes tetőre; szakaszonként felülírható.
3. A sablon a meglévő `RoofMaterialUiState` szerkezetet tölti, nem új számítási modellt.
4. Eredmény: anyagcsoportonként **Névleges** és (ha van adat) **Beszerzési egység** oszlop, a korlátok összecsukva, a kritikus figyelmeztetés mindig látható.

---

## VIII. A javasolt PDF-alapú tető-anyagkigyűjtési UX-folyamat

### VIII.1 Képernyőszerkezet (mobil, álló)

- **Felső fél:** rajz, húzással és két ujjal nagyítható (≥ 4×), forgatás a meglévő koordinátatranszformációval újraparszolás nélkül.
- **Rögzített sáv a rajz alatt:** „Most kitöltendő: [mező] · egység: m · [kihagyom]”.
- **Alsó lap (bottom sheet):** az aktuális lépés egyetlen kérdése; felhúzva a teljes űrlap.
- Fekvő tájolásban: rajz bal, kérdés jobb oldalon.

### VIII.2 Lépések

| # | Lépés | Rendszer automatikusan | Felhasználó |
|---|---|---|---|
| 0 | Indítás | Helyi automatikus mentés indul. | „Új tetőfelmérés” vagy „Folytatás” (a legutóbbi helyi munka listából). |
| 1 | Rajz (opcionális) | PDF.js szövegréteg; rajztípus-jelzés (`FÖLDSZINTI` + `ALAPRAJZ`); egység-előjelölés, ha egyértelmű. | Megérinti a dokumentumegységet. Rajz nélkül is folytatható. |
| 2 | Tetőforma | Piktogramos választó a 8 meglévő formából. Alaprajznál figyelmeztet: „Az alaprajz nem mutatja a tetőformát.” | Kiválasztja. Ha tagolt: „Ráillik L/T-re?” → igen: L/T; nem: szakaszok (B út). |
| 3 | Kontúr értelmezése | Csak alaprajznál, egyszer. | „A méretek fal- vagy ereszkontúrra vonatkoznak?” |
| 4 | Fő méretek | Koppintásos átvitel (V. fejezet) vagy gépelés. Mezőnként forráschip. | Mezőnként: élesít → koppint (vagy gépel). |
| 5 | Hajlás | Fokban; ha a rajzon %-os lejtés szerepel: átváltás kérdéssel. Emelkedés + fesztáv megadás is lehet (a meglévő `rafter-cut` geometria alapján). | Megadja/megerősíti. |
| 6 | Kiülések | Csak ha a 3. lépés „fal” volt. | Eresz- és oromkiülés. |
| 7 | **Első hasznos eredmény** | Tetőfelület + típusonkénti élhossz-lista (eresz, orom, gerinc, él, vápa). | – |
| 8 | Anyag | Anyagsablon alkalmazása; hiányzó adat egyenként kérdezve. | Egy érintés, vagy módosítás. |
| 9 | Eredmény | Anyagcsoportonként névleges mennyiség; beszerzési egység, ha a katalógusból ismert; korlátok összecsukva. | Áttekint. |
| 10 | Összesítés és mentés | Több szakasznál: összeadható tételek, ellenőrizendő élfüggő tételek, kimaradt részek. | „Mentés a fiókba” (meglévő revíziós mentés); a „teljes tető” jelölés itt, nem a mentés feltételeként. |

### VIII.3 A. Egyszerű tető (pl. nyereg-, konty-, sátortető)

Szükséges adat: forma + 2 méret + hajlás + (kiülés) + anyagsablon → **első eredmény 4–5 bevitel után**, teljes anyaglista egy további érintéssel. **[FELTÉTELEZÉS – időmérés szükséges]**

### VIII.4 B. Összetett tető

1. L/T sablon kipróbálása.
2. Ha nem illik: szakaszok közös anyagsablonnal és hajlással.
3. Szakaszonként egy kérdés a csatlakozásról (VI.5/4).
4. Összesítés: összeadható tételek összegezve; élfüggő tételek „ellenőrizendő”; átfedés vagy ismeretlen viszony → összesítés blokkolva, szakaszonkénti eredmény marad.
5. Szükség esetén további rajz (tetőterv, metszet) betöltése ugyanabba a munkába (több forrásdokumentum – P2).
6. Hosszabb távon: kalibrált rajzon körvonal + egyenes váz (P2).

**Nem ígérjük:** önálló, teljes tetőfelismerést alaprajzból; vápák automatikus metszését; statikai megfelelőséget.

### VIII.5 Hiányzó vagy bizonytalan rajzi információ kezelése

- Mindig egyetlen, konkrét kérdés („Melyik terasz fedett?”, „Mekkora a hajlás?”), nem általános figyelmeztető bekezdés.
- „Nem tudom” válasz lehetséges → az érintett eredmény `INCOMPLETE` marad, a többi számol.
- A bizonytalan állapot az eredmény mellett, a tételnél jelenik meg (pl. „Vápa: ellenőrizendő – csatlakozás nincs megadva”).

---

## IX. Mit tartsunk meg, mit egyszerűsítsünk, mit hagyjunk el?

### Megtartani

- PDF.js-adapter, `DrawingTextSource` adatkontraktus, korlátok és `AbortSignal` (`src/infrastructure/drawings/`).
- Meglévő geometria- és anyagmotor, élosztályozás, `QuantityMeaning`.
- Szigorú számértelmezés (`measurementFromText`): összetett, többszámos, előjeles, `%`/`m²` felirat elutasítása.
- `%` ≠ fok védelem.
- Alaprajz-felismerés (`classifyDrawingPlan`) – de kérdésként használva, nem méretenkénti kapuként.
- JSON-séma szigorú **import**-validációja, SHA-256 alapú újrakötés (`rebindRoofWorkSessionSource`).
- Katalógusprofilok (Anyagkezelő) használata.
- A forrásadat (szöveg, oldal, keret, módszer) visszakövethetősége.

### Egyszerűsíteni / módosítani

- Jóváhagyási lánc → koppintás + visszavonás (V.).
- Mértékegység feliratonként → dokumentumszinten.
- Méretenkénti alaprajz-jelölőnégyzet → szakaszonként egyszeri kérdés.
- Mentési kapuk (T4) → ne blokkolják a mentést, csak a „teljes tető” címkét.
- Export (T5) → félkész/érvénytelen mezőt is mentsen, „érvénytelen” jelöléssel; képforrásnál is.
- Szakaszállapot → egyetlen tulajdonos (reducer), komponenstesztekkel.
- Új szakasz → közös anyagsablon és hajlás.
- Forgatás → koordinátatranszformáció újraparszolás nélkül (T6).
- Figyelmeztető szövegek → tételhez kötött, rövid jelzések.

### Elhagyni vagy elrejteni a fő felhasználói útból

- M12.4 címkeszabályok a `material-takeoff` útból (valós rajzon várhatóan nem futnak le); a kód maradhat.
- Kép-OCR gomb a fő folyamatból (maradjon a `/devtools/m12-pdf` diagnosztikában).
- A teljes, szűretlen feliratlista (467 gomb) és a „Kiolvasható méretek” lista.
- Téglalapos szakaszkijelölés mint kötelező lépés (opcionális vizuális jelölés lehet).
- `window.confirm` dialógusok, ahol undo lehetséges.

---

## X. Prioritások és megvalósítási terv

### X.1 P0 – bizonyított kritikus működési / adatbiztonsági hibák

| # | Probléma | Megoldás | Érintett | Összetettség / kockázat | Elfogadás | **Előfeltétele a következő fejlesztésnek?** |
|---|---|---|---|---|---|---|
| **T1** | Fókuszvesztés minden leütés után, minden kalkulátorban | A `values[field.key]` eltávolítása a `Fragment` kulcsából (`construction-suite.tsx:335`); a `LengthField` külső szinkronja és az M12.3C-s draft-invalidálás (`discardLengthDraftsForFields`, `draftEpoch`) megmarad | `construction-suite.tsx`; regresszió: `length-field.test.tsx` | Kicsi / alacsony; de előbb **böngészőben reprodukálni kell** | Billentyűnkénti gépelés (nem `fill`) natív és `LengthField` mezőben; rajzból átvitt érték után a `LengthField` a helyes értéket mutatja | **IGEN – kemény előfeltétel.** Minden beviteli UX-munka (koppintásos átvitel is) erre épül; ennek javítása nélkül időmérés értelmetlen. |
| **T2** | Szakasztörlés megerősítés/visszavonás nélkül | Undo-toast (a törölt szakasz visszaállítása) vagy megerősítő dialógus | `plan-field-transfer.tsx:348–350` | Kicsi / alacsony | Törlés után egy érintéssel visszaállítható az összes szakaszadat | **Igen, a többszakaszos munka bármely továbbfejlesztése előtt.** A koppintásos átvitelnek nem szigorú előfeltétele, de olcsó, és együtt javasolt. |

**Nem P0 és nem előfeltétel:** T3–T9. Ezek P1/P2 tételek; a koppintásos átvitel nélkülük is megkezdhető.

### X.2 P1 – nagy felhasználói értékű, indokolt fejlesztések (érték szerinti sorrend)

| # | Probléma | Megoldás | Felhasználói előny | Érintett komponensek | Összetettség / kockázat | Elfogadás | Függőség | Mit ne építsünk még |
|---|---|---|---|---|---|---|---|---|
| **P1-1** | Rajzból lassabb a bevitel, mint gépelni | Koppintásos átvitel (V. fejezet) + dokumentumszintű egység + rögzített célmező-sáv | A rajz használata ténylegesen időt spórol | `plan-field-transfer.tsx`, `drawing-value-suggestion.ts` (újrahasznosítva), `construction-suite.tsx` | Közepes / közepes | V.5 | **T1** | Automatikus mezőkitalálás; OCR-ből közvetlen beírás |
| **P1-2** | Munka elvész lapbezáráskor; export elutasítja a félkész munkát | Automatikus **helyi** mentés (IndexedDB, csak az eszközön), ugyanazzal a verziózott sémával; export félkész állapotot is fogad, „érvénytelen” jelöléssel; képforrásnál is | „Mentés és folytatás” fájlkezelés nélkül | `drawing-roof-work-session.ts`, `plan-field-transfer.tsx` | Közepes / közepes (privát adat az eszközön) | Lapbezárás → újranyitás után ugyanaz az állapot; a PDF opcionálisan helyben; törlés gomb | Reducer javasolt | Szerveres tárolás, DB/RLS |
| **P1-3** | Anyag és hajlás szakaszonként újra | Anyagsablon + közös hajlás-alapérték, szakaszonként felülírható | Kevesebb ismételt bevitel | `material-spec-editor.tsx`, `plan-field-transfer.tsx` | Kicsi–közepes / alacsony | Új szakasz örökli; felülírás csak az adott szakaszt érinti | – | Szervezeti szintű sablon szerveren |
| **P1-4** | A bádogos fő kimenete (szegélyek) hiányzik | Élhossz-alapú szegély-/csatornalista méterben (`GEOMETRIC`) | Közvetlenül a bádogos anyagát adja | `roof-material-takeoff.ts`, `roof-geometry-results.ts` (újrahasznosítva) | Kicsi–közepes / alacsony (a geometria kész) | Éltípusonkénti hossz egyezik a geometria-összegzéssel; **szakmai jóváhagyás** az éltípus→elem megfeleltetésre | Szakember | Darabszám elemhossz/átfedés nélkül; hulladék % |
| **P1-5** | Többszakaszos munka nem menthető | Szakaszonkénti mentés vagy „Összesítés” lap; a „teljes tető” címke nem mentési feltétel | A munka nem vész el, eredmény továbbadható | `drawing-field-transfer.ts` (`canSaveDrawingTakeoff`), `construction-suite.tsx`, `construction-save-panel.tsx` | Közepes / közepes (mentési szerződés) | 2+ szakasz menthető; részleges eredmény egyértelműen jelölve | P1-2 | Automatikus élkorrekció |
| **P1-6** | Mobilon olvashatatlan rajz | Húzás + két ujjas nagyítás (≥ 4×), rajz és célmező egyszerre; forgatás újraparszolás nélkül (T6) | Telefonon is használható | `plan-field-transfer.tsx`, `pdf-preview.ts`, `globals.css` | Közepes / közepes (memória) | Fizikai iPhone + Android: 2 mm-es méretszám olvasható, egyértelmű koppintás | – | Saját PDF-renderelő motor |
| **P1-7** | Kódminőség/akadálymentesség | Reducer a szakasz-/forrásállapotra komponenstesztekkel; T3 javítás; L/T/konty mezőcímkék („ereszkontúr”) | Kevesebb regresszió | `plan-field-transfer.tsx`, `roof-calculator-definitions.ts` | Közepes / közepes | III.4 tesztlista | P1-1-gyel együtt | Öncélú nagy refaktor |

### X.3 P2 – későbbi fejlesztések, szakmai bizonyíték vagy tervezés mellett

| # | Fejlesztés | Előfeltétel |
|---|---|---|
| P2-1 | Léptékkalibráció ember által + mérés a rajzon (sokszög) | P1-6; ellenőrző méretes elfogadási teszt |
| P2-2 | Egyenes vázas (straight skeleton) kontytető tetszőleges derékszögű alaprajzra | Prototípus + regressziós orákulum (`hip`, `lShape`) |
| P2-3 | Kontyolt L/T forma; ereszkiülés minden formánál | Geometriai specifikáció, szakmai ellenőrzés |
| P2-4 | Csatlakozási típus szerinti élkorrekció több szakasznál | Szakember által jóváhagyott szabályok |
| P2-5 | Felirat–méretvonal párosítás vektorgeometriából (javaslatként) | Annotált korpusz, előre rögzített hibaküszöb |
| P2-6 | Fiókhoz kötött munkamenet (Supabase) | Szervezeti RLS, verzióoszlop (optimista konkurencia), PDF privát Storage-ban, megőrzési/törlési szabály, audit; a P1-2 helyi sémája legyen a kiindulás |
| P2-7 | Ellenléc, beszerzési egységre kerekítés | Katalógusadat |
| P2-8 | OCR-benchmark program (M12.2) | Jogszerű, annotált korpusz – addig **BLOCKED** |
| P2-9 | Több forrásdokumentum egy munkában (alaprajz + tetőterv + metszet) | P1-2 séma v2, migrációs út |

### X.4 Amit most semmiképp ne építsünk

- Újabb címkeszabályokat a jelenlegi mintára.
- OCR-alapú automatikus mezőkitöltést.
- Automatikus vápa-/metszésképletet szakaszok között.
- Veszteség- vagy hulladékszázalékot forrás nélkül.
- Statikai megfelelőségi állítást.
- Adatbázis/RLS-módosítást a helyi mentés kipróbálása előtt.

---

## XI. Következő legjobb fejlesztési lépés

**T1 + T2 javítása, majd a koppintásos adatátvitel (P1-1), mért időfeladattal.**

**Indoklás:**

- T1 nélkül egyik kalkulátor sem gépelhető kényelmesen, és semmilyen beviteli UX-mérés nem értelmezhető.
- A koppintásos átvitel az egyetlen változás, amely után a rajz használata **gyorsabb lehet a gépelésnél**. Enélkül a rajzpanelnek nincs időbeli haszna a bádogos számára, és a további M12-befektetés (szakaszok, mentés, kalibráció) erre épülne.
- Kis kockázatú: a meglévő számítási motort, adatbázist és képleteket nem érinti; a meglévő számértelmezést és provenance-adatot újrahasznosítja.
- Mérhető: előtte rögzíteni kell egy valódi bádogos saját módszerének alapidejét ugyanazon a szintetikus feladaton.

**Javasolt második lépés:** P1-2 (helyi automatikus mentés), mert a jelenlegi legnagyobb adatvesztési kockázatot szünteti meg adatbázis-változtatás nélkül.

---

## XII. Nyitott kérdések a közös kiértékeléshez

1. Ki az első tesztfelhasználó (bádogos), és mi a mért alapfeladat (idő a saját módszerével)?
2. A bádogos jellemzően kap-e tetőtervet/metszetet, vagy csak alaprajzot? Ez dönti el a kalibráció (P2-1) és az egyenes váz (P2-2) értékét.
3. Mely szegélyelemeket és milyen éltípus-megfeleltetéssel kell a P1-4 listában kezelni? Ki hagyja jóvá szakmailag?
4. Elfogadható-e a munka (és opcionálisan a PDF) **helyi** tárolása az eszközön (P1-2), az ezzel járó adatvédelmi tájékoztatással?
5. A szarufa-tengelytávolságnak lehet-e ellenőrzött forrású ajánlott értéke a katalógusban, vagy mindig kézi marad?

---

**Commit/push/deploy:** nem történt. **Alkalmazáskód:** nem módosult. **M12.2:** BLOCKED.
